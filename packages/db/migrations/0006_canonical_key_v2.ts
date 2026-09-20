import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * `canonical_key_v2` — re-key the identity tables (ADR-0005, D-013).
 *
 * `canonical_key_v1` applied Unicode *full* case folding, which expands one
 * letter into several: `ẞ` (U+1E9E) folds to `ss`. So `WEIẞ` and `WEISS`
 * produced the same key, as did `GROẞ`/`GROSS`, `GAUẞ`/`GAUSS`, `FUẞ`/`FUSS`
 * and `BERGSTRÄẞER`/`BERGSTRÄSSER`. D-013 measured 171 such collisions across
 * the two production resources and found no collision from any other cause,
 * which made the full resource uningestible: the importer fails closed on
 * `DUPLICATE_CANONICAL_KEY` and writes nothing.
 *
 * v2 uses simple case folding, which is 1:1, so those surnames keep separate
 * keys. Every key without a code point the two folds treat differently is
 * unchanged, so on a database holding only Polish surnames this migration
 * rewrites no key at all and only stamps the version columns.
 *
 * ## Why the transformation is duplicated here
 *
 * The pipeline below is a frozen copy of `@name-atlas/resolver`'s
 * `canonicalKey` as of v2, not an import of it. A migration must produce the
 * same result when it is replayed in a year, and `canonicalKey` is versioned
 * precisely because it is expected to change again. Importing it would make
 * this migration silently mean something different at v3. The resolver's own
 * `normalize.test.ts` pins the live function; `migrator.test.ts` pins that
 * this copy agrees with it today.
 *
 * ## Fail-closed
 *
 * `surnames.canonical_key` is UNIQUE. v2 is expected to be strictly finer
 * than v1 — it separates keys v1 merged and merges nothing v1 kept apart —
 * but "expected" is not "checked", so the new keys are computed and collision
 * checked in full before a single row is written. A collision aborts the
 * migration naming both display forms, in the same spirit as the importer's
 * own refusal. Nothing partial is left behind: the migrator runs this inside
 * a transaction.
 */

// --- frozen canonical_key_v2 pipeline ------------------------------------

const DASH_LIKE = new Set([
  "\u2010",
  "\u2011",
  "\u2012",
  "\u2013",
  "\u2014",
  "\u2015",
  "\u2212",
  "\ufe58",
  "\ufe63",
  "\uff0d",
]);

const APOSTROPHE_LIKE = new Set(["\u2018", "\u2019", "\u02bc", "\u02b9", "\u2032", "\uff07"]);

const SPACE_LIKE = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/gu;

// Letterform variants that simple case folding maps to their canonical letter
// but that `toLowerCase()` leaves alone. Without them the key is not caseless:
// lowercasing a word-final capital sigma yields \u03c2, not \u03c3.
const SIMPLE_FOLD_VARIANTS = new Map<string, string>([
  ["\u00b5", "\u03bc"],
  ["\u017f", "\u0073"],
  ["\u0345", "\u03b9"],
  ["\u03c2", "\u03c3"],
  ["\u03d0", "\u03b2"],
  ["\u03d1", "\u03b8"],
  ["\u03d5", "\u03c6"],
  ["\u03d6", "\u03c0"],
  ["\u03f0", "\u03ba"],
  ["\u03f1", "\u03c1"],
  ["\u03f5", "\u03b5"],
  ["\u1c80", "\u0432"],
  ["\u1c81", "\u0434"],
  ["\u1c82", "\u043e"],
  ["\u1c83", "\u0441"],
  ["\u1c84", "\u0442"],
  ["\u1c85", "\u0442"],
  ["\u1c86", "\u044a"],
  ["\u1c87", "\u0463"],
  ["\u1c88", "\ua64b"],
  ["\u1e9b", "\u1e61"],
  ["\u1fbe", "\u03b9"],
]);

