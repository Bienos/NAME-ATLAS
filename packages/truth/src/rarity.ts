/**
 * `RARITY_CONTEXT` — the third claim, "about 1 in X" (TASK-014, U-6).
 *
 * The denominator is the **published universe**: the sum of every published
 * count on one complete resource version. It is exact and derivable, and it
 * is what U-6 decided on 2026-09-20. It is not the register's living-person
 * total (unknown: single-bearer surnames are excluded from publication and
 * the register holds emigrants) and never GUS resident population (a
 * different universe). Every figure therefore carries a label code that a
 * frontend renders as "of people counted in the register", never "of Poles".
 *
 * Same gate as the rank, same lineage discipline: a universe that is not
 * complete has no denominator, and the three inputs — count, denominator,
 * universe — are recorded by role. The two sex partitions are two universes
 * and two figures; nothing here sums them.
 */
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { NORMALIZATION_VERSION } from "@name-atlas/resolver";
import { assessDerivedStatistic, evidenceSetHash, isValidCombination } from "./confidence.js";
import { evaluateAllSurfaces } from "./rights.js";
import type { EffectiveRights } from "./rights.js";
import { TruthInvariantError } from "./derive.js";
import { currentRankClaimKey } from "./rank.js";
import { loadSourceContext, prepareDerivation } from "./universe.js";
import type { DerivationSourceContext, UniverseCandidate, UniverseSizeCache } from "./universe.js";
import {
  RANK_CONFIDENCE_ASSESSMENT_METHOD,
  RANK_CONFIDENCE_ASSESSMENT_VERSION,
  RANK_UNIVERSE_KIND,
  RARITY_CONTEXT_METHOD_VERSION,
  RARITY_DENOMINATOR_KIND,
  RARITY_DENOMINATOR_METHOD,
  RARITY_DENOMINATOR_VERSION,
  RARITY_ROUNDING,
  RARITY_UNIVERSE_LABEL_CODE,
  RUN_INPUT_SCHEMA_VERSION,
  WORKFLOW_VERSION,
} from "./version.js";
import type {
  CanonicalSurnameIdentity,
  RarityContextClaimResult,
  SurnameRarityResult,
} from "./result.js";

const COUNTRY_CODE = "PL";

/** One claim per (surname, resource version): the universe is the key. */
export function rarityContextClaimKey(surnameId: string, sourceRecordId: string): string {
  return `RARITY_CONTEXT|${surnameId}|${sourceRecordId}`;
}

/**
 * `denominator / count`, rounded half up to an integer. Pure and exported so
 * the rounding rule is testable on its own; `RARITY_ROUNDING` names it on
 * every claim.
 */
export function oneInX(count: number, denominator: number): number {
  if (!Number.isInteger(count) || count < 1) {
    throw new TruthInvariantError(
      "RARITY_BAD_COUNT",
      `count must be a positive integer, got ${count}`,
    );
  }
  if (!Number.isInteger(denominator) || denominator < count) {
    throw new TruthInvariantError(
      "RARITY_BAD_DENOMINATOR",
      `denominator must be an integer no smaller than the count, got ${denominator} for ${count}`,
    );
  }
  return Math.floor(denominator / count + 0.5);
}

/** `count / denominator` to nine decimal places. */
export function shareOf(count: number, denominator: number): number {
  return Number((count / denominator).toFixed(9));
}

/**
 * A run-scoped memo of published universe sums by source record. Scoped to the
 * run for the same reason as `UniverseSizeCache`: the sum is only true once an
 * import has finished, and `deriveRarityContext` asks for it only after the
 * completeness gate has said the import is complete. Against the real register
 * the sum takes 0.4–1.3 s and is identical for every surname in the resource.
 */
export type UniverseSumCache = Map<string, number>;

/** The published universe: the sum of every national value on this source record. */
export async function publishedUniverseSum(
  db: Kysely<DB>,
  sourceRecordId: string,
  cache?: UniverseSumCache,
): Promise<number> {
  const cached = cache?.get(sourceRecordId);
  if (cached !== undefined) return cached;
  const row = await db
    .selectFrom("distribution_snapshots as s")
    .innerJoin(
      "distribution_values as v",
      "v.distribution_snapshot_id",
      "s.distribution_snapshot_id",
    )
    .select((eb) => eb.fn.sum<string>("v.count").as("total"))
    .where("s.source_record_id", "=", sourceRecordId)
    .where("v.place_id", "is", null)
    .executeTakeFirstOrThrow();
  const total = Number(row.total);
  if (!Number.isSafeInteger(total) || total < 1) {
    throw new TruthInvariantError(
      "RARITY_EMPTY_UNIVERSE",
      `published universe sum for source record ${sourceRecordId} is ${row.total}`,
    );
  }
  cache?.set(sourceRecordId, total);
  return total;
}

