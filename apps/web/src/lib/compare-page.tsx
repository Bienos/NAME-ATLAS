import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { db as sharedDb } from "./db.js";
import type { Metadata } from "next";
import { createLogger } from "@name-atlas/logging";
import { querySurnameResult } from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import { ComparisonView } from "./compare-view.js";
import type { ComparisonSide } from "./compare-view.js";
import { resolveSlug } from "./slug.js";
import type { Lang } from "./messages.js";

/**
 * The comparison route's server half (TASK-025).
 *
 * Two slugs in, two validated projections out, one query each. Never indexed:
 * `noindex, nofollow` is set here rather than left to a policy, because an
 * indexable surname-pair URL space is the programmatic explosion the directive's
 * §53 forbids.
 */

export const COMPARISON_METADATA: Metadata = {
  title: "Name Atlas",
  robots: { index: false, follow: false },
};

async function loadSide(db: Kysely<DB>, slug: string): Promise<ComparisonSide> {
  const resolved = await resolveSlug(db, slug);
  if (resolved.kind !== "RESOLVED") return { slug, display: null, response: null };
  const outcome = await querySurnameResult(db, resolved.display_name);
  if (outcome.kind !== "OK") return { slug, display: resolved.display_name, response: null };
  const parsed = surnameResultResponseSchema.safeParse(outcome.response);
  if (!parsed.success) return { slug, display: resolved.display_name, response: null };
  return { slug, display: resolved.display_name, response: parsed.data };
}

export async function loadComparison(
  aSlug: string,
  bSlug: string,
): Promise<{ readonly a: ComparisonSide; readonly b: ComparisonSide }> {
  const log = createLogger({ service: "web", base: { route: "/pl/porownaj" } });
  const startedAt = Date.now();
  try {
    const db = sharedDb();
    const a = await loadSide(db, aSlug);
    const b = await loadSide(db, bSlug);
    log.info("comparison_rendered", {
      a_resolved: a.response !== null,
      b_resolved: b.response !== null,
      ms: Date.now() - startedAt,
    });
    return { a, b };
  } catch (cause: unknown) {
    log.error("comparison_failed", { cause, ms: Date.now() - startedAt });
    return {
      a: { slug: aSlug, display: null, response: null },
      b: { slug: bSlug, display: null, response: null },
    };
  }
}

export function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export { ComparisonView };
export type { Lang };
