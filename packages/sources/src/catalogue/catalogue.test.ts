import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { rightsRefusal } from "../importer.js";
import { PESEL_SOURCE_KEY } from "../registry.js";
import {
  CLASSIFIED_CHECKED_AT,
  MVP_LABEL_PRODUCTION_STATUS,
  PERMISSION_DIMENSIONS,
  RESEARCH_CHECKED_AT,
  SOURCE_CATALOGUE,
} from "./catalogue.js";
import type { CanonicalMvpLabel, CatalogueBasis, CatalogueEntry } from "./catalogue.js";
import { SourceCatalogueError, validateSourceCatalogue } from "./validate.js";

/**
 * TASK-038 unit tests: the catalogue's contents against tasks/038 §5, and
 * against the evidence documents themselves, read from the repository.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function readDoc(relative: string): string {
  return readFileSync(path.join(REPO_ROOT, relative), "utf8");
}

/** The document each basis cites, as named in every entry's notes. */
const BASIS_DOC: Readonly<Record<CatalogueBasis, string>> = {
  CANONICAL_12_S7: "docs/canonical/12",
  RESEARCH_GSA_S2: "docs/library/NAME_ATLAS_GENEALOGY_SOURCE_ARCHITECTURE(1).md",
  RESEARCH_DTL_S6_S9: "docs/library/NAME_ATLAS_DATA_TRUTH_LAYER(1).md",
  RESEARCH_CANDIDATES: "docs/sources/candidate-sources.md",
  RESEARCH_INVENTORY: "docs/sources/INVENTORY.md",
};

const CANONICAL_12 = readDoc("docs/canonical/12_NAME_ATLAS_SOURCE_CONNECTOR_ARCHITECTURE.md");
const EVIDENCE_TEXT = [
  CANONICAL_12,
  readDoc("docs/library/NAME_ATLAS_GENEALOGY_SOURCE_ARCHITECTURE(1).md"),
  readDoc("docs/library/NAME_ATLAS_DATA_TRUTH_LAYER(1).md"),
  readDoc("docs/sources/candidate-sources.md"),
  readDoc("docs/sources/INVENTORY.md"),
].join("\n");

const classifiedEntries = SOURCE_CATALOGUE.filter((e) => e.basis === "CANONICAL_12_S7");
const researchEntries = SOURCE_CATALOGUE.filter((e) => e.basis !== "CANONICAL_12_S7");
const LEGACY_KEYS = ["pl_pradziad", "pl_sezam"];

/** The "MVP status" column of docs/canonical/12 §7, one label per table row. */
function canonicalSection7Labels(): string[] {
  const start = CANONICAL_12.indexOf("# 7. MVP SOURCE STATUS MATRIX");
  const end = CANONICAL_12.indexOf("# 8. RECOMMENDED MVP SOURCE STACK");
  const rows = CANONICAL_12.slice(start, end)
    .split("\n")
    .filter(
      (line) => line.startsWith("| ") && !line.startsWith("| Source") && !line.startsWith("|---"),
    );
  return rows.map((row) => {
    const cells = row.split("|").map((cell) => cell.trim());
    return (cells[cells.length - 2] ?? "").replaceAll("*", "");
  });
}

/** Source keys the onomastics importer registers from `sources/onomastics/`. */
function onomasticWorkKeys(): string[] {
  const dir = path.join(REPO_ROOT, "sources", "onomastics");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const parsed = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as {
        work?: { source_key?: string };
      };
      return parsed.work?.source_key ?? "";
    })
    .filter((key) => key !== "");
}

function countBy<T>(items: readonly T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return counts;
}

function withSource(
  entry: CatalogueEntry,
  source: Partial<CatalogueEntry["source"]>,
  rights: Partial<CatalogueEntry["rights"]> = {},
): CatalogueEntry {
  return {
    ...entry,
    source: { ...entry.source, ...source },
    rights: { ...entry.rights, ...rights },
  };
}

