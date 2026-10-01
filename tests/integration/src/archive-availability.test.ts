import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { uuidv7 } from "@name-atlas/domain";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  ensurePolonaSource,
  fetchPolonaInventory,
  importPeselResource,
  PESEL_NATIONAL_MALE_2026,
  POLONA_SOURCE_KEY,
  PolonaPacer,
  polonaInventoryRequests,
  sha256Hex,
  storePolonaInventory,
} from "@name-atlas/sources";
import type { FetchedPolonaInventory, PolonaFetchDeps } from "@name-atlas/sources";
import {
  archiveAvailabilityClaimKey,
  deriveArchiveAvailability,
  querySurnameResult,
  selectArchiveCandidates,
} from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * TASK-054: the `ARCHIVE_AVAILABILITY` chain against a real PostgreSQL —
 * Polona's inventory stored as a source record, the claim derived from it, and
 * the archive section read back through the surname result.
 *
 * GENUINE POLONA RESPONSES, ANOTHER SURNAME. The responses are ZAREMBA's, as
 * Polona served them on 2026-10-01 (`fixtures/polona-inventory/`). ZAREMBA is
 * not in the committed PESEL fixture, so the fake network below answers NOWAK's
 * requests with them, request by request. Nothing here asserts what Polona
 * holds for NOWAK: the figures prove the chain carries what it was given.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readBytes = (p: string): Uint8Array => readFileSync(path.join(repoRoot, p));
const MALE_BYTES = readBytes("fixtures/pesel/national-male-2026-01-20.csv");
const MALE_PAYLOAD: unknown = JSON.parse(
  readFileSync(
    path.join(
      repoRoot,
      "docs/sources/acquisition/2026-09-18/metadata",
      "pesel_national_2026_male_1148808.official_resource.json",
    ),
    "utf8",
  ),
);
const POLONA_DIR = path.join(repoRoot, "fixtures/polona-inventory");
const manifest = JSON.parse(
  readFileSync(path.join(POLONA_DIR, "source-manifest.json"), "utf8"),
) as { files: { request: string; path: string }[] };
const ZAREMBA: Record<string, string> = Object.fromEntries(
  manifest.files.map((f) => [f.request, readFileSync(path.join(POLONA_DIR, f.path), "utf8")]),
);

/** A network that answers `surname`'s requests with ZAREMBA's responses, and a clock that only moves on sleep. */
function servedAs(surname: string, edit: (name: string, body: string) => string = (_, b) => b) {
  const byUrlAndBody = new Map(
    polonaInventoryRequests(surname).map((r) => [`${r.url}\n${r.body}`, r.name]),
  );
  // Starts at the real time: the retrieval date it stamps decides the refresh window.
  let clock = Date.now();
  const deps: PolonaFetchDeps = {
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    fetch: async (url, init) => {
      const name = byUrlAndBody.get(`${url}\n${init.body}`);
      if (name === undefined) throw new Error(`unexpected request ${url}`);
      const text = edit(name, ZAREMBA[name] ?? "");
      return { ok: true, status: 200, text: async () => text };
    },
  };
  return { deps, pacer: new PolonaPacer(deps) };
}

async function fetchAs(
  surname: string,
  edit?: (name: string, body: string) => string,
): Promise<FetchedPolonaInventory> {
  const { deps, pacer } = servedAs(surname, edit);
  return fetchPolonaInventory(surname, pacer, deps);
}

