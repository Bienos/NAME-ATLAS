import { uuidv7 } from "@name-atlas/domain";
import type { DB } from "@name-atlas/db";
import type { Kysely } from "kysely";
import { canonicalSlug, shortSlugId, SLUG_LOCALES } from "./slug.js";
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

  // Ordered by surname_id so the "lowest id keeps the bare slug" rule is
  // reached in that order without holding 598,476 rows in memory.
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

    for (const row of rows) {
      surnames += 1;
      const base = canonicalSlug(row.canonical_display);
      if (base === "") {
        unaddressable.push(row.canonical_display);
        continue;
      }
      for (const locale of SLUG_LOCALES) {
        const outcome = await assignSlug(db, locale, row, base);
        if (outcome === "CREATED") created += 1;
        else if (outcome === "CREATED_SUFFIXED") {
          created += 1;
          suffixed += 1;
        } else if (outcome === "UNCHANGED") unchanged += 1;
        else stale.push(outcome);
      }
    }
    options.onProgress?.(surnames);
  }

  return { surnames, created, unchanged, suffixed, unaddressable, stale };
}

type AssignOutcome =
  | "CREATED"
  | "CREATED_SUFFIXED"
  | "UNCHANGED"
  | { readonly surname_id: string; readonly stored: string; readonly computed: string };

async function assignSlug(
  db: Kysely<DB>,
  locale: SlugLocale,
  row: SurnameRow,
  base: string,
): Promise<AssignOutcome> {
  const existing = await db
    .selectFrom("surname_slugs")
    .select(["slug"])
    .where("surname_id", "=", row.surname_id)
    .where("locale", "=", locale)
    .where("is_current", "=", true)
    .executeTakeFirst();

  if (existing) {
    if (existing.slug === base || existing.slug.startsWith(`${base}-`)) return "UNCHANGED";
    return { surname_id: row.surname_id, stored: existing.slug, computed: base };
  }

  // The bare slug first; then the suffix this entity's own id yields, lengthened
  // only if that exact string is somehow already taken. Every candidate is a
  // function of `row.surname_id`, so two runs try the same sequence.
  const candidates = [base];
  for (let length = 6; length <= MAX_SUFFIX_LENGTH; length += 1) {
    candidates.push(`${base}-${shortSlugId(row.surname_id, length)}`);
  }

  for (const [index, slug] of candidates.entries()) {
    const taken = await db
      .selectFrom("surname_slugs")
      .select(["surname_id"])
      .where("locale", "=", locale)
      .where("slug", "=", slug)
      .executeTakeFirst();
    if (taken) continue;
    try {
      await db
        .insertInto("surname_slugs")
        .values({
          surname_slug_id: uuidv7(),
          locale,
          slug,
          surname_id: row.surname_id,
          is_current: true,
        })
        .execute();
      return index === 0 ? "CREATED" : "CREATED_SUFFIXED";
    } catch (cause: unknown) {
      // A concurrent run took this slug between the check and the insert. The
      // UNIQUE index is the authority; try the next candidate.
      if (!isUniqueViolation(cause)) throw cause;
    }
  }
  throw new Error(
    `no free slug for ${row.surname_id} (${row.canonical_display}) after ` +
      `${String(candidates.length)} candidates — the suffix space is exhausted, which means the ` +
      `hash is degenerate rather than that the data is unusual`,
  );
}

function isUniqueViolation(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code: unknown }).code === "23505"
  );
}
