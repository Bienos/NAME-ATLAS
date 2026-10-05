import { describe, expect, it, vi } from "vitest";
import type { OutgoingMail } from "@name-atlas/accounts";
import { hashToken } from "@name-atlas/accounts";
import { handleTreePost, needsLivingConsent } from "./tree-routes.js";
import type { TreeRouteDeps } from "./tree-routes.js";
import { ID, tree, TREE_ID } from "./tree-fixture.js";
import { treeStatusWords } from "./tree-text.js";

const ORIGIN = "https://atlas.test";
const SESSION = "S".repeat(43);
const USER = "0199a1b2-0000-7000-8000-00000000aa11";
const NEW_PERSON = "0199a1b2-0000-7000-8000-00000000bb99";
const CLAUSE = "2026-10-03";
const INVITATION = "0199a1b2-0000-7000-8000-00000000cc01";
const FAILING_ADDRESS = "bounce@example.test";

/** Unique, so a leak into a redirect or a log is found by `includes`. */
const GIVEN = "Halinka-secret";
const SURNAME = "Zielonka-secret";

interface Fakes {
  readonly deps: TreeRouteDeps;
  readonly sent: OutgoingMail[];
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
    invite: vi.fn(() =>
      Promise.resolve({ kind: "OK", invitationId: INVITATION, expiresAt: new Date() }),
    ),
    withdrawInvitation: vi.fn(() => Promise.resolve({ kind: "OK" })),
    answerInvitation: vi.fn(() =>
      Promise.resolve({ kind: "OK", treeId: TREE_ID, personId: ID.marta }),
    ),
    updateCard: vi.fn(() => Promise.resolve({ kind: "OK" })),
    leaveTree: vi.fn(() => Promise.resolve({ kind: "OK" })),
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
  const sent: OutgoingMail[] = [];
  const deps: TreeRouteDeps = {
    family: family as unknown as TreeRouteDeps["family"],
    accounts: accounts as unknown as TreeRouteDeps["accounts"],
    secure: true,
    livingTermsVersion: CLAUSE,
    mailer: {
      send: (mail) => {
        if (mail.to === FAILING_ADDRESS) return Promise.reject(new Error("MailError"));
        sent.push(mail);
        return Promise.resolve();
      },
    },
    origin: ORIGIN,
    log: {
      info: (event, fields) => logged.push({ event, fields }),
      warn: (event, fields) => logged.push({ event, fields }),
    },
  };
  return { deps, family, accounts, logged, sent };
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
    ).toBe("/pl/konto/zaloguj?next=%2Fpl%2Fkonto%2Fdrzewa");
    expect(
      location(
        await handleTreePost(
          "create-tree",
          post("create-tree", { title: "x" }, { cookie: "__Host-na_session=nope" }),
          deps,
        ),
      ),
    ).toBe("/pl/konto/zaloguj?next=%2Fpl%2Fkonto%2Fdrzewa");
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

  it("add-person: a free tree that is full goes to the tree with the word that points to the offer (TASK-112)", async () => {
    const { deps, family } = fakes();
    family.addPerson.mockResolvedValueOnce({ kind: "PERSON_LIMIT", limit: 5 });
    expect(
      location(
        await handleTreePost(
          "add-person",
          post("add-person", { tree: TREE_ID, child: ID.ewa, role: "MOTHER", ...PERSON_FIELDS }),
          deps,
        ),
      ),
    ).toBe(`/pl/konto/drzewa/${TREE_ID}?status=person-limit`);
    // Nothing was added, so nothing is linked.
    expect(family.setParent).not.toHaveBeenCalled();
    for (const lang of ["pl", "en"] as const) {
      const words = treeStatusWords(lang, "tree", "person-limit");
      expect(words?.tone).toBe("problem");
      expect(words?.text).toContain("5");
      expect(words?.offer).toBeTruthy();
    }
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

describe("invitations and claims (TASK-094)", () => {
  const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/u;
  const person = `/pl/konto/drzewa/${TREE_ID}/osoba/${ID.marta}`;

  it("invite: makes a token, hands the service its hash and the address's hash, mails the token and names the owner (AC-1)", async () => {
    const { deps, family, sent, logged } = fakes();
    const to = location(
      await handleTreePost(
        "invite",
        post("invite", {
          tree: TREE_ID,
          person: ID.marta,
          email: " Relative@Example.test ",
          consent: "on",
        }),
        deps,
      ),
    );
    expect(to).toBe(`${person}?status=invited`);
    expect(family.invite).toHaveBeenCalledTimes(1);
    const call = family.invite.mock.calls[0]?.[0] as {
      userId: string;
      treeId: string;
      personId: string;
      tokenHash: string;
      addressHash: string;
    };
    expect(call).toMatchObject({ userId: USER, treeId: TREE_ID, personId: ID.marta });
    expect(call.tokenHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(call.addressHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(sent).toHaveLength(1);
    const mail = sent[0]!;
    expect(mail.to).toBe("Relative@Example.test");
    expect(mail.text).toContain("x@example.test");
    const link = /https:\/\/atlas\.test\/pl\/konto\/drzewa\/zaproszenie\?t=([A-Za-z0-9_-]+)/u.exec(
      mail.text,
    );
    expect(link?.[1]).toMatch(TOKEN_SHAPE);
    expect(hashToken(link?.[1] ?? "").toString("hex")).toBe(call.tokenHash);
    expect(mail.text).not.toContain("Marta");
    expect(JSON.stringify(logged)).not.toContain("Relative");
    expect(JSON.stringify(logged)).not.toContain(link?.[1] ?? "none");
  });

  it("invite: the consent box, the address, the service's reasons, and a mail that cannot be sent takes the row back", async () => {
    const { deps, family } = fakes();
    const back = async (fields: Record<string, string>): Promise<string> =>
      location(
        await handleTreePost(
          "invite",
          post("invite", { tree: TREE_ID, person: ID.marta, ...fields }),
          deps,
        ),
      );
    expect(await back({ email: "r@example.test" })).toBe(`${person}?status=invite-consent`);
    expect(await back({ email: "nope", consent: "on" })).toBe(`${person}?status=invite-email`);
    expect(family.invite).not.toHaveBeenCalled();
    for (const problem of [
      "NOT_LIVING",
      "MINOR",
      "CLAIMED",
      "DECLINED",
      "SUPPRESSED",
      "PENDING",
      "LIMIT",
    ]) {
      family.invite.mockResolvedValueOnce({ kind: "INVALID", problem });
      expect(await back({ email: "r@example.test", consent: "on" })).toBe(
        `${person}?status=${problem.toLowerCase().replace("_", "-")}`,
      );
    }
    family.invite.mockResolvedValueOnce({ kind: "FORBIDDEN" });
    expect(await back({ email: "r@example.test", consent: "on" })).toBe(
      `${person}?status=forbidden`,
    );
    expect(await back({ email: FAILING_ADDRESS, consent: "on" })).toBe(
      `${person}?status=invite-mail`,
    );
    expect(family.withdrawInvitation).toHaveBeenCalledWith({
      userId: USER,
      invitationId: INVITATION,
    });
    const { deps: unmailed, family: none } = fakes();
    (unmailed as { mailer: unknown }).mailer = null;
    expect(
      location(
        await handleTreePost(
          "invite",
          post("invite", {
            tree: TREE_ID,
            person: ID.marta,
            email: "r@example.test",
            consent: "on",
          }),
          unmailed,
        ),
      ),
    ).toBe(`${person}?status=invite-mail`);
    expect(none.invite).not.toHaveBeenCalled();
  });

  it("answer-invitation: spends the token with one of three answers and goes to the card or the cards (AC-3, AC-4)", async () => {
    const { deps, family } = fakes();
    const token = "T".repeat(43);
    const answer = async (fields: Record<string, string>): Promise<string> =>
      location(await handleTreePost("answer-invitation", post("answer-invitation", fields), deps));
    expect(await answer({ t: token, answer: "me" })).toBe(
      `/pl/konto/drzewa/karta/${ID.marta}?status=claimed`,
    );
    expect(family.answerInvitation).toHaveBeenCalledWith({
      userId: USER,
      tokenHash: hashToken(token).toString("hex"),
      answer: "ME",
    });
    expect(await answer({ t: token, answer: "not-me" })).toBe(
      "/pl/konto/drzewa/karty?status=not-me",
    );
    expect(await answer({ t: token, answer: "no-contact" })).toBe(
      "/pl/konto/drzewa/karty?status=no-contact",
    );
    expect(await answer({ t: token, answer: "maybe" })).toBe(
      `/pl/konto/drzewa/zaproszenie?t=${token}&status=answer`,
    );
    expect(await answer({ t: "short", answer: "me" })).toBe(
      "/pl/konto/drzewa/zaproszenie?status=not-found",
    );
    for (const [kind, status] of [
      ["EXPIRED", "expired"],
      ["ANSWERED", "answered"],
      ["NOT_FOUND", "not-found"],
    ] as const) {
      family.answerInvitation.mockResolvedValueOnce({ kind });
      expect(await answer({ t: token, answer: "me" })).toBe(
        `/pl/konto/drzewa/zaproszenie?t=${token}&status=${status}`,
      );
    }
    family.answerInvitation.mockResolvedValueOnce({ kind: "INVALID", problem: "ALREADY_IN_TREE" });
    expect(await answer({ t: token, answer: "me" })).toBe(
      `/pl/konto/drzewa/zaproszenie?t=${token}&status=already-in-tree`,
    );
  });

  it("update-card and leave-tree are the claimant's, with the hide boxes and the confirmation (AC-3, AC-5)", async () => {
    const { deps, family } = fakes();
    const card = `/pl/konto/drzewa/karta/${ID.marta}`;
    const body = new URLSearchParams({
      lang: "pl",
      person: ID.marta,
      given: "Marta",
      surname: "Zielińska",
      birth: "1991",
    });
    body.append("hide", "birth_year");
    body.append("hide", "birth_place");
    const request = new Request(`${ORIGIN}/api/tree/update-card`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: ORIGIN,
        cookie: `__Host-na_session=${SESSION}`,
      },
      body: body.toString(),
    });
    expect(location(await handleTreePost("update-card", request, deps))).toBe(
      `${card}?status=saved`,
    );
    expect(family.updateCard).toHaveBeenCalledWith({
      userId: USER,
      personId: ID.marta,
      card: expect.objectContaining({
        givenNames: "Marta",
        birthYear: 1991,
        hiddenFields: ["birth_year", "birth_place"],
      }),
    });
    family.updateCard.mockResolvedValueOnce({ kind: "INVALID", problems: ["HIDDEN_FIELDS"] });
    expect(
      location(
        await handleTreePost(
          "update-card",
          post("update-card", { person: ID.marta, given: "M", surname: "Z" }),
          deps,
        ),
      ),
    ).toBe(`${card}?given=M&surname=Z&status=hidden-fields`);
    family.updateCard.mockResolvedValueOnce({ kind: "NOT_FOUND" });
    expect(
      location(
        await handleTreePost(
          "update-card",
          post("update-card", { person: ID.marta, given: "M", surname: "Z" }),
          deps,
        ),
      ),
    ).toBe("/pl/konto/drzewa/karty?status=not-found");
    expect(
      location(await handleTreePost("leave-tree", post("leave-tree", { person: ID.marta }), deps)),
    ).toBe(`${card}?status=confirm`);
    expect(family.leaveTree).not.toHaveBeenCalled();
    expect(
      location(
        await handleTreePost(
          "leave-tree",
          post("leave-tree", { person: ID.marta, confirm: "on" }),
          deps,
        ),
      ),
    ).toBe("/pl/konto/drzewa/karty?status=left");
    expect(family.leaveTree).toHaveBeenCalledWith({ userId: USER, personId: ID.marta });
  });

  it("update-person on a row someone else has claimed goes back to the form with the word for it", async () => {
    const { deps, family } = fakes();
    family.updatePerson.mockResolvedValueOnce({ kind: "CLAIMED" });
    const to = location(
      await handleTreePost(
        "update-person",
        post("update-person", {
          tree: TREE_ID,
          person: ID.ewa,
          given: "Ewa",
          surname: "Zielińska",
        }),
        deps,
      ),
    );
    expect(to).toBe(
      `${`/pl/konto/drzewa/${TREE_ID}/osoba/${ID.ewa}`}?given=Ewa&surname=Zieli%C5%84ska&status=claimed-row`,
    );
  });
});
