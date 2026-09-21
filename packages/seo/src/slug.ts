import { simpleCaseFold } from "@name-atlas/resolver";

/**
 * The canonical surname slug and its collision suffix (ADR-0009, ADR-0010;
 * `docs/canonical/21` §21–§24).
 *
 * Moved here from `apps/web` by TASK-027 for one reason: the backfill that
 * writes every surname's slug is a CLI, and a CLI cannot import from a Next
 * application. Two implementations of a slug rule would be two slug rules.
 */

/** The locales that have a surname route (`docs/canonical/21` §19–§20). */
export type SlugLocale = "pl" | "en";

export const SLUG_LOCALES: readonly SlugLocale[] = ["pl", "en"];

/**
 * Unicode-preserving. `ŁUCZAK` becomes `łuczak`, never `luczak`: the letters are
 * the surname's identity (`ARCHITECTURE.md` §10 invariant 8) and a URL carries
 * them percent-encoded. §22's steps, in §22's order.
 *
 * Pure, and deliberately not the resolver's lookup key: a slug is a *routing*
 * form, and `docs/canonical/13` §5 keeps identity normalisation in one place.
 */
export function canonicalSlug(display: string): string {
  return (
    simpleCaseFold(display.normalize("NFC"))
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

/**
 * Crockford base32's alphabet. `I`, `L`, `O` and `U` are absent: the first
 * three because they are confusable with `1` and `0`, and `U` so that no
 * generated suffix can spell an offensive word by accident.
 */
const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";

/** How many characters of the encoding a suffix uses (§24). */
export const SHORT_SLUG_ID_LENGTH = 6;

/**
 * FNV-1a, 32-bit. Pure JavaScript on purpose: this module is imported by a CLI,
 * by server components and by the sitemap routes, and a `node:crypto` import
 * would tie the slug rule to one runtime for no benefit at this size.
 */
function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * The stable disambiguating suffix for a surname (ADR-0010 §2).
 *
 * A **function of the whole entity id**, not of scan order. That is the point: a
 * sequence number (`-2`, `-3`) depends on which entity a backfill saw first, so
 * a re-import can reassign it, and a reassigned suffix points a URL that is
 * already in a search index at a different family's page.
 *
 * It hashes the id rather than reading digits out of it. The first version read
 * the *leading* hex digits, and a test over ids differing only in their tail
 * showed 2,000 ids collapsing to **one** suffix — because a UUIDv7 carries a
 * millisecond timestamp in its leading 48 bits, so every surname created by one
 * import shares that prefix. The suffix would have been identical for exactly
 * the entities most likely to need distinguishing.
 *
 * A longer suffix **extends** a shorter one rather than replacing it, so the
 * backfill can lengthen a suffix that is already taken without moving the
 * addresses it already assigned. Uniqueness itself is guaranteed by
 * `UNIQUE (locale, slug)`, never by this function.
 */
export function shortSlugId(surnameId: string, length = SHORT_SLUG_ID_LENGTH): string {
  const hex = surnameId.replace(/[^0-9a-fA-F]/gu, "").toLowerCase();
  if (hex.length < 32) {
    throw new Error(`not a uuid: ${surnameId}`);
  }
  if (length < 1 || length > 48) {
    throw new Error(`suffix length out of range: ${String(length)}`);
  }
  let out = "";
  for (let word = 0; out.length < length; word += 1) {
    // Six characters per word: 30 of the 32 bits, which keeps each character a
    // clean modulo rather than straddling a word boundary.
    let hash = fnv1a32(`${hex}#${String(word)}`);
    for (let i = 0; i < 6 && out.length < length; i += 1) {
      out += CROCKFORD[hash % 32] ?? "0";
      hash = Math.floor(hash / 32);
    }
  }
  return out;
}

/** `base-slug-k3m9qp`, or the bare slug when this entity keeps it. */
export function suffixedSlug(base: string, surnameId: string, length?: number): string {
  return `${base}-${shortSlugId(surnameId, length)}`;
}

/** `/pl/nazwisko/{slug}` or `/en/surname/{slug}` (§19–§20), percent-encoded. */
export function surnameRoute(slug: string, locale: SlugLocale): string | null {
  if (slug === "") return null;
  const encoded = encodeURIComponent(slug);
  return locale === "en" ? `/en/surname/${encoded}` : `/pl/nazwisko/${encoded}`;
}

/** The slug a display form produces, or `null` when it produces none (§22). */
export function slugFor(display: string): string | null {
  const slug = canonicalSlug(display);
  return slug === "" ? null : slug;
}
