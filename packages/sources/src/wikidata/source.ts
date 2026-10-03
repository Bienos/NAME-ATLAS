import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { SOURCE_CATALOGUE } from "../catalogue/catalogue.js";
import { seedSourceCatalogue } from "../catalogue/seed.js";
import { wikidataBearersQuery, wikidataFamilyNameLabels } from "./bearers.js";
import type { WikidataBearers } from "./bearers.js";
import type { FetchedWikidataBearers } from "./fetch.js";

/**
 * Wikidata in the source registry, and one surname's bearers as a source
 * record (TASK-073, ADR-0030).
 *
 * The registry row is the source catalogue's `global_wikidata` (TASK-038:
 * CC0, `docs/canonical/12` §7 "NOW"), inserted from the catalogue if this
 * database has not been seeded with it. Its rights profile is the catalogue's,
 * unchanged.
 */

export const WIKIDATA_SOURCE_KEY = "global_wikidata";

/** The external id of a surname's bearers record: one line per surname, superseded on change. */
export function wikidataBearersRecordId(surnameId: string): string {
  return `wikidata-bearers:${surnameId}`;
}

/** Where a reader can run the same query: the query service's editor, with the query in it. */
export function wikidataQueryPageUrl(surname: string): string {
  return `https://query.wikidata.org/#${encodeURIComponent(
    wikidataBearersQuery(wikidataFamilyNameLabels(surname)),
  )}`;
}

/** The registry row's id, inserting the catalogue's Wikidata entry on first use. */
export async function ensureWikidataSource(db: Kysely<DB>): Promise<string> {
  const found = await db
    .selectFrom("sources")
    .select("source_id")
    .where("source_key", "=", WIKIDATA_SOURCE_KEY)
    .executeTakeFirst();
  if (found) return found.source_id;
  const entry = SOURCE_CATALOGUE.find((e) => e.source.source_key === WIKIDATA_SOURCE_KEY);
  if (entry === undefined) throw new Error(`the source catalogue has no ${WIKIDATA_SOURCE_KEY}`);
  await seedSourceCatalogue(db, [entry]);
  const inserted = await db
    .selectFrom("sources")
    .select("source_id")
    .where("source_key", "=", WIKIDATA_SOURCE_KEY)
    .executeTakeFirstOrThrow();
  return inserted.source_id;
}

/** sha256 of the summary alone, so the same answer on another day is the same record. */
export function wikidataBearersHash(bearers: WikidataBearers): string {
  return createHash("sha256").update(JSON.stringify(bearers)).digest("hex");
}

export type StoredWikidataBearers =
  | { readonly status: "STORED"; readonly source_record_id: string }
  | { readonly status: "UNCHANGED"; readonly source_record_id: string };

/**
 * Stores one surname's bearers as a `source_records` row: the same summary
 * refreshes the active record's `retrieved_at`, a different one supersedes it
 * (Polona's rule, `storePolonaInventory`).
 */
export async function storeWikidataBearers(
  db: Kysely<DB>,
  input: {
    readonly sourceId: string;
    readonly surnameId: string;
    readonly fetched: FetchedWikidataBearers;
  },
): Promise<StoredWikidataBearers> {
  const { sourceId, surnameId, fetched } = input;
  const externalId = wikidataBearersRecordId(surnameId);
  const hash = wikidataBearersHash(fetched.bearers);
  return db.transaction().execute(async (trx) => {
    const active = await trx
      .selectFrom("source_records")
      .select(["source_record_id", "content_hash"])
      .where("source_id", "=", sourceId)
      .where("external_record_id", "=", externalId)
      .where("record_status", "=", "ACTIVE")
      .execute();
    if (active.length > 1) {
      throw new Error(`${String(active.length)} active Wikidata records for ${externalId}`);
    }
    const current = active[0];
    if (current && current.content_hash === hash) {
      await trx
        .updateTable("source_records")
        .set({ retrieved_at: new Date(fetched.retrieved_at) })
        .where("source_record_id", "=", current.source_record_id)
        .execute();
      return { status: "UNCHANGED", source_record_id: current.source_record_id };
    }
    if (current) {
      await trx
        .updateTable("source_records")
        .set({ record_status: "UPDATED" })
        .where("source_record_id", "=", current.source_record_id)
        .execute();
    }
    const sourceRecordId = uuidv7();
    await trx
      .insertInto("source_records")
      .values({
        source_record_id: sourceRecordId,
        source_id: sourceId,
        external_record_id: externalId,
        external_parent_id: null,
        record_type: "API_OBJECT",
        source_url: wikidataQueryPageUrl(fetched.bearers.surname),
        raw_payload: JSON.stringify({
          bearers: fetched.bearers,
          response_sha256: fetched.response_sha256,
        }),
        raw_text_ref: null,
        content_hash: hash,
        retrieved_at: new Date(fetched.retrieved_at),
        source_modified_at: null,
        rights_profile_id: null,
        record_status: "ACTIVE",
        supersedes_source_record_id: current?.source_record_id ?? null,
      })
      .execute();
    return { status: "STORED", source_record_id: sourceRecordId };
  });
}
