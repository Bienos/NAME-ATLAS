/**
 * `GIVEN_NAME_BIRTH_COUNT`, `GIVEN_NAME_BIRTH_RANK` and `GIVEN_NAME_BIRTH_TREND`
 * (TASK-137, ADR-0043): claims on the first names given to children, by year,
 * from ADR-0042's stored lists, one list per year of birth and sex.
 *
 *   GivenName → given_name_birth_counts (one per list) → EvidenceItem → Claim
 *            → ClaimEvidence → ConfidenceAssessment → Citation        (count)
 *   … → COMPLETENESS GATE → rank → derived EvidenceItem
 *     → EvidenceDependency(COUNT, UNIVERSE) → Claim → …              (rank)
 *   latest count + count five years earlier (or that list's cut-off)
 *     → derived EvidenceItem → EvidenceDependency → Claim → …        (trend)
 *
 * The same chain as TASK-122 (`given-name.ts`), with these rules:
 *
 *   1. **Lists stay apart.** A claim is about one list, or (the trend) two lists
 *      of the same sex. The boys' and girls' lists, and lists of different
 *      years, are never summed or ranked together.
 *   2. **The rank is exact for every listed name.** A list leaves out only the
 *      names given fewer times than its cut-off, and every one of those has a
 *      smaller count than every listed name, so the number of listed names
 *      with a greater count is the number of all names with a greater count.
 *      The rank is still refused unless the stored list is the complete
 *      official file (`completeness.ts`): an excerpt is not the list.
 *   3. **Absent is not zero.** A name missing from a list was given fewer times
 *      than that list's stored `publication_threshold`. The trend reads the
 *      cut-off from the list and treats the earlier count as an unknown number
 *      below it, never as 0 (`AGENTS.md` §10, D-044 §6).
 *   4. **A flagged form gets no claim** (ADR-0032 §4, ADR-0042 §5). TASK-122
 *      gave flagged forms their claims and left them to the surface; here none
 *      is written. No 2000–2025 national list holds such a form.
 */
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { canonicalKey, NORMALIZATION_VERSION } from "@name-atlas/resolver";
import { BIRTH_NAME_RESOURCES } from "@name-atlas/sources";
import type { BirthListSex, BirthNameResourceDescriptor } from "@name-atlas/sources";
import { assessUniverseCompleteness } from "./completeness.js";
import type { CompletenessVerdict, IncompleteReason } from "./completeness.js";
import {
  assessCurrentPopulation,
  assessDerivedStatistic,
  evidenceSetHash,
  isValidCombination,
} from "./confidence.js";
import type { ConfidenceVerdict } from "./confidence.js";
import { TruthInvariantError } from "./derive.js";
import { buildRankTable, rankInTable } from "./rank.js";
import type { RankTable } from "./rank.js";
import { loadSourceContext } from "./universe.js";
import type { DerivationSourceContext } from "./universe.js";
import {
  CONFIDENCE_ASSESSMENT_METHOD,
  CONFIDENCE_ASSESSMENT_VERSION,
  GIVEN_NAME_BIRTH_COUNT_METHOD_VERSION,
  GIVEN_NAME_BIRTH_RANK_METHOD_VERSION,
  GIVEN_NAME_BIRTH_TREND_METHOD_VERSION,
  RANK_CONFIDENCE_ASSESSMENT_METHOD,
  RANK_CONFIDENCE_ASSESSMENT_VERSION,
  RANK_TIES_POLICY,
  RUN_INPUT_SCHEMA_VERSION,
  WORKFLOW_VERSION,
} from "./version.js";

const COUNTRY_CODE = "PL";
const RANK_DERIVATION_METHOD = "competition_rank_over_birth_list_given_name_counts";
const TREND_DERIVATION_METHOD = "birth_count_against_count_five_years_earlier";

/** D-044 §6: the latest year is compared with the year this many years earlier. */
export const BIRTH_TREND_WINDOW_YEARS = 5;
/** D-044 §6: more than this many percent higher is rising, more than this lower is falling. */
export const BIRTH_TREND_CHANGE_PERCENT = 10;

export type BirthTrendDirection = "RISING" | "STEADY" | "FALLING";

/** The earlier side of a trend: the publisher's count, or absent below the list's cut-off. */
export type BirthTrendEarlier =
  | { readonly kind: "LISTED"; readonly count: number }
  | { readonly kind: "BELOW_CUTOFF"; readonly publicationThreshold: number };

export type BirthTrendVerdict =
  | { readonly kind: "TREND"; readonly direction: BirthTrendDirection }
  /**
   * Absent earlier, and the latest count is not more than 10% above the
   * largest count the earlier cut-off allows. Cannot happen while the earlier
   * cut-off is 2 (2013 on); it can for an earlier year up to 2012 (cut-off 5).
   */
  | { readonly kind: "INDETERMINATE"; readonly reason: "BELOW_CUTOFF_TOO_CLOSE" };

/**
 * D-044 §6, in integers. `latest` is the count on the latest list; the
 * earlier side is the count five years before, or the fact that the name was
 * absent from that list (so its count was at most the cut-off minus one).
 */
