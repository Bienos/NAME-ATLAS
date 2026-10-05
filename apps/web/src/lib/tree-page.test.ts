import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { treeMetadata, TreePageView } from "./tree-page.js";
import type { TreePageData } from "./tree-load.js";
import type { PlaceRegion } from "./tree-places.js";
import { pedigree, nextQuestion, unplaced } from "./tree-pedigree.js";
import { EMPTY_DRAFT, treeExportPath, treeLandingPath, treePath } from "./tree-paths.js";
import { TREE_TEXT } from "./tree-text.js";
import { htmlLang } from "./messages.js";
import { ID, PEOPLE, tree, treeForMember, TREE_ID } from "./tree-fixture.js";

const LANGS = ["pl", "en"] as const;

const ON: Record<string, string> = {
  ACCOUNTS_DATABASE_URL: "postgres://app:pw@127.0.0.1:1/db",
  RESEND_API_KEY: "re_key",
  ACCOUNTS_MAIL_FROM: "Name Atlas <konto@example.test>",
  SITE_ORIGIN: "https://atlas.example.test",
  CRON_SECRET: "cron-secret",
  FAMILY_TREE_ENABLED: "1",
};

afterEach(() => vi.unstubAllEnvs());

function render(data: TreePageData): string {
  return renderToStaticMarkup(createElement(TreePageView, { data }))
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"');
}

const SUMMARY = {
  tree_id: TREE_ID,
  title: "Rodzina Zielińskich",
  role: "OWNER" as const,
  person_count: 8,
  updated_at: "2026-10-03T10:00:00.000Z",
};

function treeData(
  lang: "pl" | "en",
  t = tree(),
  status: string | null = null,
  person = null as TreePageData extends { kind: "tree" } ? never : null,
): Extract<TreePageData, { kind: "tree" }> {
  const slots = pedigree(t);
  return {
    kind: "tree",
    lang,
    status,
    tree: t,
    slots,
    unplaced: unplaced(t, slots),
    question: nextQuestion(t, slots),
    person,
  };
}

