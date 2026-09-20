/**
 * Canonical-key re-key (ADR-0005, D-013).
 *
 * `canonical_key_v2` changed one step of the identity key: the fold is
 * Unicode simple case folding, not full folding. For almost every surname
 * the two keys are the same string, so a stale row looks healthy and
 * resolves correctly — right up to the one that does not. This recomputes
 * every persisted key from the display form the row already carries, using
 * the same `canonicalKey` the resolver and the importer use, and never a
 * second algorithm.
 *
 * It lives beside the importer because the importer is what wrote these
 * keys. It is not a migration: `packages/db` does not depend on the
 * resolver, and reimplementing the fold in SQL to get around that is
 * precisely the duplication TASK-004 AC-10 forbids.
 *
 * Fail-closed and idempotent. If two rows would end up sharing a key the
 * whole run aborts and writes nothing; a second run reports zero changes.
 */
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { canonicalKey, CANONICAL_KEY_VERSION, NORMALIZATION_VERSION } from "@name-atlas/resolver";

/** Two rows that would collide on the recomputed key. Never written. */
export interface KeyCollision {
  readonly key: string;
  readonly displays: readonly string[];
}

export interface RekeyReport {
  readonly surnamesScanned: number;
  /** Rows whose `canonical_key` text changed. */
  readonly surnamesRekeyed: number;
  /** Rows whose key was already right but whose version stamp was stale. */
  readonly surnameVersionsStamped: number;
  readonly nameFormsScanned: number;
  readonly nameFormsRekeyed: number;
  readonly nameFormVersionsStamped: number;
  /** False when `dryRun` was set: the transaction was rolled back. */
  readonly applied: boolean;
}

export type RekeyOutcome =
  | { readonly kind: "REKEYED"; readonly report: RekeyReport }
  | { readonly kind: "COLLISION"; readonly collisions: readonly KeyCollision[] };

export interface RekeyOptions {
  /** Compute and report, then roll back. */
  readonly dryRun?: boolean;
}

/** Thrown to roll a dry run back; never escapes this module. */
class DryRunRollback extends Error {
  constructor(readonly report: RekeyReport) {
    super("dry run");
  }
}

/** Thrown to abort on a collision; never escapes this module. */
class CollisionAbort extends Error {
  constructor(readonly collisions: readonly KeyCollision[]) {
    super("collision");
  }
}

function collisionsIn(rows: readonly { key: string; display: string }[]): readonly KeyCollision[] {
  const byKey = new Map<string, string[]>();
  for (const row of rows) {
    const displays = byKey.get(row.key);
    if (displays === undefined) {
      byKey.set(row.key, [row.display]);
    } else {
      displays.push(row.display);
    }
  }
  const collisions: KeyCollision[] = [];
  for (const [key, displays] of byKey) {
    if (displays.length > 1) {
      collisions.push({ key, displays });
    }
  }
  return collisions;
}

async function rekeyInTransaction(trx: Transaction<DB>, dryRun: boolean): Promise<RekeyReport> {
  const surnames = await trx
    .selectFrom("surnames")
    .select(["surname_id", "canonical_display", "canonical_key", "canonical_key_version"])
    .execute();

  // The uniqueness check runs over the whole recomputed set before a single
  // row is written. A per-row failure would leave the question "which rows
  // did get through?" open, and on identity that is not a question worth
  // having.
  const collisions = collisionsIn(
    surnames.map((row) => ({
      key: canonicalKey(row.canonical_display),
      display: row.canonical_display,
    })),
  );
  if (collisions.length > 0) {
    throw new CollisionAbort(collisions);
  }

  let surnamesRekeyed = 0;
  let surnameVersionsStamped = 0;
  for (const row of surnames) {
    const key = canonicalKey(row.canonical_display);
    const keyChanged = key !== row.canonical_key;
    const versionStale = row.canonical_key_version !== CANONICAL_KEY_VERSION;
    if (!keyChanged && !versionStale) {
      continue;
    }
    await trx
      .updateTable("surnames")
      .set({
        canonical_key: key,
        canonical_key_version: CANONICAL_KEY_VERSION,
        updated_at: new Date(),
      })
      .where("surname_id", "=", row.surname_id)
      .execute();
    if (keyChanged) {
      surnamesRekeyed += 1;
    } else {
      surnameVersionsStamped += 1;
    }
  }

  const forms = await trx
    .selectFrom("name_forms")
    .select(["name_form_id", "form", "search_key", "normalization_version"])
    .execute();

  let nameFormsRekeyed = 0;
  let nameFormVersionsStamped = 0;
  for (const row of forms) {
    const key = canonicalKey(row.form);
    const keyChanged = key !== row.search_key;
    const versionStale = row.normalization_version !== NORMALIZATION_VERSION;
    if (!keyChanged && !versionStale) {
      continue;
    }
    await trx
      .updateTable("name_forms")
      .set({ search_key: key, normalization_version: NORMALIZATION_VERSION })
      .where("name_form_id", "=", row.name_form_id)
      .execute();
    if (keyChanged) {
      nameFormsRekeyed += 1;
    } else {
      nameFormVersionsStamped += 1;
    }
  }

  const report: RekeyReport = {
    surnamesScanned: surnames.length,
    surnamesRekeyed,
    surnameVersionsStamped,
    nameFormsScanned: forms.length,
    nameFormsRekeyed,
    nameFormVersionsStamped,
    applied: !dryRun,
  };
  if (dryRun) {
    throw new DryRunRollback(report);
  }
  return report;
}

/**
 * Recomputes every persisted canonical key and search key from its display
 * form, in one transaction.
 *
 * A `name_forms` row keeps its `unicode_nfc`: NFC is unchanged by ADR-0005,
 * and the display form is never rewritten by this or anything else.
 */
export async function rekeyCanonicalKeys(
  db: Kysely<DB>,
  options: RekeyOptions = {},
): Promise<RekeyOutcome> {
  const dryRun = options.dryRun ?? false;
  try {
    const report = await db.transaction().execute((trx) => rekeyInTransaction(trx, dryRun));
    return { kind: "REKEYED", report };
  } catch (error) {
    if (error instanceof DryRunRollback) {
      return { kind: "REKEYED", report: error.report };
    }
    if (error instanceof CollisionAbort) {
      return { kind: "COLLISION", collisions: error.collisions };
    }
    throw error;
  }
}