export function birthTrend(latest: number, earlier: BirthTrendEarlier): BirthTrendVerdict {
  const up = 100 + BIRTH_TREND_CHANGE_PERCENT;
  const down = 100 - BIRTH_TREND_CHANGE_PERCENT;
  if (!Number.isInteger(latest) || latest < 1) {
    throw new TruthInvariantError("INVALID_DISTRIBUTION_COUNT", `latest count ${latest}`);
  }
  if (earlier.kind === "LISTED") {
    if (!Number.isInteger(earlier.count) || earlier.count < 1) {
      throw new TruthInvariantError("INVALID_DISTRIBUTION_COUNT", `earlier count ${earlier.count}`);
    }
    if (latest * 100 > earlier.count * up) return { kind: "TREND", direction: "RISING" };
    if (latest * 100 < earlier.count * down) return { kind: "TREND", direction: "FALLING" };
    return { kind: "TREND", direction: "STEADY" };
  }
  // The earlier count is some whole number from 0 to threshold − 1. Rising
  // holds for every one of them only if it holds for the largest.
  const largest = earlier.publicationThreshold - 1;
  if (latest * 100 > largest * up) return { kind: "TREND", direction: "RISING" };
  return { kind: "INDETERMINATE", reason: "BELOW_CUTOFF_TOO_CLOSE" };
}

/** Stable identity of a count claim: the name on one list. */
export function givenNameBirthCountClaimKey(givenNameId: string, listId: string): string {
  return `GIVEN_NAME_BIRTH_COUNT|${givenNameId}|${listId}`;
}

/** Stable identity of a rank claim: the name's place on one list. */
export function givenNameBirthRankClaimKey(givenNameId: string, listId: string): string {
  return `GIVEN_NAME_BIRTH_RANK|${givenNameId}|${listId}`;
}

/** Stable identity of a trend claim: the name on the latest list against the earlier one. */
export function givenNameBirthTrendClaimKey(
  givenNameId: string,
  latestListId: string,
  earlierListId: string,
): string {
  return `GIVEN_NAME_BIRTH_TREND|${givenNameId}|${latestListId}|${earlierListId}`;
}

/** One stored list on an ACTIVE source record, with what a run needs of it. */
export interface BirthListContext {
  readonly list_id: string;
  readonly source_record_id: string;
  readonly source_id: string;
  readonly external_record_id: string | null;
  readonly birth_year: number;
  readonly sex: BirthListSex;
  readonly publication_threshold: number;
  readonly comparability_group: string;
  readonly universe_description: string | null;
  readonly source_url: string | null;
  readonly retrieved_at: Date;
  readonly descriptor: BirthNameResourceDescriptor | undefined;
  /** Names stored on the list. */
  readonly stored_names: number;
  readonly completeness: CompletenessVerdict;
  /** Built only when the list passed the completeness gate. */
  readonly rank_table: RankTable | undefined;
}

/** Everything a run reads once: the active lists, the latest per sex, and the sources. */
export interface BirthRunContext {
  readonly lists: ReadonlyMap<string, BirthListContext>;
  /** The latest year's list for each sex. */
  readonly latest: ReadonlyMap<BirthListSex, BirthListContext>;
  /** The list `BIRTH_TREND_WINDOW_YEARS` before the latest, for each sex, when stored. */
  readonly earlier: ReadonlyMap<BirthListSex, BirthListContext>;
  readonly sources: ReadonlyMap<string, DerivationSourceContext>;
}

/**
 * Reads the active lists once. Two active lists of one year and sex would be
 * two lists to choose between or sum: ADR-0042 §3 forbids it, so it throws.
 */
