import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parsePolonaAltoPage } from "./alto.js";
import { PolonaShapeError } from "./errors.js";
import {
  parsePolonaDigitalObjectDetails,
  parsePolonaDigitalObjectFrontOfficeDetails,
  parsePolonaVirtualObjectFrontOfficeDetails,
} from "./objects.js";
import { parsePolonaFulltextSearch, parsePolonaSimpleSearch } from "./search.js";

/**
 * The parser against every committed Polona response (TASK-031 §8 item 17).
 *
 * The fixtures are real bytes captured on 2026-09-29, never edited: see
 * `fixtures/polona/source-manifest.json`. No test here reaches the network.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../../../../fixtures/polona");

interface ManifestFile {
  readonly path: string;
  readonly sha256: string;
  readonly kind: string;
  readonly withheld_hit_indexes_as_served?: readonly number[];
}

const manifest = JSON.parse(
  readFileSync(path.join(FIXTURES_DIR, "source-manifest.json"), "utf-8"),
) as { readonly files: readonly ManifestFile[] };

function readFixture(relative: string): string {
  return readFileSync(path.join(FIXTURES_DIR, relative), "utf-8");
}

function parseAsKind(file: ManifestFile): unknown {
  const text = readFixture(file.path);
  const withheldHits = file.withheld_hit_indexes_as_served?.length ?? 0;
  switch (file.kind) {
    case "search_simple":
      return parsePolonaSimpleSearch(text, { withheldHits });
    case "search_fulltext":
      return parsePolonaFulltextSearch(text, { withheldHits });
    case "digital_object_details":
      return parsePolonaDigitalObjectDetails(text);
    case "digital_object_front_office_details":
      return parsePolonaDigitalObjectFrontOfficeDetails(text);
    case "virtual_object_front_office_details":
      return parsePolonaVirtualObjectFrontOfficeDetails(text);
    case "ocr_alto_page":
      return parsePolonaAltoPage(text);
    default:
      throw new Error(`unknown fixture kind ${file.kind}`);
  }
}

const TRACE_OBJECT = "8f7cf574-b074-4313-b274-ca53e9459587";

describe("fixtures/polona — the manifest", () => {
  it("lists 136 files: 10 search responses, 125 object records and 1 OCR page", () => {
    const kinds = manifest.files.reduce<Record<string, number>>((tally, file) => {
      tally[file.kind] = (tally[file.kind] ?? 0) + 1;
      return tally;
    }, {});
    expect(kinds).toEqual({
      search_simple: 5,
      search_fulltext: 5,
      digital_object_details: 50,
      digital_object_front_office_details: 50,
      virtual_object_front_office_details: 25,
      ocr_alto_page: 1,
    });
  });

  it.each(manifest.files.map((file) => [file.path, file] as const))(
    "%s still has the digest the manifest pins",
    (_, file) => {
      const bytes = readFileSync(path.join(FIXTURES_DIR, file.path));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(file.sha256);
    },
  );
});

describe("fixtures/polona — every committed response parses", () => {
  it.each(manifest.files.map((file) => [file.path, file] as const))("%s", (_, file) => {
    expect(() => parseAsKind(file)).not.toThrow();
  });
});

describe("search responses", () => {
  it("reads a metadata search: NOWAK", () => {
    const page = parsePolonaSimpleSearch(readFixture("search/simple-1-nowak.json"));
    expect(page).toMatchObject({ totalElements: 11945, numberOfElements: 10, totalPages: 1195 });
    expect(page.hits).toHaveLength(10);
    expect(page.hits[0]).toMatchObject({
      objectId: "4c68543c-6f7d-439a-a502-f537795b0f7f",
      objectType: "VIRTUAL_OBJECT",
      hasOcrAlto: false,
      rights: {
        licence: "PROTECTED_NO_LICENCE",
        copyrightProtected: true,
        statement: "PROTECTED_READING_ROOMS",
      },
    });
  });

  it("reads the zero-hit answer, where Polona serves `hits: null`: ABADŻIJEW", () => {
    const page = parsePolonaSimpleSearch(readFixture("search/simple-4-abadzijew.json"));
    expect(page).toMatchObject({ totalElements: 0, numberOfElements: 0, totalPages: 0 });
    expect(page.hits).toEqual([]);
  });

  it("reads a full-text hit's page locator and OCR snippet: WIŚNIEWSKI", () => {
    const page = parsePolonaFulltextSearch(readFixture("search/fulltext-3-wisniewski.json"));
    const trace = page.hits.find((hit) => hit.objectId === TRACE_OBJECT);
    expect(trace).toMatchObject({
      contentId: "f8be2733-9661-43ac-b7a2-01acbe08747b",
      resourceUrl: "/download/digital-content/8802e7b5-bf41-4ed1-bf44-1eee464fbb0a",
      resourceId: "8802e7b5-bf41-4ed1-bf44-1eee464fbb0a",
      pageNumber: 1005,
      rights: { licence: "PUBLIC_DOMAIN", copyrightProtected: false, statement: "PUBLIC_DOMAIN" },
    });
    expect(trace?.highlights[0]).toMatch(/^<em>Wiśniewski<\/em> — <em>Wiśniewski<\/em>/);
  });

  it("accepts a trimmed response only when told how many hits were withheld", () => {
    const text = readFixture("search/fulltext-5-wilk.json");
    expect(parsePolonaFulltextSearch(text, { withheldHits: 3 }).hits).toHaveLength(7);
    expect(() => parsePolonaFulltextSearch(text)).toThrow(PolonaShapeError);
  });

  it("keeps only public-domain hits in the committed full-text responses", () => {
    for (const file of manifest.files.filter((entry) => entry.kind === "search_fulltext")) {
      const page = parsePolonaFulltextSearch(readFixture(file.path), {
        withheldHits: file.withheld_hit_indexes_as_served?.length ?? 0,
      });
      expect(page.hits.every((hit) => hit.rights.licence === "PUBLIC_DOMAIN")).toBe(true);
    }
  });
});

describe("object records", () => {
  it("reads the trace object's details: public domain, with a IIIF title page", () => {
    const details = parsePolonaDigitalObjectDetails(
      readFixture(`objects/digital-objects/${TRACE_OBJECT}.details.json`),
    );
    expect(details).toMatchObject({
      uuid: TRACE_OBJECT,
      titlePageImageInfoUrl:
        "https://polona.pl/iiif/3/295eb668-db90-401f-a87b-a5183eebe12a/info.json",
      rights: { licence: "PUBLIC_DOMAIN", statement: null },
      licence: {
        baseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
        englishName: "Public Domain Mark 1.0",
        downloadable: true,
      },
    });
  });

  it("reads the trace object's front-office record, rights statement included", () => {
    const record = parsePolonaDigitalObjectFrontOfficeDetails(
      readFixture(`objects/digital-objects/${TRACE_OBJECT}.front-office-details.json`),
    );
    expect(record.rights).toEqual({
      licence: "PUBLIC_DOMAIN",
      copyrightProtected: false,
      statement: "PUBLIC_DOMAIN",
    });
    expect(record.metadata.title).toBe(
      "Lista strat wojska polskiego : polegli i zmarli w wojnach 1918-1920.",
    );
    expect(record.instance).toEqual({ id: 10715, name: "Biblioteka Narodowa" });
  });

  it("reads a virtual object, which points at the digital object that contains it", () => {
    const record = parsePolonaVirtualObjectFrontOfficeDetails(
      readFixture(
        "objects/virtual-objects/1ce3f090-fb62-4302-8a11-96c2ed791c16.front-office-details.json",
      ),
    );
    expect(record).toMatchObject({
      parentDigitalObjectId: "9b8939bf-d2fe-4b89-9127-386130fb519f",
      rights: { licence: "PROTECTED_NO_LICENCE", statement: null },
      metadata: { title: "Pierwszy polski nomada : o Kazimierzu Nowaku" },
    });
  });
});

describe("the OCR page", () => {
  const page = parsePolonaAltoPage(
    readFixture("ocr/8802e7b5-bf41-4ed1-bf44-1eee464fbb0a.alto.xml"),
  );

  it("reads ALTO v2 in pixels, from ABBYY, with no word confidence", () => {
    expect(page).toMatchObject({
      measurementUnit: "pixel",
      processingDateTime: "2018-12-15",
      software: { creator: "ABBYY", name: "ABBYY Recognition Server", version: "4.0" },
      pageId: "Page1",
      physicalImageNumber: 1,
      printSpace: { hpos: 0, vpos: 0, width: 3012, height: 4053 },
    });
    expect(page.lines).toHaveLength(166);
    expect(page.lines.flatMap((line) => line.strings)).toHaveLength(437);
    expect(Object.keys(page.lines[0]!.strings[0]!)).not.toContain("confidence");
  });

  it("locates the matched surname by its box", () => {
    expect(page.lines[0]).toMatchObject({ text: "Wiśniewski — Wiśniewski" });
    expect(page.lines[0]!.strings[0]).toEqual({
      content: "Wiśniewski",
      style: "bold",
      hpos: 1494,
      vpos: 395,
      width: 309,
      height: 37,
    });
  });
});
