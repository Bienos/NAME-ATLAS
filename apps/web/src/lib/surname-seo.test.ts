import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { formatInteger, UI } from "./messages.js";
import type { ValueFamily } from "./seo.js";
import { Snapshot } from "./snapshot.js";
import { answerSentence, surnameDescription, surnameHeading, surnameTitle } from "./surname-seo.js";

/**
 * TASK-123: the surname page's title, answer and description. Only the fields
 * these functions read are built, so the fixtures are cast rather than parsed.
 */

const ALLOWED = { surface: "FREE", decision: "ALLOWED", reason_code: "RIGHTS_PERMIT_FREE_SURFACE" };
const MALE = "pesel_2026_national_male";
const FEMALE = "pesel_2026_national_female";

function observation(value: number | null, group: string | null, date = "2026-01-20") {
  return {
    value: { status: value === null ? "NOT_PUBLISHED" : "KNOWN", value },
    snapshot_date: date,
    comparability_group: group,
    confidence: { status: "VERIFIED" },
    citation: { id: "cit-pesel" },
  };
}

function region(name: string, count: number) {
  return { display_name: name, count, share_of_covered: 0.2 };
}

function entry(regions: unknown[], date = "2026-01-20", coverage = "READY", group = MALE) {
  return {
    coverage_state: coverage,
    regions,
    snapshot_date: date,
    comparability_group: group,
    confidence: { status: "VERIFIED" },
    citation: { id: "cit-pesel-regional" },
  };
}

const MEANING = {
  state: "AVAILABLE",
  interpretations: [
    {
      literal_gloss: "od nowy",
      work: { title: "Nazwiska Polaków", author_or_publisher: "Rymut", year: 1999 },
    },
  ],
  confidence: "LIKELY",
  surface: ALLOWED,
};

function response(parts: {
  observations?: unknown[] | null;
  distribution?: unknown[] | null;
  meaning?: boolean;
}): SurnameResultResponse {
  return {
    status: "RESOLVED",
    surname: { display_name: "NOWAK" },
    population:
      parts.observations === null
        ? {
            state: "UNAVAILABLE",
            observations: [],
            reason_code: "NOT_DERIVED_YET",
            surface: ALLOWED,
          }
        : {
            state: "READY",
            observations: parts.observations ?? [
              observation(98_387, MALE),
              observation(99_738, FEMALE),
            ],
            reason_code: null,
            surface: ALLOWED,
          },
    rarity: null,
    distribution:
      parts.distribution === undefined || parts.distribution === null
        ? null
        : { state: "READY", entries: parts.distribution, reason_code: null, surface: ALLOWED },
    meaning: parts.meaning === true ? MEANING : null,
  } as unknown as SurnameResultResponse;
}

const FAMILIES: readonly ValueFamily[] = ["CURRENT_STATS", "GEOGRAPHY", "ONOMASTICS"];

/** Every subset of the three families the page can publish today. */
function subsets(): ValueFamily[][] {
  return [0, 1, 2, 3, 4, 5, 6, 7].map((mask) => FAMILIES.filter((_, i) => (mask & (1 << i)) !== 0));
}

describe("TASK-123 AC-1: the title names only what the page has (canonical/21 §66–§67)", () => {
  it("follows the patterns, in both languages", () => {
    const all: ValueFamily[] = ["CURRENT_STATS", "GEOGRAPHY", "ONOMASTICS"];
    expect(surnameTitle("NOWAK", all, "pl")).toBe(
      "Nazwisko NOWAK — znaczenie, pochodzenie i występowanie | Name Atlas",
    );
    expect(surnameTitle("NOWAK", all, "en")).toBe(
      "NOWAK surname — meaning, origin and distribution | Name Atlas",
    );
    expect(surnameTitle("NOWAK", ["CURRENT_STATS", "GEOGRAPHY"], "pl")).toBe(
      "Nazwisko NOWAK — ile osób je nosi i gdzie występuje | Name Atlas",
    );
    expect(surnameTitle("NOWAK", ["CURRENT_STATS"], "en")).toBe(
      "NOWAK surname — how many people have it | Name Atlas",
    );
    expect(surnameTitle("NOWAK", [], "pl")).toBe("Nazwisko NOWAK | Name Atlas");
  });

  it("never names a dimension the page lacks", () => {
    for (const families of subsets()) {
      for (const lang of ["pl", "en"] as const) {
        const title = surnameTitle("NOWAK", families, lang).toLowerCase();
        const has = (family: ValueFamily): boolean => families.includes(family);
        expect(/mapa|map\b|gdzie|where|występowanie|distribution/u.test(title), title).toBe(
          has("GEOGRAPHY"),
        );
        expect(/znaczenie|meaning|pochodzenie|origin/u.test(title), title).toBe(has("ONOMASTICS"));
        if (/ile osób|liczba osób|how many/u.test(title)) expect(has("CURRENT_STATS")).toBe(true);
      }
    }
  });
});

