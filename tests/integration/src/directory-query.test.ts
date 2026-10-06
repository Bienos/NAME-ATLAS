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
import {
  backfillSlugs,
  DIRECTORY_LETTERS,
  DIRECTORY_OTHER,
  directoryCount,
  directoryEntries,
  directoryLetters,
  sitemapCount,
  sitemapEntries,
  SITEMAP_PAGE_SIZE,
} from "@name-atlas/seo";
import type { DirectoryLetter } from "@name-atlas/seo";
import { seoBlockedProfileIds } from "../../../apps/web/src/lib/seo-surface.js";

/**
 * TASK-129 — the alphabetical directory lists exactly what the sitemap lists,
 * split by first letter with nothing left out, in alphabetical order.
 *
 * GENUINE DATA: the surnames and their `CURRENT_POPULATION` claims come from the
 * real importer over the committed PESEL fixtures. Which surnames, and so which
 * letters, is chosen by query, and every expectation is computed from the
 * database, so the test does not depend on the fixtures' names.
 * SYNTHETIC: as in `sitemap-query.test.ts`, each `CURRENT_DISTRIBUTION` claim is
 * inserted by hand from its surname's population claim, changing only the
 * claim type, key, stored coverage `state` and cited source record. One rights
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

/** Every letter's page, `inne` last. */
const ALL_LETTERS: readonly DirectoryLetter[] = [...DIRECTORY_LETTERS, DIRECTORY_OTHER];

/** The directory's letter for a `canonical_key`, computed here independently of the SQL. */
function letterOf(key: string): DirectoryLetter {
  const first = Array.from(key)[0] ?? "";
  return (DIRECTORY_LETTERS as readonly string[]).includes(first)
    ? (first as DirectoryLetter)
    : DIRECTORY_OTHER;
}

