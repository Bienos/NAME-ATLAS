/**
 * `CURRENT_DISTRIBUTION` — where a surname's bearers are registered
 * (TASK-012, over the regional resources D-004 adopted).
 *
 * Two things make this claim different from the national ones, and both are
 * about the denominator:
 *
 * 1. **A share is always of the covered set** — the surname's own sum across
 *    the voivodeships the publisher listed for it — and never of its national
 *    count. The 16 voivodeships hold 78.3% (male) and 80.2% (female) of the
 *    national totals, and the shortfall is biased by surname size, so a share
 *    of the national count would report MELNYK (210 placed of 6,442
 *    registered) as almost absent from a country it is plainly present in.
 *    TASK-012 §2 rejected that; §8 forbids the division anywhere.
 * 2. **Coverage is part of the claim, not a footnote.** Every claim carries
 *    `covered_count`, `national_count`, `coverage_ratio` and the words saying
 *    what that ratio is, and the read state says whether the figures may be
 *    presented as the surname's distribution at all.
 *
 * Coverage never touches confidence. The counts are exactly what the source
 * says in every state; low coverage is a scope property, and conflating the
 * two is what `ARCHITECTURE.md` §10 invariant 2 exists to prevent.
 *
 * Same gate as the rank and the rarity figure: an incomplete regional import
 * has no distribution, and there is no bypass.
 */
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { NORMALIZATION_VERSION } from "@name-atlas/resolver";
import { nationalCounterpartOf } from "@name-atlas/sources";
import type { PeselResourceDescriptor } from "@name-atlas/sources";
import { assessUniverseCompleteness } from "./completeness.js";
import { assessDerivedStatistic, evidenceSetHash, isValidCombination } from "./confidence.js";
import { evaluateAllSurfaces } from "./rights.js";
import type { EffectiveRights } from "./rights.js";
import type { UniverseSizeCache } from "./universe.js";
import { TruthInvariantError } from "./derive.js";
import {
  loadCandidates,
  loadSourceContext,
  prepareRegionalDerivation,
  universeSize,
} from "./universe.js";
import type {
  CompleteRegionalUniverse,
  DerivationSourceContext,
  RegionalUniverseCandidate,
  UniverseCandidate,
} from "./universe.js";
import {
  CURRENT_DISTRIBUTION_METHOD_VERSION,
  CURRENT_DISTRIBUTION_PAYLOAD_VERSION,
  DISTRIBUTION_COVERAGE_BASIS,
  DISTRIBUTION_DENOMINATOR_KIND,
  DISTRIBUTION_DENOMINATOR_METHOD,
  DISTRIBUTION_DENOMINATOR_VERSION,
  DISTRIBUTION_LOW_COVERAGE_THRESHOLD,
  DISTRIBUTION_SHARE_PRECISION,
  DISTRIBUTION_UNIVERSE_KIND,
  DISTRIBUTION_UNIVERSE_LABEL_CODE,
  RANK_CONFIDENCE_ASSESSMENT_METHOD,
  RANK_CONFIDENCE_ASSESSMENT_VERSION,
  RUN_INPUT_SCHEMA_VERSION,
  WORKFLOW_VERSION,
} from "./version.js";
import type {
  CanonicalSurnameIdentity,
  CurrentDistributionClaimResult,
  DistributionCoverageState,
  DistributionEntryResult,
  SurnameDistributionResult,
} from "./result.js";

const COUNTRY_CODE = "PL";

/** One claim per (surname, regional resource version): the universe is the key. */
export function currentDistributionClaimKey(surnameId: string, sourceRecordId: string): string {
  return `CURRENT_DISTRIBUTION|${surnameId}|${sourceRecordId}`;
}

/**
 * The covered set: the surname's sum across the voivodeships the publisher
 * listed for it. Pure and exported so the one legitimate denominator is
 * testable on its own.
 */
export function coveredSetSum(counts: readonly number[]): number {
  if (counts.length === 0) {
    throw new TruthInvariantError(
      "DISTRIBUTION_EMPTY_COVERED_SET",
      "a distribution needs at least one published cell; zero cells is absence, not a zero sum",
    );
  }
  let total = 0;
  for (const count of counts) {
    if (!Number.isInteger(count) || count < 1) {
      throw new TruthInvariantError(
        "DISTRIBUTION_BAD_CELL_COUNT",
        `every published cell count must be a positive integer, got ${count}`,
      );
    }
    total += count;
  }
  return total;
}

