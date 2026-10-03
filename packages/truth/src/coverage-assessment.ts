/**
 * How much a surname's evidence could carry a paid report (TASK-072, M4's
 * first step; `docs/canonical/11` §23, `docs/canonical/23` §22 COV-001).
 *
 * Read from the validated response on the PAID surface, never from claims
 * directly: rights, confidence and "not searched" are decided once, in the
 * query service, and coverage only reads them. Nothing is stored.
 *
 * The rules are the project owner's of 2026-10-03 (TASK-072 §6):
 *
 * - a dimension is STRONG only when its section is ready on the PAID surface
 *   at VERIFIED or LIKELY confidence;
 * - Polona's search matches are words, not verified occurrences (ADR-0024 §5),
 *   so ARCHIVES is at most PARTIAL;
 * - the tier: RICH needs a strong meaning and strong archives, STANDARD one of
 *   the two, LIMITED the statistics with change over time, MINIMAL the rest.
 *   "The statistics" are population and rarity; geography is reported but not
 *   required, because the regional lists suppress small counts.
 *
 * The localities that share the surname's name are reported, never counted:
 * a shared name says nothing about where a surname began.
 */
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import type { ConfidenceDto, SurnameResultResponse } from "@name-atlas/contracts";
import { querySurnameResult } from "./query.js";

export const COVERAGE_ASSESSMENT_VERSION = "coverage@0";

export const COVERAGE_DIMENSIONS = [
  "POPULATION",
  "RARITY",
  "MODERN_GEOGRAPHY",
  "CHANGE_OVER_TIME",
  "ETYMOLOGY",
  "ARCHIVES",
  "LOCALITIES",
  "ORIGIN",
  "VARIANTS",
  "HISTORICAL_OCCURRENCES",
  "HISTORICAL_PLACES",
  "MIGRATION",
] as const;
export type CoverageDimensionName = (typeof COVERAGE_DIMENSIONS)[number];

export const COVERAGE_AVAILABILITIES = [
  "STRONG",
  "PARTIAL",
  "NONE",
  "BLOCKED_RIGHTS",
  "SOURCE_UNAVAILABLE",
  "NOT_RETRIEVED",
  "NOT_APPLICABLE",
] as const;
export type CoverageAvailability = (typeof COVERAGE_AVAILABILITIES)[number];

export const COVERAGE_TIERS = ["RICH", "STANDARD", "LIMITED", "MINIMAL"] as const;
export type CoverageTier = (typeof COVERAGE_TIERS)[number];

export interface CoverageDimension {
  readonly dimension: CoverageDimensionName;
  readonly availability: CoverageAvailability;
  /** What one unit is depends on the dimension; see {@link assessResponse}. */
  readonly item_count: number;
  readonly reason_code: string | null;
}

export interface CoveragePeople {
  /** The list the count belongs to (its comparability group). Two lists are never summed. */
  readonly list: string;
  readonly people: number;
}

export interface CoverageAssessment {
  readonly surname_id: string;
  readonly display_name: string;
  readonly tier: CoverageTier;
  readonly dimensions: readonly CoverageDimension[];
  /** The known count on each list, for weighting a register-wide run. */
  readonly people: readonly CoveragePeople[];
  readonly assessment_version: string;
}

/** Sources with no connector yet: not searched, never "none found". */
const NOT_YET_SOURCED: readonly CoverageDimensionName[] = [
  "ORIGIN",
  "VARIANTS",
  "HISTORICAL_OCCURRENCES",
  "HISTORICAL_PLACES",
  "MIGRATION",
];

function strong(confidence: ConfidenceDto | null | undefined): boolean {
  return confidence?.status === "VERIFIED" || confidence?.status === "LIKELY";
}

function dim(
  dimension: CoverageDimensionName,
  availability: CoverageAvailability,
  item_count = 0,
  reason_code: string | null = null,
): CoverageDimension {
  return { dimension, availability, item_count, reason_code };
}

