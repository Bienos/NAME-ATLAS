import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import type { ArchiveSection, SurfaceEligibilityDto } from "@name-atlas/contracts";
import { uuidv7 } from "@name-atlas/domain";
import { NORMALIZATION_VERSION } from "@name-atlas/resolver";
import { POLONA_SOURCE_KEY, polonaInventoryRecordId } from "@name-atlas/sources";
import type { PolonaInventory } from "@name-atlas/sources";
import { evidenceSetHash, isValidCombination } from "./confidence.js";
import { TruthInvariantError } from "./derive.js";
import { evaluateSurface, sectionEligibility } from "./rights.js";
import type { EffectiveRights, Surface } from "./rights.js";
import {
  ARCHIVE_AVAILABILITY_METHOD_VERSION,
  ARCHIVE_AVAILABILITY_PAYLOAD_VERSION,
  ARCHIVE_CONFIDENCE_ASSESSMENT_METHOD,
  ARCHIVE_CONFIDENCE_ASSESSMENT_VERSION,
  RUN_INPUT_SCHEMA_VERSION,
  WORKFLOW_VERSION,
} from "./version.js";

/**
 * `ARCHIVE_AVAILABILITY` (TASK-054, ADR-0024; `docs/canonical/11` §11):
 * what a digital library's search returned for a surname, as a claim.
 *
 * A `FACT` about the search output, `VERIFIED` within the searched scope. The
 * counts are search matches for a word in any inflected form, never people or
 * verified occurrences of the surname, and every surface that shows them says
 * so. One claim per surname and source, superseded when a new search returns
 * something different.
 */

export function archiveAvailabilityClaimKey(surnameId: string): string {
  return `ARCHIVE_AVAILABILITY|polona|${surnameId}`;
}

/** The claim payload: the stored inventory, plus where it came from. */
interface ArchivePayload {
  readonly payload_version: typeof ARCHIVE_AVAILABILITY_PAYLOAD_VERSION;
  readonly source_record_id: string;
  readonly source_id: string;
  readonly searched_at: string;
  readonly inventory: PolonaInventory;
  readonly algorithm_version: typeof ARCHIVE_AVAILABILITY_METHOD_VERSION;
}

export type ArchiveDerivation =
  | { readonly status: "DERIVED"; readonly claim_id: string; readonly superseded: string | null }
  | { readonly status: "UNCHANGED"; readonly claim_id: string }
  | { readonly status: "NO_RECORD" };

/**
 * Derives (or re-derives) the surname's archive claim from its active Polona
 * inventory record.
 *
 * Idempotent: a claim already built from the active record is left as it is.
 * A claim built from an older record is superseded, so the page never shows
 * two searches at once.
 */
