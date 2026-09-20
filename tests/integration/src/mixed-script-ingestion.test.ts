import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { resolveSurname } from "@name-atlas/resolver";
import {
  importPeselResource,
  PESEL_HEADER,
  PESEL_LINE_TERMINATOR,
  PESEL_NATIONAL_FEMALE_2026,
  sha256Hex,
} from "@name-atlas/sources";

/**
 * TASK-010 (D-014, Option C) — a mixed-script row in an authoritative
 * register is imported with its finding persisted, never refused, never
 * normalised (docs/canonical/13 §10.4).
 *
 * `HODŽIЌ` and `ЌATOVIЌ` are the two real rows from resource 1148811 (lines
 * 338,202 and 420,083, both `Liczba = 2`), each carrying U+040C CYRILLIC
 * CAPITAL LETTER KJE among Latin letters. They are used here as strings and
 * as the shape of the defect; the synthetic file below is NOT the resource,
 * and its counts are not claims. `NOWAKTEST` is synthetic.
 */
const HODZIC = "HODŽIЌ";
const KATOVIC = "ЌATOVIЌ";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FEMALE_PAYLOAD: unknown = JSON.parse(
  readFileSync(
    path.join(
      repoRoot,
      "docs/sources/acquisition/2026-09-18/metadata/pesel_national_2026_female_1148811.official_resource.json",
    ),
    "utf8",
  ),
);

/** Builds a SYNTHETIC PESEL-shaped file. Never source evidence. */
function syntheticCsv(rows: readonly (readonly [string, number])[]): Uint8Array {
  const lines = [PESEL_HEADER, ...rows.map(([surname, count]) => `${surname},${String(count)}`)];
  return new TextEncoder().encode(lines.join(PESEL_LINE_TERMINATOR) + PESEL_LINE_TERMINATOR);
}