describe("catalogue contents (AC-01, AC-02)", () => {
  it("holds 96 entries: 21 classified, then 44 + 17 + 11 + 3 from the research lists", () => {
    const byBasis = countBy(SOURCE_CATALOGUE.map((e) => e.basis));
    expect(SOURCE_CATALOGUE).toHaveLength(96);
    expect(byBasis.get("CANONICAL_12_S7")).toBe(21);
    expect(byBasis.get("RESEARCH_GSA_S2")).toBe(44);
    expect(byBasis.get("RESEARCH_DTL_S6_S9")).toBe(17);
    expect(byBasis.get("RESEARCH_CANDIDATES")).toBe(11);
    expect(byBasis.get("RESEARCH_INVENTORY")).toBe(3);
  });

  it("classifies the docs/canonical/12 §7 rows, minus PESEL and Polona, with Skanoteka/Metryki split", () => {
    const expected = countBy(canonicalSection7Labels());
    expect(canonicalSection7Labels()).toHaveLength(22);
    // PESEL is the importer's; Polona's source default is D-021; the one
    // "PTG Skanoteka/Metryki" row is two services.
    expected.set("NOW", (expected.get("NOW") ?? 0) - 1);
    expected.set("RIGHTS-FILTERED", (expected.get("RIGHTS-FILTERED") ?? 0) - 1);
    expected.set("PARTNER", (expected.get("PARTNER") ?? 0) + 1);
    for (const [label, n] of [...expected]) {
      if (n === 0) expected.delete(label);
    }

    const actual = countBy(classifiedEntries.map((e) => e.mvp_label));
    expect(new Map([...actual].sort())).toEqual(new Map([...expected].sort()));
  });

  it("uses unique snake_case keys, none of them PESEL's", () => {
    const keys = SOURCE_CATALOGUE.map((e) => e.source.source_key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key).toMatch(/^[a-z0-9]+(?:_[a-z0-9]+)+$/u);
    }
    expect(keys).not.toContain(PESEL_SOURCE_KEY);
  });

  it("shares no key with a work the onomastics importer registers (ADR-0008)", () => {
    const workKeys = onomasticWorkKeys();
    expect(workKeys.length).toBeGreaterThan(0);
    const keys = new Set(SOURCE_CATALOGUE.map((e) => e.source.source_key));
    for (const key of workKeys) {
      expect(keys.has(key), key).toBe(false);
    }
  });

  it("leaves Polona out: its source default is open decision D-021", () => {
    for (const { source } of SOURCE_CATALOGUE) {
      expect(source.source_key).not.toMatch(/polona/u);
      expect(source.name).not.toMatch(/^Polona\b/u);
    }
  });

  it("gives every entry a name and a non-empty, upper-case geographic scope", () => {
    for (const { source } of SOURCE_CATALOGUE) {
      expect(source.name.trim()).not.toBe("");
      expect(source.geographic_scope.length).toBeGreaterThan(0);
      for (const token of source.geographic_scope) {
        expect(token).toMatch(/^[A-Z_]+$/u);
      }
    }
  });
});

describe("status rules (tasks/038 §5 rules 1–3, AC-03, AC-11)", () => {
  it("claims no approval anywhere", () => {
    for (const { source, rights } of SOURCE_CATALOGUE) {
      expect(source.production_status).not.toBe("APPROVED");
      expect(rights.review_status).not.toBe("APPROVED");
    }
  });

  it("derives every classified production_status from its §7 label", () => {
    for (const entry of classifiedEntries) {
      const label = entry.mvp_label as CanonicalMvpLabel;
      expect(entry.source.production_status, entry.source.source_key).toBe(
        MVP_LABEL_PRODUCTION_STATUS[label],
      );
    }
  });

  it("marks research-only entries LEGAL_REVIEW_REQUIRED, except the two legacy systems", () => {
    for (const { source } of researchEntries) {
      const expected = LEGACY_KEYS.includes(source.source_key)
        ? "DEPRECATED"
        : "LEGAL_REVIEW_REQUIRED";
      expect(source.production_status, source.source_key).toBe(expected);
    }
  });

  it("sets review_status BLOCKED exactly when the source is BLOCKED", () => {
    for (const { source, rights } of SOURCE_CATALOGUE) {
      expect(rights.review_status === "BLOCKED", source.source_key).toBe(
        source.production_status === "BLOCKED",
      );
    }
    expect(SOURCE_CATALOGUE.filter((e) => e.source.production_status === "BLOCKED")).toHaveLength(
      5,
    );
  });

  it("makes the importer's rights gate refuse every BLOCKED source", () => {
    for (const { source, rights } of SOURCE_CATALOGUE) {
      if (source.production_status === "BLOCKED") {
        expect(rights.automated_access).toBe("PROHIBITED");
        expect(rightsRefusal(rights)).not.toBeNull();
      }
    }
  });
});

