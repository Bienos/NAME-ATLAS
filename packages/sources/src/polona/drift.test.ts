import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parsePolonaAltoPage } from "./alto.js";
import { PolonaShapeError } from "./errors.js";
import type { PolonaDriftReason } from "./errors.js";
import {
  parsePolonaDigitalObjectDetails,
  parsePolonaDigitalObjectFrontOfficeDetails,
  parsePolonaVirtualObjectFrontOfficeDetails,
} from "./objects.js";
import { parsePolonaFulltextSearch, parsePolonaSimpleSearch } from "./search.js";

/**
 * The parser refuses each kind of drift (TASK-031 §4 item 10, §8 item 17).
 *
 * Every case starts from a real committed response, changes one thing, and
 * expects the matching `PolonaShapeError` reason. The unmutated response is
 * parsed first in each helper, so a case can only pass because of its
 * mutation.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../../../../fixtures/polona");

function readFixture(relative: string): string {
  return readFileSync(path.join(FIXTURES_DIR, relative), "utf-8");
}

type Json = { [key: string]: unknown };

function expectDrift(parse: () => unknown, reason: PolonaDriftReason, pathPart: string): void {
  let caught: unknown;
  try {
    parse();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(PolonaShapeError);
  expect((caught as PolonaShapeError).reasonCode).toBe(reason);
  expect((caught as PolonaShapeError).path).toContain(pathPart);
}

/** A mutated copy of a JSON fixture, run through `parse` after checking the original passes. */
function mutateJson(
  relative: string,
  parse: (text: string) => unknown,
  mutate: (document: Json) => void,
): () => unknown {
  const text = readFixture(relative);
  parse(text);
  const document = JSON.parse(text) as Json;
  mutate(document);
  const mutated = JSON.stringify(document);
  return () => parse(mutated);
}

function mutateText(
  relative: string,
  parse: (text: string) => unknown,
  mutate: (text: string) => string,
): () => unknown {
  const text = readFixture(relative);
  parse(text);
  const mutated = mutate(text);
  expect(mutated).not.toBe(text);
  return () => parse(mutated);
}

const SIMPLE = "search/simple-1-nowak.json";
const FULLTEXT = "search/fulltext-3-wisniewski.json";
const TRACE = "8f7cf574-b074-4313-b274-ca53e9459587";
const DETAILS = `objects/digital-objects/${TRACE}.details.json`;
const FRONT_OFFICE = `objects/digital-objects/${TRACE}.front-office-details.json`;
const VIRTUAL =
  "objects/virtual-objects/1ce3f090-fb62-4302-8a11-96c2ed791c16.front-office-details.json";
const ALTO = "ocr/8802e7b5-bf41-4ed1-bf44-1eee464fbb0a.alto.xml";

const simple = (text: string) => parsePolonaSimpleSearch(text);
const fulltext = (text: string) => parsePolonaFulltextSearch(text);
const details = (text: string) => parsePolonaDigitalObjectDetails(text);
const frontOffice = (text: string) => parsePolonaDigitalObjectFrontOfficeDetails(text);
const virtual = (text: string) => parsePolonaVirtualObjectFrontOfficeDetails(text);
const alto = (text: string) => parsePolonaAltoPage(text);

function hit(document: Json, index = 0): Json {
  return (document["hits"] as Json[])[index]!;
}

function attribute(document: Json, name: string, index = 0): Json {
  return (hit(document, index)["attributes"] as Json)[name] as Json;
}

describe("invalid_json", () => {
  it("refuses a truncated response", () => {
    expectDrift(
      mutateText(SIMPLE, simple, (text) => text.slice(0, -40)),
      "invalid_json",
      "$",
    );
  });
});

describe("missing_field", () => {
  it("refuses a page without totalElements", () => {
    expectDrift(
      mutateJson(SIMPLE, simple, (document) => {
        delete document["totalElements"];
      }),
      "missing_field",
      "$.totalElements",
    );
  });

  it("refuses a hit without its licence attribute", () => {
    expectDrift(
      mutateJson(FULLTEXT, fulltext, (document) => {
        delete (hit(document)["attributes"] as Json)["licenseName"];
      }),
      "missing_field",
      "$.hits[0].attributes.licenseName",
    );
  });

  it("refuses a hit without a rights field", () => {
    expectDrift(
      mutateJson(SIMPLE, simple, (document) => {
        delete (hit(document)["expandedFields"] as Json)["rights"];
      }),
      "missing_field",
      "$.hits[0].expandedFields.rights",
    );
  });

  it("refuses object details without a licence", () => {
    expectDrift(
      mutateJson(DETAILS, details, (document) => {
        delete document["license"];
      }),
      "missing_field",
      "$.license",
    );
  });

  it("refuses an OCR word without its text", () => {
    expectDrift(
      mutateText(ALTO, alto, (text) =>
        text.replace('<String STYLE="bold" CONTENT="Wiśniewski" ', '<String STYLE="bold" '),
      ),
      "missing_field",
      "@CONTENT",
    );
  });
});

