import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../importer.js";
import { terytGateRefusal } from "./importer.js";
import { readTerytManifest } from "./manifest.js";
import {
  localityPlaceType,
  parseTerytCsv,
  planTerytImport,
  SIMC_HEADER,
  TERC_HEADER,
  TerytSchemaError,
} from "./plan.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const TERC_EXCERPT = readFileSync(
  path.join(REPO, "fixtures/teryt/terc-urzedowy-excerpt-2026-09-30.csv"),
);
const SIMC_EXCERPT = readFileSync(
  path.join(REPO, "fixtures/teryt/simc-urzedowy-excerpt-2026-09-30.csv"),
);

const BOM = "﻿";
const encode = (text: string) => new TextEncoder().encode(text);
const tercFile = (...rows: string[]) =>
  encode(`${BOM}${TERC_HEADER.join(";")}\r\n${rows.map((r) => `${r}\r\n`).join("")}\r\n`);
const simcFile = (...rows: string[]) =>
  encode(`${BOM}${SIMC_HEADER.join(";")}\r\n${rows.map((r) => `${r}\r\n`).join("")}\r\n`);

/** A minimal, valid TERC hierarchy for the SIMC cases below. */
const TERC_BASE = [
  "02;;;;DOLNOŚLĄSKIE;województwo;2026-01-01",
  "02;24;;;ząbkowicki;powiat;2026-01-01",
  "02;24;04;2;Stoszowice;gmina wiejska;2026-01-01",
];
const SIMC_OK = "02;24;04;2;01;1;Jemna;0855434;0855434;2026-01-01";

function reasons(terc: Uint8Array, simc: Uint8Array): string[] {
  return planTerytImport(terc, simc).quarantined.map((q) => `${q.file}:${q.reason}`);
}

describe("the committed excerpts (AC-01)", () => {
  const manifest = readTerytManifest();

  it("match the SHA-256 the manifest records for them", () => {
    for (const [registry, bytes] of [
      ["TERC", TERC_EXCERPT],
      ["SIMC", SIMC_EXCERPT],
    ] as const) {
      const resource = manifest.resources.find((r) => r.registry === registry);
      expect(sha256Hex(bytes)).toBe(resource?.excerpt.sha256);
    }
  });

  it("plan without a single quarantined row, and account for every line", () => {
    const plan = planTerytImport(TERC_EXCERPT, SIMC_EXCERPT);
    expect(plan.quarantined).toEqual([]);
    expect(plan.tercRowsRead).toBe(14);
    expect(plan.simcRowsRead).toBe(14);
    expect(plan.tercUnits).toHaveLength(14);
    expect(plan.localities).toHaveLength(14);
    expect(plan.tercReferenceDate).toBe("2026-01-01");
    expect(plan.simcReferenceDate).toBe("2026-01-01");
  });

  it("classify TERC rows by TASK-039 §4 item 4 and hang components from their gmina", () => {
    const plan = planTerytImport(TERC_EXCERPT, SIMC_EXCERPT);
    const byCode = new Map(plan.tercUnits.map((u) => [u.code, u]));
    expect(byCode.get("02")).toMatchObject({ level: "VOIVODESHIP", parentCode: null });
    expect(byCode.get("0224")).toMatchObject({ level: "POWIAT", parentCode: "02" });
    expect(byCode.get("1465")).toMatchObject({ level: "POWIAT", parentCode: "14" });
    expect(byCode.get("0224042")).toMatchObject({ level: "GMINA", parentCode: "0224" });
    expect(byCode.get("0224053")).toMatchObject({ level: "GMINA", parentCode: "0224" });
    expect(byCode.get("0224054")).toMatchObject({ level: "COMPONENT", parentCode: "0224053" });
    expect(byCode.get("0224055")).toMatchObject({ level: "COMPONENT", parentCode: "0224053" });
    // A Warsaw district → the capital's one urban gmina.
    expect(byCode.get("1465028")).toMatchObject({ level: "COMPONENT", parentCode: "1465011" });
  });

  it("resolve every locality to its gmina, or to the locality it is part of", () => {
    const plan = planTerytImport(TERC_EXCERPT, SIMC_EXCERPT);
    const bySym = new Map(plan.localities.map((l) => [l.sym, l]));
    // RODZ_GMI 2: the gmina itself.
    expect(bySym.get("0855434")?.parent).toEqual({ kind: "GMINA", code: "0224042" });
    // RODZ_GMI 4 (the town part) → the urban-rural gmina.
    expect(bySym.get("0984692")?.parent).toEqual({ kind: "GMINA", code: "0224053" });
    // RODZ_GMI 5 (the rural part) → the same gmina.
    expect(bySym.get("0856623")?.parent).toEqual({ kind: "GMINA", code: "0224053" });
    // RODZ_GMI 8 (a Warsaw district) → Warszawa's gmina.
    expect(bySym.get("0988780")?.parent).toEqual({ kind: "GMINA", code: "1465011" });
    // Parts of a locality → that locality.
    expect(bySym.get("1061995")?.parent).toEqual({ kind: "LOCALITY", sym: "0984692" });
    expect(bySym.get("0855405")?.parent).toEqual({ kind: "LOCALITY", sym: "0855397" });
    expect(bySym.get("0919938")?.parent).toEqual({ kind: "LOCALITY", sym: "0988780" });
    expect(bySym.get("0120098")?.parent).toEqual({ kind: "LOCALITY", sym: "0120075" });
  });

  it("keep double quotes as literal characters", () => {
    const plan = planTerytImport(TERC_EXCERPT, SIMC_EXCERPT);
    const names = plan.localities.map((l) => l.name);
    expect(names).toContain('Mazewo Dworskie"A"');
    expect(names).toContain('Mazewo Dworskie"B"');
  });
});

