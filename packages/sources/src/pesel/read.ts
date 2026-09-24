/**
 * Read side of the PESEL national lists: what the CURRENT resources record
 * about one resolved surname.
 *
 * It returns one entry per current (`ACTIVE`) PESEL resource record — the
 * raw published count where the surname is listed, or
 * `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT` where it is not
 * (docs/canonical/12 §9.5). Absence is never reported as zero
 * (ARCHITECTURE.md §10 invariant 4).
 *
 * It interprets nothing. No total across the two partitions (the publisher
 * does not say what they partition — `peselCoverageNotes`), no rank, no
 * share, no rarity, and no population statement: the unit of `Liczba` is
 * unverified (docs/DECISIONS_NEEDED.md D-006).
 *
 * Why this exists before TASK-005: the project owner approved, on 2026-09-24,
 * a web preview that shows these stored source figures honestly labelled
 * before the claim chain exists. ARCHITECTURE.md §6 normally has the frontend
 * render validated presentation objects only; keeping this read here, in the
 * package that owns the PESEL data, means the web app never selects sources
 * itself. Replace it with a claim-backed projection once TASK-005 lands.
 *
 * Read-only by construction: every query runs inside a `READ ONLY`
 * transaction through a handle narrowed to `selectFrom`, as the resolver's
 * lookup does, so the three reads also see one consistent snapshot.
 */
import { sql } from "kysely";
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { PESEL_RESOURCE_ROLES, PESEL_SOURCE_REGISTRY } from "./registry.js";
import type { PeselResourceEntry, PeselResourceRole } from "./registry.js";

type ReadOnlyQueries = Pick<Transaction<DB>, "selectFrom">;

interface PeselRegisterEntryBase {
  readonly role: PeselResourceRole;
  /** The publisher's resource id (`SourceRecord.external_record_id`). */
  readonly resourceId: string;
  /** The publisher's own resource title, verbatim (Polish). */
  readonly resourceTitle: string;
  /** The publisher's own resource description, verbatim (Polish). */
  readonly resourceDescription: string;
  /** The register's reference date, `YYYY-MM-DD` — what the data describes. */
  readonly dataDate: string;
  /** When these bytes were retrieved from the publisher. Never the data date. */
  readonly retrievedAt: Date;
  readonly sourceRecordId: string;
}

export interface PeselListedEntry extends PeselRegisterEntryBase {
  readonly status: "LISTED";
  /** `Liczba` exactly as published: occurrences, not people (D-006). */
  readonly count: number;
  readonly distributionSnapshotId: string;
}

export interface PeselAbsentEntry extends PeselRegisterEntryBase {
  /** Not in this resource. The publisher omits single occurrences, so not zero. */
  readonly status: "BELOW_PUBLICATION_THRESHOLD_OR_ABSENT";
}

export type PeselRegisterEntry = PeselListedEntry | PeselAbsentEntry;

export interface PeselRegisterReading {
  readonly source: {
    readonly name: string;
    readonly publisher: string | null;
    readonly referenceUrl: string | null;
  };
  /** One per current resource record, in `PESEL_RESOURCE_ROLES` order. */
  readonly entries: readonly PeselRegisterEntry[];
}

function registryEntryFor(resourceId: string | null): PeselResourceEntry {
  const entry = PESEL_RESOURCE_ROLES.map((role) => PESEL_SOURCE_REGISTRY.resources[role]).find(
    (resource) => resource.resource_id === resourceId,
  );
  if (!entry) {
    // The importer only ever writes registry resource ids, so this is a
    // broken invariant, not a state to render around.
    throw new Error(
      `active PESEL source record has resource id ${JSON.stringify(resourceId)}, which is not in the registry`,
    );
  }
  return entry;
}

/**
 * What the current PESEL resources record about `surnameId`.
 *
 * Returns `null` when the PESEL source has never been imported into this
 * database — "no data held" is a different answer from "not listed".
 */
export async function readPeselRegister(
  db: Kysely<DB>,
  surnameId: string,
): Promise<PeselRegisterReading | null> {
  return db
    .transaction()
    .setAccessMode("read only")
    .execute(async (trx) => {
      const read: ReadOnlyQueries = trx;

      const source = await read
        .selectFrom("sources")
        .select(["source_id", "name", "publisher", "homepage_or_reference_url"])
        .where("source_key", "=", PESEL_SOURCE_REGISTRY.source.source_key)
        .executeTakeFirst();
      if (!source) {
        return null;
      }

      const records = await read
        .selectFrom("source_records")
        .select(["source_record_id", "external_record_id", "retrieved_at"])
        .where("source_id", "=", source.source_id)
        .where("record_status", "=", "ACTIVE")
        .execute();

      const recordIds = records.map((record) => record.source_record_id);
      const listed =
        recordIds.length === 0
          ? []
          : await read
              .selectFrom("distribution_snapshots as ds")
              .innerJoin(
                "distribution_values as dv",
                "dv.distribution_snapshot_id",
                "ds.distribution_snapshot_id",
              )
              .select([
                "ds.source_record_id",
                "ds.distribution_snapshot_id",
                "dv.count",
                // A DATE read through pg's default parser becomes a local-midnight
                // Date; the text form cannot drift across a timezone.
                sql<string>`ds.as_of_date::text`.as("as_of_date"),
              ])
              .where("ds.surname_id", "=", surnameId)
              .where("ds.source_record_id", "in", recordIds)
              .where("ds.geography_level", "=", "NATIONAL")
              .where("dv.place_id", "is", null)
              .execute();

      const entries = records.map((record): PeselRegisterEntry => {
        const resource = registryEntryFor(record.external_record_id);
        const base: PeselRegisterEntryBase = {
          role: resource.role,
          resourceId: resource.resource_id,
          resourceTitle: resource.resource_title,
          resourceDescription: resource.resource_description,
          dataDate: resource.data_date,
          retrievedAt: record.retrieved_at,
          sourceRecordId: record.source_record_id,
        };

        const rows = listed.filter((row) => row.source_record_id === record.source_record_id);
        if (rows.length === 0) {
          return { ...base, status: "BELOW_PUBLICATION_THRESHOLD_OR_ABSENT" };
        }
        const [row] = rows;
        if (rows.length > 1 || !row || row.count === null) {
          throw new Error(
            `surname ${surnameId} has ${String(rows.length)} national value(s) in source record ` +
              `${record.source_record_id}; exactly one non-null count is expected`,
          );
        }
        return {
          ...base,
          status: "LISTED",
          count: Number(row.count),
          dataDate: row.as_of_date,
          distributionSnapshotId: row.distribution_snapshot_id,
        };
      });

      const seen = new Set<PeselResourceRole>();
      for (const entry of entries) {
        if (seen.has(entry.role)) {
          throw new Error(`more than one ACTIVE PESEL source record for ${entry.role}`);
        }
        seen.add(entry.role);
      }
      entries.sort(
        (a, b) => PESEL_RESOURCE_ROLES.indexOf(a.role) - PESEL_RESOURCE_ROLES.indexOf(b.role),
      );

      return {
        source: {
          name: source.name,
          publisher: source.publisher,
          referenceUrl: source.homepage_or_reference_url,
        },
        entries,
      };
    });
}
