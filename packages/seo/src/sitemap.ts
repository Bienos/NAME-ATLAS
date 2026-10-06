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
 * Over the committed fixtures that suite can only see the empty case: they are
 * excerpts, so no distribution claim can be derived from them and every page
 * has one value family. It therefore missed the coverage clause, which
 * production found (TASK-126). `tests/integration/src/sitemap-query.test.ts`
 * covers the geography and rights clauses with labelled synthetic claims.
 */

export interface SitemapEntry {
  readonly surname_id: string;
  readonly slug: string;
  readonly display_name: string;
  /** The most recent claim date on the page, for `<lastmod>`. */
  readonly last_modified: string;
}

/**
 * Largest number of URLs in one sitemap file.
 *
 * The sitemap protocol allows 50,000. At that size a file was 15.9 MB, and
 * Vercel's CDN never stored it (every fetch a `MISS`, TASK-127's merged PR),
 * while the 533-byte index, served the same way, was a `HIT`. A size limit
 * on what the CDN caches is the likely reason; Vercel does not document it.
 * 10,000 URLs make a file of about 3.2 MB (TASK-128).
 */
export const SITEMAP_PAGE_SIZE = 10_000;

/**
 * The rights gate's input: the rights profiles whose own terms block the SEO
 * surface. The caller computes it with the page's own rule
 * (`apps/web/src/lib/seo-surface.ts`'s `seoBlockedProfileIds`), so this package
 * holds no copy of the rights logic. Required, so no caller can forget it.
 */
export interface SitemapQueryOptions {
  readonly seoBlockedProfileIds: readonly string[];
}

/**
 * The surnames §40's SEO gate refuses: those with an active claim citing a
 * blocked profile. Read first and on its own, then excluded by id: written as
 * a subquery, the same exclusion led the planner into a plan two to nine times
 * slower over a register-sized table (TASK-126). Usually empty, since no
 * claim cites a blocked profile.
 */
async function seoBlockedSurnameIds(
  db: Kysely<DB>,
  options: SitemapQueryOptions,
): Promise<readonly string[]> {
  if (options.seoBlockedProfileIds.length === 0) return [];
  const rows = await sql<{ surname_id: string }>`
    SELECT DISTINCT c.subject_entity_id::text AS surname_id
      FROM citations ci
      JOIN claims c ON c.claim_id = ci.claim_id
     WHERE c.claim_status = 'ACTIVE'
       AND ci.rights_profile_id = ANY(${[...options.seoBlockedProfileIds]}::uuid[])
  `.execute(db);
  return rows.rows.map((r) => r.surname_id);
}

/**
 * §42's conditions, as SQL: one predicate, shared by the entries and the count
 * so the index and its pages cannot disagree.
 *
 * Each clause is one condition of the page's assessment, named so the
 * correspondence can be checked by reading:
 *
 *   - an ACTIVE canonical surname whose entity is PUBLIC and ACTIVE (§40's
 *     privacy gate, `seoGatesFor`'s `privacyPublic`);
 *   - a current slug (there is no URL to list otherwise);
 *   - a cited `CURRENT_POPULATION` claim → the `CURRENT_STATS` family;
 *   - a cited `CURRENT_DISTRIBUTION` claim whose stored coverage `state` is
 *     `READY` → the `GEOGRAPHY` family. The page projects that same field as an
 *     entry's `coverage_state` (`packages/truth/src/query.ts`), and
 *     `publishableFamilies` counts the family only with a `READY` entry. Until
 *     TASK-126 any distribution claim counted, so a `LOW_COVERAGE` surname such
 *     as DIDYK was listed while its page served `noindex`;
 *   - §42's two citations: the page counts citation ids, one per claim, and
 *     reads every section through an inner join on `citations`
 *     (`packages/truth/src/read.ts`), so two cited claims are two citations.
 *     (Until TASK-126 this asked for two distinct source records, which is
 *     stricter than the page and the costliest clause of the query.);
 *   - §40's SEO surface: not one of `seoBlockedSurnameIds`. `seoGatesFor` folds
 *     every profile cited by the surname's active claims most-restrictively
 *     and evaluates the fold; since every permission column is `NOT NULL` and
 *     `evaluateSurface(…, "SEO")` only ever tightens as a dimension does, the
 *     fold is allowed exactly when no cited profile is blocked on its own.
 *
 * `ONOMASTICS` is not a family here: a surname with counts and a meaning but
 * no ready map can serve `index` and is left out of the sitemap (TASK-126 §3).
 * An omission, not a listed `noindex` page.
 *
 * The shape is chosen by measurement (TASK-126's progress record): the ready
 * distributions are found in one pass, and the population claim by
 * `claims_subject_type_status_idx`.
 */
