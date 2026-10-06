import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  GIVEN_NAMES_FIRST_FEMALE_2026,
  GIVEN_NAMES_FIRST_MALE_2026,
  importGivenNameMeanings,
  importGivenNameResource,
  importOnomasticSource,
  sha256Hex,
} from "@name-atlas/sources";
import { canonicalKey } from "@name-atlas/resolver";
import {
  deriveAllGivenNameMeanings,
  deriveGivenNameMeaning,
  loadInterpretations,
} from "@name-atlas/truth";

/**
 * TASK-147: first-name origins and meanings against a real PostgreSQL. GENUINE
 * data only: the committed first-name excerpts (`fixtures/pesel-given-names/`),
 * Buryan's surname file, and the two committed first-name meaning files.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => new Uint8Array(readFileSync(path.join(repoRoot, p)));
const json = (p: string): unknown =>
  JSON.parse(readFileSync(path.join(repoRoot, p)).toString("utf8"));
const BURYAN = "sources/given-name-meanings/buryan-1933.json";
const YONGE = "sources/given-name-meanings/yonge-1884.json";

describe("first-name meanings (TASK-147)", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };
  /** The name's active meaning claim: its confidence and the origin each work states. */
  async function claimOf(name: string) {
    const rows = await sql<{
      claim_id: string;
      status: string;
      scope: string;
      epistemic_type: string;
      origins: string[];
      citations: string;
      evidence: string;
    }>`
      SELECT c.claim_id::text, ca.status::text, c.scope::text, c.epistemic_type::text,
             (SELECT array_agg(i->'origin'->>'code' ORDER BY ord)
                FROM jsonb_array_elements(c.structured_value->'interpretations')
                     WITH ORDINALITY AS t(i, ord)) AS origins,
             (SELECT count(*) FROM citations cit WHERE cit.claim_id = c.claim_id)::text AS citations,
             (SELECT count(*) FROM claim_evidence ce WHERE ce.claim_id = c.claim_id)::text AS evidence
        FROM claims c
        JOIN given_names g ON g.given_name_id = c.subject_entity_id
        JOIN confidence_assessments ca ON ca.claim_id = c.claim_id
       WHERE g.canonical_display = ${name}
         AND c.claim_type::text = 'GIVEN_NAME_MEANING' AND c.claim_status = 'ACTIVE'
    `.execute(db());
    return rows.rows;
  }
  const count = async (q: ReturnType<typeof sql<{ n: string }>>) =>
    Number((await q.execute(db())).rows[0]?.n ?? "0");

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    for (const [resource, file, id] of [
      [GIVEN_NAMES_FIRST_MALE_2026, "first-male-2026-01-20.csv", "1159669"],
      [GIVEN_NAMES_FIRST_FEMALE_2026, "first-female-2026-01-20.csv", "1159670"],
    ] as const) {
      const bytes = read(`fixtures/pesel-given-names/${file}`);
      const imported = await importGivenNameResource(db(), {
        resource,
        bytes,
        expectedSha256: sha256Hex(bytes),
        rawPayload: json(
          `docs/sources/acquisition/2026-10-03/metadata/pesel_given_names_2026_first_${id}.official_resource.json`,
        ),
      });
      if (imported.kind !== "IMPORTED") throw new Error(`import ${id}: ${imported.kind}`);
    }
    const surnames = await importOnomasticSource(db(), {
      bytes: read("sources/onomastics/buryan-1933.json"),
    });
    if (surnames.kind !== "IMPORTED") throw new Error(`Buryan surnames: ${surnames.kind}`);
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("imports both files apart from the work's surname file, once (AC-1)", async () => {
    const surnameKeys = ["ADAMCZYK", "JAN", "TOMASZ", "MAŁGORZATA"].map(canonicalKey);
    const before = await Promise.all(surnameKeys.map((k) => loadInterpretations(db(), k)));
    expect(before[0]?.length).toBeGreaterThan(0);

    const buryan = await importGivenNameMeanings(db(), { bytes: read(BURYAN) });
    const yonge = await importGivenNameMeanings(db(), { bytes: read(YONGE) });
    expect(buryan).toMatchObject({
      kind: "IMPORTED",
      entries: 112,
      supersedes_source_record_id: null,
    });
    expect(yonge).toMatchObject({
      kind: "IMPORTED",
      entries: 86,
      supersedes_source_record_id: null,
    });
    expect((await importGivenNameMeanings(db(), { bytes: read(BURYAN) })).kind).toBe(
      "ALREADY_IMPORTED",
    );

    const records = await sql<{
      source_key: string;
      granularity: string;
      ext: string;
      status: string;
    }>`
      SELECT s.source_key, s.granularity::text, sr.external_record_id AS ext, sr.record_status::text AS status
        FROM source_records sr JOIN sources s ON s.source_id = sr.source_id
       WHERE s.source_type = 'DICTIONARY'
       ORDER BY sr.external_record_id
    `.execute(db());
    expect(records.rows).toEqual([
      {
        source_key: "buryan_1933_skad_pochodzi",
        granularity: "MIXED",
        ext: "buryan_1933_skad_pochodzi:1933",
        status: "ACTIVE",
      },
      {
        source_key: "buryan_1933_skad_pochodzi",
        granularity: "MIXED",
        ext: "buryan_1933_skad_pochodzi:1933:given-names",
        status: "ACTIVE",
      },
      {
        source_key: "yonge_1884_history_of_christian_names",
        granularity: "GIVEN_NAME",
        ext: "yonge_1884_history_of_christian_names:1884:given-names",
        status: "ACTIVE",
      },
    ]);
    // The surname chain reads the same interpretations as before.
    const after = await Promise.all(surnameKeys.map((k) => loadInterpretations(db(), k)));
    expect(after).toEqual(before);
  });

  it("derives one claim per name, assessed by the origins the works state (AC-2)", async () => {
    const tally = await deriveAllGivenNameMeanings(db());
    // The excerpts hold a few dozen names; the files' other names are not on them.
    expect(tally.derived).toBe(tally.names);
    expect(tally.existing + tally.superseded + tally.retracted).toBe(0);
    expect(tally.not_on_lists).toContain("WOJCIECH");

    expect(await claimOf("JAN")).toMatchObject([
      {
        status: "POSSIBLE",
        origins: ["he"],
        citations: "1",
        evidence: "1",
        scope: "SHARED",
        epistemic_type: "INTERPRETATION",
      },
    ]);
    // Yonge 1884 first: the works are in order of publication.
    expect(await claimOf("MAŁGORZATA")).toMatchObject([
      { status: "LIKELY", origins: ["grc", "grc"], citations: "2", evidence: "2" },
    ]);
    expect(await claimOf("TOMASZ")).toMatchObject([
      { status: "CONFLICTING", origins: ["arc", "he"], citations: "2", evidence: "2" },
    ]);
    expect(await claimOf("KRZYSZTOF")).toEqual([]);
    expect(await deriveGivenNameMeaning(db(), "Krzysztof")).toEqual({ kind: "NO_SOURCE" });
    expect(await deriveGivenNameMeaning(db(), "Zzqx")).toEqual({ kind: "NOT_FOUND" });

    const evidence = await sql<{ excerpt: string; locator: string; translation: unknown }>`
      SELECT e.raw_excerpt AS excerpt, e.supporting_locator AS locator,
             e.structured_value->'translation' AS translation
        FROM evidence_items e JOIN claim_evidence ce ON ce.evidence_item_id = e.evidence_item_id
        JOIN claims c ON c.claim_id = ce.claim_id
        JOIN given_names g ON g.given_name_id = c.subject_entity_id
       WHERE g.canonical_display = 'MAŁGORZATA' AND c.claim_type::text = 'GIVEN_NAME_MEANING'
       ORDER BY e.raw_excerpt
    `.execute(db());
    expect(evidence.rows.map((r) => r.excerpt)).toEqual([
      "Malgorzata, f. Pol. Gr. pearl, 121",
      expect.stringMatching(/^Z greckich przyjęły się: .*Małgorzata/u),
    ]);
    expect(evidence.rows[0]?.translation).toEqual({
      language: "pl",
      text: "perła",
      by: "Name Atlas",
    });

    // Deriving again writes nothing.
    const claims = sql<{ n: string }>`SELECT count(*)::text AS n FROM claims`;
    const before = await count(claims);
    const again = await deriveAllGivenNameMeanings(db());
    expect(again).toMatchObject({ derived: 0, existing: tally.names });
    expect(await count(claims)).toBe(before);
  });

  it("keeps a first-name meaning claim at SHARED scope (0044)", async () => {
    const [jan] = await claimOf("JAN");
    await expect(
      sql`UPDATE claims SET scope = 'SURNAME_LEVEL' WHERE claim_id = ${jan?.claim_id}::uuid`.execute(
        db(),
      ),
    ).rejects.toThrow(/claims_given_name_meaning_scope/);
  });

  it("follows a new version of a file: a changed name is superseded, a dropped one retracted", async () => {
    const file = json(BURYAN) as { entries: { given_name: string }[] };
    const without = new Set(["MAŁGORZATA", "JAN"]);
    const edited = { ...file, entries: file.entries.filter((e) => !without.has(e.given_name)) };
    const imported = await importGivenNameMeanings(db(), {
      bytes: new TextEncoder().encode(JSON.stringify(edited)),
    });
    expect(imported).toMatchObject({ kind: "IMPORTED", entries: 110 });
    expect(imported.kind === "IMPORTED" && imported.supersedes_source_record_id).toBeTruthy();

    const [oldMalgorzata] = await claimOf("MAŁGORZATA");
    const tally = await deriveAllGivenNameMeanings(db());
    // Every Buryan name now rests on the new record, so each is superseded,
    // except JAN, which no file states any more.
    expect(tally.retracted).toBe(1);
    expect(tally.superseded).toBe(tally.derived);

    expect(await claimOf("JAN")).toEqual([]);
    const [malgorzata] = await claimOf("MAŁGORZATA");
    expect(malgorzata).toMatchObject({ status: "POSSIBLE", origins: ["grc"], citations: "1" });
    const lineage = await sql<{ supersedes: string | null; status: string }>`
      SELECT c.supersedes_claim_id::text AS supersedes, old.claim_status::text AS status
        FROM claims c JOIN claims old ON old.claim_id = c.supersedes_claim_id
       WHERE c.claim_id = ${malgorzata?.claim_id}::uuid
    `.execute(db());
    expect(lineage.rows).toEqual([{ supersedes: oldMalgorzata?.claim_id, status: "SUPERSEDED" }]);
    const statuses = await sql<{ status: string }>`
      SELECT c.claim_status::text AS status FROM claims c
        JOIN given_names g ON g.given_name_id = c.subject_entity_id
       WHERE g.canonical_display = 'JAN' AND c.claim_type::text = 'GIVEN_NAME_MEANING'
    `.execute(db());
    expect(statuses.rows).toEqual([{ status: "RETRACTED" }]);
  });
});
