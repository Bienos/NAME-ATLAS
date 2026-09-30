/**
 * `SURNAME_DISTRIBUTION_SHIFT`: a surname's national count across the editions
 * of one published list (TASK-051, ADR-0020).
 *
 * Two layers. `buildShift` is pure: given the editions a list has, which of
 * them are loaded, and the surname's value on each, it returns the points, the
 * gaps and the summary, or `null` when fewer than two points are known. The
 * derivation writes the chain around it, as `deriveCurrentPopulation` and
 * `deriveRarityContext` do: one research run, one evidence item per known
 * point, one derived evidence item that depends on them, the claim, its
 * confidence and its citation.
 *
 * What it will not do:
 *
 *   - read an edition whose stored bytes are not the official file. An edition
 *     is imported partially on purpose (only the surnames the current register
 *     has, TASK-045), so the row-count gate of rank and rarity cannot apply;
 *     the gate here is the record's `content_hash` against the registry's
 *     `official_sha256`, and the list total is the registry's pinned
 *     `official_people_sum`, never a sum of stored rows;
 *   - turn an absence into a zero. A surname that an edition does not list is
 *     `NOT_ON_LIST`: below the publisher's floor of 2, or not on the list;
 *   - bridge the women's 2022 edition, a publisher duplicate of 2021. The claim
 *     carries it as a gap;
 *   - say why anything changed. There is no cause in the claim, and no word of
 *     direction beyond the two signed numbers.
 *
 * Request paths read the claim (`readDistributionShift`) and derive nothing.
 */
import { createHash } from "node:crypto";
import type { Kysely, Transaction } from "kysely";
import { sql } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { NORMALIZATION_VERSION } from "@name-atlas/resolver";
import { PESEL_REFUSED_RESOURCES, PESEL_TREND_EDITIONS } from "@name-atlas/sources";
import { assessDerivedStatistic, evidenceSetHash, isValidCombination } from "./confidence.js";
import { TruthInvariantError } from "./derive.js";
import { oneInX, shareOf } from "./rarity.js";
import { evaluateAllSurfaces } from "./rights.js";
import type { EffectiveRights } from "./rights.js";
import { loadSourceContext, resolveForDerivation } from "./universe.js";
import type { DerivationSourceContext } from "./universe.js";
import {
  DISTRIBUTION_SHIFT_METHOD_VERSION,
  DISTRIBUTION_SHIFT_ROUNDING,
  RANK_CONFIDENCE_ASSESSMENT_METHOD,
  RANK_CONFIDENCE_ASSESSMENT_VERSION,
  RUN_INPUT_SCHEMA_VERSION,
  WORKFLOW_VERSION,
} from "./version.js";
import type { CanonicalSurnameIdentity } from "./result.js";

const COUNTRY_CODE = "PL";
const SCOPE_LABEL_CODE = "PESEL_CURRENT_SURNAME";

export type ShiftRole = "national_male" | "national_female";
export const SHIFT_ROLES: readonly ShiftRole[] = ["national_male", "national_female"];

/** What a trend needs to know of an edition. The registry's descriptor, reduced. */
export interface ShiftEdition {
  readonly resource_id: string;
  readonly data_date: string;
  readonly official_sha256: string;
  readonly official_people_sum: number;
  readonly official_source_url: string;
  readonly universe_note_code: "UNIVERSE_DESCRIPTION_DIFFERS" | null;
}

/** A resource the publisher lists in a list's series that is not one of its editions. */
export interface ShiftGap {
  readonly resource_id: string;
  readonly data_date: string;
  readonly reason_code: "PUBLISHER_DUPLICATE";
  readonly duplicate_of: string;
}

export interface ShiftEditions {
  /** In ascending order of `data_date`. */
  readonly editions: readonly ShiftEdition[];
  readonly gaps: readonly ShiftGap[];
}

export type ShiftEditionSet = Readonly<Record<ShiftRole, ShiftEditions>>;

