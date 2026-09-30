import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { listFactsArtefactSchema, NAMED_SURNAME_FLOOR } from "@name-atlas/contracts";
import type { ListFacts, ListFactsArtefact, NamedSurname } from "@name-atlas/contracts";
import { listFacts } from "@name-atlas/truth";
import { isOneInFour, ListAtlas } from "./list-atlas.js";
import { LIST_FACTS_FIXTURE } from "./list-atlas.fixture.js";
import { loadListFacts } from "./list-atlas-load.js";
import { reachedAtHydration } from "./list-atlas-shell.js";
import { formatDate, formatInteger, formatQuantile, formatShare, UI } from "./messages.js";
import type { Lang } from "./messages.js";

const LANGS = ["pl", "en"] as const;
type Side = "male" | "female";

const render = (facts: ListFactsArtefact | null, lang: Lang) =>
  renderToStaticMarkup(createElement(ListAtlas, { facts, lang }));

/** The text a reader sees: tags out, entities decoded, whitespace collapsed (not U+00A0). */
function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/gu, " ")
    .replace(/&#x27;/gu, "'")
    .replace(/&quot;/gu, '"')
    .replace(/&amp;/gu, "&")
    .replace(/[ \t\n]+/gu, " ");
}

/** Everything a reader or a screen reader gets: visible text plus every aria-label. */
function readable(markup: string): string {
  const labels = [...markup.matchAll(/aria-label="([^"]*)"/gu)].map((m) => m[1] ?? "");
  return `${text(markup)} ${labels.join(" ")}`;
}

/**
 * The markup of each list's variants (`data-l="male"` / `"female"`) and the
 * markup outside any variant, found by walking the tags with a depth count.
 */
function byList(markup: string): { male: string[]; female: string[]; shared: string } {
  const out = { male: [] as string[], female: [] as string[], shared: "" };
  let side: Side | null = null;
  let depth = 0;
  let start = 0;
  let last = 0;
  for (const m of markup.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/gu)) {
    const [whole, close, name, attrs, self] = m;
    const at = m.index;
    const empty = self === "/" || /^(?:input|br|img|hr|meta|link)$/iu.test(name ?? "");
    if (side === null) {
      const found = close === "" && !empty ? /\sdata-l="(male|female)"/u.exec(attrs ?? "") : null;
      if (found !== null) {
        out.shared += markup.slice(last, at);
        side = found[1] as Side;
        depth = 1;
        start = at;
      }
      continue;
    }
    if (empty) continue;
    depth += close === "/" ? -1 : 1;
    if (depth === 0) {
      const end = at + whole.length;
      out[side].push(markup.slice(start, end));
      side = null;
      last = end;
    }
  }
  out.shared += markup.slice(last);
  return out;
}

/** Method versions (`list_bands@1`) carry digits that are not figures. */
function withoutMethods(value: string): string {
  return value.replace(/\b[a-z_0-9]+@\d+/gu, " ");
}

/** Every number printed in a piece of text: grouped, with its decimal part and per cent sign. */
function numbersIn(value: string, lang: Lang): string[] {
  const pattern =
    lang === "pl" ? /\d+(?:\u00a0\d{3})*(?:,\d+)?%?/gu : /\d+(?:,\d{3})*(?:\.\d+)?%?/gu;
  return withoutMethods(value).match(pattern) ?? [];
}

/** Every number in a subtree of the artefact, with its path. */
function numbersOf(value: unknown, at = ""): { path: string; value: number }[] {
  if (typeof value === "number") return [{ path: at, value }];
  if (Array.isArray(value))
    return value.flatMap((item, i) => numbersOf(item, `${at}[${String(i)}]`));
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => numbersOf(item, `${at}.${key}`));
  }
  return [];
}

/** How a stored value may be printed: an integer grouped, a share or a quantile. */
function printed(value: number, lang: Lang): string[] {
  if (Number.isInteger(value)) return [formatInteger(value, lang)];
  if (value >= 0 && value <= 1) return [formatShare(value, lang), formatQuantile(value, lang)];
  return [];
}