/** A section that is not ready, as an availability. */
function notReady(
  dimension: CoverageDimensionName,
  section: { state: string; reason_code: string | null } | null,
): CoverageDimension {
  if (section === null) return dim(dimension, "SOURCE_UNAVAILABLE", 0, "SECTION_ABSENT");
  switch (section.state) {
    case "RIGHTS_BLOCKED":
      return dim(dimension, "BLOCKED_RIGHTS", 0, section.reason_code);
    case "NOT_SEARCHED":
    case "NOT_LOADED":
      return dim(dimension, "NOT_RETRIEVED", 0, section.reason_code);
    case "NO_SOURCED_MEANING":
      return dim(dimension, "NONE", 0, section.reason_code);
    default:
      // UNAVAILABLE: no approved data for this surname, or a read that failed.
      return dim(dimension, "NONE", 0, section.reason_code);
  }
}

/** Ready entries, strong when any carries VERIFIED or LIKELY confidence. */
function fromEntries(
  dimension: CoverageDimensionName,
  entries: readonly { confidence: ConfidenceDto }[],
): CoverageDimension {
  return entries.some((e) => strong(e.confidence))
    ? dim(dimension, "STRONG", entries.length)
    : dim(dimension, "PARTIAL", entries.length, "CONFIDENCE_BELOW_LIKELY");
}

function dimensionsOf(r: SurnameResultResponse): CoverageDimension[] {
  const out: CoverageDimension[] = [];

  // One unit: a list on which the surname has a published count.
  const population = r.population;
  if (population?.state === "READY") {
    const known = population.observations.filter((o) => o.value.status === "KNOWN");
    out.push(
      known.length === 0
        ? dim("POPULATION", "PARTIAL", 0, "COUNTS_SUPPRESSED")
        : fromEntries("POPULATION", known),
    );
  } else {
    out.push(notReady("POPULATION", population));
  }

  // One unit: a list on which the surname has a rank and a rarity.
  out.push(
    r.rarity?.state === "READY"
      ? fromEntries("RARITY", r.rarity.entries)
      : notReady("RARITY", r.rarity),
  );

  // One unit: a regional list with a distribution. Strong only where the
  // regional counts cover enough of the national one.
  const distribution = r.distribution;
  if (distribution?.state === "READY") {
    const covered = distribution.entries.filter((e) => e.coverage_state === "READY");
    out.push(
      covered.length === 0
        ? dim("MODERN_GEOGRAPHY", "PARTIAL", distribution.entries.length, "LOW_COVERAGE")
        : fromEntries("MODERN_GEOGRAPHY", covered),
    );
  } else {
    out.push(notReady("MODERN_GEOGRAPHY", distribution));
  }

  // One unit: a list with at least two editions.
  out.push(
    r.change?.state === "READY"
      ? fromEntries("CHANGE_OVER_TIME", r.change.entries)
      : notReady("CHANGE_OVER_TIME", r.change),
  );

  // One unit: an interpretation from a sourced work. An interpretation is
  // never VERIFIED (ADR-0008 §5), so STRONG means LIKELY.
  const meaning = r.meaning;
  if (meaning?.state === "AVAILABLE") {
    out.push(
      meaning.confidence === "LIKELY"
        ? dim("ETYMOLOGY", "STRONG", meaning.interpretations.length)
        : dim(
            "ETYMOLOGY",
            "PARTIAL",
            meaning.interpretations.length,
            `CONFIDENCE_${meaning.confidence ?? "UNKNOWN"}`,
          ),
    );
  } else {
    out.push(notReady("ETYMOLOGY", meaning));
  }

  // One unit: a catalogue record matching the word. Matches are not verified
  // occurrences, so this is never STRONG (TASK-072 §6 U-2).
  const archive = r.archive;
  if (archive?.state === "READY") {
    const records = archive.catalogue_records ?? 0;
    const pages = archive.pages ?? 0;
    out.push(
      records + pages > 0
        ? dim("ARCHIVES", "PARTIAL", records, "UNVERIFIED_SEARCH_MATCHES")
        : dim("ARCHIVES", "NONE", 0, "NO_MATCHES"),
    );
  } else {
    out.push(notReady("ARCHIVES", archive));
  }

  // One unit: a locality with the same official name. Reported, never counted.
  const localities = r.localities;
  if (localities?.state === "READY") {
    const total = localities.total ?? 0;
    out.push(
      total > 0
        ? dim("LOCALITIES", "STRONG", total, "NOT_ORIGIN_EVIDENCE")
        : dim("LOCALITIES", "NONE", 0, "NO_LOCALITY_OF_THIS_NAME"),
    );
  } else {
    out.push(notReady("LOCALITIES", localities));
  }

  for (const d of NOT_YET_SOURCED) out.push(dim(d, "NOT_RETRIEVED", 0, "NO_SOURCE_YET"));
  return out;
}

