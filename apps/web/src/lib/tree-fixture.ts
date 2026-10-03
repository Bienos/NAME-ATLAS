import type { TreePersonRead, TreeRead } from "@name-atlas/family";

/**
 * A tree for the tests, built by hand: every name and date is invented. Three
 * generations placed, one person outside the pedigree, and one parent the
 * caller may not see (a `parentage` row to an id that is not in `persons`).
 */

export const TREE_ID = "0199a1b2-0000-7000-8000-00000000aa01";

export function person(
  id: string,
  given: string,
  surname: string,
  birth: number | null,
  death: number | null,
  status: TreePersonRead["living_status"] = death === null ? "UNKNOWN" : "DECEASED",
): TreePersonRead {
  return {
    id,
    given_names: given,
    surname,
    birth_surname: null,
    birth: { year: birth, approx: false, place_code: null, place_text: null },
    death: { year: death, approx: false, place_code: null, place_text: null },
    living_status: status,
    treated_as_living: status !== "DECEASED",
    provenance: "ENTERED",
    source_note: null,
    notes: null,
    updated_at: "2026-10-03T10:00:00.000Z",
  };
}

export const ID = {
  marta: "0199a1b2-0000-7000-8000-00000000bb01",
  andrzej: "0199a1b2-0000-7000-8000-00000000bb02",
  ewa: "0199a1b2-0000-7000-8000-00000000bb03",
  jozef: "0199a1b2-0000-7000-8000-00000000bb04",
  halina: "0199a1b2-0000-7000-8000-00000000bb05",
  stanislaw: "0199a1b2-0000-7000-8000-00000000bb06",
  antoni: "0199a1b2-0000-7000-8000-00000000bb07",
  cousin: "0199a1b2-0000-7000-8000-00000000bb08",
  hidden: "0199a1b2-0000-7000-8000-00000000bb09",
} as const;

export const PEOPLE = {
  marta: person(ID.marta, "Marta", "Zielińska", 1991, null, "LIVING"),
  andrzej: person(ID.andrzej, "Andrzej", "Zieliński", 1962, null, "LIVING"),
  ewa: person(ID.ewa, "Ewa", "Zielińska", 1964, null),
  jozef: person(ID.jozef, "Józef", "Zieliński", 1934, 2009),
  halina: person(ID.halina, "Halina", "Zielińska", 1937, 2015),
  stanislaw: person(ID.stanislaw, "Stanisław", "Wróbel", 1929, 1998),
  antoni: person(ID.antoni, "Antoni", "Kaczmarek", 1899, 1968),
  cousin: person(ID.cousin, "Piotr", "Wróbel", 1990, null, "LIVING"),
};

export function tree(overrides: Partial<TreeRead> = {}): TreeRead {
  return {
    tree: {
      id: TREE_ID,
      title: "Rodzina Zielińskich",
      root_person_id: ID.marta,
      role: "OWNER",
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-03T10:00:00.000Z",
    },
    persons: Object.values(PEOPLE),
    parentage: [
      { child_id: ID.marta, parent_id: ID.andrzej, role: "FATHER" },
      { child_id: ID.marta, parent_id: ID.ewa, role: "MOTHER" },
      { child_id: ID.andrzej, parent_id: ID.jozef, role: "FATHER" },
      { child_id: ID.andrzej, parent_id: ID.halina, role: "MOTHER" },
      { child_id: ID.ewa, parent_id: ID.stanislaw, role: "PARENT" },
      { child_id: ID.halina, parent_id: ID.antoni, role: "FATHER" },
    ],
    members: [],
    hidden_living_count: 0,
    place_codes: [],
    ...overrides,
  };
}

/** The same tree as a member who may not see the living: the living rows and their links are gone. */
export function treeForMember(): TreeRead {
  const t = tree();
  const visible = new Set(t.persons.filter((p) => p.living_status === "DECEASED").map((p) => p.id));
  return {
    ...t,
    tree: { ...t.tree, role: "VIEWER" },
    persons: t.persons.filter((p) => visible.has(p.id)),
    parentage: t.parentage.filter((r) => visible.has(r.child_id) && visible.has(r.parent_id)),
    members: null,
    hidden_living_count: t.persons.length - visible.size,
  };
}