describe("the tree's pages render from their data, in both languages (TASK-076)", () => {
  it("the dashboard: the trees as rows, a new-tree form, the question and the privacy lines (AC-3)", () => {
    for (const lang of LANGS) {
      const t = tree();
      const html = render({
        kind: "trees",
        lang,
        status: "tree-deleted",
        trees: [SUMMARY],
        firstTree: t,
        question: nextQuestion(t),
        cards: [],
      });
      const words = TREE_TEXT[lang];
      expect(html).toContain(`href="${treePath(lang, { page: "tree", treeId: TREE_ID })}"`);
      expect(html).toContain("Rodzina Zielińskich");
      expect(html).toContain('action="/api/tree/create-tree"');
      expect(html).toContain(words.status.trees["tree-deleted"]?.text ?? "?");
      expect(html).toContain(words.question.ask("MOTHER"));
      expect(html).toContain("Ewa Zielińska");
      expect(html).toContain(
        `href="${treePath(lang, { page: "add", treeId: TREE_ID }, { child: ID.ewa, role: "MOTHER" })}"`,
      );
      for (const line of words.dashboard.privacy) expect(html).toContain(line);
      expect(html).toContain(`<main lang="${htmlLang(lang)}"`);
    }
    const none = render({
      kind: "trees",
      lang: "pl",
      status: null,
      trees: [],
      firstTree: null,
      question: null,
      cards: [],
    });
    expect(none).toContain(TREE_TEXT.pl.dashboard.none);
  });

  it("the pedigree: four generations, dashed empty places that link to the parent's form, the chips (AC-5)", () => {
    const html = render(treeData("pl"));
    expect(html).toContain("Marta Zielińska");
    expect(html).toContain("Antoni Kaczmarek");
    for (const g of TREE_TEXT.pl.pedigree.generation) expect(html).toContain(g);
    expect(html).toContain(
      `class="tree-card tree-card-empty" href="${treePath("pl", { page: "add", treeId: TREE_ID }, { child: ID.ewa, role: "MOTHER" })}"`,
    );
    expect(html).toContain(
      `href="${treePath("pl", { page: "person", treeId: TREE_ID, personId: ID.halina })}"`,
    );
    expect(html).toContain("tree-chip-living");
    expect(html).toContain("tree-chip-deceased");
    expect(html).toContain("1937 – 2015");
    expect(html).toContain(TREE_TEXT.pl.pedigree.unplaced);
    expect(html).toContain("Piotr Wróbel");
    expect(html).toContain('action="/api/tree/delete-tree"');
    expect(html).not.toContain(TREE_TEXT.pl.pedigree.hidden);
    // The export link (TASK-098, AC-4), for the owner here and for a viewer below.
    expect(html).toContain(`href="${treeExportPath("pl", TREE_ID)}" download`);
    expect(html).toContain(TREE_TEXT.pl.pedigree.exportLink);
    const en = render(treeData("en"));
    expect(en).toContain(`href="${treeExportPath("en", TREE_ID)}" download`);
    expect(en).toContain(TREE_TEXT.en.pedigree.exportLink);
  });

  it("the pedigree for a member who may not see the living: the deceased, the count, no forms", () => {
    for (const lang of LANGS) {
      const html = render(treeData(lang, treeForMember()));
      expect(html).toContain(TREE_TEXT[lang].pedigree.hiddenCount(4));
      expect(html).toContain(TREE_TEXT[lang].pedigree.viewer);
      expect(html).toContain(`href="${treeExportPath(lang, TREE_ID)}" download`);
      expect(html).not.toContain("Marta");
      expect(html).toContain("Antoni Kaczmarek");
      expect(html).not.toContain("/api/tree/");
      expect(html).not.toContain(treePath(lang, { page: "add", treeId: TREE_ID }));
    }
  });

  it("names the person a word is about, and shows a hidden parent's place as hidden", () => {
    const added = render({ ...treeData("pl", tree(), "added"), person: PEOPLE.antoni });
    expect(added).toContain("Antoni Kaczmarek jest w drzewie.");
    const withHidden = tree({
      parentage: [
        ...tree().parentage,
        { child_id: ID.jozef, parent_id: ID.hidden, role: "MOTHER" },
      ],
    });
    expect(render(treeData("en", withHidden))).toContain(TREE_TEXT.en.pedigree.hidden);
  });

  it("says a full free tree is full and links to the offer, with no way to buy (TASK-112)", () => {
    const offer = { pl: "/pl/oferta", en: "/en/offer" } as const;
    for (const lang of LANGS) {
      const html = render(treeData(lang, tree(), "person-limit"));
      const words = TREE_TEXT[lang].status.tree["person-limit"];
      expect(html).toContain(words?.text);
      expect(html).toContain(`<a href="${offer[lang]}">${words?.offer}</a>`);
      expect(html).not.toMatch(/kup|zapłać|buy|checkout|pay now/iu);
    }
  });

  it("one question per screen: the role choice, then the form with the fields of the design (AC-6)", () => {
    const t = tree();
    const choice = render({
      kind: "add",
      lang: "pl",
      status: null,
      tree: t,
      child: PEOPLE.ewa,
      role: null,
      childHas: ["FATHER"],
      form: { draft: EMPTY_DRAFT, search: { kind: "none" } },
    });
    expect(choice).toContain(TREE_TEXT.pl.form.parentsHeading);
    expect(choice).toContain(
      treePath("pl", { page: "add", treeId: TREE_ID }, { child: ID.ewa, role: "MOTHER" }),
    );
    expect(choice).not.toContain(
      treePath("pl", { page: "add", treeId: TREE_ID }, { child: ID.ewa, role: "FATHER" }),
    );

    const draft = { ...EMPTY_DRAFT, given: "Halina", placeText: "Szcze", birthYear: "1937" };
    const form = render({
      kind: "add",
      lang: "pl",
      status: "birth-year",
      tree: t,
      child: PEOPLE.ewa,
      role: "MOTHER",
      childHas: ["FATHER"],
      form: {
        draft,
        search: {
          kind: "found",
          matches: [
            { code: "0920077", name: "Szczebrzeszyn", district: "zamojski", region: "lubelskie" },
          ],
        },
      },
    });
    expect(form).toContain(TREE_TEXT.pl.form.whatHeading("MOTHER"));
    expect(form).toContain('action="/api/tree/add-person"');
    expect(form).toContain(`name="child" value="${ID.ewa}"`);
    expect(form).toContain('name="role" value="MOTHER"');
    expect(form).toContain('name="given" value="Halina"');
    expect(form).toContain('name="birth" value="1937"');
    expect(form).toContain(
      `name="search" formAction="${treePath("pl", { page: "add", treeId: TREE_ID })}" formMethod="get"`,
    );
    expect(form).toContain('name="place_code" checked="" value="0920077 Szczebrzeszyn"');
    expect(form).toContain("Szczebrzeszyn");
    expect(form).toContain("zamojski · lubelskie");
    expect(form).toContain(TREE_TEXT.pl.status.add["birth-year"]?.text ?? "?");
    for (const status of ["LIVING", "DECEASED"] as const)
      expect(form).toContain(`name="living" value="${status}"`);
    expect(form).toContain('name="living" checked="" value="UNKNOWN"');
    expect(form).not.toContain("<script");

    const first = render({
      kind: "add",
      lang: "en",
      status: null,
      tree: tree({ persons: [], parentage: [], tree: { ...t.tree, root_person_id: null } }),
      child: null,
      role: null,
      childHas: [],
      form: { draft: EMPTY_DRAFT, search: { kind: "empty" } },
    });
    expect(first).toContain(TREE_TEXT.en.form.firstHeading);
    expect(first).toContain(TREE_TEXT.en.form.noMatch);
  });

  it("a person's form for corrections: prefilled, with the parents, the links and the deletion", () => {
    const t = tree();
    const html = render({
      kind: "person",
      lang: "pl",
      status: "saved",
      tree: t,
      person: PEOPLE.halina,
      parents: { known: [{ person: PEOPLE.antoni, role: "FATHER" }], hidden: 0 },
      others: t.persons.filter((p) => p.id !== ID.halina),
      form: {
        draft: {
          ...EMPTY_DRAFT,
          given: "Halina",
          surname: "Zielińska",
          deathYear: "2015",
          living: "DECEASED",
        },
        search: { kind: "none" },
      },
      invitation: null,
    });
    expect(html).toContain("<h2>Halina Zielińska</h2>");
    expect(html).toContain('action="/api/tree/update-person"');
    expect(html).toContain(`name="person" value="${ID.halina}"`);
    expect(html).toContain('name="death" value="2015"');
    expect(html).toContain("Antoni Kaczmarek");
    expect(html).toContain('action="/api/tree/remove-parent"');
    expect(html).toContain(
      treePath("pl", { page: "add", treeId: TREE_ID }, { child: ID.halina, role: "MOTHER" }),
    );
    expect(html).not.toContain(
      treePath("pl", { page: "add", treeId: TREE_ID }, { child: ID.halina, role: "FATHER" }),
    );
    expect(html).toContain('action="/api/tree/set-parent"');
    expect(html).toContain('action="/api/tree/set-root"');
    expect(html).toContain('action="/api/tree/delete-person"');
    expect(html).toContain(TREE_TEXT.pl.status.person["saved"]?.text ?? "?");
    const root = render({
      kind: "person",
      lang: "en",
      status: null,
      tree: t,
      person: PEOPLE.marta,
      parents: { known: [], hidden: 1 },
      others: [],
      form: { draft: EMPTY_DRAFT, search: { kind: "none" } },
      invitation: null,
    });
    expect(root).toContain(TREE_TEXT.en.person.isRoot);
    expect(root).toContain(TREE_TEXT.en.person.hiddenParents(1));
    expect(root).not.toContain('action="/api/tree/set-root"');
  });

  it("the consent step: the points, one checkbox, the draft as hidden fields, a way back with the draft (AC-4)", () => {
    const draft = {
      ...EMPTY_DRAFT,
      given: "Halina",
      surname: "Zielińska",
      living: "LIVING" as const,
    };
    for (const lang of LANGS) {
      const html = render({
        kind: "consent",
        lang,
        status: "terms",
        tree: tree(),
        form: { draft, search: { kind: "none" } },
        subject: { kind: "add", child: PEOPLE.ewa, role: "MOTHER" },
      });
      const t = TREE_TEXT[lang];
      for (const point of t.consent.points) expect(html).toContain(point);
      expect(html).toContain('action="/api/tree/accept-living-terms"');
      expect(html).toContain('type="checkbox" required="" name="terms" value="on"');
      expect(html.match(/type="checkbox"/gu)).toHaveLength(1);
      expect(html).toContain('type="hidden" name="given" value="Halina"');
      expect(html).toContain('type="hidden" name="living" value="LIVING"');
      expect(html).toContain(`type="hidden" name="child" value="${ID.ewa}"`);
      expect(html).toContain('type="hidden" name="role" value="MOTHER"');
      expect(html).toContain(t.status.consent["terms"]?.text ?? "?");
      expect(html).toContain(
        `href="${treePath(lang, { page: "add", treeId: TREE_ID }, { given: "Halina", surname: "Zielińska", living: "LIVING", child: ID.ewa, role: "MOTHER" })}"`,
      );
    }
    const update = render({
      kind: "consent",
      lang: "pl",
      status: null,
      tree: tree(),
      form: { draft, search: { kind: "none" } },
      subject: { kind: "update", person: PEOPLE.ewa },
    });
    expect(update).toContain(`type="hidden" name="person" value="${ID.ewa}"`);
  });

  it("is noindex, with the other language's address of the same page, and never a surname in the metadata", () => {
    for (const lang of LANGS) {
      const meta = treeMetadata(lang, "tree");
      expect(meta.robots).toEqual({ index: false, follow: false });
      expect(String(meta.title)).toContain("Name Atlas");
    }
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    const html = render(treeData("pl"));
    expect(html).toContain(`href="${treePath("en", { page: "tree", treeId: TREE_ID })}"`);
    expect(html).toContain(`class="nav-trees" href="${treeLandingPath("pl")}" aria-current="page"`);
  });
});

