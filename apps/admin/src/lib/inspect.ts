/**
 * The read-only surname trace (TASK-018).
 *
 * Answers "where did this number come from?" in one query set:
 * `Source → SourceRecord → DistributionSnapshot → EvidenceItem → Claim →
 * ConfidenceAssessment → Citation`, plus the rights in force and which source
 * record the registry actually vouches for.
 *
 * Read-only, and enforced the same way `lookup.ts` enforces it: every statement
 * runs inside a PostgreSQL `READ ONLY` transaction, so a write would be refused
 * by the server rather than by a convention.
 *
 * It shows raw stored values and computes no figure. It shows `SUPERSEDED`
 * claims, which is much of the point: D-018 was found by noticing a duplicate
 * count and then writing SQL by hand, and this is the tool that would have shown
 * it without that.
 */
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { findPeselResource } from "@name-atlas/sources";
import {
  classifyRightsState,
  completeRights,
  connectorExecutable,
  evaluateRightsMatrix,
  reproductionEligible,
} from "@name-atlas/truth";
import type { AssetEligibility, RightsState } from "@name-atlas/truth";

/**
 * Whether the inspector may run at all (TASK-018 §2).
 *
 * `docs/canonical/22` §6 requires staff authentication and §11–§13 a role model,
 * and none of it exists. So the console refuses unless this is set explicitly.
 * It is a lock on a door that has no lock — deliberately not authentication, and
 * the page says so where nobody can miss it.
 *
 * Exact string only: `1`, `yes` and `TRUE` do not enable it, so a half-remembered
 * value cannot open the door by accident.
 */
export function inspectorEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env["ADMIN_INSPECTOR_ENABLED"] === "true";
}

export interface InspectedIdentity {
  readonly surname_id: string;
  readonly canonical_display: string;
  readonly canonical_key: string;
  readonly canonical_key_version: string;
  readonly primary_script: string;
  readonly mixed_script: boolean;
  readonly script_confusable_flag: boolean;
  readonly entity_status: string;
}

export interface InspectedSourceRecord {
  readonly source_record_id: string;
  readonly source_name: string;
  readonly publisher: string | null;
  readonly external_record_id: string | null;
  readonly content_hash: string;
  readonly retrieved_at: string;
  /** Row count persisted against this record, whatever its geography level. */
  readonly persisted_rows: number;
  /** What the registry says, when it knows this resource at all. */
  readonly registry_sha256: string | null;
  readonly registry_row_count: number | null;
  /** The D-018 decision, made visible: is this the file the registry vouches for? */
  readonly checksum_matches: boolean | null;
  readonly row_count_matches: boolean | null;
}

export interface InspectedSnapshot {
  readonly distribution_snapshot_id: string;
  readonly source_record_id: string;
  readonly external_record_id: string | null;
  readonly geography_level: string;
  readonly comparability_group: string | null;
  readonly as_of_date: string | null;
  readonly universe_description: string;
  /** One row per value: national has one, regional one per voivodeship. */
  readonly values: readonly {
    readonly place: string | null;
    readonly terc_code: string | null;
    readonly count: number;
  }[];
}

export interface InspectedEvidence {
  readonly evidence_item_id: string;
  readonly evidence_type: string;
  readonly verification_status: string;
  readonly derivation_method: string | null;
  readonly derivation_version: string | null;
  readonly supporting_locator: string | null;
  /** Lineage: which items this one was derived from, and in what role. */
  readonly depends_on: readonly { readonly role: string; readonly evidence_item_id: string }[];
}

export interface InspectedClaim {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly claim_type: string;
  readonly claim_status: string;
  readonly epistemic_type: string;
  readonly method_version: string;
  readonly source_record_id: string | null;
  readonly external_record_id: string | null;
  readonly confidence_status: string | null;
  readonly assessment_method: string | null;
  readonly assessment_version: string | null;
  /** Internal, and this is the one surface where it may be read (canonical/11 §10.3). */
  readonly rationale: string | null;
  readonly human_review_required: boolean | null;
  readonly citation_title: string | null;
  readonly citation_locator: string | null;
  readonly citation_terms: string | null;
  readonly evidence: readonly InspectedEvidence[];
}

