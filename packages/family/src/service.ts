import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Kysely, Transaction } from "kysely";
import { checkPerson, parentCount, treatedAsLiving, wouldCycle } from "./rules.js";
import type { PersonInput, PersonProblem } from "./rules.js";
import type {
  AuditKind,
  FamilyDB,
  LivingStatus,
  MemberRole,
  ParentRole,
  PersonsTable,
} from "./schema.js";

/**
 * The family tree (ADR-0029): trees, people, parentage, members and the audit
 * of who sees what, over schema `family`.
 *
 * Every call runs in one transaction that first sets `app.user_id`, which the
 * schema's row-level security policies read. So a tree the caller may not open
 * does not exist to any query here: a read answers `NOT_FOUND`, never
 * someone else's family, and a write the caller may read but not change
 * answers `FORBIDDEN`. The service repeats the rules the database already
 * enforces (two parents at most, no cycle, one tree per link, a death year
 * means `DECEASED`) so that a refusal has a name rather than an SQL error.
 *
 * What it will not do: read the register (it has no grant there; a birthplace
 * is a code the route resolves), send anything, or log a name. Audit rows
 * carry ids and kinds only.
 */

export interface FamilyDeps {
  readonly db: Kysely<FamilyDB>;
  readonly now?: () => Date;
  readonly newId?: () => string;
}

export type TreeRole = "OWNER" | MemberRole;

/** The contract's `tree` object (`docs/contracts/tree.md`) without `places`, which the route resolves from `place_codes`. */
export interface TreeRead {
  readonly tree: {
    readonly id: string;
    readonly title: string;
    readonly root_person_id: string | null;
    readonly role: TreeRole;
    readonly created_at: string;
    readonly updated_at: string;
  };
  readonly persons: readonly TreePersonRead[];
  readonly parentage: readonly { child_id: string; parent_id: string; role: ParentRole }[];
  readonly members: readonly { user_id: string; role: MemberRole; sees_living: boolean }[] | null;
  readonly hidden_living_count: number;
  readonly place_codes: readonly string[];
}

export interface TreePersonRead {
  readonly id: string;
  readonly given_names: string;
  readonly surname: string;
  readonly birth_surname: string | null;
  readonly birth: LifeEventRead;
  readonly death: LifeEventRead;
  readonly living_status: LivingStatus;
  readonly treated_as_living: boolean;
  readonly provenance: "ENTERED";
  readonly source_note: string | null;
  readonly notes: string | null;
  readonly updated_at: string;
}

export interface LifeEventRead {
  readonly year: number | null;
  readonly approx: boolean;
  readonly place_code: string | null;
  readonly place_text: string | null;
}

export interface TreeSummary {
  readonly tree_id: string;
  readonly title: string;
  readonly role: TreeRole;
  readonly person_count: number;
  readonly updated_at: string;
}

export type NotFound = { readonly kind: "NOT_FOUND" };
export type Forbidden = { readonly kind: "FORBIDDEN" };

export type CreateTreeResult =
  | { readonly kind: "CREATED"; readonly treeId: string }
  | { readonly kind: "INVALID"; readonly problem: "TITLE" };
export type TreeResult = { readonly kind: "OK"; readonly tree: TreeRead } | NotFound;
export type PersonWriteResult =
  | { readonly kind: "OK"; readonly personId: string }
  | { readonly kind: "INVALID"; readonly problems: readonly PersonProblem[] }
  | NotFound
  | Forbidden;
export type ParentProblem = "SAME_PERSON" | "DIFFERENT_TREES" | "TOO_MANY_PARENTS" | "WOULD_CYCLE";
export type ParentResult =
  | { readonly kind: "OK" }
  | { readonly kind: "INVALID"; readonly problem: ParentProblem }
  | NotFound
  | Forbidden;
export type MemberProblem = "SELF" | "ALREADY_MEMBER" | "UNKNOWN_USER";
export type MemberResult =
  | { readonly kind: "OK" }
  | { readonly kind: "INVALID"; readonly problem: MemberProblem }
  | NotFound
  | Forbidden;