/** The editions the registry says a trend reads (`PESEL_TREND_EDITIONS`). */
export function registryShiftEditions(): ShiftEditionSet {
  const one = (role: ShiftRole): ShiftEditions => ({
    editions: PESEL_TREND_EDITIONS[role].map((d) => {
      if (d.official_people_sum === undefined) {
        throw new TruthInvariantError(
          "SHIFT_EDITION_WITHOUT_TOTAL",
          `registry resource ${d.resource_id} has no official_people_sum`,
        );
      }
      return {
        resource_id: d.resource_id,
        data_date: d.data_date,
        official_sha256: d.official_sha256,
        official_people_sum: d.official_people_sum,
        official_source_url: d.official_source_url,
        universe_note_code: d.universe_note_code ?? null,
      };
    }),
    gaps: PESEL_REFUSED_RESOURCES.filter((r) => r.role === role).map((r) => ({
      resource_id: r.resource_id,
      data_date: r.data_date,
      reason_code: r.reason,
      duplicate_of: r.duplicate_of,
    })),
  });
  return { national_male: one("national_male"), national_female: one("national_female") };
}

/** One surname's value on one loaded edition, as stored. */
export interface EditionValueRow {
  readonly resource_id: string;
  readonly source_record_id: string;
  readonly distribution_snapshot_id: string;
  readonly distribution_value_id: string;
  readonly count: number;
}

/** An edition whose official bytes are stored. */
export interface LoadedEdition {
  readonly resource_id: string;
  readonly source_record_id: string;
  readonly source_id: string;
  readonly source_url: string | null;
  readonly retrieved_at: Date | null;
}

export interface KnownPoint {
  readonly status: "KNOWN";
  readonly data_date: string;
  readonly resource_id: string;
  readonly source_record_id: string;
  readonly distribution_snapshot_id: string;
  readonly distribution_value_id: string;
  readonly source_url: string;
  readonly note_code: string | null;
  readonly count: number;
  readonly list_total: number;
  readonly one_in_x: number;
  readonly share: number;
}

export interface AbsentPoint {
  readonly status: "NOT_ON_LIST";
  readonly data_date: string;
  readonly resource_id: string;
  readonly source_record_id: string;
  readonly source_url: string;
  readonly note_code: string | null;
}

export type ShiftPoint = KnownPoint | AbsentPoint;

export interface ShiftEnd {
  readonly data_date: string;
  readonly count: number;
  readonly list_total: number;
}

export interface ShiftSummary {
  readonly known_points: number;
  readonly first: ShiftEnd;
  readonly last: ShiftEnd;
  /** Signed, per cent, one decimal, half away from zero. */
  readonly count_change_percent: number;
  readonly list_change_percent: number;
}

export interface ShiftBuild {
  readonly role: ShiftRole;
  readonly points: readonly ShiftPoint[];
  readonly gaps: readonly ShiftGap[];
  readonly summary: ShiftSummary;
}

/**
 * `(last − first) / first` in per cent, to one decimal, half away from zero,
 * in integer arithmetic so that no float decides a borderline figure.
 */
export function percentChange(first: number, last: number): number {
  if (!Number.isInteger(first) || first < 1 || !Number.isInteger(last) || last < 0) {
    throw new TruthInvariantError(
      "SHIFT_BAD_CHANGE_INPUT",
      `a change needs a positive integer start and a non-negative integer end, got ${first} and ${last}`,
    );
  }
  const numerator = (last - first) * 1000; // tenths of a per cent, times `first`
  const tenths = Math.sign(numerator) * Math.floor((2 * Math.abs(numerator) + first) / (2 * first));
  const value = tenths / 10;
  return value === 0 ? 0 : value; // never -0
}

/**
 * The points of one list's trend, or `null` when fewer than two are known.
 *
 * `loaded` names the editions whose official bytes are stored, keyed by
 * resource id; an edition that is not loaded is not a point at all (it is not
 * a surname's absence, it is an edition the database does not have). `rows`
 * holds the surname's value on each loaded edition it is listed on.
 */
