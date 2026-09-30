/**
 * `CURRENT_RANK` derivation — the first derived claim (TASK-009 §5).
 *
 *   Surname → DistributionSnapshot/Value → COMPLETENESS GATE → rank
 *           → derived EvidenceItem → EvidenceDependency(COUNT, UNIVERSE)
 *           → Claim → ClaimEvidence → ConfidenceAssessment → Citation
 *
 * Three things distinguish this from TASK-005's source-native chain:
 *
 *   1. **The gate.** A rank over an incomplete universe is false even when the
 *      arithmetic is right, so `completeness.ts` must pass before anything is
 *      written. There is no option that skips it.
 *   2. **Two inputs, two roles.** A derived statistic depends on the subject's
 *      count *and* on the set it is ranked within. `evidence_dependencies`
 *      records both with an explicit role, which is what D-011 settled and
 *      what `ClaimEvidence` alone could not express.
 *   3. **One universe per resource version.** `DistributionSnapshot` is
 *      surname-scoped (`ARCHITECTURE.md` §10 invariant 3), so the ranked set
 *      is every snapshot sharing a `source_record_id`. The male and female
 *      resources are therefore separate universes, and because TASK-004 §14
 *      U-1 forbids summing them there is **no all-Poland rank** to derive.
 *
 * What this module never does: write a rank to `distribution_values.rank` (a
 * rank is a claim, not a column — invariant 10); mutate any source row
 * (invariant 6); merge or average across comparability groups; or let a rights
 * value reach a confidence value (invariant 2).
 */
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { NORMALIZATION_VERSION } from "@name-atlas/resolver";
import { assessDerivedStatistic, evidenceSetHash, isValidCombination } from "./confidence.js";
import { evaluateAllSurfaces } from "./rights.js";
import type { EffectiveRights } from "./rights.js";
import { loadSourceContext, prepareDerivation } from "./universe.js";
import type { DerivationSourceContext, UniverseCandidate, UniverseSizeCache } from "./universe.js";
import { TruthInvariantError } from "./derive.js";
import {
  CURRENT_RANK_METHOD_VERSION,
  RANK_CONFIDENCE_ASSESSMENT_METHOD,
  RANK_CONFIDENCE_ASSESSMENT_VERSION,
  RANK_TIES_POLICY,
  RANK_UNIVERSE_KIND,
  RUN_INPUT_SCHEMA_VERSION,
  WORKFLOW_VERSION,
} from "./version.js";
import type {
  CanonicalSurnameIdentity,
  CurrentRankClaimResult,
  SurnameRankResult,
} from "./result.js";

const COUNTRY_CODE = "PL";

/**
 * Stable semantic identity for a rank claim. Keyed on the **source record**,
 * not the snapshot, because the rank is a property of the surname's position
 * within that resource version.
 */
export function currentRankClaimKey(surnameId: string, sourceRecordId: string): string {
  return `CURRENT_RANK|${surnameId}|${sourceRecordId}`;
}

/**
 * Competition rank: one plus the number of surnames in the same universe with
 * a strictly greater count. Ties therefore share a rank and the next distinct
 * count skips — 1, 2, 2, 4 (`RANK_TIES_POLICY`).
 *
 * Computed by the database rather than by sorting in memory, so the result
 * cannot depend on row order (AC-10) and a 408,182-row universe costs one
 * indexed aggregate rather than a full materialisation.
 *
 * Given a {@link RankTableCache}, the universe is aggregated once per source
 * record and every later rank is a lookup. Without one, each call counts
 * afresh, which is right for a single page and ruinous for a batch: the
 * uncached count is a hash join over the whole universe, measured at 2.0
 * surnames/s against the real register.
 */
export async function competitionRank(
  db: Kysely<DB>,
  sourceRecordId: string,
  count: number,
  cache?: RankTableCache,
): Promise<number> {
  if (cache) {
    let table = cache.get(sourceRecordId);
    if (!table) {
      table = await loadRankTable(db, sourceRecordId);
      cache.set(sourceRecordId, table);
    }
    return rankInTable(table, count);
  }
  const row = await db
    .selectFrom("distribution_snapshots as s")
    .innerJoin(
      "distribution_values as v",
      "v.distribution_snapshot_id",
      "s.distribution_snapshot_id",
    )
    .select((eb) => eb.fn.countAll<string>().as("greater"))
    .where("s.source_record_id", "=", sourceRecordId)
    .where("v.place_id", "is", null)
    .where("v.count", ">", count as unknown as never)
    .executeTakeFirstOrThrow();
  return Number(row.greater) + 1;
}