describe("unexpected_field", () => {
  it("refuses a hit carrying a field never observed", () => {
    expectDrift(
      mutateJson(FULLTEXT, fulltext, (document) => {
        hit(document)["lineNumber"] = 3;
      }),
      "unexpected_field",
      "$.hits[0].lineNumber",
    );
  });

  it("refuses a front-office record carrying a metadata field never observed", () => {
    expectDrift(
      mutateJson(FRONT_OFFICE, frontOffice, (document) => {
        (document["metadata"] as Json)["licence"] = "CC BY 4.0";
      }),
      "unexpected_field",
      "$.metadata.licence",
    );
  });

  it("refuses OCR words that start carrying a confidence (WC)", () => {
    expectDrift(
      mutateText(ALTO, alto, (text) =>
        text.replace(
          'CONTENT="Wiśniewski" HEIGHT="37"',
          'CONTENT="Wiśniewski" WC="0.91" HEIGHT="37"',
        ),
      ),
      "unexpected_field",
      "@WC",
    );
  });
});

describe("wrong_type", () => {
  it("refuses a count served as a string", () => {
    expectDrift(
      mutateJson(SIMPLE, simple, (document) => {
        document["totalElements"] = "11945";
      }),
      "wrong_type",
      "$.totalElements",
    );
  });

  it("refuses copyrightProtected served as a string", () => {
    expectDrift(
      mutateJson(FULLTEXT, fulltext, (document) => {
        attribute(document, "copyrightProtected")["boolValue"] = "false";
      }),
      "wrong_type",
      "$.hits[0].attributes.copyrightProtected.boolValue",
    );
  });

  it("refuses an attribute whose value moved to another slot", () => {
    expectDrift(
      mutateJson(SIMPLE, simple, (document) => {
        const licence = attribute(document, "licenseName");
        licence["stringArrValues"] = [licence["stringValue"]];
      }),
      "wrong_type",
      "$.hits[0].attributes.licenseName.stringArrValues",
    );
  });

  it("refuses a non-integer OCR coordinate", () => {
    expectDrift(
      mutateText(ALTO, alto, (text) =>
        text.replace('VPOS="395" HPOS="1494"/>', 'VPOS="395" HPOS="1494.5"/>'),
      ),
      "wrong_type",
      "@HPOS",
    );
  });
});

describe("unexpected_value", () => {
  it("refuses an object type never observed", () => {
    expectDrift(
      mutateJson(SIMPLE, simple, (document) => {
        attribute(document, "objectType")["stringValue"] = "COLLECTION";
      }),
      "unexpected_value",
      "$.hits[0].attributes.objectType",
    );
  });

  it("refuses a virtual object in full-text results, where only digital objects were observed", () => {
    expectDrift(
      mutateJson(FULLTEXT, fulltext, (document) => {
        attribute(document, "objectType")["stringValue"] = "VIRTUAL_OBJECT";
      }),
      "unexpected_value",
      "$.hits[0].attributes.objectType",
    );
  });

  it("refuses a page locator that is not digits", () => {
    expectDrift(
      mutateJson(FULLTEXT, fulltext, (document) => {
        hit(document)["pageNumber"] = "1005v";
      }),
      "unexpected_value",
      "$.hits[0].pageNumber",
    );
  });

  it("refuses a resource URL of another shape", () => {
    expectDrift(
      mutateJson(FULLTEXT, fulltext, (document) => {
        hit(document)["resourceUrl"] = "/download/page/8802e7b5-bf41-4ed1-bf44-1eee464fbb0a";
      }),
      "unexpected_value",
      "$.hits[0].resourceUrl",
    );
  });

  it("refuses a copyright hint, which no observed object carried", () => {
    expectDrift(
      mutateJson(DETAILS, details, (document) => {
        document["copyrightHints"] = ["ORPHAN_WORK"];
      }),
      "unexpected_value",
      "$.copyrightHints",
    );
  });

  it("refuses a deleted object", () => {
    expectDrift(
      mutateJson(DETAILS, details, (document) => {
        document["deleted"] = true;
      }),
      "unexpected_value",
      "$.deleted",
    );
  });

  it("refuses OCR in another ALTO namespace", () => {
    expectDrift(
      mutateText(ALTO, alto, (text) =>
        text.replace(
          'xmlns="http://www.loc.gov/standards/alto/ns-v2#"',
          'xmlns="http://www.loc.gov/standards/alto/ns-v3#"',
        ),
      ),
      "unexpected_value",
      "alto@xmlns",
    );
  });

  it("refuses OCR measured in another unit", () => {
    expectDrift(
      mutateText(ALTO, alto, (text) =>
        text.replace(
          "<MeasurementUnit>pixel</MeasurementUnit>",
          "<MeasurementUnit>mm10</MeasurementUnit>",
        ),
      ),
      "unexpected_value",
      "MeasurementUnit",
    );
  });
});

