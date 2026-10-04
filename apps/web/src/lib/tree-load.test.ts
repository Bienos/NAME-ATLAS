import { describe, expect, it, vi } from "vitest";
import { loadTreePage } from "./tree-load.js";
import type { TreeLoadDeps } from "./tree-load.js";
import type { CardRead } from "@name-atlas/family";
import { hashToken } from "@name-atlas/accounts";
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
  family: {
    listTrees: ReturnType<typeof vi.fn>;
    getTree: ReturnType<typeof vi.fn>;
    invitationOf: ReturnType<typeof vi.fn>;
    openInvitation: ReturnType<typeof vi.fn>;
    listCards: ReturnType<typeof vi.fn>;
    getCard: ReturnType<typeof vi.fn>;
  };
};

const CARD: CardRead = {
  person: {
    id: ID.marta,
    given_names: "Marta",
    surname: "Zielińska",
    birth_surname: null,
    birth: { year: 1991, approx: false, place_code: null, place_text: "Szczebrzeszyn" },
    hidden_fields: [],
    claimed_at: null,
  },
  parents: [{ given_names: "Ewa", surname: "Zielińska", role: "MOTHER" }],
};
const TOKEN = "T".repeat(43);

function deps(read = tree(), places: TreeLoadDeps["places"] = null): Mocked {
  const family = {
    listTrees: vi.fn(() => Promise.resolve([SUMMARY])),
    getTree: vi.fn(() => Promise.resolve({ kind: "OK", tree: read })),
    invitationOf: vi.fn(() => Promise.resolve(null)),
    openInvitation: vi.fn(() => Promise.resolve({ kind: "OK", card: CARD })),
    listCards: vi.fn(() => Promise.resolve([])),
    getCard: vi.fn(() => Promise.resolve({ kind: "OK", card: CARD })),
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

describe("the tree pages' decisions (TASK-076)", () => {
  it("are not found when off or at an address that is not a page, and sign-in without a session (AC-1, AC-2)", async () => {
    expect(await load(undefined, {}, deps(), SESSION, false)).toEqual({ kind: "not-found" });
    expect(await load(["nope"])).toEqual({ kind: "not-found" });
    expect(await load(undefined, {}, deps(), null)).toEqual({
      kind: "redirect",
      to: "/pl/konto/zaloguj?next=%2Fpl%2Fkonto%2Fdrzewa",
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

describe("the Konstelacja's decision (TASK-091)", () => {
  it("draws the same slots as the pedigree, picks the slot the address names or the root, and counts the unplaced", async () => {
    const root = await load([TREE_ID, "konstelacja"]);
    if (root.kind !== "view" || root.data.kind !== "constellation")
      throw new Error("expected the constellation");
    expect(root.data.slots.map((slot) => slot.n)).toEqual(
      (await load([TREE_ID])).kind === "view" ? root.data.slots.map((slot) => slot.n) : [],
    );
    expect(root.data.picked).toBe(1);
    expect(root.data.unplacedCount).toBe(1);
    expect(root.data.status).toBeNull();

    const picked = await load([TREE_ID, "konstelacja"], { sel: "10" });
    if (picked.kind !== "view" || picked.data.kind !== "constellation")
      throw new Error("expected the constellation");
    expect(picked.data.picked).toBe(10);
    const stray = await load([TREE_ID, "konstelacja"], { sel: "77" });
    if (stray.kind !== "view" || stray.data.kind !== "constellation")
      throw new Error("expected the constellation");
    expect(stray.data.picked).toBe(1);
  });

  it("is a view for a member too, with the hidden count the tree carries", async () => {
    const member = await load([TREE_ID, "konstelacja"], {}, deps(treeForMember()));
    if (member.kind !== "view" || member.data.kind !== "constellation")
      throw new Error("expected the constellation");
    expect(member.data.tree.hidden_living_count).toBeGreaterThan(0);
    expect(member.data.tree.tree.role).toBe("VIEWER");
    expect(await load([TREE_ID, "nope"])).toEqual({ kind: "not-found" });
  });
});

describe("the Mapa's decision (TASK-092)", () => {
  it("reads the register's localities behind the tree's place codes, or none without the register", async () => {
    const regions = vi.fn(() =>
      Promise.resolve([
        {
          code: "0960432",
          name: "Szczebrzeszyn",
          district: "zamojski",
          region: { code: "06", name: "LUBELSKIE" },
        },
      ]),
    );
    const d = { ...deps(tree({ place_codes: ["0960432"] })), regions } as unknown as Mocked;
    const view = await load([TREE_ID, "mapa"], { sel: "2" }, d);
    if (view.kind !== "view" || view.data.kind !== "map") throw new Error("expected the map");
    expect(regions).toHaveBeenCalledWith(["0960432"]);
    expect(view.data.places.map((p) => p.region?.code)).toEqual(["06"]);
    expect(view.data.picked).toBe(2);
    expect(view.data.slots.length).toBeGreaterThan(0);

    const none = await load([TREE_ID, "mapa"], {}, deps(tree({ place_codes: ["0960432"] })));
    if (none.kind !== "view" || none.data.kind !== "map") throw new Error("expected the map");
    expect(none.data.places).toEqual([]);
    const failing = {
      ...deps(tree({ place_codes: ["0960432"] })),
      regions: vi.fn(() => Promise.reject(new Error("down"))),
    } as unknown as Mocked;
    const fell = await load([TREE_ID, "mapa"], {}, failing);
    if (fell.kind !== "view" || fell.data.kind !== "map") throw new Error("expected the map");
    expect(fell.data.places).toEqual([]);
    expect(regions).toHaveBeenCalledTimes(1);
  });
});

describe("invitations and cards (TASK-094, AC-6)", () => {
  it("sends a signed-out reader to sign in and back to the invitation with its token", async () => {
    expect(await load(["zaproszenie"], { t: TOKEN }, deps(), null)).toEqual({
      kind: "redirect",
      to: `/pl/konto/zaloguj?next=${encodeURIComponent(`/pl/konto/drzewa/zaproszenie?t=${TOKEN}`)}`,
    });
    expect(await load(["zaproszenie"], { t: "short" }, deps(), null)).toEqual({
      kind: "redirect",
      to: "/pl/konto/zaloguj?next=%2Fpl%2Fkonto%2Fdrzewa",
    });
  });

  it("opens the invitation by the token's hash, and names why not otherwise, without a tree read", async () => {
    const d = deps();
    const open = await load(["zaproszenie"], { t: TOKEN }, d);
    expect(open).toMatchObject({
      kind: "view",
      data: { kind: "invitation", token: TOKEN, state: { kind: "open", card: CARD } },
    });
    expect(d.family.openInvitation).toHaveBeenCalledWith({
      userId: SESSION.userId,
      tokenHash: hashToken(TOKEN).toString("hex"),
    });
    expect(d.family.getTree).not.toHaveBeenCalled();
    for (const [kind, state] of [
      ["EXPIRED", "expired"],
      ["ANSWERED", "answered"],
      ["NOT_FOUND", "missing"],
    ] as const) {
      d.family.openInvitation.mockResolvedValueOnce({ kind });
      expect(await load(["zaproszenie"], { t: TOKEN, status: "answer" }, d)).toMatchObject({
        data: { kind: "invitation", status: "answer", state: { kind: state } },
      });
    }
    expect(await load(["zaproszenie"], {}, d)).toMatchObject({
      data: { kind: "invitation", token: null, state: { kind: "missing" } },
    });
  });

  it("lists the cards, on their page and on the dashboard, and shows one as its form", async () => {
    const d = deps();
    const summary = {
      person_id: ID.marta,
      given_names: "Marta",
      surname: "Zielińska",
      claimed_at: "2026-10-04T10:00:00.000Z",
    };
    d.family.listCards.mockResolvedValue([summary]);
    expect(await load(["karty"], { status: "left" }, d)).toMatchObject({
      data: { kind: "cards", status: "left", cards: [summary] },
    });
    expect(await load(undefined, {}, d)).toMatchObject({
      data: { kind: "trees", cards: [summary] },
    });
    const card = await load(["karta", ID.marta], { status: "claimed" }, d);
    expect(card).toMatchObject({
      data: {
        kind: "card",
        status: "claimed",
        card: CARD,
        form: { draft: { given: "Marta", placeText: "Szczebrzeszyn", living: "LIVING" } },
      },
    });
    expect(d.family.getCard).toHaveBeenCalledWith({ userId: SESSION.userId, personId: ID.marta });
    d.family.getCard.mockResolvedValueOnce({ kind: "NOT_FOUND" });
    expect(await load(["karta", ID.marta], {}, d)).toEqual({
      kind: "redirect",
      to: "/pl/konto/drzewa/karty?status=not-found",
    });
  });

  it("reads the person's latest invitation for the owner and not for a member", async () => {
    const d = deps();
    const invitation = {
      invitation_id: "0199a1b2-0000-7000-8000-00000000cc01",
      sent_at: "2026-10-04T10:00:00.000Z",
      expires_at: "2026-10-18T10:00:00.000Z",
      answered_at: null,
      answer: null,
    };
    d.family.invitationOf.mockResolvedValue(invitation);
    expect(await load([TREE_ID, "osoba", ID.marta], {}, d)).toMatchObject({
      data: { kind: "person", invitation },
    });
    const member = deps({ ...tree(), tree: { ...tree().tree, role: "EDITOR" } });
    expect(await load([TREE_ID, "osoba", ID.marta], {}, member)).toMatchObject({
      data: { kind: "person", invitation: null },
    });
    expect(member.family.invitationOf).not.toHaveBeenCalled();
  });
});