/** The owner's v0 rule (TASK-072 §6 U-1). Localities never count. */
export function coverageTier(dimensions: readonly CoverageDimension[]): CoverageTier {
  const is = (d: CoverageDimensionName) =>
    dimensions.find((x) => x.dimension === d)?.availability === "STRONG";
  const statistics = is("POPULATION") && is("RARITY");
  if (!statistics) return "MINIMAL";
  if (is("ETYMOLOGY") && is("ARCHIVES")) return "RICH";
  if (is("ETYMOLOGY") || is("ARCHIVES")) return "STANDARD";
  if (is("CHANGE_OVER_TIME")) return "LIMITED";
  return "MINIMAL";
}

/**
 * The assessment of one resolved response, read on the PAID surface. Null for
 * a response that did not resolve to one surname.
 */
export function assessResponse(response: SurnameResultResponse): CoverageAssessment | null {
  if (response.status !== "RESOLVED" || response.surname === null) return null;
  const dimensions = dimensionsOf(response);
  const people =
    response.population?.state === "READY"
      ? response.population.observations.flatMap((o) =>
          o.value.status === "KNOWN" && o.value.value !== null
            ? [{ list: o.comparability_group ?? o.value.scope_label_code, people: o.value.value }]
            : [],
        )
      : [];
  return {
    surname_id: response.surname.id,
    display_name: response.surname.display_name,
    tier: coverageTier(dimensions),
    dimensions,
    people,
    assessment_version: COVERAGE_ASSESSMENT_VERSION,
  };
}

export type CoverageAssessmentOutcome =
  | { readonly kind: "ASSESSED"; readonly assessment: CoverageAssessment }
  | { readonly kind: "NOT_RESOLVED" }
  | { readonly kind: "UNAVAILABLE"; readonly reason: string };

/** Reads the surname on the PAID surface and assesses it. */
export async function assessCoverage(
  db: Kysely<DB>,
  input: string,
): Promise<CoverageAssessmentOutcome> {
  const outcome = await querySurnameResult(db, input, { surface: "PAID" });
  if (outcome.kind === "UNAVAILABLE") return { kind: "UNAVAILABLE", reason: outcome.reason };
  if (outcome.kind !== "OK") return { kind: "NOT_RESOLVED" };
  const assessment = assessResponse(outcome.response);
  return assessment === null ? { kind: "NOT_RESOLVED" } : { kind: "ASSESSED", assessment };
}

/** Register-wide tallies of {@link assessCoverage}, for M4's question. */
export interface CoverageRunTally {
  readonly assessment_version: string;
  /** Surnames read, and how many could not be assessed. */
  readonly read: number;
  readonly not_resolved: number;
  readonly unavailable: number;
  readonly tiers: Readonly<Record<CoverageTier, number>>;
  /** Per list: surnames on it and their people, by tier. Lists are never summed. */
  readonly lists: Readonly<
    Record<string, Readonly<Record<CoverageTier, { surnames: number; people: number }>>>
  >;
  readonly dimensions: Readonly<
    Record<CoverageDimensionName, Readonly<Record<CoverageAvailability, number>>>
  >;
}

export interface CoverageRunOptions {
  /** Surnames assessed at once. Each holds one connection at a time. */
  readonly concurrency?: number;
  /** Stop after this many surnames (a sample run). */
  readonly limit?: number;
  readonly batchSize?: number;
  readonly onProgress?: (read: number) => void;
}

function emptyTiers<T>(make: () => T): Record<CoverageTier, T> {
  return Object.fromEntries(COVERAGE_TIERS.map((t) => [t, make()])) as Record<CoverageTier, T>;
}