function constellationData(
  lang: "pl" | "en",
  t = tree(),
  picked = 1,
): Extract<TreePageData, { kind: "constellation" }> {
  const slots = pedigree(t);
  return {
    kind: "constellation",
    lang,
    status: null,
    tree: t,
    slots,
    picked,
    unplacedCount: unplaced(t, slots).length,
  };
}

describe("the Konstelacja view (TASK-091)", () => {
  it("draws every slot as a star that is a link to ?sel=n, the switch, the legend and the root's panel, in both languages (AC-4, AC-6)", () => {
    const shapes: string[] = [];
    for (const lang of LANGS) {
      const t = TREE_TEXT[lang];
      const html = render(constellationData(lang));
      const slots = pedigree(tree());
      expect(html).toContain(`lang="${htmlLang(lang)}"`);
      expect(html).toContain(t.constellation.lede);
      expect(html).toContain(`aria-label="${t.constellation.viewsLabel}"`);
      expect(html).toContain(
        `href="${treePath(lang, { page: "constellation", treeId: TREE_ID })}" aria-current="page"`,
      );
      expect(html).toContain(`href="${treePath(lang, { page: "tree", treeId: TREE_ID })}"`);
      for (const slot of slots) expect(html).toContain(`href="?sel=${slot.n}"`);
      expect(html.match(/href="\?sel=/gu)?.length).toBe(slots.length);
      expect(html).toContain(`href="?sel=1" class="tree-star tree-star-living"`);
      expect(html.match(/tree-star-[a-z]+" aria-label="[^"]*" aria-current="true"/gu)?.length).toBe(
        1,
      );
      expect(html).toContain(`${PEOPLE.marta.given_names} ${PEOPLE.marta.surname}</h3>`);
      expect(html).toContain(t.constellation.panel.livingNote);
      expect(html).toContain(
        `href="${treePath(lang, { page: "person", treeId: TREE_ID, personId: ID.marta })}"`,
      );
      expect(html).toContain(t.constellation.note);
      for (const word of Object.values(t.constellation.legend)) expect(html).toContain(word);
      expect(html).toContain(t.constellation.outside(1));
      expect(html).toContain(t.constellation.arcLabel(3));
      expect(html).not.toContain("<script");
      const stars = html.slice(html.indexOf('<div class="tree-stars">'), html.indexOf("</aside>"));
      shapes.push(stars.replace(/>[^<]*</gu, "><").replace(/"[^"]*"/gu, '""'));
    }
    expect(shapes[0]).toBe(shapes[1]);
  });

  it("shows an empty place's panel with the way to add that parent, and nothing to add for a viewer (AC-5)", () => {
    const html = render(constellationData("pl", tree(), 7));
    expect(html).toContain(
      `href="?sel=7" class="tree-star tree-star-empty" aria-label="puste miejsce" aria-current="true"`,
    );
    expect(html).toContain("Brak danych.</h3>");
    expect(html).toContain(
      `href="${treePath("pl", { page: "add", treeId: TREE_ID }, { child: ID.ewa, role: "MOTHER" })}">Dodaj matkę</a>`,
    );
    // A member whose tree starts from a deceased person: stars, but nothing to add or edit.
    const member = treeForMember();
    const viewer = render(
      constellationData("pl", { ...member, tree: { ...member.tree, root_person_id: ID.jozef } }, 2),
    );
    expect(viewer).toContain(TREE_TEXT.pl.pedigree.viewer);
    expect(viewer).toContain(TREE_TEXT.pl.pedigree.hiddenCount(member.hidden_living_count));
    expect(viewer).not.toContain("/dodaj");
    expect(viewer).not.toContain("/osoba/");
    expect(viewer).toContain("tree-star-entered");
    expect(viewer).toContain(`>${TREE_TEXT.pl.constellation.noneName}</text>`);
    expect(viewer).not.toContain(`>${TREE_TEXT.pl.constellation.emptyName}</text>`);
    // A member whose root is a person they may not see has no stars, and no way to start.
    const blind = render(constellationData("pl", member, 1));
    expect(blind).not.toContain("?sel=");
    expect(blind).toContain(TREE_TEXT.pl.question.startLede);
    expect(blind).not.toContain(TREE_TEXT.pl.pedigree.addFirst);
    // A parent the caller may not see is a hidden star with its own panel.
    const withHidden = tree({
      parentage: [
        ...tree().parentage,
        { child_id: ID.jozef, parent_id: ID.hidden, role: "FATHER" },
      ],
      hidden_living_count: 1,
    });
    const hidden = render(constellationData("pl", withHidden, 8));
    expect(hidden).toContain(`href="?sel=8" class="tree-star tree-star-hidden"`);
    expect(hidden).toContain(`${TREE_TEXT.pl.constellation.panel.hiddenHeading}</h3>`);
    expect(hidden).toContain(TREE_TEXT.pl.constellation.panel.hiddenText);
    expect(hidden).toContain(`>${TREE_TEXT.pl.constellation.hiddenName}</text>`);
  });

  it("names the page in the metadata and switches to the pedigree from the Rodowód too (AC-6)", () => {
    expect(treeMetadata("pl", "constellation").title).toBe("Konstelacja — Name Atlas");
    expect(treeMetadata("en", "constellation").title).toBe("Constellation — Name Atlas");
    const rodowod = render(treeData("pl"));
    expect(rodowod).toContain(
      `href="${treePath("pl", { page: "tree", treeId: TREE_ID })}" aria-current="page"`,
    );
    expect(rodowod).toContain(
      `href="${treePath("pl", { page: "constellation", treeId: TREE_ID })}"`,
    );
  });
});

function mapData(
  lang: "pl" | "en",
  t = tree(),
  picked = 1,
  places: PlaceRegion[] = [],
): Extract<TreePageData, { kind: "map" }> {
  const slots = pedigree(t);
  return {
    kind: "map",
    lang,
    status: null,
    tree: t,
    slots,
    picked,
    places,
    unplacedCount: unplaced(t, slots).length,
  };
}

describe("the Mapa view (TASK-092)", () => {
  const withPlaces = () => {
    const t = tree();
    return tree({
      persons: t.persons.map((p) =>
        p.id === ID.marta || p.id === ID.ewa
          ? { ...p, birth: { ...p.birth, place_code: "0960432", place_text: "Szczebrzeszyn" } }
          : p,
      ),
    });
  };
  const PLACES = [
    {
      code: "0960432",
      name: "Szczebrzeszyn",
      district: "zamojski",
      region: { code: "06", name: "LUBELSKIE" },
    },
  ];

  it("draws the 16 voivodeships, lights the ones with people, lists the rail as links ?sel=n and the picked card, in both languages (AC-4, AC-5)", () => {
    const shapes: string[] = [];
    for (const lang of LANGS) {
      const t = TREE_TEXT[lang];
      const html = render(mapData(lang, withPlaces(), 1, PLACES));
      expect(html).toContain(t.map.lede);
      expect(html).toContain(
        `href="${treePath(lang, { page: "map", treeId: TREE_ID })}" aria-current="page"`,
      );
      expect(html).toContain(
        `href="${treePath(lang, { page: "constellation", treeId: TREE_ID })}"`,
      );
      expect(html.match(/class="tree-map-region /gu)?.length).toBe(16);
      expect(html.match(/tree-map-region-b3/gu)?.length).toBe(1);
      expect(html).toContain("tree-map-region-picked");
      expect(html).toContain(`aria-label="${t.map.regionLabel("LUBELSKIE", 2)}"`);
      expect(html).toContain("LUBELSKIE ×2</text>");
      expect(html.match(/href="\?sel=/gu)?.length).toBe(7);
      expect(html.match(/tree-rail-item" aria-current="true"/gu)?.length).toBe(1);
      expect(html).toContain(
        `${t.map.card.heading}</p><h3>${PEOPLE.marta.given_names} ${PEOPLE.marta.surname}</h3>`,
      );
      expect(html).toContain(`${t.map.card.birth}: Szczebrzeszyn · zamojski · LUBELSKIE`);
      expect(html).toContain(t.map.offMap(5));
      expect(html).toContain(t.map.offMapItem);
      expect(html).toContain(t.map.note);
      expect(html).not.toContain("<script");
      const view = html.slice(
        html.indexOf('<div class="tree-map-view">'),
        html.indexOf("</aside>"),
      );
      shapes.push(view.replace(/>[^<]*</gu, "><").replace(/"[^"]*"/gu, '""'));
    }
    expect(shapes[0]).toBe(shapes[1]);
  });

  it("joins Marta to Ewa across voivodeships only when their voivodeships differ, and shows a viewer no way to edit", () => {
    const same = render(mapData("pl", withPlaces(), 3, PLACES));
    expect(same).not.toContain("tree-map-arc");
    const t = withPlaces();
    const apart = tree({
      persons: t.persons.map((p) =>
        p.id === ID.ewa
          ? { ...p, birth: { ...p.birth, place_code: "0918123", place_text: "Warszawa" } }
          : p,
      ),
    });
    const html = render(
      mapData("pl", apart, 3, [
        ...PLACES,
        {
          code: "0918123",
          name: "Warszawa",
          district: "Warszawa",
          region: { code: "14", name: "MAZOWIECKIE" },
        },
      ]),
    );
    expect(html.match(/class="tree-map-arc"/gu)?.length).toBe(1);
    expect(html).toContain("MAZOWIECKIE</text>");
    expect(html).toContain(
      `href="${treePath("pl", { page: "person", treeId: TREE_ID, personId: ID.ewa })}"`,
    );
    const member = treeForMember();
    const viewer = render(
      mapData("pl", { ...member, tree: { ...member.tree, root_person_id: ID.jozef } }, 1, []),
    );
    expect(viewer).toContain(TREE_TEXT.pl.pedigree.viewer);
    expect(viewer).not.toContain("/osoba/");
    expect(viewer).toContain(TREE_TEXT.pl.map.offMap(1));
    expect(treeMetadata("pl", "map").title).toBe("Mapa — Name Atlas");
    expect(treeMetadata("en", "map").title).toBe("Map — Name Atlas");
  });
});

describe("invitations and claims (TASK-094, AC-6)", () => {
  const CARD = {
    person: {
      id: ID.marta,
      given_names: "Marta",
      surname: "Zielińska",
      birth_surname: null,
      birth: { year: 1991, approx: false, place_code: null, place_text: "Szczebrzeszyn" },
      hidden_fields: [] as const,
      claimed_at: null,
    },
    parents: [{ given_names: "Ewa", surname: "Zielińska", role: "MOTHER" as const }],
  };
  const TOKEN = "T".repeat(43);
  const INVITATION = {
    invitation_id: "0199a1b2-0000-7000-8000-00000000cc01",
    sent_at: "2026-10-04T10:00:00.000Z",
    expires_at: "2026-10-18T10:00:00.000Z",
    answered_at: null,
    answer: null,
    pending: true,
  };

  function personData(
    lang: "pl" | "en",
    person = PEOPLE.marta,
    invitation: Extract<TreePageData, { kind: "person" }>["invitation"] = null,
    role: "OWNER" | "EDITOR" = "OWNER",
  ): Extract<TreePageData, { kind: "person" }> {
    const t = tree();
    return {
      kind: "person",
      lang,
      status: null,
      tree: { ...t, tree: { ...t.tree, role } },
      person,
      parents: { known: [], hidden: 0 },
      others: [PEOPLE.ewa],
      form: { draft: EMPTY_DRAFT, search: { kind: "none" } },
      invitation,
    };
  }

  it("the owner's page of a living person carries the invitation form, then the invitation's state", () => {
    for (const lang of LANGS) {
      const t = TREE_TEXT[lang];
      const html = render(personData(lang));
      expect(html).toContain('action="/api/tree/invite"');
      expect(html).toContain('name="email"');
      expect(html).toContain('name="consent"');
      expect(html).toContain(t.invite.lede);
      const pending = render(personData(lang, PEOPLE.marta, INVITATION));
      expect(pending).not.toContain('action="/api/tree/invite"');
      expect(pending).toContain(t.invite.pending("4", "18").slice(0, 10));
      const answered = render(
        personData(lang, PEOPLE.marta, {
          ...INVITATION,
          answered_at: "2026-10-05T10:00:00.000Z",
          answer: "NOT_ME",
          pending: false,
        }),
      );
      expect(answered).toContain('action="/api/tree/invite"');
      expect(answered).toContain(lang === "pl" ? "nie zaprosisz" : "cannot invite");
    }
    // Not for an editor, nor for a deceased person.
    expect(render(personData("pl", PEOPLE.marta, null, "EDITOR"))).not.toContain(
      'action="/api/tree/invite"',
    );
    expect(render(personData("pl", PEOPLE.jozef))).not.toContain('action="/api/tree/invite"');
  });

  it("a claimed row is read-only with its hidden fields marked; a declined row says so (AC-3, AC-4)", () => {
    const claimed = {
      ...PEOPLE.marta,
      claimed: true,
      hidden_fields: ["birth_year", "birth_place"] as const,
      birth: { year: null, approx: false, place_code: null, place_text: null },
      birth_surname: "Wróbel",
    };
    for (const lang of LANGS) {
      const t = TREE_TEXT[lang];
      const html = render(personData(lang, claimed));
      expect(html).not.toContain('action="/api/tree/update-person"');
      expect(html).not.toContain('action="/api/tree/invite"');
      expect(html).toContain(t.invite.claimedNote);
      expect(html.split(t.invite.hiddenMark)).toHaveLength(3);
      expect(html).toContain("Wróbel");
      expect(html).toContain('action="/api/tree/set-parent"');
      expect(html).toContain('action="/api/tree/delete-person"');
    }
    const mine = render(personData("pl", { ...claimed, claimed_by_me: true }));
    expect(mine).toContain('action="/api/tree/update-person"');
    const declined = render(personData("en", { ...PEOPLE.marta, contact_declined: true }));
    expect(declined).toContain(TREE_TEXT.en.invite.declinedNote);
    expect(declined).not.toContain('action="/api/tree/invite"');
  });

  it("the invitation page shows the row, the parents and the three answers with the token, and the same in both languages", () => {
    const shapes: string[] = [];
    for (const lang of LANGS) {
      const t = TREE_TEXT[lang];
      const html = render({
        kind: "invitation",
        lang,
        status: null,
        token: TOKEN,
        state: { kind: "open", card: CARD },
      });
      expect(html).toContain("Marta");
      expect(html).toContain("Szczebrzeszyn");
      expect(html).toContain(`${t.person.roles.MOTHER}: Ewa Zielińska`);
      expect(html).toContain('action="/api/tree/answer-invitation"');
      expect(html).toContain(`name="t" value="${TOKEN}"`);
      for (const value of ["me", "not-me", "no-contact"])
        expect(html).toContain(`value="${value}"`);
      for (const line of t.invitation.explain) expect(html).toContain(line);
      expect(html).not.toContain("Rodzina Zielińskich");
      // The page's own tag structure: the words and the addresses differ by language, and the shell's nav has its own order.
      const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
      shapes.push(main.replace(/>[^<]*</gu, "><").replace(/<([a-z0-9]+)[^>]*>/gu, "<$1>"));
      const other = lang === "pl" ? "en" : "pl";
      expect(html).toContain(`href="${treePath(other, { page: "invitation" }, { t: TOKEN })}"`);
    }
    expect(shapes[0]).toBe(shapes[1]);
    for (const [state, word] of [
      ["expired", "expired"],
      ["answered", "answered"],
      ["missing", "not-found"],
    ] as const) {
      const html = render({
        kind: "invitation",
        lang: "pl",
        status: null,
        token: TOKEN,
        state: { kind: state },
      });
      expect(html).toContain(TREE_TEXT.pl.status.invitation[word]?.text ?? "?");
      expect(html).not.toContain('action="/api/tree/answer-invitation"');
    }
  });

  it("the cards and one card: the list, the form with the hide boxes, the parents, the way to leave (AC-3, AC-5)", () => {
    const summary = {
      person_id: ID.marta,
      given_names: "Marta",
      surname: "Zielińska",
      claimed_at: "2026-10-04T10:00:00.000Z",
    };
    for (const lang of LANGS) {
      const t = TREE_TEXT[lang];
      const list = render({ kind: "cards", lang, status: "left", cards: [summary] });
      expect(list).toContain(`href="${treePath(lang, { page: "card", personId: ID.marta })}"`);
      expect(list).toContain(t.status.cards["left"]?.text ?? "?");
      const none = render({ kind: "cards", lang, status: null, cards: [] });
      expect(none).toContain(t.cards.none);
      const card = render({
        kind: "card",
        lang,
        status: "claimed",
        card: { ...CARD, person: { ...CARD.person, hidden_fields: ["birth_place"] } },
        form: {
          draft: { ...EMPTY_DRAFT, given: "Marta", surname: "Zielińska", birthYear: "1991" },
          search: { kind: "none" },
        },
      });
      expect(card).toContain('action="/api/tree/update-card"');
      expect(card).toContain('name="hide" checked="" value="birth_place"');
      expect(card).toContain('name="hide" value="birth_year"');
      expect(card).not.toContain('checked="" value="birth_year"');
      expect(card).not.toContain(`name="living"`);
      expect(card).not.toContain(`name="death"`);
      expect(card).toContain('action="/api/tree/leave-tree"');
      expect(card).toContain(t.card.leaveConfirm);
      expect(card).toContain(t.status.card["claimed"]?.text ?? "?");
      expect(card).toContain(`${t.person.roles.MOTHER}: Ewa Zielińska`);
    }
    const dashboard = render({
      kind: "trees",
      lang: "pl",
      status: null,
      trees: [],
      firstTree: null,
      question: null,
      cards: [summary],
    });
    expect(dashboard).toContain(`href="${treePath("pl", { page: "cards" })}"`);
    expect(dashboard).toContain(TREE_TEXT.pl.cards.dashboardLink(1));
  });

  it("names the three new pages in their metadata", () => {
    for (const page of ["invitation", "cards", "card"] as const) {
      expect(treeMetadata("pl", page).title).toBe(`${TREE_TEXT.pl.headings[page]} — Name Atlas`);
    }
  });
});