export async function loadBirthRunContext(db: Kysely<DB>): Promise<BirthRunContext> {
  const rows = await db
    .selectFrom("given_name_birth_lists as l")
    .innerJoin("source_records as sr", "sr.source_record_id", "l.source_record_id")
    .select([
      "l.given_name_birth_list_id",
      "l.source_record_id",
      "l.birth_year",
      "l.sex",
      "l.publication_threshold",
      "l.row_count",
      "l.comparability_group",
      "sr.source_id",
      "sr.external_record_id",
      "sr.content_hash",
      "sr.universe_description",
      "sr.source_url",
      "sr.retrieved_at",
    ])
    .where("sr.record_status", "=", "ACTIVE")
    .orderBy("l.birth_year")
    .orderBy("l.sex")
    .execute();

  const lists = new Map<string, BirthListContext>();
  const byYearSex = new Map<string, BirthListContext>();
  const sources = new Map<string, DerivationSourceContext>();
  for (const row of rows) {
    if (row.sex !== "MALE" && row.sex !== "FEMALE") {
      throw new TruthInvariantError(
        "UNKNOWN_BIRTH_LIST_SEX",
        `list ${row.given_name_birth_list_id}`,
      );
    }
    const sex: BirthListSex = row.sex;
    const stored = await db
      .selectFrom("given_name_birth_counts")
      .select((eb) => eb.fn.countAll<string>().as("n"))
      .where("given_name_birth_list_id", "=", row.given_name_birth_list_id)
      .executeTakeFirstOrThrow();
    const storedNames = Number(stored.n);
    const descriptor = BIRTH_NAME_RESOURCES.find((r) => r.resource_id === row.external_record_id);
    // The list's own row count is read from the file at import; the checksum
    // proves the file is the official one. Both must agree (TASK-009's gate).
    const completeness = assessUniverseCompleteness({
      externalRecordId: row.external_record_id,
      actualContentHash: row.content_hash,
      actualRowCount: storedNames,
      descriptor:
        descriptor === undefined
          ? null
          : { officialSha256: descriptor.official_sha256, officialRowCount: row.row_count },
    });
    let rankTable: RankTable | undefined;
    if (completeness.kind === "COMPLETE") {
      const histogram = await db
        .selectFrom("given_name_birth_counts")
        .select(["count", (eb) => eb.fn.countAll<string>().as("frequency")])
        .where("given_name_birth_list_id", "=", row.given_name_birth_list_id)
        .groupBy("count")
        .execute();
      rankTable = buildRankTable(
        histogram.map((h) => ({ count: h.count, frequency: Number(h.frequency) })),
      );
    }
    const list: BirthListContext = {
      list_id: row.given_name_birth_list_id,
      source_record_id: row.source_record_id,
      source_id: row.source_id,
      external_record_id: row.external_record_id,
      birth_year: row.birth_year,
      sex,
      publication_threshold: row.publication_threshold,
      comparability_group: row.comparability_group,
      universe_description: row.universe_description,
      source_url: row.source_url,
      retrieved_at: row.retrieved_at,
      descriptor,
      stored_names: storedNames,
      completeness,
      rank_table: rankTable,
    };
    const yearSex = `${row.birth_year}|${sex}`;
    if (byYearSex.has(yearSex)) {
      throw new TruthInvariantError(
        "DUPLICATE_BIRTH_LIST",
        `two active lists for ${row.birth_year} ${sex} (ADR-0042 §3)`,
      );
    }
    byYearSex.set(yearSex, list);
    lists.set(list.list_id, list);
    if (!sources.has(row.source_id)) {
      sources.set(row.source_id, await loadSourceContext(db, row.source_id));
    }
  }

  const latest = new Map<BirthListSex, BirthListContext>();
  for (const list of lists.values()) {
    const current = latest.get(list.sex);
    if (current === undefined || list.birth_year > current.birth_year) latest.set(list.sex, list);
  }
  const earlier = new Map<BirthListSex, BirthListContext>();
  for (const [sex, list] of latest) {
    const found = byYearSex.get(`${list.birth_year - BIRTH_TREND_WINDOW_YEARS}|${sex}`);
    if (found !== undefined) earlier.set(sex, found);
  }
  return { lists, latest, earlier, sources };
}

/** Why a claim was not written. */
export type BirthClaimRefusal =
  | IncompleteReason
  /** No list of the same sex `BIRTH_TREND_WINDOW_YEARS` before the latest is stored. */
  | "NO_EARLIER_LIST"
  | "BELOW_CUTOFF_TOO_CLOSE";

export type BirthClaimOutcome =
  | { readonly kind: "DERIVED" | "EXISTING"; readonly claim_id: string }
  | { readonly kind: "REFUSED"; readonly reason: BirthClaimRefusal };

export interface BirthListResult {
  readonly list_id: string;
  readonly birth_year: number;
  readonly sex: BirthListSex;
  readonly count: number;
  readonly count_claim: BirthClaimOutcome;
  readonly rank: BirthClaimOutcome & { readonly value?: number; readonly universe_size?: number };
  /** Only on the latest list of each sex. */
  readonly trend?: BirthClaimOutcome & {
    readonly direction?: BirthTrendDirection;
    readonly earlier_year?: number;
    readonly earlier_count?: number | null;
  };
}

export type BirthNameDerivationOutcome =
  | {
      readonly kind: "DERIVED";
      readonly given_name_id: string;
      readonly display_name: string;
      readonly lists: readonly BirthListResult[];
    }
  /** Flagged for review (ADR-0032 §4): no claim is written. */
  | { readonly kind: "FLAGGED"; readonly given_name_id: string; readonly display_name: string }
  | { readonly kind: "NOT_FOUND" };

interface NameCountRow {
  readonly given_name_birth_count_id: string;
  readonly list: BirthListContext;
  readonly count: number;
}

function checkVerdict(verdict: ConfidenceVerdict): void {
  if (!isValidCombination(verdict.epistemic_type, verdict.status)) {
    throw new TruthInvariantError(
      "INVALID_EPISTEMIC_COMBINATION",
      `(${verdict.epistemic_type}, ${verdict.status}) is not permitted by docs/canonical/11 §12.3`,
    );
  }
}

async function activeClaimId(trx: Transaction<DB>, claimKey: string): Promise<string | null> {
  const rows = await trx
    .selectFrom("claims")
    .select("claim_id")
    .where("claim_key", "=", claimKey)
    .where("claim_status", "=", "ACTIVE")
    .execute();
  if (rows.length > 1) {
    throw new TruthInvariantError(
      "CONFLICTING_ACTIVE_CLAIMS",
      `${rows.length} active claims share claim_key ${claimKey}`,
    );
  }
  return rows[0]?.claim_id ?? null;
}

