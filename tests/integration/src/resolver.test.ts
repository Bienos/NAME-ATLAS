import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { createDb, createPool } from "@name-atlas/db";
import { sql } from "kysely";
import { resolveSurname } from "@name-atlas/resolver";
import type { SurnameResolution } from "@name-atlas/resolver";
import { countIdentityRows, seedTestNameForm, seedTestSurname } from "@name-atlas/resolver/testing";
import type { IdentityRowCounts } from "@name-atlas/resolver/testing";

/**
 * TASK-003 §8 items 13–19 — exact resolution against a real PostgreSQL.
 *
 * EVERY RECORD SEEDED HERE IS SYNTHETIC. Polish spellings are used as
 * realistic strings only (as TASK-003 §8 allows); nothing below is a PESEL
 * row, a count, a claim, or evidence of anything. The collision fixtures in
 * particular are engineered nonsense that exists only to prove the
 * resolver fails closed.
 */
describe("exact surname resolver against a real PostgreSQL", () => {
  let database: TestDatabase | undefined;
  let seeded: IdentityRowCounts | undefined;

  // Seeded identities, captured for assertions.
  let kowalski = "";
  let luczak = "";
  let gorski = "";
  let nowak = "";
  let novakForm = "";
  let nowacFormA = "";
  let nowacFormB = "";
  let alfa = "";
  let zielony = "";
  let zieloni = "";

  function requireDatabase(): TestDatabase {
    if (!database) {
      throw new Error("Test database was not started - see beforeAll failure above.");
    }
    return database;
  }

  /**
   * A Kysely instance whose driver has been initialised and then destroyed.
   * Kysely's `destroy()` is a no-op on a never-used driver, so one query
   * runs first — otherwise the instance would silently keep working and
   * these tests would prove nothing.
   */
  async function deadDatabase() {
    const dead = createDb(createPool({ databaseUrl: requireDatabase().connectionUri }));
    await sql`SELECT 1`.execute(dead);
    await dead.destroy();
    await expect(sql`SELECT 1`.execute(dead)).rejects.toThrow(/destroyed/u);
    return dead;
  }

  async function resolveOrFail(rawInput: string): Promise<SurnameResolution> {
    const outcome = await resolveSurname(requireDatabase().db, rawInput);
    if (outcome.kind !== "RESOLUTION") {
      throw new Error(`lookup failed at ${outcome.stage}: ${outcome.message}`);
    }
    return outcome.resolution;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    const db = database.db;

    // --- canonical surnames (T0) ---
    kowalski = (await seedTestSurname(db, { canonical_display: "Kowalski" })).surname_id;
    luczak = (await seedTestSurname(db, { canonical_display: "Łuczak" })).surname_id;
    gorski = (await seedTestSurname(db, { canonical_display: "Górski" })).surname_id;
    await seedTestSurname(db, { canonical_display: "Nowak" }).then((s) => (nowak = s.surname_id));
    await seedTestSurname(db, { canonical_display: "Cichowski" });

    // --- eligible NameForms (T1) ---
    novakForm = (
      await seedTestNameForm(db, {
        form: "Novak",
        surname_id: nowak,
        form_type: "MODERN_VARIANT",
        attestation_status: "ATTESTED",
      })
    ).name_form_id;
    // Two eligible forms with the SAME key mapping to the SAME surname:
    // still one identity, and the matched form must be chosen deterministically.
    nowacFormA = (
      await seedTestNameForm(db, {
        form: "Nowac",
        surname_id: nowak,
        form_type: "MODERN_VARIANT",
        attestation_status: "DERIVED",
      })
    ).name_form_id;
    nowacFormB = (
      await seedTestNameForm(db, {
        form: "NOWAC",
        surname_id: nowak,
        form_type: "CANONICAL",
        attestation_status: "ATTESTED",
      })
    ).name_form_id;

    // --- ineligible NameForms: must be invisible to resolution (item 15) ---
    const cichowski = (
      await db
        .selectFrom("surnames")
        .select("surname_id")
        .where("canonical_key", "=", "cichowski")
        .executeTakeFirstOrThrow()
    ).surname_id;
    await seedTestNameForm(db, {
      form: "Cichowsky",
      surname_id: cichowski,
      form_type: "SEARCH_CANDIDATE", // ineligible form_type
      attestation_status: "ATTESTED",
    });
    await seedTestNameForm(db, {
      form: "Cichowskii",
      surname_id: cichowski,
      form_type: "MODERN_VARIANT",
      attestation_status: "GENERATED_CANDIDATE", // ineligible attestation
    });
    await seedTestNameForm(db, {
      form: "Cichofski",
      surname_id: cichowski,
      form_type: "MODERN_VARIANT",
      attestation_status: "DISPUTED", // ineligible attestation
    });
    await seedTestNameForm(db, {
      form: "Cichovsky",
      surname_id: null, // association not accepted
      form_type: "MODERN_VARIANT",
      attestation_status: "ATTESTED",
    });

    // --- T0 precedence: a canonical surname AND an eligible form with the
    // same key pointing elsewhere. Synthetic, deliberately nonsensical. ---
    alfa = (await seedTestSurname(db, { canonical_display: "Alfa" })).surname_id;
    const beta = (await seedTestSurname(db, { canonical_display: "Beta" })).surname_id;
    await seedTestNameForm(db, {
      form: "Alfa",
      surname_id: beta,
      form_type: "MODERN_VARIANT",
      attestation_status: "ATTESTED",
    });

    // --- synthetic collision (item 16): one key, two eligible forms, two surnames ---
    zielony = (await seedTestSurname(db, { canonical_display: "Zielony" })).surname_id;
    zieloni = (await seedTestSurname(db, { canonical_display: "Zieloni" })).surname_id;
    await seedTestNameForm(db, {
      form: "Zielonny",
      surname_id: zielony,
      form_type: "MODERN_VARIANT",
      attestation_status: "ATTESTED",
    });
    await seedTestNameForm(db, {
      form: "Zielonny",
      surname_id: zieloni,
      form_type: "MODERN_VARIANT",
      attestation_status: "DERIVED",
    });

    seeded = await countIdentityRows(db);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  describe("tier T0 - exact canonical match (item 13)", () => {
    it("resolves an exact canonical surname to EXACT with its id and display form", async () => {
      const resolution = await resolveOrFail("Kowalski");
      expect(resolution.resolution_status).toBe("EXACT");
      expect(resolution.outcome).toBe("RESOLVED");
      expect(resolution.resolved_surname_id).toBe(kowalski);
      expect(resolution.resolved_canonical_display).toBe("Kowalski");
      expect(resolution.matched_name_form_id).toBeNull();
      expect(resolution.candidate_surname_ids).toEqual([]);
      expect(resolution.user_confirmation_required).toBe(false);
    });

    it("is case-insensitive and whitespace-tolerant while preserving raw_input untouched", async () => {
      for (const input of ["KOWALSKI", "kowalski", "  Kowalski  ", "\u00a0KOWALSKI\u00a0"]) {
        const resolution = await resolveOrFail(input);
        expect(resolution.resolution_status).toBe("EXACT");
        expect(resolution.resolved_surname_id).toBe(kowalski);
        expect(resolution.raw_input).toBe(input);
        expect(resolution.canonical_key).toBe("kowalski");
      }
    });

    it("resolves a decomposed Unicode representation to the precomposed stored surname", async () => {
      const resolution = await resolveOrFail("Go\u0301rski"); // o + COMBINING ACUTE
      expect(resolution.resolution_status).toBe("EXACT");
      expect(resolution.resolved_surname_id).toBe(gorski);
      expect(resolution.unicode_nfc).toBe("Górski");
      expect(resolution.raw_input).toBe("Go\u0301rski");
    });

    it("resolves Łuczak with its diacritic, and reports the versions it used", async () => {
      const resolution = await resolveOrFail("ŁUCZAK");
      expect(resolution.resolved_surname_id).toBe(luczak);
      expect(resolution.resolution_method_version).toBe("exact_resolver_v2");
      expect(resolution.canonical_key_version).toBe("canonical_key_v2");
    });

    it("T0 outranks T1: a canonical match wins even when an eligible form points elsewhere", async () => {
      const resolution = await resolveOrFail("alfa");
      expect(resolution.resolution_status).toBe("EXACT");
      expect(resolution.resolved_surname_id).toBe(alfa);
      expect(resolution.matched_name_form_id).toBeNull();
    });
  });

  describe("tier T1 - exact eligible NameForm match (item 14)", () => {
    it("resolves an approved form to KNOWN_VARIANT with both the surname and the form identified", async () => {
      const resolution = await resolveOrFail("NOVAK");
      expect(resolution.resolution_status).toBe("KNOWN_VARIANT");
      expect(resolution.outcome).toBe("RESOLVED");
      expect(resolution.resolved_surname_id).toBe(nowak);
      expect(resolution.resolved_canonical_display).toBe("Nowak");
      expect(resolution.matched_name_form_id).toBe(novakForm);
      expect(resolution.matched_form).toBe("Novak");
      expect(resolution.user_confirmation_required).toBe(false);
    });

    it("several eligible forms for ONE surname are one identity, matched deterministically", async () => {
      const resolution = await resolveOrFail("nowac");
      expect(resolution.resolution_status).toBe("KNOWN_VARIANT");
      expect(resolution.resolved_surname_id).toBe(nowak);
      expect(resolution.matched_name_form_id).toBe([nowacFormA, nowacFormB].sort()[0]);
      const again = await resolveOrFail("nowac");
      expect(again.matched_name_form_id).toBe(resolution.matched_name_form_id);
    });
  });

  describe("ineligible forms are never used (item 15; docs/canonical/11 §4.3 hard rule)", () => {
    it.each([
      ["SEARCH_CANDIDATE form_type", "Cichowsky"],
      ["GENERATED_CANDIDATE attestation", "Cichowskii"],
      ["DISPUTED attestation", "Cichofski"],
      ["unaccepted association (surname_id NULL)", "Cichovsky"],
    ])("%s → UNKNOWN", async (_label, input) => {
      const resolution = await resolveOrFail(input);
      expect(resolution.resolution_status).toBe("UNKNOWN");
      expect(resolution.outcome).toBe("UNRESOLVED");
      expect(resolution.resolved_surname_id).toBeNull();
      expect(resolution.matched_name_form_id).toBeNull();
    });
  });

  describe("ambiguity fails closed (item 16)", () => {
    it("two eligible forms mapping to two surnames → MULTIPLE_EXACT with both candidates, no selection", async () => {
      const resolution = await resolveOrFail("Zielonny");
      expect(resolution.resolution_status).toBe("MULTIPLE_EXACT");
      expect(resolution.outcome).toBe("UNRESOLVED");
      expect(resolution.resolved_surname_id).toBeNull();
      expect(resolution.matched_name_form_id).toBeNull();
      expect(resolution.candidate_surname_ids).toEqual([zielony, zieloni].sort());
      expect(resolution.user_confirmation_required).toBe(true);
    });
  });

  describe("identity is exact - no fold, no suffix rule, no component match (§7.5)", () => {
    it.each([
      ["Luczak (Łuczak stored)", "Luczak"],
      ["Gorski (Górski stored)", "Gorski"],
      ["Kowalska (Kowalski stored - no gender rule)", "Kowalska"],
      ["Kowalski-Nowak (both components stored - no component match)", "Kowalski-Nowak"],
      ["Kowalsky (one letter off - no fuzzy)", "Kowalsky"],
    ])("%s → UNKNOWN", async (_label, input) => {
      const resolution = await resolveOrFail(input);
      expect(resolution.resolution_status).toBe("UNKNOWN");
      expect(resolution.resolved_surname_id).toBeNull();
      expect(resolution.candidate_surname_ids).toEqual([]);
    });
  });

  describe("unknown input creates nothing (item 17)", () => {
    it("returns UNKNOWN and leaves every identity table's row count unchanged", async () => {
      const before = await countIdentityRows(requireDatabase().db);
      const resolution = await resolveOrFail("Brzęczyszczykiewicz");
      expect(resolution.resolution_status).toBe("UNKNOWN");
      const after = await countIdentityRows(requireDatabase().db);
      expect(after).toEqual(before);
    });
  });

  describe("invalid input never reaches the database (AC-08)", () => {
    it("whitespace-only → EMPTY / INVALID_INPUT, returned even through a destroyed connection", async () => {
      // A destroyed Kysely instance would fail any query. Getting a
      // RESOLUTION back proves no query was attempted.
      const dead = await deadDatabase();
      const outcome = await resolveSurname(dead, "   ");
      expect(outcome.kind).toBe("RESOLUTION");
      if (outcome.kind === "RESOLUTION") {
        expect(outcome.resolution.resolution_status).toBe("EMPTY");
        expect(outcome.resolution.validation_status).toBe("EMPTY");
        expect(outcome.resolution.outcome).toBe("INVALID_INPUT");
        expect(outcome.resolution.raw_input).toBe("   ");
      }
    });

    it("control characters → MALFORMED_CONTROL_CHARACTERS / INVALID_INPUT", async () => {
      const resolution = await resolveOrFail("Kowal\u200bski");
      expect(resolution.resolution_status).toBe("MALFORMED_CONTROL_CHARACTERS");
      expect(resolution.outcome).toBe("INVALID_INPUT");
    });

    it("mixed Latin/Cyrillic → REVIEW_REQUIRED, confirmation required, no match attempted", async () => {
      const dead = await deadDatabase();
      const outcome = await resolveSurname(dead, "Kow\u0430lski"); // Cyrillic \u0430
      expect(outcome.kind).toBe("RESOLUTION");
      if (outcome.kind === "RESOLUTION") {
        expect(outcome.resolution.validation_status).toBe("MIXED_SCRIPT_REVIEW");
        expect(outcome.resolution.resolution_status).toBe("REVIEW_REQUIRED");
        expect(outcome.resolution.outcome).toBe("UNRESOLVED");
        expect(outcome.resolution.user_confirmation_required).toBe(true);
        expect(outcome.resolution.script_confusable_flag).toBe(true);
        expect(outcome.resolution.resolved_surname_id).toBeNull();
      }
    });
  });

  describe("a database failure is not an unknown surname (item 19)", () => {
    it("surfaces as LOOKUP_FAILED with a stage, never as UNKNOWN", async () => {
      const dead = await deadDatabase();
      const outcome = await resolveSurname(dead, "Kowalski");
      expect(outcome.kind).toBe("LOOKUP_FAILED");
      if (outcome.kind === "LOOKUP_FAILED") {
        expect(outcome.raw_input).toBe("Kowalski");
        expect(outcome.canonical_key).toBe("kowalski");
        expect(outcome.stage).toBe("TRANSACTION");
        expect(outcome.resolution_method_version).toBe("exact_resolver_v2");
        expect(typeof outcome.message).toBe("string");
      }
    });
  });

  describe("P4 no crash, database half (item 12)", () => {
    it("returns a typed outcome for arbitrary Unicode input", async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ unit: "grapheme", maxLength: 300 }), async (input) => {
          const outcome = await resolveSurname(requireDatabase().db, input);
          expect(["RESOLUTION", "LOOKUP_FAILED"]).toContain(outcome.kind);
          if (outcome.kind === "RESOLUTION") {
            expect(outcome.resolution.raw_input).toBe(input);
          } else {
            throw new Error(`unexpected lookup failure at ${outcome.stage}: ${outcome.message}`);
          }
        }),
        { numRuns: 40 },
      );
    });
  });

  describe("zero writes across the whole suite (item 18)", () => {
    it("identity tables hold exactly the rows seeded in beforeAll and nothing more", async () => {
      // Runs last: every hit and miss above has already executed.
      const now = await countIdentityRows(requireDatabase().db);
      expect(now).toEqual(seeded);
      // And the seeded shape is what the fixture list above says it is.
      // 9 surnames; 10 name forms (3 Nowak, 4 ineligible Cichowski, 1 Alfa, 2 Zielonny); one entity each.
      expect(now.surnames).toBe(9);
      expect(now.name_forms).toBe(10);
      expect(now.knowledge_entities).toBe(19);
    });
  });
});