function eligible(locale: SlugLocale, blockedSurnameIds: readonly string[]) {
  const rightsGate =
    blockedSurnameIds.length === 0
      ? sql``
      : sql`AND NOT (s.surname_id = ANY(${[...blockedSurnameIds]}::uuid[]))`;
  return sql`
    SELECT s.surname_id, sl.slug, s.canonical_display
      FROM surnames s
      JOIN knowledge_entities ke ON ke.entity_id = s.surname_id
      JOIN surname_slugs sl      ON sl.surname_id = s.surname_id
                                AND sl.locale = ${locale}
                                AND sl.is_current
     WHERE s.entity_status = 'ACTIVE'
       -- §40: privacy = pass.
       AND ke.privacy_class = 'PUBLIC'
       AND ke.lifecycle_status = 'ACTIVE'
       -- §41's GEOGRAPHY family: a cited distribution with READY coverage.
       AND s.surname_id IN (
         SELECT d.subject_entity_id
           FROM claims d
          WHERE d.claim_type = 'CURRENT_DISTRIBUTION'
            AND d.claim_status = 'ACTIVE'
            AND d.structured_value->>'state' = 'READY'
            AND EXISTS (SELECT 1 FROM citations dc WHERE dc.claim_id = d.claim_id)
       )
       -- §41's CURRENT_STATS family: a cited population claim.
       AND EXISTS (
         SELECT 1
           FROM claims p
          WHERE p.subject_entity_id = s.surname_id
            AND p.claim_type = 'CURRENT_POPULATION'
            AND p.claim_status = 'ACTIVE'
            AND EXISTS (SELECT 1 FROM citations pc WHERE pc.claim_id = p.claim_id)
       )
       -- §40: the SEO surface.
       ${rightsGate}`;
}

export async function sitemapEntries(
  db: Kysely<DB>,
  locale: SlugLocale,
  options: { readonly limit: number; readonly offset: number } & SitemapQueryOptions,
): Promise<readonly SitemapEntry[]> {
  // `<lastmod>` only for this page's rows: the inner query pages first.
  const rows = await sql<{
    surname_id: string;
    slug: string;
    canonical_display: string;
    last_modified: string;
  }>`
    SELECT
      e.surname_id::text AS surname_id,
      e.slug             AS slug,
      e.canonical_display AS canonical_display,
      (
        SELECT to_char(max(c.created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          FROM claims c
         WHERE c.subject_entity_id = e.surname_id
           AND c.claim_status = 'ACTIVE'
      )                  AS last_modified
      FROM (
        ${eligible(locale, await seoBlockedSurnameIds(db, options))}
         ORDER BY s.surname_id
         LIMIT ${options.limit} OFFSET ${options.offset}
      ) e
     ORDER BY e.surname_id
  `.execute(db);

  return rows.rows.map((r) => ({
    surname_id: r.surname_id,
    slug: r.slug,
    display_name: r.canonical_display,
    last_modified: r.last_modified,
  }));
}

/** How many URLs the sitemap has, so the index knows how many pages to name. */
export async function sitemapCount(
  db: Kysely<DB>,
  locale: SlugLocale,
  options: SitemapQueryOptions,
): Promise<number> {
  const rows = await sql<{ n: string }>`
    SELECT count(*)::text AS n
      FROM (${eligible(locale, await seoBlockedSurnameIds(db, options))}) eligible
  `.execute(db);
  return Number(rows.rows[0]?.n ?? "0");
}
