import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Kysely, Transaction } from "kysely";
import {
  checkHiddenFields,
  checkPerson,
  FREE_TREE_PERSONS_MAX,
  INVITATION_DAYS,
  INVITATION_WINDOW_DAYS,
  INVITATIONS_PER_WINDOW,
  inviteProblem,
  noPaidTier,
  parentCount,
  treatedAsLiving,
  wouldCycle,
} from "./rules.js";
import type { InviteProblem, PersonInput, PersonProblem } from "./rules.js";
import type {
  AuditKind,
  FamilyDB,
  HiddenField,
  InvitationAnswer,
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
 *
 * Invitations and claims (TASK-094, ADR-0029 §2.6): the owner sends one
 * invitation per living person, the route mails it, and the invited person,
 * signed in with any account, opens it with the token (carried in the
 * transaction as `app.invitation`, which the policies read) and answers.
 * The token and the address reach this service only as their SHA-256, hex.
 */

export interface FamilyDeps {
  readonly db: Kysely<FamilyDB>;
  readonly now?: () => Date;
  readonly newId?: () => string;
  /**
   * Whether an account has a paid tier, which lifts the free tree's cap
   * (`FREE_TREE_PERSONS_MAX`). Defaults to `noPaidTier` (TASK-112); the web
   * passes the accounts package's `hasPurchase` (TASK-114).
   */
  readonly hasPaidTier?: (userId: string) => Promise<boolean>;
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
  /** Someone answered "to ja" to an invitation for this row (TASK-094). */
  readonly claimed: boolean;
  readonly claimed_by_me: boolean;
  /** What the claimant keeps from everyone else; for them the fields are blank here. */
  readonly hidden_fields: readonly HiddenField[];
  /** The person answered "nie chcę kontaktu": the owner alone reads the row (D-031). */
  readonly contact_declined: boolean;
}

/** What an invited person, or a claimant, sees: their own row and the parents' names (§2.6.21). */
export interface CardRead {
  readonly person: {
    readonly id: string;
    readonly given_names: string;
    readonly surname: string;
    readonly birth_surname: string | null;
    readonly birth: LifeEventRead;
    readonly hidden_fields: readonly HiddenField[];
    readonly claimed_at: string | null;
  };
  readonly parents: readonly {
    readonly given_names: string;
    readonly surname: string;
    readonly role: ParentRole;
  }[];
}

export interface CardSummary {
  readonly person_id: string;
  readonly given_names: string;
  readonly surname: string;
  readonly claimed_at: string;
}

/** The claimant's own fields (§2.6.22); the status stays `LIVING`, and death, source and notes are the owner's. */
export interface CardInput {
  readonly givenNames: string;
  readonly surname: string;
  readonly birthSurname?: string | null;
  readonly birthYear?: number | null;
  readonly birthYearApprox?: boolean;
  readonly birthPlaceCode?: string | null;
  readonly birthPlaceText?: string | null;
  readonly hiddenFields: readonly unknown[];
}

/** An invitation as its owner sees it: when, until when, and the answer. */
export interface InvitationRead {
  readonly invitation_id: string;
  readonly sent_at: string;
  readonly expires_at: string;
  readonly answered_at: string | null;
  readonly answer: InvitationAnswer | null;
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
  /** Someone else has claimed the row: its fields are theirs now (§2.6.22). */
  | { readonly kind: "CLAIMED" }
  | NotFound
  | Forbidden;
/**
 * `addPerson`'s answers: a write's, and the free tree's cap, reached when the
 * tree's owner has no paid tier and the tree already holds `limit` people.
 */
export type AddPersonResult =
  PersonWriteResult | { readonly kind: "PERSON_LIMIT"; readonly limit: number };
export type InviteResult =
  | { readonly kind: "OK"; readonly invitationId: string; readonly expiresAt: Date }
  | { readonly kind: "INVALID"; readonly problem: InviteProblem }
  | NotFound
  | Forbidden;
export type OpenInvitationResult =
  | { readonly kind: "OK"; readonly card: CardRead }
  | { readonly kind: "EXPIRED" }
  | { readonly kind: "ANSWERED" }
  | NotFound;
export type AnswerProblem = "ALREADY_CLAIMED" | "ALREADY_IN_TREE";
export type AnswerResult =
  | { readonly kind: "OK"; readonly treeId: string; readonly personId: string }
  | { readonly kind: "EXPIRED" }
  | { readonly kind: "ANSWERED" }
  | { readonly kind: "INVALID"; readonly problem: AnswerProblem }
  | NotFound;
export type CardResult = { readonly kind: "OK"; readonly card: CardRead } | NotFound;
export type CardWriteResult =
  | { readonly kind: "OK" }
  | { readonly kind: "INVALID"; readonly problems: readonly (PersonProblem | "HIDDEN_FIELDS")[] }
  | NotFound
  | Forbidden;
export type ParentProblem =
  "SAME_PERSON" | "DIFFERENT_TREES" | "TOO_MANY_PARENTS" | "ROLE_TAKEN" | "WOULD_CYCLE";
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
  const hasPaidTier = deps.hasPaidTier ?? noPaidTier;

  /**
   * One transaction as one user: the policies see `app.user_id` for its
   * length, and `app.invitation` (a token's hash) when the caller holds one.
   */
  async function as<T>(
    userId: string,
    work: (trx: Trx) => Promise<T>,
    invitation: string | null = null,
  ): Promise<T | Forbidden> {
    try {
      return await db.transaction().execute(async (trx) => {
        await sql`SELECT set_config('app.user_id', ${userId}, true)`.execute(trx);
        if (invitation !== null) {
          await sql`SELECT set_config('app.invitation', ${invitation}, true)`.execute(trx);
        }
        return work(trx);
      });
    } catch (error) {
      if (error instanceof ForbiddenError || isPolicyRefusal(error)) return { kind: "FORBIDDEN" };
      throw error;
    }
  }

  // Graph edits and visibility changes share this lock. A request that waits
  // for it must check its permission again before reading the complete graph.
  async function lockTree(trx: Trx, treeId: string): Promise<void> {
    await sql`SELECT pg_advisory_xact_lock(hashtextextended(${treeId}, 0))`.execute(trx);
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
    // Not an UPDATE: the policy lets only the owner update `trees`, and an
    // editor's change must move `updated_at` too.
    await sql`SELECT family.touch_tree(${treeId}::uuid, ${now()}::timestamptz)`.execute(trx);
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
    const hiddenLiving = await sql<{
      n: number;
    }>`SELECT family.hidden_living_count(${treeId}) AS n`.execute(trx);
    const codes = new Set<string>();
    for (const p of persons) {
      if (p.birth_place_code !== null) codes.add(p.birth_place_code);
      if (p.death_place_code !== null) codes.add(p.death_place_code);
    }
    const seesNotes = role !== "VIEWER";
    const hidden = (p: PersonsTable, field: HiddenField): boolean =>
      p.claimed_by_user_id !== null &&
      p.claimed_by_user_id !== userId &&
      p.hidden_fields.includes(field);
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
        birth_surname: hidden(p, "birth_surname") ? null : p.birth_surname,
        birth: {
          year: hidden(p, "birth_year") ? null : p.birth_year,
          approx: hidden(p, "birth_year") ? false : p.birth_year_approx,
          place_code: hidden(p, "birth_place") ? null : p.birth_place_code,
          place_text: hidden(p, "birth_place") ? null : p.birth_place_text,
        },
        death: event(p, "death"),
        living_status: p.living_status,
        treated_as_living: treatedAsLiving(p.living_status),
        provenance: "ENTERED",
        source_note: p.source_note,
        notes: seesNotes ? p.notes : null,
        updated_at: p.updated_at.toISOString(),
        claimed: p.claimed_by_user_id !== null,
        claimed_by_me: p.claimed_by_user_id === userId,
        hidden_fields: p.hidden_fields,
        contact_declined: p.contact_declined,
      })),
      parentage,
      members,
      hidden_living_count: hiddenLiving.rows[0]?.n ?? 0,
      place_codes: [...codes].sort(),
    };
  }

  /** The caller's own row with the parents' names: what the policies let an invited person or a claimant read. */
  async function card(trx: Trx, personId: string): Promise<CardRead | null> {
    const p = await trx
      .selectFrom("persons")
      .selectAll()
      .where("person_id", "=", personId)
      .executeTakeFirst();
    if (p === undefined) return null;
    const parents = await trx
      .selectFrom("parentage")
      .innerJoin("persons as parent", "parent.person_id", "parentage.parent_id")
      .select(["parent.given_names", "parent.surname", "parentage.role"])
      .where("parentage.child_id", "=", personId)
      .orderBy("parentage.created_at")
      .execute();
    return {
      person: {
        id: p.person_id,
        given_names: p.given_names,
        surname: p.surname,
        birth_surname: p.birth_surname,
        birth: event(p, "birth"),
        hidden_fields: p.hidden_fields,
        claimed_at: p.claimed_at === null ? null : p.claimed_at.toISOString(),
      },
      parents: parents.map((r) => ({
        given_names: r.given_names,
        surname: r.surname,
        role: r.role,
      })),
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
    }): Promise<AddPersonResult> {
      const checked = checkPerson(input.person);
      if (!checked.ok) return { kind: "INVALID", problems: checked.problems };
      const personId = newId();
      return as(input.userId, async (trx) => {
        const role = await roleIn(trx, input.treeId, input.userId);
        if (role === null) return { kind: "NOT_FOUND" as const };
        if (role === "VIEWER") throw new ForbiddenError();
        // The cap is the owner's account's, whoever adds the person. The count
        // is every row of the tree, also those an editor may not see, and the
        // lock keeps two adds from both passing it.
        const tree = await trx
          .selectFrom("trees")
          .select("owner_user_id")
          .where("tree_id", "=", input.treeId)
          .executeTakeFirstOrThrow();
        if (!(await hasPaidTier(tree.owner_user_id))) {
          await lockTree(trx, input.treeId);
          const count = await sql<{
            n: number;
          }>`SELECT family.tree_person_count(${input.treeId}::uuid) AS n`.execute(trx);
          if ((count.rows[0]?.n ?? 0) >= FREE_TREE_PERSONS_MAX)
            return { kind: "PERSON_LIMIT" as const, limit: FREE_TREE_PERSONS_MAX };
        }
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
            claimed_by_user_id: null,
            claimed_at: null,
            contact_declined: false,
            hidden_fields: [],
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
          .select(["tree_id", "living_status", "claimed_by_user_id"])
          .where("person_id", "=", input.personId)
          .executeTakeFirst();
        if (before === undefined) return { kind: "NOT_FOUND" as const };
        if (before.claimed_by_user_id !== null && before.claimed_by_user_id !== input.userId) {
          return { kind: "CLAIMED" as const };
        }
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
        await lockTree(trx, before.tree_id);
        // Deleting a person removes every parent link to and from them, the
        // living ones the caller cannot see included, so it needs the same view
        // of the tree that `setParent` needs.
        const visible = await sql<{
          allowed: boolean;
        }>`SELECT family.sees_living(${before.tree_id}::uuid) AS allowed`.execute(trx);
        if (!visible.rows[0]?.allowed) throw new ForbiddenError();
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
        await lockTree(trx, child.tree_id);
        // The graph checks need every edge. An editor who cannot see living
        // people cannot safely alter parentage through a partially hidden graph.
        const visible = await sql<{
          allowed: boolean;
        }>`SELECT family.sees_living(${child.tree_id}::uuid) AS allowed`.execute(trx);
        if (!visible.rows[0]?.allowed) throw new ForbiddenError();
        // Serialize graph edits per tree before checking the current edges:
        // concurrent requests must not each approve a third parent or a cycle.
        const ids = (
          await trx
            .selectFrom("persons")
            .select("person_id")
            .where("tree_id", "=", child.tree_id)
            .execute()
        ).map((p) => p.person_id);
        const edges = await trx
          .selectFrom("parentage")
          .select(["child_id", "parent_id", "role"])
          .where("child_id", "in", ids)
          .execute();
        const existing = edges.some(
          (e) => e.child_id === input.childId && e.parent_id === input.parentId,
        );
        if (!existing && parentCount(edges, input.childId) >= 2) {
          return { kind: "INVALID" as const, problem: "TOO_MANY_PARENTS" as const };
        }
        if (
          input.role !== "PARENT" &&
          edges.some(
            (e) =>
              e.child_id === input.childId &&
              e.parent_id !== input.parentId &&
              e.role === input.role,
          )
        ) {
          return { kind: "INVALID" as const, problem: "ROLE_TAKEN" as const };
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
        await lockTree(trx, input.treeId);
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
        await lockTree(trx, input.treeId);
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

    // --- Invitations and claims (TASK-094, ADR-0029 §2.6) -------------------

    /**
     * Records one invitation for a person and hands back its id and expiry;
     * the route sends the mail, whose token is known here only as its hash.
     * Owner only; the rules of §2.6.20, each named.
     */
    async invite(input: {
      readonly userId: string;
      readonly treeId: string;
      readonly personId: string;
      /** The SHA-256 of the token, hex. */
      readonly tokenHash: string;
      /** The SHA-256 of the normalised address, hex. */
      readonly addressHash: string;
    }): Promise<InviteResult> {
      return as(input.userId, async (trx) => {
        const role = await roleIn(trx, input.treeId, input.userId);
        if (role === null) return { kind: "NOT_FOUND" as const };
        if (role !== "OWNER") throw new ForbiddenError();
        await lockTree(trx, input.treeId);
        const person = await trx
          .selectFrom("persons")
          .select([
            "tree_id",
            "living_status",
            "birth_year",
            "claimed_by_user_id",
            "contact_declined",
          ])
          .where("person_id", "=", input.personId)
          .executeTakeFirst();
        if (person === undefined || person.tree_id !== input.treeId)
          return { kind: "NOT_FOUND" as const };
        const at = now();
        const problem = inviteProblem(person, at);
        if (problem !== null) return { kind: "INVALID" as const, problem };
        const suppressed = await trx
          .selectFrom("suppressions")
          .select("address_hash")
          .where("tree_id", "=", input.treeId)
          .where("address_hash", "=", input.addressHash)
          .executeTakeFirst();
        if (suppressed !== undefined)
          return { kind: "INVALID" as const, problem: "SUPPRESSED" as const };
        const pending = await trx
          .selectFrom("invitations")
          .select("invitation_id")
          .where("person_id", "=", input.personId)
          .where("answered_at", "is", null)
          .where("expires_at", ">", at)
          .executeTakeFirst();
        if (pending !== undefined) return { kind: "INVALID" as const, problem: "PENDING" as const };
        const since = new Date(at.getTime() - INVITATION_WINDOW_DAYS * 86_400_000);
        const sent = await trx
          .selectFrom("invitations")
          .select(sql<number>`count(*)::int`.as("n"))
          .where("tree_id", "=", input.treeId)
          .where("sent_at", ">", since)
          .executeTakeFirst();
        if ((sent?.n ?? 0) >= INVITATIONS_PER_WINDOW)
          return { kind: "INVALID" as const, problem: "LIMIT" as const };
        // An expired, unanswered invitation gives way to the new one.
        await trx
          .deleteFrom("invitations")
          .where("person_id", "=", input.personId)
          .where("answered_at", "is", null)
          .execute();
        const invitationId = newId();
        const expiresAt = new Date(at.getTime() + INVITATION_DAYS * 86_400_000);
        await trx
          .insertInto("invitations")
          .values({
            invitation_id: invitationId,
            tree_id: input.treeId,
            person_id: input.personId,
            token_hash: input.tokenHash,
            address_hash: input.addressHash,
            sent_by: input.userId,
            sent_at: at,
            expires_at: expiresAt,
            answered_at: null,
            answer: null,
            answered_by: null,
          })
          .execute();
        await audit(trx, input.treeId, input.userId, "INVITATION_SENT", input.personId);
        return { kind: "OK" as const, invitationId, expiresAt };
      });
    },

    /** Takes back an unanswered invitation whose mail could not be sent. Owner only. */
    async withdrawInvitation(input: {
      readonly userId: string;
      readonly invitationId: string;
    }): Promise<PlainResult> {
      return as(input.userId, async (trx) => {
        const deleted = await trx
          .deleteFrom("invitations")
          .where("invitation_id", "=", input.invitationId)
          .where("answered_at", "is", null)
          .executeTakeFirst();
        return deleted.numDeletedRows === 0n
          ? { kind: "NOT_FOUND" as const }
          : { kind: "OK" as const };
      });
    },

    /** The latest invitation for a person, as its owner sees it, or null. */
    async invitationOf(input: {
      readonly userId: string;
      readonly personId: string;
    }): Promise<InvitationRead | null> {
      const result = await as(input.userId, async (trx) => {
        const row = await trx
          .selectFrom("invitations")
          .select(["invitation_id", "sent_at", "expires_at", "answered_at", "answer"])
          .where("person_id", "=", input.personId)
          .orderBy("sent_at", "desc")
          .executeTakeFirst();
        if (row === undefined) return null;
        return {
          invitation_id: row.invitation_id,
          sent_at: row.sent_at.toISOString(),
          expires_at: row.expires_at.toISOString(),
          answered_at: row.answered_at === null ? null : row.answered_at.toISOString(),
          answer: row.answer,
        };
      });
      return isForbidden(result) ? null : result;
    },

    /**
     * What the holder of a token sees after signing in: their own row and the
     * parents' names, and nothing else of the tree (§2.6.21). The policies do
     * the hiding; this only reads.
     */
    async openInvitation(input: {
      readonly userId: string;
      readonly tokenHash: string;
    }): Promise<OpenInvitationResult> {
      const result = await as(
        input.userId,
        async (trx) => {
          const inv = await trx
            .selectFrom("invitations")
            .select(["person_id", "expires_at", "answered_at"])
            .where("token_hash", "=", input.tokenHash)
            .executeTakeFirst();
          if (inv === undefined) return { kind: "NOT_FOUND" as const };
          if (inv.answered_at !== null) return { kind: "ANSWERED" as const };
          if (inv.expires_at <= now()) return { kind: "EXPIRED" as const };
          const found = await card(trx, inv.person_id);
          return found === null
            ? { kind: "NOT_FOUND" as const }
            : { kind: "OK" as const, card: found };
        },
        input.tokenHash,
      );
      return isForbidden(result) ? { kind: "NOT_FOUND" } : result;
    },

    /** Spends the token with one of the three answers (§2.6.22–23), through `family.answer_invitation`. */
    async answerInvitation(input: {
      readonly userId: string;
      readonly tokenHash: string;
      readonly answer: InvitationAnswer;
    }): Promise<AnswerResult> {
      const result = await as(
        input.userId,
        async (trx) => {
          const rows = await sql<{
            outcome: string;
            tree_id: string | null;
            person_id: string | null;
          }>`SELECT outcome, tree_id, person_id FROM family.answer_invitation(${input.tokenHash}, ${input.answer}::family.invitation_answer, ${now()}::timestamptz)`.execute(
            trx,
          );
          const row = rows.rows[0];
          if (row === undefined) return { kind: "NOT_FOUND" as const };
          switch (row.outcome) {
            case "OK":
              return {
                kind: "OK" as const,
                treeId: row.tree_id ?? "",
                personId: row.person_id ?? "",
              };
            case "EXPIRED":
              return { kind: "EXPIRED" as const };
            case "ANSWERED":
              return { kind: "ANSWERED" as const };
            case "ALREADY_CLAIMED":
              return { kind: "INVALID" as const, problem: "ALREADY_CLAIMED" as const };
            case "ALREADY_IN_TREE":
              return { kind: "INVALID" as const, problem: "ALREADY_IN_TREE" as const };
            default:
              return { kind: "NOT_FOUND" as const };
          }
        },
        input.tokenHash,
      );
      return isForbidden(result) ? { kind: "NOT_FOUND" } : result;
    },

    /** The rows the caller has claimed, in any tree. */
    async listCards(userId: string): Promise<readonly CardSummary[]> {
      const result = await as(userId, async (trx) => {
        const rows = await trx
          .selectFrom("persons")
          .select(["person_id", "given_names", "surname", "claimed_at"])
          .where("claimed_by_user_id", "=", userId)
          .orderBy("claimed_at", "desc")
          .execute();
        return rows.map((r) => ({
          person_id: r.person_id,
          given_names: r.given_names,
          surname: r.surname,
          claimed_at: (r.claimed_at ?? new Date(0)).toISOString(),
        }));
      });
      return isForbidden(result) ? [] : result;
    },

    /** One claimed row with the parents' names, for its claimant. */
    async getCard(input: {
      readonly userId: string;
      readonly personId: string;
    }): Promise<CardResult> {
      const result = await as(input.userId, async (trx) => {
        const mine = await trx
          .selectFrom("persons")
          .select("claimed_by_user_id")
          .where("person_id", "=", input.personId)
          .executeTakeFirst();
        if (mine === undefined || mine.claimed_by_user_id !== input.userId)
          return { kind: "NOT_FOUND" as const };
        const found = await card(trx, input.personId);
        return found === null
          ? { kind: "NOT_FOUND" as const }
          : { kind: "OK" as const, card: found };
      });
      return isForbidden(result) ? { kind: "NOT_FOUND" } : result;
    },

    /** The claimant corrects their own fields and chooses what to hide (§2.6.22). */
    async updateCard(input: {
      readonly userId: string;
      readonly personId: string;
      readonly card: CardInput;
    }): Promise<CardWriteResult> {
      const checked = checkPerson({
        givenNames: input.card.givenNames,
        surname: input.card.surname,
        birthSurname: input.card.birthSurname,
        birthYear: input.card.birthYear,
        birthYearApprox: input.card.birthYearApprox,
        birthPlaceCode: input.card.birthPlaceCode,
        birthPlaceText: input.card.birthPlaceText,
        livingStatus: "LIVING",
      });
      if (!checked.ok) return { kind: "INVALID", problems: checked.problems };
      const hiddenFields = checkHiddenFields(input.card.hiddenFields);
      if (hiddenFields === null) return { kind: "INVALID", problems: ["HIDDEN_FIELDS"] };
      return as(input.userId, async (trx) => {
        const before = await trx
          .selectFrom("persons")
          .select(["tree_id", "claimed_by_user_id"])
          .where("person_id", "=", input.personId)
          .executeTakeFirst();
        if (before === undefined || before.claimed_by_user_id !== input.userId)
          return { kind: "NOT_FOUND" as const };
        const updated = await trx
          .updateTable("persons")
          .set({
            given_names: checked.fields.given_names,
            surname: checked.fields.surname,
            birth_surname: checked.fields.birth_surname,
            birth_year: checked.fields.birth_year,
            birth_year_approx: checked.fields.birth_year_approx,
            birth_place_code: checked.fields.birth_place_code,
            birth_place_text: checked.fields.birth_place_text,
            hidden_fields: [...hiddenFields],
            updated_at: now(),
          })
          .where("person_id", "=", input.personId)
          .executeTakeFirst();
        if (updated.numUpdatedRows === 0n) throw new ForbiddenError();
        await audit(trx, before.tree_id, input.userId, "PERSON_UPDATED", input.personId);
        return { kind: "OK" as const };
      });
    },

    /** The claimant leaves: the claim goes, the row returns to the owner's note, the address is suppressed (§2.6.22). */
    async leaveTree(input: {
      readonly userId: string;
      readonly personId: string;
    }): Promise<PlainResult> {
      return as(input.userId, async (trx) => {
        const rows = await sql<{
          released: boolean;
        }>`SELECT family.release_claim(${input.personId}::uuid, ${now()}::timestamptz) AS released`.execute(
          trx,
        );
        return rows.rows[0]?.released ? { kind: "OK" as const } : { kind: "NOT_FOUND" as const };
      });
    },
  };
}

export type Family = ReturnType<typeof createFamily>;