describe("rights rules (tasks/038 §5 rules 4–7)", () => {
  it("leaves every research-only rights dimension UNKNOWN", () => {
    for (const { source, rights } of researchEntries) {
      for (const dimension of PERMISSION_DIMENSIONS) {
        expect(rights[dimension], `${source.source_key}.${dimension}`).toBe("UNKNOWN");
      }
      expect(rights.local_cache).toBe("UNKNOWN");
      expect(rights.terms_version).toBeNull();
      expect(rights.rights_url).toBeNull();
    }
  });

  it("allows nothing on a classified source whose evidence names no open licence or explicit permission", () => {
    const openOrExplicit = new Set([
      "pl_teryt",
      "pl_gus_geocoder",
      "global_wikidata",
      "global_geonames",
      "global_getty_tgn",
      "eu_europeana",
    ]);
    for (const { source, rights } of classifiedEntries) {
      if (openOrExplicit.has(source.source_key)) {
        continue;
      }
      for (const dimension of PERMISSION_DIMENSIONS) {
        expect(rights[dimension], `${source.source_key}.${dimension}`).not.toBe("ALLOWED");
      }
      expect(rights.local_cache).not.toBe("ALLOWED");
    }
  });

  it("fails closed on attribution and contact", () => {
    for (const { basis, source, rights } of SOURCE_CATALOGUE) {
      expect(rights.attribution_text).toBeNull();
      if (!rights.attribution_required) {
        expect(basis, source.source_key).toBe("CANONICAL_12_S7");
        expect(rights.terms_version, source.source_key).toBe("CC0");
      }
      if (!rights.contact_required) {
        expect(basis, source.source_key).toBe("CANONICAL_12_S7");
        expect(source.production_status, source.source_key).toBe("LEGAL_REVIEW_REQUIRED");
      }
    }
  });

  it("uses the fixed checked_at constant for each basis", () => {
    for (const { basis, rights } of SOURCE_CATALOGUE) {
      expect(rights.checked_at).toBe(
        basis === "CANONICAL_12_S7" ? CLASSIFIED_CHECKED_AT : RESEARCH_CHECKED_AT,
      );
    }
  });

  it("states that no legal review has been performed, and names the evidence", () => {
    for (const { basis, rights } of SOURCE_CATALOGUE) {
      expect(rights.notes).toContain("NO LEGAL REVIEW HAS BEEN PERFORMED");
      expect(rights.notes).toContain(BASIS_DOC[basis]);
    }
  });

  it("keeps the rights owner equal to the publisher", () => {
    for (const { source, rights } of SOURCE_CATALOGUE) {
      expect(rights.source_owner).toBe(source.publisher);
    }
  });
});

describe("provenance (tasks/038 §5 rules 8–11, AC-04)", () => {
  it("records the authority tier as a provisional evaluation, and that nothing was ingested", () => {
    for (const { source } of SOURCE_CATALOGUE) {
      expect(source.methodology_notes).toContain("provisional evaluation");
      expect(source.methodology_notes).toContain("no data from this source has been retrieved");
    }
  });

  it("quotes the §7 label or the research verdict in the methodology notes", () => {
    for (const entry of SOURCE_CATALOGUE) {
      if (entry.basis === "CANONICAL_12_S7") {
        expect(entry.research_verdict).toBeNull();
        expect(entry.source.methodology_notes).toContain(`as "${String(entry.mvp_label)}"`);
      } else {
        expect(entry.mvp_label).toBeNull();
        expect(entry.research_verdict).not.toBeNull();
        expect(entry.source.methodology_notes).toContain(`"${String(entry.research_verdict)}"`);
        expect(entry.source.methodology_notes).toContain(BASIS_DOC[entry.basis]);
      }
    }
  });

  it("takes every URL verbatim from the evidence documents, without tracking parameters", () => {
    const urls = SOURCE_CATALOGUE.flatMap(({ source, rights }) =>
      [source.homepage_or_reference_url, rights.rights_url].filter(
        (url): url is string => url !== null,
      ),
    );
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//u);
      expect(url).not.toMatch(/utm_|authuser|[?&]sid=|doing_wp_cron/u);
      expect(EVIDENCE_TEXT.includes(url), url).toBe(true);
    }
  });

  it("stores no coverage dates", () => {
    for (const { source } of SOURCE_CATALOGUE) {
      expect(source.temporal_from).toBeNull();
      expect(source.temporal_to).toBeNull();
    }
  });
});

describe("validateSourceCatalogue (AC-10)", () => {
  const first = SOURCE_CATALOGUE[0] as CatalogueEntry;
  const blocked = SOURCE_CATALOGUE.find(
    (e) => e.source.production_status === "BLOCKED",
  ) as CatalogueEntry;

  it("accepts the catalogue", () => {
    expect(() => {
      validateSourceCatalogue(SOURCE_CATALOGUE);
    }).not.toThrow();
  });

  it("refuses a duplicate key", () => {
    expect(() => {
      validateSourceCatalogue([first, first]);
    }).toThrow(/duplicate source_key/u);
  });

  it("refuses the PESEL key", () => {
    expect(() => {
      validateSourceCatalogue([withSource(first, { source_key: PESEL_SOURCE_KEY })]);
    }).toThrow(/reserved/u);
  });

  it("refuses a malformed key", () => {
    expect(() => {
      validateSourceCatalogue([withSource(first, { source_key: "Teryt" })]);
    }).toThrow(SourceCatalogueError);
  });

  it("refuses an APPROVED claim", () => {
    expect(() => {
      validateSourceCatalogue([withSource(first, {}, { review_status: "APPROVED" })]);
    }).toThrow(/APPROVED/u);
  });

  it("refuses a BLOCKED source whose automated access is not PROHIBITED", () => {
    expect(() => {
      validateSourceCatalogue([withSource(blocked, {}, { automated_access: "UNKNOWN" })]);
    }).toThrow(/automated_access/u);
  });

  it("refuses a production_status that does not follow the §7 label", () => {
    expect(() => {
      validateSourceCatalogue([
        withSource(
          blocked,
          { production_status: "LEGAL_REVIEW_REQUIRED" },
          { review_status: "LEGAL_REVIEW_REQUIRED" },
        ),
      ]);
    }).toThrow(/§7 label/u);
  });
});
