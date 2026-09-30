/**
 * The plumbing every derived statistic shares (TASK-009, TASK-014, TASK-012):
 * resolve the input exactly, load the values backing the surname, and put each
 * resource version through the completeness gate. `rank.ts`, `rarity.ts` and
 * `distribution.ts` all start here, so there is one gate, not three, and a
 * universe that fails it fails for every claim identically.
 *
 * The national and regional paths deliberately share `resolveForDerivation`
 * and `assessUniverseCompleteness`, and differ only in what they count: the
 * national universe is one value per surname, the regional one is one value
 * per (surname, voivodeship) cell. Both are compared against the same
 * registry facts.
 */
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { resolveSurname } from "@name-atlas/resolver";
import { findPeselResource, TERYT_PROVIDER_KEY } from "@name-atlas/sources";
import type { PeselResourceDescriptor } from "@name-atlas/sources";
import { assessUniverseCompleteness } from "./completeness.js";
import type { CompletenessVerdict } from "./completeness.js";
import type { EffectiveRights } from "./rights.js";
import { TruthInvariantError } from "./derive.js";
import type { CanonicalSurnameIdentity, SurnameRankResult, SurnameTruthResult } from "./result.js";

/**
 * A source record's `universe_description` cannot be absent for a snapshot that
 * exists: the importer writes both in one transaction (TASK-030). A null here is
 * therefore a broken database, not a value to render — so it throws rather than
 * flowing into a claim as an empty string.
 *
 * The same shape as the resolver's `eligibleForm`, and for the same reason: a
 * column the schema cannot make NOT NULL, but the writing path guarantees.
 */
export function requiredProfileText(
  value: string | null,
  field: string,
  sourceRecordId: string,
): string {
  if (value === null) {
    throw new Error(
      `source record ${sourceRecordId} has no ${field}; a distribution snapshot exists for it, ` +
        `so the importer should have written one (TASK-030)`,
    );
  }
  return value;
}

export interface UniverseCandidate {
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

export async function loadCandidates(
  db: Kysely<DB>,
  surnameId: string,
): Promise<UniverseCandidate[]> {
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
    universe_description: requiredProfileText(
      row.universe_description,
      "universe_description",
      row.source_record_id,
    ),
    coverage_notes: row.coverage_notes,
    comparability_group: row.comparability_group,
  }));
}

/**
 * A run-scoped memo for {@link universeSize}.
 *
 * Deliberately **not** module-level state. The count is immutable once an
 * import has finished — a source record's distribution values are written once
 * and never mutated — but it is not immutable *during* one: a derivation run
 * that counted a half-imported record would cache the partial figure and go on
 * refusing after the import completed. A cache the caller creates and discards
 * cannot outlive the run that made it, so that false refusal has a bounded
 * lifetime instead of an unbounded one.
 *
 * A single-page request creates none: it derives one surname and would gain
 * nothing. A batch run over 598,476 surnames creates one and gains everything —
 * the count is 379 ms against the real register, and it is the same 379 ms for
 * every surname.
 */
export type UniverseSizeCache = Map<string, number>;

/** How many surnames have a national value against this source record. */
export async function universeSize(
  db: Kysely<DB>,
  sourceRecordId: string,
  cache?: UniverseSizeCache,
): Promise<number> {
  const memo = cache?.get(sourceRecordId);
  if (memo !== undefined) return memo;
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
  const size = Number(row.n);
  cache?.set(sourceRecordId, size);
  return size;
}

export interface RejectedUniverse {
  readonly source_record_id: string;
  readonly external_record_id: string | null;
  readonly reason: string;
  readonly expected_row_count: number | null;
  readonly actual_row_count: number;
}

export interface CompleteUniverse {
  readonly candidate: UniverseCandidate;
  readonly verdict: Extract<CompletenessVerdict, { kind: "COMPLETE" }>;
}

/** Every refusal a derivation can return before it has a complete universe. */
export type DerivationRefusal = Extract<SurnameRankResult, { kind: "NO_RESULT" }>;

export type PreparedDerivation =
  | DerivationRefusal
  | {
      readonly kind: "READY";
      readonly status: string;
      readonly surname: CanonicalSurnameIdentity;
      readonly complete: readonly CompleteUniverse[];
    };

/**
 * The shape a successful resolution hands to either derivation path. Its
 * refusals are the population chain's, which every other chain's refusal type
 * includes, so the population chain can return them as they are.
 */
export type ResolvedForDerivation =
  | Extract<SurnameTruthResult, { kind: "NO_RESULT" }>
  | {
      readonly kind: "RESOLVED";
      readonly status: string;
      readonly surname: CanonicalSurnameIdentity;
    };

/**
 * Resolves one raw input to exactly one canonical surname, or returns the
 * refusal that says why not. Shared by every derivation so that the national
 * and regional chains cannot drift on what counts as resolved — the same
 * failure mode `lookup.ts`'s bulk path was refactored to prevent.
 *
 * `EXACT` only, as TASK-005 §15 U-5 settled for the population chain.
 */
