import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { uuidv7 } from "@name-atlas/domain";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  ensureWikidataSource,
  fetchWikidataBearers,
  importPeselResource,
  PESEL_NATIONAL_MALE_2026,
  sha256Hex,
  storeWikidataBearers,
  summariseWikidataBearers,
  WIKIDATA_SOURCE_KEY,
  WikidataPacer,
  WikidataRequestError,
} from "@name-atlas/sources";
import type {
  FetchedWikidataBearers,
  WikidataBatchOutcome,
  WikidataFetchDeps,
} from "@name-atlas/sources";
import {
  deriveNotableBearers,
  loadBearersInBatches,
  notableBearersClaimKey,
  querySurnameResult,
  selectBearersCandidates,
} from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * TASK-073: the `NOTABLE_BEARERS` chain against a real PostgreSQL — Wikidata's
 * answer stored as a source record, the claim derived from it, and the bearers
 * section read back through the surname result on each surface.
 *
 * GENUINE WIKIDATA ANSWERS, ANOTHER SURNAME. The answers are ZAREMBA's, as the
 * query service served them on 2026-10-03 (`fixtures/wikidata-bearers/`).
 * ZAREMBA is not in the committed PESEL fixture, so the fake network below
 * answers NOWAK's queries with them, "Zaremba" written as "Nowak" in the names
 * so the exact-surname test keeps the same 59 people. Nothing here asserts
 * whom Wikidata names NOWAK: the figures prove the chain carries what it was
 * given.
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
const WIKIDATA_DIR = path.join(repoRoot, "fixtures/wikidata-bearers/responses");
const ZAREMBA_BEARERS = readFileSync(path.join(WIKIDATA_DIR, "ZAREMBA.bearers.json"), "utf8");
const ZAREMBA_DETAILS = readFileSync(path.join(WIKIDATA_DIR, "ZAREMBA.details.json"), "utf8");

/** A network that answers both queries with ZAREMBA's answers, and a clock that only moves on sleep. */
function servedAs(edit: (body: string) => string = (b) => b): {
  deps: WikidataFetchDeps;
  pacer: WikidataPacer;
} {
  // Starts at the real time: the retrieval date it stamps decides the refresh window.
  let clock = Date.now();
  const deps: WikidataFetchDeps = {
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    fetch: async (url) => {
      const query = new URL(url).searchParams.get("query") ?? "";
      const body = query.includes("schema:description")
        ? ZAREMBA_DETAILS
        : edit(ZAREMBA_BEARERS.replaceAll(" Zaremba", " Nowak"));
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => body };
    },
  };
  return { deps, pacer: new WikidataPacer(deps) };
}

async function fetchAs(edit?: (body: string) => string): Promise<FetchedWikidataBearers> {
  const { deps, pacer } = servedAs(edit);
  return fetchWikidataBearers("NOWAK", pacer, deps);
}