/**
 * One universe's national counts as a histogram: distinct counts in strictly
 * descending order, and for each, how many surnames have a strictly greater
 * count. A register of 408,182 surnames has far fewer distinct counts, so the
 * table is small and a rank is a binary search over it.
 */
export interface RankTable {
  readonly counts: readonly number[];
  readonly greater: readonly number[];
  /** Every surname in the universe. */
  readonly total: number;
}

/**
 * A run-scoped memo of {@link RankTable}s by source record. Scoped to the run
 * for the same reason as `UniverseSizeCache`: it is only true once an import
 * has finished, and `deriveCurrentRank` consults it only after the
 * completeness gate has said the import is complete.
 */
export type RankTableCache = Map<string, RankTable>;

/** Builds a {@link RankTable} from (count, frequency) pairs in any order. */
export function buildRankTable(
  rows: readonly { readonly count: number; readonly frequency: number }[],
): RankTable {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const counts: number[] = [];
  const greater: number[] = [];
  let above = 0;
  for (const { count, frequency } of sorted) {
    if (counts.length > 0 && counts[counts.length - 1] === count) {
      throw new TruthInvariantError(
        "RANK_TABLE_DUPLICATE_COUNT",
        `rank table: count ${count} appears twice`,
      );
    }
    counts.push(count);
    greater.push(above);
    above += frequency;
  }
  return { counts, greater, total: above };
}

/** One plus the number of surnames with a strictly greater count. */
export function rankInTable(table: RankTable, count: number): number {
  // First index whose count is not strictly greater than `count`.
  let lo = 0;
  let hi = table.counts.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((table.counts[mid] as number) > count) lo = mid + 1;
    else hi = mid;
  }
  // Past the end, every surname's count is strictly greater.
  return (lo === table.counts.length ? table.total : (table.greater[lo] as number)) + 1;
}

async function loadRankTable(db: Kysely<DB>, sourceRecordId: string): Promise<RankTable> {
  const rows = await db
    .selectFrom("distribution_snapshots as s")
    .innerJoin(
      "distribution_values as v",
      "v.distribution_snapshot_id",
      "s.distribution_snapshot_id",
    )
    .select((eb) => ["v.count", eb.fn.countAll<string>().as("frequency")])
    .where("s.source_record_id", "=", sourceRecordId)
    .where("v.place_id", "is", null)
    .groupBy("v.count")
    .execute();
  return buildRankTable(
    rows.map((r) => ({ count: Number(r.count), frequency: Number(r.frequency) })),
  );
}

export interface DeriveRankOptions {
  /** Overridable so tests can exercise a restrictive rights posture. */
  readonly rightsOverride?: EffectiveRights;
  /** Run-scoped memo for the completeness counts. See `UniverseSizeCache`. */
  readonly universeSizeCache?: UniverseSizeCache;
  /** Run-scoped memo for the rank lookup. See {@link RankTableCache}. */
  readonly rankTableCache?: RankTableCache;
}

/**
 * Derives (or re-reads) the `CURRENT_RANK` chain for one raw surname input.
 *
 * Returns `INCOMPLETE_UNIVERSE` and writes nothing when no resource version
 * backing the surname is complete. That is the common case against the
 * repository's committed fixtures, and it is the correct outcome.
 */
export async function deriveCurrentRank(
  db: Kysely<DB>,
  rawInput: string,
  options: DeriveRankOptions = {},
): Promise<SurnameRankResult> {
  const prepared = await prepareDerivation(db, rawInput, options.universeSizeCache);
  if (prepared.kind === "NO_RESULT") {
    return prepared;
  }
  const { status, surname, complete } = prepared;

  const source = await loadSourceContext(db, complete[0]?.candidate.source_id ?? "");
  const surfaceEligibility = evaluateAllSurfaces(options.rightsOverride ?? source.rights);

  const claims: CurrentRankClaimResult[] = [];
  for (const { candidate, verdict } of complete) {
    const rank = await competitionRank(
      db,
      candidate.source_record_id,
      candidate.count,
      options.rankTableCache,
    );
    claims.push(
      await db
        .transaction()
        .execute(async (trx) =>
          deriveOneRank(trx, surname, candidate, source, rank, verdict.universeSize),
        ),
    );
  }

  return {
    kind: "RESULT",
    resolution_status: status,
    surname,
    current_rank: claims,
    surface_eligibility: surfaceEligibility,
  };
}

