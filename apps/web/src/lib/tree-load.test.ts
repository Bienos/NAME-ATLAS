import { describe, expect, it, vi } from "vitest";
import { loadTreePage } from "./tree-load.js";
import type { TreeLoadDeps } from "./tree-load.js";
import { ID, PEOPLE, tree, treeForMember, TREE_ID } from "./tree-fixture.js";

const SESSION = { userId: "0199a1b2-0000-7000-8000-00000000aa11", termsVersion: "2026-10-03" };
const SUMMARY = {
  tree_id: TREE_ID,
  title: "Rodzina Zielińskich",
  role: "OWNER" as const,
  person_count: 8,
  updated_at: "2026-10-03T10:00:00.000Z",
};

type Mocked = TreeLoadDeps & {
  family: { listTrees: ReturnType<typeof vi.fn>; getTree: ReturnType<typeof vi.fn> };
};

function deps(read = tree(), places: TreeLoadDeps["places"] = null): Mocked {
  const family = {
    listTrees: vi.fn(() => Promise.resolve([SUMMARY])),
    getTree: vi.fn(() => Promise.resolve({ kind: "OK", tree: read })),
  };
  return { family, places } as unknown as Mocked;
}

const load = (
  segments: string[] | undefined,
  query: Record<string, string> = {},
  d = deps(),
  session: typeof SESSION | null = SESSION,
  enabled = true,
) => loadTreePage({ enabled, lang: "pl", segments, query, session, deps: d });

