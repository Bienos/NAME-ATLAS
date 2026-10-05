/**
 * What a paid report could truthfully count, per surname (TASK-116, M4's
 * second step; `docs/canonical/11` §24, `docs/canonical/23` §22 PRE-001).
 *
 * The DiscoveryIndex is the only inventory a premium preview or paywall may
 * draw a number from (`docs/canonical/17` §43: the number shown equals the
 * number here). It is read from validated responses of the query service,
 * never from claims directly, and nothing is stored:
 *
 * - `validated_count` is read on the INTERNAL surface and `eligible_count` on
 *   the PAID surface, so rights are decided once, in the query service, and
 *   rights-blocked evidence is never paid inventory;
 * - each category's availability is the TASK-080 coverage dimension it draws
 *   from, so the two cannot disagree.
 *
 * The rules `discovery@0` (TASK-116 §3) count only what exists and is
 * deduplicated:
 *
 * - ORIGIN_ALTERNATIVES: one distinct proposed root, by the key the meaning
 *   chain uses to decide whether two works agree ({@link meaningRootKey});
 * - SOURCES: one distinct work behind a counted item;
 * - ARCHIVE_REFERENCES: nothing yet. Polona's matches are search matches for a
 *   word, not verified records of the surname (ADR-0024 §5, TASK-080 §6 U-2),
 *   and `docs/canonical/23` §22 forbids counting search candidates;
 * - every other category has no source yet and is NOT_RETRIEVED, never NONE.
 *
 * Famous bearers are not counted: they are free (ADR-0037), and a person who
 * shares a name is not evidence about the surname. Whether a surname may be
 * offered a paid report is PremiumEligibility (PRE-002), not this index.
 */
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import type { MeaningInterpretation, SurnameResultResponse } from "@name-atlas/contracts";
import type { ConfidenceStatus } from "./confidence.js";
import {
  assessResponse,
  COVERAGE_AVAILABILITIES,
  COVERAGE_ASSESSMENT_VERSION,
  forEachActiveSurname,
} from "./coverage-assessment.js";
import type {
  CoverageAssessment,
  CoverageAvailability,
  CoverageDimensionName,
  CoverageRunOptions,
} from "./coverage-assessment.js";
import { meaningRootKey } from "./meaning.js";
import { querySurnameResult } from "./query.js";

export const DISCOVERY_INDEX_VERSION = "discovery@0";

/** `docs/canonical/11` §24.3's `DiscoveryCategory`, in TASK-116 §3's order. */
export const DISCOVERY_CATEGORIES = [
  "ORIGIN_ALTERNATIVES",
  "SOURCES",
  "ARCHIVE_REFERENCES",
  "HISTORICAL_OCCURRENCES",
  "HISTORICAL_VARIANTS",
  "HISTORICAL_PLACES",
  "MIGRATION_CLUES",
  "HISTORICAL_LAYERS",
] as const;
export type DiscoveryCategory = (typeof DISCOVERY_CATEGORIES)[number];

/** What one counted item is: the text a preview must keep to (`docs/canonical/11` §24.3). */
export const DISCOVERY_COUNT_SEMANTICS: Readonly<Record<DiscoveryCategory, string>> = {
  ORIGIN_ALTERNATIVES:
    "distinct proposed roots (root form and language) from sourced works, not ancestors",
  SOURCES: "distinct published works behind the counted items",
  ARCHIVE_REFERENCES:
    "distinct archival records verified to contain the surname; search matches are not counted",
  HISTORICAL_OCCURRENCES: "verified dated occurrences of the surname, not family records",
  HISTORICAL_VARIANTS: "validated historical forms of the surname, not modern male or female forms",
  HISTORICAL_PLACES:
    "places with a surname-level historical association, not ancestral villages or same-name localities",
  MIGRATION_CLUES: "surname-level patterns passing an evidence threshold, not family migrations",
  HISTORICAL_LAYERS: "historical layers of the surname's evidence",
};