export function buildShift(
  role: ShiftRole,
  set: ShiftEditions,
  loaded: ReadonlyMap<string, LoadedEdition>,
  rows: ReadonlyMap<string, EditionValueRow>,
): ShiftBuild | null {
  const points: ShiftPoint[] = [];
  for (const edition of set.editions) {
    const store = loaded.get(edition.resource_id);
    if (!store) continue;
    const value = rows.get(edition.resource_id);
    const base = {
      data_date: edition.data_date,
      resource_id: edition.resource_id,
      source_record_id: store.source_record_id,
      source_url: edition.official_source_url,
      note_code: edition.universe_note_code,
    };
    if (!value) {
      points.push({ status: "NOT_ON_LIST", ...base });
      continue;
    }
    if (!Number.isInteger(value.count) || value.count < 2) {
      // The publisher's floor is 2 in every edition. Anything else means the
      // invariant the importer enforced has been broken since (TASK-004).
      throw new TruthInvariantError(
        "INVALID_DISTRIBUTION_COUNT",
        `distribution value ${value.distribution_value_id} has count ${value.count}, ` +
          "which violates the source's confirmed minimum of 2",
      );
    }
    points.push({
      status: "KNOWN",
      ...base,
      distribution_snapshot_id: value.distribution_snapshot_id,
      distribution_value_id: value.distribution_value_id,
      count: value.count,
      list_total: edition.official_people_sum,
      one_in_x: oneInX(value.count, edition.official_people_sum),
      share: shareOf(value.count, edition.official_people_sum),
    });
  }

  const known = points.filter((p): p is KnownPoint => p.status === "KNOWN");
  const first = known[0];
  const last = known.at(-1);
  if (known.length < 2 || !first || !last) return null;

  const gaps = set.gaps.filter(
    (g) => g.data_date > first.data_date && g.data_date < last.data_date,
  );
  return {
    role,
    points,
    gaps,
    summary: {
      known_points: known.length,
      first: { data_date: first.data_date, count: first.count, list_total: first.list_total },
      last: { data_date: last.data_date, count: last.count, list_total: last.list_total },
      count_change_percent: percentChange(first.count, last.count),
      list_change_percent: percentChange(first.list_total, last.list_total),
    },
  };
}

/** The claim's key: the surname, the list, the method and exactly which stored editions it covers. */
export function distributionShiftClaimKey(
  surnameId: string,
  role: ShiftRole,
  points: readonly ShiftPoint[],
): string {
  const identity = points.map((p) => `${p.resource_id}:${p.source_record_id}`).join(",");
  const digest = createHash("sha256").update(identity, "utf8").digest("hex").slice(0, 16);
  return `${distributionShiftClaimKeyPrefix(surnameId, role)}${digest}`;
}

/** What every key of one surname's list shares: a new edition set replaces, it does not add. */
export function distributionShiftClaimKeyPrefix(surnameId: string, role: ShiftRole): string {
  return `SURNAME_DISTRIBUTION_SHIFT|${surnameId}|${role}|${DISTRIBUTION_SHIFT_METHOD_VERSION}|`;
}

/** The stored claim's payload, which a read returns and the contract validates. */
export function shiftStructuredValue(build: ShiftBuild): Record<string, unknown> {
  return {
    role: build.role,
    points: build.points,
    gaps: build.gaps,
    summary: build.summary,
    rounding: DISTRIBUTION_SHIFT_ROUNDING,
    algorithm_version: DISTRIBUTION_SHIFT_METHOD_VERSION,
    country_code: COUNTRY_CODE,
    scope_label_code: SCOPE_LABEL_CODE,
  };
}

// --- Database ------------------------------------------------------------

/**
 * The editions whose official bytes are stored: an `ACTIVE` source record for
 * the resource whose `content_hash` is the registry's `official_sha256`. One
 * read, cacheable for a batch.
 */
export async function loadOfficialEditions(
  db: Kysely<DB>,
  set: ShiftEditionSet,
): Promise<Map<string, LoadedEdition>> {
  const wanted = new Map<string, ShiftEdition>();
  for (const role of SHIFT_ROLES) {
    for (const edition of set[role].editions) wanted.set(edition.resource_id, edition);
  }
  const result = await sql<{
    external_record_id: string;
    source_record_id: string;
    source_id: string;
    content_hash: string;
    source_url: string | null;
    retrieved_at: Date | null;
  }>`
    SELECT sr.external_record_id, sr.source_record_id::text AS source_record_id,
           sr.source_id::text AS source_id, sr.content_hash, sr.source_url, sr.retrieved_at
      FROM source_records sr
     WHERE sr.external_record_id = ANY(${[...wanted.keys()]}::text[])
       AND sr.record_status = 'ACTIVE'
  `.execute(db);
  const loaded = new Map<string, LoadedEdition>();
  for (const row of result.rows) {
    const edition = wanted.get(row.external_record_id);
    if (!edition || row.content_hash !== edition.official_sha256) continue;
    loaded.set(row.external_record_id, {
      resource_id: row.external_record_id,
      source_record_id: row.source_record_id,
      source_id: row.source_id,
      source_url: row.source_url,
      retrieved_at: row.retrieved_at,
    });
  }
  return loaded;
}