export interface InspectedRights {
  readonly rights_profile_id: string;
  readonly source_name: string;
  readonly automated_access: string;
  readonly commercial_use: string;
  readonly redistribution: string;
  readonly metadata_rights: string;
  // The two dimensions D-003 required to be evaluated independently of
  // metadata (docs/canonical/12 §16.4, ADR-0007).
  readonly transcription_rights: string;
  readonly image_rights: string;
  readonly database_rights: string;
  readonly attribution_required: boolean;
  readonly attribution_text: string | null;
  readonly source_owner: string | null;
  readonly rights_url: string | null;
  readonly review_status: string;
  readonly terms_version: string | null;
  /** How many of this surname's source records this posture governs. */
  readonly record_count: number;
  /**
   * Whether any of those records carries its own profile rather than
   * inheriting the source default (`docs/canonical/12` §6.1).
   */
  readonly record_level_override: boolean;
  /** Which row of §6.3's decision matrix this posture sits on. */
  readonly rights_state: RightsState;
  /** Every (asset kind x surface) decision. Computed, never stored. */
  readonly matrix: readonly AssetEligibility[];
  readonly reproduction_eligible: boolean;
  readonly connector_executable: boolean;
}

export type Inspection =
  | { readonly kind: "NOT_FOUND"; readonly query: string }
  | {
      readonly kind: "FOUND";
      readonly identity: InspectedIdentity;
      readonly source_records: readonly InspectedSourceRecord[];
      readonly snapshots: readonly InspectedSnapshot[];
      readonly claims: readonly InspectedClaim[];
      readonly rights: readonly InspectedRights[];
    };

/**
 * Inspects one surname by its canonical key.
 *
 * Matched on `canonical_key`, so the caller may type any casing; the key is
 * computed by the resolver's own function rather than by a second, looser one.
 */
