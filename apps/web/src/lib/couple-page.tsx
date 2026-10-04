import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import type { Metadata } from "next";
import { createLogger } from "@name-atlas/logging";
import { querySurnameResult } from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { db as sharedDb } from "./db.js";
import { loadSide } from "./compare-page.js";
import type { ComparisonSide } from "./compare-view.js";
import { coupleNames, nameRow, partOf } from "./couple.js";
import type { NameRow } from "./couple.js";
import { COUPLE_PATHS } from "./couple-config.js";
import { CouplePicker, CoupleView } from "./couple-view.js";
import type { Lang } from "./messages.js";

/**
 * The couple report's server half (TASK-100, ADR-0035).
 *
 * The two sides load as the comparison loads them (`loadSide`). Each name the
 * couple could carry then gets one register lookup through the existing
 * resolver (`querySurnameResult`), A and B reusing their own results. Never
 * indexed, as the comparison is not: a surname-pair address space must not
 * reach a search engine.
 */

export const COUPLE_METADATA: Metadata = {
  title: "Name Atlas",
  robots: { index: false, follow: false },
};

/** One name's validated result, or null when the lookup failed or the contract refused it. */
async function lookUp(db: Kysely<DB>, name: string): Promise<SurnameResultResponse | null> {
  const outcome = await querySurnameResult(db, name);
  if (outcome.kind !== "OK") return null;
  const parsed = surnameResultResponseSchema.safeParse(outcome.response);
  return parsed.success ? parsed.data : null;
}

export async function loadCouple(
  aSlug: string,
  bSlug: string,
  lang: Lang,
): Promise<{
  readonly a: ComparisonSide;
  readonly b: ComparisonSide;
  readonly names: readonly NameRow[];
}> {
  const log = createLogger({ service: "web", base: { route: COUPLE_PATHS[lang] } });
  const startedAt = Date.now();
  try {
    const db = sharedDb();
    const a = await loadSide(db, aSlug, lang);
    const b = await loadSide(db, bSlug, lang);
    const partA = partOf(a.response);
    const partB = partOf(b.response);
    const names: NameRow[] = [];
    if (partA !== null && partB !== null) {
      const known = new Map<string, SurnameResultResponse | null>([
        [partA.display, a.response],
        [partB.display, b.response],
      ]);
      for (const name of coupleNames(partA, partB)) {
        const response = known.has(name) ? (known.get(name) ?? null) : await lookUp(db, name);
        names.push(nameRow(name, response));
      }
    }
    log.info("couple_rendered", {
      a_resolved: partA !== null,
      b_resolved: partB !== null,
      names: names.length,
      ms: Date.now() - startedAt,
    });
    return { a, b, names };
  } catch (cause: unknown) {
    log.error("couple_failed", { cause, ms: Date.now() - startedAt });
    return {
      a: { slug: aSlug, display: null, response: null, path: null },
      b: { slug: bSlug, display: null, response: null, path: null },
      names: [],
    };
  }
}

export { CouplePicker, CoupleView };