/** One surname's national value on each of the loaded editions it is listed on. */
export async function loadEditionValues(
  db: Kysely<DB>,
  surnameId: string,
  loaded: ReadonlyMap<string, LoadedEdition>,
): Promise<Map<string, EditionValueRow>> {
  const records = [...loaded.values()].map((l) => l.source_record_id);
  const byRecord = new Map([...loaded.values()].map((l) => [l.source_record_id, l.resource_id]));
  if (records.length === 0) return new Map();
  const result = await sql<{
    source_record_id: string;
    distribution_snapshot_id: string;
    distribution_value_id: string;
    count: string;
  }>`
    SELECT s.source_record_id::text AS source_record_id,
           s.distribution_snapshot_id::text AS distribution_snapshot_id,
           v.distribution_value_id::text AS distribution_value_id,
           v.count::text AS count
      FROM distribution_snapshots s
      JOIN distribution_values v ON v.distribution_snapshot_id = s.distribution_snapshot_id
     WHERE s.surname_id = ${surnameId}::uuid
       AND s.source_record_id = ANY(${records}::uuid[])
       AND v.place_id IS NULL
  `.execute(db);
  const rows = new Map<string, EditionValueRow>();
  for (const row of result.rows) {
    const resourceId = byRecord.get(row.source_record_id);
    if (!resourceId) continue;
    if (rows.has(resourceId)) {
      throw new TruthInvariantError(
        "SHIFT_DUPLICATE_EDITION_VALUE",
        `surname ${surnameId} has two national values on source record ${row.source_record_id}`,
      );
    }
    rows.set(resourceId, {
      resource_id: resourceId,
      source_record_id: row.source_record_id,
      distribution_snapshot_id: row.distribution_snapshot_id,
      distribution_value_id: row.distribution_value_id,
      count: Number(row.count),
    });
  }
  return rows;
}

export interface DeriveShiftOptions {
  /** The editions to read; the registry's by default. Tests pass editions with their own hashes and totals. */
  readonly editions?: ShiftEditionSet;
  /** Overridable so a test can exercise a restrictive rights posture. */
  readonly rightsOverride?: EffectiveRights;
  /** One per batch: which editions are stored. Created on demand when absent. */
  readonly loadedEditions?: ReadonlyMap<string, LoadedEdition>;
}

export interface DistributionShiftClaimResult {
  readonly role: ShiftRole;
  readonly claim_id: string;
  readonly claim_key: string;
  readonly known_points: number;
  /** False when an `ACTIVE` claim for the same stored editions already existed. */
  readonly created: boolean;
}

export type SurnameShiftResult =
  | {
      readonly kind: "RESULT";
      readonly surname: CanonicalSurnameIdentity;
      readonly distribution_shift: readonly DistributionShiftClaimResult[];
    }
  | {
      readonly kind: "NO_RESULT";
      readonly reason:
        | "INVALID_INPUT"
        | "AMBIGUOUS"
        | "UNRESOLVED"
        | "LOOKUP_FAILED"
        | "NO_EDITIONS_LOADED"
        | "NOT_ENOUGH_EDITIONS";
      readonly surname: CanonicalSurnameIdentity | null;
      readonly message: string;
    };

/** Resolves the input as every derivation does, then derives. */
export async function deriveDistributionShift(
  db: Kysely<DB>,
  rawInput: string,
  options: DeriveShiftOptions = {},
): Promise<SurnameShiftResult> {
  const resolved = await resolveForDerivation(db, rawInput);
  if (resolved.kind !== "RESOLVED") {
    return {
      kind: "NO_RESULT",
      reason: resolved.reason as "INVALID_INPUT" | "AMBIGUOUS" | "UNRESOLVED" | "LOOKUP_FAILED",
      surname: null,
      message: resolved.message,
    };
  }
  return deriveDistributionShiftFor(db, resolved.surname, options);
}

