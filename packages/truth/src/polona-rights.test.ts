import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parsePolonaAltoPage,
  parsePolonaDigitalObjectFrontOfficeDetails,
  parsePolonaVirtualObjectFrontOfficeDetails,
  polonaRightsLayer,
} from "@name-atlas/sources";
import type { PolonaRights } from "@name-atlas/sources";
import {
  classifyRightsState,
  completeRights,
  connectorExecutable,
  evaluateRightsMatrix,
  excerptTranscription,
  resolveEffectiveRights,
} from "./rights.js";
import type { AssetEligibility, FullRights } from "./rights.js";

/**
 * TASK-031 §8 item 12: real Polona rights, evaluated by ADR-0007's code.
 *
 * The rights values come from committed Polona responses
 * (`fixtures/polona/`), read by the fail-closed parser and mapped by the
 * table in `docs/sources/polona.md` §11. Nothing here is synthetic except
 * where a test says so. The decisions asserted are what `rights.ts` returns
 * today; two of them are recorded in `docs/DECISIONS_NEEDED.md` D-021 as
 * places where Polona's values and ADR-0007 do not fit.
 *
 * This file lives in `packages/truth` because `truth` depends on
 * `@name-atlas/sources`; the reverse import would be a cycle.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures/polona");

function readFixture(relative: string): string {
  return readFileSync(path.join(FIXTURES_DIR, relative), "utf-8");
}

/** The object-level layer an object's own record produces, with its holding institution as owner. */
function objectRights(rights: PolonaRights, owner: string): FullRights {
  return completeRights({ ...polonaRightsLayer(rights), source_owner: owner });
}

function decisions(matrix: readonly AssetEligibility[]): Record<string, string> {
  return Object.fromEntries(
    matrix.map((cell) => [`${cell.asset} ${cell.surface}`, `${cell.decision} ${cell.reason_code}`]),
  );
}

// The paper-trace hit (docs/sources/polona.md §15): a public-domain object.
const TRACE = parsePolonaDigitalObjectFrontOfficeDetails(
  readFixture(
    "objects/digital-objects/8f7cf574-b074-4313-b274-ca53e9459587.front-office-details.json",
  ),
);

describe("a public-domain Polona object (the paper-trace object)", () => {
  const rights = objectRights(TRACE.rights, TRACE.instance.name);

  it("is read as Polona states it", () => {
    expect(TRACE.rights).toEqual({
      licence: "PUBLIC_DOMAIN",
      copyrightProtected: false,
      statement: "PUBLIC_DOMAIN",
    });
    expect(rights).toMatchObject({
      metadata_rights: "UNKNOWN",
      transcription_rights: "ALLOWED",
      image_rights: "ALLOWED",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
      attribution_required: true,
      source_owner: "Biblioteka Narodowa",
      rights_url: "https://creativecommons.org/publicdomain/mark/1.0/",
    });
  });

  it("opens every asset on every surface, with attribution", () => {
    expect(decisions(evaluateRightsMatrix(rights))).toEqual({
      // D-021 (1): metadata_rights is UNKNOWN, yet the metadata row opens the
      // public surfaces, because it reproduces evaluateSurface (ADR-0007 §4),
      // which blocks metadata only on PROHIBITED; ADR-0007 §1 says UNKNOWN is
      // blocked on public surfaces.
      "METADATA INTERNAL": "ALLOWED INTERNAL_USE",
      "METADATA FREE": "ALLOWED_WITH_ATTRIBUTION RIGHTS_PERMIT_FREE_SURFACE",
      "METADATA PAID": "ALLOWED_WITH_ATTRIBUTION COMMERCIAL_USE_ALLOWED",
      "METADATA SEO": "ALLOWED_WITH_ATTRIBUTION REDISTRIBUTION_ALLOWED",
      "TRANSCRIPTION INTERNAL": "ALLOWED INTERNAL_USE",
      "TRANSCRIPTION FREE": "ALLOWED_WITH_ATTRIBUTION TRANSCRIPTION_RIGHTS_ALLOWED",
      "TRANSCRIPTION PAID": "ALLOWED_WITH_ATTRIBUTION TRANSCRIPTION_RIGHTS_ALLOWED",
      "TRANSCRIPTION SEO": "ALLOWED_WITH_ATTRIBUTION TRANSCRIPTION_RIGHTS_ALLOWED",
      "IMAGE INTERNAL": "ALLOWED INTERNAL_USE",
      "IMAGE FREE": "ALLOWED_WITH_ATTRIBUTION IMAGE_RIGHTS_ALLOWED",
      "IMAGE PAID": "ALLOWED_WITH_ATTRIBUTION IMAGE_RIGHTS_ALLOWED",
      "IMAGE SEO": "ALLOWED_WITH_ATTRIBUTION IMAGE_RIGHTS_ALLOWED",
    });
  });

  it("attributes the library and the licence, not the author and title Polona asks for", () => {
    // D-021 (2): Polona's public-domain rule is to name the author and the
    // work's title. ADR-0007 §5 derives "owner — rights URL" when no
    // attribution_text is set, and Polona supplies no text to set.
    const free = evaluateRightsMatrix(rights).find(
      (cell) => cell.asset === "TRANSCRIPTION" && cell.surface === "FREE",
    );
    expect(free?.attribution).toBe(
      "Biblioteka Narodowa — https://creativecommons.org/publicdomain/mark/1.0/",
    );
  });

  it("lets the traced OCR line be excerpted on the free surface", () => {
    const page = parsePolonaAltoPage(
      readFixture("ocr/8802e7b5-bf41-4ed1-bf44-1eee464fbb0a.alto.xml"),
    );
    expect(excerptTranscription(page.lines[0]!.text, rights, "FREE")).toEqual({
      kind: "EXCERPT",
      text: "Wiśniewski — Wiśniewski",
      truncated: false,
    });
  });
});