async function deriveOneRank(
  trx: Transaction<DB>,
  surname: CanonicalSurnameIdentity,
  candidate: UniverseCandidate,
  source: DerivationSourceContext,
  rank: number,
  universeSizeValue: number,
): Promise<CurrentRankClaimResult> {
  if (!candidate.as_of_date) {
    throw new TruthInvariantError(
      "MISSING_SNAPSHOT_DATE",
      `snapshot ${candidate.distribution_snapshot_id} has no as_of_date; a derived value may ` +
        "never be presented without its dataset date (ARCHITECTURE.md §10 invariant 5)",
    );
  }
  if (!Number.isInteger(rank) || rank < 1 || rank > universeSizeValue) {
    throw new TruthInvariantError(
      "RANK_OUT_OF_RANGE",
      `computed rank ${rank} is not within 1..${universeSizeValue}`,
    );
  }

  const claimKey = currentRankClaimKey(surname.surname_id, candidate.source_record_id);

  const existing = await trx
    .selectFrom("claims")
    .select(["claim_id", "method_version"])
    .where("claim_key", "=", claimKey)
    .where("claim_status", "=", "ACTIVE")
    .execute();
  if (existing.length > 1) {
    throw new TruthInvariantError(
      "CONFLICTING_ACTIVE_CLAIMS",
      `${existing.length} active claims share claim_key ${claimKey}`,
    );
  }
  const existingClaim = existing[0];
  if (existingClaim) {
    return projectRank(trx, existingClaim.claim_id, candidate, source, universeSizeValue);
  }

  // --- The upstream count evidence this rank depends on --------------------
  // TASK-005's chain already created it if CURRENT_POPULATION was derived.
  // Reused rather than duplicated: the same observation must not exist twice.
  const countEvidence = await trx
    .selectFrom("evidence_items")
    .select(["evidence_item_id", "verification_status"])
    .where("subject_entity_id", "=", surname.surname_id)
    .where("source_record_id", "=", candidate.source_record_id)
    .where("evidence_type", "=", "OFFICIAL_DATASET_FIELD")
    .orderBy("created_at")
    .executeTakeFirst();
  if (!countEvidence) {
    throw new TruthInvariantError(
      "MISSING_UPSTREAM_COUNT_EVIDENCE",
      `no OFFICIAL_DATASET_FIELD evidence exists for surname ${surname.surname_id} against ` +
        `source record ${candidate.source_record_id}; derive CURRENT_POPULATION first, because a ` +
        "derived statistic may not invent the input it depends on",
    );
  }

  const runId = uuidv7();
  await trx
    .insertInto("research_runs")
    .values({
      research_run_id: runId,
      run_type: "BASIC_SURNAME",
      surname_id: surname.surname_id,
      raw_input: JSON.stringify({ surname_id: surname.surname_id, claim_key: claimKey }),
      input_schema_version: RUN_INPUT_SCHEMA_VERSION,
      workflow_version: WORKFLOW_VERSION,
      connector_manifest: JSON.stringify({ source_id: source.source_id, source_name: source.name }),
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

  // --- The universe evidence: what set the rank is within ------------------
  // A separate item, because it is a separate observation with its own
  // locator. §30 names it as one of the two inputs a derived statistic
  // depends on, and the dependency role below records which is which.
  const universeEvidenceId = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: universeEvidenceId,
      evidence_type: "AUTHORITATIVE_INDEX",
      source_record_id: candidate.source_record_id,
      subject_entity_id: null,
      structured_value: JSON.stringify({
        universe_kind: RANK_UNIVERSE_KIND,
        universe_size: universeSizeValue,
        source_record_id: candidate.source_record_id,
        external_record_id: candidate.external_record_id,
        comparability_group: candidate.comparability_group,
        completeness_basis: "registry official_sha256 and official_row_count both matched",
      }),
      raw_excerpt: null,
      supporting_locator: `source_record:${candidate.source_record_id}`,
      verification_status: "VERIFIED",
      derivation_method: null,
      derivation_version: null,
      created_by_run_id: runId,
    })
    .execute();

  // --- The derived evidence item ------------------------------------------
  const derivedEvidenceId = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: derivedEvidenceId,
      evidence_type: "DERIVED_STATISTIC",
      source_record_id: candidate.source_record_id,
      subject_entity_id: surname.surname_id,
      structured_value: JSON.stringify({
        rank,
        count: candidate.count,
        universe_size: universeSizeValue,
        ties_policy: RANK_TIES_POLICY,
        algorithm_version: CURRENT_RANK_METHOD_VERSION,
      }),
      raw_excerpt: null,
      supporting_locator: `source_record:${candidate.source_record_id}`,
      verification_status: "VERIFIED",
      // Required by the CHECK on evidence_items for DERIVED_STATISTIC.
      derivation_method: "competition_rank_over_source_record_national_values",
      derivation_version: CURRENT_RANK_METHOD_VERSION,
      created_by_run_id: runId,
    })
    .execute();

  // --- EvidenceDependency: the lineage §30 requires (D-011, Option A) -----
  for (const [dependsOn, role] of [
    [countEvidence.evidence_item_id, "COUNT"],
    [universeEvidenceId, "UNIVERSE"],
  ] as const) {
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

  // --- Claim ---------------------------------------------------------------
  const claimId = uuidv7();
  await trx
    .insertInto("claims")
    .values({
      claim_id: claimId,
      claim_key: claimKey,
      claim_type: "CURRENT_RANK",
      epistemic_type: "FACT",
      scope: "SURNAME_LEVEL",
      subject_entity_id: surname.surname_id,
      object_entity_id: null,
      // The payload carries its universe, not just a number: a bare rank is
      // unreadable and a rank without its ties policy is ambiguous.
      structured_value: JSON.stringify({
        rank,
        count: candidate.count,
        universe: {
          kind: RANK_UNIVERSE_KIND,
          size: universeSizeValue,
          source_record_id: candidate.source_record_id,
          external_record_id: candidate.external_record_id,
          comparability_group: candidate.comparability_group,
        },
        ties_policy: RANK_TIES_POLICY,
        algorithm_version: CURRENT_RANK_METHOD_VERSION,
        country_code: COUNTRY_CODE,
        snapshot_date: candidate.as_of_date,
        source_population_scope: candidate.universe_description,
      }),
      statement_key: null,
      claim_status: "ACTIVE",
      supersedes_claim_id: null,
      created_by_run_id: runId,
      method_version: CURRENT_RANK_METHOD_VERSION,
    })
    .execute();

  await trx
    .insertInto("claim_evidence")
    .values({
      claim_id: claimId,
      evidence_item_id: derivedEvidenceId,
      relationship: "SUPPORTS",
      reason_code: "DERIVED_RANK_OVER_COMPLETE_RESOURCE_VERSION",
      notes: null,
    })
    .execute();

  // --- ConfidenceAssessment: the derived-statistic rule -------------------
  const verdict = assessDerivedStatistic({
    computationReproducible: true,
    inputsComplete: true,
    upstreamEvidenceVerified: countEvidence.verification_status === "VERIFIED",
    noMaterialConflict: true,
  });
  if (!isValidCombination(verdict.epistemic_type, verdict.status)) {
    throw new TruthInvariantError(
      "INVALID_EPISTEMIC_COMBINATION",
      `(${verdict.epistemic_type}, ${verdict.status}) is not permitted by docs/canonical/11 §12.3`,
    );
  }
  await trx
    .insertInto("confidence_assessments")
    .values({
      confidence_assessment_id: uuidv7(),
      claim_id: claimId,
      status: verdict.status,
      rationale: verdict.rationale,
      // Hashes the full input set, derived item included, so changing any
      // input changes the hash.
      evidence_set_hash: evidenceSetHash([
        derivedEvidenceId,
        countEvidence.evidence_item_id,
        universeEvidenceId,
      ]),
      assessment_method: RANK_CONFIDENCE_ASSESSMENT_METHOD,
      assessment_version: RANK_CONFIDENCE_ASSESSMENT_VERSION,
      human_review_required: verdict.human_review_required,
      review_status: "AUTO",
      assessed_at: new Date(),
    })
    .execute();

  // --- Citation ------------------------------------------------------------
  const sourceRecord = await trx
    .selectFrom("source_records")
    .select(["source_url", "retrieved_at", "external_record_id"])
    .where("source_record_id", "=", candidate.source_record_id)
    .executeTakeFirstOrThrow();

  await trx
    .insertInto("citations")
    .values({
      citation_id: uuidv7(),
      source_id: source.source_id,
      source_record_id: candidate.source_record_id,
      title: source.name,
      publisher: source.publisher,
      publication_date: candidate.as_of_date,
      url_or_reference:
        sourceRecord.source_url ?? source.homepage_or_reference_url ?? source.rights_url ?? "",
      supporting_locator: sourceRecord.external_record_id
        ? `resource:${sourceRecord.external_record_id}`
        : null,
      accessed_at: sourceRecord.retrieved_at,
      rights_profile_id: source.rights_profile_id,
      claim_id: claimId,
    })
    .execute();

  await trx
    .updateTable("research_runs")
    .set({ run_status: "COMPLETE", qa_status: "PASS", completed_at: new Date() })
    .where("research_run_id", "=", runId)
    .execute();

  return projectRank(trx, claimId, candidate, source, universeSizeValue);
}

