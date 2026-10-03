import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accountPath } from "./account-paths.js";
import { offerPath } from "./site-links.js";
import { SAMPLE_ROWS, TreeLandingView, treeLandingMetadata } from "./tree-landing.js";
import { treeLandingPath, treePath } from "./tree-paths.js";
import { TREE_TEXT } from "./tree-text.js";

const LANGS = ["pl", "en"] as const;

const render = (lang: "pl" | "en") =>
  renderToStaticMarkup(createElement(TreeLandingView, { lang })).replaceAll("&#x27;", "'");

afterEach(() => vi.unstubAllEnvs());

describe("the tree's landing page (TASK-076)", () => {
  it("shows a sample pedigree first: four rows, every person a card, a lit question at an empty place, and says it is a sample", () => {
    for (const lang of LANGS) {
      const html = render(lang);
      const t = TREE_TEXT[lang].landing;
      for (const g of t.sample.generations) expect(html).toContain(g);
      expect(html.match(/tree-sample-card/gu)?.length).toBe(SAMPLE_ROWS.flat().length);
      expect(html).toContain("Marta Zielińska");
      expect(html).toContain("Franciszek Zieliński");
      expect(html).toContain(t.sample.question);
      expect(html).toContain(t.sample.caption);
      expect(html).toContain("tree-card-you");
      expect(html).toContain("tree-chip-living");
      expect(html).toContain("tree-chip-deceased");
      expect(html).toContain(`aria-label="${t.sample.figure}"`);
    }
    expect(SAMPLE_ROWS).toHaveLength(4);
    expect(SAMPLE_ROWS[3]).toHaveLength(1);
    expect(SAMPLE_ROWS[0]).toHaveLength(8);
  });

  it("says what the tree is, why, what the reader can do, who sees it and what is planned, in each language, with the same sections", () => {
    for (const lang of LANGS) {
      const html = render(lang);
      const t = TREE_TEXT[lang].landing;
      expect(html).toContain(t.heading);
      expect(html).toContain(t.lede);
      for (const section of [t.why.heading, t.what.heading, t.who.heading, t.plans.heading]) {
        expect(html).toContain(`>${section}</h3>`);
      }
      for (const line of [
        ...t.why.paragraphs,
        t.why.pull,
        ...t.what.items,
        ...t.who.items,
        t.plans.note,
      ]) {
        expect(html).toContain(line);
      }
      for (const [name, sub] of t.plans.items) {
        expect(html).toContain(name);
        expect(html).toContain(sub);
      }
      expect(html).toContain(t.who.othersSee);
      expect(html).toContain(t.who.youSee);
      expect(html).toContain("tree-sealed");
      expect(html).toContain(t.cta.heading);
    }
    for (const key of ["what", "who"] as const) {
      expect(TREE_TEXT.pl.landing[key].items).toHaveLength(TREE_TEXT.en.landing[key].items.length);
    }
    expect(TREE_TEXT.pl.landing.plans.items).toHaveLength(TREE_TEXT.en.landing.plans.items.length);
    expect(TREE_TEXT.pl.landing.why.paragraphs).toHaveLength(
      TREE_TEXT.en.landing.why.paragraphs.length,
    );
    expect(TREE_TEXT.pl.landing.what.demo.matches).toHaveLength(
      TREE_TEXT.en.landing.what.demo.matches.length,
    );
  });

  it("carries the question form as a picture, not a form: read-only fields, no form element, no script", () => {
    for (const lang of LANGS) {
      const html = render(lang);
      const d = TREE_TEXT[lang].landing.what.demo;
      expect(html).toContain(d.heading);
      expect(html).toContain(`value="${d.givenValue}"`);
      expect(html).toContain(d.matches[0]?.[0] ?? "?");
      expect(html).toContain(d.submit);
      expect(html).not.toContain("<form");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("<button");
      expect(html.match(/<input [^>]*readOnly/gu)?.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("offers the two actions twice, the sign-in, the offer, and the other language's address of itself", () => {
    for (const lang of LANGS) {
      const html = render(lang);
      expect(html.split(`href="${treePath(lang, { page: "trees" })}"`)).toHaveLength(3);
      expect(html.split(`href="${accountPath(lang, "sign-up")}"`)).toHaveLength(3);
      expect(html).toContain(`href="${accountPath(lang, "sign-in")}"`);
      expect(html).toContain(`href="${offerPath(lang)}"`);
      const other = lang === "pl" ? "en" : "pl";
      expect(html).toContain(`href="${treeLandingPath(other)}" hrefLang="${other}"`);
      const meta = treeLandingMetadata(lang);
      expect(meta.alternates?.canonical).toBe(treeLandingPath(lang));
      expect(String(meta.title)).toContain("Name Atlas");
    }
    expect(treeLandingPath("pl")).toBe("/pl/drzewo-rodzinne");
    expect(treeLandingPath("en")).toBe("/en/family-tree");
  });

  it("marks the header's trees link as the current place", () => {
    for (const [name, value] of Object.entries({
      ACCOUNTS_DATABASE_URL: "postgres://app:pw@127.0.0.1:1/db",
      RESEND_API_KEY: "re_key",
      ACCOUNTS_MAIL_FROM: "Name Atlas <konto@example.test>",
      SITE_ORIGIN: "https://atlas.example.test",
      CRON_SECRET: "cron-secret",
      FAMILY_TREE_ENABLED: "1",
    })) {
      vi.stubEnv(name, value);
    }
    expect(render("pl")).toContain(
      `class="nav-trees" href="${treeLandingPath("pl")}" aria-current="page"`,
    );
  });
});