/** `count / covered`, to nine places. Never `count / national`. */
export function shareOfCovered(count: number, covered: number): number {
  if (!Number.isInteger(count) || count < 1) {
    throw new TruthInvariantError(
      "DISTRIBUTION_BAD_CELL_COUNT",
      `a cell count must be a positive integer, got ${count}`,
    );
  }
  if (!Number.isInteger(covered) || covered < count) {
    throw new TruthInvariantError(
      "DISTRIBUTION_BAD_COVERED_SUM",
      `the covered sum must be an integer no smaller than the cell, got ${covered} for ${count}`,
    );
  }
  return Number((count / covered).toFixed(DISTRIBUTION_SHARE_PRECISION));
}

/**
 * `covered / national`, to nine places.
 *
 * Throws when the covered sum exceeds the national count: TASK-008 verified
 * across 395,217 surnames that it never does, so an exception here is a real
 * finding about the data, not a case to clamp away.
 */
export function coverageRatio(covered: number, national: number): number {
  if (!Number.isInteger(covered) || covered < 1) {
    throw new TruthInvariantError(
      "DISTRIBUTION_BAD_COVERED_SUM",
      `the covered sum must be a positive integer, got ${covered}`,
    );
  }
  if (!Number.isInteger(national) || national < covered) {
    throw new TruthInvariantError(
      "DISTRIBUTION_COVERED_EXCEEDS_NATIONAL",
      `the covered sum ${covered} exceeds the national count ${national}; the regional resource ` +
        "cannot place more bearers than the national one counts, so this is a data finding",
    );
  }
  return Number((covered / national).toFixed(DISTRIBUTION_SHARE_PRECISION));
}

/**
 * The read state. Unknown coverage is presented exactly as inadequate
 * coverage: not knowing what share of the bearers these cells represent is not
 * a reason to present them as the whole.
 */
export function coverageState(
  ratio: number | null,
  threshold: number = DISTRIBUTION_LOW_COVERAGE_THRESHOLD,
): DistributionCoverageState {
  if (ratio === null) return "COVERAGE_UNKNOWN";
  return ratio >= threshold ? "READY" : "LOW_COVERAGE";
}

/**
 * The same surname's count in the same partition's **complete** national
 * resource version, or null.
 *
 * Runs the identical completeness gate: an incomplete national import gives no
 * coverage figure, which is `COVERAGE_UNKNOWN`, never an estimated one.
 */
async function nationalCoverageCount(
  db: Kysely<DB>,
  nationalCandidates: () => Promise<readonly UniverseCandidate[]>,
  regional: PeselResourceDescriptor,
  cache?: UniverseSizeCache,
): Promise<number | null> {
  const national = nationalCounterpartOf(regional);
  if (!national) return null;

  const candidates = (await nationalCandidates()).filter(
    (candidate) => candidate.external_record_id === national.resource_id,
  );
  for (const candidate of candidates) {
    const verdict = assessUniverseCompleteness({
      externalRecordId: candidate.external_record_id,
      actualContentHash: candidate.content_hash,
      actualRowCount: await universeSize(db, candidate.source_record_id, cache),
      descriptor: {
        officialSha256: national.official_sha256,
        officialRowCount: national.official_row_count,
      },
    });
    if (verdict.kind === "COMPLETE") return candidate.count;
  }
  return null;
}

export interface DeriveDistributionOptions {
  /** Overridable so tests can exercise a restrictive rights posture. */
  readonly rightsOverride?: EffectiveRights;
  /**
   * Overridable so a test can assert the state flips at the boundary. Not a
   * gate bypass: it changes how a figure is presented, never whether an
   * incomplete universe may be used.
   */
  readonly lowCoverageThreshold?: number;
  /** Run-scoped memo for the completeness counts. See `UniverseSizeCache`. */
  readonly universeSizeCache?: UniverseSizeCache;
}

/**
 * Derives (or re-reads) the `CURRENT_DISTRIBUTION` chain for one raw input.
 *
 * Refuses, writing nothing, where the regional universe is not complete.
 * Against the committed fixtures that is the expected outcome.
 */