/**
 * Derives (or re-reads) every claim for one given name, written as the
 * importer stored it. Idempotent: an ACTIVE claim with the same key is reused.
 */
export async function deriveBirthName(
  db: Kysely<DB>,
  input: string,
  context?: BirthRunContext,
): Promise<BirthNameDerivationOutcome> {
  const found = await db
    .selectFrom("given_names")
    .select(["given_name_id", "canonical_display", "form_review"])
    .where("canonical_key", "=", canonicalKey(input))
    .executeTakeFirst();
  if (found === undefined) return { kind: "NOT_FOUND" };
  if (found.form_review !== null) {
    return {
      kind: "FLAGGED",
      given_name_id: found.given_name_id,
      display_name: found.canonical_display,
    };
  }
  return deriveBirthNameById(
    db,
    found.given_name_id,
    found.canonical_display,
    context ?? (await loadBirthRunContext(db)),
  );
}

async function deriveBirthNameById(
  db: Kysely<DB>,
  givenNameId: string,
  displayName: string,
  context: BirthRunContext,
): Promise<BirthNameDerivationOutcome & { kind: "DERIVED" }> {
  const stored = await db
    .selectFrom("given_name_birth_counts")
    .select(["given_name_birth_count_id", "given_name_birth_list_id", "count"])
    .where("given_name_id", "=", givenNameId)
    .execute();
  // Earlier years first, so the earlier count's evidence exists when the trend needs it.
  const rows: NameCountRow[] = stored
    .flatMap((r) => {
      const list = context.lists.get(r.given_name_birth_list_id);
      return list === undefined
        ? []
        : [{ given_name_birth_count_id: r.given_name_birth_count_id, list, count: r.count }];
    })
    .sort((a, b) => a.list.birth_year - b.list.birth_year || a.list.sex.localeCompare(b.list.sex));

  const lists = await db.transaction().execute(async (trx) => {
    let runId: string | null = null;
    const run = async (): Promise<string> => {
      if (runId !== null) return runId;
      runId = uuidv7();
      await trx
        .insertInto("research_runs")
        .values({
          research_run_id: runId,
          run_type: "BASIC_GIVEN_NAME",
          surname_id: null,
          raw_input: JSON.stringify({ given_name_id: givenNameId, lists: "birth_years" }),
          input_schema_version: RUN_INPUT_SCHEMA_VERSION,
          workflow_version: WORKFLOW_VERSION,
          connector_manifest: JSON.stringify({
            source_ids: [...new Set(rows.map((r) => r.list.source_id))],
          }),
          prompt_manifest: JSON.stringify({}),
          model_manifest: JSON.stringify({}),
          normalization_version: NORMALIZATION_VERSION,
          rights_snapshot_hash: null,
          run_status: "RUNNING",
          qa_status: "NOT_RUN",
          started_at: new Date(),
          completed_at: null,
          error_summary: null,
        })
        .execute();
      return runId;
    };

    // The count evidence of each list the name is on, for the rank and the trend.
    const countEvidence = new Map<string, { evidenceId: string; count: number }>();
    const out: BirthListResult[] = [];
    for (const row of rows) {
      out.push(await deriveList(trx, givenNameId, row, context, countEvidence, run));
    }
    if (runId !== null) {
      await trx
        .updateTable("research_runs")
        .set({ run_status: "COMPLETE", qa_status: "PASS", completed_at: new Date() })
        .where("research_run_id", "=", runId)
        .execute();
    }
    return out;
  });

  return { kind: "DERIVED", given_name_id: givenNameId, display_name: displayName, lists };
}

function publicationDate(list: BirthListContext): string | null {
  return list.descriptor?.portal_modified_at.slice(0, 10) ?? null;
}