function canonicalKeyV2(value: string): string {
  const nfc = value.normalize("NFC");

  let folded = "";
  for (const codePoint of nfc) {
    const variant = SIMPLE_FOLD_VARIANTS.get(codePoint);
    if (variant !== undefined) {
      folded += variant;
      continue;
    }
    // A full lowercase mapping can expand one code point into several
    // (U+0130 becomes `i` + U+0307); simple folding has none, so the code
    // point stands.
    const lower = codePoint.toLowerCase();
    folded += [...lower].length === 1 ? lower : codePoint;
  }

  let mapped = "";
  for (const codePoint of folded) {
    if (DASH_LIKE.has(codePoint)) {
      mapped += "-";
    } else if (APOSTROPHE_LIKE.has(codePoint)) {
      mapped += "'";
    } else {
      mapped += codePoint;
    }
  }

  const collapsed = mapped
    .replace(SPACE_LIKE, " ")
    .replace(/ {2,}/gu, " ")
    .replace(/^ +| +$/gu, "");

  return collapsed.normalize("NFC");
}

// --- frozen canonical_key_v1 pipeline, for `down` only -------------------

function canonicalKeyV1(value: string): string {
  const nfc = value.normalize("NFC");

  let folded = "";
  for (const codePoint of nfc) {
    // U+0131 dotless i folds to itself under the default profile; the
    // uppercase round trip would otherwise merge it with `i`.
    folded +=
      codePoint === "\u0131" ? codePoint : codePoint.toLowerCase().toUpperCase().toLowerCase();
  }

  let mapped = "";
  for (const codePoint of folded) {
    if (DASH_LIKE.has(codePoint)) {
      mapped += "-";
    } else if (APOSTROPHE_LIKE.has(codePoint)) {
      mapped += "'";
    } else {
      mapped += codePoint;
    }
  }

  return mapped
    .replace(SPACE_LIKE, " ")
    .replace(/ {2,}/gu, " ")
    .replace(/^ +| +$/gu, "")
    .normalize("NFC");
}

interface SurnameRow {
  readonly surname_id: string;
  readonly canonical_display: string;
  readonly canonical_key: string;
}

interface NameFormRow {
  readonly name_form_id: string;
  readonly unicode_nfc: string;
  readonly search_key: string;
}

async function rekey(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
  db: Kysely<any>,
  keyOf: (value: string) => string,
  version: string,
): Promise<void> {
  const surnames = await sql<SurnameRow>`
    SELECT surname_id, canonical_display, canonical_key FROM surnames
  `.execute(db);

  const seen = new Map<string, string>();
  for (const row of surnames.rows) {
    const key = keyOf(row.canonical_display);
    const previous = seen.get(key);
    if (previous !== undefined) {
      throw new Error(
        `canonical key collision under ${version}: ${JSON.stringify(previous)} and ` +
          `${JSON.stringify(row.canonical_display)} both key to ${JSON.stringify(key)}. ` +
          `No row was changed.`,
      );
    }
    seen.set(key, row.canonical_display);
  }

  for (const row of surnames.rows) {
    const key = keyOf(row.canonical_display);
    if (key === row.canonical_key) {
      continue;
    }
    await sql`
      UPDATE surnames SET canonical_key = ${key} WHERE surname_id = ${row.surname_id}::uuid
    `.execute(db);
  }

  await sql`UPDATE surnames SET canonical_key_version = ${version}`.execute(db);

  const forms = await sql<NameFormRow>`
    SELECT name_form_id, unicode_nfc, search_key FROM name_forms
  `.execute(db);

  for (const row of forms.rows) {
    const key = keyOf(row.unicode_nfc);
    if (key === row.search_key) {
      continue;
    }
    await sql`
      UPDATE name_forms SET search_key = ${key} WHERE name_form_id = ${row.name_form_id}::uuid
    `.execute(db);
  }

  await sql`UPDATE name_forms SET normalization_version = ${version}`.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await rekey(db, canonicalKeyV2, "canonical_key_v2");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // Reverting is only possible while no two stored surnames differ solely by
  // an expanding code point. If any do, v1 cannot represent them and the
  // collision check above aborts rather than merging two real surnames into
  // one row. That refusal is the whole point of D-013.
  await rekey(db, canonicalKeyV1, "canonical_key_v1");
}