export async function deriveCurrentDistribution(
  db: Kysely<DB>,
  rawInput: string,
  options: DeriveDistributionOptions = {},
): Promise<SurnameDistributionResult> {
  const prepared = await prepareRegionalDerivation(db, rawInput, options.universeSizeCache);
  if (prepared.kind === "NO_RESULT") {
    return prepared;
  }
  const { status, surname, complete } = prepared;

  const source = await loadSourceContext(db, complete[0]?.candidate.source_id ?? "");
  const surfaceEligibility = evaluateAllSurfaces(options.rightsOverride ?? source.rights);
  const threshold = options.lowCoverageThreshold ?? DISTRIBUTION_LOW_COVERAGE_THRESHOLD;

  // The surname's national values are the same for every regional universe;
  // load them once, and only if some universe has a national counterpart.
  let national: Promise<UniverseCandidate[]> | undefined;
  const nationalCandidates = () => (national ??= loadCandidates(db, surname.surname_id));

  const claims: CurrentDistributionClaimResult[] = [];
  for (const universe of complete) {
    const nationalCount = await nationalCoverageCount(
      db,
      nationalCandidates,
      universe.descriptor,
      options.universeSizeCache,
    );
    claims.push(
      await db
        .transaction()
        .execute(async (trx) =>
          deriveOneDistribution(trx, surname, universe, source, nationalCount, threshold),
        ),
    );
  }

  return {
    kind: "RESULT",
    resolution_status: status,
    surname,
    current_distribution: claims,
    surface_eligibility: surfaceEligibility,
  };
}

