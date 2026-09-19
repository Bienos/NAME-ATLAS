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
import { NORMALIZATION_VERSION, resolveSurname } from "@name-atlas/resolver";
import { findPeselResource } from "@name-atlas/sources";
import { assessDerivedStatistic, evidenceSetHash, isValidCombination } from "./confidence.js";
import { assessUniverseCompleteness } from "./completeness.js";
import type { CompletenessVerdict } from "./completeness.js";
import { evaluateAllSurfaces } from "./rights.js";
import type { EffectiveRights } from "./rights.js";
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

interface RankCandidate {
  readonly distribution_snapshot_id: string;
  readonly distribution_value_id: string;
  readonly source_record_id: string;
  readonly source_id: string;
  readonly external_record_id: string | null;
  readonly content_hash: string;
  readonly count: number;
  readonly as_of_date: string | null;
  readonly universe_description: string;
  readonly coverage_notes: string | null;
  readonly comparability_group: string | null;
}

async function loadCandidates(db: Kysely<DB>, surnameId: string): Promise<RankCandidate[]> {
  const rows = await db
    .selectFrom("distribution_snapshots as s")
    .innerJoin(
      "distribution_values as v",
      "v.distribution_snapshot_id",
      "s.distribution_snapshot_id",
    )
    .innerJoin("source_records as sr", "sr.source_record_id", "s.source_record_id")
    .select([
      "s.distribution_snapshot_id",
      "v.distribution_value_id",
      "s.source_record_id",
      "s.source_id",
      "sr.external_record_id",
      "sr.content_hash",
      "v.count",
      "s.universe_description",
      "s.coverage_notes",
      "s.comparability_group",
    ])
    .select((eb) =>
      eb.fn<string | null>("to_char", ["s.as_of_date", eb.val("YYYY-MM-DD")]).as("as_of_date"),
    )
    .where("s.surname_id", "=", surnameId)
    .where("v.place_id", "is", null)
    .orderBy("s.source_record_id")
    .execute();

  return rows.map((row) => ({
    distribution_snapshot_id: row.distribution_snapshot_id,
    distribution_value_id: row.distribution_value_id,
    source_record_id: row.source_record_id,
    source_id: row.source_id,
    external_record_id: row.external_record_id,
    content_hash: row.content_hash,
    count: Number(row.count),
    as_of_date: row.as_of_date,
    universe_description: row.universe_description,
    coverage_notes: row.coverage_notes,
    comparability_group: row.comparability_group,
  }));
}

/** How many surnames have a national value against this source record. */
async function universeSize(db: Kysely<DB>, sourceRecordId: string): Promise<number> {
  const row = await db
    .selectFrom("distribution_snapshots as s")
    .innerJoin(
      "distribution_values as v",
      "v.distribution_snapshot_id",
      "s.distribution_snapshot_id",
    )
    .select((eb) => eb.fn.countAll<string>().as("n"))
    .where("s.source_record_id", "=", sourceRecordId)
    .where("v.place_id", "is", null)
    .executeTakeFirstOrThrow();
  return Number(row.n);
}

/**
 * Competition rank: one plus the number of surnames in the same universe with
 * a strictly greater count. Ties therefore share a rank and the next distinct
 * count skips — 1, 2, 2, 4 (`RANK_TIES_POLICY`).
 *
 * Computed by the database rather than by sorting in memory, so the result
 * cannot depend on row order (AC-10) and a 408,182-row universe costs one
 * indexed aggregate rather than a full materialisation.
 */
