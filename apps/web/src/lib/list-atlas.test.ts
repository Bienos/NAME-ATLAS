import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { listFactsArtefactSchema } from "@name-atlas/contracts";
import type { ListFacts, ListFactsArtefact } from "@name-atlas/contracts";
import { listFacts } from "@name-atlas/truth";
import { ListAtlas } from "./list-atlas.js";
import { LIST_FACTS_FIXTURE } from "./list-atlas.fixture.js";
import { LABEL_TIERS_EM } from "./list-atlas-geometry.js";
import { loadListFacts } from "./list-atlas-load.js";
import { reachedAtHydration } from "./list-atlas-shell.js";
import {
  formatChance,
  formatDecimal,
  formatInteger,
  formatPercent,
  formatQuantile,
  UI,
} from "./messages.js";
import type { Lang } from "./messages.js";

const LANGS = ["pl", "en"] as const;

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

/** The fact card of each plate, as text. */
function factCards(markup: string): string[] {
  return [...markup.matchAll(/<p class="lf-fact">([\s\S]*?)<\/p>/gu)].map((m) => text(m[1] ?? ""));
}

/** The two variants of a plate's headline, by list, as text. */
function headlineVariants(markup: string, plate: string): { male: string; female: string } {
  const heading = new RegExp(`<h3 id="${plate}-title"[^>]*>([\\s\\S]*?)</h3>`, "u").exec(markup);
  const inner = heading?.[1] ?? "";
  const variant = (side: string) =>
    text(
      new RegExp(`<span data-v="${side}">([\\s\\S]*?)</span>(?=<span data-v=|$)`, "u").exec(
        inner,
      )?.[1] ?? "",
    );
  return { male: variant("male"), female: variant("female") };
}

/** Every number in a piece of text, as printed (grouped, with its decimal part). */
function numbersIn(value: string): string[] {
  return value.match(/\d+(?:[\u00a0,]\d{3})*(?:[.,]\d+)?/gu) ?? [];
}

