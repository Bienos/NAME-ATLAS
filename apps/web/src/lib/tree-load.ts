import type { Family, TreePersonRead, TreeRead, TreeSummary } from "@name-atlas/family";
import { accountPath } from "./account-paths.js";
import type { Lang } from "./messages.js";
import {
  draftFrom,
  draftOf,
  EMPTY_DRAFT,
  hasDraft,
  isId,
  isSlotRole,
  treePath,
  treeTarget,
} from "./tree-paths.js";
import type { PersonDraft, SlotRole, TreeTarget } from "./tree-paths.js";
import { pickSlot } from "./tree-constellation.js";
import { nextQuestion, parentsOf, pedigree, unplaced } from "./tree-pedigree.js";
import type { Question, Slot } from "./tree-pedigree.js";
import type { PlaceMatch } from "./tree-places.js";
import { treeStatusWords } from "./tree-text.js";

/**
 * What each tree page shows, decided and loaded here (TASK-076), away from
 * Next and React, so an integration test can run it against a real database
 * as the real role and assert on the data, and the view tests can render the
 * data without one.
 *
 * Every read goes through the service with the session's user id and nothing
 * else; a tree the reader may not open is "not found" (ADR-0029 §2.3). The
 * birthplace lookup is the one read outside the tree, through the register's
 * read-only pool, and carries only what the reader typed.
 */

export interface TreeSession {
  readonly userId: string;
  readonly termsVersion: string;
}

export interface TreeLoadDeps {
  readonly family: Pick<Family, "listTrees" | "getTree">;
  /** The TERYT lookup, or null where the register is not configured. */
  readonly places: ((typed: string) => Promise<readonly PlaceMatch[]>) | null;
}

export type Query = Readonly<Record<string, string | readonly string[] | undefined>>;

export function first(query: Query, name: string): string | null {
  const value = query[name];
  const text = Array.isArray(value) ? value[0] : value;
  return typeof text === "string" && text !== "" ? text : null;
}

/** What a place search found: matches, none, or the register was unreachable. */
export type PlaceSearch =
  | { readonly kind: "none" }
  | { readonly kind: "found"; readonly matches: readonly PlaceMatch[] }
  | { readonly kind: "empty" }
  | { readonly kind: "unavailable" };

export interface PersonFormData {
  readonly draft: PersonDraft;
  readonly search: PlaceSearch;
}

export type TreePageData =
  | {
      readonly kind: "trees";
      readonly lang: Lang;
      readonly status: string | null;
      readonly trees: readonly TreeSummary[];
      /** The first tree, read for its question; null with no tree. */
      readonly firstTree: TreeRead | null;
      readonly question: Question | null;
    }
  | {
      readonly kind: "consent";
      readonly lang: Lang;
      readonly status: string | null;
      readonly tree: TreeRead;
      readonly form: PersonFormData;
      /** Who is being saved: a new person, linked or not, or an existing one. */
      readonly subject:
        | {
            readonly kind: "add";
            readonly child: TreePersonRead | null;
            readonly role: SlotRole | null;
          }
        | { readonly kind: "update"; readonly person: TreePersonRead };
    }
  | {
      readonly kind: "tree";
      readonly lang: Lang;
      readonly status: string | null;
      readonly tree: TreeRead;
      readonly slots: readonly Slot[];
      readonly unplaced: readonly TreePersonRead[];
      readonly question: Question;
      /** The person a status word is about, when the address names one the tree has. */
      readonly person: TreePersonRead | null;
    }
  | {
      /** The Konstelacja view (TASK-084): the same slots as the pedigree, and the picked one. */
      readonly kind: "constellation";
      readonly lang: Lang;
      readonly status: string | null;
      readonly tree: TreeRead;
      readonly slots: readonly Slot[];
      readonly picked: number;
      readonly unplacedCount: number;
    }
  | {
      readonly kind: "add";
      readonly lang: Lang;
      readonly status: string | null;
      readonly tree: TreeRead;
      /** The person whose parent is being added, with the role; both null for a person on their own. */
      readonly child: TreePersonRead | null;
      readonly role: SlotRole | null;
      /** The parents the child already has, so the choice of role offers only the missing one. */
      readonly childHas: readonly SlotRole[];
      readonly form: PersonFormData;
    }
  | {
      readonly kind: "person";
      readonly lang: Lang;
      readonly status: string | null;
      readonly tree: TreeRead;
      readonly person: TreePersonRead;
      readonly parents: ReturnType<typeof parentsOf>;
      /** The other people of the tree, for linking an existing one as a parent. */
      readonly others: readonly TreePersonRead[];
      readonly form: PersonFormData;
    };

export type TreeDecision =
  | { readonly kind: "not-found" }
  | { readonly kind: "redirect"; readonly to: string }
  | { readonly kind: "view"; readonly data: TreePageData };

function statusOf(lang: Lang, page: TreePageData["kind"], query: Query): string | null {
  const word = first(query, "status");
  return treeStatusWords(lang, page, word) === null ? null : word;
}

async function formOf(
  query: Query,
  fallback: PersonDraft,
  deps: TreeLoadDeps,
): Promise<PersonFormData> {
  const get = (name: string): string | null => first(query, name);
  const draft = hasDraft(get) ? draftFrom(get) : fallback;
  if (first(query, "search") === null) return { draft, search: { kind: "none" } };
  if (deps.places === null) return { draft, search: { kind: "unavailable" } };
  try {
    const matches = await deps.places(draft.placeText);
    return { draft, search: matches.length === 0 ? { kind: "empty" } : { kind: "found", matches } };
  } catch {
    return { draft, search: { kind: "unavailable" } };
  }
}

