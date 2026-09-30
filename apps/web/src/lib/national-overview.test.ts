import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FIXTURE_PATHS,
  GENERATED_OVERVIEW_PATH,
  HIGHEST_COUNTS_IN_EXCERPT,
  OverviewSourceError,
  buildNationalOverview,
  findWorkspaceRoot,
  loadNationalOverview,
  renderOverviewModule,
} from "./national-overview.js";

const root = findWorkspaceRoot(process.cwd());
const manifestText = readFileSync(join(root, "fixtures/pesel/source-manifest.json"), "utf8");
const maleCsv = readFileSync(join(root, FIXTURE_PATHS.national_male));
const femaleCsv = readFileSync(join(root, FIXTURE_PATHS.national_female));

interface ManifestResource {
  role: string;
  row_count_excluding_header: number;
  data_date: string;
  created: string;
}

/** A fresh, mutable copy of the real manifest for each fail-closed case. */
function manifest(): { dataset: Record<string, unknown>; resources: ManifestResource[] } {
  return JSON.parse(manifestText) as {
    dataset: Record<string, unknown>;
    resources: ManifestResource[];
  };
}

function resource(m: ReturnType<typeof manifest>, role: string): ManifestResource {
  const found = m.resources.find((r) => r.role === role);
  if (found === undefined) throw new Error(`fixture manifest lacks ${role}`);
  return found;
}

describe("loadNationalOverview", () => {
  const overview = loadNationalOverview(root);
  const m = manifest();

  it("passes the manifest's list sizes through unchanged", () => {
    expect(overview.lists.male.surnamesListed).toBe(
      resource(m, "national_male").row_count_excluding_header,
    );
    expect(overview.lists.female.surnamesListed).toBe(
      resource(m, "national_female").row_count_excluding_header,
    );
    expect(overview.lists.male.surnamesListed).toBe(408182);
    expect(overview.lists.female.surnamesListed).toBe(420082);
  });

  it("never holds a total of the two lists", () => {
    const sum = overview.lists.male.surnamesListed + overview.lists.female.surnamesListed;
    expect(JSON.stringify(overview)).not.toContain(String(sum));
  });

  it("carries the reference date and the separate portal date", () => {
    expect(overview.referenceDate).toBe("2026-01-20");
    expect(overview.postedDate).toBe("2026-01-28");
  });

  it("takes the head of each excerpt in the publisher's order", () => {
    for (const list of [overview.lists.male, overview.lists.female]) {
      expect(list.highestCounts).toHaveLength(HIGHEST_COUNTS_IN_EXCERPT);
      const counts = list.highestCounts.map((row) => row.count);
      expect(counts).toEqual([...counts].sort((a, b) => b - a));
    }
    expect(overview.lists.male.highestCounts[0]).toEqual({ surname: "NOWAK", count: 98387 });
    expect(overview.lists.female.highestCounts[0]).toEqual({ surname: "NOWAK", count: 99738 });
  });

  it("keeps specimen spellings byte-for-byte", () => {
    expect(overview.heroSpecimen).toEqual({ surname: "NOWAK", male: 98387, female: 99738 });
    expect(overview.spellingSpecimens).toEqual([
      { surname: "NGUYỄN", male: 3730, female: 2132 },
      { surname: "MÜLLER", male: 1462, female: 1874 },
    ]);
  });

  it("states the smallest published count rather than implying a zero", () => {
    expect(overview.smallestPublishedCount).toBe(2);
  });

  it("reports the trend as insufficient data with one edition held", () => {
    expect(overview.trend).toEqual({ status: "INSUFFICIENT_DATA", editionsHeld: ["2026-01-20"] });
  });
});

describe("the generated module the page imports", () => {
  it("matches what the verified records produce today", () => {
    const committed = readFileSync(join(root, GENERATED_OVERVIEW_PATH), "utf8");
    // On failure: run `pnpm --filter web generate:overview` and review the diff.
    expect(committed).toBe(renderOverviewModule(loadNationalOverview(root)));
  });
});

describe("buildNationalOverview fails closed", () => {
  const build =
    (m: unknown, male: Uint8Array = maleCsv, female: Uint8Array = femaleCsv) =>
    () =>
      buildNationalOverview({ manifest: m, maleCsv: male, femaleCsv: female });

  it("on a missing list size", () => {
    const m = manifest();
    delete (resource(m, "national_male") as Partial<ManifestResource>).row_count_excluding_header;
    expect(build(m)).toThrow(OverviewSourceError);
  });

  it("on reference dates that differ between the lists", () => {
    const m = manifest();
    resource(m, "national_female").data_date = "2025-01-20";
    expect(build(m)).toThrow(/different reference dates/);
  });

  it("on a second resource for the same list", () => {
    const m = manifest();
    m.resources.push({ ...resource(m, "national_male") });
    expect(build(m)).toThrow(/exactly one national_male/);
  });

  it("on an excerpt head out of descending order", () => {
    const text = maleCsv.toString("utf8").replace("KOWALSKI,66589", "KOWALSKI,99999");
    expect(build(manifest(), Buffer.from(text, "utf8"))).toThrow(/not in descending order/);
  });

  it("on an excerpt the PESEL parser rejects", () => {
    const text = maleCsv.toString("utf8").replace("Nazwisko aktualne", "Surname");
    expect(build(manifest(), Buffer.from(text, "utf8"))).toThrow();
  });
});
