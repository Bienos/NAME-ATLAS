import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { canonicalKey } from "@name-atlas/resolver";
import { givenNameMeaningRecordId, parseGivenNameMeaningFile } from "./meanings.js";

/**
 * TASK-147 AC-3: what a first-name meaning file may hold (D-046). The two
 * committed files are parsed as they are; the refusals edit one real entry.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const file = (name: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(path.join(repoRoot, "sources/given-name-meanings", name), "utf8"),
  ) as Record<string, unknown>;
const YONGE = file("yonge-1884.json");
const entries = (f: Record<string, unknown>) => f["entries"] as Record<string, unknown>[];

/** Yonge's file with its first entry patched. */
function withEntry(patch: Record<string, unknown>): unknown {
  const [first, ...rest] = entries(YONGE);
  return { ...YONGE, entries: [{ ...first, ...patch }, ...rest] };
}
const refusal = (raw: unknown): readonly string[] => {
  const parsed = parseGivenNameMeaningFile(raw);
  return parsed.kind === "REFUSED" ? parsed.problems : [];
};

describe("the committed first-name meaning files", () => {
  it("parse, one entry per name, each quoted with its page", () => {
    for (const [name, count] of [
      ["buryan-1933.json", 112],
      ["yonge-1884.json", 86],
      ["bruckner-1927.json", 33],
    ] as const) {
      const parsed = parseGivenNameMeaningFile(file(name));
      if (parsed.kind !== "PARSED") throw new Error(`${name}: ${parsed.problems.join("; ")}`);
      expect(parsed.file.synthetic).toBe(false);
      expect(parsed.file.entries).toHaveLength(count);
      expect(new Set(parsed.file.entries.map((e) => canonicalKey(e.given_name))).size).toBe(count);
    }
  });

  it("translate every Yonge gloss, as Name Atlas's, and no Buryan one", () => {
    const yonge = parseGivenNameMeaningFile(YONGE);
    const buryan = parseGivenNameMeaningFile(file("buryan-1933.json"));
    if (yonge.kind !== "PARSED" || buryan.kind !== "PARSED") throw new Error("not parsed");
    expect(yonge.file.entries.every((e) => e.translation?.by === "Name Atlas")).toBe(true);
    expect(buryan.file.entries.every((e) => e.translation === null)).toBe(true);
    expect(givenNameMeaningRecordId(yonge.file.work)).toBe(
      "yonge_1884_history_of_christian_names:1884:given-names",
    );
  });
});

describe("parseGivenNameMeaningFile refuses (AC-3)", () => {
  it("an entry stating neither an origin nor a meaning", () => {
    expect(
      refusal(withEntry({ origin: null, literal_gloss: null, translation: null })),
    ).toContainEqual("entries[0] states neither an origin nor a meaning");
  });

  it("a translation by anyone but Name Atlas, or with no gloss to translate", () => {
    expect(
      refusal(withEntry({ translation: { language: "pl", text: "perła", by: "Wikipedia" } })),
    ).toContainEqual('entries[0].translation.by must be "Name Atlas" (D-046 §2)');
    expect(refusal(withEntry({ literal_gloss: null }))).toContainEqual(
      "entries[0].translation has no gloss to translate",
    );
  });

  it("an origin code it does not know, or without the work's words", () => {
    expect(refusal(withEntry({ origin: { code: "xx", as_printed: "Gr." } }))[0]).toMatch(
      /^entries\[0\]\.origin\.code must be one of/u,
    );
    expect(refusal(withEntry({ origin: { code: "grc" } }))).toContainEqual(
      "entries[0].origin.as_printed (the work's words) is required",
    );
  });

  it("an entry with no page or no quotation, a name twice, and a surname file", () => {
    expect(refusal(withEntry({ locator: "" }))).toContainEqual(
      "entries[0].locator is required (ADR-0008 §4: citable)",
    );
    expect(refusal(withEntry({ quotation: null }))).toContainEqual(
      "entries[0].quotation (the work's words) is required",
    );
    const [first] = entries(YONGE);
    expect(refusal({ ...YONGE, entries: [first, first] })).toContainEqual(
      `entries[1] repeats entries[0] (${String(first?.["given_name"])})`,
    );
    const surnames = JSON.parse(
      readFileSync(path.join(repoRoot, "sources/onomastics/buryan-1933.json"), "utf8"),
    ) as unknown;
    expect(refusal(surnames)).toContainEqual('kind must be "GIVEN_NAME_MEANINGS"');
  });
});
