/**
 * TERYT TERC and SIMC files → a checked plan of places (TASK-039 §4).
 *
 * Pure: bytes in, a plan or findings out. No database, no network. The
 * importer writes only what this module has accepted, and writes nothing if
 * it quarantined a single row (§4 item 10).
 *
 * The files are GUS's "wersja urzędowa" CSVs: UTF-8 with a BOM, `;`
 * delimited, CRLF, no quoting. A double quote is a literal character — SIMC
 * spells two localities `Mazewo Dworskie"A"` and `Mazewo Dworskie"B"`, and a
 * CSV reader that honoured quotes would silently rename them.
 */

export const TERC_HEADER = ["WOJ", "POW", "GMI", "RODZ", "NAZWA", "NAZWA_DOD", "STAN_NA"] as const;
export const SIMC_HEADER = [
  "WOJ",
  "POW",
  "GMI",
  "RODZ_GMI",
  "RM",
  "MZ",
  "NAZWA",
  "SYM",
  "SYMPOD",
  "STAN_NA",
] as const;

/** A whole-file defect: the file is not the shape this importer reads. */
export class TerytSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TerytSchemaError";
  }
}

export type TerytFile = "TERC" | "SIMC";

/** One physical data line, kept verbatim for provenance. */
export interface TerytLine {
  /** 1-based line number in the file; the header is line 1. */
  readonly line: number;
  /** The line exactly as read, without its CRLF. */
  readonly text: string;
  readonly fields: readonly string[];
}

/**
 * Decodes and splits one file. Throws {@link TerytSchemaError} for a
 * whole-file defect: invalid UTF-8, a wrong header, a bare CR or LF, or an
 * empty line anywhere but at the end. A line with the wrong number of fields
 * is returned as it is, for the plan to quarantine.
 */
export function parseTerytCsv(
  bytes: Uint8Array,
  file: TerytFile,
  header: readonly string[],
): TerytLine[] {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    throw new TerytSchemaError(`${file}: not valid UTF-8`);
  }
  const lines = text.split("\r\n");
  // The official files end with CRLF and one more empty line. Trailing empty
  // lines are framing; an empty line before the last data line is not.
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  const [first, ...body] = lines;
  if (first === undefined) {
    throw new TerytSchemaError(`${file}: the file is empty`);
  }
  if (first !== header.join(";")) {
    throw new TerytSchemaError(
      `${file}: header ${JSON.stringify(first)} is not ${JSON.stringify(header.join(";"))}`,
    );
  }
  return body.map((line, index) => {
    const lineNumber = index + 2;
    if (line.includes("\r") || line.includes("\n")) {
      throw new TerytSchemaError(`${file} line ${lineNumber}: a bare CR or LF; lines end in CRLF`);
    }
    if (line === "") {
      throw new TerytSchemaError(`${file} line ${lineNumber}: an empty line inside the file`);
    }
    return { line: lineNumber, text: line, fields: line.split(";") };
  });
}

export type TerytQuarantineReason =
  | "FIELD_COUNT"
  | "MALFORMED_CODE"
  | "MALFORMED_DATE"
  | "MIXED_REFERENCE_DATE"
  | "NAME_NOT_NORMALISED"
  | "UNKNOWN_UNIT_KIND"
  | "UNKNOWN_LOCALITY_KIND"
  | "CUSTOMARY_NAME_NOT_HANDLED"
  | "DUPLICATE_ID"
  | "MISSING_PARENT"
  | "AMBIGUOUS_PARENT"
  | "NESTED_PART_OF_LOCALITY";

export interface QuarantinedTerytRow {
  readonly file: TerytFile;
  readonly line: number;
  /** The TERC code or SIMC id, when the line got far enough to have one. */
  readonly id: string | null;
  readonly reason: TerytQuarantineReason;
  readonly detail: string;
}

export type TercLevel = "VOIVODESHIP" | "POWIAT" | "GMINA" | "COMPONENT";

export interface TercUnit {
  readonly source: TerytLine;
  /** `WOJ`, `WOJ POW`, or `WOJ POW GMI RODZ`, digits only. */
  readonly code: string;
  readonly level: TercLevel;
  readonly name: string;
  readonly referenceDate: string;
  /**
   * The place this unit hangs from: the voivodeship of a powiat, the powiat
   * of a gmina. For a COMPONENT, the gmina it is a part of (§4 item 5).
   * Null for a voivodeship.
   */
  readonly parentCode: string | null;
}

export type LocalityPlaceType = "CITY" | "VILLAGE" | "OTHER";

