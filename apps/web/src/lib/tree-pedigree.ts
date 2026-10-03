import type { TreePersonRead, TreeRead } from "@name-atlas/family";
import type { SlotRole } from "./tree-paths.js";

/**
 * What the pedigree page and the dashboard derive from the contract's `tree`
 * object (TASK-076; ADR-0029 §2.5.16: no view is stored). Pure.
 *
 * The slots are numbered as an Ahnentafel: the root is 1, a person's father is
 * twice their number, the mother one more. A slot is a person, an empty place
 * the reader may fill (a link to "add this parent"), or a hidden one: the
 * parentage names a person the caller may not see (a member without
 * `sees_living`), so the place is neither empty nor theirs to fill. Beyond an
 * empty or hidden slot nothing is drawn, because there is nobody to be the
 * child of it.
 *
 * `PARENT`, the role for a parent whose role is not known, fills whichever of
 * the two places is still free, father first; it is a place in the drawing,
 * not a statement about the person.
 */

export const GENERATIONS = 4;

export interface Slot {
  /** The Ahnentafel number. */
  readonly n: number;
  /** 0 for the root. */
  readonly generation: number;
  /** Null for the root. */
  readonly role: SlotRole | null;
  /** The person this slot is a parent of; null for the root. */
  readonly childId: string | null;
  readonly person: TreePersonRead | null;
  /** The parentage names someone the caller may not see. */
  readonly hidden: boolean;
}

export type Question =
  | { readonly kind: "start" }
  | {
      readonly kind: "ask";
      readonly childId: string;
      readonly child: TreePersonRead;
      readonly role: SlotRole;
    }
  | { readonly kind: "complete" };

export function pedigree(tree: TreeRead, generations = GENERATIONS): readonly Slot[] {
  const persons = new Map(tree.persons.map((p) => [p.id, p]));
  const byChild = new Map<string, TreeRead["parentage"][number][]>();
  for (const row of tree.parentage) {
    const list = byChild.get(row.child_id) ?? [];
    list.push(row);
    byChild.set(row.child_id, list);
  }
  const rootId = tree.tree.root_person_id;
  const root = rootId === null ? undefined : persons.get(rootId);
  if (root === undefined) return [];

  const slots = new Map<number, Slot>();
  slots.set(1, { n: 1, generation: 0, role: null, childId: null, person: root, hidden: false });
  const last = 2 ** (generations - 1) - 1;
  for (let n = 1; n <= last; n += 1) {
    const slot = slots.get(n);
    if (slot === undefined || slot.person === null) continue;
    const rows = byChild.get(slot.person.id) ?? [];
    const father = rows.find((r) => r.role === "FATHER");
    const mother = rows.find((r) => r.role === "MOTHER");
    const unknown = rows.filter((r) => r.role === "PARENT");
    const fatherRow = father ?? (unknown.length > 0 ? unknown[0] : undefined);
    const motherRow = mother ?? (fatherRow === father ? unknown[0] : unknown[1]);
    const generation = slot.generation + 1;
    const make = (role: SlotRole, row: TreeRead["parentage"][number] | undefined): Slot => {
      const person = row === undefined ? null : (persons.get(row.parent_id) ?? null);
      return {
        n: role === "FATHER" ? 2 * n : 2 * n + 1,
        generation,
        role,
        childId: slot.person?.id ?? null,
        person,
        hidden: row !== undefined && person === null,
      };
    };
    slots.set(2 * n, make("FATHER", fatherRow));
    slots.set(2 * n + 1, make("MOTHER", motherRow));
  }
  return [...slots.values()].sort((a, b) => a.n - b.n);
}

/** The dashboard's one question: the first empty slot, breadth-first from the root (ADR-0029 §2.5.16). */
export function nextQuestion(tree: TreeRead, slots: readonly Slot[] = pedigree(tree)): Question {
  if (slots.length === 0) return { kind: "start" };
  const persons = new Map(tree.persons.map((p) => [p.id, p]));
  for (const slot of slots) {
    if (slot.person !== null || slot.hidden || slot.childId === null || slot.role === null)
      continue;
    const child = persons.get(slot.childId);
    if (child === undefined) continue;
    return { kind: "ask", childId: slot.childId, child, role: slot.role };
  }
  return { kind: "complete" };
}

/** The people the pedigree does not reach from the root, so that nobody is out of sight. */
export function unplaced(tree: TreeRead, slots: readonly Slot[]): readonly TreePersonRead[] {
  const placed = new Set(slots.flatMap((s) => (s.person === null ? [] : [s.person.id])));
  return tree.persons.filter((p) => !placed.has(p.id));
}

/** A person's parents as the tree states them, with the ones the caller may not see counted. */
export function parentsOf(
  tree: TreeRead,
  personId: string,
): {
  readonly known: readonly {
    person: TreePersonRead;
    role: TreeRead["parentage"][number]["role"];
  }[];
  readonly hidden: number;
} {
  const persons = new Map(tree.persons.map((p) => [p.id, p]));
  const known: { person: TreePersonRead; role: TreeRead["parentage"][number]["role"] }[] = [];
  let hidden = 0;
  for (const row of tree.parentage) {
    if (row.child_id !== personId) continue;
    const person = persons.get(row.parent_id);
    if (person === undefined) hidden += 1;
    else known.push({ person, role: row.role });
  }
  return { known, hidden };
}

export function fullName(person: Pick<TreePersonRead, "given_names" | "surname">): string {
  return `${person.given_names} ${person.surname}`;
}