/** The derivation for a surname already identified: what the batch calls. */
export async function deriveDistributionShiftFor(
  db: Kysely<DB>,
  surname: CanonicalSurnameIdentity,
  options: DeriveShiftOptions = {},
): Promise<SurnameShiftResult> {
  const set = options.editions ?? registryShiftEditions();
  const loaded = options.loadedEditions ?? (await loadOfficialEditions(db, set));
  if (loaded.size === 0) {
    return {
      kind: "NO_RESULT",
      reason: "NO_EDITIONS_LOADED",
      surname,
      message: "no edition's official bytes are stored, so there is nothing to compare",
    };
  }

  const rows = await loadEditionValues(db, surname.surname_id, loaded);
  const builds: ShiftBuild[] = [];
  for (const role of SHIFT_ROLES) {
    const build = buildShift(role, set[role], loaded, rows);
    if (build) builds.push(build);
  }
  if (builds.length === 0) {
    return {
      kind: "NO_RESULT",
      reason: "NOT_ENOUGH_EDITIONS",
      surname,
      message:
        "the surname is listed on fewer than two loaded editions of any list; " +
        "one edition is a count, not a change, and a missing edition is not a zero",
    };
  }

  const lastStore = (build: ShiftBuild): LoadedEdition => {
    const last = build.points.filter((p) => p.status === "KNOWN").at(-1);
    const store = last ? loaded.get(last.resource_id) : undefined;
    if (!store) throw new TruthInvariantError("SHIFT_NO_SOURCE", "a build has no stored edition");
    return store;
  };

  const claims: DistributionShiftClaimResult[] = [];
  for (const build of builds) {
    const source = await loadSourceContext(db, lastStore(build).source_id);
    const rights = options.rightsOverride ?? source.rights;
    // The surfaces are evaluated to fail loudly on a malformed profile; what a
    // surface may show is decided at read time from the stored profile.
    evaluateAllSurfaces(rights);
    claims.push(
      await db
        .transaction()
        .execute(async (trx) => deriveOneShift(trx, surname, build, source, loaded)),
    );
  }
  return { kind: "RESULT", surname, distribution_shift: claims };
}