/** The sections of a list that the plates print: all but `dots`, `collision` and `crowd`. */
function printedSections(list: ListFacts): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(list).filter(([key]) => !["dots", "collision", "crowd"].includes(key)),
  );
}

function allowed(subtrees: readonly unknown[], lang: Lang): Set<string> {
  const out = new Set<string>();
  for (const tree of subtrees) {
    for (const { value } of numbersOf(tree)) for (const form of printed(value, lang)) out.add(form);
  }
  return out;
}

/** The snapshot date's own numbers: the day and the year. */
function dateNumbers(facts: ListFactsArtefact, lang: Lang): string[] {
  return formatDate(facts.snapshot_date, lang).match(/\d+/gu) ?? [];
}

/** Every named selection of the artefact, as `[published, count]`. */
function selections(facts: ListFactsArtefact): [string, number][] {
  const named: [string, number][] = [];
  const add = (s: Omit<NamedSurname, "key"> | null) => {
    if (s !== null) named.push([s.published, s.count]);
  };
  for (const list of [facts.lists.male, facts.lists.female]) {
    list.named_top.items.forEach(add);
    add(list.hyphenated.top);
  }
  if (facts.overlap.on_both_top !== null) {
    add(facts.overlap.on_both_top.male);
    add(facts.overlap.on_both_top.female);
  }
  add(facts.overlap.one_list_top.male);
  add(facts.overlap.one_list_top.female);
  return named;
}

/** Words in capitals: a surname as published. PESEL and plate numerals are not names. */
function capitalWords(value: string): string[] {
  return (value.match(/\p{Lu}[\p{Lu}-]*\p{Lu}/gu) ?? []).filter(
    (word) => word !== "PESEL" && !/^[IVX]+$/u.test(word),
  );
}

const FORBIDDEN = [
  "lives in",
  "comes from",
  "originat",
  "is found in",
  "mieszka",
  "pochodzi",
  "urodzon",
  "polaków",
  "w polsce",
  "of poles",
  "in poland",
  "narodow",
  "nationality",
] as const;

const { male: M, female: F } = LIST_FACTS_FIXTURE.lists;
const REAL = listFacts();
const ARTEFACTS = [
  ["the synthetic fixture", LIST_FACTS_FIXTURE],
  ["the committed artefact", REAL],
] as const;

describe("the synthetic fixture", () => {
  it("is a valid list_facts@2 artefact, so the view is tested against the contract's own shape", () => {
    expect(listFactsArtefactSchema.safeParse(LIST_FACTS_FIXTURE).success).toBe(true);
    // Both wordings of plate IV's headline are exercised.
    expect(isOneInFour(M.endings.entries[0]!.share_of_people)).toBe(true);
    expect(isOneInFour(F.endings.entries[0]!.share_of_people)).toBe(false);
  });
});

