import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PESEL_CAPABILITIES,
  PESEL_GEOGRAPHY_LEVEL,
  PESEL_RESOURCE_ROLES,
  PESEL_SOURCE_REGISTRY,
  isPeselResourceRole,
  peselCoverageNotes,
  peselDatasetVersion,
  peselResource,
  peselUniverseDescription,
} from "./registry.js";
import { evaluateRightsGate } from "./rights.js";
import { sha256Hex } from "./checksum.js";

/**
 * TASK-004 §11 unit item 1 — the registry carries only values traceable to
 * `fixtures/pesel/source-manifest.json` or a canonical document, and anything
 * unevidenced is UNKNOWN or null rather than an optimistic default.
 *
 * This asserts traceability by reading the manifest and comparing, rather
 * than by restating the expected values here — a copied expectation would
 * pass even if both the registry and the test drifted from the evidence.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const FIXTURE_DIR = path.join(REPO_ROOT, "fixtures", "pesel");

interface ManifestResource {
  readonly role: string;
  readonly resource_id: string;
  readonly resource_title: string;
  readonly data_date: string;
  readonly modified: string;
  readonly official_source_url: string;
  readonly checksum_sha256: string;
  readonly byte_size: number;
  readonly row_count_excluding_header: number;
  readonly retrieved_at: string;
}

interface Manifest {
  readonly dataset: {
    readonly dataset_id: string;
    readonly dataset_title: string;
    readonly publishing_institution_name: string;
    readonly licence: string;
    readonly official_dataset_url: string;
  };
  readonly resources: readonly ManifestResource[];
}

function readManifest(): Manifest {
  return JSON.parse(
    readFileSync(path.join(FIXTURE_DIR, "source-manifest.json"), "utf8"),
  ) as Manifest;
}

function manifestResource(manifest: Manifest, role: string): ManifestResource {
  const found = manifest.resources.find((resource) => resource.role === role);
  if (!found) {
    throw new Error(`manifest has no resource with role ${role}`);
  }
  return found;
}

describe("PESEL source registry traceability", () => {
  const manifest = readManifest();

  it("names the dataset exactly as the manifest does", () => {
    expect(PESEL_SOURCE_REGISTRY.dataset_id).toBe(manifest.dataset.dataset_id);
    expect(PESEL_SOURCE_REGISTRY.source.name).toBe(manifest.dataset.dataset_title);
    expect(PESEL_SOURCE_REGISTRY.source.publisher).toBe(
      manifest.dataset.publishing_institution_name,
    );
    expect(PESEL_SOURCE_REGISTRY.source.homepage_or_reference_url).toBe(
      manifest.dataset.official_dataset_url,
    );
  });

  it("uses the manifest's own licence string as the terms version", () => {
    expect(PESEL_SOURCE_REGISTRY.rights.terms_version).toBe(manifest.dataset.licence);
  });

  it.each(PESEL_RESOURCE_ROLES)("carries resource %s verbatim from the manifest", (role) => {
    const entry = peselResource(role);
    const evidence = manifestResource(manifest, role);
    expect(entry.resource_id).toBe(evidence.resource_id);
    expect(entry.resource_title).toBe(evidence.resource_title);
    expect(entry.data_date).toBe(evidence.data_date);
    expect(entry.portal_modified_at).toBe(evidence.modified);
    expect(entry.csv_download_url).toBe(evidence.official_source_url);
    expect(entry.official_csv_sha256).toBe(evidence.checksum_sha256);
    expect(entry.official_csv_byte_size).toBe(evidence.byte_size);
    expect(entry.official_csv_row_count_excluding_header).toBe(evidence.row_count_excluding_header);
    expect(entry.official_retrieved_at).toBe(evidence.retrieved_at);
  });

  it("keeps the PESEL reference date distinct from the portal timestamp", () => {
    for (const role of PESEL_RESOURCE_ROLES) {
      const entry = peselResource(role);
      expect(entry.portal_modified_at.startsWith(entry.data_date)).toBe(false);
    }
  });

  it("does not present the official checksum as any fixture's checksum", () => {
    // TASK-004 §12 rule 1. The committed fixtures are 22- and 23-row
    // excerpts; the registry holds the FULL resources' checksums. If these
    // ever matched, one would be masquerading as the other.
    const officialHashes = PESEL_RESOURCE_ROLES.map(
      (role) => peselResource(role).official_csv_sha256,
    );
    for (const name of ["national-male-2026-01-20.csv", "national-female-2026-01-20.csv"]) {
      const fixtureHash = sha256Hex(readFileSync(path.join(FIXTURE_DIR, name)));
      expect(officialHashes).not.toContain(fixtureHash);
    }
  });
});

describe("PESEL rights posture (TASK-004 §14 U-2, answered by the project owner)", () => {
  const rights = PESEL_SOURCE_REGISTRY.rights;

  it("records the review as not performed rather than claiming approval", () => {
    expect(rights.review_status).toBe("LEGAL_REVIEW_REQUIRED");
    expect(PESEL_SOURCE_REGISTRY.source.production_status).toBe("LEGAL_REVIEW_REQUIRED");
  });

  it("allows only what the dataset-level CC0 dedication evidences", () => {
    expect(rights.automated_access).toBe("ALLOWED");
    expect(rights.commercial_use).toBe("ALLOWED");
    expect(rights.metadata_rights).toBe("ALLOWED");
    expect(rights.database_rights).toBe("ALLOWED");
    expect(rights.redistribution).toBe("ALLOWED");
    expect(rights.local_cache).toBe("ALLOWED");
  });

  it("leaves dimensions with no evidence UNKNOWN, never an optimistic default", () => {
    // A two-column CSV has no image or transcription surface, so this
    // project holds no evidence about either (TASK-004 AC-08).
    expect(rights.image_rights).toBe("UNKNOWN");
    expect(rights.transcription_rights).toBe("UNKNOWN");
  });

  it("records attribution and rights-url gaps rather than inventing them", () => {
    // CC0 1.0 requires no attribution, so `false` here is evidence, not a gap.
    expect(rights.attribution_required).toBe(false);
    expect(rights.attribution_text).toBeNull();
    expect(rights.rights_url).toBeNull();
    expect(rights.terms_hash).toBeNull();
  });

  it("states the dataset-level-only provenance of the CC0 claim in notes", () => {
    expect(rights.notes).toContain("DATASET-LEVEL ONLY");
    expect(rights.notes).toContain("NO LEGAL REVIEW HAS BEEN PERFORMED");
  });

  it("uses a fixed checked_at so the seeded row is deterministic", () => {
    // AC-02: no clock may affect a stored field other than the UUIDv7 keys
    // and created_at/retrieved_at.
    expect(rights.checked_at).toBe("2026-09-19T00:00:00Z");
  });

  it("passes the hard gate, because nothing prohibits internal ingestion", () => {
    expect(evaluateRightsGate(rights).allowed).toBe(true);
  });
});

describe("PESEL snapshot descriptors", () => {
  it("declares no regional capability", () => {
    // docs/canonical/12 §9.8: the resources carry no regional field.
    expect(PESEL_CAPABILITIES.regional_distribution).toBe(false);
    expect(PESEL_GEOGRAPHY_LEVEL).toBe("NATIONAL");
  });

  it.each(PESEL_RESOURCE_ROLES)("quotes the publisher's own wording for %s", (role) => {
    const entry = peselResource(role);
    const universe = peselUniverseDescription(entry);
    expect(universe).toContain(entry.resource_title);
    expect(universe).toContain(entry.resource_description);
    expect(entry.resource_description).toContain("wg pola nazwisko aktualne");
    // The API response wraps the description in <p>…</p>; the registry stores
    // the text, not the markup.
    expect(entry.resource_description).not.toContain("<p>");
  });

  it.each(PESEL_RESOURCE_ROLES)("states the unresolved partition basis for %s", (role) => {
    // AC-17 + §14 U-1: record the publisher's wording, state the gap, forbid
    // any total across the two partitions.
    const notes = peselCoverageNotes(peselResource(role));
    expect(notes).toContain("THE PARTITION BASIS IS NOT DISAMBIGUATED BY THE PUBLISHER");
    expect(notes).toContain("never be summed");
    expect(notes).toContain("BELOW_PUBLICATION_THRESHOLD_OR_ABSENT");
    expect(notes).toContain("universe_size is null");
  });

  it("keeps the two partitions in different comparability groups", () => {
    // docs/canonical/11 §6.1: only snapshots in the same group may be
    // compared quantitatively. Male and female must never be.
    const male = peselResource("national_male").comparability_group;
    const female = peselResource("national_female").comparability_group;
    expect(male).not.toBe(female);
    expect(peselResource("national_male").methodology_key).not.toBe(
      peselResource("national_female").methodology_key,
    );
  });

  it("scopes the comparability group to one state date, not to the source", () => {
    // Cross-year comparability is unproven (TASK-004 §8), so a 2027 edition
    // must not land in the same group as this one.
    for (const role of PESEL_RESOURCE_ROLES) {
      const entry = peselResource(role);
      expect(entry.comparability_group).toContain(entry.data_date);
    }
  });

  it("builds dataset_version from the publisher's own identifiers only", () => {
    // AC-06: never the portal timestamp, never retrieved_at.
    for (const role of PESEL_RESOURCE_ROLES) {
      const entry = peselResource(role);
      const version = peselDatasetVersion(entry);
      expect(version).toBe(`${entry.resource_id}/${entry.data_date}`);
      expect(version).not.toContain(entry.portal_modified_at);
      expect(version).not.toContain(entry.official_retrieved_at);
    }
  });

  it("recognises exactly the two national roles", () => {
    expect([...PESEL_RESOURCE_ROLES]).toEqual(["national_male", "national_female"]);
    expect(isPeselResourceRole("national_male")).toBe(true);
    // The regional resources exist but are gated by D-004 and out of scope.
    expect(isPeselResourceRole("regional_male")).toBe(false);
  });
});