export async function resolveForDerivation(
  db: Kysely<DB>,
  rawInput: string,
): Promise<ResolvedForDerivation> {
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
  return { kind: "RESOLVED", status, surname };
}

/**
 * Resolves the input, loads its national values, and gates each resource
 * version. Returns a refusal — with nothing written — for invalid input,
 * ambiguity, an unresolved surname, no evidence, or no complete universe.
 */
export async function prepareDerivation(
  db: Kysely<DB>,
  rawInput: string,
  cache?: UniverseSizeCache,
): Promise<PreparedDerivation> {
  const resolved = await resolveForDerivation(db, rawInput);
  if (resolved.kind !== "RESOLVED") {
    return resolved;
  }
  const { status, surname } = resolved;
  const surnameId = surname.surname_id;

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
  const complete: CompleteUniverse[] = [];
  const rejected: RejectedUniverse[] = [];

  for (const candidate of candidates) {
    const descriptor = candidate.external_record_id
      ? findPeselResource(candidate.external_record_id)
      : undefined;
    const verdict = assessUniverseCompleteness({
      externalRecordId: candidate.external_record_id,
      actualContentHash: candidate.content_hash,
      actualRowCount: await universeSize(db, candidate.source_record_id, cache),
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

  return { kind: "READY", status, surname, complete };
}

export interface DerivationSourceContext {
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

export async function loadSourceContext(
  db: Kysely<DB>,
  sourceId: string,
): Promise<DerivationSourceContext> {
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
    // ARCHITECTURE.md §10 invariant 13: no production source without rights.
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

// ---------------------------------------------------------------------------
// The regional path (TASK-012)
// ---------------------------------------------------------------------------

/** One published (surname, voivodeship) cell. */
export interface RegionalCell {
  readonly distribution_value_id: string;
  readonly place_id: string;
  /** The publisher's own geography string, kept so the join is auditable. */
  readonly source_geography_key: string | null;
  /** The TERYT TERC code for that place, via `entity_external_ids`. */
  readonly terc_code: string | null;
  readonly place_display_name: string;
  readonly count: number;
}

/**
 * One regional resource version's cells for one surname.
 *
 * Deliberately not a `UniverseCandidate`: a regional snapshot carries no
 * single count, and giving it one would invite exactly the summing across the
 * geography restriction that TASK-012 §8 forbids.
 */
export interface RegionalUniverseCandidate {
  readonly distribution_snapshot_id: string;
  readonly source_record_id: string;
  readonly source_id: string;
  readonly external_record_id: string | null;
  readonly content_hash: string;
  readonly as_of_date: string | null;
  readonly universe_description: string;
  readonly coverage_notes: string | null;
  readonly comparability_group: string | null;
  /** Descending by count, then by place name, so a projection is deterministic. */
  readonly cells: readonly RegionalCell[];
}

/**
 * Loads a surname's regional cells, grouped by resource version.
 *
 * A cell exists only where the publisher listed one. There is no row for a
 * voivodeship the surname is absent from, and none is synthesised here:
 * absence is not zero (`ARCHITECTURE.md` §10 invariant 4), and
 * `docs/canonical/16` §28 forbids fabricated empty features specifically.
 */
export async function loadRegionalCandidates(
  db: Kysely<DB>,
  surnameId: string,
): Promise<RegionalUniverseCandidate[]> {
  const rows = await db
    .selectFrom("distribution_snapshots as s")
    .innerJoin(
      "distribution_values as v",
      "v.distribution_snapshot_id",
      "s.distribution_snapshot_id",
    )
    .innerJoin("source_records as sr", "sr.source_record_id", "s.source_record_id")
    .innerJoin("places as p", "p.place_id", "v.place_id")
    .leftJoin("entity_external_ids as x", (join) =>
      join.onRef("x.entity_id", "=", "p.place_id").on("x.provider_key", "=", TERYT_PROVIDER_KEY),
    )
    .select([
      "s.distribution_snapshot_id",
      "s.source_record_id",
      "s.source_id",
      "sr.external_record_id",
      "sr.content_hash",
      "sr.universe_description",
      "sr.coverage_notes",
      "sr.comparability_group",
      "v.distribution_value_id",
      "v.place_id",
      "v.source_geography_key",
      "v.count",
      "p.current_display_name",
      "x.external_id as terc_code",
    ])
    .select((eb) =>
      eb.fn<string | null>("to_char", ["s.as_of_date", eb.val("YYYY-MM-DD")]).as("as_of_date"),
    )
    .where("s.surname_id", "=", surnameId)
    .where("s.geography_level", "=", "REGION")
    .where("v.place_id", "is not", null)
    .orderBy("s.source_record_id")
    .orderBy("v.count", "desc")
    .orderBy("p.current_display_name")
    .execute();

  const byRecord = new Map<string, RegionalUniverseCandidate>();
  const cells = new Map<string, RegionalCell[]>();
  for (const row of rows) {
    if (row.place_id === null) continue;
    if (!byRecord.has(row.source_record_id)) {
      byRecord.set(row.source_record_id, {
        distribution_snapshot_id: row.distribution_snapshot_id,
        source_record_id: row.source_record_id,
        source_id: row.source_id,
        external_record_id: row.external_record_id,
        content_hash: row.content_hash,
        as_of_date: row.as_of_date,
        universe_description: requiredProfileText(
          row.universe_description,
          "universe_description",
          row.source_record_id,
        ),
        coverage_notes: row.coverage_notes,
        comparability_group: row.comparability_group,
        cells: [],
      });
      cells.set(row.source_record_id, []);
    }
    cells.get(row.source_record_id)?.push({
      distribution_value_id: row.distribution_value_id,
      place_id: row.place_id,
      source_geography_key: row.source_geography_key,
      terc_code: row.terc_code,
      place_display_name: row.current_display_name,
      count: Number(row.count),
    });
  }
  return [...byRecord.values()].map((candidate) => ({
    ...candidate,
    cells: cells.get(candidate.source_record_id) ?? [],
  }));
}

/**
 * How many published cells exist against a regional source record.
 *
 * This, not the number of surnames, is what the registry's
 * `official_row_count` records for a regional resource: the CSV has one data
 * row per (voivodeship, surname) pair, so 646,052 rows describe 188,413
 * surnames. Counting surnames here would fail the gate on every complete
 * import.
 */
export async function regionalUniverseSize(
  db: Kysely<DB>,
  sourceRecordId: string,
  cache?: UniverseSizeCache,
): Promise<number> {
  const memo = cache?.get(`region:${sourceRecordId}`);
  if (memo !== undefined) return memo;
  const row = await db
    .selectFrom("distribution_snapshots as s")
    .innerJoin(
      "distribution_values as v",
      "v.distribution_snapshot_id",
      "s.distribution_snapshot_id",
    )
    .select((eb) => eb.fn.countAll<string>().as("n"))
    .where("s.source_record_id", "=", sourceRecordId)
    .where("v.place_id", "is not", null)
    .executeTakeFirstOrThrow();
  const size = Number(row.n);
  cache?.set(`region:${sourceRecordId}`, size);
  return size;
}

export interface CompleteRegionalUniverse {
  readonly candidate: RegionalUniverseCandidate;
  readonly verdict: Extract<CompletenessVerdict, { kind: "COMPLETE" }>;
  /** The resource's registry descriptor, already matched by the gate. */
  readonly descriptor: PeselResourceDescriptor;
}

export type PreparedRegionalDerivation =
  | DerivationRefusal
  | {
      readonly kind: "READY";
      readonly status: string;
      readonly surname: CanonicalSurnameIdentity;
      readonly complete: readonly CompleteRegionalUniverse[];
    };

/**
 * The regional counterpart of `prepareDerivation`: resolve, load the cells,
 * gate each resource version. Same gate, same refusals, nothing written.
 */
export async function prepareRegionalDerivation(
  db: Kysely<DB>,
  rawInput: string,
  cache?: UniverseSizeCache,
): Promise<PreparedRegionalDerivation> {
  const resolved = await resolveForDerivation(db, rawInput);
  if (resolved.kind !== "RESOLVED") {
    return resolved;
  }
  const { status, surname } = resolved;

  const candidates = await loadRegionalCandidates(db, surname.surname_id);
  if (candidates.length === 0) {
    return {
      kind: "NO_RESULT",
      reason: "NO_APPLICABLE_EVIDENCE",
      resolution_status: status,
      surname,
      message:
        "surname resolved but no regional distribution snapshot exists; this is absence, " +
        "not a distribution of zeroes",
    };
  }

  const complete: CompleteRegionalUniverse[] = [];
  const rejected: RejectedUniverse[] = [];

  for (const candidate of candidates) {
    const descriptor = candidate.external_record_id
      ? findPeselResource(candidate.external_record_id)
      : undefined;
    const verdict = assessUniverseCompleteness({
      externalRecordId: candidate.external_record_id,
      actualContentHash: candidate.content_hash,
      actualRowCount: await regionalUniverseSize(db, candidate.source_record_id, cache),
      descriptor: descriptor
        ? {
            officialSha256: descriptor.official_sha256,
            officialRowCount: descriptor.official_row_count,
          }
        : null,
    });
    if (verdict.kind === "COMPLETE" && descriptor) {
      complete.push({ candidate, verdict, descriptor });
    } else {
      rejected.push({
        source_record_id: candidate.source_record_id,
        external_record_id: candidate.external_record_id,
        reason: verdict.kind === "COMPLETE" ? "UNKNOWN_RESOURCE" : verdict.reason,
        expected_row_count: verdict.kind === "COMPLETE" ? null : verdict.expectedRowCount,
        actual_row_count:
          verdict.kind === "COMPLETE" ? verdict.universeSize : verdict.actualRowCount,
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
        "no regional resource version backing this surname is a complete universe, so no " +
        "distribution can be derived; a distribution over a partial import would misstate " +
        "both the shares and the coverage",
      incomplete_universes: rejected,
    };
  }

  return { kind: "READY", status, surname, complete };
}