export async function deriveArchiveAvailability(
  db: Kysely<DB>,
  surnameId: string,
): Promise<ArchiveDerivation> {
  return db.transaction().execute(async (trx) => {
    const record = await trx
      .selectFrom("source_records as sr")
      .innerJoin("sources as src", "src.source_id", "sr.source_id")
      .select([
        "sr.source_record_id",
        "sr.source_id",
        "sr.source_url",
        "sr.raw_payload",
        "sr.retrieved_at",
        "src.name",
        "src.publisher",
        "src.default_rights_profile_id",
      ])
      .where("src.source_key", "=", POLONA_SOURCE_KEY)
      .where("sr.external_record_id", "=", polonaInventoryRecordId(surnameId))
      .where("sr.record_status", "=", "ACTIVE")
      .execute();
    if (record.length > 1) {
      throw new TruthInvariantError(
        "CONFLICTING_ACTIVE_RECORDS",
        `${String(record.length)} active Polona records for surname ${surnameId}`,
      );
    }
    const source = record[0];
    if (!source) return { status: "NO_RECORD" };

    const claimKey = archiveAvailabilityClaimKey(surnameId);
    const existing = await trx
      .selectFrom("claims")
      .select(["claim_id", sql<string>`structured_value->>'source_record_id'`.as("record_id")])
      .where("claim_key", "=", claimKey)
      .where("claim_status", "=", "ACTIVE")
      .execute();
    if (existing.length > 1) {
      throw new TruthInvariantError(
        "CONFLICTING_ACTIVE_CLAIMS",
        `${String(existing.length)} active claims share claim_key ${claimKey}`,
      );
    }
    const previous = existing[0];
    if (previous && previous.record_id === source.source_record_id) {
      return { status: "UNCHANGED", claim_id: previous.claim_id };
    }

    const raw = (
      typeof source.raw_payload === "string" ? JSON.parse(source.raw_payload) : source.raw_payload
    ) as { inventory?: PolonaInventory } | null;
    const inventory = raw?.inventory;
    if (!inventory || inventory.version !== "polona_inventory@1") {
      throw new TruthInvariantError(
        "UNREADABLE_SOURCE_RECORD",
        `source record ${source.source_record_id} carries no polona_inventory@1 summary`,
      );
    }

    if (previous) {
      await trx
        .updateTable("claims")
        .set({ claim_status: "SUPERSEDED" })
        .where("claim_id", "=", previous.claim_id)
        .execute();
    }

    const runId = uuidv7();
    await trx
      .insertInto("research_runs")
      .values({
        research_run_id: runId,
        run_type: "BASIC_SURNAME",
        surname_id: surnameId,
        raw_input: JSON.stringify({ surname_id: surnameId, claim_key: claimKey }),
        input_schema_version: RUN_INPUT_SCHEMA_VERSION,
        workflow_version: WORKFLOW_VERSION,
        connector_manifest: JSON.stringify({
          source_id: source.source_id,
          source_name: source.name,
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

    // AUTHORITATIVE_INDEX: a library catalogue's search index. MACHINE_EXTRACTED:
    // the figures were read from the response without review.
    const evidenceItemId = uuidv7();
    await trx
      .insertInto("evidence_items")
      .values({
        evidence_item_id: evidenceItemId,
        evidence_type: "AUTHORITATIVE_INDEX",
        source_record_id: source.source_record_id,
        subject_entity_id: surnameId,
        structured_value: JSON.stringify({
          query: inventory.query,
          catalogue_records: inventory.catalogue_records,
          pages: inventory.pages,
        }),
        raw_excerpt: null,
        supporting_locator: inventory.query,
        verification_status: "MACHINE_EXTRACTED",
        derivation_method: null,
        derivation_version: null,
        created_by_run_id: runId,
      })
      .execute();

    const searchedAt = new Date(source.retrieved_at).toISOString();
    const payload: ArchivePayload = {
      payload_version: ARCHIVE_AVAILABILITY_PAYLOAD_VERSION,
      source_record_id: source.source_record_id,
      source_id: source.source_id,
      searched_at: searchedAt,
      inventory,
      algorithm_version: ARCHIVE_AVAILABILITY_METHOD_VERSION,
    };
    const claimId = uuidv7();
    await trx
      .insertInto("claims")
      .values({
        claim_id: claimId,
        claim_key: claimKey,
        claim_type: "ARCHIVE_AVAILABILITY",
        epistemic_type: "FACT",
        scope: "SURNAME_LEVEL",
        subject_entity_id: surnameId,
        object_entity_id: null,
        structured_value: JSON.stringify(payload),
        statement_key: null,
        claim_status: "ACTIVE",
        supersedes_claim_id: previous?.claim_id ?? null,
        created_by_run_id: runId,
        method_version: ARCHIVE_AVAILABILITY_METHOD_VERSION,
      })
      .execute();

    await trx
      .insertInto("claim_evidence")
      .values({
        claim_id: claimId,
        evidence_item_id: evidenceItemId,
        relationship: "SUPPORTS",
        reason_code: "ARCHIVE_SEARCH_OUTPUT",
        notes: null,
      })
      .execute();

    if (!isValidCombination("FACT", "VERIFIED")) {
      throw new TruthInvariantError("INVALID_EPISTEMIC_COMBINATION", "(FACT, VERIFIED)");
    }
    await trx
      .insertInto("confidence_assessments")
      .values({
        confidence_assessment_id: uuidv7(),
        claim_id: claimId,
        status: "VERIFIED",
        rationale:
          "The counts are what the source's own search returned for the quoted surname on the " +
          "stated date, within the stated scope. They are word matches in any inflected form, " +
          "not verified occurrences of the surname (ADR-0024 §2.5).",
        evidence_set_hash: evidenceSetHash([evidenceItemId]),
        assessment_method: ARCHIVE_CONFIDENCE_ASSESSMENT_METHOD,
        assessment_version: ARCHIVE_CONFIDENCE_ASSESSMENT_VERSION,
        human_review_required: false,
        review_status: "AUTO",
        assessed_at: new Date(),
      })
      .execute();

    await trx
      .insertInto("citations")
      .values({
        citation_id: uuidv7(),
        source_id: source.source_id,
        source_record_id: source.source_record_id,
        title: source.name,
        publisher: source.publisher,
        publication_date: null,
        url_or_reference: source.source_url ?? "https://polona.pl/",
        supporting_locator: inventory.query,
        accessed_at: source.retrieved_at,
        rights_profile_id: source.default_rights_profile_id,
        claim_id: claimId,
      })
      .execute();

    await trx
      .updateTable("research_runs")
      .set({ run_status: "COMPLETE", qa_status: "PASS", completed_at: new Date() })
      .where("research_run_id", "=", runId)
      .execute();

    return { status: "DERIVED", claim_id: claimId, superseded: previous?.claim_id ?? null };
  });
}

// ---------------------------------------------------------------------------
// Read path
// ---------------------------------------------------------------------------

export interface PersistedArchiveAvailability {
  readonly claim_id: string;
  readonly payload: ArchivePayload;
  readonly confidence_status: string;
  readonly assessment_method: string;
  readonly assessment_version: string;
  readonly citation_id: string;
  readonly citation_title: string;
  readonly citation_publisher: string | null;
  readonly citation_url: string | null;
  readonly citation_locator: string | null;
  readonly citation_retrieved_at: string | null;
  readonly citation_source_page_url: string | null;
  readonly source_type: string;
  readonly attribution_text: string | null;
  readonly terms_version: string | null;
  readonly rights: EffectiveRights;
}

/** The surname's active archive claim, or null when it has not been searched. */
export async function readArchiveAvailability(
  db: Kysely<DB>,
  surnameId: string,
): Promise<PersistedArchiveAvailability | null> {
  const result = await sql<{
    claim_id: string;
    payload: string;
    confidence_status: string;
    assessment_method: string;
    assessment_version: string;
    citation_id: string;
    citation_title: string;
    citation_publisher: string | null;
    citation_url: string | null;
    citation_locator: string | null;
    citation_retrieved_at: string | null;
    citation_source_page_url: string | null;
    source_type: string;
    attribution_text: string | null;
    terms_version: string | null;
    automated_access: string;
    commercial_use: string;
    redistribution: string;
    metadata_rights: string;
    review_status: string;
  }>`
    SELECT
      c.claim_id::text                 AS claim_id,
      c.structured_value::text         AS payload,
      ca.status::text                  AS confidence_status,
      ca.assessment_method             AS assessment_method,
      ca.assessment_version            AS assessment_version,
      cit.citation_id::text            AS citation_id,
      cit.title                        AS citation_title,
      cit.publisher                    AS citation_publisher,
      cit.url_or_reference             AS citation_url,
      cit.supporting_locator           AS citation_locator,
      to_char(cit.accessed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                                       AS citation_retrieved_at,
      src.homepage_or_reference_url    AS citation_source_page_url,
      src.source_type::text            AS source_type,
      rp.attribution_text              AS attribution_text,
      rp.terms_version                 AS terms_version,
      rp.automated_access::text        AS automated_access,
      rp.commercial_use::text          AS commercial_use,
      rp.redistribution::text          AS redistribution,
      rp.metadata_rights::text         AS metadata_rights,
      rp.review_status::text           AS review_status
    FROM claims c
    JOIN confidence_assessments ca ON ca.claim_id = c.claim_id
    JOIN citations cit             ON cit.claim_id = c.claim_id
    JOIN sources src               ON src.source_id = cit.source_id
    JOIN rights_profiles rp        ON rp.rights_profile_id = cit.rights_profile_id
    -- By key and as text, never by the enum literal: a database that has not
    -- run migration 0025 yet has no ARCHIVE_AVAILABILITY value, and comparing
    -- the enum column to it would fail every surname page instead of finding
    -- nothing. The key is unique among ACTIVE claims (0004).
    WHERE c.claim_key = ${archiveAvailabilityClaimKey(surnameId)}
      AND c.claim_type::text = 'ARCHIVE_AVAILABILITY'
      AND c.claim_status = 'ACTIVE'
    LIMIT 1
  `.execute(db);
  const row = result.rows[0];
  if (!row) return null;
  return {
    claim_id: row.claim_id,
    payload: JSON.parse(row.payload) as ArchivePayload,
    confidence_status: row.confidence_status,
    assessment_method: row.assessment_method,
    assessment_version: row.assessment_version,
    citation_id: row.citation_id,
    citation_title: row.citation_title,
    citation_publisher: row.citation_publisher,
    citation_url: row.citation_url,
    citation_locator: row.citation_locator,
    citation_retrieved_at: row.citation_retrieved_at,
    citation_source_page_url: row.citation_source_page_url,
    source_type: row.source_type,
    attribution_text: row.attribution_text,
    terms_version: row.terms_version,
    rights: {
      automated_access: row.automated_access,
      commercial_use: row.commercial_use,
      redistribution: row.redistribution,
      metadata_rights: row.metadata_rights,
      review_status: row.review_status,
    },
  };
}

// ---------------------------------------------------------------------------
// The contract's section
// ---------------------------------------------------------------------------

function emptyArchive(
  state: "NOT_SEARCHED" | "RIGHTS_BLOCKED" | "UNAVAILABLE",
  reasonCode: string,
  surface: SurfaceEligibilityDto,
): ArchiveSection {
  return {
    state,
    query: null,
    searched_on: null,
    catalogue_records: null,
    catalogue_by_category: [],
    pages: null,
    pages_by_period: [],
    pages_by_place: [],
    examples: [],
    confidence: null,
    citation: null,
    reason_code: reasonCode,
    surface,
  };
}

/** Rights for a section with no source: every dimension unknown, fail closed. */
const NO_RIGHTS_KNOWN: EffectiveRights = {
  automated_access: "UNKNOWN",
  commercial_use: "UNKNOWN",
  redistribution: "UNKNOWN",
  metadata_rights: "UNKNOWN",
  review_status: "LEGAL_REVIEW_REQUIRED",
};

/** Projects a persisted claim into the contract's section. */
export function projectArchiveSection(
  claim: PersistedArchiveAvailability,
  surface: SurfaceEligibilityDto,
): ArchiveSection {
  const inv = claim.payload.inventory;
  if (claim.confidence_status !== "VERIFIED") {
    return emptyArchive("UNAVAILABLE", "ARCHIVE_CLAIM_INCOMPLETE", surface);
  }
  return {
    state: "READY",
    query: inv.query,
    searched_on: claim.payload.searched_at.slice(0, 10),
    catalogue_records: inv.catalogue_records,
    catalogue_by_category: inv.catalogue_by_category.map((c) => ({ ...c })),
    pages: inv.pages,
    // Periods without a page are left out: an empty bar says nothing a reader needs.
    pages_by_period: inv.pages_by_period.filter((p) => p.count > 0).map((p) => ({ ...p })),
    pages_by_place: inv.pages_by_place.map((c) => ({ ...c })),
    examples: inv.examples.slice(0, 3).map((e) => ({
      title: e.title,
      date: e.date,
      page_number: e.page_number,
      excerpt: e.excerpt,
      url: e.url,
    })),
    confidence: {
      status: "VERIFIED",
      methodology_code: `${claim.assessment_method}@${claim.assessment_version}`,
    },
    citation: {
      id: claim.citation_id,
      title: claim.citation_title,
      publisher: claim.citation_publisher,
      publication_date: null,
      source_type: claim.source_type,
      locator: claim.citation_locator,
      url: claim.citation_url,
      attribution: claim.attribution_text,
      terms: claim.terms_version,
      retrieved_at: claim.citation_retrieved_at,
      source_page_url: claim.citation_source_page_url,
    },
    reason_code: null,
    surface,
  };
}

/**
 * The archive section, gated on its own source's rights, independent of the
 * register's (the meaning section's reasoning, `query.ts`).
 */
export async function archiveSectionFor(
  db: Kysely<DB>,
  surnameId: string,
  surface: Surface,
): Promise<ArchiveSection> {
  const claim = await readArchiveAvailability(db, surnameId);
  if (!claim) {
    return emptyArchive(
      "NOT_SEARCHED",
      "ARCHIVE_NOT_SEARCHED",
      evaluateSurface(NO_RIGHTS_KNOWN, surface),
    );
  }
  const eligibility = sectionEligibility(
    evaluateSurface(claim.rights, surface),
    [claim.rights],
    surface,
  );
  if (eligibility.decision === "BLOCKED") {
    return emptyArchive("RIGHTS_BLOCKED", eligibility.reason_code, eligibility);
  }
  return projectArchiveSection(claim, eligibility);
}

// ---------------------------------------------------------------------------
// Which surnames to search
// ---------------------------------------------------------------------------

export interface ArchiveCandidate {
  readonly surname_id: string;
  readonly display_name: string;
  readonly best_rank: number;
}

/**
 * Surnames ranked within `topRank` in either register list, best rank first,
 * leaving out those searched within the last `refreshDays` (ADR-0024 §2.6).
 */
export async function selectArchiveCandidates(
  db: Kysely<DB>,
  options: { readonly topRank: number; readonly refreshDays: number; readonly limit?: number },
): Promise<ArchiveCandidate[]> {
  const limit = options.limit ?? 1_000_000;
  const rows = await sql<{ surname_id: string; display_name: string; best_rank: number }>`
    WITH ranked AS (
      SELECT c.subject_entity_id AS surname_id,
             min((c.structured_value->>'rank')::int) AS best_rank
      FROM claims c
      WHERE c.claim_key LIKE 'CURRENT_RANK|%'
        AND c.claim_type = 'CURRENT_RANK'
        AND c.claim_status = 'ACTIVE'
        AND (c.structured_value->>'rank')::int <= ${options.topRank}
      GROUP BY c.subject_entity_id
    )
    SELECT r.surname_id::text AS surname_id, s.canonical_display AS display_name, r.best_rank
    FROM ranked r
    JOIN surnames s ON s.surname_id = r.surname_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM source_records sr
      JOIN sources src ON src.source_id = sr.source_id
      WHERE src.source_key = ${POLONA_SOURCE_KEY}
        AND sr.external_record_id = 'polona-inventory:' || r.surname_id::text
        AND sr.record_status = 'ACTIVE'
        AND sr.retrieved_at > now() - make_interval(days => ${options.refreshDays})
    )
    ORDER BY r.best_rank, s.canonical_key
    LIMIT ${limit}
  `.execute(db);
  return rows.rows.map((r) => ({ ...r, best_rank: Number(r.best_rank) }));
}