describe("NOTABLE_BEARERS against a real PostgreSQL", () => {
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

  /** A bare `CURRENT_RANK` claim, as `archive-availability.test.ts` gives one. */
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

  async function storeAndDerive(edit?: (body: string) => string): Promise<string> {
    const sourceId = await ensureWikidataSource(db());
    const surnameId = await surnameIdOf("NOWAK");
    await storeWikidataBearers(db(), { sourceId, surnameId, fetched: await fetchAs(edit) });
    await deriveNotableBearers(db(), surnameId);
    return surnameId;
  }

  async function bearersOn(surface: "FREE" | "PAID" | "SEO" | "INTERNAL") {
    const outcome = await querySurnameResult(db(), "NOWAK", { surface });
    if (outcome.kind !== "OK") throw new Error("expected OK");
    return surnameResultResponseSchema.parse(outcome.response).bearers;
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

  it("says a surname not yet looked up is not looked up, never zero", async () => {
    const bearers = await bearersOn("FREE");
    expect(bearers?.state).toBe("NOT_SEARCHED");
    expect(bearers?.reason_code).toBe("BEARERS_NOT_SEARCHED");
    expect(bearers?.total).toBeNull();
    expect(bearers?.people).toEqual([]);
  });

  it("registers Wikidata once, as the source catalogue classifies it (CC0)", async () => {
    const first = await ensureWikidataSource(db());
    const second = await ensureWikidataSource(db());
    expect(second).toBe(first);
    expect(await count("sources", `source_key = '${WIKIDATA_SOURCE_KEY}'`)).toBe(1);
    const rights = await sql<{ commercial_use: string; terms_version: string }>`
      SELECT rp.commercial_use::text AS commercial_use, rp.terms_version
        FROM sources s JOIN rights_profiles rp ON rp.rights_profile_id = s.default_rights_profile_id
       WHERE s.source_key = ${WIKIDATA_SOURCE_KEY}
    `.execute(db());
    expect(rights.rows[0]).toEqual({ commercial_use: "ALLOWED", terms_version: "CC0" });
  });

  it("stores the answer, derives one claim, and lists three people on the free page", async () => {
    const surnameId = await storeAndDerive();
    expect(
      await count(
        "claims",
        `claim_type = 'NOTABLE_BEARERS' AND claim_status = 'ACTIVE' AND claim_key = '${notableBearersClaimKey(surnameId)}'`,
      ),
    ).toBe(1);

    const free = await bearersOn("FREE");
    expect(free?.state).toBe("READY");
    // ZAREMBA's served people, carried unchanged.
    expect(free?.total).toBe(59);
    expect(free?.with_death_date).toBe(37);
    expect(free?.people).toHaveLength(3);
    expect(free?.more).toBe(56);
    expect(free?.people[0]).toMatchObject({
      wikidata_id: "Q896660",
      name: "Stanisław Nowak",
      born: 1863,
      died: 1942,
      description_pl: "polski matematyk, profesor UJ",
      wikidata_url: "https://www.wikidata.org/wiki/Q896660",
    });
    expect(free?.confidence?.status).toBe("VERIFIED");
    expect(free?.citation?.title).toBe("Wikidata");
    expect(free?.citation?.url).toMatch(/^https:\/\/query\.wikidata\.org\/#/u);
    expect(free?.searched_on).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it("lists everyone the claim keeps on the paid surface, and three to search engines", async () => {
    await storeAndDerive();
    const paid = await bearersOn("PAID");
    expect(paid?.people).toHaveLength(20);
    expect(paid?.more).toBe(39);
    const seo = await bearersOn("SEO");
    expect(seo?.people).toHaveLength(3);
  });

  it("adds nothing when Wikidata says the same again, and supersedes when it changes", async () => {
    const sourceId = await ensureWikidataSource(db());
    const surnameId = await surnameIdOf("NOWAK");
    const first = await storeWikidataBearers(db(), {
      sourceId,
      surnameId,
      fetched: await fetchAs(),
    });
    await deriveNotableBearers(db(), surnameId);
    const again = await storeWikidataBearers(db(), {
      sourceId,
      surnameId,
      fetched: await fetchAs(),
    });
    expect(again).toEqual({ status: "UNCHANGED", source_record_id: first.source_record_id });
    expect((await deriveNotableBearers(db(), surnameId)).status).toBe("UNCHANGED");
    expect(await count("claims", "claim_type = 'NOTABLE_BEARERS'")).toBe(1);

    // A year of death corrected in Wikidata: a new record, and a new claim over the old one.
    const changed = await storeWikidataBearers(db(), {
      sourceId,
      surnameId,
      fetched: await fetchAs((body) => {
        const at = body.indexOf('"value" : "1942"', body.indexOf("entity/Q896660"));
        return `${body.slice(0, at)}"value" : "1943"${body.slice(at + 16)}`;
      }),
    });
    expect(changed.status).toBe("STORED");
    expect(await count("source_records", "record_status = 'UPDATED'")).toBe(1);
    expect((await deriveNotableBearers(db(), surnameId)).status).toBe("DERIVED");
    expect(
      await count(
        "claims",
        "claim_type = 'NOTABLE_BEARERS' AND claim_status = 'ACTIVE' AND supersedes_claim_id IS NOT NULL",
      ),
    ).toBe(1);
    expect((await bearersOn("FREE"))?.people[0]?.died).toBe(1943);
  });

  it("refuses the section, people and all, when the source's rights are blocked", async () => {
    await storeAndDerive();
    await sql`
      UPDATE rights_profiles rp SET review_status = 'BLOCKED'
        FROM sources src
       WHERE src.default_rights_profile_id = rp.rights_profile_id
         AND src.source_key = ${WIKIDATA_SOURCE_KEY}
    `.execute(db());
    const bearers = await bearersOn("FREE");
    expect(bearers?.state).toBe("RIGHTS_BLOCKED");
    expect(bearers?.total).toBeNull();
    expect(bearers?.people).toEqual([]);
    expect(JSON.stringify(bearers)).not.toContain("wikidata.org/wiki/Q");
  });

  it("loads a selection in batches, stores and derives each surname as one, and leaves a failure for the next run", async () => {
    // TASK-140 (ADR-0044). The batch fetcher is replaced by one that answers
    // each surname with ZAREMBA's real answers, renamed, and fails WIŚNIEWSKI.
    await giveRank("NOWAK", 1, "male");
    await giveRank("KOWALSKI", 2, "male");
    await giveRank("WIŚNIEWSKI", 3, "male");
    const candidates = await selectBearersCandidates(db(), { topRank: 2000, refreshDays: 30 });
    const asked: string[][] = [];
    const fetchBatch = (surnames: readonly string[]): Promise<readonly WikidataBatchOutcome[]> => {
      asked.push([...surnames]);
      return Promise.resolve(
        surnames.map((surname): WikidataBatchOutcome => {
          if (surname === "WIŚNIEWSKI") {
            return {
              surname,
              error: new WikidataRequestError("bearers", 503, "bearers: HTTP 503"),
            };
          }
          const name = surname.charAt(0) + surname.slice(1).toLowerCase();
          return {
            surname,
            fetched: {
              bearers: summariseWikidataBearers(
                surname,
                ZAREMBA_BEARERS.replaceAll(" Zaremba", ` ${name}`),
                ZAREMBA_DETAILS,
              ),
              retrieved_at: new Date().toISOString(),
              response_sha256: { bearers_batch: "x", details_batch: "y" },
            },
          };
        }),
      );
    };
    const { tally, stopped } = await loadBearersInBatches(db(), {
      sourceId: await ensureWikidataSource(db()),
      candidates,
      fetchBatch,
      sizeFor: () => 2,
    });
    expect(stopped).toBe(false);
    expect(asked).toEqual([["NOWAK", "KOWALSKI"], ["WIŚNIEWSKI"]]);
    expect(tally).toEqual({ stored: 2, unchanged: 0, derived: 2, failed: 1 });
    expect(
      await count("claims", "claim_type = 'NOTABLE_BEARERS' AND claim_status = 'ACTIVE'"),
    ).toBe(2);
    const bearers = await bearersOn("FREE");
    expect(bearers?.state).toBe("READY");
    expect(bearers?.total).toBe(59);

    // The failure is the next run's; the two loaded are not asked again.
    const rest = await selectBearersCandidates(db(), { topRank: 2000, refreshDays: 30 });
    expect(rest.map((c) => c.display_name)).toEqual(["WIŚNIEWSKI"]);

    // Asked again with the same answers, nothing changes.
    const again = await loadBearersInBatches(db(), {
      sourceId: await ensureWikidataSource(db()),
      candidates,
      fetchBatch,
      sizeFor: () => 2,
    });
    expect(again.tally).toEqual({ stored: 0, unchanged: 2, derived: 0, failed: 1 });
  });

  it("picks the best-ranked surnames first, and skips one looked up within the refresh window", async () => {
    await giveRank("NOWAK", 1, "male");
    await giveRank("KOWALSKI", 2, "male");
    await giveRank("WIŚNIEWSKI", 3, "male");
    await giveRank("WÓJCIK", 2500, "male");

    const all = await selectBearersCandidates(db(), { topRank: 2000, refreshDays: 30 });
    expect(all.map((c) => c.display_name)).toEqual(["NOWAK", "KOWALSKI", "WIŚNIEWSKI"]);

    await storeAndDerive();
    const rest = await selectBearersCandidates(db(), { topRank: 2000, refreshDays: 30 });
    expect(rest.map((c) => c.display_name)).toEqual(["KOWALSKI", "WIŚNIEWSKI"]);

    await sql`
      UPDATE source_records SET retrieved_at = now() - interval '31 days'
       WHERE external_record_id LIKE 'wikidata-bearers:%'
    `.execute(db());
    const due = await selectBearersCandidates(db(), { topRank: 2000, refreshDays: 30 });
    expect(due.map((c) => c.display_name)).toEqual(["NOWAK", "KOWALSKI", "WIŚNIEWSKI"]);
  });
});
