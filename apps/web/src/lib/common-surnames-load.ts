import { createLogger } from "@name-atlas/logging";
import { mostCommonSurnames } from "@name-atlas/truth";
import { currentSlugsFor } from "@name-atlas/seo";
import { db as sharedDb } from "./db.js";
import type { CommonList } from "./common-surnames.js";
import type { Lang } from "./messages.js";
import { pathForSlug } from "./slug.js";

/**
 * The most common surnames for the Atlas page's plate 01 (TASK-178; on the
 * landing until then), from rank claims (`mostCommonSurnames`). A failure here
 * costs the ten, never the page: the plate then shows the artefact's three.
 */
export async function loadCommonLists(lang: Lang, route = "/pl/atlas"): Promise<CommonList[]> {
  try {
    const db = sharedDb();
    const lists = await mostCommonSurnames(db, { limit: 10 });
    const ids = lists.flatMap((l) => l.items.map((i) => i.surname_id));
    const slugs = await currentSlugsFor(db, lang, ids);
    return lists.map((l) => ({
      comparability_group: l.comparability_group,
      snapshot_date: l.snapshot_date,
      items: l.items.map((i) => {
        const slug = slugs.get(i.surname_id);
        const path = slug === undefined ? null : pathForSlug(slug, lang);
        const search = new URLSearchParams({
          surname: i.display_name,
          ...(lang === "en" ? { lang } : {}),
        });
        return {
          display_name: i.display_name,
          rank: i.rank,
          path: path ?? `/?${search.toString()}`,
        };
      }),
    }));
  } catch (cause: unknown) {
    createLogger({ service: "web", base: { route } }).error("common_surnames_failed", { cause });
    return [];
  }
}