/**
 * Assesses every active surname in the register, in `surname_id` order, and
 * tallies the result. Read-only. Each surname is read through the same query
 * service as a page, so the run and a single assessment cannot disagree.
 */
export async function coverageRun(
  db: Kysely<DB>,
  options: CoverageRunOptions = {},
): Promise<CoverageRunTally> {
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const batchSize = options.batchSize ?? 500;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const tiers = emptyTiers(() => 0);
  const lists: Record<string, Record<CoverageTier, { surnames: number; people: number }>> = {};
  const dimensions = Object.fromEntries(
    COVERAGE_DIMENSIONS.map((d) => [
      d,
      Object.fromEntries(COVERAGE_AVAILABILITIES.map((a) => [a, 0])),
    ]),
  ) as Record<CoverageDimensionName, Record<CoverageAvailability, number>>;
  let read = 0;
  let notResolved = 0;
  let unavailable = 0;
  let after = "";

  while (read < limit) {
    const batch = await db
      .selectFrom("surnames")
      .select(["surname_id", "canonical_display"])
      .where("entity_status", "=", "ACTIVE")
      .where("surname_id", ">", after === "" ? "00000000-0000-0000-0000-000000000000" : after)
      .orderBy("surname_id")
      .limit(Math.min(batchSize, limit - read))
      .execute();
    if (batch.length === 0) break;
    after = batch[batch.length - 1]?.surname_id ?? after;

    let next = 0;
    const worker = async () => {
      for (let i = next++; i < batch.length; i = next++) {
        const row = batch[i];
        if (row === undefined) continue;
        const outcome = await assessCoverage(db, row.canonical_display);
        if (outcome.kind === "NOT_RESOLVED") notResolved += 1;
        else if (outcome.kind === "UNAVAILABLE") unavailable += 1;
        else {
          const a = outcome.assessment;
          tiers[a.tier] += 1;
          for (const p of a.people) {
            const list = (lists[p.list] ??= emptyTiers(() => ({
              surnames: 0,
              people: 0,
            })));
            list[a.tier].surnames += 1;
            list[a.tier].people += p.people;
          }
          for (const d of a.dimensions) dimensions[d.dimension][d.availability] += 1;
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    read += batch.length;
    options.onProgress?.(read);
  }

  return {
    assessment_version: COVERAGE_ASSESSMENT_VERSION,
    read,
    not_resolved: notResolved,
    unavailable,
    tiers,
    lists,
    dimensions,
  };
}

/** The tally as Markdown: tiers, tiers per list, and each dimension's availability. */
export function coverageRunMarkdown(t: CoverageRunTally): string {
  const lines: string[] = [
    `Assessment \`${t.assessment_version}\`, PAID surface. ${t.read} surnames read; ` +
      `${t.not_resolved} did not resolve and ${t.unavailable} could not be read.`,
    "",
    "| Tier | Surnames |",
    "|---|---:|",
    ...COVERAGE_TIERS.map((tier) => `| ${tier} | ${t.tiers[tier]} |`),
    "",
  ];
  for (const [list, byTier] of Object.entries(t.lists).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(
      `### ${list}`,
      "",
      "| Tier | Surnames | People |",
      "|---|---:|---:|",
      ...COVERAGE_TIERS.map(
        (tier) => `| ${tier} | ${byTier[tier].surnames} | ${byTier[tier].people} |`,
      ),
      "",
    );
  }
  lines.push(
    "| Dimension | " + COVERAGE_AVAILABILITIES.join(" | ") + " |",
    "|---|" + COVERAGE_AVAILABILITIES.map(() => "---:").join("|") + "|",
    ...COVERAGE_DIMENSIONS.map(
      (d) =>
        `| ${d} | ` + COVERAGE_AVAILABILITIES.map((a) => t.dimensions[d][a]).join(" | ") + " |",
    ),
    "",
    "A surname is counted once in the tiers, and once in each list it appears on.",
    "STRONG needs VERIFIED or LIKELY confidence on the PAID surface; archive matches are never STRONG.",
  );
  return lines.join("\n");
}