describe("ListAtlas", () => {
  it("renders nothing when there are no facts", () => {
    expect(render(null, "pl")).toBe("");
    expect(render(null, "en")).toBe("");
  });

  it("renders the six plates in order, then the coda, headed with the snapshot date", () => {
    for (const lang of LANGS) {
      const t = UI[lang];
      const html = render(LIST_FACTS_FIXTURE, lang);
      expect(html.match(/<article /gu)).toHaveLength(6);
      const ids = [...html.matchAll(/<article id="(lf-p\d)"/gu)].map((m) => m[1]);
      expect(ids).toEqual(["lf-p1", "lf-p2", "lf-p3", "lf-p4", "lf-p5", "lf-p6"]);
      const names = [t.lfP1Name, t.lfP2Name, t.lfP3Name, t.lfP4Name, t.lfP5Name, t.lfP6Name];
      const numerals = ["I", "II", "III", "IV", "V", "VI"];
      const heads = [...html.matchAll(/<p class="lf-plate-no">([\s\S]*?)<\/p>/gu)].map((m) =>
        text(m[1] ?? "").trim(),
      );
      expect(heads).toEqual(names.map((name, i) => `${t.lfPlate} ${numerals[i]!} · ${name}`));
      expect(html).toContain('<h2 id="lf-title" class="lf-title">');
      expect(html.indexOf("lf-coda")).toBeGreaterThan(html.lastIndexOf("<article "));
      expect(text(html)).toContain(lang === "pl" ? "wydanie 2026" : "2026 edition");
      // The date's own "r." is never followed by a second full stop.
      expect(text(html)).not.toMatch(/\.\s*\./u);
      expect(text(html)).toContain(
        lang === "pl"
          ? "Stan\u00a0na\u00a020\u00a0stycznia 2026\u00a0r."
          : "As\u00a0of\u00a020\u00a0January 2026.",
      );
    }
  });

  it("renders every plate for both lists, each variant naming its own list", () => {
    const html = render(LIST_FACTS_FIXTURE, "pl");
    const plates = [...html.matchAll(/<article id="lf-p\d"[\s\S]*?<\/article>/gu)].map((m) => m[0]);
    expect(plates).toHaveLength(6);
    for (const plate of plates) {
      const parts = byList(plate);
      expect(parts.male.length).toBeGreaterThan(0);
      expect(parts.female.length).toBe(parts.male.length);
    }
    const parts = byList(html);
    const male = text(parts.male.join(" "));
    const female = text(parts.female.join(" "));
    expect(male).toContain("mężczyzn");
    expect(male).not.toMatch(/kobiet/u);
    expect(female).toContain("kobiet");
    expect(female).not.toMatch(/mężczy/u);
  });

  it("prints each plate's own figures for each list", () => {
    for (const lang of LANGS) {
      const parts = byList(render(LIST_FACTS_FIXTURE, lang));
      for (const [side, list] of [
        ["male", M],
        ["female", F],
      ] as const) {
        const shown = numbersIn(text(parts[side].join(" ")), lang);
        const half = list.concentration.levels.find((level) => level.q === 0.5)!;
        const top = list.initials.letters.find((entry) => entry.letter === list.initials.top)!;
        const rare = list.initials.letters.find((e) => e.letter === list.initials.rarest_polish)!;
        const figures = [
          formatInteger(list.summary.surnames, lang),
          formatInteger(list.summary.people, lang),
          formatInteger(half.surnames, lang),
          formatInteger(list.concentration.beyond_half, lang),
          formatInteger(list.bands.under_10, lang),
          formatInteger(list.bands.ranges[0]!.surnames, lang),
          formatInteger(list.summary.median_count_per_surname, lang),
          formatShare(list.endings.entries[0]!.share_of_people, lang),
          formatInteger(list.endings.entries[0]!.people, lang),
          formatInteger("absent" in top ? 0 : top.people, lang),
          formatInteger("absent" in rare ? 0 : rare.people, lang),
          formatInteger(list.initials.outside.surnames, lang),
          formatInteger(list.hyphenated.surnames, lang),
          formatInteger(list.hyphenated.people, lang),
          formatInteger(list.hyphenated.top!.count, lang),
          ...list.named_top.items.map((item) => formatInteger(item.count, lang)),
          ...list.bands.ranges.flatMap((band) => [
            formatInteger(band.surnames, lang),
            formatInteger(band.people, lang),
          ]),
          ...list.endings.entries.map((e) => formatShare(e.share_of_people, lang)),
        ];
        for (const figure of figures) expect(shown, `${lang} ${side} ${figure}`).toContain(figure);
      }
      const shared = numbersIn(text(parts.shared), lang);
      const o = LIST_FACTS_FIXTURE.overlap;
      for (const n of [
        o.male_only,
        o.both,
        o.female_only,
        o.on_both_top!.male.count,
        o.on_both_top!.female.count,
        o.one_list_top.male!.count,
        o.one_list_top.female!.count,
      ]) {
        expect(shared, `${lang} ${String(n)}`).toContain(formatInteger(n, lang));
      }
    }
  });

  it("writes plate IV's headline from the stored share: 'one in four' only in [0.24, 0.26)", () => {
    expect([0.2399, 0.24, 0.2512, 0.2599, 0.26].map(isOneInFour)).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
    const title = (lang: Lang) => {
      const plate = /<article id="lf-p4"[\s\S]*?<\/h3>/u.exec(render(LIST_FACTS_FIXTURE, lang))![0];
      const parts = byList(plate);
      return { male: text(parts.male.join(" ")), female: text(parts.female.join(" ")) };
    };
    expect(title("pl").male).toContain("Co czwarty mężczyzna nosi nazwisko na\u00a0 -ski");
    expect(title("pl").female).toContain("27,3% kobiet nosi nazwisko na\u00a0 -ska");
    expect(title("pl").female).not.toContain("Co czwarta");
    expect(title("en").male).toContain("One man in four has a surname ending in\u00a0 -ski");
    expect(title("en").female).toContain("27.3% of women on the list have a surname ending in");
  });

  it("states an absent letter as absent, never as a count of zero", () => {
    const html = render(LIST_FACTS_FIXTURE, "pl");
    const parts = byList(html);
    const cell = (markup: string, letter: string) =>
      new RegExp(
        `<li class="lf-abc-cell"[^>]*><span class="lf-abc-g">${letter}</span>[\\s\\S]*?</li>`,
        "u",
      ).exec(markup)?.[0] ?? "";
    for (const side of ["male", "female"] as const) {
      const all = parts[side].join(" ");
      for (const letter of ["Ą", "Ę", "Ń"]) {
        const markup = cell(all, letter);
        expect(markup, `${side} ${letter}`).toContain("data-absent");
        expect(text(markup)).toContain("—");
        expect(numbersIn(text(markup), "pl")).toEqual([]);
      }
      expect(text(all)).toContain("Ą, Ę, Ń — brak.");
      expect(text(all)).toContain("To brak, nie zero.");
    }
    // X is absent on the female list only; it is not a Polish letter, so it is
    // drawn as absent but left out of the Polish letters' note.
    expect(cell(parts.female.join(" "), "X")).toContain("data-absent");
    expect(cell(parts.male.join(" "), "X")).not.toContain("data-absent");
    expect(text(parts.female.join(" "))).not.toMatch(/X — brak\./u);
    expect(text(parts.male.join(" "))).toContain(
      "Najrzadsza litera polskiego alfabetu, od której zaczyna się nazwisko na liście mężczyzn.",
    );
  });

  it("server-renders a working radio switch with both lists, so nothing depends on JavaScript", () => {
    const html = render(LIST_FACTS_FIXTURE, "pl");
    expect(html).not.toMatch(/\shidden(?:=|\s|>)/u);
    expect(html).not.toContain("aria-pressed");
    expect(html).toContain('<div class="lf-switchbar"><fieldset class="lf-switch">');
    expect(html).toContain(`<legend class="lf-sr">${UI.pl.lfSwitchLabel}</legend>`);
    expect(html).toMatch(/<input type="radio" name="lf-list" checked="" value="male"\/>/u);
    expect(html).toMatch(/<input type="radio" name="lf-list" value="female"\/>/u);
    expect(html.match(/type="radio"/gu)).toHaveLength(2);
    expect(html.match(/data-l="male"/gu)?.length).toBe(html.match(/data-l="female"/gu)?.length);
  });

  it("hides every drawing from assistive technology; its figures are text beside it", () => {
    const html = render(LIST_FACTS_FIXTURE, "pl");
    for (const tag of html.match(/<(?:svg|canvas)[^>]*>/gu) ?? []) {
      expect(tag).toContain('aria-hidden="true"');
    }
    // One canvas per list, in the list's variant, so the switch runs no script.
    expect(html.match(/<canvas /gu)).toHaveLength(2);
    expect(html).toMatch(/<div data-l="male"><canvas class="lf-sky" aria-hidden="true">/u);
    expect(html).toMatch(/<div data-l="female"><canvas class="lf-sky" aria-hidden="true">/u);
    expect(html).toContain('<canvas class="lf-sky" aria-hidden="true">');
  });

  it("fills every template: no stray brace, undefined, null or NaN reaches the page", () => {
    for (const [, facts] of ARTEFACTS) {
      for (const lang of LANGS) {
        const all = readable(render(facts, lang));
        expect(all).not.toMatch(/[{}]|undefined|\bnull\b|NaN|Infinity|\*\*/u);
      }
    }
  });
});