describe("ARCHIVE_AVAILABILITY against a real PostgreSQL", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  async function count(table: string, where = "TRUE"): Promise<number> {
    const r = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM ${sql.table(table)} WHERE ${sql.raw(where)}
    `.execute(db());
    return Number(r.rows[0]?.n ?? "0");
  }

  async function surnameIdOf(display: string): Promise<string> {
    const r = await sql<{ surname_id: string }>`
      SELECT surname_id::text FROM surnames WHERE canonical_display = ${display}
    `.execute(db());
    const id = r.rows[0]?.surname_id;
    if (!id) throw new Error(`${display} is not in the imported fixture`);
    return id;
  }

  /**
   * A bare `CURRENT_RANK` claim. The committed fixture is too small for the
   * rank derivation, which refuses an incomplete universe (TASK-009), so the
   * candidate query is given ranks directly. Only `rank` is read by it.
   */
  async function giveRank(display: string, rank: number, list: string): Promise<void> {
    const surnameId = await surnameIdOf(display);
    const runId = uuidv7();
    await sql`
      INSERT INTO research_runs (
        research_run_id, run_type, surname_id, raw_input, input_schema_version,
        workflow_version, connector_manifest, prompt_manifest, model_manifest,
        normalization_version, run_status, qa_status, started_at
      ) VALUES (
        ${runId}, 'BASIC_SURNAME', ${surnameId}, '{}', 'test', 'test', '{}', '{}', '{}',
        'test', 'COMPLETE', 'NOT_RUN', now()
      )
    `.execute(db());
    await sql`
      INSERT INTO claims (
        claim_id, claim_key, claim_type, epistemic_type, scope, subject_entity_id,
        structured_value, claim_status, created_by_run_id, method_version
      ) VALUES (
        ${uuidv7()}, ${`CURRENT_RANK|${list}|${surnameId}`}, 'CURRENT_RANK', 'FACT',
        'SURNAME_LEVEL', ${surnameId}, ${JSON.stringify({ rank })}, 'ACTIVE', ${runId}, 'test'
      )
    `.execute(db());
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  beforeEach(async () => {
    for (const table of [
      "evidence_dependencies",
      "citations",
      "confidence_assessments",
      "claim_evidence",
      "claims",
      "evidence_items",
      "research_runs",
      "distribution_values",
      "distribution_snapshots",
      "source_records",
      "sources",
      "rights_profiles",
      "name_forms",
      "surnames",
      "knowledge_entities",
    ]) {
      await sql`DELETE FROM ${sql.table(table)}`.execute(db());
    }
    const outcome = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: MALE_BYTES,
      expectedSha256: sha256Hex(MALE_BYTES),
      rawPayload: MALE_PAYLOAD,
    });
    if (outcome.kind !== "IMPORTED") {
      throw new Error(`fixture import did not succeed: ${outcome.kind}`);
    }
  });

  it("says a surname not yet searched is not searched, never zero", async () => {
    const outcome = await querySurnameResult(db(), "NOWAK", { surface: "FREE" });
    if (outcome.kind !== "OK") throw new Error("expected OK");
    const parsed = surnameResultResponseSchema.parse(outcome.response);
    expect(parsed.schema_version).toBe("1.8");
    expect(parsed.archive?.state).toBe("NOT_SEARCHED");
    expect(parsed.archive?.reason_code).toBe("ARCHIVE_NOT_SEARCHED");
    expect(parsed.archive?.pages).toBeNull();
  });

  it("registers Polona once, with the owner's rights decision as its default", async () => {
    const first = await ensurePolonaSource(db());
    const second = await ensurePolonaSource(db());
    expect(second).toBe(first);
    expect(await count("sources", `source_key = '${POLONA_SOURCE_KEY}'`)).toBe(1);
    const rights = await sql<{ automated_access: string; attribution_text: string }>`
      SELECT rp.automated_access::text AS automated_access, rp.attribution_text
        FROM sources s JOIN rights_profiles rp ON rp.rights_profile_id = s.default_rights_profile_id
       WHERE s.source_key = ${POLONA_SOURCE_KEY}
    `.execute(db());
    expect(rights.rows[0]).toEqual({
      automated_access: "ALLOWED",
      attribution_text: "Polona, Biblioteka Narodowa",
    });
  });

  it("stores the inventory, derives one claim, and serves it as a READY section", async () => {
    const sourceId = await ensurePolonaSource(db());
    const surnameId = await surnameIdOf("NOWAK");
    const fetched = await fetchAs("NOWAK");

    const stored = await storePolonaInventory(db(), { sourceId, surnameId, fetched });
    expect(stored.status).toBe("STORED");
    const derived = await deriveArchiveAvailability(db(), surnameId);
    expect(derived.status).toBe("DERIVED");
    expect(
      await count(
        "claims",
        `claim_type = 'ARCHIVE_AVAILABILITY' AND claim_status = 'ACTIVE' AND claim_key = '${archiveAvailabilityClaimKey(surnameId)}'`,
      ),
    ).toBe(1);

    const outcome = await querySurnameResult(db(), "NOWAK", { surface: "FREE" });
    if (outcome.kind !== "OK") throw new Error("expected OK");
    const archive = surnameResultResponseSchema.parse(outcome.response).archive;
    expect(archive?.state).toBe("READY");
    expect(archive?.query).toBe('"NOWAK"');
    // ZAREMBA's served totals, carried unchanged.
    expect(archive?.catalogue_records).toBe(1148);
    expect(archive?.pages).toBe(54479);
    expect(archive?.pages_by_period.map((p) => p.count)).toEqual([
      121, 2814, 13843, 9484, 20256, 7868,
    ]);
    expect(archive?.examples.length).toBeGreaterThan(0);
    for (const e of archive?.examples ?? []) {
      expect(e.url).toMatch(/^https:\/\/polona\.pl\/item-view\/[0-9a-f-]+\?page=\d+$/u);
      expect(e.excerpt.length).toBeLessThanOrEqual(300);
    }
    expect(archive?.confidence?.status).toBe("VERIFIED");
    expect(archive?.citation?.attribution).toBe("Polona, Biblioteka Narodowa");
    expect(archive?.citation?.source_page_url).toBe("https://polona.pl/");
    expect(archive?.searched_on).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it("adds nothing when Polona says the same again, and supersedes when it changes", async () => {
    const sourceId = await ensurePolonaSource(db());
    const surnameId = await surnameIdOf("NOWAK");

    const first = await storePolonaInventory(db(), {
      sourceId,
      surnameId,
      fetched: await fetchAs("NOWAK"),
    });
    await deriveArchiveAvailability(db(), surnameId);
    const again = await storePolonaInventory(db(), {
      sourceId,
      surnameId,
      fetched: await fetchAs("NOWAK"),
    });
    expect(again).toEqual({ status: "UNCHANGED", source_record_id: first.source_record_id });
    expect((await deriveArchiveAvailability(db(), surnameId)).status).toBe("UNCHANGED");
    expect(await count("claims", "claim_type = 'ARCHIVE_AVAILABILITY'")).toBe(1);

    // One more page found: a new record, and a new claim over the old one.
    const changed = await storePolonaInventory(db(), {
      sourceId,
      surnameId,
      fetched: await fetchAs("NOWAK", (name, body) =>
        name === "pages" ? body.replace('"totalElements":54479', '"totalElements":54480') : body,
      ),
    });
    expect(changed.status).toBe("STORED");
    expect(await count("source_records", "record_status = 'UPDATED'")).toBe(1);
    expect((await deriveArchiveAvailability(db(), surnameId)).status).toBe("DERIVED");
    expect(await count("claims", "claim_type = 'ARCHIVE_AVAILABILITY'")).toBe(2);
    expect(
      await count(
        "claims",
        "claim_type = 'ARCHIVE_AVAILABILITY' AND claim_status = 'ACTIVE' AND supersedes_claim_id IS NOT NULL",
      ),
    ).toBe(1);

    const outcome = await querySurnameResult(db(), "NOWAK", { surface: "FREE" });
    if (outcome.kind !== "OK") throw new Error("expected OK");
    expect(outcome.response.archive?.pages).toBe(54480);
  });

  it("refuses the section, figures and all, when the source's rights are blocked", async () => {
    const sourceId = await ensurePolonaSource(db());
    const surnameId = await surnameIdOf("NOWAK");
    await storePolonaInventory(db(), { sourceId, surnameId, fetched: await fetchAs("NOWAK") });
    await deriveArchiveAvailability(db(), surnameId);
    await sql`
      UPDATE rights_profiles rp SET review_status = 'BLOCKED'
        FROM sources src
       WHERE src.default_rights_profile_id = rp.rights_profile_id
         AND src.source_key = ${POLONA_SOURCE_KEY}
    `.execute(db());

    const outcome = await querySurnameResult(db(), "NOWAK", { surface: "FREE" });
    if (outcome.kind !== "OK") throw new Error("expected OK");
    const archive = surnameResultResponseSchema.parse(outcome.response).archive;
    expect(archive?.state).toBe("RIGHTS_BLOCKED");
    expect(archive?.pages).toBeNull();
    expect(archive?.examples).toEqual([]);
    expect(JSON.stringify(archive)).not.toContain("polona.pl/item-view");
  });

  it("picks the best-ranked surnames first, and skips one searched within the refresh window", async () => {
    await giveRank("NOWAK", 1, "male");
    await giveRank("KOWALSKI", 2, "male");
    await giveRank("WIŚNIEWSKI", 3, "male");
    await giveRank("WIŚNIEWSKI", 900, "female");
    await giveRank("WÓJCIK", 2500, "male");

    const all = await selectArchiveCandidates(db(), { topRank: 2000, refreshDays: 90 });
    expect(all.map((c) => [c.display_name, c.best_rank])).toEqual([
      ["NOWAK", 1],
      ["KOWALSKI", 2],
      ["WIŚNIEWSKI", 3],
    ]);
    expect(
      await selectArchiveCandidates(db(), { topRank: 2000, refreshDays: 90, limit: 1 }),
    ).toHaveLength(1);

    const sourceId = await ensurePolonaSource(db());
    await storePolonaInventory(db(), {
      sourceId,
      surnameId: await surnameIdOf("NOWAK"),
      fetched: await fetchAs("NOWAK"),
    });
    const rest = await selectArchiveCandidates(db(), { topRank: 2000, refreshDays: 90 });
    expect(rest.map((c) => c.display_name)).toEqual(["KOWALSKI", "WIŚNIEWSKI"]);

    // Past the window, it is due again.
    await sql`
      UPDATE source_records SET retrieved_at = now() - interval '91 days'
       WHERE external_record_id LIKE 'polona-inventory:%'
    `.execute(db());
    const due = await selectArchiveCandidates(db(), { topRank: 2000, refreshDays: 90 });
    expect(due.map((c) => c.display_name)).toEqual(["NOWAK", "KOWALSKI", "WIŚNIEWSKI"]);
  });
});