/** The coverage dimension each category reads its availability from. */
const AVAILABILITY_FROM: Readonly<Record<DiscoveryCategory, CoverageDimensionName | null>> = {
  ORIGIN_ALTERNATIVES: "ETYMOLOGY",
  SOURCES: "ETYMOLOGY",
  ARCHIVE_REFERENCES: "ARCHIVES",
  HISTORICAL_OCCURRENCES: "HISTORICAL_OCCURRENCES",
  HISTORICAL_VARIANTS: "VARIANTS",
  HISTORICAL_PLACES: "HISTORICAL_PLACES",
  MIGRATION_CLUES: "MIGRATION",
  HISTORICAL_LAYERS: null,
};

export interface DiscoveryIndexEntry {
  readonly category: DiscoveryCategory;
  /** Deduplicated items validated on the INTERNAL surface. */
  readonly validated_count: number;
  /** Of those, the items the PAID surface allows. The only number a preview may show. */
  readonly eligible_count: number;
  readonly count_semantics: string;
  /** The eligible items by confidence status. */
  readonly confidence_distribution: Readonly<Partial<Record<ConfidenceStatus, number>>>;
  readonly availability_status: CoverageAvailability;
  readonly reason_code: string | null;
  readonly preview_allowed: boolean;
}

export interface DiscoveryIndex {
  readonly surname_id: string;
  readonly display_name: string;
  readonly entries: readonly DiscoveryIndexEntry[];
  /** The coverage rules the availabilities come from. */
  readonly coverage_assessment_version: string;
  readonly generation_version: string;
}

/** Distinct proposed roots: two works proposing the same root are one alternative. */
export function originAlternatives(interpretations: readonly MeaningInterpretation[]): number {
  return new Set(interpretations.map(meaningRootKey)).size;
}

/** Distinct works: one work cited twice is one source. */
export function worksCited(interpretations: readonly MeaningInterpretation[]): number {
  return new Set(
    interpretations.map((i) => `${i.work.title}|${i.work.author_or_publisher}|${i.work.year}`),
  ).size;
}

function interpretationsOf(r: SurnameResultResponse): readonly MeaningInterpretation[] {
  return r.meaning?.state === "AVAILABLE" ? r.meaning.interpretations : [];
}

/** The two counts of a category, read on each surface. */
function counts(
  category: DiscoveryCategory,
  paid: SurnameResultResponse,
  internal: SurnameResultResponse,
): { validated: number; eligible: number } {
  switch (category) {
    case "ORIGIN_ALTERNATIVES":
      return {
        validated: originAlternatives(interpretationsOf(internal)),
        eligible: originAlternatives(interpretationsOf(paid)),
      };
    case "SOURCES":
      return {
        validated: worksCited(interpretationsOf(internal)),
        eligible: worksCited(interpretationsOf(paid)),
      };
    default:
      // ARCHIVE_REFERENCES counts no search match; the rest have no source yet.
      return { validated: 0, eligible: 0 };
  }
}

function entry(
  category: DiscoveryCategory,
  coverage: CoverageAssessment,
  paid: SurnameResultResponse,
  internal: SurnameResultResponse,
): DiscoveryIndexEntry {
  const from = AVAILABILITY_FROM[category];
  const dimension =
    from === null ? undefined : coverage.dimensions.find((d) => d.dimension === from);
  const { validated, eligible } = counts(category, paid, internal);
  const confidence = paid.meaning?.state === "AVAILABLE" ? paid.meaning.confidence : null;
  return {
    category,
    validated_count: validated,
    eligible_count: eligible,
    count_semantics: DISCOVERY_COUNT_SEMANTICS[category],
    confidence_distribution:
      category === "ORIGIN_ALTERNATIVES" && eligible > 0 && confidence !== null
        ? { [confidence]: eligible }
        : {},
    availability_status: dimension?.availability ?? "NOT_RETRIEVED",
    reason_code: dimension === undefined ? "NO_SOURCE_YET" : dimension.reason_code,
    preview_allowed: eligible > 0,
  };
}

