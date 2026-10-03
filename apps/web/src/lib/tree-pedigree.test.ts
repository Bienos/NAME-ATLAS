import { describe, expect, it } from "vitest";
import { fullName, nextQuestion, parentsOf, pedigree, unplaced } from "./tree-pedigree.js";
import { ID, PEOPLE, tree, treeForMember } from "./tree-fixture.js";

describe("the pedigree from the contract object (TASK-073, AC-3, AC-5)", () => {
  it("numbers the slots as an Ahnentafel from the root, four generations, and leaves empty places empty", () => {
    const slots = pedigree(tree());
    const byN = new Map(slots.map((s) => [s.n, s]));
    expect(byN.get(1)?.person?.id).toBe(ID.marta);
    expect(byN.get(2)?.person?.id).toBe(ID.andrzej);
    expect(byN.get(3)?.person?.id).toBe(ID.ewa);
    expect(byN.get(4)?.person?.id).toBe(ID.jozef);
    expect(byN.get(5)?.person?.id).toBe(ID.halina);
    // A PARENT-role parent takes the father's place when it is free.
    expect(byN.get(6)?.person?.id).toBe(ID.stanislaw);
    expect(byN.get(7)).toMatchObject({
      person: null,
      hidden: false,
      childId: ID.ewa,
      role: "MOTHER",
    });
    expect(byN.get(10)?.person?.id).toBe(ID.antoni);
    expect(byN.get(11)).toMatchObject({ person: null, childId: ID.halina, role: "MOTHER" });
    // Beyond an empty slot nothing is drawn; the fourth generation is the last.
    expect(byN.has(14)).toBe(false);
    expect(byN.has(15)).toBe(false);
    expect(byN.has(16)).toBe(false);
    expect(Math.max(...slots.map((s) => s.generation))).toBe(3);
    expect(slots.map((s) => s.n)).toEqual([...slots.map((s) => s.n)].sort((a, b) => a - b));
  });

  it("is empty without a root, and a hidden parent is neither empty nor a person", () => {
    expect(pedigree(tree({ tree: { ...tree().tree, root_person_id: null } }))).toEqual([]);
    const withHidden = tree({
      parentage: [
        ...tree().parentage,
        { child_id: ID.jozef, parent_id: ID.hidden, role: "MOTHER" },
      ],
    });
    const slot = pedigree(withHidden).find((s) => s.n === 9);
    expect(slot).toMatchObject({ person: null, hidden: true });
  });

  it("asks the first empty slot breadth-first from the root", () => {
    expect(nextQuestion(tree())).toEqual({
      kind: "ask",
      childId: ID.ewa,
      child: PEOPLE.ewa,
      role: "MOTHER",
    });
    expect(nextQuestion(tree({ tree: { ...tree().tree, root_person_id: null } }))).toEqual({
      kind: "start",
    });
    const complete = tree({
      persons: [PEOPLE.marta, PEOPLE.andrzej, PEOPLE.ewa],
      parentage: tree().parentage.slice(0, 2),
    });
    // Two generations full, the third empty: the question is the father of the father.
    expect(nextQuestion(complete)).toMatchObject({
      kind: "ask",
      childId: ID.andrzej,
      role: "FATHER",
    });
  });

  it("says when four generations are full", () => {
    const full = tree();
    const extra = Array.from({ length: 8 }, (_, i) => ({
      ...PEOPLE.antoni,
      id: `0199a1b2-0000-7000-8000-0000000000${(10 + i).toString(16).padStart(2, "0")}`,
    }));
    const parentage = [
      ...full.parentage.filter((r) => r.child_id !== ID.halina),
      { child_id: ID.ewa, parent_id: extra[0]!.id, role: "MOTHER" as const },
      { child_id: ID.jozef, parent_id: extra[1]!.id, role: "FATHER" as const },
      { child_id: ID.jozef, parent_id: extra[2]!.id, role: "MOTHER" as const },
      { child_id: ID.halina, parent_id: extra[3]!.id, role: "FATHER" as const },
      { child_id: ID.halina, parent_id: extra[4]!.id, role: "MOTHER" as const },
      { child_id: ID.stanislaw, parent_id: extra[5]!.id, role: "FATHER" as const },
      { child_id: ID.stanislaw, parent_id: extra[6]!.id, role: "MOTHER" as const },
      { child_id: extra[0]!.id, parent_id: extra[7]!.id, role: "FATHER" as const },
      { child_id: extra[0]!.id, parent_id: ID.antoni, role: "MOTHER" as const },
    ];
    const t = tree({ persons: [...full.persons, ...extra], parentage });
    expect(pedigree(t)).toHaveLength(15);
    expect(nextQuestion(t)).toEqual({ kind: "complete" });
  });

  it("lists the people the pedigree does not reach, and a person's parents with the hidden counted", () => {
    const t = tree();
    expect(unplaced(t, pedigree(t)).map((p) => p.id)).toEqual([ID.cousin]);
    expect(parentsOf(t, ID.marta)).toEqual({
      known: [
        { person: PEOPLE.andrzej, role: "FATHER" },
        { person: PEOPLE.ewa, role: "MOTHER" },
      ],
      hidden: 0,
    });
    const member = treeForMember();
    // Józef's parents: none; Halina's father Antoni is deceased and visible.
    expect(parentsOf(member, ID.halina)).toEqual({
      known: [{ person: PEOPLE.antoni, role: "FATHER" }],
      hidden: 0,
    });
    expect(pedigree(member)).toEqual([]);
    expect(nextQuestion(member)).toEqual({ kind: "start" });
    expect(fullName(PEOPLE.marta)).toBe("Marta Zielińska");
  });
});