async function deriveOneShift(
  trx: Transaction<DB>,
  surname: CanonicalSurnameIdentity,
  build: ShiftBuild,
  source: DerivationSourceContext,
  loaded: ReadonlyMap<string, LoadedEdition>,
): Promise<DistributionShiftClaimResult> {
  const known = build.points.filter((p): p is KnownPoint => p.status === "KNOWN");
  const claimKey = distributionShiftClaimKey(surname.surname_id, build.role, build.points);

  // Idempotency: an ACTIVE claim over the same stored editions is reused whole.
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
  if (existing[0]) {
    return {
      role: build.role,
      claim_id: existing[0].claim_id,
      claim_key: claimKey,
      known_points: known.length,
      created: false,
    };
  }

  // An ACTIVE claim of the same surname and list over other editions is the
  // one this replaces: superseded, never rewritten (ARCHITECTURE.md §10).
  const prefix = distributionShiftClaimKeyPrefix(surname.surname_id, build.role);
  const previous = await trx
    .selectFrom("claims")
    .select(["claim_id"])
    .where("claim_key", "like", `${prefix}%`)
    .where("claim_status", "=", "ACTIVE")
    .execute();
  if (previous.length > 1) {
    throw new TruthInvariantError(
      "CONFLICTING_ACTIVE_CLAIMS",
      `${previous.length} active claims share the key prefix ${prefix}`,
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

  // One evidence item per known point: the source's own value, as the
  // population chain records it.
  const pointEvidence: { id: string; point: KnownPoint }[] = [];
  for (const point of known) {
    const id = uuidv7();
    pointEvidence.push({ id, point });
    await trx
      .insertInto("evidence_items")
      .values({
        evidence_item_id: id,
        evidence_type: "OFFICIAL_DATASET_FIELD",
        source_record_id: point.source_record_id,
        subject_entity_id: surname.surname_id,
        structured_value: JSON.stringify({
          count: point.count,
          distribution_snapshot_id: point.distribution_snapshot_id,
          distribution_value_id: point.distribution_value_id,
          as_of_date: point.data_date,
          geography_level: "NATIONAL",
          resource_id: point.resource_id,
        }),
        raw_excerpt: null,
        supporting_locator: `distribution_value:${point.distribution_value_id}`,
        verification_status: "VERIFIED",
        derivation_method: null,
        derivation_version: null,
        created_by_run_id: runId,
      })
      .execute();
  }

  const lastPoint = known[known.length - 1] as KnownPoint;
  const lastStore = loaded.get(lastPoint.resource_id);
  if (!lastStore) throw new TruthInvariantError("SHIFT_NO_SOURCE", "a point has no stored edition");

  // The derived item: the list-relative figures and the two changes, computed
  // over the point evidence above. Its lineage names every input.
  const derivedId = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: derivedId,
      evidence_type: "DERIVED_STATISTIC",
      source_record_id: lastPoint.source_record_id,
      subject_entity_id: surname.surname_id,
      structured_value: JSON.stringify({
        summary: build.summary,
        one_in_x: known.map((p) => ({
          data_date: p.data_date,
          one_in_x: p.one_in_x,
          share: p.share,
        })),
        rounding: DISTRIBUTION_SHIFT_ROUNDING,
        algorithm_version: DISTRIBUTION_SHIFT_METHOD_VERSION,
      }),
      raw_excerpt: null,
      supporting_locator: `source_record:${lastPoint.source_record_id}`,
      verification_status: "VERIFIED",
      derivation_method: "change_across_editions_of_one_list",
      derivation_version: DISTRIBUTION_SHIFT_METHOD_VERSION,
      created_by_run_id: runId,
    })
    .execute();
  for (const { id } of pointEvidence) {
    await trx
      .insertInto("evidence_dependencies")
      .values({
        evidence_dependency_id: uuidv7(),
        derived_evidence_item_id: derivedId,
        depends_on_evidence_item_id: id,
        dependency_role: "COUNT",
      })
      .execute();
  }

  const claimId = uuidv7();
  await trx
    .insertInto("claims")
    .values({
      claim_id: claimId,
      claim_key: claimKey,
      claim_type: "SURNAME_DISTRIBUTION_SHIFT",
      epistemic_type: "FACT",
      scope: "SURNAME_LEVEL",
      subject_entity_id: surname.surname_id,
      object_entity_id: null,
      structured_value: JSON.stringify(shiftStructuredValue(build)),
      statement_key: null,
      claim_status: "ACTIVE",
      supersedes_claim_id: previous[0]?.claim_id ?? null,
      created_by_run_id: runId,
      method_version: DISTRIBUTION_SHIFT_METHOD_VERSION,
    })
    .execute();
  if (previous[0]) {
    await trx
      .updateTable("claims")
      .set({ claim_status: "SUPERSEDED" })
      .where("claim_id", "=", previous[0].claim_id)
      .execute();
  }
  await trx
    .insertInto("claim_evidence")
    .values({
      claim_id: claimId,
      evidence_item_id: derivedId,
      relationship: "SUPPORTS",
      reason_code: "DERIVED_CHANGE_ACROSS_EDITIONS_OF_ONE_LIST",
      notes: null,
    })
    .execute();

  // Confidence: the derived-statistic rule, unchanged. Every point is a
  // verified official field read from an edition whose official bytes are stored.
  const verdict = assessDerivedStatistic({
    computationReproducible: true,
    inputsComplete: true,
    upstreamEvidenceVerified: true,
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
      evidence_set_hash: evidenceSetHash([derivedId, ...pointEvidence.map((e) => e.id)]),
      assessment_method: RANK_CONFIDENCE_ASSESSMENT_METHOD,
      assessment_version: RANK_CONFIDENCE_ASSESSMENT_VERSION,
      human_review_required: verdict.human_review_required,
      review_status: "AUTO",
      assessed_at: new Date(),
    })
    .execute();

  // One citation, to the dataset at its latest edition; its locator names every
  // edition read, and the claim's points carry each edition's own URL.
  await trx
    .insertInto("citations")
    .values({
      citation_id: uuidv7(),
      source_id: source.source_id,
      source_record_id: lastPoint.source_record_id,
      title: source.name,
      publisher: source.publisher,
      publication_date: lastPoint.data_date,
      url_or_reference:
        lastStore.source_url ?? source.homepage_or_reference_url ?? source.rights_url ?? "",
      supporting_locator: `resources:${known.map((p) => p.resource_id).join(",")}`,
      accessed_at: lastStore.retrieved_at,
      rights_profile_id: source.rights_profile_id,
      claim_id: claimId,
    })
    .execute();

  await trx
    .updateTable("research_runs")
    .set({ run_status: "COMPLETE", qa_status: "PASS", completed_at: new Date() })
    .where("research_run_id", "=", runId)
    .execute();

  return {
    role: build.role,
    claim_id: claimId,
    claim_key: claimKey,
    known_points: known.length,
    created: true,
  };
}