function rolesHeld(tree: TreeRead, childId: string): readonly SlotRole[] {
  const held: SlotRole[] = [];
  const rows = tree.parentage.filter((r) => r.child_id === childId);
  const unknown = rows.filter((r) => r.role === "PARENT").length;
  if (rows.some((r) => r.role === "FATHER") || unknown >= 1) held.push("FATHER");
  if (rows.some((r) => r.role === "MOTHER") || unknown >= 2) held.push("MOTHER");
  return held;
}

export async function loadTreePage(input: {
  readonly enabled: boolean;
  readonly lang: Lang;
  readonly segments: readonly string[] | undefined;
  readonly query: Query;
  readonly session: TreeSession | null;
  readonly deps: TreeLoadDeps;
}): Promise<TreeDecision> {
  const { lang, query, session, deps } = input;
  if (!input.enabled) return { kind: "not-found" };
  const target: TreeTarget | null = treeTarget(lang, input.segments);
  if (target === null) return { kind: "not-found" };
  if (session === null) return { kind: "redirect", to: accountPath(lang, "sign-in") };
  const { userId } = session;

  if (target.page === "trees") {
    const trees = await deps.family.listTrees(userId);
    const firstId = trees[0]?.tree_id;
    const read =
      firstId === undefined ? null : await deps.family.getTree({ userId, treeId: firstId });
    const firstTree = read !== null && read.kind === "OK" ? read.tree : null;
    return {
      kind: "view",
      data: {
        kind: "trees",
        lang,
        status: statusOf(lang, "trees", query),
        trees,
        firstTree,
        question: firstTree === null ? null : nextQuestion(firstTree),
      },
    };
  }

  if (target.page === "consent") {
    const treeId = first(query, "tree");
    if (!isId(treeId)) return { kind: "redirect", to: treePath(lang, { page: "trees" }) };
    const read = await deps.family.getTree({ userId, treeId });
    if (read.kind !== "OK")
      return { kind: "redirect", to: treePath(lang, { page: "trees" }, { status: "not-found" }) };
    const tree = read.tree;
    const personId = first(query, "person");
    const form = await formOf(query, EMPTY_DRAFT, deps);
    if (personId !== null) {
      const person = tree.persons.find((p) => p.id === personId);
      if (person === undefined)
        return { kind: "redirect", to: treePath(lang, { page: "tree", treeId }) };
      return {
        kind: "view",
        data: {
          kind: "consent",
          lang,
          status: statusOf(lang, "consent", query),
          tree,
          form,
          subject: { kind: "update", person },
        },
      };
    }
    const childId = first(query, "child");
    const role = first(query, "role");
    const child = childId === null ? null : (tree.persons.find((p) => p.id === childId) ?? null);
    return {
      kind: "view",
      data: {
        kind: "consent",
        lang,
        status: statusOf(lang, "consent", query),
        tree,
        form,
        subject: { kind: "add", child, role: child !== null && isSlotRole(role) ? role : null },
      },
    };
  }

  const read = await deps.family.getTree({ userId, treeId: target.treeId });
  if (read.kind !== "OK") return { kind: "not-found" };
  const tree = read.tree;

  if (target.page === "tree") {
    const slots = pedigree(tree);
    const personId = first(query, "person");
    return {
      kind: "view",
      data: {
        kind: "tree",
        lang,
        status: statusOf(lang, "tree", query),
        tree,
        slots,
        unplaced: unplaced(tree, slots),
        question: nextQuestion(tree, slots),
        person: personId === null ? null : (tree.persons.find((p) => p.id === personId) ?? null),
      },
    };
  }

  if (target.page === "constellation") {
    const slots = pedigree(tree);
    return {
      kind: "view",
      data: {
        kind: "constellation",
        lang,
        status: null,
        tree,
        slots,
        picked: pickSlot(slots, first(query, "sel")),
        unplacedCount: unplaced(tree, slots).length,
      },
    };
  }

  if (tree.tree.role === "VIEWER") {
    return { kind: "redirect", to: treePath(lang, { page: "tree", treeId: tree.tree.id }) };
  }

  if (target.page === "add") {
    const childId = first(query, "child");
    const role = first(query, "role");
    const child = childId === null ? null : (tree.persons.find((p) => p.id === childId) ?? null);
    if (childId !== null && child === null) {
      return { kind: "redirect", to: treePath(lang, { page: "tree", treeId: tree.tree.id }) };
    }
    return {
      kind: "view",
      data: {
        kind: "add",
        lang,
        status: statusOf(lang, "add", query),
        tree,
        child,
        role: child !== null && isSlotRole(role) ? role : null,
        childHas: child === null ? [] : rolesHeld(tree, child.id),
        form: await formOf(query, EMPTY_DRAFT, deps),
      },
    };
  }

  const person = tree.persons.find((p) => p.id === target.personId);
  if (person === undefined) return { kind: "not-found" };
  return {
    kind: "view",
    data: {
      kind: "person",
      lang,
      status: statusOf(lang, "person", query),
      tree,
      person,
      parents: parentsOf(tree, person.id),
      others: tree.persons.filter((p) => p.id !== person.id),
      form: await formOf(query, draftOf(person), deps),
    },
  };
}