describe("mixed-script rows in bulk ingestion (TASK-010)", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) {
      throw new Error("Test database was not started - see beforeAll failure above.");
    }
    return database.db;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("AC-1: the default resolver still refuses a mixed-script input without touching the database", async () => {
    const outcome = await resolveSurname(db(), HODZIC);
    expect(outcome.kind).toBe("RESOLUTION");
    if (outcome.kind !== "RESOLUTION") return;
    expect(outcome.resolution.validation_status).toBe("MIXED_SCRIPT_REVIEW");
    expect(outcome.resolution.resolution_status).toBe("REVIEW_REQUIRED");
    expect(outcome.resolution.resolved_surname_id).toBeNull();
    expect(outcome.resolution.user_confirmation_required).toBe(true);
  });

  it("AC-2: RESOLVE_FLAGGED runs the lookup and reports UNKNOWN with the finding attached", async () => {
    const outcome = await resolveSurname(db(), HODZIC, { mixedScript: "RESOLVE_FLAGGED" });
    expect(outcome.kind).toBe("RESOLUTION");
    if (outcome.kind !== "RESOLUTION") return;
    expect(outcome.resolution.resolution_status).toBe("UNKNOWN");
    expect(outcome.resolution.validation_status).toBe("MIXED_SCRIPT_REVIEW");
    expect(outcome.resolution.mixed_script).toBe(true);
    expect(outcome.resolution.script_confusable_flag).toBe(true);
    expect(outcome.resolution.primary_script).toBe("Latn");
    expect(outcome.resolution.user_confirmation_required).toBe(true);
  });

  it("AC-2 (guard): every other validation failure still short-circuits under RESOLVE_FLAGGED", async () => {
    const empty = await resolveSurname(db(), "   ", { mixedScript: "RESOLVE_FLAGGED" });
    expect(empty.kind === "RESOLUTION" && empty.resolution.resolution_status).toBe("EMPTY");
    const control = await resolveSurname(db(), "NOWAK\tX", { mixedScript: "RESOLVE_FLAGGED" });
    expect(control.kind === "RESOLUTION" && control.resolution.resolution_status).toBe(
      "MALFORMED_CONTROL_CHARACTERS",
    );
  });

  it("AC-3/AC-4: the two real rows import flagged, verbatim, alongside an ordinary row", async () => {
    const bytes = syntheticCsv([
      ["NOWAKTEST", 5],
      [HODZIC, 2],
      [KATOVIC, 2],
    ]);
    const outcome = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_FEMALE_2026,
      bytes,
      expectedSha256: sha256Hex(bytes),
      rawPayload: FEMALE_PAYLOAD,
    });
    expect(outcome.kind).toBe("IMPORTED");
    if (outcome.kind !== "IMPORTED") return;

    expect(outcome.report.rowsRead).toBe(3);
    expect(outcome.report.rowsImported).toBe(3);
    expect(outcome.report.rowsQuarantined).toBe(0);
    expect(outcome.report.surnamesCreated).toBe(3);
    expect(outcome.report.mixedScriptRows).toEqual([
      { line: 3, surname: HODZIC },
      { line: 4, surname: KATOVIC },
    ]);

    const rows = await sql<{
      canonical_display: string;
      primary_script: string;
      mixed_script: boolean;
      script_confusable_flag: boolean;
    }>`
      SELECT canonical_display, primary_script, mixed_script, script_confusable_flag
      FROM surnames
      WHERE canonical_display IN (${HODZIC}, ${KATOVIC}, 'NOWAKTEST')
      ORDER BY canonical_display
    `.execute(db());
    // Compared by value, not by position: where U+040C sorts is a collation
    // detail and not what this test is about.
    const byDisplay = new Map(rows.rows.map((row) => [row.canonical_display, row]));
    expect(byDisplay.size).toBe(3);
    expect(byDisplay.get("NOWAKTEST")).toEqual({
      canonical_display: "NOWAKTEST",
      primary_script: "Latn",
      mixed_script: false,
      script_confusable_flag: false,
    });
    expect(byDisplay.get(HODZIC)).toEqual({
      canonical_display: HODZIC,
      primary_script: "Latn",
      mixed_script: true,
      script_confusable_flag: true,
    });
    expect(byDisplay.get(KATOVIC)).toEqual({
      canonical_display: KATOVIC,
      primary_script: "Latn",
      mixed_script: true,
      script_confusable_flag: true,
    });

    // Stored bytes are the source bytes: U+040C survived, nothing was mapped.
    for (const row of rows.rows) {
      if (row.mixed_script) {
        expect(row.canonical_display.includes("Ќ")).toBe(true);
      }
    }

    // And each flagged row has its value: absence is not zero, presence is
    // the register's own number.
    const values = await sql<{ canonical_display: string; count: string }>`
      SELECT s.canonical_display, dv.count::text AS count
      FROM distribution_values dv
      JOIN distribution_snapshots ds USING (distribution_snapshot_id)
      JOIN surnames s USING (surname_id)
      WHERE s.mixed_script
      ORDER BY s.canonical_display
    `.execute(db());
    expect(values.rows.map((r) => r.count)).toEqual(["2", "2"]);
  });

  it("AC-5: after the import, RESOLVE_FLAGGED matches EXACT with the flag; the default still refuses", async () => {
    const flagged = await resolveSurname(db(), HODZIC, { mixedScript: "RESOLVE_FLAGGED" });
    expect(flagged.kind).toBe("RESOLUTION");
    if (flagged.kind !== "RESOLUTION") return;
    expect(flagged.resolution.resolution_status).toBe("EXACT");
    expect(flagged.resolution.resolved_canonical_display).toBe(HODZIC);
    expect(flagged.resolution.validation_status).toBe("MIXED_SCRIPT_REVIEW");
    expect(flagged.resolution.user_confirmation_required).toBe(true);

    const queryPath = await resolveSurname(db(), HODZIC);
    expect(queryPath.kind === "RESOLUTION" && queryPath.resolution.resolution_status).toBe(
      "REVIEW_REQUIRED",
    );
    expect(queryPath.kind === "RESOLUTION" && queryPath.resolution.resolved_surname_id).toBeNull();
  });

  it("the check constraint refuses a confusable flag without the mixed-script flag", async () => {
    await expect(
      sql`UPDATE surnames SET script_confusable_flag = true WHERE canonical_display = 'NOWAKTEST'`.execute(
        db(),
      ),
    ).rejects.toThrow(/surnames_confusable_implies_mixed/u);
  });

  it("a second import of the same bytes is a no-op, flags included", async () => {
    const bytes = syntheticCsv([
      ["NOWAKTEST", 5],
      [HODZIC, 2],
      [KATOVIC, 2],
    ]);
    const outcome = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_FEMALE_2026,
      bytes,
      expectedSha256: sha256Hex(bytes),
      rawPayload: FEMALE_PAYLOAD,
    });
    expect(outcome.kind).toBe("ALREADY_IMPORTED");
    const flagged = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM surnames WHERE mixed_script
    `.execute(db());
    expect(flagged.rows[0]?.n).toBe("2");
  });
});