/** `needle` as a whole number in `haystack`: not part of a longer figure. */
function containsNumber(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?<![\\d\\u00a0.,])${escaped}(?![\\d]|[.,\\u00a0]\\d)`, "u").test(haystack);
}

const { male: M, female: F } = LIST_FACTS_FIXTURE.lists;

describe("the synthetic fixture", () => {
  it("is a valid artefact, so the view is tested against the contract's own shape", () => {
    expect(listFactsArtefactSchema.safeParse(LIST_FACTS_FIXTURE).success).toBe(true);
  });
});

describe("ListAtlas", () => {
  it("renders nothing when there are no facts", () => {
    expect(render(null, "pl")).toBe("");
    expect(render(null, "en")).toBe("");
  });

  it("renders the three plates, headed in order, with the snapshot date", () => {
    const html = render(LIST_FACTS_FIXTURE, "pl");
    expect(html.match(/<article /gu)).toHaveLength(3);
    expect(html).toContain('<h2 id="lf-title"');
    expect(html.match(/<h3 /gu)).toHaveLength(3);
    for (const plate of [UI.pl.lfP1No, UI.pl.lfP2No, UI.pl.lfP3No]) expect(html).toContain(plate);
    expect(text(html)).toContain("Stan\u00a0na\u00a020\u00a0stycznia 2026\u00a0r.");
    expect(text(html)).not.toContain("r..");
    expect(text(render(LIST_FACTS_FIXTURE, "en"))).toContain(
      "As\u00a0of\u00a020\u00a0January 2026.",
    );
  });

  it("renders every plate I figure from the artefact, for both lists", () => {
    for (const lang of LANGS) {
      const all = readable(render(LIST_FACTS_FIXTURE, lang));
      for (const list of [M, F]) {
        const s = list.summary;
        for (const n of [
          s.people,
          s.surnames,
          s.max_count,
          s.median_count_per_surname,
          s.median_count_per_person,
          ...s.thresholds
            .filter((t) => t.at_least > s.min_count)
            .flatMap((t) => [t.surnames, t.people]),
          ...s.surname_quantiles.map((q) => q.count),
          ...s.person_quantiles.map((q) => q.count),
        ]) {
          expect(containsNumber(all, formatInteger(n, lang)), `${lang} ${String(n)}`).toBe(true);
        }
      }
    }
  });

  it("renders every plate II figure, probabilities near one half to two decimals", () => {
    for (const lang of LANGS) {
      const all = readable(render(LIST_FACTS_FIXTURE, lang));
      for (const list of [M, F]) {
        const c = list.collision;
        const [a, b] = c.example_rooms.showcase_pair;
        for (const figure of [
          formatInteger(c.n_half, lang),
          formatInteger(c.pair_one_in, lang),
          formatInteger(a, lang),
          formatInteger(b, lang),
          formatInteger(c.example_rooms.first_pair_at.length, lang),
          formatChance(c.p_at_n_half, lang),
          formatChance(c.p_before_n_half, lang),
          formatChance(c.curve.find((p) => p.n === 23)!.p, lang),
        ]) {
          expect(all, `${lang} ${figure}`).toContain(figure);
        }
      }
      expect(all).toContain(formatChance(LIST_FACTS_FIXTURE.birthday_reference.p_at_n_half, lang));
      // Two decimals near one half: the two sides of n_half never both read "50%".
      expect(formatChance(M.collision.p_at_n_half, lang)).toMatch(/^50[.,]\d\d%$/u);
    }
  });

  it("renders every plate III figure: averages, the example draw and the reach lanes", () => {
    for (const lang of LANGS) {
      const all = readable(render(LIST_FACTS_FIXTURE, lang));
      for (const list of [M, F]) {
        const w = list.crowd;
        const at1000 = w.expected_distinct.find((e) => e.n === w.crowd_size)!;
        for (const figure of [
          formatDecimal(at1000.value, 1, lang),
          formatDecimal(at1000.value, 0, lang),
          formatPercent(w.share_without_namesake, lang),
          formatInteger(w.example.distinct, lang),
          formatInteger(w.example.without_namesake, lang),
          ...w.expected_distinct.map((e) => formatDecimal(e.value, 0, lang)),
          ...w.reach_half.flatMap((r) => [
            formatInteger(r.n_half, lang),
            formatChance(r.p_at_n_half, lang),
          ]),
        ]) {
          expect(all, `${lang} ${figure}`).toContain(figure);
        }
      }
      // A share under one per cent keeps two decimals: 0,43%, not 0,4%.
      expect(all).toContain(formatPercent(0.0043, lang, 2));
    }
  });

  it("names both lists, with their own figures, in every fact card", () => {
    for (const lang of LANGS) {
      const cards = factCards(render(LIST_FACTS_FIXTURE, lang));
      expect(cards).toHaveLength(3);
      const [one, two, three] = cards as [string, string, string];
      const men = lang === "pl" ? /mężczyzn/u : /\bmale\b|\bmen\b/u;
      const women = lang === "pl" ? /kobiet/u : /\bfemale\b|\bwomen\b/u;
      for (const card of cards) {
        expect(card).toMatch(men);
        expect(card).toMatch(women);
      }
      const pairs: [string, (l: ListFacts) => string][] = [
        [one, (l) => formatInteger(l.summary.median_count_per_person, lang)],
        [one, (l) => formatInteger(l.summary.people, lang)],
        [one, (l) => formatInteger(l.summary.max_count, lang)],
        [two, (l) => formatInteger(l.collision.n_half, lang)],
        [two, (l) => formatInteger(l.collision.pair_one_in, lang)],
        [two, (l) => formatChance(l.collision.p_at_n_half, lang)],
        [three, (l) => formatDecimal(l.crowd.expected_distinct[1]!.value, 1, lang)],
        [three, (l) => formatPercent(l.crowd.share_without_namesake, lang)],
        [three, (l) => formatInteger(l.crowd.reach_half[0]!.n_half, lang)],
      ];
      for (const [card, figure] of pairs) {
        expect(card).toContain(figure(M));
        expect(card).toContain(figure(F));
      }
    }
  });

  it("never renders a sum of the two lists", () => {
    // Every list-specific figure, paired across the lists. Figures under 20 are
    // skipped: their sums are small numbers that honestly occur as ticks.
    const figures: ((l: ListFacts) => number)[] = [
      (l) => l.summary.people,
      (l) => l.summary.surnames,
      (l) => l.summary.max_count,
      (l) => l.summary.median_count_per_person,
      ...[0, 1, 2, 3, 4, 5].flatMap((i) => [
        (l: ListFacts) => l.summary.thresholds[i]!.surnames,
        (l: ListFacts) => l.summary.thresholds[i]!.people,
      ]),
      ...[0, 1, 2, 3].flatMap((i) => [
        (l: ListFacts) => l.summary.surname_quantiles[i]!.count,
        (l: ListFacts) => l.summary.person_quantiles[i]!.count,
      ]),
      (l) => l.collision.n_half,
      (l) => l.collision.pair_one_in,
      (l) => l.collision.example_rooms.showcase_pair[1],
      (l) => l.crowd.example.distinct,
      (l) => l.crowd.example.without_namesake,
      (l) => l.crowd.reach_half[0]!.n_half,
      (l) => l.crowd.reach_half[1]!.n_half,
    ];
    const decimals: ((l: ListFacts) => number)[] = [0, 1, 2, 3, 4].map(
      (i) => (l: ListFacts) => l.crowd.expected_distinct[i]!.value,
    );
    for (const lang of LANGS) {
      const all = readable(render(LIST_FACTS_FIXTURE, lang));
      for (const figure of figures) {
        const sum = figure(M) + figure(F);
        if (figure(M) < 20 || figure(F) < 20) continue;
        expect(containsNumber(all, formatInteger(sum, lang)), `${lang} sum ${String(sum)}`).toBe(
          false,
        );
      }
      for (const figure of decimals) {
        const sum = figure(M) + figure(F);
        for (const digits of [0, 1]) {
          expect(containsNumber(all, formatDecimal(sum, digits, lang))).toBe(false);
        }
      }
      for (const share of [
        M.crowd.share_without_namesake + F.crowd.share_without_namesake,
        M.collision.p_at_n_half + F.collision.p_at_n_half,
      ]) {
        expect(all).not.toContain(formatPercent(share, lang));
      }
    }
  });

  it("never says where anyone lives, comes from, or that a figure is about Poles", () => {
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
    for (const lang of LANGS) {
      const all = readable(render(LIST_FACTS_FIXTURE, lang)).toLowerCase();
      for (const wrong of FORBIDDEN) expect(all, `${lang}: ${wrong}`).not.toContain(wrong);
    }
  });

  it("prints no surname: no capitalised name and no surname-like word in capitals", () => {
    for (const lang of LANGS) {
      const all = readable(render(LIST_FACTS_FIXTURE, lang));
      // PESEL is the register's name; I–III are plate numbers.
      const shouting = (all.match(/\p{Lu}{3,}/gu) ?? []).filter(
        (w) => w !== "PESEL" && !/^[IVX]+$/u.test(w),
      );
      expect(shouting).toEqual([]);
      for (const name of [
        "Nowak",
        "Kowalsk",
        "Wiśniewsk",
        "Kamińsk",
        "Dąbrowsk",
        "Kajak",
        "Lewandowsk",
        "Wójcik",
      ]) {
        expect(all).not.toContain(name);
      }
    }
  });

  it("fills every template: no stray brace, undefined or NaN reaches the page", () => {
    for (const lang of LANGS) {
      const all = readable(render(LIST_FACTS_FIXTURE, lang));
      expect(all).not.toMatch(/[{}]|undefined|NaN|Infinity/u);
    }
  });

  it("gives every figure a label or hides it: graphics are role=img or aria-hidden", () => {
    const html = render(LIST_FACTS_FIXTURE, "pl");
    for (const svg of html.match(/<svg[^>]*>/gu) ?? []) expect(svg).toContain('aria-hidden="true"');
    const images = [...html.matchAll(/role="img" aria-label="([^"]*)"/gu)];
    expect(images.length).toBeGreaterThanOrEqual(12);
    for (const [, label] of images) expect((label ?? "").length).toBeGreaterThan(20);
    expect(html.match(/role="img"/gu)?.length).toBe(images.length);
  });

  it("server-renders both lists and a working radio switch, so nothing depends on JavaScript", () => {
    const html = render(LIST_FACTS_FIXTURE, "pl");
    // No state for hydration to change: no data-list, nothing hidden, native radios.
    expect(html).not.toContain("data-list=");
    expect(html).not.toMatch(/\shidden(?:=|\s|>)/u);
    expect(html).not.toContain("aria-pressed");
    expect(html).toContain('<div class="lf-switchbar"><fieldset class="lf-switch">');
    expect(html).toContain(`<legend class="lf-sr">${UI.pl.lfSwitchLabel}</legend>`);
    expect(html).toMatch(/<input type="radio" name="lf-list" checked="" value="male"\/>/u);
    expect(html).toMatch(/<input type="radio" name="lf-list" value="female"\/>/u);
    expect(html.match(/type="radio"/gu)).toHaveLength(2);
    expect(html.match(/data-l="male"/gu)?.length).toBe(html.match(/data-l="female"/gu)?.length);
    // Both headline variants are in the markup, as a pair in one wrapper
    // (`.lf-per`, one grid cell); the stylesheet shows one.
    expect(html).toContain('<span data-v="male">');
    expect(html).toContain('<span data-v="female">');
    const pairs = html.match(/<span class="lf-per"><span data-v="male">/gu)?.length ?? 0;
    expect(pairs).toBeGreaterThanOrEqual(3);
    expect(html.match(/data-v="male"/gu)).toHaveLength(pairs);
    expect(html.match(/data-v="female"/gu)).toHaveLength(pairs);
  });

  it("ties the example room back to the list's answer: a line after seat n_half, labelled", () => {
    for (const lang of LANGS) {
      const html = render(LIST_FACTS_FIXTURE, lang);
      expect(html.match(/<path class="lf-room-half" d="M/gu)).toHaveLength(2);
      for (const list of [M, F]) {
        const n = formatInteger(list.collision.n_half, lang);
        const p = formatChance(list.collision.p_at_n_half, lang);
        // The fixture's n_half values (80, 78) take the "osób" form.
        expect(text(html)).toContain(
          lang === "pl" ? `${n} osób: szansa ${p}` : `${n} people: a ${p} chance`,
        );
        expect(readable(html)).toContain(
          lang === "pl" ? `Kreska po miejscu nr ${n}` : `A line after seat no. ${n}`,
        );
      }
    }
  });

  it("gives the typical person's flag a number-only form and its sentence under the sheet", () => {
    const html = render(LIST_FACTS_FIXTURE, "pl");
    const sheet = /<div class="lf-sheet lf-rv" data-l="male">[\s\S]*?<\/dl>/u.exec(html)?.[0] ?? "";
    const p = formatInteger(M.summary.median_count_per_person, "pl");
    expect(sheet).toContain(`<b class="lf-flag-short">${p}</b>`);
    expect(
      text(/<p class="lf-row-cap lf-row-cap-flag"[\s\S]*?<\/p>/u.exec(sheet)?.[0] ?? ""),
    ).toContain(`typowy mężczyzna: nazwisko ${p} mężczyzn`);
  });

  it("leaves out a sentence whose figure is missing, never printing a blank or a zero", () => {
    // Not a valid artefact (the schema requires both), which is the point: the
    // view must not fill the gap itself.
    const gappy: ListFactsArtefact = {
      ...LIST_FACTS_FIXTURE,
      lists: {
        male: {
          ...M,
          crowd: {
            ...M.crowd,
            expected_distinct: M.crowd.expected_distinct.filter((e) => e.n !== M.crowd.crowd_size),
            reach_half: M.crowd.reach_half.filter((r) => r.set !== "TOP_1"),
          },
        },
        female: F,
      },
    };
    for (const lang of LANGS) {
      const html = render(gappy, lang);
      expect(html).not.toContain('<span class="lf-n"></span>');
      const male = headlineVariants(html, "lf-p3").male;
      expect(male).toBe(UI[lang].lfP3Short);
      const card = factCards(html)[2] ?? "";
      expect(card).not.toContain(lang === "pl" ? "różnych nazwisk" : "different surnames");
      expect(card).not.toContain(lang === "pl" ? "najczęstszego nazwiska" : "most common surname");
      expect(card).toContain(lang === "pl" ? "Nikogo o tym samym nazwisku" : "nobody else");
      expect(containsNumber(card, "0")).toBe(false);
      const counters =
        /<div class="lf-col lf-rv" data-l="male"><p class="lf-label">[^<]*<\/p><div class="lf-counters">([\s\S]*?)<\/div>/u.exec(
          html.slice(html.indexOf('id="lf-p3"')),
        );
      expect(counters?.[1]?.match(/<p>/gu)).toHaveLength(1);
    }
  });

  it("names its list, with that list's figures only, in every variant of a plate headline", () => {
    for (const lang of LANGS) {
      const html = render(LIST_FACTS_FIXTURE, lang);
      const names = {
        male: lang === "pl" ? /listy mężczyzn|liście mężczyzn/u : /\bmale list\b/u,
        female: lang === "pl" ? /listy kobiet|liście kobiet/u : /\bfemale list\b/u,
      };
      const own = (list: ListFacts) => {
        const d = list.crowd.expected_distinct.find((e) => e.n === list.crowd.crowd_size)!;
        return [
          formatInteger(list.summary.median_count_per_surname, lang),
          formatInteger(list.summary.median_count_per_person, lang),
          formatDecimal(d.value, 0, lang),
        ];
      };
      for (const plate of ["lf-p1", "lf-p3"]) {
        const variants = headlineVariants(html, plate);
        for (const [side, list, other] of [
          ["male", M, "female"],
          ["female", F, "male"],
        ] as const) {
          const heading = variants[side];
          expect(heading, `${lang} ${plate} ${side}`).toMatch(names[side]);
          expect(heading, `${lang} ${plate} ${side}`).not.toMatch(names[other]);
          const figures = numbersIn(heading);
          expect(figures.length, `${lang} ${plate} ${side}`).toBeGreaterThan(0);
          for (const figure of figures) {
            expect(own(list), `${lang} ${plate} ${side}: ${figure}`).toContain(figure);
          }
        }
      }
      // Plate II's headline is a question with no figure in it.
      expect(
        numbersIn(text(/<h3 id="lf-p2-title"[^>]*>([\s\S]*?)<\/h3>/u.exec(html)?.[1] ?? "")),
      ).toEqual([]);
    }
  });

  it("gives every list's sentence its own crowd size", () => {
    const female: ListFacts = {
      ...F,
      crowd: { ...F.crowd, crowd_size: 10000 },
    };
    const facts: ListFactsArtefact = {
      ...LIST_FACTS_FIXTURE,
      lists: { male: M, female },
    };
    const html = render(facts, "pl");
    const { male: headM, female: headF } = headlineVariants(html, "lf-p3");
    expect(headM).toContain("Tysiąc nieznajomych z listy mężczyzn");
    expect(headM).toContain(formatDecimal(921.1, 0, "pl"));
    expect(headF).toContain(`${formatInteger(10000, "pl")} nieznajomych z listy kobiet`);
    expect(headF).toContain(formatDecimal(7001.8, 0, "pl"));
    const card = factCards(html)[2]!;
    expect(card).toContain(`w losowym tłumie ${formatInteger(1000, "pl")} mężczyzn`.slice(2));
    expect(card).toContain(
      `w tłumie ${formatInteger(10000, "pl")} kobiet z listy — ${formatDecimal(7001.8, 1, "pl")}`,
    );
    const plate3 = /<article id="lf-p3"[\s\S]*?<\/article>/u.exec(html)?.[0] ?? "";
    const lede = text(/<p class="lf-plate-lede">([\s\S]*?)<\/p>/u.exec(plate3)?.[1] ?? "");
    expect(lede).toContain(`${formatInteger(10000, "pl")} osób z listy kobiet`);
    expect(lede).toContain(`${formatInteger(1000, "pl")} osób z listy mężczyzn`);
  });

  it("does not set the two example crowds' largest groups side by side", () => {
    for (const lang of LANGS) {
      const all = readable(render(LIST_FACTS_FIXTURE, lang)).toLowerCase();
      expect(all).not.toContain(lang === "pl" ? "największa grupa" : "largest group");
      // The caveat says each example crowd is one draw and the two are not comparable.
      expect(all).toContain(
        lang === "pl"
          ? "dwóch przykładowych tłumów nie należy ze sobą porównywać"
          : "the two example crowds are not to be compared",
      );
    }
  });

  it("states the full scope of the list in every plate's caveat", () => {
    for (const lang of LANGS) {
      const caveats = [
        ...render(LIST_FACTS_FIXTURE, lang).matchAll(/<p class="lf-caveat">([\s\S]*?)<\/p>/gu),
      ].map((m) => text(m[1] ?? ""));
      expect(caveats).toHaveLength(3);
      for (const caveat of caveats) {
        expect(caveat).toContain(
          lang === "pl" ? "osoby żyjące, nazwisko aktualne" : "living persons, current surname",
        );
        expect(caveat).toContain(lang === "pl" ? "co najmniej 2 osoby" : "at least 2 people");
      }
    }
  });

  it("words quantiles as 'at least', and draws no person tick on the count axis's end", () => {
    for (const lang of LANGS) {
      const html = render(LIST_FACTS_FIXTURE, lang);
      const all = readable(html);
      const atLeast = lang === "pl" ? "co najmniej" : "at least";
      expect(all).toContain(`${atLeast} ${formatQuantile(0.999, lang)}`);
      expect(text(html)).toContain(
        lang === "pl" ? "co najmniej …% nazwisk" : "at least …% of surnames",
      );
      // Both fixture lists' 99.9% person quantile is the list's largest count.
      for (const list of [M, F]) {
        expect(list.summary.person_quantiles.find((q) => q.q === 0.999)?.count).toBe(
          list.summary.max_count,
        );
      }
      expect(html.match(/class="lf-lab lf-lab-bottom"/gu)).toHaveLength(6);
      expect(html.match(/class="lf-lab lf-lab-top"/gu)).toHaveLength(8);
      expect(html.match(/<line class="lf-qtick"/gu)).toHaveLength(14);
      // The figure's label still carries the quantile, worded so it is true.
      expect(all).toContain(
        lang === "pl"
          ? `co najmniej 99,9% nosi nazwisko, które ma najwyżej ${formatInteger(M.summary.max_count, lang)}`
          : `at least 99.9% carry a surname with at most ${formatInteger(M.summary.max_count, lang)}`,
      );
    }
  });

  it("hangs the person quantile under the typical person's flag away from the flag", () => {
    // Male fixture: the 50% person quantile is the typical person's count, and
    // the flag hangs to the left of its stem, so the label hangs to the right.
    expect(M.summary.person_quantiles.find((q) => q.q === 0.5)?.count).toBe(
      M.summary.median_count_per_person,
    );
    const html = render(LIST_FACTS_FIXTURE, "pl");
    const sheet = /<div class="lf-sheet lf-rv" data-l="male">[\s\S]*?<\/dl>/u.exec(html)?.[0] ?? "";
    expect(sheet).toContain('<span class="lf-flag lf-flag-bottom" data-side="end"');
    expect(sheet).toMatch(
      /<span class="lf-lab lf-lab-bottom" data-anchor="start"[^>]*>50%<\/span>/u,
    );
  });

  it("gives the example rooms a short label and their values as a list", () => {
    const html = render(LIST_FACTS_FIXTURE, "pl");
    const strips = [
      ...html.matchAll(/<div class="lf-strip"><div role="img" aria-label="([^"]*)">/gu),
    ];
    expect(strips).toHaveLength(2);
    for (const [, label] of strips) {
      expect((label ?? "").length).toBeLessThan(160);
      expect(numbersIn(label ?? "")).toEqual([]);
    }
    for (const list of [M, F]) {
      const values = list.collision.example_rooms.first_pair_at
        .map((n) => `<li>${formatInteger(n, "pl")}</li>`)
        .join("");
      expect(html).toContain(values);
    }
    expect(html.match(/<ul class="lf-sr" aria-label="Przykładowe sale/gu)).toHaveLength(2);
  });

  it("draws the same plates whatever order the artefact lists its keyed entries in", () => {
    const reorder = (list: ListFacts): ListFacts => ({
      ...list,
      summary: {
        ...list.summary,
        thresholds: [...list.summary.thresholds].reverse(),
        surname_quantiles: [...list.summary.surname_quantiles].reverse(),
        person_quantiles: [...list.summary.person_quantiles].reverse(),
      },
      collision: { ...list.collision, curve: [...list.collision.curve].reverse() },
      crowd: {
        ...list.crowd,
        expected_distinct: [...list.crowd.expected_distinct].reverse(),
        reach_half: [...list.crowd.reach_half].reverse(),
      },
    });
    const shuffled: ListFactsArtefact = {
      ...LIST_FACTS_FIXTURE,
      lists: { male: reorder(M), female: reorder(F) },
    };
    for (const lang of LANGS) {
      expect(render(shuffled, lang)).toBe(render(LIST_FACTS_FIXTURE, lang));
    }
  });

  it("names each list in the plate III fact card's every pair of figures", () => {
    const r = (list: ListFacts, set: string) =>
      list.crowd.reach_half.find((x) => x.set === set)!.n_half;
    for (const lang of LANGS) {
      const card = factCards(render(LIST_FACTS_FIXTURE, lang))[2]!;
      for (const set of ["TOP_100", "TOP_10", "TOP_1"]) {
        const m = formatInteger(r(M, set), lang);
        const f = formatInteger(r(F, set), lang);
        expect(card).toMatch(
          lang === "pl"
            ? new RegExp(`${m} mężczyzn albo ${f} kobiet`, "u")
            : new RegExp(`${m} men or ${f} women`, "u"),
        );
      }
    }
  });

  it("keeps the source line's and the scope line's date with its words", () => {
    // Non-breaking spaces glue "stan na" / "as of" to the day and month, and
    // the year to "r.": a narrow line breaks between the two pieces only, so
    // at large text the date never pushes the page sideways.
    const pl = render(LIST_FACTS_FIXTURE, "pl");
    expect(pl).toContain("stan\u00a0na\u00a020\u00a0stycznia 2026\u00a0r.");
    expect(pl).toContain("Stan\u00a0na\u00a020\u00a0stycznia 2026\u00a0r.");
    const en = render(LIST_FACTS_FIXTURE, "en");
    expect(en).toContain("as\u00a0of\u00a020\u00a0January 2026");
    expect(en).toContain("As\u00a0of\u00a020\u00a0January 2026.");
    expect(pl).not.toContain("lf-nowrap");
  });

  it("links the source and states its assessment and method", () => {
    const html = render(LIST_FACTS_FIXTURE, "pl");
    expect(html).toContain(`href="${M.source.source_page_url}"`);
    expect(text(html)).toContain("Zweryfikowane · metoda list_summary@1");
    expect(text(html)).toContain("metoda list_collision@1");
    expect(text(html)).toContain("metoda list_crowd@1");
  });

  it("renders the committed artefact without a sum of the two lists", () => {
    const real = listFacts();
    for (const lang of LANGS) {
      const all = readable(render(real, lang));
      expect(all).not.toMatch(/[{}]|undefined|NaN/u);
      const { male, female } = real.lists;
      for (const [a, b] of [
        [male.summary.people, female.summary.people],
        [male.summary.surnames, female.summary.surnames],
        [male.summary.max_count, female.summary.max_count],
        [male.summary.median_count_per_person, female.summary.median_count_per_person],
        [male.collision.pair_one_in, female.collision.pair_one_in],
      ] as const) {
        expect(containsNumber(all, formatInteger(a, lang))).toBe(true);
        expect(containsNumber(all, formatInteger(b, lang))).toBe(true);
        expect(containsNumber(all, formatInteger(a + b, lang))).toBe(false);
      }
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
  const rules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/gu)].map((m) => ({
    selector: (m[1] ?? "").trim().replace(/\s+/gu, " "),
    body: m[2] ?? "",
  }));
  const rule = (selector: string) => rules.filter((r) => r.selector === selector);

  it("stacks a line's two list variants in one grid cell, so flipping lists moves nothing", () => {
    expect(rule(".lf-per").some((r) => /display: grid;/u.test(r.body))).toBe(true);
    expect(rule(".lf-per > [data-v]").some((r) => /grid-area: 1 \/ 1;/u.test(r.body))).toBe(true);
    // On a phone the two lists' sheets and columns share a cell too.
    expect(
      rule(".lf :is(.lf-sheets, .lf-cols) > [data-l]").some((r) =>
        /grid-area: 1 \/ 1;/u.test(r.body),
      ),
    ).toBe(true);
  });

  it("hides the list not chosen with visibility, never by taking it out of the layout", () => {
    const listRules = rules.filter((r) => /\[data-[vl]="(?:male|female)"\]/u.test(r.selector));
    expect(listRules.length).toBeGreaterThanOrEqual(3);
    for (const r of listRules) expect(r.body, r.selector).not.toMatch(/display:\s*none/u);
    const hidden = listRules.filter((r) => /visibility: hidden;/u.test(r.body));
    expect(hidden.map((r) => r.selector).join(" ")).toMatch(/\[data-v="female"\]/u);
    expect(hidden.map((r) => r.selector).join(" ")).toMatch(/\[data-l="male"\]/u);
  });

  it("draws each label tier only where its row is as many em wide as it was fitted at", () => {
    for (const [tier, em] of LABEL_TIERS_EM.entries()) {
      if (tier === 0) continue;
      expect(CSS).toMatch(
        new RegExp(
          `@container \\(min-width: ${String(em)}em\\) \\{\\s*\\.lf-lab\\[data-fit="${String(tier)}"\\] \\{\\s*display: block;`,
          "u",
        ),
      );
    }
    expect(CSS).toMatch(
      /\.lf-plot,\s*\.lf-curve,\s*\.lf-spark,\s*\.lf-queue-axis \{\s*container-type: inline-size;/u,
    );
  });

  it("draws the typical person in Atlas Blue, as the headline does, as a diamond", () => {
    const person = rule(".lf-dot-person")
      .map((r) => r.body)
      .join("");
    expect(person).toContain("background: var(--accent);");
    expect(person).toContain("rotate: 45deg;");
    expect(
      rules.some((r) => r.selector.includes(".lf-stem-bottom") && r.body.includes("var(--accent)")),
    ).toBe(true);
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

describe("loadListFacts", () => {
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