export interface SimcLocality {
  readonly source: TerytLine;
  readonly sym: string;
  readonly name: string;
  readonly rm: string;
  readonly placeType: LocalityPlaceType;
  readonly referenceDate: string;
  /** The parent: a gmina's TERC code, or the SYM of the locality this is a part of. */
  readonly parent:
    | { readonly kind: "GMINA"; readonly code: string }
    | { readonly kind: "LOCALITY"; readonly sym: string };
}

export interface TerytPlan {
  readonly tercRowsRead: number;
  readonly simcRowsRead: number;
  /** Every accepted TERC row, in file order, components included. */
  readonly tercUnits: readonly TercUnit[];
  /** Every accepted SIMC row, in file order. */
  readonly localities: readonly SimcLocality[];
  readonly tercReferenceDate: string | null;
  readonly simcReferenceDate: string | null;
  readonly quarantined: readonly QuarantinedTerytRow[];
}

/** `NAZWA_DOD` values a powiat row may carry. */
const POWIAT_KINDS = new Set([
  "powiat",
  "miasto na prawach powiatu",
  "miasto stołeczne, na prawach powiatu",
]);

/** TERC `RODZ` → the `NAZWA_DOD` values it may carry, and what it is. */
const GMINA_KINDS: ReadonlyMap<string, { level: TercLevel; kinds: ReadonlySet<string> }> = new Map([
  ["1", { level: "GMINA", kinds: new Set(["gmina miejska", "gmina miejska, miasto stołeczne"]) }],
  ["2", { level: "GMINA", kinds: new Set(["gmina wiejska"]) }],
  ["3", { level: "GMINA", kinds: new Set(["gmina miejsko-wiejska"]) }],
  ["4", { level: "COMPONENT", kinds: new Set(["miasto"]) }],
  ["5", { level: "COMPONENT", kinds: new Set(["obszar wiejski"]) }],
  ["8", { level: "COMPONENT", kinds: new Set(["dzielnica"]) }],
  ["9", { level: "COMPONENT", kinds: new Set(["delegatura"]) }],
]);

/**
 * SIMC `RM` values this importer knows (the WMRODZ dictionary as observed in
 * the 2026-09-30 file). Any other value is quarantined, never guessed.
 */
export const SIMC_LOCALITY_KINDS: ReadonlySet<string> = new Set([
  "00",
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "95",
  "96",
  "98",
  "99",
]);

/** §4 item 4: 96 miasto → CITY, 01 wieś → VILLAGE, anything else → OTHER. */
export function localityPlaceType(rm: string): LocalityPlaceType {
  if (rm === "96") return "CITY";
  if (rm === "01") return "VILLAGE";
  return "OTHER";
}

const TWO_DIGITS = /^[0-9]{2}$/u;
const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u;

function nameDefect(name: string): string | null {
  if (name.trim() === "") return "the name is blank";
  if (name !== name.trim()) return "the name has leading or trailing whitespace";
  if (name.normalize("NFC") !== name) return "the name is not NFC";
  return null;
}

/** Quarantines every row whose date differs from the file's first accepted date. */
function referenceDateOf<T extends { readonly referenceDate: string; readonly source: TerytLine }>(
  file: TerytFile,
  rows: readonly T[],
  idOf: (row: T) => string,
  quarantined: QuarantinedTerytRow[],
): { date: string | null; kept: T[] } {
  const date = rows[0]?.referenceDate ?? null;
  const kept: T[] = [];
  for (const row of rows) {
    if (row.referenceDate === date) {
      kept.push(row);
    } else {
      quarantined.push({
        file,
        line: row.source.line,
        id: idOf(row),
        reason: "MIXED_REFERENCE_DATE",
        detail: `STAN_NA ${row.referenceDate} differs from the file's ${String(date)}`,
      });
    }
  }
  return { date, kept };
}

