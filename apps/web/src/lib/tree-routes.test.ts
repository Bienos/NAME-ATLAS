import { describe, expect, it, vi } from "vitest";
import { handleTreePost, needsLivingConsent } from "./tree-routes.js";
import type { TreeRouteDeps } from "./tree-routes.js";
import { ID, tree, TREE_ID } from "./tree-fixture.js";
import { treeStatusWords } from "./tree-text.js";

const ORIGIN = "https://atlas.test";
const SESSION = "S".repeat(43);
const USER = "0199a1b2-0000-7000-8000-00000000aa11";
const NEW_PERSON = "0199a1b2-0000-7000-8000-00000000bb99";
const CLAUSE = "2026-10-03";

/** Unique, so a leak into a redirect or a log is found by `includes`. */
const GIVEN = "Halinka-secret";
const SURNAME = "Zielonka-secret";

interface Fakes {
  readonly deps: TreeRouteDeps;
  readonly family: { [K in keyof TreeRouteDeps["family"]]: ReturnType<typeof vi.fn> };
  readonly accounts: {
    sessionFromToken: ReturnType<typeof vi.fn>;
    acceptTerms: ReturnType<typeof vi.fn>;
  };
  readonly logged: { event: string; fields: unknown }[];
}

function fakes(termsVersion = CLAUSE): Fakes {
  const family = {
    createTree: vi.fn(() => Promise.resolve({ kind: "CREATED", treeId: TREE_ID })),
    getTree: vi.fn(() => Promise.resolve({ kind: "OK", tree: tree() })),
    deleteTree: vi.fn(() => Promise.resolve({ kind: "OK" })),
    addPerson: vi.fn(() => Promise.resolve({ kind: "OK", personId: NEW_PERSON })),
    updatePerson: vi.fn(() => Promise.resolve({ kind: "OK", personId: ID.ewa })),
    deletePerson: vi.fn(() => Promise.resolve({ kind: "OK" })),
    setParent: vi.fn(() => Promise.resolve({ kind: "OK" })),
    removeParent: vi.fn(() => Promise.resolve({ kind: "OK" })),
    setRoot: vi.fn(() => Promise.resolve({ kind: "OK" })),
  };
  const accounts = {
    sessionFromToken: vi.fn((token: unknown) =>
      Promise.resolve(
        token === SESSION ? { userId: USER, termsVersion, email: "x@example.test" } : null,
      ),
    ),
    acceptTerms: vi.fn(() => Promise.resolve()),
  };
  const logged: { event: string; fields: unknown }[] = [];
  const deps: TreeRouteDeps = {
    family: family as unknown as TreeRouteDeps["family"],
    accounts: accounts as unknown as TreeRouteDeps["accounts"],
    secure: true,
    livingTermsVersion: CLAUSE,
    log: {
      info: (event, fields) => logged.push({ event, fields }),
      warn: (event, fields) => logged.push({ event, fields }),
    },
  };
  return { deps, family, accounts, logged };
}

function post(
  action: string,
  fields: Readonly<Record<string, string>>,
  options: { origin?: string | null; cookie?: string | null; type?: string } = {},
): Request {
  const headers = new Headers({
    "content-type": options.type ?? "application/x-www-form-urlencoded",
  });
  const origin = options.origin === undefined ? ORIGIN : options.origin;
  if (origin !== null) headers.set("origin", origin);
  const cookie = options.cookie === undefined ? `__Host-na_session=${SESSION}` : options.cookie;
  if (cookie !== null) headers.set("cookie", cookie);
  return new Request(`${ORIGIN}/api/tree/${action}`, {
    method: "POST",
    headers,
    body: new URLSearchParams({ lang: "pl", ...fields }).toString(),
  });
}

function location(response: Response): string {
  expect(response.status).toBe(303);
  expect(response.headers.get("cache-control")).toBe("no-store");
  return response.headers.get("location") ?? "";
}

const PERSON_FIELDS = {
  given: GIVEN,
  surname: SURNAME,
  birth: "1937",
  death: "2015",
  living: "DECEASED",
};