export type PlainResult = { readonly kind: "OK" } | NotFound | Forbidden;

const TITLE_MAX = 120;

/** Thrown inside a transaction to roll it back and answer `FORBIDDEN`. */
class ForbiddenError extends Error {}

function pgCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null
    ? (error as { code?: string }).code
    : undefined;
}

/** `42501`: a row-level policy refused the write, or a privilege is missing. */
function isPolicyRefusal(error: unknown): boolean {
  return pgCode(error) === "42501";
}

function isForbidden(value: unknown): value is Forbidden {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "FORBIDDEN"
  );
}

type Trx = Transaction<FamilyDB>;

function event(row: PersonsTable, which: "birth" | "death"): LifeEventRead {
  return which === "birth"
    ? {
        year: row.birth_year,
        approx: row.birth_year_approx,
        place_code: row.birth_place_code,
        place_text: row.birth_place_text,
      }
    : {
        year: row.death_year,
        approx: row.death_year_approx,
        place_code: row.death_place_code,
        place_text: row.death_place_text,
      };
}

export function createFamily(deps: FamilyDeps) {
  const { db } = deps;
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? randomUUID;

  /** One transaction as one user: the policies see `app.user_id` for its length. */
  async function as<T>(userId: string, work: (trx: Trx) => Promise<T>): Promise<T | Forbidden> {
    try {
      return await db.transaction().execute(async (trx) => {
        await sql`SELECT set_config('app.user_id', ${userId}, true)`.execute(trx);
        return work(trx);
      });
    } catch (error) {
      if (error instanceof ForbiddenError || isPolicyRefusal(error)) return { kind: "FORBIDDEN" };
      throw error;
    }
  }

  async function audit(
    trx: Trx,
    treeId: string,
    userId: string,
    kind: AuditKind,
    personId: string | null = null,
  ): Promise<void> {
    await trx
      .insertInto("audit_events")
      .values({
        event_id: newId(),
        tree_id: treeId,
        user_id: userId,
        kind,
        person_id: personId,
        at: now(),
      })
      .execute();
  }

  async function roleIn(trx: Trx, treeId: string, userId: string): Promise<TreeRole | null> {
    const tree = await trx
      .selectFrom("trees")
      .select("owner_user_id")
      .where("tree_id", "=", treeId)
      .executeTakeFirst();
    if (tree === undefined) return null;
    if (tree.owner_user_id === userId) return "OWNER";
    const member = await trx
      .selectFrom("members")
      .select("role")
      .where("tree_id", "=", treeId)
      .where("user_id", "=", userId)
      .executeTakeFirst();
    return member?.role ?? null;
  }

  async function touch(trx: Trx, treeId: string): Promise<void> {
    await trx
      .updateTable("trees")
      .set({ updated_at: now() })
      .where("tree_id", "=", treeId)
      .execute();
  }

  async function read(trx: Trx, treeId: string, userId: string): Promise<TreeRead | null> {
    const tree = await trx
      .selectFrom("trees")
      .selectAll()
      .where("tree_id", "=", treeId)
      .executeTakeFirst();
    if (tree === undefined) return null;
    const role = (await roleIn(trx, treeId, userId)) ?? "VIEWER";
    const persons = await trx
      .selectFrom("persons")
      .selectAll()
      .where("tree_id", "=", treeId)
      .orderBy("created_at")
      .orderBy("person_id")
      .execute();
    const ids = persons.map((p) => p.person_id);
    const parentage =
      ids.length === 0
        ? []
        : await trx
            .selectFrom("parentage")
            .select(["child_id", "parent_id", "role"])
            .where("child_id", "in", ids)
            .orderBy("created_at")
            .execute();
    const members =
      role === "OWNER"
        ? await trx
            .selectFrom("members")
            .select(["user_id", "role", "sees_living"])
            .where("tree_id", "=", treeId)
            .orderBy("accepted_at")
            .execute()
        : null;
    const hidden = await sql<{
      n: number;
    }>`SELECT family.hidden_living_count(${treeId}) AS n`.execute(trx);
    const codes = new Set<string>();
    for (const p of persons) {
      if (p.birth_place_code !== null) codes.add(p.birth_place_code);
      if (p.death_place_code !== null) codes.add(p.death_place_code);
    }
    const seesNotes = role !== "VIEWER";
    return {
      tree: {
        id: tree.tree_id,
        title: tree.title,
        root_person_id: tree.root_person_id,
        role,
        created_at: tree.created_at.toISOString(),
        updated_at: tree.updated_at.toISOString(),
      },
      persons: persons.map((p) => ({
        id: p.person_id,
        given_names: p.given_names,
        surname: p.surname,
        birth_surname: p.birth_surname,
        birth: event(p, "birth"),
        death: event(p, "death"),
        living_status: p.living_status,
        treated_as_living: treatedAsLiving(p.living_status),
        provenance: "ENTERED",
        source_note: p.source_note,
        notes: seesNotes ? p.notes : null,
        updated_at: p.updated_at.toISOString(),
      })),
      parentage,
      members,
      hidden_living_count: hidden.rows[0]?.n ?? 0,
      place_codes: [...codes].sort(),
    };
  }

  return {
    async createTree(input: {
      readonly userId: string;
      readonly title: string;
    }): Promise<CreateTreeResult> {
      const title = input.title.trim();
      if (title.length < 1 || title.length > TITLE_MAX)
        return { kind: "INVALID", problem: "TITLE" };
      const treeId = newId();
      const result = await as(input.userId, async (trx) => {
        const at = now();
        await trx
          .insertInto("trees")
          .values({
            tree_id: treeId,
            owner_user_id: input.userId,
            title,
            root_person_id: null,
            created_at: at,
            updated_at: at,
          })
          .execute();
        await audit(trx, treeId, input.userId, "TREE_CREATED");
        return { kind: "CREATED" as const, treeId };
      });
      // The insert policy accepts only the caller's own id as owner.
      if (result.kind === "FORBIDDEN")
        throw new Error("createTree: the insert policy refused the caller's own tree");
      return result;
    },

    /** The trees the caller owns or is a member of, with the people they may see. */
    async listTrees(userId: string): Promise<readonly TreeSummary[]> {
      const result = await as(userId, async (trx) => {
        const trees = await trx
          .selectFrom("trees")
          .leftJoin("members", (join) =>
            join.onRef("members.tree_id", "=", "trees.tree_id").on("members.user_id", "=", userId),
          )
          .select([
            "trees.tree_id",
            "trees.title",
            "trees.owner_user_id",
            "trees.updated_at",
            "members.role as member_role",
            (eb) =>
              eb
                .selectFrom("persons")
                .select(sql<number>`count(*)::int`.as("n"))
                .whereRef("persons.tree_id", "=", "trees.tree_id")
                .as("person_count"),
          ])
          .orderBy("trees.updated_at", "desc")
          .execute();
        return trees.map((t) => ({
          tree_id: t.tree_id,
          title: t.title,
          role: (t.owner_user_id === userId ? "OWNER" : (t.member_role ?? "VIEWER")) as TreeRole,
          person_count: t.person_count ?? 0,
          updated_at: t.updated_at.toISOString(),
        }));
      });
      return isForbidden(result) ? [] : result;
    },

    async getTree(input: {
      readonly userId: string;
      readonly treeId: string;
    }): Promise<TreeResult> {
      const result = await as(input.userId, async (trx) => read(trx, input.treeId, input.userId));
      if (result === null || isForbidden(result)) return { kind: "NOT_FOUND" };
      return { kind: "OK", tree: result };
    },

    /** The same as `getTree`, recorded as an export (ADR-0029 §2.4.14). */
    async exportTree(input: {
      readonly userId: string;
      readonly treeId: string;
    }): Promise<TreeResult> {
      const result = await as(input.userId, async (trx) => {
        const tree = await read(trx, input.treeId, input.userId);
        if (tree !== null) await audit(trx, input.treeId, input.userId, "EXPORTED");
        return tree;
      });
      if (result === null || isForbidden(result)) return { kind: "NOT_FOUND" };
      return { kind: "OK", tree: result };
    },

    /**
     * Deletes a tree with everything in it, by cascade: the audit rows go with
     * it, which is the erasure the owner asked for. Owner only.
     */
    async deleteTree(input: {
      readonly userId: string;
      readonly treeId: string;
    }): Promise<PlainResult> {
      return as(input.userId, async (trx) => {
        const role = await roleIn(trx, input.treeId, input.userId);
        if (role === null) return { kind: "NOT_FOUND" as const };
        const deleted = await trx
          .deleteFrom("trees")
          .where("tree_id", "=", input.treeId)
          .executeTakeFirst();
        if (deleted.numDeletedRows === 0n) throw new ForbiddenError();
        return { kind: "OK" as const };
      });
    },

    async addPerson(input: {
      readonly userId: string;
      readonly treeId: string;
      readonly person: PersonInput;
    }): Promise<PersonWriteResult> {
      const checked = checkPerson(input.person);
      if (!checked.ok) return { kind: "INVALID", problems: checked.problems };
      const personId = newId();
      return as(input.userId, async (trx) => {
        const role = await roleIn(trx, input.treeId, input.userId);
        if (role === null) return { kind: "NOT_FOUND" as const };
        if (role === "VIEWER") throw new ForbiddenError();
        const at = now();
        await trx
          .insertInto("persons")
          .values({
            person_id: personId,
            tree_id: input.treeId,
            ...checked.fields,
            created_by: input.userId,
            created_at: at,
            updated_at: at,
          })
          .execute();
        await audit(trx, input.treeId, input.userId, "PERSON_CREATED", personId);
        await touch(trx, input.treeId);
        return { kind: "OK" as const, personId };
      });
    },

    async updatePerson(input: {
      readonly userId: string;
      readonly personId: string;
      readonly person: PersonInput;
    }): Promise<PersonWriteResult> {
      const checked = checkPerson(input.person);
      if (!checked.ok) return { kind: "INVALID", problems: checked.problems };
      return as(input.userId, async (trx) => {
        const before = await trx
          .selectFrom("persons")
          .select(["tree_id", "living_status"])
          .where("person_id", "=", input.personId)
          .executeTakeFirst();
        if (before === undefined) return { kind: "NOT_FOUND" as const };
        const updated = await trx
          .updateTable("persons")
          .set({ ...checked.fields, updated_at: now() })
          .where("person_id", "=", input.personId)
          .executeTakeFirst();
        if (updated.numUpdatedRows === 0n) throw new ForbiddenError();
        await audit(trx, before.tree_id, input.userId, "PERSON_UPDATED", input.personId);
        if (before.living_status !== checked.fields.living_status) {
          await audit(trx, before.tree_id, input.userId, "LIVING_STATUS_CHANGED", input.personId);
        }
        await touch(trx, before.tree_id);
        return { kind: "OK" as const, personId: input.personId };
      });
    },

    async deletePerson(input: {
      readonly userId: string;
      readonly personId: string;
    }): Promise<PlainResult> {
      return as(input.userId, async (trx) => {
        const before = await trx
          .selectFrom("persons")
          .select("tree_id")
          .where("person_id", "=", input.personId)
          .executeTakeFirst();
        if (before === undefined) return { kind: "NOT_FOUND" as const };
        const deleted = await trx
          .deleteFrom("persons")
          .where("person_id", "=", input.personId)
          .executeTakeFirst();
        if (deleted.numDeletedRows === 0n) throw new ForbiddenError();
        await audit(trx, before.tree_id, input.userId, "PERSON_DELETED", input.personId);
        await touch(trx, before.tree_id);
        return { kind: "OK" as const };
      });
    },

    /**
     * Makes one person a parent of another, with a role; a link that exists
     * takes the new role. Both must be in one tree the caller may write, a
     * child has at most two parents, and nobody becomes their own ancestor.
     */
    async setParent(input: {
      readonly userId: string;
      readonly childId: string;
      readonly parentId: string;
      readonly role: ParentRole;
    }): Promise<ParentResult> {
      if (input.childId === input.parentId) return { kind: "INVALID", problem: "SAME_PERSON" };
      return as(input.userId, async (trx) => {
        const people = await trx
          .selectFrom("persons")
          .select(["person_id", "tree_id"])
          .where("person_id", "in", [input.childId, input.parentId])
          .execute();
        const child = people.find((p) => p.person_id === input.childId);
        const parent = people.find((p) => p.person_id === input.parentId);
        if (child === undefined || parent === undefined) return { kind: "NOT_FOUND" as const };
        if (child.tree_id !== parent.tree_id)
          return { kind: "INVALID" as const, problem: "DIFFERENT_TREES" as const };
        const role = await roleIn(trx, child.tree_id, input.userId);
        if (role === null) return { kind: "NOT_FOUND" as const };
        if (role === "VIEWER") throw new ForbiddenError();
        const ids = (
          await trx
            .selectFrom("persons")
            .select("person_id")
            .where("tree_id", "=", child.tree_id)
            .execute()
        ).map((p) => p.person_id);
        const edges = await trx
          .selectFrom("parentage")
          .select(["child_id", "parent_id"])
          .where("child_id", "in", ids)
          .execute();
        const existing = edges.some(
          (e) => e.child_id === input.childId && e.parent_id === input.parentId,
        );
        if (!existing && parentCount(edges, input.childId) >= 2) {
          return { kind: "INVALID" as const, problem: "TOO_MANY_PARENTS" as const };
        }
        if (wouldCycle(edges, input.childId, input.parentId)) {
          return { kind: "INVALID" as const, problem: "WOULD_CYCLE" as const };
        }
        if (existing) {
          // No UPDATE policy on parentage: replace the row.
          await trx
            .deleteFrom("parentage")
            .where("child_id", "=", input.childId)
            .where("parent_id", "=", input.parentId)
            .execute();
        }
        await trx
          .insertInto("parentage")
          .values({
            child_id: input.childId,
            parent_id: input.parentId,
            role: input.role,
            created_at: now(),
          })
          .execute();
        await audit(trx, child.tree_id, input.userId, "PARENT_SET", input.childId);
        await touch(trx, child.tree_id);
        return { kind: "OK" as const };
      });
    },

    async removeParent(input: {
      readonly userId: string;
      readonly childId: string;
      readonly parentId: string;
    }): Promise<PlainResult> {
      return as(input.userId, async (trx) => {
        const child = await trx
          .selectFrom("persons")
          .select("tree_id")
          .where("person_id", "=", input.childId)
          .executeTakeFirst();
        if (child === undefined) return { kind: "NOT_FOUND" as const };
        const role = await roleIn(trx, child.tree_id, input.userId);
        if (role === "VIEWER") throw new ForbiddenError();
        const deleted = await trx
          .deleteFrom("parentage")
          .where("child_id", "=", input.childId)
          .where("parent_id", "=", input.parentId)
          .executeTakeFirst();
        if (deleted.numDeletedRows === 0n) return { kind: "NOT_FOUND" as const };
        await audit(trx, child.tree_id, input.userId, "PARENT_REMOVED", input.childId);
        await touch(trx, child.tree_id);
        return { kind: "OK" as const };
      });
    },

    /** The person the pedigree is read from ("Ty"), or none. Must be in the tree. */
    async setRoot(input: {
      readonly userId: string;
      readonly treeId: string;
      readonly personId: string | null;
    }): Promise<ParentResult> {
      return as(input.userId, async (trx) => {
        const role = await roleIn(trx, input.treeId, input.userId);
        if (role === null) return { kind: "NOT_FOUND" as const };
        if (role !== "OWNER") throw new ForbiddenError();
        if (input.personId !== null) {
          const person = await trx
            .selectFrom("persons")
            .select("tree_id")
            .where("person_id", "=", input.personId)
            .executeTakeFirst();
          if (person === undefined) return { kind: "NOT_FOUND" as const };
          if (person.tree_id !== input.treeId)
            return { kind: "INVALID" as const, problem: "DIFFERENT_TREES" as const };
        }
        await trx
          .updateTable("trees")
          .set({ root_person_id: input.personId, updated_at: now() })
          .where("tree_id", "=", input.treeId)
          .execute();
        return { kind: "OK" as const };
      });
    },

    /**
     * Lets another account open the tree. Living people stay hidden from them
     * until `setSeesLiving`. The invitation flow of ADR-0029 §2.6 is not here:
     * this is the row it will end in. Owner only.
     */
    async addMember(input: {
      readonly userId: string;
      readonly treeId: string;
      readonly memberUserId: string;
      readonly role: MemberRole;
    }): Promise<MemberResult> {
      if (input.userId === input.memberUserId) return { kind: "INVALID", problem: "SELF" };
      return as(input.userId, async (trx) => {
        const role = await roleIn(trx, input.treeId, input.userId);
        if (role === null) return { kind: "NOT_FOUND" as const };
        if (role !== "OWNER") throw new ForbiddenError();
        try {
          await trx
            .insertInto("members")
            .values({
              tree_id: input.treeId,
              user_id: input.memberUserId,
              role: input.role,
              sees_living: false,
              invited_by: input.userId,
              accepted_at: now(),
            })
            .execute();
        } catch (error) {
          const code = pgCode(error);
          if (code === "23505")
            return { kind: "INVALID" as const, problem: "ALREADY_MEMBER" as const };
          if (code === "23503")
            return { kind: "INVALID" as const, problem: "UNKNOWN_USER" as const };
          throw error;
        }
        await audit(trx, input.treeId, input.userId, "MEMBER_ADDED");
        return { kind: "OK" as const };
      });
    },

    async removeMember(input: {
      readonly userId: string;
      readonly treeId: string;
      readonly memberUserId: string;
    }): Promise<PlainResult> {
      return as(input.userId, async (trx) => {
        const role = await roleIn(trx, input.treeId, input.userId);
        if (role === null) return { kind: "NOT_FOUND" as const };
        if (role !== "OWNER") throw new ForbiddenError();
        const deleted = await trx
          .deleteFrom("members")
          .where("tree_id", "=", input.treeId)
          .where("user_id", "=", input.memberUserId)
          .executeTakeFirst();
        if (deleted.numDeletedRows === 0n) return { kind: "NOT_FOUND" as const };
        await audit(trx, input.treeId, input.userId, "MEMBER_REMOVED");
        return { kind: "OK" as const };
      });
    },

    /** Whether a member sees the living and unknown people. Owner only; an audit event either way. */
    async setSeesLiving(input: {
      readonly userId: string;
      readonly treeId: string;
      readonly memberUserId: string;
      readonly seesLiving: boolean;
    }): Promise<PlainResult> {
      return as(input.userId, async (trx) => {
        const role = await roleIn(trx, input.treeId, input.userId);
        if (role === null) return { kind: "NOT_FOUND" as const };
        if (role !== "OWNER") throw new ForbiddenError();
        const updated = await trx
          .updateTable("members")
          .set({ sees_living: input.seesLiving })
          .where("tree_id", "=", input.treeId)
          .where("user_id", "=", input.memberUserId)
          .executeTakeFirst();
        if (updated.numUpdatedRows === 0n) return { kind: "NOT_FOUND" as const };
        await audit(trx, input.treeId, input.userId, "SEES_LIVING_CHANGED");
        return { kind: "OK" as const };
      });
    },
  };
}

export type Family = ReturnType<typeof createFamily>;