async function competitionRank(
  db: Kysely<DB>,
  sourceRecordId: string,
  count: number,
): Promise<number> {
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

export interface DeriveRankOptions {
  /** Overridable so tests can exercise a restrictive rights posture. */
  readonly rightsOverride?: EffectiveRights;
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
  const lookup = await resolveSurname(db, rawInput);

  if (lookup.kind === "LOOKUP_FAILED") {
    return {
      kind: "NO_RESULT",
      reason: "LOOKUP_FAILED",
      resolution_status: "LOOKUP_FAILED",
      surname: null,
      message: `resolution lookup failed at ${lookup.stage}`,
    };
  }

  const resolution = lookup.resolution;
  const status = resolution.resolution_status;

  if (resolution.outcome === "INVALID_INPUT") {
    return {
      kind: "NO_RESULT",
      reason: "INVALID_INPUT",
      resolution_status: status,
      surname: null,
      message: `input rejected by validation: ${status}`,
    };
  }
  if (status === "MULTIPLE_EXACT" || status === "REVIEW_REQUIRED") {
    return {
      kind: "NO_RESULT",
      reason: "AMBIGUOUS",
      resolution_status: status,
      surname: null,
      message: "resolution is ambiguous or requires review; no candidate was selected",
    };
  }
  // EXACT only, as TASK-005 §15 U-5 settled for the population chain.
  if (status !== "EXACT" || !resolution.resolved_surname_id) {
    return {
      kind: "NO_RESULT",
      reason: "UNRESOLVED",
      resolution_status: status,
      surname: null,
      message: "input did not resolve exactly to a canonical surname",
    };
  }

  const surnameId = resolution.resolved_surname_id;
  const surnameRow = await db
    .selectFrom("surnames")
    .select(["surname_id", "canonical_display", "canonical_key", "primary_script"])
    .where("surname_id", "=", surnameId)
    .executeTakeFirst();
  if (!surnameRow) {
    throw new TruthInvariantError(
      "RESOLVED_SURNAME_MISSING",
      `resolver returned surname ${surnameId} which does not exist`,
    );
  }
  const surname: CanonicalSurnameIdentity = {
    surname_id: surnameRow.surname_id,
    canonical_display: surnameRow.canonical_display,
    canonical_key: surnameRow.canonical_key,
    primary_script: surnameRow.primary_script,
  };

  const candidates = await loadCandidates(db, surnameId);
  if (candidates.length === 0) {
    return {
      kind: "NO_RESULT",
      reason: "NO_APPLICABLE_EVIDENCE",
      resolution_status: status,
      surname,
      message:
        "surname resolved but no applicable distribution snapshot exists; " +
        "this is absence, not a rank of zero",
    };
  }

  // --- The gate. Nothing below runs for a universe that fails it. ----------
  const complete: { candidate: RankCandidate; verdict: CompletenessVerdict }[] = [];
  const rejected: {
    source_record_id: string;
    external_record_id: string | null;
    reason: string;
    expected_row_count: number | null;
    actual_row_count: number;
  }[] = [];

  for (const candidate of candidates) {
    const descriptor = candidate.external_record_id
      ? findPeselResource(candidate.external_record_id)
      : undefined;
    const verdict = assessUniverseCompleteness({
      externalRecordId: candidate.external_record_id,
      actualContentHash: candidate.content_hash,
      actualRowCount: await universeSize(db, candidate.source_record_id),
      descriptor: descriptor
        ? {
            officialSha256: descriptor.official_sha256,
            officialRowCount: descriptor.official_row_count,
          }
        : null,
    });
    if (verdict.kind === "COMPLETE") {
      complete.push({ candidate, verdict });
    } else {
      rejected.push({
        source_record_id: candidate.source_record_id,
        external_record_id: candidate.external_record_id,
        reason: verdict.reason,
        expected_row_count: verdict.expectedRowCount,
        actual_row_count: verdict.actualRowCount,
      });
    }
  }

  if (complete.length === 0) {
    return {
      kind: "NO_RESULT",
      reason: "INCOMPLETE_UNIVERSE",
      resolution_status: status,
      surname,
      message:
        "no resource version backing this surname is a complete universe, so no rank can be " +
        "derived; a rank over a partial import would be false even where the arithmetic is right",
      incomplete_universes: rejected,
    };
  }

  const source = await loadRankSourceContext(db, complete[0]?.candidate.source_id ?? "");
  const surfaceEligibility = evaluateAllSurfaces(options.rightsOverride ?? source.rights);

  const claims: CurrentRankClaimResult[] = [];
  for (const { candidate, verdict } of complete) {
    if (verdict.kind !== "COMPLETE") continue;
    const rank = await competitionRank(db, candidate.source_record_id, candidate.count);
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

interface RankSourceContext {
  readonly source_id: string;
  readonly name: string;
  readonly publisher: string | null;
  readonly homepage_or_reference_url: string | null;
  readonly rights: EffectiveRights;
  readonly rights_profile_id: string;
  readonly attribution_text: string | null;
  readonly terms_version: string | null;
  readonly rights_url: string | null;
}

async function loadRankSourceContext(db: Kysely<DB>, sourceId: string): Promise<RankSourceContext> {
  const row = await db
    .selectFrom("sources as src")
    .innerJoin("rights_profiles as rp", "rp.rights_profile_id", "src.default_rights_profile_id")
    .select([
      "src.source_id",
      "src.name",
      "src.publisher",
      "src.homepage_or_reference_url",
      "rp.rights_profile_id",
      "rp.automated_access",
      "rp.commercial_use",
      "rp.redistribution",
      "rp.metadata_rights",
      "rp.review_status",
      "rp.attribution_text",
      "rp.terms_version",
      "rp.rights_url",
    ])
    .where("src.source_id", "=", sourceId)
    .executeTakeFirst();

  if (!row) {
    throw new TruthInvariantError(
      "MISSING_RIGHTS_PROFILE",
      `source ${sourceId} has no reachable rights profile`,
    );
  }
  return {
    source_id: row.source_id,
    name: row.name,
    publisher: row.publisher,
    homepage_or_reference_url: row.homepage_or_reference_url,
    rights_profile_id: row.rights_profile_id,
    rights: {
      automated_access: row.automated_access,
      commercial_use: row.commercial_use,
      redistribution: row.redistribution,
      metadata_rights: row.metadata_rights,
      review_status: row.review_status,
    },
    attribution_text: row.attribution_text,
    terms_version: row.terms_version,
    rights_url: row.rights_url,
  };
}

/** Derives or re-reads one rank claim, inside one transaction. */
async function deriveOneRank(
  trx: Transaction<DB>,
  surname: CanonicalSurnameIdentity,
  candidate: RankCandidate,
  source: RankSourceContext,
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
  candidate: RankCandidate,
  source: RankSourceContext,
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
