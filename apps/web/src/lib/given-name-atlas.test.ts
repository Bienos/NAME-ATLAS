import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GivenNameListFactsArtefact } from "@name-atlas/contracts";
import { givenNameListFacts } from "@name-atlas/truth";
import { GIVEN_NAME_PLATES, GivenNameAtlas } from "./given-name-atlas.js";
import { formatInteger, formatShare, UI } from "./messages.js";
import type { Lang } from "./messages.js";

const LANGS = ["pl", "en"] as const;
const facts: GivenNameListFactsArtefact = givenNameListFacts();

const render = (given: GivenNameListFactsArtefact | null, lang: Lang) =>
  renderToStaticMarkup(createElement(GivenNameAtlas, { facts: given, lang }));

/** The text a reader sees: tags out, entities decoded, whitespace collapsed. */
function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/gu, " ")
    .replace(/&#x27;/gu, "'")
    .replace(/&quot;/gu, '"')
    .replace(/&amp;/gu, "&")
    .replace(/[ \t\n]+/gu, " ");
}

/** The markup of each sex's variants (`data-l="male"` is the boys', `"female"` the girls'). */
function byList(markup: string): { male: string[]; female: string[] } {
  const out = { male: [] as string[], female: [] as string[] };
  let side: "male" | "female" | null = null;
  let depth = 0;
  let start = 0;
  for (const m of markup.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/gu)) {
    const [whole, close, name, attrs, self] = m;
    const at = m.index;
    const empty = self === "/" || /^(?:input|br|img|hr|meta|link)$/iu.test(name ?? "");
    if (side === null) {
      const found = close === "" && !empty ? /\sdata-l="(male|female)"/u.exec(attrs ?? "") : null;
      if (found !== null) {
        side = found[1] as "male" | "female";
        depth = 1;
        start = at;
      }
      continue;
    }
    if (empty) continue;
    depth += close === "/" ? -1 : 1;
    if (depth === 0) {
      out[side].push(markup.slice(start, at + whole.length));
      side = null;
    }
  }
  return out;
}

/** TASK-178, ADR-0051: Part II of the Atlas page. */
describe("GivenNameAtlas", () => {
  it("renders nothing without facts", () => {
    expect(render(null, "pl")).toBe("");
  });

  it("renders the six plates in order, each for both sexes, with its own radio group", () => {
    for (const lang of LANGS) {
      const t = UI[lang];
      const html = render(facts, lang);
      const ids = [...html.matchAll(/<article id="(gn-p\d\d)"/gu)].map((m) => m[1]);
      expect(ids).toEqual(GIVEN_NAME_PLATES.map(([id]) => id));
      expect(html).toContain('<h2 id="gn-title" class="lf-title">');
      expect(html).toContain(t.gnTitle);
      expect(html).toMatch(/<input type="radio" name="gn-list" checked="" value="male"\/>/u);
      expect(html).toMatch(/<input type="radio" name="gn-list" value="female"\/>/u);
      expect(html).toContain(t.gnSwitchBoys);
      expect(html).toContain(t.gnSwitchGirls);
      for (const plate of html.match(/<article id="gn-p\d\d"[\s\S]*?<\/article>/gu) ?? []) {
        const parts = byList(plate);
        expect(parts.male.length).toBeGreaterThan(0);
        expect(parts.female.length).toBe(parts.male.length);
      }
    }
  });

  it("keeps each sex's figures in its own variant and never sums the two", () => {
    for (const lang of LANGS) {
      const parts = byList(render(facts, lang));
      const boys = text(parts.male.join(" "));
      const girls = text(parts.female.join(" "));
      const b = facts.sexes.male;
      const g = facts.sexes.female;
      const lastB = b.years[b.years.length - 1]!;
      const lastG = g.years[g.years.length - 1]!;
      expect(boys).toContain(formatInteger(lastB.names, lang));
      expect(boys).toContain(formatInteger(lastB.children, lang));
      expect(boys).toContain(lastB.top.published);
      expect(boys).toContain(formatShare(lastB.top10_share, lang));
      expect(girls).toContain(formatInteger(lastG.names, lang));
      expect(girls).toContain(lastG.top.published);
      expect(girls).toContain(formatShare(lastG.top10_share, lang));
      expect(boys).toContain(formatInteger(b.change.on_last_not_first, lang));
      expect(girls).toContain(formatInteger(g.change.on_last_not_first, lang));
      const all = text(render(facts, lang));
      expect(all).not.toContain(formatInteger(lastB.names + lastG.names, lang));
      expect(all).not.toContain(formatInteger(lastB.children + lastG.children, lang));
      if (lang === "pl") {
        expect(boys).toContain("chłopc");
        expect(boys).not.toMatch(/dziewczyn/u);
        expect(girls).toContain("dziewczyn");
        expect(girls).not.toMatch(/chłopc/u);
      }
    }
  });

  it("names a first name only as the artefact's selections: the number ones and the tens", () => {
    const allowed = new Set<string>();
    for (const sex of [facts.sexes.male, facts.sexes.female]) {
      for (const year of sex.years) allowed.add(year.top.published);
      for (const name of [...sex.top_first, ...sex.top_last]) allowed.add(name.published);
      for (const name of sex.always_top10) allowed.add(name);
    }
    const html = render(facts, "pl");
    const words = text(html).match(/(?<!\p{L})\p{Lu}{3,}(?!\p{L})/gu) ?? [];
    for (const word of words) {
      if (["PESEL", "NAME", "ATLAS"].includes(word)) continue;
      expect(allowed.has(word), word).toBe(true);
    }
  });

  it("says the threshold change and dims the bars before it, and hides every drawing", () => {
    const html = render(facts, "pl");
    expect(html).toContain('class="gn-break"');
    expect(text(html)).toContain("od 2013 r. próg publikacji: 2 (wcześniej 5)");
    expect(html.match(/class="gn-bar" data-dim=""/gu)?.length).toBe(2 * 13);
    for (const tag of html.match(/<svg[^>]*>/gu) ?? []) expect(tag).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/[{}]|undefined|\bnull\b|NaN|Infinity|\*\*/u);
  });

  it("dates and sources every plate by the lists it reads", () => {
    for (const lang of LANGS) {
      const html = render(facts, lang);
      const sources = html.match(/<p class="lf-source">/gu) ?? [];
      expect(sources).toHaveLength(GIVEN_NAME_PLATES.length);
      expect(html).toContain(`href="${facts.source_page_url}"`);
      expect(text(html)).toContain(facts.pipeline_version);
    }
  });
});
