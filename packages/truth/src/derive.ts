/**
 * `CURRENT_POPULATION` derivation (TASK-005 §5).
 *
 *   Surname → DistributionSnapshot/Value → EvidenceItem → Claim
 *           → ClaimEvidence → ConfidenceAssessment → Citation
 *
 * One claim **per applicable snapshot**, never a sum. TASK-004 put the male
 * and female PESEL resources in different `comparability_group` values
 * because the publisher does not disambiguate what the partition means
 * (§14 U-1), and `docs/canonical/11` §6.1 defines that field as the gate on
 * quantitative comparison. Nothing here adds, averages or chooses between
 * them.
 *
 * What this module never does:
 *
 *   - mutate a `source_records`, `distribution_snapshots` or
 *     `distribution_values` row. Source payloads are immutable once imported
 *     (`ARCHITECTURE.md` §10 invariant 6);
 *   - assert a unit for the count (TASK-004 §14 U-4 is unresolved);
 *   - let a rights value influence a confidence value, or vice versa
 *     (invariant 2). `confidence.ts` and `rights.ts` share no input;
 *   - write a zero. Absence produces no claim at all (invariant 4).
 */
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { NORMALIZATION_VERSION } from "@name-atlas/resolver";
import { findPeselResource } from "@name-atlas/sources";
import { assessCurrentPopulation, evidenceSetHash, isValidCombination } from "./confidence.js";
import { evaluateAllSurfaces } from "./rights.js";
import type { EffectiveRights } from "./rights.js";
import { loadSourceContext, requiredProfileText, resolveForDerivation } from "./universe.js";
import type { DerivationSourceContext, UniverseSizeCache } from "./universe.js";
import {
  CONFIDENCE_ASSESSMENT_METHOD,
  CONFIDENCE_ASSESSMENT_VERSION,
  CURRENT_POPULATION_METHOD_VERSION,
  RUN_INPUT_SCHEMA_VERSION,
  WORKFLOW_VERSION,
} from "./version.js";
import type {
  CanonicalSurnameIdentity,
  CurrentPopulationClaimResult,
  SurnameTruthResult,
} from "./result.js";

/** Country scope for the approved PESEL national resources. */
const COUNTRY_CODE = "PL";

/**
 * Stable semantic identity for a claim (`docs/canonical/11` §10.1
 * `claim_key`). Depends only on the proposition's subject and scope — no
 * timestamp, no UUID, no run id — which is what makes re-derivation
 * idempotent rather than merely tidy.
 */
export function currentPopulationClaimKey(
  surnameId: string,
  distributionSnapshotId: string,
): string {
  return `CURRENT_POPULATION|${surnameId}|${distributionSnapshotId}`;
}

/** One snapshot/value pair with everything derivation needs. */
interface ApplicableSnapshot {
  readonly distribution_snapshot_id: string;
  readonly distribution_value_id: string;
  readonly source_record_id: string;
  readonly source_id: string;
  readonly count: string;
  readonly as_of_date: string | null;
  readonly universe_description: string;
  readonly coverage_notes: string | null;
  readonly comparability_group: string | null;
  readonly geography_level: string;
  /** The publisher's resource id, for deciding which source record is authoritative. */
  readonly external_record_id: string | null;
  /** The digest of the bytes actually imported, compared against the registry. */
  readonly content_hash: string;
}

async function loadApplicableSnapshots(
  db: Kysely<DB> | Transaction<DB>,
  surnameId: string,
): Promise<ApplicableSnapshot[]> {
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
      "sr.universe_description",
      "sr.coverage_notes",
      "sr.comparability_group",
      "s.geography_level",
    ])
    .select((eb) =>
      eb.fn<string | null>("to_char", ["s.as_of_date", eb.val("YYYY-MM-DD")]).as("as_of_date"),
    )
    .where("s.surname_id", "=", surnameId)
    // National aggregate only; this task ingests no regional data.
    .where("v.place_id", "is", null)
    .orderBy("s.distribution_snapshot_id")
    .execute();

  return rows.map((row) => ({
    distribution_snapshot_id: row.distribution_snapshot_id,
    distribution_value_id: row.distribution_value_id,
    source_record_id: row.source_record_id,
    source_id: row.source_id,
    count: String(row.count),
    as_of_date: row.as_of_date,
    universe_description: requiredProfileText(
      row.universe_description,
      "universe_description",
      row.source_record_id,
    ),
    coverage_notes: row.coverage_notes,
    comparability_group: row.comparability_group,
    geography_level: row.geography_level,
    external_record_id: row.external_record_id,
    content_hash: row.content_hash,
  }));
}

