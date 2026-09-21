import { uuidv7 } from "@name-atlas/domain";
import type { DB } from "@name-atlas/db";
import type { Kysely } from "kysely";
import { canonicalSlug, SHORT_SLUG_ID_LENGTH, shortSlugId, SLUG_LOCALES } from "./slug.js";
import type { SlugLocale } from "./slug.js";

/**
 * Assigning every surname its canonical address (TASK-027, ADR-0010 §2).
 *
 * Idempotent and order-independent, which are the two properties that make a
 * URL safe to put in a search index:
 *
 *   - **Idempotent.** Re-running changes nothing. A surname that already has the
 *     slug it should have is skipped, so this can run after every import.
 *   - **Order-independent.** Where several entities produce one slug, the one
 *     with the lowest `surname_id` keeps the bare slug and the rest take a
 *     suffix derived from their own id. Both halves of that rule are functions
 *     of the entities, so a re-import, a differently-ordered scan or a resumed
 *     run assigns exactly the same addresses.
 *
 * It never *moves* an address. A surname whose current slug differs from the one
 * its display form now produces is reported, not rewritten: retiring an address
 * is a 301 and a decision, and ADR-0010 §4 keeps it out of a backfill.
 */

export interface BackfillReport {
  readonly surnames: number;
  readonly created: number;
  readonly unchanged: number;
  /** Entities that took a suffix because another holds the bare slug. */
  readonly suffixed: number;
  /** Display forms that produce no slug at all (§22); they get no address. */
  readonly unaddressable: readonly string[];
  /**
   * Surnames whose stored current slug no longer matches their display form.
   * Reported, never rewritten — see above.
   */
  readonly stale: readonly {
    readonly surname_id: string;
    readonly stored: string;
    readonly computed: string;
  }[];
}

interface SurnameRow {
  readonly surname_id: string;
  readonly canonical_display: string;
}

/** The longest suffix the backfill will try before giving up on a slug. */
const MAX_SUFFIX_LENGTH = 12;

export async function backfillSlugs(
  db: Kysely<DB>,
  options: { readonly batchSize?: number; readonly onProgress?: (done: number) => void } = {},
): Promise<BackfillReport> {
  const batchSize = options.batchSize ?? 5_000;
  let created = 0;
  let unchanged = 0;
  let suffixed = 0;
  let surnames = 0;
  const unaddressable: string[] = [];
  const stale: { surname_id: string; stored: string; computed: string }[] = [];

  // Ordered by surname_id, so "the lowest id keeps the bare slug" is reached in
  // that order without holding 598,476 rows in memory — and so a resumed run
  // assigns the same addresses as an uninterrupted one.
  let after: string | null = null;
  for (;;) {
    let query = db
      .selectFrom("surnames")
      .select(["surname_id", "canonical_display"])
      .where("entity_status", "=", "ACTIVE")
      .orderBy("surname_id")
      .limit(batchSize);
    if (after !== null) query = query.where("surname_id", ">", after);
    const rows: SurnameRow[] = await query.execute();
    if (rows.length === 0) break;
    after = rows[rows.length - 1]?.surname_id ?? null;
    surnames += rows.length;

    const addressable: { row: SurnameRow; base: string }[] = [];
    for (const row of rows) {
      const base = canonicalSlug(row.canonical_display);
      if (base === "") unaddressable.push(row.canonical_display);
      else addressable.push({ row, base });
    }

    for (const locale of SLUG_LOCALES) {
      const outcome = await assignBatch(db, locale, addressable);
      created += outcome.created;
      suffixed += outcome.suffixed;
      unchanged += outcome.unchanged;
      stale.push(...outcome.stale);
    }
    options.onProgress?.(surnames);
  }

  return { surnames, created, unchanged, suffixed, unaddressable, stale };
}

interface BatchOutcome {
  readonly created: number;
  readonly suffixed: number;
  readonly unchanged: number;
  readonly stale: readonly { surname_id: string; stored: string; computed: string }[];
}

/**
 * One batch, in a handful of round trips rather than three per row.
 *
 * The first implementation did a SELECT, a SELECT and an INSERT for every
 * (surname, locale). Measured against the real register that was **559 rows a
 * second — about 36 minutes** for the 1,196,952 rows 598,476 surnames need, on
 * a job meant to run after every import. Batching is the same algorithm with the
 * round trips removed:
 *
 *   1. one SELECT for the batch's existing current slugs;
 *   2. one multi-row INSERT … ON CONFLICT (locale, slug) DO NOTHING … RETURNING,
 *      which lets the database decide the collisions rather than asking it about
 *      each one in advance;
 *   3. a suffix pass over only what step 2 did not insert, which on real data is
 *      a handful of rows per batch.
 *
 * Step 2 is where the order matters: rows are offered lowest-`surname_id` first,
 * so the entity that keeps the bare slug is the same one a differently-batched
 * or resumed run would choose.
 */