describe("localityPlaceType (§4 item 4)", () => {
  it("maps 96 to CITY, 01 to VILLAGE and everything else to OTHER", () => {
    expect(localityPlaceType("96")).toBe("CITY");
    expect(localityPlaceType("01")).toBe("VILLAGE");
    for (const rm of ["00", "02", "03", "04", "05", "06", "07", "95", "98", "99"]) {
      expect(localityPlaceType(rm)).toBe("OTHER");
    }
  });
});

describe("whole-file defects (AC-04)", () => {
  it("refuses invalid UTF-8", () => {
    const bytes = new Uint8Array([...tercFile(...TERC_BASE), 0xff]);
    expect(() => parseTerytCsv(bytes, "TERC", TERC_HEADER)).toThrow(TerytSchemaError);
  });

  it("refuses a different header", () => {
    const bytes = encode(`${BOM}WOJ;POW;GMI;RODZ;NAZWA;STAN_NA\r\n`);
    expect(() => parseTerytCsv(bytes, "TERC", TERC_HEADER)).toThrow(/header/u);
  });

  it("refuses a bare LF", () => {
    const bytes = encode(`${BOM}${TERC_HEADER.join(";")}\r\n${TERC_BASE[0]}\n${TERC_BASE[1]}\r\n`);
    expect(() => parseTerytCsv(bytes, "TERC", TERC_HEADER)).toThrow(/bare CR or LF/u);
  });

  it("refuses an empty line before the last data line", () => {
    const bytes = encode(
      `${BOM}${TERC_HEADER.join(";")}\r\n${TERC_BASE[0]}\r\n\r\n${TERC_BASE[1]}\r\n`,
    );
    expect(() => parseTerytCsv(bytes, "TERC", TERC_HEADER)).toThrow(/empty line/u);
  });

  it("accepts the file with or without the trailing empty line and the BOM", () => {
    const withBoth = parseTerytCsv(tercFile(...TERC_BASE), "TERC", TERC_HEADER);
    const bare = parseTerytCsv(
      encode(`${TERC_HEADER.join(";")}\r\n${TERC_BASE.join("\r\n")}`),
      "TERC",
      TERC_HEADER,
    );
    expect(bare).toEqual(withBoth);
    expect(withBoth.map((l) => l.line)).toEqual([2, 3, 4]);
  });
});