/**
 * Keeps one source record per publisher resource, and retires the rest (D-018).
 *
 * A publisher resource can be imported more than once — the committed fixture
 * and the full file are different bytes, so ADR-0003 gives each its own
 * `SourceRecord`, and both legitimately carry a snapshot for the same surname.
 * Without a rule, every surname in both imports yields two claims and a reader
 * sees its count twice. A production re-import of an annual resource would do
 * the same.
 *
 * The rule is **authority, not recency**: the source record whose bytes and row
 * count match the registry is the one that counts. Import order is irrelevant,
 * so re-importing an older or truncated file cannot displace the real one.
 *
 * When **no** source record for a resource is complete, they all stay: a partial
 * import is the only thing that exists, `CURRENT_POPULATION` has no universe
 * requirement, and a count from it is honest about its own scope. That is the
 * case the committed fixtures are in, which is why the refusal tests still work.
 */
function authoritativeSnapshots(snapshots: readonly ApplicableSnapshot[]): {
  readonly keep: ApplicableSnapshot[];
  readonly superseded: ApplicableSnapshot[];
} {
  const byResource = new Map<string, ApplicableSnapshot[]>();
  const keep: ApplicableSnapshot[] = [];
  for (const snapshot of snapshots) {
    if (snapshot.external_record_id === null) {
      keep.push(snapshot);
      continue;
    }
    const group = byResource.get(snapshot.external_record_id) ?? [];
    group.push(snapshot);
    byResource.set(snapshot.external_record_id, group);
  }

  const superseded: ApplicableSnapshot[] = [];
  for (const [resourceId, group] of byResource) {
    const descriptor = findPeselResource(resourceId);
    const complete = descriptor
      ? group.filter((s) => s.content_hash === descriptor.official_sha256)
      : [];
    if (complete.length === 0 || complete.length === group.length) {
      // Nothing to choose between: either none is the official file, or every
      // record for this resource is. Both stay, and a duplicate here would be a
      // finding about the import rather than something to resolve silently.
      keep.push(...group);
      continue;
    }
    keep.push(...complete);
    superseded.push(...group.filter((s) => !complete.includes(s)));
  }
  return { keep, superseded };
}

/** Marks a stale claim SUPERSEDED. Never deletes: docs/canonical/11 keeps history. */
async function supersede(
  trx: Transaction<DB>,
  surnameId: string,
  stale: readonly ApplicableSnapshot[],
): Promise<number> {
  if (stale.length === 0) return 0;
  const keys = stale.map((s) => currentPopulationClaimKey(surnameId, s.distribution_snapshot_id));
  const result = await trx
    .updateTable("claims")
    .set({ claim_status: "SUPERSEDED" })
    .where("claim_key", "in", keys)
    .where("claim_status", "=", "ACTIVE")
    .executeTakeFirst();
  return Number(result.numUpdatedRows);
}

/** A violated source invariant is a finding, never something to work around. */
export class TruthInvariantError extends Error {
  readonly reasonCode: string;
  constructor(reasonCode: string, message: string) {
    super(message);
    this.name = "TruthInvariantError";
    this.reasonCode = reasonCode;
  }
}

export interface DeriveOptions {
  /** Overridable so tests can exercise a restrictive rights posture. */
  readonly rightsOverride?: EffectiveRights;
  /**
   * A run-scoped memo for the universe-completeness count, accepted so a batch
   * caller can pass one option object to every derivation.
   *
   * **The population chain does not use it**, and that is not an oversight: a
   * count is a direct fact read from one row, so it needs no complete universe.
   * Only rank, rarity and distribution do (`universe.ts`). Accepting and
   * ignoring it is honest; silently implying population is gated on a universe
   * would not be.
   */
  readonly universeSizeCache?: UniverseSizeCache;
}

/**
 * Derives (or re-reads) the `CURRENT_POPULATION` chain for one raw surname
 * input.
 *
 * Idempotent: a claim that already exists for a `(surname, snapshot)` is
 * reused rather than rewritten, and its evidence, assessment and citation are
 * reused with it. Re-running over unchanged data inserts nothing.
 */