async function deriveOneDistribution(
  trx: Transaction<DB>,
  surname: CanonicalSurnameIdentity,
  universe: CompleteRegionalUniverse,
  source: DerivationSourceContext,
  nationalCount: number | null,
  threshold: number,
): Promise<CurrentDistributionClaimResult> {
  const { candidate, verdict } = universe;
  if (!candidate.as_of_date) {
    throw new TruthInvariantError(
      "MISSING_SNAPSHOT_DATE",
      `snapshot ${candidate.distribution_snapshot_id} has no as_of_date; a derived value may ` +
        "never be presented without its dataset date (ARCHITECTURE.md §10 invariant 5)",
    );
  }

  const covered = coveredSetSum(candidate.cells.map((cell) => cell.count));
  const ratio = nationalCount === null ? null : coverageRatio(covered, nationalCount);
  const state = coverageState(ratio, threshold);
  const entries: DistributionEntryResult[] = candidate.cells.map((cell) => ({
    place_id: cell.place_id,
    terc_code: cell.terc_code,
    place_display_name: cell.place_display_name,
    source_geography_key: cell.source_geography_key,
    count: cell.count,
    share_of_covered: shareOfCovered(cell.count, covered),
  }));

  const claimKey = currentDistributionClaimKey(surname.surname_id, candidate.source_record_id);
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
    return projectDistribution(
      trx,
      existingClaim.claim_id,
      candidate,
      source,
      verdict.universeSize,
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

  // --- Observation evidence: the published cells, as published -------------
  // Created here rather than reused, because no earlier chain observes the
  // regional resource: `CURRENT_POPULATION` reads the national resources only.
  const observation = await trx
    .selectFrom("evidence_items")
    .select(["evidence_item_id", "verification_status"])
    .where("subject_entity_id", "=", surname.surname_id)
    .where("source_record_id", "=", candidate.source_record_id)
    .where("evidence_type", "=", "OFFICIAL_DATASET_FIELD")
    .orderBy("created_at")
    .executeTakeFirst();
  let observationId = observation?.evidence_item_id;
  let observationVerified = observation?.verification_status === "VERIFIED";
  if (!observationId) {
    observationId = uuidv7();
    observationVerified = true;
    await trx
      .insertInto("evidence_items")
      .values({
        evidence_item_id: observationId,
        evidence_type: "OFFICIAL_DATASET_FIELD",
        source_record_id: candidate.source_record_id,
        subject_entity_id: surname.surname_id,
        structured_value: JSON.stringify({
          // Each observed row is named by its own id, which is what the
          // national chain gets from its `distribution_value:` locator. A
          // regional observation covers many rows, so they are listed here.
          cells: candidate.cells.map((cell) => ({
            distribution_value_id: cell.distribution_value_id,
            place_id: cell.place_id,
            terc_code: cell.terc_code,
            source_geography_key: cell.source_geography_key,
            count: cell.count,
          })),
          regions_present: candidate.cells.length,
          comparability_group: candidate.comparability_group,
          source_population_scope: candidate.universe_description,
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

  // --- Universe evidence: this regional resource version -------------------
  const priorUniverse = await trx
    .selectFrom("evidence_items")
    .select(["evidence_item_id"])
    .where("source_record_id", "=", candidate.source_record_id)
    .where("evidence_type", "=", "AUTHORITATIVE_INDEX")
    .where("subject_entity_id", "is", null)
    .orderBy("created_at")
    .limit(1)
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
          universe_kind: DISTRIBUTION_UNIVERSE_KIND,
          // Published cells, not surnames: the registry's row count counts CSV
          // data rows, and the resource has one per (voivodeship, surname).
          universe_size: verdict.universeSize,
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

  // --- Denominator evidence: this surname's covered set --------------------
  const denominatorEvidenceId = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: denominatorEvidenceId,
      evidence_type: "DERIVED_STATISTIC",
      source_record_id: candidate.source_record_id,
      subject_entity_id: surname.surname_id,
      structured_value: JSON.stringify({
        covered_count: covered,
        denominator_kind: DISTRIBUTION_DENOMINATOR_KIND,
        regions_present: candidate.cells.length,
        national_count: nationalCount,
        coverage_ratio: ratio,
        coverage_basis: DISTRIBUTION_COVERAGE_BASIS,
        basis: "SUM(count) over this surname's published regional cells",
      }),
      raw_excerpt: null,
      supporting_locator: `source_record:${candidate.source_record_id}`,
      verification_status: "VERIFIED",
      derivation_method: DISTRIBUTION_DENOMINATOR_METHOD,
      derivation_version: DISTRIBUTION_DENOMINATOR_VERSION,
      created_by_run_id: runId,
    })
    .execute();
  await trx
    .insertInto("evidence_dependencies")
    .values({
      evidence_dependency_id: uuidv7(),
      derived_evidence_item_id: denominatorEvidenceId,
      depends_on_evidence_item_id: observationId,
      dependency_role: "COUNT",
    })
    .execute();

  // --- The derived evidence item: the shares ------------------------------
  const derivedEvidenceId = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: derivedEvidenceId,
      evidence_type: "DERIVED_STATISTIC",
      source_record_id: candidate.source_record_id,
      subject_entity_id: surname.surname_id,
      structured_value: JSON.stringify({
        entries,
        covered_count: covered,
        national_count: nationalCount,
        coverage_ratio: ratio,
        state,
        algorithm_version: CURRENT_DISTRIBUTION_METHOD_VERSION,
        payload_version: CURRENT_DISTRIBUTION_PAYLOAD_VERSION,
      }),
      raw_excerpt: null,
      supporting_locator: `source_record:${candidate.source_record_id}`,
      verification_status: "VERIFIED",
      derivation_method: "shares_over_covered_set",
      derivation_version: CURRENT_DISTRIBUTION_METHOD_VERSION,
      created_by_run_id: runId,
    })
    .execute();

  // --- Lineage: three inputs, three roles (docs/canonical/14 §30) ---------
  for (const [dependsOn, role] of [
    [observationId, "COUNT"],
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
  // `object_entity_id` stays null: the claim is about the surname across a set
  // of places, and each entry carries its own `place_id`, which is the grain
  // docs/canonical/11 §8's "place/count/rate" describes.
  const claimId = uuidv7();
  await trx
    .insertInto("claims")
    .values({
      claim_id: claimId,
      claim_key: claimKey,
      claim_type: "CURRENT_DISTRIBUTION",
      epistemic_type: "FACT",
      scope: "SURNAME_LEVEL",
      subject_entity_id: surname.surname_id,
      object_entity_id: null,
      structured_value: JSON.stringify({
        state,
        entries,
        regions_present: candidate.cells.length,
        covered_count: covered,
        national_count: nationalCount,
        coverage_ratio: ratio,
        coverage_basis: DISTRIBUTION_COVERAGE_BASIS,
        low_coverage_threshold: threshold,
        denominator_kind: DISTRIBUTION_DENOMINATOR_KIND,
        universe_label_code: DISTRIBUTION_UNIVERSE_LABEL_CODE,
        universe: {
          kind: DISTRIBUTION_UNIVERSE_KIND,
          size: verdict.universeSize,
          source_record_id: candidate.source_record_id,
          external_record_id: candidate.external_record_id,
          comparability_group: candidate.comparability_group,
        },
        algorithm_version: CURRENT_DISTRIBUTION_METHOD_VERSION,
        payload_version: CURRENT_DISTRIBUTION_PAYLOAD_VERSION,
        country_code: COUNTRY_CODE,
        snapshot_date: candidate.as_of_date,
        source_population_scope: candidate.universe_description,
        registered_residence_restriction: candidate.coverage_notes,
        distribution_snapshot_id: candidate.distribution_snapshot_id,
      }),
      statement_key: null,
      claim_status: "ACTIVE",
      supersedes_claim_id: null,
      created_by_run_id: runId,
      method_version: CURRENT_DISTRIBUTION_METHOD_VERSION,
    })
    .execute();

  await trx
    .insertInto("claim_evidence")
    .values({
      claim_id: claimId,
      evidence_item_id: derivedEvidenceId,
      relationship: "SUPPORTS",
      reason_code: "DERIVED_DISTRIBUTION_OVER_COVERED_SET",
      notes: null,
    })
    .execute();

  // --- Confidence: the derived-statistic rule, unchanged -------------------
  // Coverage is deliberately not an input. A 3% distribution is as verified as
  // an 88% one; what differs is its scope, which `state` carries.
  const confidence = assessDerivedStatistic({
    computationReproducible: true,
    inputsComplete: true,
    upstreamEvidenceVerified: observationVerified,
    noMaterialConflict: true,
  });
  if (!isValidCombination(confidence.epistemic_type, confidence.status)) {
    throw new TruthInvariantError(
      "INVALID_EPISTEMIC_COMBINATION",
      `(${confidence.epistemic_type}, ${confidence.status}) is not permitted by ` +
        "docs/canonical/11 §12.3",
    );
  }
  await trx
    .insertInto("confidence_assessments")
    .values({
      confidence_assessment_id: uuidv7(),
      claim_id: claimId,
      status: confidence.status,
      rationale: confidence.rationale,
      evidence_set_hash: evidenceSetHash([
        derivedEvidenceId,
        observationId,
        denominatorEvidenceId,
        universeEvidenceId,
      ]),
      assessment_method: RANK_CONFIDENCE_ASSESSMENT_METHOD,
      assessment_version: RANK_CONFIDENCE_ASSESSMENT_VERSION,
      human_review_required: confidence.human_review_required,
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

  return projectDistribution(trx, claimId, candidate, source, verdict.universeSize);
}

/** Reads a persisted distribution claim back out as the developer projection. */
async function projectDistribution(
  trx: Transaction<DB>,
  claimId: string,
  candidate: RegionalUniverseCandidate,
  source: DerivationSourceContext,
  universeSizeValue: number,
): Promise<CurrentDistributionClaimResult> {
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

  const nationalCount = payload["national_count"];
  const ratio = payload["coverage_ratio"];
  return {
    claim_id: claim.claim_id,
    claim_key: claim.claim_key,
    state: String(payload["state"]) as DistributionCoverageState,
    entries: (payload["entries"] as DistributionEntryResult[] | undefined) ?? [],
    regions_present: Number(payload["regions_present"]),
    covered_count: Number(payload["covered_count"]),
    national_count:
      nationalCount === null || nationalCount === undefined ? null : Number(nationalCount),
    coverage_ratio: ratio === null || ratio === undefined ? null : Number(ratio),
    coverage_basis: String(payload["coverage_basis"]),
    low_coverage_threshold: Number(payload["low_coverage_threshold"]),
    universe: {
      kind: DISTRIBUTION_UNIVERSE_KIND,
      size: universeSizeValue,
      source_record_id: candidate.source_record_id,
      external_record_id: candidate.external_record_id,
      comparability_group: candidate.comparability_group,
    },
    universe_label_code: DISTRIBUTION_UNIVERSE_LABEL_CODE,
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
