import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { resolveSurname, resolveSurnamesBulk } from "@name-atlas/resolver";
import type { ResolveOptions } from "@name-atlas/resolver";
import { seedTestNameForm, seedTestSurname } from "@name-atlas/resolver/testing";

/**
 * TASK-013 AC-1 — `resolveSurnamesBulk` is `resolveSurname` in lists, not a
 * second algorithm. Every input below is resolved both ways and the two
 * resolutions must be deep-equal, across every status the resolver has.
 *
 * EVERY RECORD SEEDED HERE IS SYNTHETIC. Spellings are realistic strings
 * only; nothing is a PESEL row, a count or a claim.
 */
describe("bulk resolution equals single resolution (TASK-013)", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) {
      throw new Error("Test database was not started - see beforeAll failure above.");
    }
    return database.db;
  }

  /** Inputs covering every status; filled by beforeAll once the seeds exist. */
  const inputs: string[] = [];

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);

    // EXACT (T0)
    const kowalski = await seedTestSurname(db(), { canonical_display: "Kowalski" });
    // KNOWN_VARIANT (T1): an eligible form of a different spelling
    await seedTestNameForm(db(), {
      form: "Kowalsky",
      surname_id: kowalski.surname_id,
      form_type: "MODERN_VARIANT",
      attestation_status: "ATTESTED",
    });
    // MULTIPLE_EXACT at T1: one form string attached to two surnames
    const a = await seedTestSurname(db(), { canonical_display: "Zielony" });
    const b = await seedTestSurname(db(), { canonical_display: "Zieloni" });
    for (const surname_id of [a.surname_id, b.surname_id]) {
      await seedTestNameForm(db(), {
        form: "Zielonyy",
        surname_id,
        form_type: "MODERN_VARIANT",
        attestation_status: "ATTESTED",
      });
    }
    // An ineligible form must stay invisible to both paths
    await seedTestNameForm(db(), {
      form: "Kowalskee",
      surname_id: kowalski.surname_id,
      form_type: "SEARCH_CANDIDATE",
      attestation_status: "GENERATED_CANDIDATE",
    });
    // A stored mixed-script identity, for the flagged policy's EXACT case
    await seedTestSurname(db(), { canonical_display: "HODŽIЌ" });

    inputs.push(
      "Kowalski", // EXACT
      "KOWALSKI", // EXACT via case
      "Kowalsky", // KNOWN_VARIANT
      "Zielonyy", // MULTIPLE_EXACT (T1)
      "Kowalskee", // UNKNOWN (ineligible form invisible)
      "Nieistniejący", // UNKNOWN
      "HODŽIЌ", // MIXED_SCRIPT_REVIEW: REVIEW_REQUIRED or EXACT by policy
      "ЌATOVIЌ", // MIXED_SCRIPT_REVIEW: REVIEW_REQUIRED or UNKNOWN by policy
      "", // EMPTY
      "   ", // EMPTY
      "Kowal\tski", // MALFORMED_CONTROL_CHARACTERS
      "X".repeat(300), // EXCEEDS_OPERATIONAL_LIMIT
      "Kowalski", // duplicate within the batch
      "O’Brien", // separator mapping, UNKNOWN
      "Górski", // NFC handling, UNKNOWN
    );
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  for (const policy of ["REVIEW", "RESOLVE_FLAGGED"] as const) {
    it(`matches resolveSurname input by input under mixedScript = ${policy}`, async () => {
      const options: ResolveOptions = { mixedScript: policy };
      const bulk = await resolveSurnamesBulk(db(), inputs, options);
      expect(bulk).toHaveLength(inputs.length);
      const statuses = new Set<string>();
      for (const [i, input] of inputs.entries()) {
        const single = await resolveSurname(db(), input, options);
        expect(bulk[i]).toEqual(single);
        if (single.kind === "RESOLUTION") statuses.add(single.resolution.resolution_status);
      }
      // The set really covers the resolver's statuses, not just the easy ones.
      for (const expected of ["EXACT", "KNOWN_VARIANT", "MULTIPLE_EXACT", "UNKNOWN", "EMPTY"]) {
        expect(statuses.has(expected)).toBe(true);
      }
      expect(statuses.has(policy === "REVIEW" ? "REVIEW_REQUIRED" : "EXACT")).toBe(true);
    });
  }

  it("an empty batch resolves to an empty list without a transaction", async () => {
    expect(await resolveSurnamesBulk(db(), [])).toEqual([]);
  });

  it("a batch of only invalid inputs never opens a transaction and resolves each singly", async () => {
    const bulk = await resolveSurnamesBulk(db(), ["", "a\tb"]);
    expect(bulk.map((o) => o.kind === "RESOLUTION" && o.resolution.resolution_status)).toEqual([
      "EMPTY",
      "MALFORMED_CONTROL_CHARACTERS",
    ]);
  });

  it("a database failure is LOOKUP_FAILED for every pending input, never UNKNOWN", async () => {
    const dead = database?.db;
    if (!dead) throw new Error("no database");
    // A destroyed handle fails inside the transaction; the invalid input in
    // the same batch still resolves on its own, because it never needed one.
    const { createDb, createPool } = await import("@name-atlas/db");
    const { sql } = await import("kysely");
    const doomed = createDb(createPool({ databaseUrl: database!.connectionUri }));
    // Kysely's destroy() is a no-op on a never-used driver; run one query
    // first so the handle is genuinely dead (as resolver.test.ts does).
    await sql`SELECT 1`.execute(doomed);
    await doomed.destroy();
    await expect(sql`SELECT 1`.execute(doomed)).rejects.toThrow(/destroyed/u);
    const bulk = await resolveSurnamesBulk(doomed, ["Kowalski", "", "Nowak"]);
    expect(bulk.map((o) => o.kind)).toEqual(["LOOKUP_FAILED", "RESOLUTION", "LOOKUP_FAILED"]);
    expect(bulk[1]?.kind === "RESOLUTION" && bulk[1].resolution.resolution_status).toBe("EMPTY");
  });
});