async function deriveList(
  trx: Transaction<DB>,
  givenNameId: string,
  row: NameCountRow,
  context: BirthRunContext,
  countEvidence: Map<string, { evidenceId: string; count: number }>,
  run: () => Promise<string>,
): Promise<BirthListResult> {
  const { list } = row;
  const base = {
    list_id: list.list_id,
    birth_year: list.birth_year,
    sex: list.sex,
    count: row.count,
  };
  const isLatest = context.latest.get(list.sex)?.list_id === list.list_id;
  if (list.descriptor === undefined) {
    // No registry entry: no publication can be cited, and no universe checked.
    const refused = { kind: "REFUSED", reason: "UNKNOWN_RESOURCE" } as const;
    return {
      ...base,
      count_claim: refused,
      rank: refused,
      ...(isLatest ? { trend: refused } : {}),
    };
  }
  if (!Number.isInteger(row.count) || row.count < list.publication_threshold) {
    throw new TruthInvariantError(
      "INVALID_DISTRIBUTION_COUNT",
      `given_name_birth_count ${row.given_name_birth_count_id} has count ${row.count}, below ` +
        `its list's cut-off of ${list.publication_threshold}`,
    );
  }

  // --- The count ----------------------------------------------------------
  const countKey = givenNameBirthCountClaimKey(givenNameId, list.list_id);
  let countClaimId = await activeClaimId(trx, countKey);
  let countEvidenceId: string;
  let countClaim: BirthClaimOutcome;
  if (countClaimId !== null) {
    const link = await trx
      .selectFrom("claim_evidence")
      .select("evidence_item_id")
      .where("claim_id", "=", countClaimId)
      .executeTakeFirstOrThrow();
    countEvidenceId = link.evidence_item_id;
    countClaim = { kind: "EXISTING", claim_id: countClaimId };
  } else {
    const runId = await run();
    countEvidenceId = uuidv7();
    await trx
      .insertInto("evidence_items")
      .values({
        evidence_item_id: countEvidenceId,
        evidence_type: "OFFICIAL_DATASET_FIELD",
        source_record_id: list.source_record_id,
        subject_entity_id: givenNameId,
        structured_value: JSON.stringify({
          count: row.count,
          given_name_birth_count_id: row.given_name_birth_count_id,
          given_name_birth_list_id: list.list_id,
          birth_year: list.birth_year,
          sex: list.sex,
          publication_threshold: list.publication_threshold,
          universe_description: list.universe_description,
        }),
        raw_excerpt: null,
        supporting_locator: `given_name_birth_count:${row.given_name_birth_count_id}`,
        verification_status: "VERIFIED",
        derivation_method: null,
        derivation_version: null,
        created_by_run_id: runId,
      })
      .execute();
    countClaimId = uuidv7();
    await insertClaim(trx, {
      claimId: countClaimId,
      claimKey: countKey,
      claimType: "GIVEN_NAME_BIRTH_COUNT",
      givenNameId,
      runId,
      methodVersion: GIVEN_NAME_BIRTH_COUNT_METHOD_VERSION,
      value: {
        count: row.count,
        birth_year: list.birth_year,
        sex: list.sex,
        publication_threshold: list.publication_threshold,
        country_code: COUNTRY_CODE,
        source_population_scope: list.universe_description,
        comparability_group: list.comparability_group,
      },
      evidenceId: countEvidenceId,
      reasonCode: "OFFICIAL_DATASET_VALUE_FOR_GIVEN_NAME_BIRTHS",
    });
    const verdict = assessCurrentPopulation({
      extractionReproducible: true,
      exactResolution: true,
      sourceScopePreserved: (list.universe_description ?? "").trim().length > 0,
      noMaterialConflict: true,
    });
    checkVerdict(verdict);
    await insertAssessmentAndCitations(trx, {
      claimId: countClaimId,
      evidenceIds: [countEvidenceId],
      verdict,
      method: CONFIDENCE_ASSESSMENT_METHOD,
      version: CONFIDENCE_ASSESSMENT_VERSION,
      lists: [list],
      context,
    });
    countClaim = { kind: "DERIVED", claim_id: countClaimId };
  }
  countEvidence.set(list.list_id, { evidenceId: countEvidenceId, count: row.count });

  const rank = await deriveRank(trx, givenNameId, row, countEvidenceId, context, run);
  if (!isLatest) return { ...base, count_claim: countClaim, rank };
  const trend = await deriveTrend(
    trx,
    givenNameId,
    row,
    countEvidenceId,
    context,
    countEvidence,
    run,
  );
  return { ...base, count_claim: countClaim, rank, trend };
}

async function deriveRank(
  trx: Transaction<DB>,
  givenNameId: string,
  row: NameCountRow,
  countEvidenceId: string,
  context: BirthRunContext,
  run: () => Promise<string>,
): Promise<BirthListResult["rank"]> {
  const { list } = row;
  if (list.completeness.kind === "INCOMPLETE") {
    return { kind: "REFUSED", reason: list.completeness.reason };
  }
  if (list.rank_table === undefined) throw new Error(`list ${list.list_id} has no rank table`);
  const rank = rankInTable(list.rank_table, row.count);
  const universeSize = list.completeness.universeSize;

  const rankKey = givenNameBirthRankClaimKey(givenNameId, list.list_id);
  const existing = await activeClaimId(trx, rankKey);
  if (existing !== null) {
    return { kind: "EXISTING", claim_id: existing, value: rank, universe_size: universeSize };
  }

  const runId = await run();
  const universeEvidenceId = await insertUniverseEvidence(trx, list, runId);
  const derivedEvidenceId = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: derivedEvidenceId,
      evidence_type: "DERIVED_STATISTIC",
      source_record_id: list.source_record_id,
      subject_entity_id: givenNameId,
      structured_value: JSON.stringify({
        rank,
        count: row.count,
        universe_size: universeSize,
        ties_policy: RANK_TIES_POLICY,
        algorithm_version: GIVEN_NAME_BIRTH_RANK_METHOD_VERSION,
      }),
      raw_excerpt: null,
      supporting_locator: `given_name_birth_list:${list.list_id}`,
      verification_status: "VERIFIED",
      derivation_method: RANK_DERIVATION_METHOD,
      derivation_version: GIVEN_NAME_BIRTH_RANK_METHOD_VERSION,
      created_by_run_id: runId,
    })
    .execute();
  await insertDependencies(trx, derivedEvidenceId, [
    [countEvidenceId, "COUNT"],
    [universeEvidenceId, "UNIVERSE"],
  ]);
  const claimId = uuidv7();
  await insertClaim(trx, {
    claimId,
    claimKey: rankKey,
    claimType: "GIVEN_NAME_BIRTH_RANK",
    givenNameId,
    runId,
    methodVersion: GIVEN_NAME_BIRTH_RANK_METHOD_VERSION,
    value: {
      rank,
      universe_size: universeSize,
      ties_policy: RANK_TIES_POLICY,
      birth_year: list.birth_year,
      sex: list.sex,
      country_code: COUNTRY_CODE,
      comparability_group: list.comparability_group,
    },
    evidenceId: derivedEvidenceId,
    reasonCode: "DERIVED_RANK_FOR_GIVEN_NAME_BIRTHS",
  });
  await insertDerivedAssessment(trx, claimId, derivedEvidenceId, [list], context);
  return { kind: "DERIVED", claim_id: claimId, value: rank, universe_size: universeSize };
}