export async function deriveCurrentPopulation(
  db: Kysely<DB>,
  rawInput: string,
  options: DeriveOptions = {},
): Promise<SurnameTruthResult> {
  // TASK-005 §15 U-5: EXACT only. KNOWN_VARIANT is excluded and recorded,
  // because no NameForm variant links exist in production data yet, so a
  // permissive path could not be tested against anything real. The rule lives
  // in resolveForDerivation, shared with every other chain.
  const resolved = await resolveForDerivation(db, rawInput);
  if (resolved.kind !== "RESOLVED") return resolved;
  const { status, surname } = resolved;
  const surnameId = surname.surname_id;

  const snapshots = await loadApplicableSnapshots(db, surnameId);
  if (snapshots.length === 0) {
    // Absence, not zero. The surname may be below the publisher's
    // suppression threshold, or outside the resource's scope.
    return {
      kind: "NO_RESULT",
      reason: "NO_APPLICABLE_EVIDENCE",
      resolution_status: status,
      surname,
      message:
        "surname resolved but no applicable distribution snapshot exists; " +
        "this is absence, not a count of zero",
    };
  }

  // D-018: one source record per publisher resource, chosen by authority.
  const { keep, superseded } = authoritativeSnapshots(snapshots);
  if (superseded.length > 0) {
    await db.transaction().execute(async (trx) => supersede(trx, surnameId, superseded));
  }

  const source = await loadSourceContext(db, keep[0]?.source_id ?? "");
  const surfaceEligibility = evaluateAllSurfaces(options.rightsOverride ?? source.rights);

  const claims: CurrentPopulationClaimResult[] = [];

  for (const snapshot of keep) {
    claims.push(
      await db.transaction().execute(async (trx) => deriveOne(trx, surname, snapshot, source)),
    );
  }

  return {
    kind: "RESULT",
    resolution_status: status,
    surname,
    current_population: claims,
    surface_eligibility: surfaceEligibility,
  };
}

