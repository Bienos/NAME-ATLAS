import { slugFor } from "@name-atlas/seo";
import type { Lang } from "./messages.js";

/** The comparison route's query, read (TASK-052). */
export type ComparisonRequest =
  /** Two typed surnames became addresses: the route redirects there. */
  | { readonly kind: "REDIRECT"; readonly to: string }
  /** Two addresses: compare them. */
  | { readonly kind: "COMPARE"; readonly a: string; readonly b: string }
  /** Not two yet: show the picker, with what was typed or given. */
  | {
      readonly kind: "PICK";
      readonly first: string;
      readonly second: string;
      /** A surname was typed that makes no address. */
      readonly error: boolean;
    };

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? "").trim();
  return (value ?? "").trim();
}

/** `/pl/porownaj?a=…&b=…` or `/en/compare?a=…&b=…`, the slugs URL-encoded. */
export function comparisonPath(a: string, b: string, lang: Lang): string {
  const base = lang === "pl" ? "/pl/porownaj" : "/en/compare";
  return `${base}?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
}

/**
 * The picker posts what a reader typed (`qa`, `qb`); the comparison itself is
 * addressed by slugs (`a`, `b`, TASK-025). A typed surname becomes a slug by
 * the one slug rule (`slugFor`, `docs/canonical/21` §21–§24), and the route
 * redirects, so the comparison keeps one address and what was typed never
 * reaches a link or a log. A slug that names no surname is refused later, as
 * before, by the lookup. Pure: no database.
 */
export function comparisonRequest(
  params: Record<string, string | string[] | undefined>,
  lang: Lang,
): ComparisonRequest {
  const qa = one(params["qa"]);
  const qb = one(params["qb"]);
  if (qa !== "" || qb !== "") {
    const a = slugFor(qa);
    const b = slugFor(qb);
    if (a !== null && b !== null) return { kind: "REDIRECT", to: comparisonPath(a, b, lang) };
    return { kind: "PICK", first: qa, second: qb, error: true };
  }
  const a = one(params["a"]);
  const b = one(params["b"]);
  if (a !== "" && b !== "") return { kind: "COMPARE", a, b };
  return { kind: "PICK", first: a, second: b, error: false };
}