async function deriveTrend(
  trx: Transaction<DB>,
  givenNameId: string,
  row: NameCountRow,
  latestEvidenceId: string,
  context: BirthRunContext,
  countEvidence: ReadonlyMap<string, { evidenceId: string; count: number }>,
  run: () => Promise<string>,
): Promise<NonNullable<BirthListResult["trend"]>> {
  const latest = row.list;
  const earlier = context.earlier.get(latest.sex);
  if (earlier === undefined) return { kind: "REFUSED", reason: "NO_EARLIER_LIST" };
  if (earlier.descriptor === undefined) return { kind: "REFUSED", reason: "UNKNOWN_RESOURCE" };
  const earlierCount = countEvidence.get(earlier.list_id);
  if (earlierCount === undefined && earlier.completeness.kind === "INCOMPLETE") {
    // Absent from an excerpt says nothing about the official list.
    return { kind: "REFUSED", reason: earlier.completeness.reason };
  }
  const side: BirthTrendEarlier =
    earlierCount === undefined
      ? { kind: "BELOW_CUTOFF", publicationThreshold: earlier.publication_threshold }
      : { kind: "LISTED", count: earlierCount.count };
  const verdict = birthTrend(row.count, side);
  if (verdict.kind === "INDETERMINATE") return { kind: "REFUSED", reason: verdict.reason };
  const shown = {
    direction: verdict.direction,
    earlier_year: earlier.birth_year,
    earlier_count: earlierCount?.count ?? null,
  };

  const trendKey = givenNameBirthTrendClaimKey(givenNameId, latest.list_id, earlier.list_id);
  const existing = await activeClaimId(trx, trendKey);
  if (existing !== null) return { kind: "EXISTING", claim_id: existing, ...shown };

  const runId = await run();
  const dependencies: [string, "COUNT" | "UNIVERSE"][] = [[latestEvidenceId, "COUNT"]];
  if (earlierCount !== undefined) dependencies.push([earlierCount.evidenceId, "COUNT"]);
  else dependencies.push([await insertUniverseEvidence(trx, earlier, runId), "UNIVERSE"]);

  const earlierValue = {
    birth_year: earlier.birth_year,
    count: earlierCount?.count ?? null,
    // Set only when absent: the count was below this, never zero.
    below_publication_threshold: earlierCount === undefined ? earlier.publication_threshold : null,
    comparability_group: earlier.comparability_group,
  };
  const derivedEvidenceId = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: derivedEvidenceId,
      evidence_type: "DERIVED_STATISTIC",
      source_record_id: latest.source_record_id,
      subject_entity_id: givenNameId,
      structured_value: JSON.stringify({
        direction: verdict.direction,
        latest_count: row.count,
        earlier: earlierValue,
        window_years: BIRTH_TREND_WINDOW_YEARS,
        change_percent: BIRTH_TREND_CHANGE_PERCENT,
        algorithm_version: GIVEN_NAME_BIRTH_TREND_METHOD_VERSION,
      }),
      raw_excerpt: null,
      supporting_locator: `given_name_birth_list:${latest.list_id}`,
      verification_status: "VERIFIED",
      derivation_method: TREND_DERIVATION_METHOD,
      derivation_version: GIVEN_NAME_BIRTH_TREND_METHOD_VERSION,
      created_by_run_id: runId,
    })
    .execute();
  await insertDependencies(trx, derivedEvidenceId, dependencies);
  const claimId = uuidv7();
  await insertClaim(trx, {
    claimId,
    claimKey: trendKey,
    claimType: "GIVEN_NAME_BIRTH_TREND",
    givenNameId,
    runId,
    methodVersion: GIVEN_NAME_BIRTH_TREND_METHOD_VERSION,
    value: {
      direction: verdict.direction,
      sex: latest.sex,
      latest: {
        birth_year: latest.birth_year,
        count: row.count,
        comparability_group: latest.comparability_group,
      },
      earlier: earlierValue,
      window_years: BIRTH_TREND_WINDOW_YEARS,
      change_percent: BIRTH_TREND_CHANGE_PERCENT,
      country_code: COUNTRY_CODE,
    },
    evidenceId: derivedEvidenceId,
    reasonCode: "DERIVED_TREND_FOR_GIVEN_NAME_BIRTHS",
  });
  await insertDerivedAssessment(trx, claimId, derivedEvidenceId, [latest, earlier], context);
  return { kind: "DERIVED", claim_id: claimId, ...shown };
}