/** The rank in the same universe, if `CURRENT_RANK` has been derived. Supporting, never required. */
async function supportingRank(
  db: Kysely<DB>,
  surnameId: string,
  sourceRecordId: string,
): Promise<number | null> {
  const claim = await db
    .selectFrom("claims")
    .select(["structured_value"])
    .where("claim_key", "=", currentRankClaimKey(surnameId, sourceRecordId))
    .where("claim_status", "=", "ACTIVE")
    .executeTakeFirst();
  if (!claim) return null;
  const payload =
    (typeof claim.structured_value === "string"
      ? (JSON.parse(claim.structured_value) as Record<string, unknown>)
      : (claim.structured_value as Record<string, unknown>)) ?? {};
  const rank = Number(payload["rank"]);
  return Number.isInteger(rank) && rank > 0 ? rank : null;
}

export interface DeriveRarityOptions {
  /** Overridable so tests can exercise a restrictive rights posture. */
  readonly rightsOverride?: EffectiveRights;
  /** Run-scoped memo for the completeness counts. See `UniverseSizeCache`. */
  readonly universeSizeCache?: UniverseSizeCache;
  /** Run-scoped memo for the denominator. See {@link UniverseSumCache}. */
  readonly universeSumCache?: UniverseSumCache;
}

/**
 * Derives (or re-reads) the `RARITY_CONTEXT` chain for one raw surname input.
 *
 * Refuses, writing nothing, exactly where the rank refuses: no complete
 * universe means no denominator. Against the committed fixtures that is the
 * expected outcome.
 */
export async function deriveRarityContext(
  db: Kysely<DB>,
  rawInput: string,
  options: DeriveRarityOptions = {},
): Promise<SurnameRarityResult> {
  const prepared = await prepareDerivation(db, rawInput, options.universeSizeCache);
  if (prepared.kind === "NO_RESULT") {
    return prepared;
  }
  const { status, surname, complete } = prepared;

  const source = await loadSourceContext(db, complete[0]?.candidate.source_id ?? "");
  const surfaceEligibility = evaluateAllSurfaces(options.rightsOverride ?? source.rights);

  const claims: RarityContextClaimResult[] = [];
  for (const { candidate, verdict } of complete) {
    const denominator = await publishedUniverseSum(
      db,
      candidate.source_record_id,
      options.universeSumCache,
    );
    const rank = await supportingRank(db, surname.surname_id, candidate.source_record_id);
    claims.push(
      await db
        .transaction()
        .execute(async (trx) =>
          deriveOneRarity(trx, surname, candidate, source, denominator, verdict.universeSize, rank),
        ),
    );
  }

  return {
    kind: "RESULT",
    resolution_status: status,
    surname,
    rarity_context: claims,
    surface_eligibility: surfaceEligibility,
  };
}