function planTerc(lines: readonly TerytLine[], quarantined: QuarantinedTerytRow[]) {
  const q = (line: TerytLine, id: string | null, reason: TerytQuarantineReason, detail: string) =>
    quarantined.push({ file: "TERC", line: line.line, id, reason, detail });

  // Pass 1: each row on its own.
  type Draft = Omit<TercUnit, "parentCode"> & { readonly rodz: string };
  const drafts: Draft[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (line.fields.length !== TERC_HEADER.length) {
      q(line, null, "FIELD_COUNT", `${line.fields.length} fields, expected ${TERC_HEADER.length}`);
      continue;
    }
    const [woj, pow, gmi, rodz, name, kind, stanNa] = line.fields as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    let level: TercLevel;
    let code: string;
    if (!TWO_DIGITS.test(woj)) {
      q(line, null, "MALFORMED_CODE", `WOJ ${JSON.stringify(woj)} is not two digits`);
      continue;
    }
    if (pow === "" && gmi === "" && rodz === "") {
      level = "VOIVODESHIP";
      code = woj;
      if (kind !== "województwo") {
        q(
          line,
          code,
          "UNKNOWN_UNIT_KIND",
          `a voivodeship row with NAZWA_DOD ${JSON.stringify(kind)}`,
        );
        continue;
      }
    } else if (TWO_DIGITS.test(pow) && gmi === "" && rodz === "") {
      level = "POWIAT";
      code = woj + pow;
      if (!POWIAT_KINDS.has(kind)) {
        q(line, code, "UNKNOWN_UNIT_KIND", `a powiat row with NAZWA_DOD ${JSON.stringify(kind)}`);
        continue;
      }
    } else if (TWO_DIGITS.test(pow) && TWO_DIGITS.test(gmi) && /^[0-9]$/u.test(rodz)) {
      code = woj + pow + gmi + rodz;
      const known = GMINA_KINDS.get(rodz);
      if (!known || !known.kinds.has(kind)) {
        q(line, code, "UNKNOWN_UNIT_KIND", `RODZ ${rodz} with NAZWA_DOD ${JSON.stringify(kind)}`);
        continue;
      }
      level = known.level;
    } else {
      q(line, null, "MALFORMED_CODE", `POW/GMI/RODZ ${JSON.stringify([pow, gmi, rodz])}`);
      continue;
    }
    if (!DATE.test(stanNa)) {
      q(line, code, "MALFORMED_DATE", `STAN_NA ${JSON.stringify(stanNa)}`);
      continue;
    }
    const defect = nameDefect(name);
    if (defect) {
      q(line, code, "NAME_NOT_NORMALISED", defect);
      continue;
    }
    if (seen.has(code)) {
      q(line, code, "DUPLICATE_ID", `TERC code ${code} appears twice`);
      continue;
    }
    seen.add(code);
    drafts.push({ source: line, code, level, name, referenceDate: stanNa, rodz });
  }

  const dated = referenceDateOf("TERC", drafts, (d) => d.code, quarantined);

  // Pass 2: parents, against the rows that survived pass 1.
  const byCode = new Map(dated.kept.map((d) => [d.code, d]));
  const cityGminasByPowiat = new Map<string, string[]>();
  for (const d of dated.kept) {
    if (d.level === "GMINA" && d.rodz === "1") {
      const powiat = d.code.slice(0, 4);
      cityGminasByPowiat.set(powiat, [...(cityGminasByPowiat.get(powiat) ?? []), d.code]);
    }
  }
  const units: TercUnit[] = [];
  for (const d of dated.kept) {
    let parentCode: string | null;
    if (d.level === "VOIVODESHIP") {
      parentCode = null;
    } else if (d.level === "POWIAT") {
      parentCode = d.code.slice(0, 2);
    } else if (d.level === "GMINA") {
      parentCode = d.code.slice(0, 4);
    } else if (d.rodz === "4" || d.rodz === "5") {
      // The town and the rural part of an urban-rural gmina (RODZ 3).
      parentCode = `${d.code.slice(0, 6)}3`;
    } else {
      // A Warsaw district (8) or a city delegation (9): the city's one
      // urban gmina in the same powiat, or nothing — never a guess.
      const candidates = cityGminasByPowiat.get(d.code.slice(0, 4)) ?? [];
      if (candidates.length !== 1) {
        q(
          d.source,
          d.code,
          candidates.length === 0 ? "MISSING_PARENT" : "AMBIGUOUS_PARENT",
          `${candidates.length} RODZ 1 gminas in powiat ${d.code.slice(0, 4)}`,
        );
        continue;
      }
      parentCode = candidates[0] ?? null;
    }
    const parent = parentCode === null ? undefined : byCode.get(parentCode);
    const expected: TercLevel | null =
      d.level === "VOIVODESHIP"
        ? null
        : d.level === "POWIAT"
          ? "VOIVODESHIP"
          : d.level === "GMINA"
            ? "POWIAT"
            : "GMINA";
    if (expected !== null && parent?.level !== expected) {
      q(d.source, d.code, "MISSING_PARENT", `no ${expected} ${String(parentCode)} in the file`);
      continue;
    }
    units.push({
      source: d.source,
      code: d.code,
      level: d.level,
      name: d.name,
      referenceDate: d.referenceDate,
      parentCode,
    });
  }
  return { units, date: dated.date };
}

