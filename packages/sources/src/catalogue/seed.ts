/**
 * Seeds the source catalogue into the registry (TASK-038).
 *
 * One transaction: every missing source is inserted with its own default
 * `RightsProfile`, or nothing is. Idempotent by `sources.source_key`. A row
 * that already exists is reported and never modified, because a
 * `RightsProfile` is immutable once applied (docs/canonical/11 §9.4) — the
 * same rule the PESEL importer and the onomastics importer follow.
 *
 * Writes only `sources` and `rights_profiles`. It retrieves nothing from any
 * source and creates no `SourceRecord`.
 */
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { SOURCE_CATALOGUE } from "./catalogue.js";
import type { CatalogueEntry } from "./catalogue.js";
import { validateSourceCatalogue } from "./validate.js";

export interface SourceCatalogueSeedReport {
  /** Keys inserted by this run, in catalogue order. */
  readonly inserted: readonly string[];
  /** Keys that already existed and were left untouched, in catalogue order. */
  readonly existing: readonly string[];
}

export async function seedSourceCatalogue(
  db: Kysely<DB>,
  entries: readonly CatalogueEntry[] = SOURCE_CATALOGUE,
): Promise<SourceCatalogueSeedReport> {
  validateSourceCatalogue(entries);
  if (entries.length === 0) {
    return { inserted: [], existing: [] };
  }

  return db.transaction().execute(async (trx) => {
    const keys = entries.map((entry) => entry.source.source_key);
    const found = await trx
      .selectFrom("sources")
      .select("source_key")
      .where("source_key", "in", keys)
      .execute();
    const alreadyThere = new Set(found.map((row) => row.source_key));

    const inserted: string[] = [];
    for (const { source, rights } of entries) {
      if (alreadyThere.has(source.source_key)) {
        continue;
      }

      const rightsProfileId = uuidv7();
      await trx
        .insertInto("rights_profiles")
        .values({
          rights_profile_id: rightsProfileId,
          terms_version: rights.terms_version,
          terms_hash: rights.terms_hash,
          checked_at: rights.checked_at,
          metadata_rights: rights.metadata_rights,
          image_rights: rights.image_rights,
          transcription_rights: rights.transcription_rights,
          database_rights: rights.database_rights,
          automated_access: rights.automated_access,
          commercial_use: rights.commercial_use,
          redistribution: rights.redistribution,
          local_cache: rights.local_cache,
          attribution_required: rights.attribution_required,
          attribution_text: rights.attribution_text,
          source_owner: rights.source_owner,
          rights_url: rights.rights_url,
          contact_required: rights.contact_required,
          review_status: rights.review_status,
          valid_from: rights.valid_from,
          valid_to: rights.valid_to,
          notes: rights.notes,
        })
        .execute();

      await trx
        .insertInto("sources")
        .values({
          source_id: uuidv7(),
          parent_source_id: null,
          source_key: source.source_key,
          name: source.name,
          publisher: source.publisher,
          source_type: source.source_type,
          granularity: source.granularity,
          geographic_scope: [...source.geographic_scope],
          temporal_from: source.temporal_from,
          temporal_to: source.temporal_to,
          methodology_notes: source.methodology_notes,
          authority_tier: source.authority_tier,
          default_rights_profile_id: rightsProfileId,
          production_status: source.production_status,
          homepage_or_reference_url: source.homepage_or_reference_url,
        })
        .execute();

      inserted.push(source.source_key);
    }

    return { inserted, existing: keys.filter((key) => alreadyThere.has(key)) };
  });
}

export function formatSourceCatalogueSeedReport(report: SourceCatalogueSeedReport): string {
  const lines = [
    `inserted: ${String(report.inserted.length)}`,
    `already registered, left unchanged: ${String(report.existing.length)}`,
  ];
  for (const key of report.inserted) {
    lines.push(`  + ${key}`);
  }
  return lines.join("\n");
}
