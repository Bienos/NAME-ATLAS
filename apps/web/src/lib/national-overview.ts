import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PESEL_MIN_VALID_COUNT, decodePeselBytes, parsePeselFile } from "@name-atlas/sources";
import type { PeselSourceRow } from "@name-atlas/sources";

/**
 * The landing page's national overview (tasks/WEB-000-landing-page.md §5).
 *
 * A presentation object assembled from the two records this repository has
 * already verified: `fixtures/pesel/source-manifest.json` and the committed
 * fixture excerpts, read through the same fail-closed parser the importer
 * uses. Every value passes through verbatim — nothing here adds, divides,
 * ranks or estimates. No `Claim` exists yet (TASK-005), which is the gap
 * D-007 records.
 *
 * The page never runs this module: `scripts/generate-overview.ts` writes its
 * output to `src/generated/national-overview.ts`, and the page imports that.
 * So the web bundle holds a presentation object, never source rows.
 */

export type ListRole = "national_male" | "national_female";

export interface PublishedCount {
  readonly surname: string;
  readonly count: number;
}

export interface RegisterList {
  readonly role: ListRole;
  readonly resourceId: string;
  /** The publisher's resource title, verbatim. */
  readonly resourceTitle: string;
  /** Rows in the published file; one row is one surname with a count ≥ 2. */
  readonly surnamesListed: number;
  /** The head of the published file, in the publisher's descending order. */
  readonly highestCounts: readonly PublishedCount[];
}

export interface Specimen {
  readonly surname: string;
  readonly male: number;
  readonly female: number;
}

export interface NationalOverview {
  readonly dataset: {
    readonly id: string;
    readonly title: string;
    readonly publisher: string;
    readonly licence: string;
    readonly updateFrequency: string;
    readonly geography: string;
    readonly url: string;
  };
  /** PESEL reference date (`data_date`), shared by both lists. */
  readonly referenceDate: string;
  /** Date the resources were posted on the portal (`created`), shared by both lists. */
  readonly postedDate: string;
  /** The publisher withholds surnames occurring once; confirmed from the bytes. */
  readonly smallestPublishedCount: number;
  readonly lists: { readonly male: RegisterList; readonly female: RegisterList };
  /** `SPECIMEN_SURNAMES.hero`, shown as the example of a sourced number. */
  readonly heroSpecimen: Specimen;
  /** `SPECIMEN_SURNAMES.spelling`, in that order. */
  readonly spellingSpecimens: readonly Specimen[];
  /**
   * A trend needs a second edition, and deciding whether two editions are
   * comparable is not this layer's call (TASK-004 scopes
   * `comparability_group` to one state date). One edition is all there is.
   */
  readonly trend: {
    readonly status: "INSUFFICIENT_DATA";
    readonly editionsHeld: readonly string[];
  };
}

export interface OverviewInputs {
  readonly manifest: unknown;
  readonly maleCsv: Uint8Array;
  readonly femaleCsv: Uint8Array;
}

export class OverviewSourceError extends Error {
  override readonly name = "OverviewSourceError";
}

/**
 * The fixtures open with the 15 highest-count rows of each full resource, in
 * source order (docs/sources/pesel.md, "Fixture", selection method 1).
 */
export const HIGHEST_COUNTS_IN_EXCERPT = 15;

/** Surnames the page shows as specimens; each must be in both excerpts. */
export const SPECIMEN_SURNAMES = { hero: "NOWAK", spelling: ["NGUYỄN", "MÜLLER"] } as const;

export const FIXTURE_PATHS: Readonly<Record<ListRole, string>> = {
  national_male: "fixtures/pesel/national-male-2026-01-20.csv",
  national_female: "fixtures/pesel/national-female-2026-01-20.csv",
};
const MANIFEST_PATH = "fixtures/pesel/source-manifest.json";

function record(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new OverviewSourceError(`${where}: expected an object`);
  }
  return value as Record<string, unknown>;
}

function text(obj: Record<string, unknown>, key: string, where: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value === "") {
    throw new OverviewSourceError(`${where}.${key}: expected a non-empty string`);
  }
  return value;
}

function positiveInteger(obj: Record<string, unknown>, key: string, where: string): number {
  const value = obj[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new OverviewSourceError(`${where}.${key}: expected a positive integer`);
  }
  return value;
}

function isoDate(value: string, where: string): string {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value);
  if (match === null) {
    throw new OverviewSourceError(`${where}: expected an ISO date, got "${value}"`);
  }
  return match[0];
}

function onlyResource(resources: unknown[], role: ListRole): Record<string, unknown> {
  const matches = resources
    .map((resource, i) => record(resource, `resources[${i}]`))
    .filter((resource) => resource["role"] === role);
  const [match] = matches;
  if (matches.length !== 1 || match === undefined) {
    throw new OverviewSourceError(`manifest: expected exactly one ${role} resource`);
  }
  return match;
}