/** Reads a persisted rank claim back out as the developer-facing projection. */
async function projectRank(
  trx: Transaction<DB>,
  claimId: string,
  candidate: UniverseCandidate,
  source: DerivationSourceContext,
  universeSizeValue: number,
): Promise<CurrentRankClaimResult> {
  const claim = await trx
    .selectFrom("claims")
    .select(["claim_id", "claim_key", "method_version", "structured_value"])
    .where("claim_id", "=", claimId)
    .executeTakeFirstOrThrow();

  const payload =
    (typeof claim.structured_value === "string"
      ? (JSON.parse(claim.structured_value) as Record<string, unknown>)
      : (claim.structured_value as Record<string, unknown>)) ?? {};

  const assessment = await trx
    .selectFrom("confidence_assessments")
    .select([
      "status",
      "rationale",
      "assessment_method",
      "assessment_version",
      "human_review_required",
    ])
    .where("claim_id", "=", claimId)
    .orderBy("assessed_at", "desc")
    .executeTakeFirst();
  if (!assessment) {
    throw new TruthInvariantError(
      "CLAIM_WITHOUT_CONFIDENCE",
      `claim ${claimId} has no confidence assessment`,
    );
  }

  const citation = await trx
    .selectFrom("citations")
    .select([
      "citation_id",
      "title",
      "publisher",
      "publication_date",
      "url_or_reference",
      "supporting_locator",
      "accessed_at",
    ])
    .where("claim_id", "=", claimId)
    .executeTakeFirst();
  if (!citation) {
    throw new TruthInvariantError("CLAIM_WITHOUT_CITATION", `claim ${claimId} has no citation`);
  }

  return {
    claim_id: claim.claim_id,
    claim_key: claim.claim_key,
    rank: Number(payload["rank"]),
    universe: {
      kind: RANK_UNIVERSE_KIND,
      size: universeSizeValue,
      source_record_id: candidate.source_record_id,
      external_record_id: candidate.external_record_id,
      comparability_group: candidate.comparability_group,
    },
    count: candidate.count,
    ties_policy: RANK_TIES_POLICY,
    algorithm_version: CURRENT_RANK_METHOD_VERSION,
    snapshot_date: candidate.as_of_date ?? "",
    country_code: COUNTRY_CODE,
    source_population_scope: candidate.universe_description,
    coverage_notes: candidate.coverage_notes,
    method_version: claim.method_version,
    confidence: {
      status: assessment.status,
      rationale: assessment.rationale,
      assessment_method: assessment.assessment_method,
      assessment_version: assessment.assessment_version,
      human_review_required: assessment.human_review_required,
    },
    citation: {
      citation_id: citation.citation_id,
      title: citation.title,
      publisher: citation.publisher,
      publication_date: citation.publication_date,
      url_or_reference: citation.url_or_reference,
      supporting_locator: citation.supporting_locator,
      accessed_at: citation.accessed_at ? citation.accessed_at.toISOString() : null,
      attribution: source.attribution_text,
      terms_version: source.terms_version,
    },
  };
}