export async function inspectSurname(db: Kysely<DB>, canonicalKey: string): Promise<Inspection> {
  return db
    .transaction()
    .setAccessMode("read only")
    .execute(async (trx) => {
      const identity = await sql<InspectedIdentity>`
        SELECT s.surname_id::text, s.canonical_display, s.canonical_key, s.canonical_key_version,
               s.primary_script, s.mixed_script, s.script_confusable_flag,
               e.lifecycle_status::text AS entity_status
        FROM surnames s
        JOIN knowledge_entities e ON e.entity_id = s.surname_id
        WHERE s.canonical_key = ${canonicalKey}
      `.execute(trx);
      const found = identity.rows[0];
      if (!found) return { kind: "NOT_FOUND" as const, query: canonicalKey };

      const sourceRows = await sql<{
        source_record_id: string;
        source_name: string;
        publisher: string | null;
        external_record_id: string | null;
        content_hash: string;
        retrieved_at: string;
        persisted_rows: string;
      }>`
        SELECT DISTINCT sr.source_record_id::text, src.name AS source_name, src.publisher,
               sr.external_record_id, sr.content_hash,
               to_char(sr.retrieved_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS retrieved_at,
               (SELECT count(*)::text FROM distribution_snapshots ds
                JOIN distribution_values dv
                  ON dv.distribution_snapshot_id = ds.distribution_snapshot_id
                WHERE ds.source_record_id = sr.source_record_id) AS persisted_rows
        FROM distribution_snapshots s
        JOIN source_records sr ON sr.source_record_id = s.source_record_id
        JOIN sources src ON src.source_id = sr.source_id
        WHERE s.surname_id = ${found.surname_id}::uuid
        ORDER BY sr.external_record_id, sr.source_record_id::text
      `.execute(trx);

      const source_records: InspectedSourceRecord[] = sourceRows.rows.map((row) => {
        const descriptor = row.external_record_id
          ? findPeselResource(row.external_record_id)
          : undefined;
        const persisted = Number(row.persisted_rows);
        return {
          source_record_id: row.source_record_id,
          source_name: row.source_name,
          publisher: row.publisher,
          external_record_id: row.external_record_id,
          content_hash: row.content_hash,
          retrieved_at: row.retrieved_at,
          persisted_rows: persisted,
          registry_sha256: descriptor?.official_sha256 ?? null,
          registry_row_count: descriptor?.official_row_count ?? null,
          checksum_matches: descriptor ? row.content_hash === descriptor.official_sha256 : null,
          row_count_matches: descriptor ? persisted === descriptor.official_row_count : null,
        };
      });

      const snapshotRows = await sql<{
        distribution_snapshot_id: string;
        source_record_id: string;
        external_record_id: string | null;
        geography_level: string;
        comparability_group: string | null;
        as_of_date: string | null;
        universe_description: string;
        place: string | null;
        terc_code: string | null;
        count: string;
      }>`
        SELECT s.distribution_snapshot_id::text, s.source_record_id::text, sr.external_record_id,
               s.geography_level::text, s.comparability_group,
               to_char(s.as_of_date, 'YYYY-MM-DD') AS as_of_date, s.universe_description,
               p.current_display_name AS place, x.external_id AS terc_code, v.count::text
        FROM distribution_snapshots s
        JOIN source_records sr ON sr.source_record_id = s.source_record_id
        JOIN distribution_values v ON v.distribution_snapshot_id = s.distribution_snapshot_id
        LEFT JOIN places p ON p.place_id = v.place_id
        LEFT JOIN entity_external_ids x
          ON x.entity_id = v.place_id AND x.provider_key = 'TERYT'
        WHERE s.surname_id = ${found.surname_id}::uuid
        ORDER BY sr.external_record_id, s.distribution_snapshot_id::text, v.count DESC
      `.execute(trx);

      const snapshots = new Map<string, InspectedSnapshot>();
      for (const row of snapshotRows.rows) {
        const existing = snapshots.get(row.distribution_snapshot_id);
        const value = {
          place: row.place,
          terc_code: row.terc_code,
          count: Number(row.count),
        };
        if (existing) {
          snapshots.set(row.distribution_snapshot_id, {
            ...existing,
            values: [...existing.values, value],
          });
          continue;
        }
        snapshots.set(row.distribution_snapshot_id, {
          distribution_snapshot_id: row.distribution_snapshot_id,
          source_record_id: row.source_record_id,
          external_record_id: row.external_record_id,
          geography_level: row.geography_level,
          comparability_group: row.comparability_group,
          as_of_date: row.as_of_date,
          universe_description: row.universe_description,
          values: [value],
        });
      }

      // Every status, ACTIVE and SUPERSEDED alike. Hiding a retired claim would
      // defeat the purpose of the page.
      const claimRows = await sql<{
        claim_id: string;
        claim_key: string;
        claim_type: string;
        claim_status: string;
        epistemic_type: string;
        method_version: string;
        source_record_id: string | null;
        external_record_id: string | null;
        confidence_status: string | null;
        assessment_method: string | null;
        assessment_version: string | null;
        rationale: string | null;
        human_review_required: boolean | null;
        citation_title: string | null;
        citation_locator: string | null;
        citation_terms: string | null;
      }>`
        SELECT c.claim_id::text, c.claim_key, c.claim_type::text, c.claim_status::text,
               c.epistemic_type::text, c.method_version,
               s.source_record_id::text, sr.external_record_id,
               ca.status::text AS confidence_status, ca.assessment_method, ca.assessment_version,
               ca.rationale, ca.human_review_required,
               cit.title AS citation_title, cit.supporting_locator AS citation_locator,
               rp.terms_version AS citation_terms
        FROM claims c
        LEFT JOIN distribution_snapshots s
          ON s.distribution_snapshot_id = (c.structured_value->>'distribution_snapshot_id')::uuid
        LEFT JOIN source_records sr ON sr.source_record_id = s.source_record_id
        LEFT JOIN confidence_assessments ca ON ca.claim_id = c.claim_id
        LEFT JOIN citations cit ON cit.claim_id = c.claim_id
        LEFT JOIN rights_profiles rp ON rp.rights_profile_id = cit.rights_profile_id
        WHERE c.subject_entity_id = ${found.surname_id}::uuid
        ORDER BY c.claim_type::text, c.claim_status::text, c.claim_key
      `.execute(trx);

      const evidenceRows = await sql<{
        claim_id: string;
        evidence_item_id: string;
        evidence_type: string;
        verification_status: string;
        derivation_method: string | null;
        derivation_version: string | null;
        supporting_locator: string | null;
        depends_on: string | null;
      }>`
        SELECT ce.claim_id::text, ei.evidence_item_id::text, ei.evidence_type::text,
               ei.verification_status::text, ei.derivation_method, ei.derivation_version,
               ei.supporting_locator,
               (SELECT string_agg(ed.dependency_role::text || ':' || ed.depends_on_evidence_item_id::text, ',')
                FROM evidence_dependencies ed
                WHERE ed.derived_evidence_item_id = ei.evidence_item_id) AS depends_on
        FROM claim_evidence ce
        JOIN evidence_items ei ON ei.evidence_item_id = ce.evidence_item_id
        JOIN claims c ON c.claim_id = ce.claim_id
        WHERE c.subject_entity_id = ${found.surname_id}::uuid
        ORDER BY ce.claim_id::text, ei.created_at
      `.execute(trx);

      const evidenceByClaim = new Map<string, InspectedEvidence[]>();
      for (const row of evidenceRows.rows) {
        const list = evidenceByClaim.get(row.claim_id) ?? [];
        list.push({
          evidence_item_id: row.evidence_item_id,
          evidence_type: row.evidence_type,
          verification_status: row.verification_status,
          derivation_method: row.derivation_method,
          derivation_version: row.derivation_version,
          supporting_locator: row.supporting_locator,
          depends_on: (row.depends_on ?? "")
            .split(",")
            .filter((pair) => pair !== "")
            .map((pair) => {
              const [role = "", id = ""] = pair.split(":");
              return { role, evidence_item_id: id };
            }),
        });
        evidenceByClaim.set(row.claim_id, list);
      }

      const claims: InspectedClaim[] = claimRows.rows.map((row) => ({
        ...row,
        evidence: evidenceByClaim.get(row.claim_id) ?? [],
      }));

      // Rights are read per source record rather than per source, because
      // docs/canonical/12 §6.1 lets a record tighten its source's default and
      // §16.4 says a digital library's objects differ from one another. For
      // PESEL every record inherits, so this collapses to one row per source.
      type RightsRow = Omit<
        InspectedRights,
        "rights_state" | "matrix" | "reproduction_eligible" | "connector_executable"
      >;

      // Grouped by the profile actually in force, not by record: for PESEL every
      // record inherits the source default, and six identical postures would be
      // noise. A record carrying its own profile appears as its own row, which
      // is the case this grouping exists to make visible.
      const rightsRows = await sql<RightsRow>`
        SELECT rp.rights_profile_id::text, src.name AS source_name,
               rp.automated_access::text, rp.commercial_use::text, rp.redistribution::text,
               rp.metadata_rights::text, rp.transcription_rights::text, rp.image_rights::text,
               rp.database_rights::text, rp.attribution_required, rp.attribution_text,
               rp.source_owner, rp.rights_url, rp.review_status::text, rp.terms_version,
               count(DISTINCT sr.source_record_id)::int AS record_count,
               bool_or(sr.rights_profile_id IS NOT NULL) AS record_level_override
        FROM distribution_snapshots s
        JOIN sources src ON src.source_id = s.source_id
        JOIN source_records sr ON sr.source_record_id = s.source_record_id
        JOIN rights_profiles rp
          ON rp.rights_profile_id = COALESCE(sr.rights_profile_id, src.default_rights_profile_id)
        WHERE s.surname_id = ${found.surname_id}::uuid
        GROUP BY rp.rights_profile_id, src.name, rp.automated_access, rp.commercial_use,
                 rp.redistribution, rp.metadata_rights, rp.transcription_rights,
                 rp.image_rights, rp.database_rights, rp.attribution_required,
                 rp.attribution_text, rp.source_owner, rp.rights_url, rp.review_status,
                 rp.terms_version
        ORDER BY src.name, rp.rights_profile_id
      `.execute(trx);

      const rights: InspectedRights[] = rightsRows.rows.map((row) => {
        const effective = completeRights(row);
        return {
          ...row,
          rights_state: classifyRightsState(effective),
          matrix: evaluateRightsMatrix(effective),
          reproduction_eligible: reproductionEligible(effective),
          connector_executable: connectorExecutable(effective),
        };
      });

      return {
        kind: "FOUND" as const,
        identity: found,
        source_records,
        snapshots: [...snapshots.values()],
        claims,
        rights,
      };
    });
}
