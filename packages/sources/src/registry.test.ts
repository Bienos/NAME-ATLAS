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
  PESEL_NATIONAL_SERIES,
  PESEL_REFUSED_RESOURCES,
  PESEL_SERIES_KEYS,
} from "./registry.js";
import { localFileName } from "./acquire.js";

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

/**
 * The two national series (ADR-0019, TASK-044 §3). The table is the task's:
 * each resource's CSV-endpoint bytes, downloaded twice with the same result.
 */
const SERIES_TABLE = {
  national_male: [
    [
      "22817",
      "2020-01-22",
      "a6af514f921c30771591bced6785c6559d63f5e88868e25eaad130eb36fd805d",
      3_662_490,
      283_221,
    ],
    [
      "28052",
      "2021-02-01",
      "ea466f2b8611be038913c6354bb13a5d029f5ff0ced07eea7ef282f5f52c215c",
      3_859_773,
      298_692,
    ],
    [
      "36401",
      "2022-01-27",
      "4389d8964dd37c7ab71306d537e98b365e171831d2be9e63b84bdcaaf33ca68d",
      4_160_756,
      322_232,
    ],
    [
      "44647",
      "2023-01-30",
      "7e95c307a2ebf62b1ea14b936925c46cc0b6db960dec8fc98c6b5fe8980f9af0",
      4_692_377,
      363_360,
    ],
    [
      "54097",
      "2024-01-19",
      "3c722cada73f0b52184931a4cc521a5c7d6905683f5103a417f867fd9547be0e",
      4_904_484,
      379_712,
    ],
    [
      "63892",
      "2025-01-22",
      "079695630265bf0bcb2f944743799850465123fbd280ead736f3274d867818cb",
      5_114_559,
      395_127,
    ],
    [
      "1148808",
      "2026-01-20",
      "ce4238feda85e75c73b16a229eb8afc1dfccb8854a7809111ab85fb8672b62f4",
      5_293_415,
      408_182,
    ],
  ],
  national_female: [
    [
      "22815",
      "2020-01-22",
      "b0ede69ca79698cd8f6b09462916234be67dd4322d888e6a9263b89a52bfd99b",
      3_988_200,
      299_612,
    ],
    [
      "35279",
      "2021-02-02",
      "9af26480ed3035e7e6b9349033c4ccd76bee3eeb5e8ac7ce299a8d00ba0b62e0",
      4_141_803,
      311_240,
    ],
    [
      "44646",
      "2023-01-30",
      "326bfc3dcf2b55886073a46780acaefec3fb2bc4444f6ddbc052938c1aa05cb2",
      5_169_657,
      389_365,
    ],
    [
      "54098",
      "2024-01-19",
      "7988d01d8f85f84cd84bb0069b9129c9b3944aba5349709cffca21555d6fcf28",
      5_324_053,
      400_764,
    ],
    [
      "63888",
      "2025-01-22",
      "9ac287db5266fc03d3e24a497244d071b3ef2fb4907c43c2b07844912db0d27a",
      5_465_724,
      411_012,
    ],
    [
      "1148811",
      "2026-01-20",
      "c508680d084dd21949ca7c817339fd63d31342ee5318320c5266c6bf4909f6e6",
      5_592_881,
      420_082,
    ],
  ],
} as const;

const PARTITIONS = ["national_male", "national_female"] as const;
const ALL_SERIES = [
  ...PESEL_NATIONAL_SERIES.national_male,
  ...PESEL_NATIONAL_SERIES.national_female,
];
const SLUG_WORD = { national_male: "meskie", national_female: "zenskie" } as const;
const TITLE_WORD = { national_male: "męskie", national_female: "żeńskie" } as const;

/** "stan na 22.01.2020" for the data date 2020-01-22. */
function statedDate(dataDate: string): string {
  const [year, month, day] = dataDate.split("-");
  return `stan na ${day}.${month}.${year}`;
}

