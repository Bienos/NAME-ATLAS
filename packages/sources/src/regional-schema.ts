/**
 * Confirmed schema for the official dane.gov.pl PESEL **regional** surname
 * resources (dataset 1681; male `1148786`, female `1148790`; both
 * `data_date` 2026-01-20).
 *
 * Every fact here was read from the actual resource bytes during TASK-008
 * and is recorded in `docs/sources/pesel-regional.md` and
 * `fixtures/pesel/source-manifest.json`. Nothing is assumed from the
 * national shape: the geography column, the row counts and the per-cell
 * suppression grain were each verified separately.
 *
 * Like `schema.ts`, this module knows nothing of Name Atlas domain concepts.
 * It describes one external file format.
 *
 * **The geography column is a legal registration fact, not a location.**
 * *Województwo zameldowania na pobyt stały* is the voivodeship of permanent
 * registered residence. It is never surname origin, ancestry, birthplace,
 * historical distribution, or — unqualified — current physical residence
 * (D-004, binding). This module carries the raw string; what may be said
 * about it is fixed elsewhere.
 */

/** The exact header row, byte for byte, in both regional files. */
export const PESEL_REGIONAL_HEADER =
  "Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba";

/** The three columns, in order, as they literally appear in the header. */
export const PESEL_REGIONAL_COLUMNS = [
  "Województwo zameldowania na pobyt stały",
  "Nazwisko aktualne",
  "Liczba",
] as const;

export const PESEL_REGIONAL_COLUMN_COUNT = PESEL_REGIONAL_COLUMNS.length;

/**
 * The complete, closed set of geography values observed across both
 * regional resources: 16 uppercase voivodeship names, identical in both
 * files, each matching a TERYT TERC voivodeship name by exact code-point
 * equality (`fixtures/teryt/voivodeship-terc-correspondence.json`).
 *
 * Closed on purpose. A 17th value is not a new region to accommodate — it
 * is a shape change, and the parser fails closed on it, because the
 * voivodeship → TERC correspondence this project holds covers exactly
 * these 16 and a code may never be guessed.
 *
 * There is no "unknown", "abroad" or "no registration" value. That absence
 * is itself a finding: about 21.7% of male and 19.8% of female bearers
 * appear in no voivodeship row at all (TASK-008), and per-cell suppression
 * provably cannot explain the gap.
 */
export const PESEL_REGIONAL_GEOGRAPHY_VALUES = [
  "DOLNOŚLĄSKIE",
  "KUJAWSKO-POMORSKIE",
  "LUBELSKIE",
  "LUBUSKIE",
  "MAZOWIECKIE",
  "MAŁOPOLSKIE",
  "OPOLSKIE",
  "PODKARPACKIE",
  "PODLASKIE",
  "POMORSKIE",
  "WARMIŃSKO-MAZURSKIE",
  "WIELKOPOLSKIE",
  "ZACHODNIOPOMORSKIE",
  "ŁÓDZKIE",
  "ŚLĄSKIE",
  "ŚWIĘTOKRZYSKIE",
] as const;

export type PeselRegionalGeographyValue = (typeof PESEL_REGIONAL_GEOGRAPHY_VALUES)[number];

const GEOGRAPHY_VALUE_SET: ReadonlySet<string> = new Set(PESEL_REGIONAL_GEOGRAPHY_VALUES);

/** True only for one of the 16 confirmed values, compared without transformation. */
export function isPeselRegionalGeographyValue(value: string): value is PeselRegionalGeographyValue {
  return GEOGRAPHY_VALUE_SET.has(value);
}

/**
 * One parsed, raw row from a regional resource. Source-shaped, not a domain
 * object: `geography` and `surname` are the exact strings the file holds.
 *
 * Suppression is applied **per (surname, voivodeship) cell** — confirmed
 * from the bytes in TASK-008, where the minimum `Liczba` is 2 and no `0` or
 * `1` row exists in either file. So an absent cell is zero, suppressed, or
 * out of scope, and never a confirmed zero.
 */
export interface PeselRegionalSourceRow {
  readonly geography: PeselRegionalGeographyValue;
  readonly surname: string;
  readonly count: number;
}
