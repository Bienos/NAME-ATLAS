import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { canonicalKey, resolveSurname } from "@name-atlas/resolver";
import { seedTestSurname } from "@name-atlas/resolver/testing";
import {
  PESEL_RESOURCE_ROLES,
  countIngestionRows,
  importPeselResource,
  peselResource,
  readPeselRegister,
  sha256Hex,
} from "@name-atlas/sources/pesel";
import type {
  PeselImportInput,
  PeselResourceMetadata,
  PeselResourceRole,
} from "@name-atlas/sources/pesel";

/**
 * `readPeselRegister` against a real PostgreSQL.
 *
 * The two CSV fixtures are GENUINE 22- and 23-row excerpts of the official
 * resources, imported with their OWN checksums, exactly as
 * `pesel-import.test.ts` does. Anything built by `syntheticResource()` is
 * SYNTHETIC — mechanical counts, not PESEL evidence of anything. Expected
 * counts are parsed from the fixture files, never hard-coded.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXTURE_DIR = path.join(REPO_ROOT, "fixtures", "pesel");
const METADATA_DIR = path.join(
  REPO_ROOT,
  "docs",
  "sources",
  "acquisition",
  "2026-09-18",
  "metadata",
);

const FIXTURE_FILE: Readonly<Record<PeselResourceRole, string>> = {
  national_male: "national-male-2026-01-20.csv",
  national_female: "national-female-2026-01-20.csv",
};

const METADATA_FILE: Readonly<Record<PeselResourceRole, string>> = {
  national_male: "pesel_national_2026_male_1148808.official_resource.json",
  national_female: "pesel_national_2026_female_1148811.official_resource.json",
};

const RETRIEVED_AT = new Date("2026-09-19T12:00:00Z");

function fixtureBytes(role: PeselResourceRole): Uint8Array {
  return new Uint8Array(readFileSync(path.join(FIXTURE_DIR, FIXTURE_FILE[role])));
}

function resourceMetadata(role: PeselResourceRole): PeselResourceMetadata {
  return JSON.parse(
    readFileSync(path.join(METADATA_DIR, METADATA_FILE[role]), "utf8"),
  ) as PeselResourceMetadata;
}

function importInput(role: PeselResourceRole, bytes: Uint8Array): PeselImportInput {
  return {
    role,
    bytes,
    expectedSha256: sha256Hex(bytes),
    resourceMetadata: resourceMetadata(role),
    retrievedAt: RETRIEVED_AT,
  };
}

function fixtureCounts(role: PeselResourceRole): Map<string, number> {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(fixtureBytes(role));
  const counts = new Map<string, number>();
  for (const line of text.split("\r\n").slice(1)) {
    if (line === "") {
      continue;
    }
    const index = line.lastIndexOf(",");
    counts.set(canonicalKey(line.slice(0, index)), Number.parseInt(line.slice(index + 1), 10));
  }
  return counts;
}

/** SYNTHETIC resource bytes in the confirmed source shape. */
function syntheticResource(rows: readonly (readonly [string, number])[]): Uint8Array {
  const lines = [
    "Nazwisko aktualne,Liczba",
    ...rows.map(([surname, count]) => `${surname},${String(count)}`),
    "",
  ];
  return new TextEncoder().encode(lines.join("\r\n"));
}

async function freshDatabase(): Promise<TestDatabase> {
  const database = await startTestDatabase();
  await migrateTestDatabase(database);
  return database;
}

function requireDb(database: TestDatabase | undefined): Kysely<DB> {
  if (!database) {
    throw new Error("Test database was not started - see the beforeAll failure above.");
  }
  return database.db;
}

async function surnameIdOf(db: Kysely<DB>, input: string): Promise<string> {
  const outcome = await resolveSurname(db, input);
  if (outcome.kind !== "RESOLUTION" || outcome.resolution.resolved_surname_id === null) {
    throw new Error(`${input} did not resolve`);
  }
  return outcome.resolution.resolved_surname_id;
}

// ---------------------------------------------------------------------------
// One database for the whole file, in order: nothing imported, then the two
// genuine fixtures, then a SYNTHETIC supersession of one of them.

