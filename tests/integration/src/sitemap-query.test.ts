import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  importPeselResource,
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  sha256Hex,
} from "@name-atlas/sources";
import { deriveCurrentPopulation } from "@name-atlas/truth";
import { backfillSlugs, sitemapCount, sitemapEntries, SITEMAP_PAGE_SIZE } from "@name-atlas/seo";
import { seoBlockedProfileIds, seoGatesFor } from "../../../apps/web/src/lib/seo-surface.js";

/**
 * TASK-126 — the sitemap's geography and rights clauses.
 *
 * `sitemap-policy.test.ts` holds the sitemap to the page over genuine data, but
 * the committed regional fixtures are excerpts, so no distribution claim can be
 * derived from them and that suite only ever sees an empty sitemap. Production
 * then listed DIDYK, whose distributions are all `LOW_COVERAGE`, while its page
 * served `noindex`.
 *
 * GENUINE DATA: the surnames and their `CURRENT_POPULATION` claims come from the
 * real importer over the committed PESEL fixtures.
 * SYNTHETIC: each `CURRENT_DISTRIBUTION` claim below is inserted by hand, copying
 * its surname's population claim's run, scope and citation and changing only
 * the claim type, key, stored coverage `state` and cited source record (one is
 * left uncited). They carry no regional figures: only the fields the sitemap's
 * SQL reads. One rights
 * profile is a copy of PESEL's with `commercial_use = UNKNOWN`, which blocks the
 * SEO surface.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function payloadFor(file: string): unknown {
  return JSON.parse(
    readFileSync(path.join(repoRoot, "docs/sources/acquisition/2026-09-18/metadata", file), "utf8"),
  );
}

const MALE_BYTES = readFileSync(path.join(repoRoot, "fixtures/pesel/national-male-2026-01-20.csv"));
const FEMALE_BYTES = readFileSync(
  path.join(repoRoot, "fixtures/pesel/national-female-2026-01-20.csv"),
);

describe("the sitemap lists only pages that serve index (TASK-126)", () => {
  let database: TestDatabase | undefined;
  /** surname_id by role, chosen from the imported surnames. */
  const role: Record<string, string | undefined> = {};
  let restrictiveId = "";

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  /** A synthetic distribution claim on the surname, cited as described above. */
  async function addDistribution(
    surnameId: string,
    state: string,
    options: { sameRecord?: boolean; rightsProfileId?: string; uncited?: boolean } = {},
  ): Promise<void> {
    await sql`
      WITH p AS (
        SELECT c.claim_id, c.created_by_run_id, c.epistemic_type, c.method_version, c.scope,
               ci.source_id, ci.source_record_id, ci.rights_profile_id, ci.title,
               ci.url_or_reference
          FROM claims c
          JOIN citations ci ON ci.claim_id = c.claim_id
         WHERE c.subject_entity_id = ${surnameId}::uuid
           AND c.claim_type = 'CURRENT_POPULATION'
           AND c.claim_status = 'ACTIVE'
         ORDER BY c.claim_id
         LIMIT 1
      ), other AS (
        SELECT ci.source_record_id
          FROM citations ci, p
         WHERE ci.source_record_id <> p.source_record_id
         LIMIT 1
      ), d AS (
        INSERT INTO claims (claim_id, claim_key, claim_status, claim_type, created_by_run_id,
                            epistemic_type, method_version, scope, structured_value,
                            subject_entity_id)
        SELECT gen_random_uuid(), 'test:task-124:' || ${surnameId} || ':' || ${state},
               'ACTIVE', 'CURRENT_DISTRIBUTION', p.created_by_run_id, p.epistemic_type,
               p.method_version, p.scope, jsonb_build_object('state', ${state}::text),
               ${surnameId}::uuid
          FROM p
        RETURNING claim_id
      )
      INSERT INTO citations (citation_id, claim_id, rights_profile_id, source_id,
                             source_record_id, title, url_or_reference)
      SELECT gen_random_uuid(), d.claim_id,
             coalesce(${options.rightsProfileId ?? null}::uuid, p.rights_profile_id),
             p.source_id,
             ${options.sameRecord === true ? sql`p.source_record_id` : sql`(SELECT source_record_id FROM other)`},
             p.title, p.url_or_reference
        FROM d, p
       WHERE NOT ${options.uncited === true}
    `.execute(db());
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);

    for (const [resource, bytes, metadata] of [
      [
        PESEL_NATIONAL_MALE_2026,
        MALE_BYTES,
        "pesel_national_2026_male_1148808.official_resource.json",
      ],
      [
        PESEL_NATIONAL_FEMALE_2026,
        FEMALE_BYTES,
        "pesel_national_2026_female_1148811.official_resource.json",
      ],
    ] as const) {
      const outcome = await importPeselResource(db(), {
        resource,
        bytes,
        expectedSha256: sha256Hex(bytes),
        rawPayload: payloadFor(metadata),
      });
      if (outcome.kind !== "IMPORTED") throw new Error(`fixture import failed: ${outcome.kind}`);
    }

    const surnames = await sql<{ surname_id: string; canonical_display: string }>`
      SELECT surname_id::text, canonical_display FROM surnames ORDER BY canonical_display LIMIT 7
    `.execute(db());
    for (const row of surnames.rows) {
      await deriveCurrentPopulation(db(), row.canonical_display);
    }
    await backfillSlugs(db());

    const ids = surnames.rows.map((r) => r.surname_id);
    if (ids.length < 7) throw new Error("fewer than seven surnames were imported");
    [role.ready, role.low, role.unknown, role.blocked, role.oneRecord, role.uncited, role.none] =
      ids;

    // A copy of the cited profile with commercial use unknown: `evaluateSurface`
    // blocks SEO on it.
    const restrictive = await sql<{ rights_profile_id: string }>`
      INSERT INTO rights_profiles (rights_profile_id, attribution_required, attribution_text,
             automated_access, checked_at, commercial_use, contact_required, database_rights,
             image_rights, local_cache, metadata_rights, notes, redistribution, review_status,
             rights_url, source_owner, terms_hash, terms_version, transcription_rights,
             valid_from, valid_to)
      SELECT gen_random_uuid(), attribution_required, attribution_text, automated_access,
             checked_at, 'UNKNOWN', contact_required, database_rights, image_rights,
             local_cache, metadata_rights, 'TASK-126 test: commercial use unknown',
             redistribution, review_status, rights_url, source_owner, terms_hash,
             terms_version, transcription_rights, valid_from, valid_to
        FROM rights_profiles
       WHERE rights_profile_id = (SELECT rights_profile_id FROM citations LIMIT 1)
      RETURNING rights_profile_id::text
    `.execute(db());
    restrictiveId = restrictive.rows[0]?.rights_profile_id ?? "";
    if (restrictiveId === "") throw new Error("the restrictive profile was not created");

    await addDistribution(role.ready!, "READY");
    await addDistribution(role.low!, "LOW_COVERAGE");
    await addDistribution(role.unknown!, "COVERAGE_UNKNOWN");
    await addDistribution(role.blocked!, "READY", { rightsProfileId: restrictiveId });
    await addDistribution(role.oneRecord!, "READY", { sameRecord: true });
    await addDistribution(role.uncited!, "READY", { uncited: true });
  }, 300_000);

  afterAll(async () => {
    await database?.stop();
  });

  async function listed(): Promise<Set<string>> {
    const entries = await sitemapEntries(db(), "pl", {
      limit: SITEMAP_PAGE_SIZE,
      offset: 0,
      seoBlockedProfileIds: await seoBlockedProfileIds(db()),
    });
    return new Set(entries.map((e) => e.surname_id));
  }

  it("AC-1: lists a surname with a READY distribution, not one with only LOW_COVERAGE or unknown coverage", async () => {
    const ids = await listed();
    expect(ids.has(role.ready!)).toBe(true);
    expect(ids.has(role.low!)).toBe(false);
    expect(ids.has(role.unknown!)).toBe(false);
    expect(ids.has(role.none!)).toBe(false);
  });

  it("AC-2: leaves out a surname whose claims cite a profile that blocks SEO, as the page's gate does", async () => {
    expect(await seoBlockedProfileIds(db())).toContain(restrictiveId);
    expect((await listed()).has(role.blocked!)).toBe(false);
    // The page agrees: its fold over the same claims refuses the SEO surface.
    expect((await seoGatesFor(db(), role.blocked!)).seoSurfaceAllowed).toBe(false);
    expect((await seoGatesFor(db(), role.ready!)).seoSurfaceAllowed).toBe(true);
  });

  it("counts §42's two citations as the page does: one per cited claim, whatever their source record", async () => {
    // The page counts citation ids and reads each section through an inner
    // join on `citations`: two cited claims are two citations, even from one
    // source record, and an uncited claim is not shown at all.
    const ids = await listed();
    expect(ids.has(role.oneRecord!)).toBe(true);
    expect(ids.has(role.uncited!)).toBe(false);
  });

  it("AC-3: counts exactly what it lists, and pages by surname id", async () => {
    const seoBlocked = await seoBlockedProfileIds(db());
    const all = await sitemapEntries(db(), "pl", {
      limit: SITEMAP_PAGE_SIZE,
      offset: 0,
      seoBlockedProfileIds: seoBlocked,
    });
    expect(await sitemapCount(db(), "pl", { seoBlockedProfileIds: seoBlocked })).toBe(all.length);
    const expected = [role.ready!, role.oneRecord!].sort();
    expect(all.map((e) => e.surname_id)).toEqual(expected);
    for (const entry of all) {
      expect(entry.last_modified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u);
    }
    const second = await sitemapEntries(db(), "pl", {
      limit: 1,
      offset: 1,
      seoBlockedProfileIds: seoBlocked,
    });
    expect(second.map((e) => e.surname_id)).toEqual([expected[1]]);
  });
});
