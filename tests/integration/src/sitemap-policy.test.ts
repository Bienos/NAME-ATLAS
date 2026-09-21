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
import { deriveCurrentPopulation, querySurnameResult } from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import { backfillSlugs, sitemapCount, sitemapEntries, SITEMAP_PAGE_SIZE } from "@name-atlas/seo";
import { assessIndexability } from "../../../apps/web/src/lib/seo.js";
import { seoGatesFor } from "../../../apps/web/src/lib/seo-surface.js";

/**
 * TASK-027 AC-9/AC-10 — the sitemap and the page must agree.
 *
 * `docs/canonical/21` §42's policy is defined over a payload. A sitemap cannot
 * build 598,476 payloads, so `@name-atlas/seo`'s `sitemapEntries` expresses the
 * same policy as SQL. That is **two implementations of one policy**, which is a
 * risk this suite exists to hold down rather than accept: a page listed in a
 * sitemap while serving `noindex` wastes a crawler's budget and tells it we do
 * not mean what we publish.
 *
 * GENUINE DATA: every surname comes from TASK-004's importer over the committed
 * real PESEL fixtures. Those are excerpts, which is exactly why the expected
 * answer here is an empty sitemap — see the last test.
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

describe("the sitemap lists exactly what the page says is indexable", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
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

    // Claims, so there is something for the policy to weigh.
    const surnames = await sql<{ canonical_display: string }>`
      SELECT canonical_display FROM surnames ORDER BY canonical_display
    `.execute(db());
    for (const row of surnames.rows) {
      await deriveCurrentPopulation(db(), row.canonical_display);
    }
    await backfillSlugs(db());
  }, 300_000);

  afterAll(async () => {
    await database?.stop();
  });

  /** Every surname's indexability, through the page's own assessment. */
  async function assessEach(): Promise<
    ReadonlyMap<string, { indexability: string; reason_code: string }>
  > {
    const rows = await sql<{ surname_id: string; canonical_display: string }>`
      SELECT surname_id::text, canonical_display FROM surnames ORDER BY surname_id
    `.execute(db());
    const out = new Map<string, { indexability: string; reason_code: string }>();
    for (const row of rows.rows) {
      const outcome = await querySurnameResult(db(), row.canonical_display);
      if (outcome.kind !== "OK") continue;
      const parsed = surnameResultResponseSchema.safeParse(outcome.response);
      if (!parsed.success) continue;
      const gates = await seoGatesFor(db(), row.surname_id);
      const assessment = assessIndexability(parsed.data, {
        // The flag is what a deployment sets; the policy is what is under test,
        // so it is enabled here and asserted separately below.
        enabled: true,
        seoSurfaceAllowed: gates.seoSurfaceAllowed,
        privacyPublic: gates.privacyPublic,
      });
      out.set(row.surname_id, {
        indexability: assessment.indexability,
        reason_code: assessment.reason_code,
      });
    }
    return out;
  }

  it("never lists a surname the page would serve as noindex", async () => {
    const assessments = await assessEach();
    const listed = await sitemapEntries(db(), "pl", { limit: SITEMAP_PAGE_SIZE, offset: 0 });
    const disagreements = listed
      .map((entry) => ({ entry, assessed: assessments.get(entry.surname_id) }))
      .filter((x) => x.assessed?.indexability !== "INDEX")
      .map(
        (x) => `${x.entry.slug}: sitemap lists it, page says ${String(x.assessed?.indexability)}`,
      );
    expect(disagreements).toEqual([]);
  });

  it("never omits a surname the page would serve as index", async () => {
    const assessments = await assessEach();
    const listed = new Set(
      (await sitemapEntries(db(), "pl", { limit: SITEMAP_PAGE_SIZE, offset: 0 })).map(
        (e) => e.surname_id,
      ),
    );
    const missing = [...assessments.entries()]
      .filter(([id, a]) => a.indexability === "INDEX" && !listed.has(id))
      .map(([id]) => `${id}: page says INDEX, sitemap omits it`);
    expect(missing).toEqual([]);
  });

  it("evaluates the SEO surface as ALLOWED for the PESEL profile", async () => {
    // The gate that was hardcoded `false` until TASK-027. If this ever returns
    // false again, no page can be indexed and the two tests above would pass
    // vacuously — so the gate is asserted directly.
    const row = await sql<{ surname_id: string }>`
      SELECT surname_id::text FROM surnames ORDER BY surname_id LIMIT 1
    `.execute(db());
    const id = row.rows[0]?.surname_id;
    if (!id) throw new Error("no surname was imported");
    const gates = await seoGatesFor(db(), id);
    expect(gates).toMatchObject({ seoSurfaceAllowed: true, privacyPublic: true });
    expect(gates.profiles).toBeGreaterThan(0);
  });

  it("lists nothing, because one value family is not two (AC-10)", async () => {
    // The honest state of this repository. `CURRENT_STATS` is available;
    // `GEOGRAPHY` needs the full regional register, `ONOMASTICS` a licensed
    // corpus, `HISTORY` M3. Asserting the *reason* rather than merely the count
    // is what makes this a policy test instead of a coincidence: if a second
    // family ever appears, this fails and tells whoever added it to re-check the
    // sitemap rather than silently starting to publish.
    const assessments = await assessEach();
    expect(assessments.size).toBeGreaterThan(10);
    const reasons = new Set([...assessments.values()].map((a) => a.reason_code));
    expect([...reasons]).toEqual(["SINGLE_VALUE_FAMILY"]);
    expect(await sitemapCount(db(), "pl")).toBe(0);
    expect(await sitemapEntries(db(), "pl", { limit: 10, offset: 0 })).toEqual([]);
  });
});