/**
 * The index of one surname from its PAID response and its INTERNAL one (the
 * PAID one again where no counted section is rights-blocked). Null for a
 * response that did not resolve to one surname.
 */
export function discoveryIndexOf(
  paid: SurnameResultResponse,
  internal: SurnameResultResponse = paid,
): DiscoveryIndex | null {
  const coverage = assessResponse(paid);
  return coverage === null ? null : indexOf(coverage, paid, internal);
}

function indexOf(
  coverage: CoverageAssessment,
  paid: SurnameResultResponse,
  internal: SurnameResultResponse,
): DiscoveryIndex {
  return {
    surname_id: coverage.surname_id,
    display_name: coverage.display_name,
    entries: DISCOVERY_CATEGORIES.map((c) => entry(c, coverage, paid, internal)),
    coverage_assessment_version: COVERAGE_ASSESSMENT_VERSION,
    generation_version: DISCOVERY_INDEX_VERSION,
  };
}

export type DiscoveryIndexOutcome =
  | {
      readonly kind: "INDEXED";
      readonly index: DiscoveryIndex;
      /** The coverage the index read its availabilities from: its tier, and each list's count. */
      readonly coverage: CoverageAssessment;
    }
  | { readonly kind: "NOT_RESOLVED" }
  | { readonly kind: "UNAVAILABLE"; readonly reason: string };

/**
 * Reads the surname on the PAID surface, and on the INTERNAL surface only when
 * a counted section is rights-blocked there, and builds its index.
 */
export async function buildDiscoveryIndex(
  db: Kysely<DB>,
  input: string,
): Promise<DiscoveryIndexOutcome> {
  const paid = await querySurnameResult(db, input, { surface: "PAID" });
  if (paid.kind === "UNAVAILABLE") return { kind: "UNAVAILABLE", reason: paid.reason };
  if (paid.kind !== "OK") return { kind: "NOT_RESOLVED" };

  let internal = paid.response;
  if (paid.response.meaning?.state === "RIGHTS_BLOCKED") {
    const read = await querySurnameResult(db, input, { surface: "INTERNAL" });
    if (read.kind === "UNAVAILABLE") return { kind: "UNAVAILABLE", reason: read.reason };
    if (read.kind !== "OK") return { kind: "NOT_RESOLVED" };
    internal = read.response;
  }

  const coverage = assessResponse(paid.response);
  if (coverage === null) return { kind: "NOT_RESOLVED" };
  return {
    kind: "INDEXED",
    index: indexOf(coverage, paid.response, internal),
    coverage,
  };
}

export interface DiscoveryCategoryTally {
  /** Surnames with at least one eligible item in the category. */
  readonly with_eligible: number;
  /** Eligible items across those surnames. */
  readonly eligible_items: number;
  /** Surnames with validated items, none of them eligible: rights-blocked inventory. */
  readonly blocked_only: number;
  readonly availability: Readonly<Record<CoverageAvailability, number>>;
}

export interface DiscoveryListTally {
  readonly surnames: number;
  readonly people: number;
  /** Of those, the surnames with an eligible item in any category, and their people. */
  readonly with_inventory: { readonly surnames: number; readonly people: number };
}

/** Register-wide tallies of {@link buildDiscoveryIndex}. */
export interface DiscoveryRunTally {
  readonly generation_version: string;
  readonly coverage_assessment_version: string;
  readonly read: number;
  readonly not_resolved: number;
  readonly unavailable: number;
  /** Surnames with an eligible item in any category. */
  readonly with_inventory: number;
  /** Per list. Lists are never summed. */
  readonly lists: Readonly<Record<string, DiscoveryListTally>>;
  readonly categories: Readonly<Record<DiscoveryCategory, DiscoveryCategoryTally>>;
}

/**
 * Indexes every active surname in the register and tallies the result.
 * Read-only, through the same query service as a page.
 */
