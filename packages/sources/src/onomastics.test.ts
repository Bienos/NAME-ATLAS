import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ADMISSIBLE_RELIABILITY_TIERS,
  licenceNote,
  onomasticContentHash,
  parseOnomasticSource,
} from "./onomastics.js";

/**
 * TASK-022 AC-3, AC-4, AC-6 — onomastic source admissibility (ADR-0008 §4, §6).
 *
 * The fixtures are the committed synthetic ones, which is deliberate: every
 * value in them is a placeholder, and `fixtures/onomastics/README.md` says so.
 * Nothing here asserts anything about Polish onomastic scholarship.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(path.join(repoRoot, "fixtures/onomastics", name), "utf8"));

const VALID = fixture("synthetic-test-work.json") as Record<string, unknown>;

function withWork(patch: Record<string, unknown>): unknown {
  return { ...VALID, work: { ...(VALID["work"] as Record<string, unknown>), ...patch } };
}

function withEntry(patch: Record<string, unknown>): unknown {
  const entries = VALID["entries"] as Record<string, unknown>[];
  return { ...VALID, entries: [{ ...entries[0], ...patch }] };
}

describe("the committed fixture parses", () => {
  it("accepts it, and reports it as synthetic", () => {
    const outcome = parseOnomasticSource(VALID);
    expect(outcome.kind).toBe("PARSED");
    if (outcome.kind !== "PARSED") return;
    expect(outcome.file.synthetic).toBe(true);
    expect(outcome.file.entries).toHaveLength(2);
    expect(outcome.file.work.reliability_tier).toBe("C_SCHOLARLY_SECONDARY");
  });

  it("renders a licence note naming the work and its basis", () => {
    const outcome = parseOnomasticSource(VALID);
    if (outcome.kind !== "PARSED") throw new Error("unreachable");
    const note = licenceNote(outcome.file.work);
    expect(note).toContain("1900");
    expect(note).toContain("Licence basis: public domain");
  });
});

describe("AC-3: an entry that cannot be cited is refused", () => {
  it("refuses a missing work title", () => {
    const outcome = parseOnomasticSource(withWork({ title: "  " }));
    expect(outcome.kind).toBe("REFUSED");
    if (outcome.kind !== "REFUSED") return;
    expect(outcome.problems.join(" ")).toMatch(/work\.title is required/u);
  });

  it("refuses a missing author or publisher", () => {
    const outcome = parseOnomasticSource(withWork({ author_or_publisher: null }));
    if (outcome.kind !== "REFUSED") throw new Error("expected a refusal");
    expect(outcome.problems.join(" ")).toMatch(/author_or_publisher is required/u);
  });

  it("refuses a missing or non-integer year", () => {
    for (const year of [null, "1900", 1900.5]) {
      const outcome = parseOnomasticSource(withWork({ year }));
      if (outcome.kind !== "REFUSED") throw new Error(`expected a refusal for ${String(year)}`);
      expect(outcome.problems.join(" ")).toMatch(/work\.year is required/u);
    }
  });

  it("refuses an entry with no locator — a citation a reader cannot check", () => {
    const outcome = parseOnomasticSource(withEntry({ locator: "" }));
    if (outcome.kind !== "REFUSED") throw new Error("expected a refusal");
    expect(outcome.problems.join(" ")).toMatch(/locator is required/u);
  });

  it("refuses an entry with no gloss", () => {
    const outcome = parseOnomasticSource(withEntry({ literal_gloss: null }));
    if (outcome.kind !== "REFUSED") throw new Error("expected a refusal");
    expect(outcome.problems.join(" ")).toMatch(/literal_gloss is required/u);
  });

  it("collects every problem rather than stopping at the first", () => {
    const broken = { ...VALID, work: { source_key: "x" }, entries: [{}] };
    const outcome = parseOnomasticSource(broken);
    if (outcome.kind !== "REFUSED") throw new Error("expected a refusal");
    expect(outcome.problems.length).toBeGreaterThan(3);
  });
});

describe("AC-3: a licence basis must be stated", () => {
  it("refuses a missing licence basis", () => {
    const outcome = parseOnomasticSource(withWork({ licence_basis: undefined }));
    if (outcome.kind !== "REFUSED") throw new Error("expected a refusal");
    expect(outcome.problems.join(" ")).toMatch(/licence_basis is missing/u);
  });

  it("refuses PUBLIC_DOMAIN with no reason — 'it is old' is not a reason", () => {
    const outcome = parseOnomasticSource(withWork({ licence_basis: { kind: "PUBLIC_DOMAIN" } }));
    if (outcome.kind !== "REFUSED") throw new Error("expected a refusal");
    expect(outcome.problems.join(" ")).toMatch(/reason is required for PUBLIC_DOMAIN/u);
  });

  it("refuses OPEN_LICENCE that does not name the licence", () => {
    const outcome = parseOnomasticSource(withWork({ licence_basis: { kind: "OPEN_LICENCE" } }));
    if (outcome.kind !== "REFUSED") throw new Error("expected a refusal");
    expect(outcome.problems.join(" ")).toMatch(/must name the licence/u);
  });

  it("refuses an invented licence kind", () => {
    const outcome = parseOnomasticSource(withWork({ licence_basis: { kind: "PROBABLY_FINE" } }));
    if (outcome.kind !== "REFUSED") throw new Error("expected a refusal");
    expect(outcome.problems.join(" ")).toMatch(/not a stated basis/u);
  });

  it("accepts each of the three stated bases", () => {
    const bases = [
      { kind: "PUBLIC_DOMAIN", reason: "author died in 1939" },
      { kind: "OPEN_LICENCE", licence: "CC BY 4.0" },
      { kind: "LICENCE_AGREEMENT", reference: "agreement 2026-01, on file" },
    ];
    for (const licence_basis of bases) {
      expect(parseOnomasticSource(withWork({ licence_basis })).kind).toBe("PARSED");
    }
  });
});

describe("AC-6: the reliability tier gate", () => {
  it("accepts every admissible tier", () => {
    for (const reliability_tier of ADMISSIBLE_RELIABILITY_TIERS) {
      expect(parseOnomasticSource(withWork({ reliability_tier })).kind).toBe("PARSED");
    }
  });

  it("refuses D_TERTIARY_LEAD", () => {
    const outcome = parseOnomasticSource(withWork({ reliability_tier: "D_TERTIARY_LEAD" }));
    if (outcome.kind !== "REFUSED") throw new Error("expected a refusal");
    expect(outcome.problems.join(" ")).toMatch(/reliability_tier must be one of/u);
  });

  it("refuses an unrecognised tier", () => {
    expect(parseOnomasticSource(withWork({ reliability_tier: "EXCELLENT" })).kind).toBe("REFUSED");
  });
});

describe("AC-4: the synthetic flag must be explicit", () => {
  it("refuses a file that does not state it", () => {
    const { synthetic: _omitted, ...withoutFlag } = VALID;
    const outcome = parseOnomasticSource(withoutFlag);
    if (outcome.kind !== "REFUSED") throw new Error("expected a refusal");
    expect(outcome.problems.join(" ")).toMatch(/synthetic must be stated explicitly/u);
  });

  it("parses a file that states false", () => {
    expect(parseOnomasticSource({ ...VALID, synthetic: false }).kind).toBe("PARSED");
  });
});

describe("structural refusals", () => {
  it("refuses a non-object", () => {
    expect(parseOnomasticSource([]).kind).toBe("REFUSED");
    expect(parseOnomasticSource(null).kind).toBe("REFUSED");
    expect(parseOnomasticSource("{}").kind).toBe("REFUSED");
  });

  it("refuses an unsupported format version", () => {
    const outcome = parseOnomasticSource({ ...VALID, format_version: 2 });
    if (outcome.kind !== "REFUSED") throw new Error("expected a refusal");
    expect(outcome.reason_code).toBe("UNSUPPORTED_FORMAT_VERSION");
  });

  it("refuses an empty entry list — an import that adds nothing is a mistake", () => {
    const outcome = parseOnomasticSource({ ...VALID, entries: [] });
    if (outcome.kind !== "REFUSED") throw new Error("expected a refusal");
    expect(outcome.problems.join(" ")).toMatch(/entries is empty/u);
  });
});

describe("content hash", () => {
  it("is a lowercase 64-character hex digest, stable across calls", () => {
    const bytes = new TextEncoder().encode(JSON.stringify(VALID));
    const hash = onomasticContentHash(bytes);
    expect(hash).toMatch(/^[0-9a-f]{64}$/u);
    expect(onomasticContentHash(bytes)).toBe(hash);
  });

  it("changes when a single byte changes", () => {
    const a = onomasticContentHash(new TextEncoder().encode("a"));
    const b = onomasticContentHash(new TextEncoder().encode("b"));
    expect(a).not.toBe(b);
  });
});

/**
 * TASK-046 — the committed real source files. `extras.sh` imports every file in
 * `sources/onomastics/`, so each one must stay admissible, real, and free of a
 * surname listed twice (the importer would store both, and the claim would
 * count one work's entry as two interpretations).
 */
describe("the committed real source files", () => {
  const dir = path.join(repoRoot, "sources/onomastics");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

  it("exist", () => {
    expect(files).toEqual(
      expect.arrayContaining(["buryan-1933.json", "onomastica-64-16-walkowiak.json"]),
    );
  });

  it.each(files)("%s parses as admissible, is not synthetic, and lists each surname once", (f) => {
    const raw = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Record<string, unknown>;
    expect(raw["synthetic"]).toBe(false);
    const outcome = parseOnomasticSource(raw);
    expect(outcome.kind).toBe("PARSED");
    if (outcome.kind !== "PARSED") return;
    const surnames = outcome.file.entries.map((e) => e.surname);
    expect(surnames.length).toBeGreaterThan(0);
    expect(new Set(surnames).size).toBe(surnames.length);
  });

  it("keys each work by a distinct source_key", () => {
    const keys = files.map(
      (f) =>
        (JSON.parse(readFileSync(path.join(dir, f), "utf8")) as { work: { source_key: string } })
          .work.source_key,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