describe("row defects are quarantined, never guessed (AC-04)", () => {
  const ok = simcFile(SIMC_OK);

  it("a plan with no defects quarantines nothing", () => {
    expect(reasons(tercFile(...TERC_BASE), ok)).toEqual([]);
  });

  it.each([
    ["a wrong field count", "02;24;05;3;Ząbkowice Śląskie;2026-01-01", "TERC:FIELD_COUNT"],
    ["a malformed code", "2;24;05;3;X;gmina wiejska;2026-01-01", "TERC:MALFORMED_CODE"],
    ["an unknown RODZ", "02;24;05;7;X;gmina wiejska;2026-01-01", "TERC:UNKNOWN_UNIT_KIND"],
    [
      "a RODZ with the wrong NAZWA_DOD",
      "02;24;05;2;X;gmina miejska;2026-01-01",
      "TERC:UNKNOWN_UNIT_KIND",
    ],
    ["a malformed date", "02;24;05;2;X;gmina wiejska;01.01.2026", "TERC:MALFORMED_DATE"],
    ["a different STAN_NA", "02;24;05;2;X;gmina wiejska;2025-01-01", "TERC:MIXED_REFERENCE_DATE"],
    ["a padded name", "02;24;05;2; X;gmina wiejska;2026-01-01", "TERC:NAME_NOT_NORMALISED"],
    [
      "a non-NFC name",
      "02;24;05;2;Ząbkowice;gmina wiejska;2026-01-01".normalize("NFD"),
      "TERC:NAME_NOT_NORMALISED",
    ],
    ["a duplicate code", "02;24;04;2;Stoszowice;gmina wiejska;2026-01-01", "TERC:DUPLICATE_ID"],
    ["a gmina with no powiat", "02;25;01;2;X;gmina wiejska;2026-01-01", "TERC:MISSING_PARENT"],
    ["a town part with no RODZ 3 gmina", "02;24;04;4;X;miasto;2026-01-01", "TERC:MISSING_PARENT"],
    [
      "a delegation with no city gmina",
      "02;24;09;9;X;delegatura;2026-01-01",
      "TERC:MISSING_PARENT",
    ],
  ])("TERC: %s", (_label, row, reason) => {
    expect(reasons(tercFile(...TERC_BASE, row), ok)).toContain(reason);
  });

  it("TERC: a delegation in a powiat with two city gminas is ambiguous", () => {
    const terc = tercFile(
      ...TERC_BASE,
      "02;24;01;1;A;gmina miejska;2026-01-01",
      "02;24;02;1;B;gmina miejska;2026-01-01",
      "02;24;09;9;X;delegatura;2026-01-01",
    );
    expect(reasons(terc, ok)).toEqual(["TERC:AMBIGUOUS_PARENT"]);
  });

  it.each([
    ["a wrong field count", "02;24;04;2;01;1;Jemna;0855434;2026-01-01", "SIMC:FIELD_COUNT"],
    ["a malformed SYM", "02;24;04;2;01;1;X;855434;855434;2026-01-01", "SIMC:MALFORMED_CODE"],
    ["an unknown RM", "02;24;04;2;97;1;X;0000001;0000001;2026-01-01", "SIMC:UNKNOWN_LOCALITY_KIND"],
    [
      "a customary name",
      "02;24;04;2;01;0;X;0000001;0000001;2026-01-01",
      "SIMC:CUSTOMARY_NAME_NOT_HANDLED",
    ],
    ["a duplicate SYM", SIMC_OK, "SIMC:DUPLICATE_ID"],
    [
      "a TERC unit not in TERC",
      "02;24;07;2;01;1;X;0000001;0000001;2026-01-01",
      "SIMC:MISSING_PARENT",
    ],
    ["a missing SYMPOD", "02;24;04;2;00;1;X;0000001;0000002;2026-01-01", "SIMC:MISSING_PARENT"],
    ["a padded name", "02;24;04;2;01;1;X ;0000001;0000001;2026-01-01", "SIMC:NAME_NOT_NORMALISED"],
    [
      "a different STAN_NA",
      "02;24;04;2;01;1;X;0000001;0000001;2025-01-01",
      "SIMC:MIXED_REFERENCE_DATE",
    ],
  ])("SIMC: %s", (_label, row, reason) => {
    expect(reasons(tercFile(...TERC_BASE), simcFile(SIMC_OK, row))).toContain(reason);
  });

  it("SIMC: a part of a part of a locality is quarantined", () => {
    const simc = simcFile(
      SIMC_OK,
      "02;24;04;2;00;1;Part;0000001;0855434;2026-01-01",
      "02;24;04;2;00;1;Part of part;0000002;0000001;2026-01-01",
    );
    expect(reasons(tercFile(...TERC_BASE), simc)).toEqual(["SIMC:NESTED_PART_OF_LOCALITY"]);
  });

  it("reports file, line and id for a quarantined row", () => {
    const plan = planTerytImport(
      tercFile(...TERC_BASE),
      simcFile(SIMC_OK, "02;24;04;2;97;1;X;0000001;0000001;2026-01-01"),
    );
    expect(plan.quarantined).toEqual([
      { file: "SIMC", line: 3, id: "0000001", reason: "UNKNOWN_LOCALITY_KIND", detail: 'RM "97"' },
    ]);
  });
});

describe("terytGateRefusal (§4 item 3, AC-02)", () => {
  const open = { automated_access: "ALLOWED", review_status: "LEGAL_REVIEW_REQUIRED" } as const;

  it("lets TERYT's catalogue values through", () => {
    expect(terytGateRefusal("LEGAL_REVIEW_REQUIRED", open)).toBeNull();
    expect(terytGateRefusal("APPROVED", open)).toBeNull();
  });

  it.each(["PARTNERSHIP_REQUIRED", "BLOCKED", "DEPRECATED"] as const)(
    "refuses production_status %s",
    (status) => {
      expect(terytGateRefusal(status, open)?.reason).toBe("PRODUCTION_STATUS_BLOCKED");
    },
  );

  it("refuses a profile that prohibits automated access or is blocked", () => {
    expect(terytGateRefusal("APPROVED", { ...open, automated_access: "PROHIBITED" })?.reason).toBe(
      "RIGHTS_BLOCKED",
    );
    expect(terytGateRefusal("APPROVED", { ...open, review_status: "BLOCKED" })?.reason).toBe(
      "RIGHTS_BLOCKED",
    );
  });
});
