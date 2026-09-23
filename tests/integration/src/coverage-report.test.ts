import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  importPeselResource,
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  sha256Hex,
} from "@name-atlas/sources";
import { coverageMarkdown, coverageReport, deriveCurrentPopulation } from "@name-atlas/truth";

/**
 * The coverage report against real imported excerpts. The expected figures are
 * computed here **from the CSV bytes**, independently of the SQL under test.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(path.join(repoRoot, p));
const rowsOf = (file: string) =>
  read(`fixtures/pesel/${file}`)
    .toString("utf8")
    .split(/\r?\n/u)
    .slice(1)
    .filter((l) => l !== "")
    .map((l) => {
      const i = l.lastIndexOf(",");
      return { name: l.slice(0, i), count: Number(l.slice(i + 1)) };
    });

describe("coverageReport", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    for (const [resource, file, meta] of [
      [
        PESEL_NATIONAL_MALE_2026,
        "national-male-2026-01-20.csv",
        "pesel_national_2026_male_1148808",
      ],
      [
        PESEL_NATIONAL_FEMALE_2026,
        "national-female-2026-01-20.csv",
        "pesel_national_2026_female_1148811",
      ],
    ] as const) {
      const bytes = read(`fixtures/pesel/${file}`);
      await importPeselResource(db(), {
        resource,
        bytes,
        expectedSha256: sha256Hex(bytes),
        rawPayload: JSON.parse(
          read(
            `docs/sources/acquisition/2026-09-18/metadata/${meta}.official_resource.json`,
          ).toString("utf8"),
        ),
      });
    }
    // Population for two surnames only, so the report has something partial to count.
    await deriveCurrentPopulation(db(), "NOWAK");
    await deriveCurrentPopulation(db(), "MAZUR");
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("counts every surname and person of each national resource, never summing the two", async () => {
    const report = await coverageReport(db());
    expect(report.map((r) => r.role)).toEqual(["national_male", "national_female"]);
    for (const [role, file] of [
      ["national_male", "national-male-2026-01-20.csv"],
      ["national_female", "national-female-2026-01-20.csv"],
    ] as const) {
      const rows = rowsOf(file);
      const all = report.find((r) => r.role === role)!.bands.find((b) => b.band === "ALL")!;
      expect(all.surnames).toBe(rows.length);
      expect(all.people).toBe(rows.reduce((s, r) => s + r.count, 0));
      const withPopulation = rows.filter((r) => r.name === "NOWAK" || r.name === "MAZUR");
      expect(all.families.population).toEqual({
        surnames: withPopulation.length,
        people: withPopulation.reduce((s, r) => s + r.count, 0),
      });
      // The gate refuses rank and rarity over an excerpt; no regional file is imported.
      expect(all.families.rank.surnames).toBe(0);
      expect(all.families.distribution.surnames).toBe(0);
    }
  });

  it("bands by the publisher's count, and the bands add up to the whole", async () => {
    for (const r of await coverageReport(db())) {
      const all = r.bands.find((b) => b.band === "ALL")!;
      const parts = r.bands.filter((b) => b.band !== "ALL");
      expect(parts.reduce((s, b) => s + b.surnames, 0)).toBe(all.surnames);
      expect(parts.reduce((s, b) => s + b.people, 0)).toBe(all.people);
      expect(r.regional_resource_id).toBeNull();
    }
  });

  it("renders Markdown that says what it does not count", async () => {
    const md = coverageMarkdown(await coverageReport(db()));
    expect(md).toContain("## national_male (resource 1148808)");
    expect(md).toContain("Regional counterpart not imported");
    expect(md).toContain("No threshold for 'enough' is applied.");
  });
});
