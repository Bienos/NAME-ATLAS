import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { treeMetadata, TreePageView } from "./tree-page.js";
import type { TreePageData } from "./tree-load.js";
import { pedigree, nextQuestion, unplaced } from "./tree-pedigree.js";
import { EMPTY_DRAFT, treeLandingPath, treePath } from "./tree-paths.js";
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
    .replaceAll("&#x27;", "'");
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
  });

  it("the pedigree for a member who may not see the living: the deceased, the count, no forms", () => {
    for (const lang of LANGS) {
      const html = render(treeData(lang, treeForMember()));
      expect(html).toContain(TREE_TEXT[lang].pedigree.hiddenCount(4));
      expect(html).toContain(TREE_TEXT[lang].pedigree.viewer);
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
