import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  POLONA_LICENCES,
  POLONA_RIGHTS_MAPPING,
  POLONA_RIGHTS_STATEMENTS,
  classifyPolonaRights,
  polonaRightsLayer,
} from "./rights.js";
import type { PolonaRightsMappingRow, PolonaStatementKey } from "./rights.js";
import { parsePolonaSimpleSearch } from "./search.js";

/**
 * The rights vocabulary and its mapping onto ADR-0007 (TASK-031 §8 items
 * 10–11). The evaluation of the mapped values through `rights.ts` lives in
 * `packages/truth/src/polona-rights.test.ts`, because `truth` depends on this
 * package and not the reverse.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../../../..");

describe("the mapping table", () => {
  it("maps every rights combination the parser accepts, and each to exactly one row", () => {
    for (const licence of POLONA_LICENCES) {
      for (const statement of [...licence.statements, null]) {
        const rights = classifyPolonaRights(
          {
            licenceName: licence.baseName,
            copyrightProtected: licence.copyrightProtected,
            statement: statement === null ? null : POLONA_RIGHTS_STATEMENTS[statement],
          },
          "$",
        );
        const matching = POLONA_RIGHTS_MAPPING.filter(
          (row) =>
            row.licence === rights.licence &&
            (row.statement === "ANY" || row.statement === (statement ?? "NONE")),
        );
        expect(matching, `${licence.key} / ${statement}`).toHaveLength(1);
        expect(() => polonaRightsLayer(rights)).not.toThrow();
      }
    }
  });

  it("grants ALLOWED only where Polona grants the use in words: the public-domain licence", () => {
    for (const row of POLONA_RIGHTS_MAPPING) {
      const granted = [
        row.metadata_rights,
        row.transcription_rights,
        row.image_rights,
        row.commercial_use,
        row.redistribution,
      ].includes("ALLOWED");
      expect(granted, `${row.licence} / ${row.statement}`).toBe(row.licence === "PUBLIC_DOMAIN");
    }
  });

  it("never states a metadata licence, because Polona states none", () => {
    expect(new Set(POLONA_RIGHTS_MAPPING.map((row) => row.metadata_rights))).toEqual(
      new Set(["UNKNOWN"]),
    );
  });

  it("carries each licence's own URL as the rights URL", () => {
    const layer = polonaRightsLayer({
      licence: "PUBLIC_DOMAIN",
      copyrightProtected: false,
      statement: "PUBLIC_DOMAIN",
    });
    expect(layer.rights_url).toBe("https://creativecommons.org/publicdomain/mark/1.0/");
    expect(layer.attribution_text).toBeNull();
  });

  it("is the table docs/sources/polona.md shows, row for row", () => {
    const doc = readFileSync(path.join(REPO, "docs/sources/polona.md"), "utf-8");
    const block =
      /<!-- polona-rights-mapping:start -->\n([\s\S]*?)\n<!-- polona-rights-mapping:end -->/.exec(
        doc,
      );
    expect(block, "the mapping table's markers").not.toBeNull();
    const rows = block![1]!
      .split("\n")
      .slice(2)
      .map((line) =>
        line
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim().replaceAll("`", "")),
      );
    const fromDoc: PolonaRightsMappingRow[] = rows.map((cells) => {
      const [
        licenceName,
        statement,
        metadata,
        transcription,
        image,
        commercial,
        redistribution,
        attribution,
      ] = cells as [string, string, string, string, string, string, string, string];
      const licence = POLONA_LICENCES.find((candidate) => candidate.baseName === licenceName);
      expect(licence, licenceName).toBeDefined();
      return {
        licence: licence!.key,
        statement:
          statement === "any observed"
            ? "ANY"
            : statement === "none"
              ? "NONE"
              : (statement as PolonaStatementKey),
        metadata_rights: metadata,
        transcription_rights: transcription,
        image_rights: image,
        commercial_use: commercial,
        redistribution,
        attribution_required: attribution.startsWith("yes"),
      } as PolonaRightsMappingRow;
    });
    expect(fromDoc).toEqual(POLONA_RIGHTS_MAPPING);
  });
});

describe("the statement only withheld hits carried", () => {
  it("is accepted on a limited-licence hit, and maps commercial use to PROHIBITED", () => {
    // Every committed hit that carries it was withheld (task §6), so the case is
    // built from a committed limited-licence hit with the served statement put
    // in place of its opaque one.
    const text = readFileSync(
      path.join(REPO, "fixtures/polona/search/simple-1-nowak.json"),
      "utf-8",
    );
    const document = JSON.parse(text) as {
      hits: { expandedFields: { rights: { values: string[] } } }[];
    };
    document.hits[6]!.expandedFields.rights.values = [
      POLONA_RIGHTS_STATEMENTS.PUBLISHER_CONSENT_NON_COMMERCIAL,
    ];
    const hit = parsePolonaSimpleSearch(JSON.stringify(document)).hits[6]!;
    expect(hit.rights).toEqual({
      licence: "PROTECTED_LIMITED_LICENCE",
      copyrightProtected: false,
      statement: "PUBLISHER_CONSENT_NON_COMMERCIAL",
    });
    expect(polonaRightsLayer(hit.rights)).toMatchObject({
      transcription_rights: "UNKNOWN",
      image_rights: "UNKNOWN",
      commercial_use: "PROHIBITED",
    });
  });
});