describe("the surname directory lists the sitemap's surnames by letter (TASK-129)", () => {
  let database: TestDatabase | undefined;
  /** surname_id → canonical_key, for every surname given a population claim. */
  const keys = new Map<string, string>();
  let blockedId = "";
  let noDistributionId = "";
  /** The letter given three surnames, to test order and paging within a letter. */
  let fullLetter: DirectoryLetter = "a";

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  /** A synthetic distribution claim on the surname, cited as `sitemap-query.test.ts` describes. */
  async function addDistribution(
    surnameId: string,
    state: string,
    rightsProfileId: string | null = null,
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
        SELECT gen_random_uuid(), 'test:task-129:' || ${surnameId} || ':' || ${state},
               'ACTIVE', 'CURRENT_DISTRIBUTION', p.created_by_run_id, p.epistemic_type,
               p.method_version, p.scope, jsonb_build_object('state', ${state}::text),
               ${surnameId}::uuid
          FROM p
        RETURNING claim_id
      )
      INSERT INTO citations (citation_id, claim_id, rights_profile_id, source_id,
                             source_record_id, title, url_or_reference)
      SELECT gen_random_uuid(), d.claim_id, coalesce(${rightsProfileId}::uuid, p.rights_profile_id),
             p.source_id, (SELECT source_record_id FROM other), p.title, p.url_or_reference
        FROM d, p
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

    // The first surname of up to eight first characters, then the second and
    // third of the most common first character.
    const spread = await sql<{
      surname_id: string;
      canonical_display: string;
      canonical_key: string;
    }>`
      SELECT * FROM (
        SELECT DISTINCT ON (left(canonical_key, 1))
               surname_id::text, canonical_display, canonical_key
          FROM surnames
         ORDER BY left(canonical_key, 1), canonical_key
      ) firsts
      ORDER BY canonical_key
      LIMIT 8
    `.execute(db());
    const common = await sql<{ initial: string }>`
      SELECT left(canonical_key, 1) AS initial
        FROM surnames GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 1
    `.execute(db());
    const more = await sql<{
      surname_id: string;
      canonical_display: string;
      canonical_key: string;
    }>`
      SELECT surname_id::text, canonical_display, canonical_key
        FROM surnames
       WHERE left(canonical_key, 1) = ${common.rows[0]?.initial ?? ""}
       ORDER BY canonical_key
       OFFSET 1 LIMIT 2
    `.execute(db());
    const chosen = [...spread.rows, ...more.rows];
    if (spread.rows.length < 4 || more.rows.length < 2) {
      throw new Error("the fixtures have too few surnames for this test");
    }
    for (const row of chosen) {
      await deriveCurrentPopulation(db(), row.canonical_display);
      keys.set(row.surname_id, row.canonical_key);
    }
    await backfillSlugs(db());
    fullLetter = letterOf(more.rows[0]?.canonical_key ?? "");

    const restrictive = await sql<{ rights_profile_id: string }>`
      INSERT INTO rights_profiles (rights_profile_id, attribution_required, attribution_text,
             automated_access, checked_at, commercial_use, contact_required, database_rights,
             image_rights, local_cache, metadata_rights, notes, redistribution, review_status,
             rights_url, source_owner, terms_hash, terms_version, transcription_rights,
             valid_from, valid_to)
      SELECT gen_random_uuid(), attribution_required, attribution_text, automated_access,
             checked_at, 'UNKNOWN', contact_required, database_rights, image_rights,
             local_cache, metadata_rights, 'TASK-129 test: commercial use unknown',
             redistribution, review_status, rights_url, source_owner, terms_hash,
             terms_version, transcription_rights, valid_from, valid_to
        FROM rights_profiles
       WHERE rights_profile_id = (SELECT rights_profile_id FROM citations LIMIT 1)
      RETURNING rights_profile_id::text
    `.execute(db());
    const restrictiveId = restrictive.rows[0]?.rights_profile_id ?? "";

    // All but two get a READY distribution: one gets none, one is SEO-blocked.
    // Both are first surnames of their letter, so the full letter keeps three.
    const [none, blocked, ...ready] = spread.rows.filter(
      (r) => letterOf(r.canonical_key) !== fullLetter,
    );
    noDistributionId = none?.surname_id ?? "";
    blockedId = blocked?.surname_id ?? "";
    if (blockedId !== "") await addDistribution(blockedId, "READY", restrictiveId);
    for (const row of [
      ...chosen.filter((r) => letterOf(r.canonical_key) === fullLetter),
      ...ready,
    ]) {
      await addDistribution(row.surname_id, "READY");
    }
  }, 300_000);

  afterAll(async () => {
    await database?.stop();
  });

  async function options() {
    return { seoBlockedProfileIds: await seoBlockedProfileIds(db()) };
  }

  async function sitemapIds(): Promise<string[]> {
    const entries = await sitemapEntries(db(), "pl", {
      ...(await options()),
      limit: SITEMAP_PAGE_SIZE,
      offset: 0,
    });
    return entries.map((e) => e.surname_id).sort();
  }

  it("names the letters of the listed surnames, in alphabetical order with `inne` last", async () => {
    const listed = await sitemapIds();
    expect(listed.length).toBeGreaterThanOrEqual(3);
    const present = new Set(listed.map((id) => letterOf(keys.get(id) ?? "")));
    const expected = ALL_LETTERS.filter((l) => present.has(l));
    expect(await directoryLetters(db(), "pl", await options())).toEqual(expected);
  });

  it("splits the sitemap's surnames by letter with none left out and none added", async () => {
    const opts = await options();
    const letters = await directoryLetters(db(), "pl", opts);
    const seen: string[] = [];
    let total = 0;
    for (const letter of ALL_LETTERS) {
      const entries = await directoryEntries(db(), "pl", letter, {
        ...opts,
        limit: 500,
        offset: 0,
      });
      const count = await directoryCount(db(), "pl", letter, opts);
      expect(count, letter).toBe(entries.length);
      expect(letters.includes(letter), letter).toBe(count > 0);
      for (const entry of entries) {
        expect(letterOf(keys.get(entry.surname_id) ?? ""), entry.display_name).toBe(letter);
        expect(entry.slug).not.toBe("");
      }
      // In the order of `canonical_key`.
      const order = entries.map((e) => keys.get(e.surname_id) ?? "");
      expect(order).toEqual([...order].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
      seen.push(...entries.map((e) => e.surname_id));
      total += count;
    }
    expect(seen.sort()).toEqual(await sitemapIds());
    expect(total).toBe(await sitemapCount(db(), "pl", opts));
  });

  it("leaves out a surname with no distribution, and one whose claims cite a profile that blocks SEO", async () => {
    const opts = await options();
    expect(noDistributionId).not.toBe("");
    expect(blockedId).not.toBe("");
    for (const id of [noDistributionId, blockedId]) {
      const letter = letterOf(keys.get(id) ?? "");
      const entries = await directoryEntries(db(), "pl", letter, {
        ...opts,
        limit: 500,
        offset: 0,
      });
      expect(entries.map((e) => e.surname_id)).not.toContain(id);
    }
  });

  it("pages a letter in order", async () => {
    const opts = await options();
    const all = await directoryEntries(db(), "pl", fullLetter, { ...opts, limit: 500, offset: 0 });
    expect(all.length).toBe(3);
    const second = await directoryEntries(db(), "pl", fullLetter, { ...opts, limit: 1, offset: 1 });
    expect(second).toEqual([all[1]]);
    const past = await directoryEntries(db(), "pl", fullLetter, { ...opts, limit: 1, offset: 3 });
    expect(past).toEqual([]);
  });
});