/** The list as a universe: its listed names and its cut-off, once the gate passed. */
async function insertUniverseEvidence(
  trx: Transaction<DB>,
  list: BirthListContext,
  runId: string,
): Promise<string> {
  if (list.completeness.kind !== "COMPLETE") {
    throw new Error(`list ${list.list_id} is not complete`);
  }
  const id = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: id,
      evidence_type: "AUTHORITATIVE_INDEX",
      source_record_id: list.source_record_id,
      subject_entity_id: null,
      structured_value: JSON.stringify({
        universe_kind: "BIRTH_LIST_GIVEN_NAME_COUNTS",
        universe_size: list.completeness.universeSize,
        given_name_birth_list_id: list.list_id,
        birth_year: list.birth_year,
        sex: list.sex,
        publication_threshold: list.publication_threshold,
        external_record_id: list.external_record_id,
        comparability_group: list.comparability_group,
        completeness_basis:
          "registry official_sha256 matched and every row of the list stored; a name absent " +
          "from the list was given fewer times than publication_threshold",
      }),
      raw_excerpt: null,
      supporting_locator: `given_name_birth_list:${list.list_id}`,
      verification_status: "VERIFIED",
      derivation_method: null,
      derivation_version: null,
      created_by_run_id: runId,
    })
    .execute();
  return id;
}

async function insertDependencies(
  trx: Transaction<DB>,
  derivedEvidenceId: string,
  dependencies: readonly (readonly [string, "COUNT" | "UNIVERSE"])[],
): Promise<void> {
  for (const [dependsOn, role] of dependencies) {
    await trx
      .insertInto("evidence_dependencies")
      .values({
        evidence_dependency_id: uuidv7(),
        derived_evidence_item_id: derivedEvidenceId,
        depends_on_evidence_item_id: dependsOn,
        dependency_role: role,
      })
      .execute();
  }
}

async function insertClaim(
  trx: Transaction<DB>,
  args: {
    readonly claimId: string;
    readonly claimKey: string;
    readonly claimType:
      "GIVEN_NAME_BIRTH_COUNT" | "GIVEN_NAME_BIRTH_RANK" | "GIVEN_NAME_BIRTH_TREND";
    readonly givenNameId: string;
    readonly runId: string;
    readonly methodVersion: string;
    readonly value: unknown;
    readonly evidenceId: string;
    readonly reasonCode: string;
  },
): Promise<void> {
  await trx
    .insertInto("claims")
    .values({
      claim_id: args.claimId,
      claim_key: args.claimKey,
      claim_type: args.claimType,
      epistemic_type: "FACT",
      scope: "SHARED",
      subject_entity_id: args.givenNameId,
      object_entity_id: null,
      structured_value: JSON.stringify(args.value),
      statement_key: null,
      claim_status: "ACTIVE",
      supersedes_claim_id: null,
      created_by_run_id: args.runId,
      method_version: args.methodVersion,
    })
    .execute();
  await trx
    .insertInto("claim_evidence")
    .values({
      claim_id: args.claimId,
      evidence_item_id: args.evidenceId,
      relationship: "SUPPORTS",
      reason_code: args.reasonCode,
      notes: null,
    })
    .execute();
}

async function insertDerivedAssessment(
  trx: Transaction<DB>,
  claimId: string,
  derivedEvidenceId: string,
  lists: readonly BirthListContext[],
  context: BirthRunContext,
): Promise<void> {
  const verdict = assessDerivedStatistic({
    computationReproducible: true,
    inputsComplete: true,
    upstreamEvidenceVerified: true,
    noMaterialConflict: true,
  });
  checkVerdict(verdict);
  await insertAssessmentAndCitations(trx, {
    claimId,
    evidenceIds: [derivedEvidenceId],
    verdict,
    method: RANK_CONFIDENCE_ASSESSMENT_METHOD,
    version: RANK_CONFIDENCE_ASSESSMENT_VERSION,
    lists,
    context,
  });
}