describe("a Polona object with no licence (reading rooms only)", () => {
  const record = parsePolonaVirtualObjectFrontOfficeDetails(
    readFixture(
      "objects/virtual-objects/4c68543c-6f7d-439a-a502-f537795b0f7f.front-office-details.json",
    ),
  );
  const rights = objectRights(record.rights, record.instance.name);

  it("shows the object's metadata as a locator at most, and never its text or scan", () => {
    expect(record.rights.licence).toBe("PROTECTED_NO_LICENCE");
    expect(decisions(evaluateRightsMatrix(rights))).toEqual({
      "METADATA INTERNAL": "ALLOWED INTERNAL_USE",
      "METADATA FREE": "LOCATOR_ONLY COMMERCIAL_USE_UNRESOLVED",
      "METADATA PAID": "BLOCKED COMMERCIAL_USE_UNRESOLVED",
      "METADATA SEO": "BLOCKED COMMERCIAL_USE_UNRESOLVED",
      "TRANSCRIPTION INTERNAL": "BLOCKED TRANSCRIPTION_RIGHTS_PROHIBITED",
      "TRANSCRIPTION FREE": "BLOCKED TRANSCRIPTION_RIGHTS_PROHIBITED",
      "TRANSCRIPTION PAID": "BLOCKED TRANSCRIPTION_RIGHTS_PROHIBITED",
      "TRANSCRIPTION SEO": "BLOCKED TRANSCRIPTION_RIGHTS_PROHIBITED",
      "IMAGE INTERNAL": "BLOCKED IMAGE_RIGHTS_PROHIBITED",
      "IMAGE FREE": "LOCATOR_ONLY IMAGE_RIGHTS_PROHIBITED",
      "IMAGE PAID": "BLOCKED METADATA_NOT_PUBLISHABLE",
      "IMAGE SEO": "BLOCKED METADATA_NOT_PUBLISHABLE",
    });
  });
});

describe("a Polona object under the limited licence", () => {
  const record = parsePolonaDigitalObjectFrontOfficeDetails(
    readFixture(
      "objects/digital-objects/e2ff2984-e242-4626-ba89-fc2d444d1e9f.front-office-details.json",
    ),
  );
  const rights = objectRights(record.rights, record.instance.name);

  it("keeps text and scan internal, because only commercial use is stated", () => {
    expect(record.rights).toEqual({
      licence: "PROTECTED_LIMITED_LICENCE",
      copyrightProtected: false,
      statement: "PUBLISHER_CONSENT",
    });
    expect(decisions(evaluateRightsMatrix(rights))).toEqual({
      "METADATA INTERNAL": "ALLOWED INTERNAL_USE",
      "METADATA FREE": "LOCATOR_ONLY COMMERCIAL_USE_UNRESOLVED",
      "METADATA PAID": "BLOCKED COMMERCIAL_USE_UNRESOLVED",
      "METADATA SEO": "BLOCKED COMMERCIAL_USE_UNRESOLVED",
      "TRANSCRIPTION INTERNAL": "ALLOWED INTERNAL_USE",
      "TRANSCRIPTION FREE": "BLOCKED TRANSCRIPTION_RIGHTS_UNKNOWN",
      "TRANSCRIPTION PAID": "BLOCKED TRANSCRIPTION_RIGHTS_UNKNOWN",
      "TRANSCRIPTION SEO": "BLOCKED TRANSCRIPTION_RIGHTS_UNKNOWN",
      "IMAGE INTERNAL": "ALLOWED INTERNAL_USE",
      "IMAGE FREE": "LOCATOR_ONLY IMAGE_RIGHTS_UNKNOWN",
      "IMAGE PAID": "BLOCKED METADATA_NOT_PUBLISHABLE",
      "IMAGE SEO": "BLOCKED METADATA_NOT_PUBLISHABLE",
    });
  });
});

describe("what the spike's source-level findings mean under ADR-0007", () => {
  // Synthetic on purpose: no Polona Source or RightsProfile exists (TASK-031
  // §5). This is the one source-level value the spike established,
  // automated_access = UNKNOWN, with every other source default unstated.
  const sourceAsFound = { automated_access: "UNKNOWN", source_owner: "Biblioteka Narodowa" };

  it("holds even a public-domain object at UNKNOWN when the source default is UNKNOWN", () => {
    // ADR-0007 §6: a child layer may only tighten. Per-object rights can only
    // take effect under a source default at least as permissive as they are.
    const effective = resolveEffectiveRights(sourceAsFound, polonaRightsLayer(TRACE.rights));
    expect(effective).toMatchObject({
      transcription_rights: "UNKNOWN",
      image_rights: "UNKNOWN",
      commercial_use: "UNKNOWN",
      attribution_required: true,
    });
    expect(classifyRightsState(effective)).toBe("COMMERCIAL_UNKNOWN");
  });

  it("does not stop the connector: the §6.4 gate refuses only PROHIBITED", () => {
    // D-021: whether automated access that Polona's terms never mention may
    // run at all is the owner's decision, not this gate's.
    expect(connectorExecutable(completeRights(sourceAsFound))).toBe(true);
  });
});
