import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  findPeselResource,
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  PESEL_NATIONAL_RESOURCES_2026,
  PESEL_RIGHTS_PROFILE,
  PESEL_SOURCE,
  PESEL_SOURCE_KEY,
} from "./registry.js";

/**
 * The registry must carry only what the repository actually evidences
 * (TASK-004 §11 unit item 1, AC-09, AC-25).
 *
 * These tests read `fixtures/pesel/source-manifest.json` — the machine-readable
 * record TASK-002 produced from real source bytes — and assert the registry
 * agrees with it. A value drifting away from the manifest is a defect: it
 * would mean the code asserts provenance the repository cannot support.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

interface ManifestResource {
  readonly role: string;
  readonly resource_id: string;
  readonly resource_title: string;
  readonly data_date: string;
  readonly modified: string;
  readonly retrieved_at: string;
  readonly official_source_url: string;
  readonly official_resource_metadata_url: string;
  readonly checksum_sha256: string;
  readonly byte_size: number;
  readonly row_count_excluding_header: number;
}

const manifest = JSON.parse(
  readFileSync(path.join(repoRoot, "fixtures/pesel/source-manifest.json"), "utf8"),
) as {
  readonly dataset: { readonly licence: string; readonly publishing_institution_name: string };
  readonly resources: readonly ManifestResource[];
};

function manifestResource(role: string): ManifestResource {
  const found = manifest.resources.find((r) => r.role === role);
  if (!found) {
    throw new Error(`manifest has no resource with role ${role}`);
  }
  return found;
}

describe("PESEL source registry", () => {
  it("uses the canonical source key from docs/canonical/11 §9.1", () => {
    expect(PESEL_SOURCE_KEY).toBe("pl_pesel_surnames");
    expect(PESEL_SOURCE.source_key).toBe(PESEL_SOURCE_KEY);
  });

  it("names the publisher the manifest records", () => {
    expect(PESEL_SOURCE.publisher).toBe(manifest.dataset.publishing_institution_name);
  });

  it("is a primary official source that is nonetheless not cleared for production", () => {
    // docs/canonical/11 §9.1: authority tier and rights status are
    // independent dimensions. A highly authoritative source can still be
    // legally unusable for automated commercial ingestion.
    expect(PESEL_SOURCE.authority_tier).toBe("A_PRIMARY_OFFICIAL");
    expect(PESEL_SOURCE.production_status).toBe("LEGAL_REVIEW_REQUIRED");
  });

  it("declares national scope only — no regional claim", () => {
    expect(PESEL_SOURCE.geographic_scope).toEqual(["PL"]);
  });
});

describe("PESEL rights profile (TASK-004 §14 U-2)", () => {
  it("records the licence exactly as the manifest states it, at dataset level", () => {
    expect(PESEL_RIGHTS_PROFILE.terms_version).toBe(manifest.dataset.licence);
  });

  it("leaves commercial use and redistribution UNKNOWN, closing the paid-surface gate", () => {
    // Dataset-level CC0 would permit both, but resource-level metadata
    // carries no licence attribute at all, so inheritance is unverified.
    // docs/canonical/12 §6.4 turns UNKNOWN into paid_surface_eligible=false.
    expect(PESEL_RIGHTS_PROFILE.commercial_use).toBe("UNKNOWN");
    expect(PESEL_RIGHTS_PROFILE.redistribution).toBe("UNKNOWN");
  });

  it("does not claim a legal review that nobody performed", () => {
    expect(PESEL_RIGHTS_PROFILE.review_status).toBe("LEGAL_REVIEW_REQUIRED");
    expect(PESEL_RIGHTS_PROFILE.review_status).not.toBe("APPROVED");
  });

  it("leaves unevidenced dimensions UNKNOWN rather than optimistically ALLOWED", () => {
    // No image or transcription exists for a CSV resource.
    expect(PESEL_RIGHTS_PROFILE.image_rights).toBe("UNKNOWN");
    expect(PESEL_RIGHTS_PROFILE.transcription_rights).toBe("UNKNOWN");
  });

  it("records the dataset-level-only provenance of the CC0 statement in notes (AC-09)", () => {
    expect(PESEL_RIGHTS_PROFILE.notes).toMatch(/DATASET level only/u);
    expect(PESEL_RIGHTS_PROFILE.notes).toMatch(/unverified assumption/u);
    expect(PESEL_RIGHTS_PROFILE.notes).toMatch(/NOT a legal review/u);
    expect(PESEL_RIGHTS_PROFILE.notes).toMatch(/D-007/u);
  });

  it("requires no attribution under CC0, but records the courtesy credit anyway", () => {
    expect(PESEL_RIGHTS_PROFILE.attribution_required).toBe(false);
    expect(PESEL_RIGHTS_PROFILE.attribution_text).toContain("Ministerstwo Cyfryzacji");
  });
});

describe("approved resource descriptors", () => {
  it("covers exactly the two approved national resources", () => {
    expect(PESEL_NATIONAL_RESOURCES_2026.map((r) => r.resource_id)).toEqual(["1148808", "1148811"]);
  });

  it.each([
    ["national_male", PESEL_NATIONAL_MALE_2026],
    ["national_female", PESEL_NATIONAL_FEMALE_2026],
  ])("matches the manifest for %s", (role, resource) => {
    const record = manifestResource(role);
    expect(resource.resource_id).toBe(record.resource_id);
    expect(resource.resource_title).toBe(record.resource_title);
    expect(resource.data_date).toBe(record.data_date);
    expect(resource.portal_modified_at).toBe(record.modified);
    expect(resource.retrieved_at).toBe(record.retrieved_at);
    expect(resource.official_source_url).toBe(record.official_source_url);
    expect(resource.official_resource_metadata_url).toBe(record.official_resource_metadata_url);
    expect(resource.official_sha256).toBe(record.checksum_sha256);
    expect(resource.official_byte_size).toBe(record.byte_size);
    expect(resource.official_row_count).toBe(record.row_count_excluding_header);
  });

  it("keeps the reference date distinct from the portal timestamp (AC-06)", () => {
    for (const resource of PESEL_NATIONAL_RESOURCES_2026) {
      expect(resource.data_date).toBe("2026-01-20");
      expect(resource.portal_modified_at.startsWith("2026-01-28")).toBe(true);
      expect(resource.portal_modified_at).not.toContain(resource.data_date);
      expect(resource.retrieved_at).not.toContain(resource.data_date);
    }
  });

  it("carries the publisher's own Polish wording verbatim, untranslated (U-1)", () => {
    expect(PESEL_NATIONAL_MALE_2026.universe_description).toBe(
      "Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 20.01.2026",
    );
    expect(PESEL_NATIONAL_FEMALE_2026.universe_description).toBe(
      "Wykaz nazwisk żeńskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 20.01.2026",
    );
  });

  it("names the resource in methodology_key without asserting what the split means (U-1)", () => {
    for (const resource of PESEL_NATIONAL_RESOURCES_2026) {
      expect(resource.methodology_key).toMatch(/_resource$/u);
      // Any of these would be an interpretation the publisher never made.
      expect(resource.methodology_key).not.toMatch(/bearer|sex_of|grammatical|persons?$/u);
    }
  });

  it("puts the two partitions in different comparability groups so they cannot be summed (AC-17)", () => {
    // docs/canonical/11 §6.1: only snapshots in the same comparability group
    // may be compared quantitatively without extra justification. Different
    // groups is the structural enforcement, not a comment.
    expect(PESEL_NATIONAL_MALE_2026.comparability_group).not.toBe(
      PESEL_NATIONAL_FEMALE_2026.comparability_group,
    );
  });

  it("states the unresolved partition basis and the suppression rule in coverage notes", () => {
    for (const resource of PESEL_NATIONAL_RESOURCES_2026) {
      expect(resource.coverage_notes).toMatch(/does not state/u);
      expect(resource.coverage_notes).toMatch(/NOT summable/u);
      expect(resource.coverage_notes).toMatch(/never a confirmed zero/u);
    }
  });

  it("finds an approved resource by id and refuses an unknown one", () => {
    expect(findPeselResource("1148808")).toBe(PESEL_NATIONAL_MALE_2026);
    // The regional resources exist but are gated by D-004 and not approved here.
    expect(findPeselResource("1148786")).toBeUndefined();
    expect(findPeselResource("nonsense")).toBeUndefined();
  });
});