describe("the tree pages' decisions (TASK-073)", () => {
  it("are not found when off or at an address that is not a page, and sign-in without a session (AC-1, AC-2)", async () => {
    expect(await load(undefined, {}, deps(), SESSION, false)).toEqual({ kind: "not-found" });
    expect(await load(["nope"])).toEqual({ kind: "not-found" });
    expect(await load(undefined, {}, deps(), null)).toEqual({
      kind: "redirect",
      to: "/pl/konto/zaloguj",
    });
    const d = deps();
    d.family.getTree.mockResolvedValueOnce({ kind: "NOT_FOUND" });
    expect(await load([TREE_ID], {}, d)).toEqual({ kind: "not-found" });
    expect(d.family.getTree).toHaveBeenCalledWith({ userId: SESSION.userId, treeId: TREE_ID });
  });

  it("lists the trees and asks the first tree's first empty slot (AC-3)", async () => {
    const d = deps();
    const decision = await load(undefined, { status: "tree-deleted" }, d);
    expect(decision.kind).toBe("view");
    if (decision.kind !== "view" || decision.data.kind !== "trees")
      throw new Error("expected the trees page");
    expect(decision.data.trees).toEqual([SUMMARY]);
    expect(decision.data.status).toBe("tree-deleted");
    expect(decision.data.question).toMatchObject({ kind: "ask", childId: ID.ewa, role: "MOTHER" });
    expect(d.family.listTrees).toHaveBeenCalledWith(SESSION.userId);
    d.family.listTrees.mockResolvedValueOnce([]);
    const empty = await load(undefined, { status: "made-up" }, d);
    if (empty.kind !== "view" || empty.data.kind !== "trees")
      throw new Error("expected the trees page");
    expect(empty.data).toMatchObject({ trees: [], firstTree: null, question: null, status: null });
  });

  it("draws the pedigree with the person a word is about, and the hidden count for a member (AC-5)", async () => {
    const owner = await load([TREE_ID], { status: "added", person: ID.antoni });
    if (owner.kind !== "view" || owner.data.kind !== "tree")
      throw new Error("expected the pedigree");
    expect(owner.data.slots.length).toBeGreaterThan(0);
    expect(owner.data.person).toEqual(PEOPLE.antoni);
    expect(owner.data.unplaced.map((p) => p.id)).toEqual([ID.cousin]);
    const member = await load([TREE_ID], {}, deps(treeForMember()));
    if (member.kind !== "view" || member.data.kind !== "tree")
      throw new Error("expected the pedigree");
    expect(member.data.tree.hidden_living_count).toBe(4);
    expect(member.data.slots).toEqual([]);
    expect(member.data.tree.persons.every((p) => p.living_status === "DECEASED")).toBe(true);
  });

  it("keeps the draft of an intermediate page in its own query and looks a place up only when asked (AC-6)", async () => {
    const places = vi.fn(() =>
      Promise.resolve([
        { code: "0920077", name: "Szczebrzeszyn", district: "zamojski", region: "lubelskie" },
      ]),
    );
    const d = deps(tree(), places);
    const fresh = await load([TREE_ID, "dodaj"], { child: ID.ewa, role: "MOTHER" }, d);
    if (fresh.kind !== "view" || fresh.data.kind !== "add") throw new Error("expected the form");
    expect(fresh.data).toMatchObject({ child: PEOPLE.ewa, role: "MOTHER", childHas: ["FATHER"] });
    expect(fresh.data.form.draft.given).toBe("");
    expect(fresh.data.form.search).toEqual({ kind: "none" });
    expect(places).not.toHaveBeenCalled();

    const kept = await load(
      [TREE_ID, "dodaj"],
      { child: ID.ewa, role: "MOTHER", given: "Halina", place: "Szcze", search: "1" },
      d,
    );
    if (kept.kind !== "view" || kept.data.kind !== "add") throw new Error("expected the form");
    expect(kept.data.form.draft.given).toBe("Halina");
    expect(kept.data.form.search).toMatchObject({ kind: "found" });
    expect(places).toHaveBeenCalledWith("Szcze");

    places.mockRejectedValueOnce(new Error("down"));
    const down = await load([TREE_ID, "dodaj"], { place: "Szcze", search: "1" }, d);
    if (down.kind !== "view" || down.data.kind !== "add") throw new Error("expected the form");
    expect(down.data.form.search).toEqual({ kind: "unavailable" });
    const noRegister = await load([TREE_ID, "dodaj"], { place: "Szcze", search: "1" }, deps());
    if (noRegister.kind !== "view" || noRegister.data.kind !== "add")
      throw new Error("expected the form");
    expect(noRegister.data.form.search).toEqual({ kind: "unavailable" });

    // A child the tree does not have is not a form; a role alone is the parents question.
    expect(await load([TREE_ID, "dodaj"], { child: ID.hidden, role: "MOTHER" }, d)).toEqual({
      kind: "redirect",
      to: `/pl/konto/drzewa/${TREE_ID}`,
    });
    const ask = await load([TREE_ID, "dodaj"], { child: ID.ewa }, d);
    if (ask.kind !== "view" || ask.data.kind !== "add") throw new Error("expected the form");
    expect(ask.data.role).toBeNull();
  });

  it("shows a person as they are, or as the kept draft, with their parents and the others to link", async () => {
    const asIs = await load([TREE_ID, "osoba", ID.halina]);
    if (asIs.kind !== "view" || asIs.data.kind !== "person") throw new Error("expected the person");
    expect(asIs.data.form.draft).toMatchObject({
      given: "Halina",
      deathYear: "2015",
      living: "DECEASED",
    });
    expect(asIs.data.parents).toEqual({
      known: [{ person: PEOPLE.antoni, role: "FATHER" }],
      hidden: 0,
    });
    expect(asIs.data.others.map((p) => p.id)).not.toContain(ID.halina);
    const kept = await load([TREE_ID, "osoba", ID.halina], { given: "Halinka", status: "saved" });
    if (kept.kind !== "view" || kept.data.kind !== "person") throw new Error("expected the person");
    expect(kept.data.form.draft.given).toBe("Halinka");
    expect(kept.data.form.draft.surname).toBe("");
    expect(kept.data.status).toBe("saved");
    expect(await load([TREE_ID, "osoba", ID.hidden])).toEqual({ kind: "not-found" });
  });

  it("sends a viewer from the forms to the pedigree", async () => {
    const d = deps(treeForMember());
    expect(await load([TREE_ID, "dodaj"], {}, d)).toEqual({
      kind: "redirect",
      to: `/pl/konto/drzewa/${TREE_ID}`,
    });
    expect(await load([TREE_ID, "osoba", ID.antoni], {}, d)).toEqual({
      kind: "redirect",
      to: `/pl/konto/drzewa/${TREE_ID}`,
    });
  });

  it("the consent step names its subject from the query, and goes back without one", async () => {
    expect(await load(["zgoda"])).toEqual({ kind: "redirect", to: "/pl/konto/drzewa" });
    const add = await load(["zgoda"], {
      tree: TREE_ID,
      child: ID.ewa,
      role: "MOTHER",
      given: "Halina",
    });
    if (add.kind !== "view" || add.data.kind !== "consent")
      throw new Error("expected the consent step");
    expect(add.data.subject).toEqual({ kind: "add", child: PEOPLE.ewa, role: "MOTHER" });
    expect(add.data.form.draft.given).toBe("Halina");
    const update = await load(["zgoda"], {
      tree: TREE_ID,
      person: ID.ewa,
      given: "Ewa",
      living: "LIVING",
    });
    if (update.kind !== "view" || update.data.kind !== "consent")
      throw new Error("expected the consent step");
    expect(update.data.subject).toEqual({ kind: "update", person: PEOPLE.ewa });
    expect(await load(["zgoda"], { tree: TREE_ID, person: ID.hidden })).toEqual({
      kind: "redirect",
      to: `/pl/konto/drzewa/${TREE_ID}`,
    });
  });
});
