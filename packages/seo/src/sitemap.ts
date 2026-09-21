import { sql } from "kysely";
import type { DB } from "@name-atlas/db";
import type { Kysely } from "kysely";
import type { SlugLocale } from "./slug.js";

/**
 * Which surnames a sitemap may list (TASK-027, ADR-0010 §3).
 *
 * A sitemap entry is a claim that a page is worth indexing, so it lists a page
 * only where `docs/canonical/21` §42's policy says `INDEX`. That policy is
 * defined over a *payload*, and 598,476 payloads cannot be built per request —
 * so it is expressed here as SQL over the claim tables, asserting the same
 * conditions.
 *
 * Two implementations of one policy is a risk, and it is handled rather than
 * accepted: `tests/integration/src/sitemap-policy.test.ts` asserts over real
 * imported data that every surname this query returns also assesses as `INDEX`
 * through `assessIndexability`, and that no surname assessing as `INDEX` is
 * missing from it. If the two ever disagree, that test fails rather than a
 * crawler finding a `noindex` page in a sitemap.
 *
 * Today it returns **nothing**, and that is correct: §42 needs two substantive
 * value families, `CURRENT_STATS` is the only one the repository's excerpts can
 * produce, and `GEOGRAPHY` needs the full regional register. A sitemap that
 * listed pages anyway would be the lie this whole project is built not to tell.
 */

export interface SitemapEntry {
  readonly surname_id: string;
  readonly slug: string;
  readonly display_name: string;
  /** The most recent claim date on the page, for `<lastmod>`. */
  readonly last_modified: string;
}

/** Largest number of URLs in one sitemap file. The sitemap protocol's limit. */
export const SITEMAP_PAGE_SIZE = 50_000;

/**
 * §42's conditions, as SQL.
 *
 * Each `EXISTS` is one clause of the policy, named in a comment so the
 * correspondence can be checked by reading:
 *
 *   - an ACTIVE canonical surname whose entity is PUBLIC (§40 privacy gate);
 *   - a current slug (there is no URL to list otherwise);
 *   - a `CURRENT_POPULATION` claim → the `CURRENT_STATS` family;
 *   - a `CURRENT_DISTRIBUTION` claim → the `GEOGRAPHY` family;
 *   - at least two distinct source records cited across those claims.
 *
 * `HISTORY` and `ONOMASTICS` are absent on purpose: no producer exists for the
 * first, and a `SURNAME_MEANING` claim would add a third family without being
 * needed for the two-family threshold. When one exists, it joins this query and
 * the integration test above is what proves both sides still agree.
 */
export async function sitemapEntries(
  db: Kysely<DB>,
  locale: SlugLocale,
  options: { readonly limit: number; readonly offset: number },
): Promise<readonly SitemapEntry[]> {
  const rows = await sql<{
    surname_id: string;
    slug: string;
    canonical_display: string;
    last_modified: string;
  }>`
    SELECT
      s.surname_id::text            AS surname_id,
      sl.slug                       AS slug,
      s.canonical_display           AS canonical_display,
      to_char(
        max(c.created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'
      )                             AS last_modified
      FROM surnames s
      JOIN knowledge_entities ke  ON ke.entity_id = s.surname_id
      JOIN surname_slugs sl       ON sl.surname_id = s.surname_id
                                 AND sl.locale = ${locale}
                                 AND sl.is_current
      JOIN claims c               ON c.subject_entity_id = s.surname_id
                                 AND c.claim_status = 'ACTIVE'
      LEFT JOIN citations cit     ON cit.claim_id = c.claim_id
     WHERE s.entity_status = 'ACTIVE'
       -- §40: privacy = pass.
       AND ke.privacy_class = 'PUBLIC'
       AND ke.lifecycle_status = 'ACTIVE'
     GROUP BY s.surname_id, sl.slug, s.canonical_display
       -- §41's CURRENT_STATS family.
     HAVING count(*) FILTER (WHERE c.claim_type = 'CURRENT_POPULATION') > 0
       -- §41's GEOGRAPHY family. Two families is §42's threshold.
       AND count(*) FILTER (WHERE c.claim_type = 'CURRENT_DISTRIBUTION') > 0
       -- §42: at least two usable citations.
       AND count(DISTINCT cit.source_record_id) >= 2
     ORDER BY s.surname_id
     LIMIT ${options.limit} OFFSET ${options.offset}
  `.execute(db);

  return rows.rows.map((r) => ({
    surname_id: r.surname_id,
    slug: r.slug,
    display_name: r.canonical_display,
    last_modified: r.last_modified,
  }));
}

/** How many URLs the sitemap has, so the index knows how many pages to name. */
export async function sitemapCount(db: Kysely<DB>, locale: SlugLocale): Promise<number> {
  const rows = await sql<{ n: string }>`
    SELECT count(*)::text AS n FROM (
      SELECT s.surname_id
        FROM surnames s
        JOIN knowledge_entities ke ON ke.entity_id = s.surname_id
        JOIN surname_slugs sl      ON sl.surname_id = s.surname_id
                                  AND sl.locale = ${locale}
                                  AND sl.is_current
        JOIN claims c              ON c.subject_entity_id = s.surname_id
                                  AND c.claim_status = 'ACTIVE'
        LEFT JOIN citations cit    ON cit.claim_id = c.claim_id
       WHERE s.entity_status = 'ACTIVE'
         AND ke.privacy_class = 'PUBLIC'
         AND ke.lifecycle_status = 'ACTIVE'
       GROUP BY s.surname_id
      HAVING count(*) FILTER (WHERE c.claim_type = 'CURRENT_POPULATION') > 0
         AND count(*) FILTER (WHERE c.claim_type = 'CURRENT_DISTRIBUTION') > 0
         AND count(DISTINCT cit.source_record_id) >= 2
    ) eligible
  `.execute(db);
  return Number(rows.rows[0]?.n ?? "0");
}
