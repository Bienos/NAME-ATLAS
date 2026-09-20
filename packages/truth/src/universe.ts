/**
 * The plumbing every derived statistic shares (TASK-009, TASK-014):
 * resolve the input exactly, load the national values backing the surname,
 * and put each resource version through the completeness gate. `rank.ts`
 * and `rarity.ts` both start here, so there is one gate, not two, and a
 * universe that fails it fails for both claims identically.
 */
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { resolveSurname } from "@name-atlas/resolver";
import { findPeselResource } from "@name-atlas/sources";
import { assessUniverseCompleteness } from "./completeness.js";
import type { CompletenessVerdict } from "./completeness.js";
import type { EffectiveRights } from "./rights.js";
import { TruthInvariantError } from "./derive.js";
import type { CanonicalSurnameIdentity, SurnameRankResult } from "./result.js";

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
export async function universeSize(db: Kysely<DB>, sourceRecordId: string): Promise<number> {
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
 * Resolves the input, loads its national values, and gates each resource
 * version. Returns a refusal — with nothing written — for invalid input,
 * ambiguity, an unresolved surname, no evidence, or no complete universe.
 */
export async function prepareDerivation(
  db: Kysely<DB>,
  rawInput: string,
): Promise<PreparedDerivation> {
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
  const complete: CompleteUniverse[] = [];
  const rejected: RejectedUniverse[] = [];

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