function head(rows: readonly PeselSourceRow[], role: ListRole): PublishedCount[] {
  const top = rows.slice(0, HIGHEST_COUNTS_IN_EXCERPT);
  if (top.length !== HIGHEST_COUNTS_IN_EXCERPT) {
    throw new OverviewSourceError(
      `${role}: excerpt has fewer than ${HIGHEST_COUNTS_IN_EXCERPT} rows`,
    );
  }
  top.forEach((row, i) => {
    const previous = top[i - 1];
    if (previous !== undefined && row.count > previous.count) {
      throw new OverviewSourceError(
        `${role}: excerpt head is not in descending order at row ${i + 1}`,
      );
    }
  });
  return top.map((row) => ({ surname: row.surname, count: row.count }));
}

function countOf(rows: readonly PeselSourceRow[], surname: string, role: ListRole): number {
  const row = rows.find((candidate) => candidate.surname === surname);
  if (row === undefined) {
    throw new OverviewSourceError(`${role}: specimen "${surname}" is not in the excerpt`);
  }
  return row.count;
}

export function buildNationalOverview(inputs: OverviewInputs): NationalOverview {
  const manifest = record(inputs.manifest, "manifest");
  const dataset = record(manifest["dataset"], "dataset");
  const resources = manifest["resources"];
  if (!Array.isArray(resources)) {
    throw new OverviewSourceError("manifest.resources: expected an array");
  }

  const male = onlyResource(resources, "national_male");
  const female = onlyResource(resources, "national_female");

  const referenceDate = isoDate(
    text(male, "data_date", "national_male"),
    "national_male.data_date",
  );
  if (
    isoDate(text(female, "data_date", "national_female"), "national_female.data_date") !==
    referenceDate
  ) {
    throw new OverviewSourceError("the two lists carry different reference dates");
  }
  const postedDate = isoDate(text(male, "created", "national_male"), "national_male.created");
  if (
    isoDate(text(female, "created", "national_female"), "national_female.created") !== postedDate
  ) {
    throw new OverviewSourceError("the two lists were posted on different dates");
  }

  const maleRows = parsePeselFile(decodePeselBytes(inputs.maleCsv));
  const femaleRows = parsePeselFile(decodePeselBytes(inputs.femaleCsv));

  const list = (
    resource: Record<string, unknown>,
    role: ListRole,
    rows: readonly PeselSourceRow[],
  ): RegisterList => ({
    role,
    resourceId: text(resource, "resource_id", role),
    resourceTitle: text(resource, "resource_title", role),
    surnamesListed: positiveInteger(resource, "row_count_excluding_header", role),
    highestCounts: head(rows, role),
  });

  const specimen = (surname: string): Specimen => ({
    surname,
    male: countOf(maleRows, surname, "national_male"),
    female: countOf(femaleRows, surname, "national_female"),
  });

  return {
    dataset: {
      id: text(dataset, "dataset_id", "dataset"),
      title: text(dataset, "dataset_title", "dataset"),
      publisher: text(dataset, "publishing_institution_name", "dataset"),
      licence: text(dataset, "licence", "dataset"),
      updateFrequency: text(dataset, "update_frequency", "dataset"),
      geography: text(dataset, "geography", "dataset"),
      url: text(dataset, "official_dataset_url", "dataset"),
    },
    referenceDate,
    postedDate,
    smallestPublishedCount: PESEL_MIN_VALID_COUNT,
    lists: {
      male: list(male, "national_male", maleRows),
      female: list(female, "national_female", femaleRows),
    },
    heroSpecimen: specimen(SPECIMEN_SURNAMES.hero),
    spellingSpecimens: SPECIMEN_SURNAMES.spelling.map(specimen),
    trend: { status: "INSUFFICIENT_DATA", editionsHeld: [referenceDate] },
  };
}

/** The directory holding `pnpm-workspace.yaml`, searched upwards from `start`. */
export function findWorkspaceRoot(start: string): string {
  let dir = start;
  while (!existsSync(join(dir, "pnpm-workspace.yaml"))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new OverviewSourceError(`no pnpm-workspace.yaml above ${start}`);
    }
    dir = parent;
  }
  return dir;
}

export function loadNationalOverview(root = findWorkspaceRoot(process.cwd())): NationalOverview {
  return buildNationalOverview({
    manifest: JSON.parse(readFileSync(join(root, MANIFEST_PATH), "utf8")) as unknown,
    maleCsv: readFileSync(join(root, FIXTURE_PATHS.national_male)),
    femaleCsv: readFileSync(join(root, FIXTURE_PATHS.national_female)),
  });
}

export const GENERATED_OVERVIEW_PATH = "apps/web/src/generated/national-overview.ts";

/** The generated module's full text; the test compares the committed file to it. */
export function renderOverviewModule(overview: NationalOverview): string {
  return [
    "// Generated by `pnpm --filter web generate:overview` from",
    "// fixtures/pesel/source-manifest.json and the PESEL fixture excerpts.",
    "// Do not edit: src/lib/national-overview.test.ts fails when this drifts.",
    'import type { NationalOverview } from "../lib/national-overview";',
    "",
    `export const NATIONAL_OVERVIEW: NationalOverview = ${JSON.stringify(overview, null, 2)};`,
    "",
  ].join("\n");
}