export async function discoveryRun(
  db: Kysely<DB>,
  options: CoverageRunOptions = {},
): Promise<DiscoveryRunTally> {
  const categories = Object.fromEntries(
    DISCOVERY_CATEGORIES.map((c) => [
      c,
      {
        with_eligible: 0,
        eligible_items: 0,
        blocked_only: 0,
        availability: Object.fromEntries(COVERAGE_AVAILABILITIES.map((a) => [a, 0])),
      },
    ]),
  ) as Record<
    DiscoveryCategory,
    {
      with_eligible: number;
      eligible_items: number;
      blocked_only: number;
      availability: Record<CoverageAvailability, number>;
    }
  >;
  const lists: Record<
    string,
    { surnames: number; people: number; with_inventory: { surnames: number; people: number } }
  > = {};
  let notResolved = 0;
  let unavailable = 0;
  let withInventory = 0;

  const read = await forEachActiveSurname(db, options, async (surname) => {
    const outcome = await buildDiscoveryIndex(db, surname);
    if (outcome.kind === "NOT_RESOLVED") notResolved += 1;
    else if (outcome.kind === "UNAVAILABLE") unavailable += 1;
    else {
      let any = false;
      for (const e of outcome.index.entries) {
        const c = categories[e.category];
        c.availability[e.availability_status] += 1;
        if (e.eligible_count > 0) {
          c.with_eligible += 1;
          c.eligible_items += e.eligible_count;
          any = true;
        } else if (e.validated_count > 0) {
          c.blocked_only += 1;
        }
      }
      if (any) withInventory += 1;
      for (const p of outcome.coverage.people) {
        const list = (lists[p.list] ??= {
          surnames: 0,
          people: 0,
          with_inventory: { surnames: 0, people: 0 },
        });
        list.surnames += 1;
        list.people += p.people;
        if (any) {
          list.with_inventory.surnames += 1;
          list.with_inventory.people += p.people;
        }
      }
    }
  });

  return {
    generation_version: DISCOVERY_INDEX_VERSION,
    coverage_assessment_version: COVERAGE_ASSESSMENT_VERSION,
    read,
    not_resolved: notResolved,
    unavailable,
    with_inventory: withInventory,
    lists,
    categories,
  };
}

/** The tally as Markdown: inventory per list, then each category. */
export function discoveryRunMarkdown(t: DiscoveryRunTally): string {
  const lines: string[] = [
    `DiscoveryIndex \`${t.generation_version}\` over coverage \`${t.coverage_assessment_version}\`, ` +
      `PAID surface. ${t.read} surnames read; ${t.not_resolved} did not resolve and ` +
      `${t.unavailable} could not be read. ${t.with_inventory} have an eligible item in any category.`,
    "",
    "| List | Surnames | People | Surnames with inventory | Their people |",
    "|---|---:|---:|---:|---:|",
    ...Object.entries(t.lists)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([list, l]) =>
          `| ${list} | ${l.surnames} | ${l.people} | ${l.with_inventory.surnames} | ${l.with_inventory.people} |`,
      ),
    "",
    "| Category | Surnames with eligible items | Eligible items | Rights-blocked only | " +
      COVERAGE_AVAILABILITIES.join(" | ") +
      " |",
    "|---|---:|---:|---:|" + COVERAGE_AVAILABILITIES.map(() => "---:").join("|") + "|",
    ...DISCOVERY_CATEGORIES.map((c) => {
      const x = t.categories[c];
      return (
        `| ${c} | ${x.with_eligible} | ${x.eligible_items} | ${x.blocked_only} | ` +
        COVERAGE_AVAILABILITIES.map((a) => x.availability[a]).join(" | ") +
        " |"
      );
    }),
    "",
    "Eligible items are those the PAID surface allows; only they may be shown in a preview.",
    "Archive search matches are never counted; categories without a source are NOT_RETRIEVED.",
  ];
  return lines.join("\n");
}