/** One assessment, and one citation per source record the claim rests on. */
async function insertAssessmentAndCitations(
  trx: Transaction<DB>,
  args: {
    readonly claimId: string;
    readonly evidenceIds: readonly string[];
    readonly verdict: ConfidenceVerdict;
    readonly method: string;
    readonly version: string;
    readonly lists: readonly BirthListContext[];
    readonly context: BirthRunContext;
  },
): Promise<void> {
  const { claimId, verdict } = args;
  await trx
    .insertInto("confidence_assessments")
    .values({
      confidence_assessment_id: uuidv7(),
      claim_id: claimId,
      status: verdict.status,
      rationale: verdict.rationale,
      evidence_set_hash: evidenceSetHash([...args.evidenceIds]),
      assessment_method: args.method,
      assessment_version: args.version,
      human_review_required: verdict.human_review_required,
      review_status: "AUTO",
      assessed_at: new Date(),
    })
    .execute();
  const cited = new Set<string>();
  for (const list of args.lists) {
    if (cited.has(list.source_record_id)) continue;
    cited.add(list.source_record_id);
    const source = args.context.sources.get(list.source_id);
    if (source === undefined) throw new Error(`source ${list.source_id} was not loaded`);
    await trx
      .insertInto("citations")
      .values({
        citation_id: uuidv7(),
        source_id: source.source_id,
        source_record_id: list.source_record_id,
        title: source.name,
        publisher: source.publisher,
        publication_date: publicationDate(list),
        url_or_reference:
          list.source_url ?? source.homepage_or_reference_url ?? source.rights_url ?? "",
        supporting_locator: list.external_record_id ? `resource:${list.external_record_id}` : null,
        accessed_at: list.retrieved_at,
        rights_profile_id: source.rights_profile_id,
        claim_id: claimId,
      })
      .execute();
  }
}

type Tally = {
  derived: number;
  existing: number;
  refused: Partial<Record<BirthClaimRefusal, number>>;
};

/** Register-wide tallies of {@link deriveAllBirthNames}. */
export interface BirthNameRunTally {
  /** Names with at least one count on an active list, flagged ones included. */
  readonly names: number;
  /** Names flagged for review: no claim written (ADR-0032 §4). */
  readonly flagged: number;
  readonly count: Tally;
  readonly rank: Tally;
  readonly trend: Tally & {
    /** Derived and existing trend claims by sex and direction. */
    readonly directions: Record<BirthListSex, Record<BirthTrendDirection, number>>;
  };
  /** The years compared, by sex. */
  readonly trend_years: Partial<Record<BirthListSex, { latest: number; earlier: number | null }>>;
}

export interface BirthNameRunOptions {
  readonly concurrency?: number;
  readonly batchSize?: number;
  readonly limit?: number;
  readonly onProgress?: (names: number) => void;
}

function newTally(): Tally {
  return { derived: 0, existing: 0, refused: {} };
}

function record(tally: Tally, outcome: BirthClaimOutcome): void {
  if (outcome.kind === "REFUSED") {
    tally.refused[outcome.reason] = (tally.refused[outcome.reason] ?? 0) + 1;
  } else if (outcome.kind === "DERIVED") tally.derived += 1;
  else tally.existing += 1;
}

/**
 * Derives every claim for every given name that has a count on an active
 * list, in `given_name_id` order, `concurrency` names at once. Idempotent: a
 * second run finds every claim standing and writes nothing.
 */
export async function deriveAllBirthNames(
  db: Kysely<DB>,
  options: BirthNameRunOptions = {},
): Promise<BirthNameRunTally> {
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const batchSize = options.batchSize ?? 500;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const context = await loadBirthRunContext(db);
  const count = newTally();
  const rank = newTally();
  const trend = {
    ...newTally(),
    directions: {
      MALE: { RISING: 0, STEADY: 0, FALLING: 0 },
      FEMALE: { RISING: 0, STEADY: 0, FALLING: 0 },
    },
  };
  let names = 0;
  let flagged = 0;
  let after = "00000000-0000-0000-0000-000000000000";

  while (names < limit) {
    const batch = await db
      .selectFrom("given_names as g")
      .select(["g.given_name_id", "g.canonical_display", "g.form_review"])
      .where("g.given_name_id", ">", after)
      .where(({ exists, selectFrom }) =>
        exists(
          selectFrom("given_name_birth_counts as c")
            .select("c.given_name_id")
            .whereRef("c.given_name_id", "=", "g.given_name_id"),
        ),
      )
      .orderBy("g.given_name_id")
      .limit(Math.min(batchSize, limit - names))
      .execute();
    if (batch.length === 0) break;
    after = batch[batch.length - 1]?.given_name_id ?? after;

    let next = 0;
    const worker = async () => {
      for (let i = next++; i < batch.length; i = next++) {
        const row = batch[i];
        if (row === undefined) continue;
        if (row.form_review !== null) {
          flagged += 1;
          continue;
        }
        const outcome = await deriveBirthNameById(
          db,
          row.given_name_id,
          row.canonical_display,
          context,
        );
        for (const list of outcome.lists) {
          record(count, list.count_claim);
          record(rank, list.rank);
          if (list.trend === undefined) continue;
          record(trend, list.trend);
          if (list.trend.direction !== undefined) {
            trend.directions[list.sex][list.trend.direction] += 1;
          }
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    names += batch.length;
    options.onProgress?.(names);
  }

  const trendYears: BirthNameRunTally["trend_years"] = {};
  for (const [sex, list] of context.latest) {
    trendYears[sex] = {
      latest: list.birth_year,
      earlier: context.earlier.get(sex)?.birth_year ?? null,
    };
  }
  return { names, flagged, count, rank, trend, trend_years: trendYears };
}