describe("readPeselRegister", () => {
  let database: TestDatabase | undefined;
  const male = fixtureCounts("national_male");
  const female = fixtureCounts("national_female");
  const shared = [...male.keys()].filter((key) => female.has(key));
  const maleOnly = [...male.keys()].filter((key) => !female.has(key));

  beforeAll(async () => {
    database = await freshDatabase();
  });

  afterAll(async () => {
    await database?.stop();
  });

  describe("before any PESEL import", () => {
    it("returns null — no data held is not the same answer as not listed", async () => {
      const db = requireDb(database);
      const seeded = await seedTestSurname(db, { canonical_display: "SYNTHETICUS" });
      expect(await readPeselRegister(db, seeded.surname_id)).toBeNull();
    });
  });

  describe("with both genuine fixtures imported", () => {
    beforeAll(async () => {
      const db = requireDb(database);
      for (const role of PESEL_RESOURCE_ROLES) {
        await importPeselResource(db, importInput(role, fixtureBytes(role)));
      }
    });

    it("has a shared and a single-list surname to test", () => {
      expect(shared.length).toBeGreaterThan(0);
      expect(maleOnly.length).toBeGreaterThan(0);
    });

    it("returns every listed count exactly as published, one entry per list, in registry order", async () => {
      const db = requireDb(database);
      for (const key of shared) {
        const reading = await readPeselRegister(db, await surnameIdOf(db, key));
        expect(reading?.entries.map((entry) => entry.role)).toEqual([...PESEL_RESOURCE_ROLES]);
        expect(reading?.entries.map((entry) => entry.status)).toEqual(["LISTED", "LISTED"]);
        const counts = reading?.entries.map((entry) =>
          entry.status === "LISTED" ? entry.count : null,
        );
        expect(counts).toEqual([male.get(key), female.get(key)]);
      }
    });

    it("reports absence from a list as below-threshold-or-absent, never as zero", async () => {
      const db = requireDb(database);
      for (const key of maleOnly) {
        const reading = await readPeselRegister(db, await surnameIdOf(db, key));
        const [maleEntry, femaleEntry] = reading?.entries ?? [];
        expect(maleEntry?.status).toBe("LISTED");
        expect(maleEntry && "count" in maleEntry ? maleEntry.count : null).toBe(male.get(key));
        expect(femaleEntry?.status).toBe("BELOW_PUBLICATION_THRESHOLD_OR_ABSENT");
        expect(femaleEntry).not.toHaveProperty("count");
      }
    });

    it("quotes the publisher's wording and the register date, not the retrieval date", async () => {
      const db = requireDb(database);
      const reading = await readPeselRegister(db, await surnameIdOf(db, shared[0] ?? ""));
      expect(reading?.source.publisher).toBe("Ministerstwo Cyfryzacji");
      for (const entry of reading?.entries ?? []) {
        const resource = peselResource(entry.role);
        expect(entry.resourceId).toBe(resource.resource_id);
        expect(entry.resourceTitle).toBe(resource.resource_title);
        expect(entry.resourceDescription).toBe(resource.resource_description);
        expect(entry.dataDate).toBe(resource.data_date);
        expect(entry.retrievedAt.toISOString()).toBe(RETRIEVED_AT.toISOString());
      }
    });

    it("writes nothing", async () => {
      const db = requireDb(database);
      const before = await countIngestionRows(db);
      for (const key of [...shared, ...maleOnly]) {
        await readPeselRegister(db, await surnameIdOf(db, key));
      }
      expect(await countIngestionRows(db)).toEqual(before);
    });
  });

  describe("after the female resource is superseded", () => {
    beforeAll(async () => {
      // SYNTHETIC versions of the female resource id; mechanical counts.
      const db = requireDb(database);
      for (const count of [10, 11]) {
        await importPeselResource(
          db,
          importInput("national_female", syntheticResource([["SYNTHETICUS", count]])),
        );
      }
    });

    it("reads only the current record's value", async () => {
      const db = requireDb(database);
      const reading = await readPeselRegister(db, await surnameIdOf(db, "SYNTHETICUS"));
      const [maleEntry, femaleEntry] = reading?.entries ?? [];
      expect(maleEntry?.status).toBe("BELOW_PUBLICATION_THRESHOLD_OR_ABSENT");
      expect(femaleEntry && "count" in femaleEntry ? femaleEntry.count : null).toBe(11);
    });

    it("no longer reads values from the superseded record", async () => {
      const db = requireDb(database);
      const reading = await readPeselRegister(db, await surnameIdOf(db, shared[0] ?? ""));
      expect(reading?.entries.map((entry) => entry.status)).toEqual([
        "LISTED",
        "BELOW_PUBLICATION_THRESHOLD_OR_ABSENT",
      ]);
    });
  });
});