async function deriveOneRarity(
  trx: Transaction<DB>,
  surname: CanonicalSurnameIdentity,
  candidate: UniverseCandidate,
  source: DerivationSourceContext,
  denominator: number,
  universeSizeValue: number,
  rank: number | null,
): Promise<RarityContextClaimResult> {
  if (!candidate.as_of_date) {
    throw new TruthInvariantError(
      "MISSING_SNAPSHOT_DATE",
      `snapshot ${candidate.distribution_snapshot_id} has no as_of_date; a derived value may ` +
        "never be presented without its dataset date (ARCHITECTURE.md §10 invariant 5)",
    );
  }
  const x = oneInX(candidate.count, denominator);
  const share = shareOf(candidate.count, denominator);

  const claimKey = rarityContextClaimKey(surname.surname_id, candidate.source_record_id);
  const existing = await trx
    .selectFrom("claims")
    .select(["claim_id"])
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
    return projectRarity(trx, existingClaim.claim_id, candidate, source, universeSizeValue, rank);
  }

  // --- Upstream count evidence: reused from TASK-005, never re-observed ----
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

  // --- Universe evidence: the set, as the rank records it ------------------
  // Reused when the rank already established this universe; otherwise
  // created with the same shape, so the two claims cite one observation.
  const priorUniverse = await trx
    .selectFrom("evidence_items")
    .select(["evidence_item_id"])
    .where("source_record_id", "=", candidate.source_record_id)
    .where("evidence_type", "=", "AUTHORITATIVE_INDEX")
    .where("subject_entity_id", "is", null)
    .orderBy("created_at")
    .executeTakeFirst();
  let universeEvidenceId = priorUniverse?.evidence_item_id;
  if (!universeEvidenceId) {
    universeEvidenceId = uuidv7();
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
  }

  // --- Denominator evidence: the published-universe sum, derived ----------
  const denominatorEvidenceId = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: denominatorEvidenceId,
      evidence_type: "DERIVED_STATISTIC",
      source_record_id: candidate.source_record_id,
      subject_entity_id: null,
      structured_value: JSON.stringify({
        denominator,
        denominator_kind: RARITY_DENOMINATOR_KIND,
        universe_size: universeSizeValue,
        source_record_id: candidate.source_record_id,
        external_record_id: candidate.external_record_id,
        comparability_group: candidate.comparability_group,
        basis: "SUM(count) over the source record's national values",
      }),
      raw_excerpt: null,
      supporting_locator: `source_record:${candidate.source_record_id}`,
      verification_status: "VERIFIED",
      derivation_method: RARITY_DENOMINATOR_METHOD,
      derivation_version: RARITY_DENOMINATOR_VERSION,
      created_by_run_id: runId,
    })
    .execute();
  await trx
    .insertInto("evidence_dependencies")
    .values({
      evidence_dependency_id: uuidv7(),
      derived_evidence_item_id: denominatorEvidenceId,
      depends_on_evidence_item_id: universeEvidenceId,
      dependency_role: "UNIVERSE",
    })
    .execute();

  // --- The derived evidence item: one in X -------------------------------
  const derivedEvidenceId = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: derivedEvidenceId,
      evidence_type: "DERIVED_STATISTIC",
      source_record_id: candidate.source_record_id,
      subject_entity_id: surname.surname_id,
      structured_value: JSON.stringify({
        one_in_x: x,
        numerator: candidate.count,
        denominator,
        share,
        rounding: RARITY_ROUNDING,
        algorithm_version: RARITY_CONTEXT_METHOD_VERSION,
      }),
      raw_excerpt: null,
      supporting_locator: `source_record:${candidate.source_record_id}`,
      verification_status: "VERIFIED",
      derivation_method: "one_in_x_over_published_universe_sum",
      derivation_version: RARITY_CONTEXT_METHOD_VERSION,
      created_by_run_id: runId,
    })
    .execute();

  // --- Lineage: three inputs, three roles (docs/canonical/14 §30) --------
  for (const [dependsOn, role] of [
    [countEvidence.evidence_item_id, "COUNT"],
    [denominatorEvidenceId, "DENOMINATOR"],
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
      claim_type: "RARITY_CONTEXT",
      epistemic_type: "FACT",
      scope: "SURNAME_LEVEL",
      subject_entity_id: surname.surname_id,
      object_entity_id: null,
      structured_value: JSON.stringify({
        one_in_x: x,
        numerator: candidate.count,
        denominator,
        denominator_kind: RARITY_DENOMINATOR_KIND,
        universe_label_code: RARITY_UNIVERSE_LABEL_CODE,
        share,
        rounding: RARITY_ROUNDING,
        universe: {
          kind: RANK_UNIVERSE_KIND,
          size: universeSizeValue,
          source_record_id: candidate.source_record_id,
          external_record_id: candidate.external_record_id,
          comparability_group: candidate.comparability_group,
        },
        supporting_rank: rank,
        algorithm_version: RARITY_CONTEXT_METHOD_VERSION,
        country_code: COUNTRY_CODE,
        snapshot_date: candidate.as_of_date,
        source_population_scope: candidate.universe_description,
        distribution_snapshot_id: candidate.distribution_snapshot_id,
      }),
      statement_key: null,
      claim_status: "ACTIVE",
      supersedes_claim_id: null,
      created_by_run_id: runId,
      method_version: RARITY_CONTEXT_METHOD_VERSION,
    })
    .execute();

  await trx
    .insertInto("claim_evidence")
    .values({
      claim_id: claimId,
      evidence_item_id: derivedEvidenceId,
      relationship: "SUPPORTS",
      reason_code: "DERIVED_RARITY_OVER_PUBLISHED_UNIVERSE",
      notes: null,
    })
    .execute();

  // --- Confidence: the derived-statistic rule, unchanged -------------------
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
      evidence_set_hash: evidenceSetHash([
        derivedEvidenceId,
        countEvidence.evidence_item_id,
        denominatorEvidenceId,
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

  return projectRarity(trx, claimId, candidate, source, universeSizeValue, rank);
}

/** Reads a persisted rarity claim back out as the developer-facing projection. */
async function projectRarity(
  trx: Transaction<DB>,
  claimId: string,
  candidate: UniverseCandidate,
  source: DerivationSourceContext,
  universeSizeValue: number,
  rank: number | null,
): Promise<RarityContextClaimResult> {
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
    one_in_x: Number(payload["one_in_x"]),
    numerator: Number(payload["numerator"]),
    denominator: Number(payload["denominator"]),
    denominator_kind: String(payload["denominator_kind"]),
    universe_label_code: String(payload["universe_label_code"]),
    share: Number(payload["share"]),
    rounding: String(payload["rounding"]),
    universe: {
      kind: RANK_UNIVERSE_KIND,
      size: universeSizeValue,
      source_record_id: candidate.source_record_id,
      external_record_id: candidate.external_record_id,
      comparability_group: candidate.comparability_group,
    },
    supporting_rank: rank,
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
