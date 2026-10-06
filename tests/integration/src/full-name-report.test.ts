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
  importPeselResource,
  PESEL_NATIONAL_MALE_2026,
  sha256Hex,
} from "@name-atlas/sources";
import {
  buildFullNameReport,
  buildReport,
  deriveAllGivenNameMeanings,
  deriveCurrentPopulation,
  deriveGivenName,
  FULL_NAME_SECTION_TYPES,
  parseGivenNameFacts,
  readReportVersion,
  REPORT_SECTION_TYPES,
} from "@name-atlas/truth";
import type { ReportSection } from "@name-atlas/truth";

/**
 * TASK-124: the full-name report against a real PostgreSQL. GENUINE names and
 * counts: the committed PESEL national male surname excerpt and the two
 * first-name excerpts (`fixtures/pesel-given-names/`).
 *
 * The excerpts are not complete lists, so no first-name rank claim stands
 * (TASK-122) and every list's rank is reported missing, never zero.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => new Uint8Array(readFileSync(path.join(repoRoot, p)));
const json = (p: string): unknown =>
  JSON.parse(readFileSync(path.join(repoRoot, p)).toString("utf8"));

describe("the full-name report (TASK-124)", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };
  async function n(query: ReturnType<typeof sql<{ n: string }>>): Promise<number> {
    return Number((await query.execute(db())).rows[0]?.n ?? "0");
  }
  const section = (sections: readonly ReportSection[], type: string) =>
    sections.find((x) => x.section_type === type);

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    const male = read("fixtures/pesel/national-male-2026-01-20.csv");
    const surnames = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: male,
      expectedSha256: sha256Hex(male),
      rawPayload: json(
        "docs/sources/acquisition/2026-09-18/metadata/pesel_national_2026_male_1148808.official_resource.json",
      ),
    });
    if (surnames.kind !== "IMPORTED") throw new Error(`PESEL import: ${surnames.kind}`);
    await deriveCurrentPopulation(db(), "NOWAK");
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
    await deriveGivenName(db(), "JAN");
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("puts the first name's chapter before the surname's nine, each list apart (AC-1)", async () => {
    const built = await buildFullNameReport(db(), { givenName: "Jan", surname: "nowak" });
    if (built.kind !== "BUILT") throw new Error(built.kind);
    expect(built.version_number).toBe(1);
    expect(built.sections.map((s) => s.section_type)).toEqual([...FULL_NAME_SECTION_TYPES]);
    expect(built.sections.slice(1).map((s) => s.section_type)).toEqual([...REPORT_SECTION_TYPES]);

    const given = section(built.sections, "GIVEN_NAME");
    expect(given?.body_payload).toEqual({
      state: "READY",
      lists: [
        {
          comparability_group: "pesel_given_names_2026_first_female",
          snapshot_date: "2026-01-20",
          rank: "NO_ACTIVE_CLAIM",
        },
        {
          comparability_group: "pesel_given_names_2026_first_male",
          snapshot_date: "2026-01-20",
          rank: "NO_ACTIVE_CLAIM",
        },
      ],
      meaning: { state: "NO_SOURCE" },
    });
    expect(given?.claims.map((c) => c.presentation_role)).toEqual(["HERO", "HERO"]);
    expect(given?.section_confidence_summary).toEqual({ VERIFIED: 2 });

    // The first name's two citations lead the bibliography.
    const ids = (section(built.sections, "SOURCES")?.body_payload as { citation_ids: string[] })
      .citation_ids;
    const cited = await sql<{ id: string }>`
      SELECT cit.citation_id::text AS id FROM citations cit
        JOIN claims c ON c.claim_id = cit.claim_id
       WHERE c.claim_type::text = 'GIVEN_NAME_POPULATION'
         AND c.claim_id = ANY(${given?.claims.map((c) => c.claim_id) ?? []}::uuid[])
    `.execute(db());
    expect(new Set(ids.slice(0, 2))).toEqual(new Set(cited.rows.map((r) => r.id)));
    expect(ids.length).toBeGreaterThan(2);

    expect(section(built.sections, "LIMITATIONS")?.body_payload).toMatchObject({
      given_name: [
        { topic: "MEANING", reason_code: "NO_ADMISSIBLE_SOURCE" },
        { topic: "FULL_NAME_COUNT", reason_code: "NO_SOURCE_PAIRS_NAMES" },
        {
          topic: "RANK",
          comparability_group: "pesel_given_names_2026_first_female",
          reason_code: "NO_ACTIVE_CLAIM",
        },
        {
          topic: "RANK",
          comparability_group: "pesel_given_names_2026_first_male",
          reason_code: "NO_ACTIVE_CLAIM",
        },
      ],
    });
  });

  it("freezes the publisher's counts per list and no figure for the two names together (AC-2)", async () => {
    const stored = await sql<{ report_type: string; given: string; payload: unknown }>`
      SELECT r.report_type, gn.canonical_display AS given, v.rendered_payload AS payload
        FROM report_versions v
        JOIN reports r ON r.report_id = v.report_id
        JOIN given_names gn ON gn.given_name_id = r.given_name_id
       WHERE v.version_number = 1
    `.execute(db());
    expect(stored.rows.map((r) => [r.report_type, r.given])).toEqual([["FULL_NAME", "JAN"]]);
    const payload = stored.rows[0]?.payload as Record<string, unknown>;
    expect(payload["report_schema_version"]).toBe("full_name_report@1");
    expect(
      (payload["response"] as { surname: { display_name: string } }).surname.display_name,
    ).toBe("NOWAK");
    const facts = parseGivenNameFacts(payload["given_name"]);
    expect(Object.keys(payload["given_name"] as object).sort()).toEqual([
      "given_name",
      "lists",
      "meaning",
      "state",
    ]);
    expect(facts?.meaning).toEqual({ state: "NO_SOURCE" });
    expect(facts?.given_name.display_name).toBe("JAN");
    expect(facts?.lists.map((l) => [l.comparability_group, l.count.count, l.rank])).toEqual([
      ["pesel_given_names_2026_first_female", 14, null],
      ["pesel_given_names_2026_first_male", 462503, null],
    ]);
    expect(facts?.lists.map((l) => l.count.citation.locator)).toEqual([
      "resource:1159670",
      "resource:1159669",
    ]);
  });

  it("is a report of its own: rebuilt as version 2, apart from the surname's report (AC-3)", async () => {
    const again = await buildFullNameReport(db(), { givenName: "JAN", surname: "NOWAK" });
    if (again.kind !== "BUILT") throw new Error(again.kind);
    expect(again.version_number).toBe(2);
    const surnameOnly = await buildReport(db(), "NOWAK");
    if (surnameOnly.kind !== "BUILT") throw new Error(surnameOnly.kind);
    expect(surnameOnly.version_number).toBe(1);
    expect(surnameOnly.report_id).not.toBe(again.report_id);
    expect(surnameOnly.sections.map((s) => s.section_type)).toEqual([...REPORT_SECTION_TYPES]);

    const read = await readReportVersion(db(), again.report_version_id);
    expect(read?.report_type).toBe("FULL_NAME");
    expect(read?.report_schema_version).toBe("full_name_report@1");
    expect(read?.sections.map((s) => s.section_type)).toEqual([...FULL_NAME_SECTION_TYPES]);
    expect((await readReportVersion(db(), surnameOnly.report_version_id))?.report_type).toBe(
      "NAME_ATLAS",
    );

    const insert = (type: string, givenName: "JAN" | null) => sql`
      INSERT INTO reports (report_id, surname_id, given_name_id, report_type, entitlement_kind, status)
      SELECT gen_random_uuid(), s.surname_id,
             (SELECT given_name_id FROM given_names WHERE canonical_display = ${givenName}),
             ${type}, 'INTERNAL_TEST', 'READY'
        FROM surnames s WHERE s.canonical_display = 'NOWAK'
    `;
    await expect(insert("FULL_NAME", "JAN").execute(db())).rejects.toThrow(
      /reports_one_per_subject/,
    );
    await expect(insert("NAME_ATLAS", null).execute(db())).rejects.toThrow(
      /reports_one_per_subject/,
    );
    await expect(insert("FULL_NAME", null).execute(db())).rejects.toThrow(
      /reports_given_name_for_full_name/,
    );
    await expect(insert("NAME_ATLAS", "JAN").execute(db())).rejects.toThrow(
      /reports_given_name_for_full_name/,
    );
  });

  it("writes nothing for a placeholder, a form held for review, or an unknown surname (AC-4)", async () => {
    const before = await n(sql`SELECT count(*)::text AS n FROM report_versions`);
    expect(
      (await buildFullNameReport(db(), { givenName: "BRAK DANYCH", surname: "NOWAK" })).kind,
    ).toBe("GIVEN_NAME_NOT_FOUND");
    expect(await buildFullNameReport(db(), { givenName: "MA.", surname: "NOWAK" })).toEqual({
      kind: "GIVEN_NAME_UNREVIEWED",
      form_review: "INITIAL_OR_ABBREVIATION",
    });
    expect(
      (await buildFullNameReport(db(), { givenName: "JAN", surname: "ZZZQXWYNOTASURNAME" })).kind,
    ).toBe("NOT_RESOLVED");
    expect(await n(sql`SELECT count(*)::text AS n FROM report_versions`)).toBe(before);
  });

  it("says a name's counts are missing until they are derived, never zero (AC-5)", async () => {
    const bare = await buildFullNameReport(db(), { givenName: "KATARZYNA", surname: "NOWAK" });
    if (bare.kind !== "BUILT") throw new Error(bare.kind);
    expect(section(bare.sections, "GIVEN_NAME")).toMatchObject({
      body_payload: { state: "UNAVAILABLE", lists: [] },
      claims: [],
    });
    expect(section(bare.sections, "LIMITATIONS")?.body_payload).toMatchObject({
      given_name: [
        { topic: "MEANING" },
        { topic: "FULL_NAME_COUNT" },
        { topic: "COUNT", reason_code: "UNAVAILABLE" },
      ],
    });

    await deriveGivenName(db(), "KATARZYNA");
    const derived = await buildFullNameReport(db(), { givenName: "KATARZYNA", surname: "NOWAK" });
    if (derived.kind !== "BUILT") throw new Error(derived.kind);
    expect(derived.version_number).toBe(2);
    expect(section(derived.sections, "GIVEN_NAME")?.body_payload).toMatchObject({
      state: "READY",
      lists: [{ comparability_group: "pesel_given_names_2026_first_female" }],
    });
  });

  it("shows no first-name figure the source's rights forbid, and cites the claims as limits (AC-6)", async () => {
    const profile = sql`
      SELECT DISTINCT cit.rights_profile_id FROM citations cit
        JOIN claims c ON c.claim_id = cit.claim_id
       WHERE c.claim_type::text = 'GIVEN_NAME_POPULATION'
    `;
    const original = await sql<{ commercial_use: string }>`
      SELECT DISTINCT commercial_use::text FROM rights_profiles WHERE rights_profile_id IN (${profile})
    `.execute(db());
    expect(original.rows).toHaveLength(1);
    const was = original.rows[0]?.commercial_use ?? "";
    await sql`UPDATE rights_profiles SET commercial_use = 'UNKNOWN' WHERE rights_profile_id IN (${profile})`.execute(
      db(),
    );
    try {
      const built = await buildFullNameReport(db(), { givenName: "JAN", surname: "NOWAK" });
      if (built.kind !== "BUILT") throw new Error(built.kind);
      expect(section(built.sections, "GIVEN_NAME")).toMatchObject({
        body_payload: { state: "RIGHTS_BLOCKED", lists: [] },
      });
      expect(section(built.sections, "GIVEN_NAME")?.claims.map((c) => c.presentation_role)).toEqual(
        ["LIMITATION", "LIMITATION"],
      );
    } finally {
      await sql`UPDATE rights_profiles SET commercial_use = ${was}::rights_permission WHERE rights_profile_id IN (${profile})`.execute(
        db(),
      );
    }
  });

  it("freezes each work's origin and meaning, cited first, and says when no work explains a name (TASK-147 AC-4)", async () => {
    for (const file of ["buryan-1933.json", "yonge-1884.json"]) {
      const imported = await importGivenNameMeanings(db(), {
        bytes: read(`sources/given-name-meanings/${file}`),
      });
      if (imported.kind !== "IMPORTED") throw new Error(`${file}: ${imported.kind}`);
    }
    await deriveAllGivenNameMeanings(db());
    await deriveGivenName(db(), "MAŁGORZATA");
    await deriveGivenName(db(), "KRZYSZTOF");

    const built = await buildFullNameReport(db(), { givenName: "Małgorzata", surname: "Nowak" });
    if (built.kind !== "BUILT") throw new Error(built.kind);
    const given = section(built.sections, "GIVEN_NAME");
    expect(given?.body_payload).toMatchObject({ meaning: { state: "READY", works: 2 } });
    const meaningClaim = await sql<{ id: string }>`
      SELECT c.claim_id::text AS id FROM claims c
        JOIN given_names g ON g.given_name_id = c.subject_entity_id
       WHERE g.canonical_display = 'MAŁGORZATA' AND c.claim_type::text = 'GIVEN_NAME_MEANING'
         AND c.claim_status = 'ACTIVE'
    `.execute(db());
    const meaningId = meaningClaim.rows[0]?.id;
    expect(given?.claims).toContainEqual({ claim_id: meaningId, presentation_role: "SUPPORT" });
    expect(given?.section_confidence_summary).toEqual({ VERIFIED: 1, LIKELY: 1 });
    const gaps = (section(built.sections, "LIMITATIONS")?.body_payload as { given_name: unknown[] })
      .given_name;
    expect(gaps).not.toContainEqual(expect.objectContaining({ topic: "MEANING" }));

    const stored = await readReportVersion(db(), built.report_version_id);
    const facts = parseGivenNameFacts((stored?.payload as Record<string, unknown>)["given_name"]);
    if (facts?.meaning.state !== "READY") throw new Error(String(facts?.meaning.state));
    expect(facts.meaning.claim_id).toBe(meaningId);
    expect(facts.meaning.confidence.status).toBe("LIKELY");
    expect(
      facts.meaning.works.map((w) => [
        w.work.author_or_publisher,
        w.origin,
        w.literal_gloss,
        w.translation,
      ]),
    ).toEqual([
      [
        "Charlotte M. Yonge",
        { code: "grc", as_printed: "Gr." },
        "pearl",
        { language: "pl", text: "perła", by: "Name Atlas" },
      ],
      ["ks. Józef Buryan", { code: "grc", as_printed: "z greckich" }, null, null],
    ]);

    // The first name's citations, the count's and then the two works', lead the bibliography.
    const ids = (section(built.sections, "SOURCES")?.body_payload as { citation_ids: string[] })
      .citation_ids;
    const first = [
      facts.lists[0]?.count.citation.id,
      ...facts.meaning.works.map((w) => w.citation.id),
    ];
    expect(ids.slice(0, 3)).toEqual(first);
    expect(ids.length).toBeGreaterThan(3);

    const none = await buildFullNameReport(db(), { givenName: "KRZYSZTOF", surname: "NOWAK" });
    if (none.kind !== "BUILT") throw new Error(none.kind);
    expect(section(none.sections, "GIVEN_NAME")?.body_payload).toMatchObject({
      meaning: { state: "NO_SOURCE" },
    });
    expect(
      (section(none.sections, "LIMITATIONS")?.body_payload as { given_name: unknown[] }).given_name,
    ).toContainEqual({ topic: "MEANING", reason_code: "NO_ADMISSIBLE_SOURCE" });
  });
});