describe("TASK-123 AC-2: the answer sentence (canonical/21 §64)", () => {
  it("states each list's count with its date and never adds them up", () => {
    const pl = answerSentence(response({}), "NOWAK", "pl");
    expect(pl).toBe(
      `Liczba osób o nazwisku NOWAK w rejestrze PESEL na dzień 20 stycznia 2026 r.: ${formatInteger(98_387, "pl")} mężczyzn i ${formatInteger(99_738, "pl")} kobiet.`,
    );
    expect(pl).not.toContain(formatInteger(98_387 + 99_738, "pl"));
    expect(answerSentence(response({}), "NOWAK", "en")).toBe(
      "People with the surname NOWAK in the PESEL register on 20 January 2026: 98,387 men and 99,738 women.",
    );
  });

  it("agrees in number", () => {
    const one = response({ observations: [observation(1, FEMALE)] });
    expect(answerSentence(one, "X", "en")).toContain(": 1 woman.");
    expect(answerSentence(one, "X", "pl")).toContain(": 1 kobieta.");
    const few = response({ observations: [observation(3, FEMALE), observation(22, MALE)] });
    expect(answerSentence(few, "X", "pl")).toContain(": 3 kobiety i 22 mężczyzn.");
  });

  it("leaves out a value the source does not publish, and is absent with no count", () => {
    const partial = response({ observations: [observation(null, MALE), observation(5, FEMALE)] });
    expect(answerSentence(partial, "X", "pl")).toContain(": 5 kobiet.");
    expect(answerSentence(partial, "X", "pl")).not.toMatch(/mężczy|\b0\b/u);
    expect(answerSentence(response({ observations: [observation(null, MALE)] }), "X", "pl")).toBe(
      null,
    );
    expect(answerSentence(response({ observations: null }), "X", "pl")).toBe(null);
  });

  it("gives each date its own sentence when the lists differ", () => {
    const split = response({
      observations: [observation(10, MALE, "2026-01-20"), observation(12, FEMALE, "2025-07-01")],
    });
    const text = answerSentence(split, "X", "en") ?? "";
    expect(text).toContain("on 20 January 2026: 10 men.");
    expect(text).toContain("on 1 July 2025: 12 women.");
  });

  it("names the strongest voivodeship only when it is untied, ready, dated alike and agreed", () => {
    const one = response({
      distribution: [entry([region("WIELKOPOLSKIE", 9), region("ŚLĄSKIE", 8)])],
    });
    expect(answerSentence(one, "X", "pl")).toMatch(/ Najwięcej zameldowanych: WIELKOPOLSKIE\.$/u);
    expect(answerSentence(one, "X", "en")).toMatch(/ Most registered in: WIELKOPOLSKIE\.$/u);
    const cases = [
      [entry([region("WIELKOPOLSKIE", 9), region("ŚLĄSKIE", 9)])],
      [entry([region("WIELKOPOLSKIE", 9)], "2025-07-01")],
      [entry([region("WIELKOPOLSKIE", 9)], "2026-01-20", "LOW_COVERAGE")],
      [
        entry([region("WIELKOPOLSKIE", 9)]),
        entry([region("ŚLĄSKIE", 9)], "2026-01-20", "READY", FEMALE),
      ],
    ];
    for (const distribution of cases) {
      expect(answerSentence(response({ distribution }), "X", "pl")).not.toContain("zameldowanych");
    }
  });
});

describe("TASK-123: the description names only what the page holds (canonical/21 §68)", () => {
  it("opens with the answer and invites to the map and meaning only when present", () => {
    const geo = [entry([region("WIELKOPOLSKIE", 9), region("ŚLĄSKIE", 8)])];
    const full = surnameDescription(response({ distribution: geo, meaning: true }), "NOWAK", "pl");
    expect(full.startsWith("Liczba osób o nazwisku NOWAK")).toBe(true);
    expect(full).toMatch(/Zobacz mapę województw, znaczenie nazwiska i źródła danych\.$/u);
    const bare = surnameDescription(response({}), "NOWAK", "en");
    expect(bare).toMatch(/See the sources\.$/u);
    expect(bare).not.toMatch(/map|meaning/u);
  });

  it("states the absence when there is no count", () => {
    expect(surnameDescription(response({ observations: null }), "NOWAK", "pl")).toContain(
      UI.pl.heroNotDerived,
    );
  });
});

describe("TASK-123 AC-4: one <h1>, the answer under it", () => {
  it("renders the eyebrow and the surname as the page's heading, then the answer", () => {
    for (const lang of ["pl", "en"] as const) {
      const r = response({}) as SurnameResultResponse & { status: "RESOLVED" };
      const html = renderToStaticMarkup(createElement(Snapshot, { response: r, lang }));
      expect(html.match(/<h1/gu)).toHaveLength(1);
      const h1 = /<h1[^>]*>(.*?)<\/h1>/u.exec(html)?.[1] ?? "";
      expect(
        h1
          .replace(/<[^>]+>/gu, "")
          .replace(/\s+/gu, " ")
          .trim(),
      ).toBe(surnameHeading("NOWAK", lang));
      const answer = html.indexOf('class="snapshot-answer"');
      expect(answer).toBeGreaterThan(html.indexOf("</h1>"));
      expect(answer).toBeLessThan(html.indexOf('class="hero"'));
    }
  });
});