function planSimc(
  lines: readonly TerytLine[],
  units: readonly TercUnit[],
  quarantined: QuarantinedTerytRow[],
) {
  const q = (line: TerytLine, id: string | null, reason: TerytQuarantineReason, detail: string) =>
    quarantined.push({ file: "SIMC", line: line.line, id, reason, detail });
  const unitByCode = new Map(units.map((u) => [u.code, u]));

  type Draft = Omit<SimcLocality, "parent"> & { readonly sympod: string; readonly gmina: string };
  const drafts: Draft[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (line.fields.length !== SIMC_HEADER.length) {
      q(line, null, "FIELD_COUNT", `${line.fields.length} fields, expected ${SIMC_HEADER.length}`);
      continue;
    }
    const [woj, pow, gmi, rodzGmi, rm, mz, name, sym, sympod, stanNa] = line.fields as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    if (!/^[0-9]{7}$/u.test(sym)) {
      q(line, null, "MALFORMED_CODE", `SYM ${JSON.stringify(sym)} is not seven digits`);
      continue;
    }
    if (
      !TWO_DIGITS.test(woj) ||
      !TWO_DIGITS.test(pow) ||
      !TWO_DIGITS.test(gmi) ||
      !/^[0-9]$/u.test(rodzGmi) ||
      !/^[0-9]{7}$/u.test(sympod)
    ) {
      q(
        line,
        sym,
        "MALFORMED_CODE",
        `WOJ/POW/GMI/RODZ_GMI/SYMPOD ${JSON.stringify([woj, pow, gmi, rodzGmi, sympod])}`,
      );
      continue;
    }
    if (!SIMC_LOCALITY_KINDS.has(rm)) {
      q(line, sym, "UNKNOWN_LOCALITY_KIND", `RM ${JSON.stringify(rm)}`);
      continue;
    }
    if (mz === "0") {
      // MZ 0 marks a customary name. This task does not interpret one.
      q(line, sym, "CUSTOMARY_NAME_NOT_HANDLED", "MZ is 0");
      continue;
    }
    if (mz !== "1") {
      q(line, sym, "MALFORMED_CODE", `MZ ${JSON.stringify(mz)}`);
      continue;
    }
    if (!DATE.test(stanNa)) {
      q(line, sym, "MALFORMED_DATE", `STAN_NA ${JSON.stringify(stanNa)}`);
      continue;
    }
    const defect = nameDefect(name);
    if (defect) {
      q(line, sym, "NAME_NOT_NORMALISED", defect);
      continue;
    }
    if (seen.has(sym)) {
      q(line, sym, "DUPLICATE_ID", `SYM ${sym} appears twice`);
      continue;
    }
    const unitCode = woj + pow + gmi + rodzGmi;
    const unit = unitByCode.get(unitCode);
    const gmina =
      unit?.level === "GMINA" ? unit.code : unit?.level === "COMPONENT" ? unit.parentCode : null;
    if (gmina === null) {
      q(line, sym, "MISSING_PARENT", `no TERC gmina or gmina part ${unitCode}`);
      continue;
    }
    seen.add(sym);
    drafts.push({
      source: line,
      sym,
      name,
      rm,
      placeType: localityPlaceType(rm),
      referenceDate: stanNa,
      sympod,
      gmina,
    });
  }

  const dated = referenceDateOf("SIMC", drafts, (d) => d.sym, quarantined);
  const bySym = new Map(dated.kept.map((d) => [d.sym, d]));
  const localities: SimcLocality[] = [];
  for (const d of dated.kept) {
    const { sympod, gmina, ...rest } = d;
    if (sympod === d.sym) {
      localities.push({ ...rest, parent: { kind: "GMINA", code: gmina } });
      continue;
    }
    const parent = bySym.get(sympod);
    if (!parent) {
      q(d.source, d.sym, "MISSING_PARENT", `SYMPOD ${sympod} is not in the file`);
      continue;
    }
    if (parent.sympod !== parent.sym) {
      q(
        d.source,
        d.sym,
        "NESTED_PART_OF_LOCALITY",
        `SYMPOD ${sympod} is itself a part of ${parent.sympod}`,
      );
      continue;
    }
    localities.push({ ...rest, parent: { kind: "LOCALITY", sym: sympod } });
  }
  return { localities, date: dated.date };
}

/**
 * Parses and checks both files into one plan. Whole-file defects throw
 * {@link TerytSchemaError}; row defects are returned in `quarantined`.
 */
export function planTerytImport(tercBytes: Uint8Array, simcBytes: Uint8Array): TerytPlan {
  const tercLines = parseTerytCsv(tercBytes, "TERC", TERC_HEADER);
  const simcLines = parseTerytCsv(simcBytes, "SIMC", SIMC_HEADER);
  const quarantined: QuarantinedTerytRow[] = [];
  const terc = planTerc(tercLines, quarantined);
  const simc = planSimc(simcLines, terc.units, quarantined);
  return {
    tercRowsRead: tercLines.length,
    simcRowsRead: simcLines.length,
    tercUnits: terc.units,
    localities: simc.localities,
    tercReferenceDate: terc.date,
    simcReferenceDate: simc.date,
    quarantined,
  };
}
