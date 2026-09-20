/**
 * Pure mapping from parsed PESEL rows to the identity and distribution
 * fields an import writes (TASK-004 §6 item 3, AC-02, AC-04, AC-05, AC-10).
 *
 * Pure in the strict sense: no database, no clock, no locale, no environment
 * variable, no randomness. The same rows always map to the same fields in
 * the same order, so two runs over the same bytes are byte-identical apart
 * from the system-generated UUIDv7 primary keys the writer assigns.
 *
 * There is exactly ONE normalisation in this repository. Every key here comes
 * from `@name-atlas/resolver`'s `canonicalKey`, and the version strings come
 * from its own constants — never a second algorithm and never a copied
 * expectation (ARCHITECTURE.md §10 invariant 8; TASK-004 §13).
 */
import {
  CANONICAL_KEY_VERSION,
  NORMALIZATION_VERSION,
  canonicalKey,
  detectScripts,
  toNfc,
} from "@name-atlas/resolver";
import { PeselImportError } from "./errors.js";
import type { PeselSourceRow } from "../schema.js";

/**
 * One source row, prepared for writing.
 *
 * `display` is the source string exactly as the file encodes it, NFC-applied
 * and otherwise untouched: a trailing space stays, a standalone combining
 * mark stays, an embedded `/` stays, a non-Latin script stays. Nothing is
 * trimmed, re-cased, transliterated or "repaired" (TASK-004 AC-05).
 */
export interface MappedPeselRow {
  /** 1-based line number in the source file, header included. Diagnostics only. */
  readonly line: number;
  /** The raw source string, byte-for-byte as parsed. */
  readonly raw: string;
  /** The raw string in NFC. What `canonical_display` and `form` store. */
  readonly display: string;
  /** `canonical_key_v1` of the raw string. What T0 matches on. */
  readonly canonicalKey: string;
  readonly canonicalKeyVersion: string;
  /** `search_key` for a NameForm — the same key, by construction. */
  readonly searchKey: string;
  readonly normalizationVersion: string;
  /** ISO 15924 primary script of the display form. */
  readonly script: string;
  /** The source's own `Liczba`, unchanged. */
  readonly count: number;
}

/**
 * Maps one parsed row. `line` is the source line number the parser used, so
 * a later failure can name the exact row.
 */
export function mapPeselRow(row: PeselSourceRow, line: number): MappedPeselRow {
  const display = toNfc(row.surname);
  const key = canonicalKey(row.surname);
  return {
    line,
    raw: row.surname,
    display,
    canonicalKey: key,
    canonicalKeyVersion: CANONICAL_KEY_VERSION,
    // A NameForm's search key IS its canonical key. That identity is what
    // makes tier T1 an exact match against the same function that produced
    // the query's key, rather than a second, looser algorithm.
    searchKey: key,
    normalizationVersion: NORMALIZATION_VERSION,
    script: detectScripts(display).primary_script,
    count: row.count,
  };
}

/**
 * Maps a whole parsed file, preserving source order.
 *
 * Two rows sharing a canonical key is schema drift, not data to reconcile:
 * the official resources are keyed by a distinct current-surname value, so a
 * collision means this project has misread the source. It aborts the import
 * (TASK-004 AC-19, §10).
 *
 * Note that two rows in DIFFERENT resources may of course share a key — that
 * is the male/female overlap, and it resolves to one surname with two
 * separate snapshots.
 */
export function mapPeselRows(rows: readonly PeselSourceRow[]): MappedPeselRow[] {
  const mapped: MappedPeselRow[] = [];
  const seen = new Map<string, number>();

  rows.forEach((row, index) => {
    // The parser numbers data rows from 2: line 1 is the header.
    const line = index + 2;
    const entry = mapPeselRow(row, line);
    const previous = seen.get(entry.canonicalKey);
    if (previous !== undefined) {
      throw new PeselImportError(
        "duplicate_canonical_key",
        `canonical key ${JSON.stringify(entry.canonicalKey)} already appeared on line ${previous}; ` +
          "one resource must not contain the same current-surname value twice",
        line,
      );
    }
    seen.set(entry.canonicalKey, line);
    mapped.push(entry);
  });

  return mapped;
}