async function assignBatch(
  db: Kysely<DB>,
  locale: SlugLocale,
  batch: readonly { row: SurnameRow; base: string }[],
): Promise<BatchOutcome> {
  if (batch.length === 0) return { created: 0, suffixed: 0, unchanged: 0, stale: [] };

  const existing = new Map<string, string>();
  for (const row of await db
    .selectFrom("surname_slugs")
    .select(["surname_id", "slug"])
    .where("locale", "=", locale)
    .where("is_current", "=", true)
    .where(
      "surname_id",
      "in",
      batch.map((b) => b.row.surname_id),
    )
    .execute()) {
    existing.set(row.surname_id, row.slug);
  }

  const stale: { surname_id: string; stored: string; computed: string }[] = [];
  const pending: { row: SurnameRow; base: string }[] = [];
  let unchanged = 0;

  for (const item of batch) {
    const stored = existing.get(item.row.surname_id);
    if (stored === undefined) {
      pending.push(item);
    } else if (stored === item.base || stored.startsWith(`${item.base}-`)) {
      unchanged += 1;
    } else {
      stale.push({ surname_id: item.row.surname_id, stored, computed: item.base });
    }
  }
  if (pending.length === 0) return { created: 0, suffixed: 0, unchanged, stale };

  // Two entities in one batch can want one slug. Offer only the first — lowest
  // surname_id, since the batch is ordered — and let the rest fall to the suffix
  // pass, rather than relying on how one statement resolves its own duplicates.
  const offered = new Map<string, { row: SurnameRow; base: string }>();
  const deferred: { row: SurnameRow; base: string }[] = [];
  for (const item of pending) {
    if (offered.has(item.base)) deferred.push(item);
    else offered.set(item.base, item);
  }

  const inserted = await insertSlugs(
    db,
    locale,
    [...offered.values()].map((item) => ({ surname_id: item.row.surname_id, slug: item.base })),
  );
  let created = inserted.size;
  let suffixed = 0;

  // Whatever the database refused is a collision with a row that already exists.
  const collided = [...offered.values()]
    .filter((item) => !inserted.has(item.row.surname_id))
    .concat(deferred);

  for (const item of collided) {
    let placed = false;
    for (let length = SHORT_SLUG_ID_LENGTH; length <= MAX_SUFFIX_LENGTH; length += 1) {
      const slug = `${item.base}-${shortSlugId(item.row.surname_id, length)}`;
      const got = await insertSlugs(db, locale, [{ surname_id: item.row.surname_id, slug }]);
      if (got.size === 1) {
        created += 1;
        suffixed += 1;
        placed = true;
        break;
      }
    }
    if (!placed) {
      throw new Error(
        `no free slug for ${item.row.surname_id} (${item.row.canonical_display}) after ` +
          `${String(MAX_SUFFIX_LENGTH - SHORT_SLUG_ID_LENGTH + 1)} suffix lengths — the suffix ` +
          `space is exhausted, which means the hash is degenerate rather than that the data is ` +
          `unusual`,
      );
    }
  }

  return { created, suffixed, unchanged, stale };
}

/** Inserts, skipping whatever `(locale, slug)` already holds. Returns what landed. */
async function insertSlugs(
  db: Kysely<DB>,
  locale: SlugLocale,
  values: readonly { readonly surname_id: string; readonly slug: string }[],
): Promise<ReadonlySet<string>> {
  if (values.length === 0) return new Set();
  const rows = await db
    .insertInto("surname_slugs")
    .values(
      values.map((v) => ({
        surname_slug_id: uuidv7(),
        locale,
        slug: v.slug,
        surname_id: v.surname_id,
        is_current: true,
      })),
    )
    // `(locale, slug)` is the collision guarantee; `(locale, surname_id) WHERE
    // is_current` catches a surname that gained an address concurrently. Neither
    // is an error here — both mean "somebody else got there", so both are
    // skipped and reported by absence from the returned set.
    .onConflict((oc) => oc.doNothing())
    .returning("surname_id")
    .execute();
  return new Set(rows.map((r) => r.surname_id));
}