describe("the national series (ADR-0019, TASK-044)", () => {
  it.each(PARTITIONS)("holds the %s editions of TASK-044 §3, pinned byte for byte", (partition) => {
    expect(
      PESEL_NATIONAL_SERIES[partition].map((r) => [
        r.resource_id,
        r.data_date,
        r.official_sha256,
        r.official_byte_size,
        r.official_row_count,
      ]),
    ).toEqual(SERIES_TABLE[partition]);
  });

  it.each(PARTITIONS)(
    "orders the %s series by reference date, ending with the 2026 edition",
    (partition) => {
      const dates = PESEL_NATIONAL_SERIES[partition].map((r) => r.data_date);
      expect([...dates].sort()).toEqual(dates);
      expect(new Set(dates).size).toBe(dates.length);
      expect(PESEL_NATIONAL_SERIES[partition].at(-1)).toBe(
        partition === "national_male" ? PESEL_NATIONAL_MALE_2026 : PESEL_NATIONAL_FEMALE_2026,
      );
    },
  );

  it.each(PARTITIONS)(
    "puts every %s edition in its list's one series, and no other list in it",
    (partition) => {
      for (const resource of PESEL_NATIONAL_SERIES[partition]) {
        expect(resource.role).toBe(partition);
        expect(resource.series).toBe(PESEL_SERIES_KEYS[partition]);
      }
    },
  );

  it("keeps the two series apart and regional resources out of both", () => {
    expect(PESEL_SERIES_KEYS.national_male).toBe("pesel_living_current_surname_national_male");
    expect(PESEL_SERIES_KEYS.national_female).toBe("pesel_living_current_surname_national_female");
    for (const resource of PESEL_REGIONAL_RESOURCES_2026) expect(resource.series).toBeNull();
  });

  it.each(PARTITIONS)(
    "describes one universe in every %s edition, in the publisher's words",
    (partition) => {
      // ADR-0019 §1: "Wykaz nazwisk … osób żyjących (wg pola nazwisko aktualne) występujących w
      // rejestrze PESEL". The word for the list and the stated date vary; the universe does not.
      for (const resource of PESEL_NATIONAL_SERIES[partition]) {
        const universe = resource.universe_description
          .replace(/^Wykaz nazwisk \p{L}+ /u, "Wykaz nazwisk … ")
          .replace(`, ${statedDate(resource.data_date)}`, "");
        expect(universe, resource.resource_id).toBe(
          "Wykaz nazwisk … osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL",
        );
      }
    },
  );

  it("carries a well-formed descriptor for every edition", () => {
    const groups = new Set<string>();
    for (const resource of ALL_SERIES) {
      const { role, resource_id: id, data_date: date } = resource;
      if (role !== "national_male" && role !== "national_female") throw new Error(role);
      const slug = `nazwiska-${SLUG_WORD[role]}-stan-na-${date}`;
      expect(resource.resource_title).toBe(`Nazwiska ${TITLE_WORD[role]} - stan na ${date}`);
      expect(resource.official_source_url).toBe(
        `https://api.dane.gov.pl/resources/${id},${slug}/csv`,
      );
      expect(resource.official_resource_metadata_url).toBe(
        `https://api.dane.gov.pl/1.4/resources/${id},${slug}`,
      );
      expect(resource.official_sha256).toMatch(/^[0-9a-f]{64}$/u);
      expect(Number.isSafeInteger(resource.official_byte_size)).toBe(true);
      expect(Number.isSafeInteger(resource.official_row_count)).toBe(true);
      expect(resource.portal_modified_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u);
      expect(resource.retrieved_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u);
      const year = date.slice(0, 4);
      const sex = role.slice("national_".length);
      expect(resource.methodology_key).toBe(
        `pesel_current_surname_national_${year}_${sex}_resource`,
      );
      expect(resource.comparability_group).toBe(`pesel_${year}_national_${sex}`);
      expect(resource.coverage_notes).toMatch(/NOT summable/u);
      expect(resource.coverage_notes).toMatch(/never a confirmed zero/u);
      groups.add(resource.comparability_group);
    }
    // One comparability group per edition: an edition is compared with another only
    // within its series, for list-scope figures (ADR-0019 §2.3), never merged.
    expect(groups.size).toBe(ALL_SERIES.length);
  });

  it("uses the stated reference date where the portal's data_date differs (44646)", () => {
    const edition = PESEL_NATIONAL_SERIES.national_female.find((r) => r.resource_id === "44646");
    expect(edition?.data_date).toBe("2023-01-30");
    expect(edition?.universe_description).toContain("stan na 30.01.2023");
    expect(edition?.coverage_notes).toMatch(/portal's data_date says 2023-01-31/u);
  });

  it("gives every edition its own local file name", () => {
    const names = ALL_SERIES.map(localFileName);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("national-male-2020-01-22.csv");
    expect(names).toContain("national-female-2021-02-02.csv");
  });

  it("does not approve an earlier edition for import: findPeselResource returns none", () => {
    for (const resource of ALL_SERIES) {
      const found = findPeselResource(resource.resource_id);
      expect(found === undefined || found.data_date === "2026-01-20").toBe(true);
    }
  });
});

describe("the refused resource (ADR-0019 §2.2)", () => {
  const [refused, ...others] = PESEL_REFUSED_RESOURCES;

  it("refuses resource 38772 alone, as a publisher duplicate of 35279", () => {
    expect(others).toEqual([]);
    expect(refused).toMatchObject({
      role: "national_female",
      series: PESEL_SERIES_KEYS.national_female,
      resource_id: "38772",
      data_date: "2022-01-27",
      reason: "PUBLISHER_DUPLICATE",
      duplicate_of: "35279",
    });
  });

  it("pins the same bytes as the edition it duplicates, which is in its series", () => {
    const original = PESEL_NATIONAL_SERIES.national_female.find(
      (r) => r.resource_id === refused?.duplicate_of,
    );
    expect(original).toBeDefined();
    expect(refused?.official_sha256).toBe(original?.official_sha256);
    expect(refused?.official_byte_size).toBe(original?.official_byte_size);
    expect(refused?.official_row_count).toBe(original?.official_row_count);
    expect(original?.data_date).toBe("2021-02-02");
  });

  it("is not an edition: its id and its date are in no series, and nothing finds it", () => {
    expect(ALL_SERIES.map((r) => r.resource_id)).not.toContain(refused?.resource_id);
    expect(PESEL_NATIONAL_SERIES.national_female.map((r) => r.data_date)).not.toContain(
      refused?.data_date,
    );
    expect(findPeselResource(refused?.resource_id ?? "")).toBeUndefined();
  });
});