describe("unknown_licence", () => {
  it("refuses a licence seen only in facets, never on an object", () => {
    expectDrift(
      mutateJson(SIMPLE, simple, (document) => {
        attribute(document, "licenseName")["stringValue"] =
          "Zawartość chroniona - licencja otwarta";
      }),
      "unknown_licence",
      "$.hits[0].attributes.licenseName",
    );
  });

  it("refuses an unknown licence on object details", () => {
    expectDrift(
      mutateJson(DETAILS, details, (document) => {
        (document["license"] as Json)["baseName"] = "CC BY 4.0";
      }),
      "unknown_licence",
      "$.license",
    );
  });
});

describe("unknown_rights_statement", () => {
  it("refuses a rights statement never observed", () => {
    expectDrift(
      mutateJson(FULLTEXT, fulltext, (document) => {
        ((hit(document)["expandedFields"] as Json)["rights"] as Json)["values"] = [
          "Domena Publiczna.",
        ];
      }),
      "unknown_rights_statement",
      "$.hits[0].attributes.licenseName",
    );
  });

  it("refuses an unknown statement on a virtual object", () => {
    expectDrift(
      mutateJson(VIRTUAL, virtual, (document) => {
        (document["metadata"] as Json)["rights"] = "Licencja CC BY-NC";
      }),
      "unknown_rights_statement",
      "$.license",
    );
  });
});

describe("inconsistent_rights", () => {
  it("refuses a public-domain licence on a copyright-protected object", () => {
    expectDrift(
      mutateJson(FULLTEXT, fulltext, (document) => {
        attribute(document, "copyrightProtected")["boolValue"] = true;
      }),
      "inconsistent_rights",
      "$.hits[0].attributes.licenseName",
    );
  });

  it("refuses a statement never observed with the licence it arrives with", () => {
    expectDrift(
      mutateJson(FRONT_OFFICE, frontOffice, (document) => {
        (document["metadata"] as Json)["rights"] =
          "Publikacja chroniona prawem autorskim - reprodukcja cyfrowa dostępna w czytelniach BN i na terminalach Academiki";
      }),
      "inconsistent_rights",
      "$.license",
    );
  });

  it("refuses a known licence name pointing at another licence URL", () => {
    expectDrift(
      mutateJson(DETAILS, details, (document) => {
        (document["license"] as Json)["baseUrl"] = "https://creativecommons.org/licenses/by/4.0/";
      }),
      "inconsistent_rights",
      "$.license.baseUrl",
    );
  });

  it("refuses a known licence name with another licence id", () => {
    expectDrift(
      mutateJson(FRONT_OFFICE, frontOffice, (document) => {
        (document["license"] as Json)["id"] = "3a99f116-91e7-48e7-88f8-bdffbd746a54";
      }),
      "inconsistent_rights",
      "$.license.id",
    );
  });
});

describe("hit_count_mismatch", () => {
  it("refuses a page that lost a hit it still counts", () => {
    expectDrift(
      mutateJson(SIMPLE, simple, (document) => {
        (document["hits"] as Json[]).pop();
      }),
      "hit_count_mismatch",
      "$.hits",
    );
  });

  it("refuses a null hit list where hits are counted", () => {
    expectDrift(
      mutateJson(SIMPLE, simple, (document) => {
        document["hits"] = null;
      }),
      "hit_count_mismatch",
      "$.hits",
    );
  });
});

describe("invalid_xml", () => {
  it("refuses a comment, which the observed page does not use", () => {
    expectDrift(
      mutateText(ALTO, alto, (text) => text.replace("<Layout>", "<!-- page --><Layout>")),
      "invalid_xml",
      "alto",
    );
  });

  it("refuses an entity XML does not predefine", () => {
    expectDrift(
      mutateText(ALTO, alto, (text) => text.replace('CONTENT="43370."', 'CONTENT="43370.&nbsp;"')),
      "invalid_xml",
      "@CONTENT",
    );
  });

  it("refuses an element that is never closed", () => {
    expectDrift(
      mutateText(ALTO, alto, (text) => text.replace("</Layout>", "")),
      "invalid_xml",
      "alto",
    );
  });
});

describe("unexpected_element", () => {
  it("refuses a hyphenation element, which the observed page does not use", () => {
    expectDrift(
      mutateText(ALTO, alto, (text) =>
        text.replace(
          '<SP WIDTH="26" VPOS="396" HPOS="1804"/>',
          '<HYP CONTENT="-" WIDTH="26" VPOS="396" HPOS="1804"/>',
        ),
      ),
      "unexpected_element",
      "TextLine/HYP",
    );
  });

  it("refuses a second page in one file", () => {
    expectDrift(
      mutateText(ALTO, alto, (text) =>
        text.replace("</Page>", '</Page><Page ID="Page2" PHYSICAL_IMG_NR="2"></Page>'),
      ),
      "unexpected_element",
      "alto/Layout/Page",
    );
  });
});
