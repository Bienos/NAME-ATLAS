import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { canonicalKey, resolveSurname, simpleCaseFold } from "@name-atlas/resolver";
import type { Lang } from "./messages.js";

/**
 * The canonical surname slug (ADR-0009; `docs/canonical/21` §21–§23).
 *
 * Unicode-preserving. `ŁUCZAK` becomes `łuczak`, never `luczak`: the letters
 * are the surname's identity (`ARCHITECTURE.md` §10 invariant 8) and a URL
 * carries them percent-encoded. §22's steps, in §22's order.
 *
 * Pure. Nothing here touches the resolver's normalisation — the slug is a
 * *routing* form, and `docs/canonical/13` §5 keeps identity normalisation in
 * one place. That is also why this function is not used to produce a lookup
 * key: see `resolveSlug`.
 */
export function canonicalSlug(display: string): string {
  return (
    display
      .normalize("NFC")
      // The resolver's own case fold, not `toLocaleLowerCase`. They disagree:
      // `toLocaleLowerCase` expands `İ` (U+0130) into `i` + U+0307, while
      // `simpleCaseFold` keeps it whole — deliberately, because an expansion
      // merges two different surnames. A slug folded one way and a key folded
      // the other never match, and the surname becomes unreachable at its own
      // address (caught by review 2026-09-21).
      .split("")
      .join("")
      .replace(/[\s\S]*/u, (whole) => simpleCaseFold(whole))
      .trim()
      // Whitespace of any kind → hyphen (§22).
      .replace(/\s+/gu, "-")
      // Punctuation with unsafe or ambiguous URL semantics → hyphen (§23). The
      // apostrophe is kept: `O'Neil` → `o'neil` is a legal path segment, and
      // dropping it would collapse `O'X` into `OX`.
      .replace(/[^\p{L}\p{M}\p{N}'-]/gu, "-")
      .replace(/-{2,}/gu, "-")
      .replace(/^-+|-+$/gu, "")
  );
}

/** `/pl/nazwisko/{slug}` or `/en/surname/{slug}` (§19–§20). Percent-encoded for transport. */
export function surnamePath(display: string, lang: Lang): string | null {
  const slug = canonicalSlug(display);
  // A display form made only of characters that map to `-` slugs to the empty
  // string, and `/pl/nazwisko/` is not that surname's address — it is no
  // address at all. The caller renders a link only when there is one.
  if (slug === "") return null;
  const encoded = encodeURIComponent(slug);
  return lang === "en" ? `/en/surname/${encoded}` : `/pl/nazwisko/${encoded}`;
}

export type SlugResolution =
  | { readonly kind: "RESOLVED"; readonly surname_id: string; readonly display_name: string }
  | { readonly kind: "COLLISION"; readonly displays: readonly string[] }
  | { readonly kind: "UNKNOWN" }
  | { readonly kind: "INVALID" };

/**
 * A slug back to exactly one entity, or an honest refusal (ADR-0009 §3).
 *
 * A slug is not fed to the resolver as raw input, because `-` in a slug may
 * have been a hyphen or a space in the surname, and the resolver — correctly —
 * treats those as different keys. Each reading is tried; a candidate counts
 * only if its **own** computed slug equals the requested one; and two
 * candidates is a collision that resolves nothing. Never the more common one.
 */
export async function resolveSlug(db: Kysely<DB>, slug: string): Promise<SlugResolution> {
  // Next decodes a dynamic route segment before handing it over, so decoding
  // again would turn `%2520` into a space and resolve an address that was not
  // asked for. The value is taken as given (review, 2026-09-21).
  const decoded = slug;
  if (decoded === "" || decoded !== canonicalSlug(decoded)) {
    // Not in canonical form: a capitalised, padded or ASCII-folded address is
    // not this page. The caller may offer the search instead.
    return { kind: "INVALID" };
  }

  const readings = new Set<string>([decoded]);
  if (decoded.includes("-")) readings.add(decoded.replace(/-/gu, " "));

  const found = new Map<string, string>();
  for (const reading of readings) {
    const outcome = await resolveSurname(db, reading);
    if (outcome.kind !== "RESOLUTION") continue;
    const r = outcome.resolution;
    if (
      r.resolution_status !== "EXACT" ||
      !r.resolved_surname_id ||
      !r.resolved_canonical_display
    ) {
      continue;
    }
    if (canonicalSlug(r.resolved_canonical_display) !== decoded) continue;
    found.set(r.resolved_surname_id, r.resolved_canonical_display);
  }

  // The direct key the slug implies, so a surname whose display already
  // contains a hyphen resolves without the space reading having to match.
  for (const r of await db
    .selectFrom("surnames")
    .select(["surname_id", "canonical_display"])
    .where("canonical_key", "=", canonicalKey(decoded))
    .execute()) {
    if (canonicalSlug(r.canonical_display) === decoded) {
      found.set(r.surname_id, r.canonical_display);
    }
  }

  // The separator lookup.
  //
  // §23 maps URL-unsafe punctuation to `-`, and that loses which character it
  // was: the register really does contain surnames like `A/GADIR`, whose slug
  // is `a-gadir` and whose key is `a/gadir`, so no reading above can find it.
  // Candidates are narrowed by the one thing a slug and a key always agree on
  // — their alphanumeric characters — and then each candidate is **confirmed**
  // by recomputing its own slug, so the authority stays in `canonicalSlug` and
  // the SQL is only a filter. Migration `0017` indexes exactly this expression,
  // so it is a lookup rather than the scan it was.
  //
  // It runs **always**, not only when the earlier readings missed: a surname
  // reachable by a direct reading and one reachable only through here can share
  // a slug, and that is a collision. Stopping at the first hit would have
  // resolved it silently to whichever was found first, which is precisely what
  // ADR-0009 §3 says never to do (caught by review 2026-09-21).
  const alphanumeric = [...decoded].filter((c) => /[\p{L}\p{M}\p{N}]/u.test(c)).join("");
  if (alphanumeric !== "") {
    const rows = await sql<{ surname_id: string; canonical_display: string }>`
      SELECT surname_id::text, canonical_display
        FROM surnames
       WHERE regexp_replace(canonical_key, '[^[:alnum:]]+', '', 'g') = ${alphanumeric}
       LIMIT 50
    `.execute(db);
    for (const r of rows.rows) {
      if (canonicalSlug(r.canonical_display) === decoded) {
        found.set(r.surname_id, r.canonical_display);
      }
    }
  }

  if (found.size === 1) {
    const [surname_id, display_name] = [...found.entries()][0]!;
    return { kind: "RESOLVED", surname_id, display_name };
  }
  if (found.size > 1) {
    return { kind: "COLLISION", displays: [...found.values()].sort() };
  }
  return { kind: "UNKNOWN" };
}