describe("the atlas derives nothing (TASK-043 AC-04)", () => {
  for (const [name, facts] of ARTEFACTS) {
    it(`prints only stored values, each list's in its own variant: ${name}`, () => {
      const { male, female } = facts.lists;
      for (const lang of LANGS) {
        const parts = byList(render(facts, lang));
        const date = dateNumbers(facts, lang);
        // The sections no plate prints are left out, so a computed figure
        // cannot pass by matching one of their many values.
        const own = (list: ListFacts) =>
          new Set([...allowed([printedSections(list), facts.overlap], lang), ...date]);
        for (const [side, list] of [
          ["male", male],
          ["female", female],
        ] as const) {
          const ok = own(list);
          for (const n of numbersIn(text(parts[side].join(" ")), lang)) {
            expect(ok.has(n), `${lang} ${side}: ${n}`).toBe(true);
          }
        }
        const any = new Set([...allowed([male, female, facts.overlap], lang), ...date]);
        for (const n of numbersIn(readable(parts.shared), lang)) {
          expect(any.has(n), `${lang} shared: ${n}`).toBe(true);
        }
      }
    });

    it(`never prints a sum of the two lists: ${name}`, () => {
      const { male, female } = facts.lists;
      const o = facts.overlap;
      const f = new Map(numbersOf(female).map((entry) => [entry.path, entry.value]));
      const sums = numbersOf(male)
        .filter((entry) => Number.isInteger(entry.value) && entry.value >= 20)
        .map((entry) => [entry.value, f.get(entry.path)] as const)
        .filter((pair): pair is readonly [number, number] => pair[1] !== undefined && pair[1] >= 20)
        .map(([a, b]) => a + b);
      sums.push(o.male_only + o.both + o.female_only);
      if (o.on_both_top !== null) sums.push(o.on_both_top.male.count + o.on_both_top.female.count);
      for (const lang of LANGS) {
        const legit = allowed([male, female, o], lang);
        const shown = new Set(numbersIn(readable(render(facts, lang)), lang));
        for (const sum of sums) {
          const form = formatInteger(sum, lang);
          // A sum that happens to equal a stored figure is that figure.
          if (legit.has(form)) continue;
          expect(shown.has(form), `${lang}: ${form}`).toBe(false);
        }
      }
    });

    it(`names a surname only as a selection at or above the floor, never as a link: ${name}`, () => {
      const named = new Map(selections(facts));
      for (const lang of LANGS) {
        const html = render(facts, lang);
        const words = capitalWords(readable(html));
        expect(words.length).toBeGreaterThan(0);
        for (const word of words) {
          expect(named.has(word), `${lang}: ${word}`).toBe(true);
          expect(named.get(word)!).toBeGreaterThanOrEqual(NAMED_SURNAME_FLOOR);
        }
        for (const [published] of named) expect(html).toContain(published);
        for (const [, inside] of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gu)) {
          expect(capitalWords(text(inside ?? ""))).toEqual([]);
        }
      }
    });

    it(`never says where anyone lives, comes from, or that a figure is about Poles: ${name}`, () => {
      for (const lang of LANGS) {
        const all = readable(render(facts, lang)).toLowerCase();
        for (const wrong of FORBIDDEN) expect(all, `${lang}: ${wrong}`).not.toContain(wrong);
      }
    });
  }

  it("names no surname when no selection reaches the floor", () => {
    const empty = (list: ListFacts): ListFacts => ({
      ...list,
      named_top: { ...list.named_top, items: [] },
      hyphenated: { ...list.hyphenated, top: null },
    });
    const bare: ListFactsArtefact = {
      ...LIST_FACTS_FIXTURE,
      lists: { male: empty(M), female: empty(F) },
      overlap: {
        ...LIST_FACTS_FIXTURE.overlap,
        on_both_top: null,
        one_list_top: { male: null, female: null },
      },
    };
    expect(listFactsArtefactSchema.safeParse(bare).success).toBe(true);
    for (const lang of LANGS) {
      const all = readable(render(bare, lang));
      expect(capitalWords(all)).toEqual([]);
      expect(all).not.toMatch(/\bnull\b|undefined/u);
      expect(all).toContain(lang === "pl" ? UI.pl.lfP6HyphenNoneMale : UI.en.lfP6HyphenNoneFemale);
      expect(all).toContain(UI[lang].lfP6Why);
    }
  });
});

