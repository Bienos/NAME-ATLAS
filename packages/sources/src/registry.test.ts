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
  PESEL_REGIONAL_MALE_2026,
  PESEL_REGIONAL_FEMALE_2026,
  PESEL_REGIONAL_RESOURCES_2026,
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

  it("records the D-007 decision: commercial use and redistribution ALLOWED under CC0 1.0", () => {
    // Decided by the project owner on 2026-09-20: rely on the dataset-level
    // CC0 1.0 declaration and the statutory re-use right. CC0 permits both
    // without condition. A judgement, recorded as one — see notes below.
    expect(PESEL_RIGHTS_PROFILE.commercial_use).toBe("ALLOWED");
    expect(PESEL_RIGHTS_PROFILE.redistribution).toBe("ALLOWED");
  });

  it("is APPROVED by the project owner's decision, not by a legal review it claims to have had", () => {
    expect(PESEL_RIGHTS_PROFILE.review_status).toBe("APPROVED");
    expect(PESEL_RIGHTS_PROFILE.notes).toMatch(/project owner's judgement/u);
    expect(PESEL_RIGHTS_PROFILE.notes).toMatch(/not a publisher confirmation/u);
  });

  it("leaves unevidenced dimensions UNKNOWN rather than optimistically ALLOWED", () => {
    // No image or transcription exists for a CSV resource.
    expect(PESEL_RIGHTS_PROFILE.image_rights).toBe("UNKNOWN");
    expect(PESEL_RIGHTS_PROFILE.transcription_rights).toBe("UNKNOWN");
  });

  it("records the dataset-level provenance of the CC0 statement and the decision in notes (AC-09)", () => {
    expect(PESEL_RIGHTS_PROFILE.notes).toMatch(/DATASET level/u);
    expect(PESEL_RIGHTS_PROFILE.notes).toMatch(/resource-level metadata carries no licence/u);
    expect(PESEL_RIGHTS_PROFILE.notes).toMatch(
      /D-007 resolved by the project owner on 2026-09-20/u,
    );
    expect(PESEL_RIGHTS_PROFILE.notes).toMatch(/statutory right/u);
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
    // The regional pair was gated by D-004 until 2026-09-20, when the project
    // owner adopted it (Preferred). It is approved now, so the registry finds
    // it — with its scope restriction carried in `coverage_notes`, which is
    // where the adoption's condition actually lives.
    expect(findPeselResource("1148786")).toBe(PESEL_REGIONAL_MALE_2026);
    expect(findPeselResource("1148790")).toBe(PESEL_REGIONAL_FEMALE_2026);
    expect(findPeselResource("nonsense")).toBeUndefined();
  });

  it("carries the registered-residence restriction on every regional descriptor (D-004)", () => {
    for (const resource of PESEL_REGIONAL_RESOURCES_2026) {
      expect(resource.coverage_notes).toMatch(/PERMANENT\s+REGISTERED RESIDENCE/u);
      expect(resource.coverage_notes).toMatch(/never surname origin/u);
      // The residual is part of the record, not a footnote someone may drop.
      expect(resource.coverage_notes).toMatch(/21\.7%/u);
      expect(resource.coverage_notes).toMatch(/19\.8%/u);
      // Each partition is its own comparability group, so §6.1 forbids summing.
      expect(resource.comparability_group).toMatch(/^pesel_2026_regional_(male|female)$/u);
    }
    expect(PESEL_REGIONAL_MALE_2026.comparability_group).not.toBe(
      PESEL_REGIONAL_FEMALE_2026.comparability_group,
    );
    // And a regional group is never a national one.
    expect(PESEL_REGIONAL_MALE_2026.comparability_group).not.toBe(
      PESEL_NATIONAL_MALE_2026.comparability_group,
    );
  });

  it("pins the regional resources' official checksums and row counts", () => {
    expect(PESEL_REGIONAL_MALE_2026.official_sha256).toBe(
      "0eb31d19955fbbb0a04c7693fb3e2515bc821515c31486851215f1482bee1b51",
    );
    expect(PESEL_REGIONAL_MALE_2026.official_row_count).toBe(646_052);
    expect(PESEL_REGIONAL_FEMALE_2026.official_sha256).toBe(
      "cd0c100e9205cffef594a16129e65c4a8373b62c49dcbb5fd7ed3ae27f7b6989",
    );
    expect(PESEL_REGIONAL_FEMALE_2026.official_row_count).toBe(694_553);
    // The reference date is the PESEL date, never the portal timestamp.
    for (const resource of PESEL_REGIONAL_RESOURCES_2026) {
      expect(resource.data_date).toBe("2026-01-20");
      expect(resource.portal_modified_at).not.toBe(resource.data_date);
    }
  });
});