/** Derives or re-reads one claim, inside one transaction. */
async function deriveOne(
  trx: Transaction<DB>,
  surname: CanonicalSurnameIdentity,
  snapshot: ApplicableSnapshot,
  source: DerivationSourceContext,
): Promise<CurrentPopulationClaimResult> {
  const count = Number(snapshot.count);
  if (!Number.isInteger(count) || count < 2) {
    // The source's confirmed minimum is 2 (single occurrences are
    // suppressed). Anything else means the invariant TASK-004 enforced has
    // been violated since import — a finding, never a value to publish.
    throw new TruthInvariantError(
      "INVALID_DISTRIBUTION_COUNT",
      `distribution value ${snapshot.distribution_value_id} has count ${snapshot.count}, ` +
        "which violates the source's confirmed minimum of 2",
    );
  }
  if (!snapshot.as_of_date) {
    throw new TruthInvariantError(
      "MISSING_SNAPSHOT_DATE",
      `snapshot ${snapshot.distribution_snapshot_id} has no as_of_date; a count may never ` +
        "be presented without its dataset date (ARCHITECTURE.md §10 invariant 5)",
    );
  }

  const claimKey = currentPopulationClaimKey(surname.surname_id, snapshot.distribution_snapshot_id);

  // Idempotency: an existing ACTIVE claim is reused wholesale.
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
    return projectExisting(trx, existingClaim.claim_id, snapshot, source, count);
  }

  // --- New derivation. One ResearchRun per invocation (D-009). ------------
  const runId = uuidv7();
  const startedAt = new Date();
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
      // Empty because no prompt and no model exist at M1 — genuinely
      // inapplicable, not merely unrecorded (D-009).
      prompt_manifest: JSON.stringify({}),
      model_manifest: JSON.stringify({}),
      normalization_version: NORMALIZATION_VERSION,
      rights_snapshot_hash: null,
      run_status: "RUNNING",
      qa_status: "NOT_RUN",
      started_at: startedAt,
      completed_at: null,
      error_summary: null,
    })
    .execute();

  // --- EvidenceItem: the source's own value, not a derived statistic. -----
  const evidenceId = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: evidenceId,
      // D-008: docs/canonical/11 §9.5's enum member, not 14-A's rename.
      evidence_type: "OFFICIAL_DATASET_FIELD",
      source_record_id: snapshot.source_record_id,
      subject_entity_id: surname.surname_id,
      structured_value: JSON.stringify({
        count,
        distribution_snapshot_id: snapshot.distribution_snapshot_id,
        distribution_value_id: snapshot.distribution_value_id,
        as_of_date: snapshot.as_of_date,
        geography_level: snapshot.geography_level,
        universe_description: snapshot.universe_description,
      }),
      raw_excerpt: null,
      supporting_locator: `distribution_value:${snapshot.distribution_value_id}`,
      // The value was read by a deterministic parser from a checksum-pinned
      // resource and re-read here without transformation.
      verification_status: "VERIFIED",
      derivation_method: null,
      derivation_version: null,
      created_by_run_id: runId,
    })
    .execute();

  // --- Claim ---------------------------------------------------------------
  // Payload field naming follows docs/canonical/14 §14.1 (D-008). There is
  // no `unit`: the publisher says "occurrences", not "people" (U-4).
  const claimId = uuidv7();
  await trx
    .insertInto("claims")
    .values({
      claim_id: claimId,
      claim_key: claimKey,
      claim_type: "CURRENT_POPULATION",
      epistemic_type: "FACT",
      scope: "SURNAME_LEVEL",
      subject_entity_id: surname.surname_id,
      object_entity_id: null,
      structured_value: JSON.stringify({
        count,
        distribution_snapshot_id: snapshot.distribution_snapshot_id,
        country_code: COUNTRY_CODE,
        snapshot_date: snapshot.as_of_date,
        source_population_scope: snapshot.universe_description,
      }),
      statement_key: null,
      claim_status: "ACTIVE",
      supersedes_claim_id: null,
      created_by_run_id: runId,
      method_version: CURRENT_POPULATION_METHOD_VERSION,
    })
    .execute();

  await trx
    .insertInto("claim_evidence")
    .values({
      claim_id: claimId,
      evidence_item_id: evidenceId,
      relationship: "SUPPORTS",
      reason_code: "OFFICIAL_DATASET_VALUE_FOR_SURNAME",
      notes: null,
    })
    .execute();

  // --- ConfidenceAssessment ------------------------------------------------
  const verdict = assessCurrentPopulation({
    extractionReproducible: true,
    exactResolution: true,
    sourceScopePreserved:
      snapshot.universe_description.trim().length > 0 && snapshot.as_of_date !== null,
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
      evidence_set_hash: evidenceSetHash([evidenceId]),
      assessment_method: CONFIDENCE_ASSESSMENT_METHOD,
      assessment_version: CONFIDENCE_ASSESSMENT_VERSION,
      human_review_required: verdict.human_review_required,
      review_status: "AUTO",
      assessed_at: new Date(),
    })
    .execute();

  // --- Citation ------------------------------------------------------------
  const sourceRecord = await trx
    .selectFrom("source_records")
    .select(["source_url", "retrieved_at", "external_record_id"])
    .where("source_record_id", "=", snapshot.source_record_id)
    .executeTakeFirstOrThrow();

  const citationId = uuidv7();
  await trx
    .insertInto("citations")
    .values({
      citation_id: citationId,
      source_id: source.source_id,
      source_record_id: snapshot.source_record_id,
      title: source.name,
      publisher: source.publisher,
      // Source precision preserved: the dataset's own reference date.
      publication_date: snapshot.as_of_date,
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

  return projectExisting(trx, claimId, snapshot, source, count);
}

/** Reads a persisted claim back out as the developer-facing projection. */
async function projectExisting(
  trx: Transaction<DB>,
  claimId: string,
  snapshot: ApplicableSnapshot,
  source: DerivationSourceContext,
  count: number,
): Promise<CurrentPopulationClaimResult> {
  const claim = await trx
    .selectFrom("claims")
    .select(["claim_id", "claim_key", "method_version"])
    .where("claim_id", "=", claimId)
    .executeTakeFirstOrThrow();

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
    count,
    snapshot_date: snapshot.as_of_date ?? "",
    country_code: COUNTRY_CODE,
    source_population_scope: snapshot.universe_description,
    coverage_notes: snapshot.coverage_notes,
    comparability_group: snapshot.comparability_group,
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
      // The recorded courtesy credit. CC0 requires none, which is why
      // attribution_required is false and this is still non-null: the
      // publisher is credited because it is right, not because it is owed.
      attribution: source.attribution_text,
      terms_version: source.terms_version,
    },
  };
}