describe("the tree's routes refuse what the account's refuse (TASK-076, AC-2)", () => {
  it("answers 404 to an unknown action, 403 off-site, 400 to a body that is not a form", async () => {
    const { deps, family } = fakes();
    expect((await handleTreePost("drop", post("drop", {}), deps)).status).toBe(404);
    expect(
      (
        await handleTreePost(
          "create-tree",
          post("create-tree", { title: "x" }, { origin: "https://evil.test" }),
          deps,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handleTreePost(
          "create-tree",
          post("create-tree", { title: "x" }, { origin: null }),
          deps,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handleTreePost(
          "create-tree",
          post("create-tree", { title: "x" }, { type: "application/json" }),
          deps,
        )
      ).status,
    ).toBe(400);
    expect(family.createTree).not.toHaveBeenCalled();
  });

  it("sends a reader without a session to sign in, and touches the service only with the session's user id", async () => {
    const { deps, family } = fakes();
    expect(
      location(
        await handleTreePost(
          "create-tree",
          post("create-tree", { title: "x" }, { cookie: null }),
          deps,
        ),
      ),
    ).toBe("/pl/konto/zaloguj");
    expect(
      location(
        await handleTreePost(
          "create-tree",
          post("create-tree", { title: "x" }, { cookie: "__Host-na_session=nope" }),
          deps,
        ),
      ),
    ).toBe("/pl/konto/zaloguj");
    expect(family.createTree).not.toHaveBeenCalled();
    location(
      await handleTreePost(
        "create-tree",
        post("create-tree", { title: "Rodzina", lang: "en" }),
        deps,
      ),
    );
    expect(family.createTree).toHaveBeenCalledWith({ userId: USER, title: "Rodzina" });
  });

  it("answers a service failure with a word, and logs the error's name only", async () => {
    const { deps, family, logged } = fakes();
    family.createTree.mockRejectedValueOnce(new RangeError(`boom ${GIVEN}`));
    expect(
      location(await handleTreePost("create-tree", post("create-tree", { title: GIVEN }), deps)),
    ).toBe("/pl/konto/drzewa?status=error");
    expect(logged).toEqual([
      { event: "tree_route_failed", fields: { action: "create-tree", error: "RangeError" } },
    ]);
    expect(JSON.stringify(logged)).not.toContain(GIVEN);
  });
});

describe("the tree's actions (TASK-076)", () => {
  it("create-tree: the first question of the new tree, or the title's problem", async () => {
    const { deps, family } = fakes();
    expect(
      location(
        await handleTreePost(
          "create-tree",
          post("create-tree", { title: "Rodzina", lang: "en" }),
          deps,
        ),
      ),
    ).toBe(`/en/account/trees/${TREE_ID}/add`);
    family.createTree.mockResolvedValueOnce({ kind: "INVALID", problem: "TITLE" });
    expect(
      location(await handleTreePost("create-tree", post("create-tree", { title: "" }), deps)),
    ).toBe("/pl/konto/drzewa?status=title");
  });

  it("add-person: saves, links to the child in the role, and answers the pedigree with the id", async () => {
    const { deps, family } = fakes();
    const to = location(
      await handleTreePost(
        "add-person",
        post("add-person", { tree: TREE_ID, child: ID.ewa, role: "MOTHER", ...PERSON_FIELDS }),
        deps,
      ),
    );
    expect(to).toBe(`/pl/konto/drzewa/${TREE_ID}?status=added&person=${NEW_PERSON}`);
    expect(family.addPerson).toHaveBeenCalledWith({
      userId: USER,
      treeId: TREE_ID,
      person: expect.objectContaining({
        givenNames: GIVEN,
        surname: SURNAME,
        birthYear: 1937,
        deathYear: 2015,
        livingStatus: "DECEASED",
      }),
    });
    expect(family.setParent).toHaveBeenCalledWith({
      userId: USER,
      childId: ID.ewa,
      parentId: NEW_PERSON,
      role: "MOTHER",
    });
    expect(family.setRoot).not.toHaveBeenCalled();
    expect(to).not.toContain(GIVEN);
  });

  it("add-person: the first person of an empty tree becomes its root", async () => {
    const { deps, family } = fakes();
    family.getTree.mockResolvedValueOnce({
      kind: "OK",
      tree: tree({ tree: { ...tree().tree, root_person_id: null }, persons: [], parentage: [] }),
    });
    location(
      await handleTreePost(
        "add-person",
        post("add-person", { tree: TREE_ID, ...PERSON_FIELDS }),
        deps,
      ),
    );
    expect(family.setRoot).toHaveBeenCalledWith({
      userId: USER,
      treeId: TREE_ID,
      personId: NEW_PERSON,
    });
  });

  it("add-person: a person that could not be linked is in the tree and the word says so", async () => {
    const { deps, family } = fakes();
    family.setParent.mockResolvedValueOnce({ kind: "INVALID", problem: "TOO_MANY_PARENTS" });
    expect(
      location(
        await handleTreePost(
          "add-person",
          post("add-person", { tree: TREE_ID, child: ID.ewa, role: "FATHER", ...PERSON_FIELDS }),
          deps,
        ),
      ),
    ).toBe(`/pl/konto/drzewa/${TREE_ID}?status=unlinked&person=${NEW_PERSON}`);
  });

  it("add-person: a problem goes back to the form with the draft kept and nothing saved (AC-6)", async () => {
    const { deps, family } = fakes();
    const to = location(
      await handleTreePost(
        "add-person",
        post("add-person", {
          tree: TREE_ID,
          child: ID.ewa,
          role: "MOTHER",
          given: GIVEN,
          surname: SURNAME,
          birth: "37",
        }),
        deps,
      ),
    );
    const url = new URL(to, ORIGIN);
    expect(url.pathname).toBe(`/pl/konto/drzewa/${TREE_ID}/dodaj`);
    expect(url.searchParams.get("status")).toBe("birth-year");
    expect(url.searchParams.get("given")).toBe(GIVEN);
    expect(url.searchParams.get("birth")).toBe("37");
    expect(url.searchParams.get("child")).toBe(ID.ewa);
    expect(url.searchParams.get("role")).toBe("MOTHER");
    expect(family.addPerson).not.toHaveBeenCalled();
    family.addPerson.mockResolvedValueOnce({ kind: "INVALID", problems: ["DEATH_BEFORE_BIRTH"] });
    expect(
      location(
        await handleTreePost(
          "add-person",
          post("add-person", { tree: TREE_ID, ...PERSON_FIELDS }),
          deps,
        ),
      ),
    ).toContain("status=death-before-birth");
  });

  it("add-person: a bad id, a tree not found, a refused write", async () => {
    const { deps, family } = fakes();
    expect(
      location(
        await handleTreePost(
          "add-person",
          post("add-person", { tree: "x", ...PERSON_FIELDS }),
          deps,
        ),
      ),
    ).toBe("/pl/konto/drzewa?status=not-found");
    expect(
      location(
        await handleTreePost(
          "add-person",
          post("add-person", { tree: TREE_ID, child: ID.ewa, role: "AUNT", ...PERSON_FIELDS }),
          deps,
        ),
      ),
    ).toBe("/pl/konto/drzewa?status=not-found");
    family.addPerson.mockResolvedValueOnce({ kind: "NOT_FOUND" });
    expect(
      location(
        await handleTreePost(
          "add-person",
          post("add-person", { tree: TREE_ID, ...PERSON_FIELDS }),
          deps,
        ),
      ),
    ).toBe("/pl/konto/drzewa?status=not-found");
    family.addPerson.mockResolvedValueOnce({ kind: "FORBIDDEN" });
    expect(
      location(
        await handleTreePost(
          "add-person",
          post("add-person", { tree: TREE_ID, ...PERSON_FIELDS }),
          deps,
        ),
      ),
    ).toBe("/pl/konto/drzewa?status=forbidden");
  });

  it("update-person, delete-person with its confirmation, set-parent, remove-parent, set-root, delete-tree", async () => {
    const { deps, family } = fakes();
    const person = `/pl/konto/drzewa/${TREE_ID}/osoba/${ID.ewa}`;
    expect(
      location(
        await handleTreePost(
          "update-person",
          post("update-person", { tree: TREE_ID, person: ID.ewa, ...PERSON_FIELDS }),
          deps,
        ),
      ),
    ).toBe(`${person}?status=saved`);
    expect(family.updatePerson).toHaveBeenCalledWith({
      userId: USER,
      personId: ID.ewa,
      person: expect.objectContaining({ givenNames: GIVEN }),
    });
    family.updatePerson.mockResolvedValueOnce({ kind: "INVALID", problems: ["SURNAME"] });
    expect(
      location(
        await handleTreePost(
          "update-person",
          post("update-person", { tree: TREE_ID, person: ID.ewa, ...PERSON_FIELDS }),
          deps,
        ),
      ),
    ).toContain(`${person}?`);

    expect(
      location(
        await handleTreePost(
          "delete-person",
          post("delete-person", { tree: TREE_ID, person: ID.ewa }),
          deps,
        ),
      ),
    ).toBe(`${person}?status=confirm`);
    expect(family.deletePerson).not.toHaveBeenCalled();
    expect(
      location(
        await handleTreePost(
          "delete-person",
          post("delete-person", { tree: TREE_ID, person: ID.ewa, confirm: "1" }),
          deps,
        ),
      ),
    ).toBe(`/pl/konto/drzewa/${TREE_ID}?status=person-deleted`);
    expect(family.deletePerson).toHaveBeenCalledWith({ userId: USER, personId: ID.ewa });

    expect(
      location(
        await handleTreePost(
          "set-parent",
          post("set-parent", { tree: TREE_ID, child: ID.ewa, parent: ID.cousin, role: "MOTHER" }),
          deps,
        ),
      ),
    ).toBe(`${person}?status=linked`);
    expect(family.setParent).toHaveBeenCalledWith({
      userId: USER,
      childId: ID.ewa,
      parentId: ID.cousin,
      role: "MOTHER",
    });
    family.setParent.mockResolvedValueOnce({ kind: "INVALID", problem: "WOULD_CYCLE" });
    expect(
      location(
        await handleTreePost(
          "set-parent",
          post("set-parent", { tree: TREE_ID, child: ID.ewa, parent: ID.cousin, role: "other" }),
          deps,
        ),
      ),
    ).toBe(`${person}?status=would-cycle`);
    expect(family.setParent).toHaveBeenLastCalledWith(expect.objectContaining({ role: "PARENT" }));
    // A second mother or father (migration 0030's index) has its own word.
    family.setParent.mockResolvedValueOnce({ kind: "INVALID", problem: "ROLE_TAKEN" });
    expect(
      location(
        await handleTreePost(
          "set-parent",
          post("set-parent", { tree: TREE_ID, child: ID.ewa, parent: ID.cousin, role: "MOTHER" }),
          deps,
        ),
      ),
    ).toBe(`${person}?status=role-taken`);
    expect(treeStatusWords("pl", "person", "role-taken")).not.toBeNull();
    expect(treeStatusWords("en", "person", "role-taken")).not.toBeNull();

    expect(
      location(
        await handleTreePost(
          "remove-parent",
          post("remove-parent", { tree: TREE_ID, child: ID.ewa, parent: ID.stanislaw }),
          deps,
        ),
      ),
    ).toBe(`${person}?status=parent-removed`);
    expect(family.removeParent).toHaveBeenCalledWith({
      userId: USER,
      childId: ID.ewa,
      parentId: ID.stanislaw,
    });

    expect(
      location(
        await handleTreePost("set-root", post("set-root", { tree: TREE_ID, person: ID.ewa }), deps),
      ),
    ).toBe(`/pl/konto/drzewa/${TREE_ID}?status=root`);
    family.setRoot.mockResolvedValueOnce({ kind: "FORBIDDEN" });
    expect(
      location(
        await handleTreePost("set-root", post("set-root", { tree: TREE_ID, person: ID.ewa }), deps),
      ),
    ).toBe(`/pl/konto/drzewa/${TREE_ID}?status=forbidden`);

    expect(
      location(await handleTreePost("delete-tree", post("delete-tree", { tree: TREE_ID }), deps)),
    ).toBe(`/pl/konto/drzewa/${TREE_ID}?status=confirm`);
    expect(family.deleteTree).not.toHaveBeenCalled();
    expect(
      location(
        await handleTreePost(
          "delete-tree",
          post("delete-tree", { tree: TREE_ID, confirm: "1" }),
          deps,
        ),
      ),
    ).toBe("/pl/konto/drzewa?status=tree-deleted");
    expect(family.deleteTree).toHaveBeenCalledWith({ userId: USER, treeId: TREE_ID });
  });
});

describe("the living-people clause (TASK-076, AC-4; ADR-0029 §2.4.12)", () => {
  const LIVING = { given: GIVEN, surname: SURNAME, birth: "1962", living: "LIVING" };
  const NO_DEATH = { given: GIVEN, surname: SURNAME, birth: "1962" };

  it("is needed for a living or unknown person on an older terms version, never for the deceased", () => {
    const living = { givenNames: "A", surname: "B", livingStatus: "LIVING" as const };
    expect(needsLivingConsent(living, "2026-10-01", CLAUSE)).toBe(true);
    expect(needsLivingConsent({ givenNames: "A", surname: "B" }, "2026-10-01", CLAUSE)).toBe(true);
    expect(
      needsLivingConsent({ givenNames: "A", surname: "B", deathYear: 2000 }, "2026-10-01", CLAUSE),
    ).toBe(false);
    expect(needsLivingConsent(living, CLAUSE, CLAUSE)).toBe(false);
    expect(needsLivingConsent(living, "2027-01-01", CLAUSE)).toBe(false);
    expect(needsLivingConsent({ givenNames: "", surname: "B" }, "2026-10-01", CLAUSE)).toBe(false);
  });

  it("sends an account on the older version to the consent step with the draft, saving nothing", async () => {
    const { deps, family } = fakes("2026-10-01");
    for (const fields of [LIVING, NO_DEATH]) {
      const to = location(
        await handleTreePost(
          "add-person",
          post("add-person", { tree: TREE_ID, child: ID.ewa, role: "MOTHER", ...fields }),
          deps,
        ),
      );
      const url = new URL(to, ORIGIN);
      expect(url.pathname).toBe("/pl/konto/drzewa/zgoda");
      expect(url.searchParams.get("tree")).toBe(TREE_ID);
      expect(url.searchParams.get("child")).toBe(ID.ewa);
      expect(url.searchParams.get("role")).toBe("MOTHER");
      expect(url.searchParams.get("given")).toBe(GIVEN);
    }
    expect(family.addPerson).not.toHaveBeenCalled();
    const update = location(
      await handleTreePost(
        "update-person",
        post("update-person", { tree: TREE_ID, person: ID.ewa, ...LIVING }),
        deps,
      ),
    );
    expect(new URL(update, ORIGIN).searchParams.get("person")).toBe(ID.ewa);
    expect(family.updatePerson).not.toHaveBeenCalled();
    // The deceased need no step.
    expect(
      location(
        await handleTreePost(
          "add-person",
          post("add-person", { tree: TREE_ID, ...PERSON_FIELDS }),
          deps,
        ),
      ),
    ).toContain("status=added");
  });

  it("saves the person on the POST that accepts, after recording the version; refuses without the tick", async () => {
    const { deps, family, accounts, logged } = fakes("2026-10-01");
    const refused = location(
      await handleTreePost(
        "accept-living-terms",
        post("accept-living-terms", { tree: TREE_ID, child: ID.ewa, role: "MOTHER", ...LIVING }),
        deps,
      ),
    );
    expect(new URL(refused, ORIGIN).pathname).toBe("/pl/konto/drzewa/zgoda");
    expect(new URL(refused, ORIGIN).searchParams.get("status")).toBe("terms");
    expect(accounts.acceptTerms).not.toHaveBeenCalled();

    const to = location(
      await handleTreePost(
        "accept-living-terms",
        post("accept-living-terms", {
          tree: TREE_ID,
          child: ID.ewa,
          role: "MOTHER",
          terms: "on",
          ...LIVING,
        }),
        deps,
      ),
    );
    expect(accounts.acceptTerms).toHaveBeenCalledWith({ userId: USER, termsVersion: CLAUSE });
    expect(family.addPerson).toHaveBeenCalledWith(
      expect.objectContaining({ person: expect.objectContaining({ livingStatus: "LIVING" }) }),
    );
    expect(to).toBe(`/pl/konto/drzewa/${TREE_ID}?status=added&person=${NEW_PERSON}`);
    expect(logged.map((l) => l.event)).toContain("tree_living_terms_accepted");

    location(
      await handleTreePost(
        "accept-living-terms",
        post("accept-living-terms", { tree: TREE_ID, person: ID.ewa, terms: "on", ...LIVING }),
        deps,
      ),
    );
    expect(family.updatePerson).toHaveBeenCalledWith(expect.objectContaining({ personId: ID.ewa }));
  });

  it("never carries a name into a log line (AC-7)", async () => {
    const { deps, logged } = fakes("2026-10-01");
    await handleTreePost(
      "accept-living-terms",
      post("accept-living-terms", { tree: TREE_ID, terms: "on", ...LIVING }),
      deps,
    );
    await handleTreePost(
      "add-person",
      post("add-person", { tree: TREE_ID, ...PERSON_FIELDS }),
      deps,
    );
    expect(JSON.stringify(logged)).not.toContain(GIVEN);
    expect(JSON.stringify(logged)).not.toContain(SURNAME);
  });
});