describe("the atlas stylesheet", () => {
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const CSS = readFileSync(path.join(SRC, "app", "globals.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//gu,
    "",
  );
  /** Innermost rules: selector and declarations, whatever at-rule they sit in. */
  const rulesOf = (css: string) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)].map((m) => ({
      selector: (m[1] ?? "").trim().replace(/\s+/gu, " "),
      body: m[2] ?? "",
    }));
  const rules = rulesOf(CSS);

  /** The stylesheet without its `prefers-reduced-motion: no-preference` blocks. */
  function withoutMotionBlocks(css: string): string {
    const marker = "@media (prefers-reduced-motion: no-preference)";
    let out = css;
    for (let at = out.indexOf(marker); at !== -1; at = out.indexOf(marker)) {
      let depth = 0;
      let end = out.indexOf("{", at);
      for (; end < out.length; end++) {
        if (out[end] === "{") depth++;
        else if (out[end] === "}" && --depth === 0) break;
      }
      out = out.slice(0, at) + out.slice(end + 1);
    }
    return out;
  }

  it("stacks a list's two variants in one grid cell, so flipping lists moves nothing", () => {
    expect(rules.some((r) => r.selector === ".lf-alt" && /display: grid;/u.test(r.body))).toBe(
      true,
    );
    expect(
      rules.some((r) => r.selector === ".lf-alt > [data-l]" && /grid-area: 1 \/ 1;/u.test(r.body)),
    ).toBe(true);
  });

  it("hides the list not chosen with visibility, never by taking it out of the layout", () => {
    const listRules = rules.filter((r) => /\[data-l="(?:male|female)"\]/u.test(r.selector));
    expect(listRules.length).toBeGreaterThanOrEqual(2);
    for (const r of listRules) expect(r.body, r.selector).not.toMatch(/display:\s*none/u);
    const hidden = listRules.filter((r) => /visibility: hidden;/u.test(r.body));
    expect(hidden.map((r) => r.selector).join(" ")).toMatch(/\.lf \[data-l="female"\]/u);
    expect(hidden.map((r) => r.selector).join(" ")).toMatch(/:checked\) \[data-l="male"\]/u);
  });

  it("moves the atlas only without a reduced-motion preference", () => {
    const still = rulesOf(withoutMotionBlocks(CSS)).filter((r) => /\.lf/u.test(r.selector));
    for (const r of still) {
      expect(r.body, r.selector).not.toMatch(/\b(?:animation|transition)(?:-[a-z]+)?\s*:/u);
    }
    expect(CSS).toMatch(/\.lf\[data-motion\] \.lf-rv \{\s*animation:/u);
  });

  it("keeps every atlas target at least 44px tall", () => {
    const label = rules.find((r) => r.selector === ".lf-switch label");
    expect(label?.body).toMatch(/min-height: 44px;/u);
    const link = rules.find((r) => r.selector === ".lf-source a");
    expect(link?.body).toMatch(/padding-block: 15px;/u);
  });
});

describe("reachedAtHydration", () => {
  it("counts a block on screen or scrolled past as reached; only a block below is left to play", () => {
    expect(reachedAtHydration({ top: 120 }, 800)).toBe(true);
    expect(reachedAtHydration({ top: -6000 }, 800)).toBe(true);
    expect(reachedAtHydration({ top: 799.5 }, 800)).toBe(true);
    expect(reachedAtHydration({ top: 800 }, 800)).toBe(false);
    expect(reachedAtHydration({ top: 2400 }, 800)).toBe(false);
  });
});

describe("loadListFacts (TASK-043 AC-06)", () => {
  it("returns the facts it reads", () => {
    expect(loadListFacts(() => LIST_FACTS_FIXTURE)).toBe(LIST_FACTS_FIXTURE);
  });

  it("fails soft: a throwing reader costs the section, never the page", () => {
    const facts = loadListFacts(() => {
      throw new Error("the committed list-facts artefact does not satisfy its contract");
    });
    expect(facts).toBeNull();
    expect(render(facts, "pl")).toBe("");
  });
});
