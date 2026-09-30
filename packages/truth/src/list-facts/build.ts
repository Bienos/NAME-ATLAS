/**
 * `list_facts_pipeline@3` — from the bytes of every edition of one published
 * national list's series to its validated facts, and from the two lists to
 * the `list_facts@3` artefact (TASK-040, TASK-043, TASK-044, ADR-0015,
 * ADR-0018, ADR-0019, `docs/contracts/list-facts.md`).
 *
 * Pure: bytes in, facts out, no file system and no database. The generator
 * (`bin/build-list-facts.ts`) reads the files and writes the result.
 *
 * Every edition of the series, not only the last, passes these steps,
 * fail-closed, in this order, with no switch to get past any step:
 *
 *   1. the bytes parse as the confirmed PESEL shape (`parsePeselFile`);
 *   2. the completeness gate: checksum AND row count equal the registry's
 *      (`assessUniverseCompleteness`) — an excerpt such as `fixtures/pesel`
 *      stops here, as TASK-012 AC-1 requires of every derived statistic;
 *   3. the byte size and checksum equal the registry's (`verifyResourceBytes`,
 *      the check `fetch-pesel` applies);
 *   4. the derived-statistic confidence rule returns VERIFIED;
 *   5. the source's rights allow the FREE surface.
 *
 * Then the series itself: every edition is the list's partition and of its
 * series, and no two editions share a SHA-256 — a publisher duplicate is
 * refused, never counted as an edition (ADR-0019 §2.2). The `list_facts@2`
 * sections describe the last edition, the list the page names; `editions`
 * and `change` compare it with the earlier editions of the same series.
 *
 * Confidence and rights are decided separately and neither reads the other
 * (`ARCHITECTURE.md` §5–6, ADR-0001). The two lists are computed apart and
 * placed side by side; nothing here adds or merges them. The one comparison,
 * `overlap` (ADR-0018 §2.3), compares their sets of keys and counts surnames.
 */
import {
  LIST_FACTS_SCHEMA_VERSION,
  listFactsArtefactSchema,
  listFactsSchema,
} from "@name-atlas/contracts";
import type { ListFacts, ListFactsArtefact } from "@name-atlas/contracts";
import {
  PESEL_RIGHTS_PROFILE,
  PESEL_SERIES_KEYS,
  PESEL_SOURCE,
  decodePeselBytes,
  parsePeselFile,
  sha256Hex,
  verifyResourceBytes,
} from "@name-atlas/sources";
import type {
  PeselRefusedResource,
  PeselResourceDescriptor,
  PeselSourceRow,
} from "@name-atlas/sources";
import { assessUniverseCompleteness } from "../completeness.js";
import type { CompletenessVerdict } from "../completeness.js";
import { assessDerivedStatistic } from "../confidence.js";
import { evaluateSurface } from "../rights.js";
import {
  LIST_CROWD_SEED_OFFSET,
  LIST_FACTS_METHOD_VERSION,
  LIST_ROOM_SEEDS,
  RANK_CONFIDENCE_ASSESSMENT_METHOD,
  RANK_CONFIDENCE_ASSESSMENT_VERSION,
} from "../version.js";
import { listBands } from "./bands.js";
import { listChange } from "./change.js";
import { birthdayReference, listCollision } from "./collision.js";
import { listConcentration } from "./concentration.js";
import { listCrowd } from "./crowd.js";
import { listDots } from "./dots.js";
import { editionFigures, listEditions } from "./editions.js";
import type { EditionFigures } from "./editions.js";
import { listEndings } from "./endings.js";
import { buildListHistogram } from "./histogram.js";
import { listHyphenated } from "./hyphenated.js";
import { listInitials } from "./initials.js";
import { listOverlap } from "./overlap.js";
import { buildListRows } from "./rows.js";
import type { ListRow } from "./rows.js";
import { listNamedTop } from "./selections.js";
import { listSummary } from "./summary.js";

/** The generator, recorded on the artefact as `generated_by`. */
export const LIST_FACTS_GENERATOR = "packages/truth/bin/build-list-facts.ts";

/** Why a list was refused. Each is a distinct, reportable situation. */
export type ListFactsRefusalReason =
  | "NOT_A_NATIONAL_LIST"
  | "UNIVERSE_INCOMPLETE"
  | "BYTES_NOT_OFFICIAL"
  | "CONFIDENCE_NOT_VERIFIED"
  | "FREE_SURFACE_NOT_ALLOWED"
  | "LISTS_MISMATCHED"
  | "SERIES_MISMATCHED"
  | "DUPLICATE_EDITION"
  | "FLOOR_MISMATCHED";

export class ListFactsRefusedError extends Error {
  override readonly name = "ListFactsRefusedError";
  readonly reason: ListFactsRefusalReason;
  constructor(reason: ListFactsRefusalReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

/**
 * The completeness gate's verdict in list-facts terms. The gate's own message
 * speaks of a rank; a list-facts refusal is about a whole list, so it is
 * worded from the verdict's fields instead.
 */
function incompleteListMessage(
  resourceId: string,
  verdict: Extract<CompletenessVerdict, { kind: "INCOMPLETE" }>,
): string {
  const why =
    verdict.reason === "CONTENT_HASH_MISMATCH"
      ? `its bytes are not the official resource (SHA-256 ${verdict.actualContentHash}, the ` +
        `registry pins ${verdict.expectedContentHash ?? "none"}); an excerpt such as ` +
        "fixtures/pesel looks like this"
      : verdict.reason === "UNKNOWN_RESOURCE"
        ? "it is not in the source registry, so whether it is whole cannot be established"
        : `it has ${verdict.actualRowCount} rows where the registry pins ` +
          `${verdict.expectedRowCount ?? "none"}`;
  return (
    `resource ${resourceId} is not the complete published list (${verdict.reason}): ${why}. ` +
    "A list fact describes a whole list, so none is derived from it"
  );
}

export interface ListInput {
  readonly descriptor: PeselResourceDescriptor;
  readonly bytes: Uint8Array;
}

/** One list's series: every edition, gated alike, and what the registry refused from it. */
export interface SeriesInput {
  /** The series' editions in date order. The last one is the list the facts describe. */
  readonly editions: readonly ListInput[];
  /** The resources the registry refused from the series (ADR-0019 §2.2). */
  readonly refused: readonly PeselRefusedResource[];
}

/** One edition past every gate: its parsed rows, its keyed rows and the decisions taken on it. */
interface GatedEdition {
  readonly descriptor: PeselResourceDescriptor & { readonly role: ListFacts["partition"] };
  readonly sha256: string;
  readonly rows: readonly PeselSourceRow[];
  /** Keyed rows in selection order (`buildListRows`). */
  readonly keyed: readonly ListRow[];
  readonly completeness: "COMPLETE";
  readonly confidence: "VERIFIED";
  readonly free: "ALLOWED";
}

/** One list's validated facts, and its keyed rows in selection order for the overlap. */
interface ComputedList {
  readonly facts: ListFacts;
  readonly rows: readonly ListRow[];
}

/** Computes, and validates against the contract, the facts of one national list's series. */
export function computeListFacts(input: SeriesInput): ListFacts {
  return computeList(input).facts;
}

/** Steps 1–5 above, on one edition; keys its rows, refusing a key twice. */
function gateEdition({ descriptor, bytes }: ListInput): GatedEdition {
  const partition = descriptor.role;
  if (partition !== "national_male" && partition !== "national_female") {
    throw new ListFactsRefusedError(
      "NOT_A_NATIONAL_LIST",
      `resource ${descriptor.resource_id} is a ${partition} resource; list facts describe a ` +
        "whole national list only",
    );
  }

  const actualSha = sha256Hex(bytes);
  const rows = parsePeselFile(decodePeselBytes(bytes));

  const completeness = assessUniverseCompleteness({
    externalRecordId: descriptor.resource_id,
    actualContentHash: actualSha,
    actualRowCount: rows.length,
    descriptor: {
      officialSha256: descriptor.official_sha256,
      officialRowCount: descriptor.official_row_count,
    },
  });
  if (completeness.kind !== "COMPLETE") {
    throw new ListFactsRefusedError(
      "UNIVERSE_INCOMPLETE",
      incompleteListMessage(descriptor.resource_id, completeness),
    );
  }

  const byteVerdict = verifyResourceBytes(descriptor, bytes);
  if (byteVerdict.kind !== "MATCH") {
    throw new ListFactsRefusedError(
      "BYTES_NOT_OFFICIAL",
      `resource ${descriptor.resource_id}: ${byteVerdict.kind}, expected ${byteVerdict.expected}, ` +
        `got ${byteVerdict.actual}`,
    );
  }

  const confidence = assessDerivedStatistic({
    // Deterministic (seeded examples included) and carrying method versions.
    computationReproducible: true,
    inputsComplete: completeness.kind === "COMPLETE",
    // The bytes are the registry's pinned official resource.
    upstreamEvidenceVerified: byteVerdict.kind === "MATCH",
    // A list fact has no competing claim: nothing else states it.
    noMaterialConflict: true,
  });
  if (confidence.status !== "VERIFIED") {
    throw new ListFactsRefusedError("CONFIDENCE_NOT_VERIFIED", confidence.rationale);
  }

  const free = evaluateSurface(PESEL_RIGHTS_PROFILE, "FREE");
  if (free.decision !== "ALLOWED") {
    throw new ListFactsRefusedError(
      "FREE_SURFACE_NOT_ALLOWED",
      `the PESEL rights profile gives the FREE surface ${free.decision} (${free.reason_code})`,
    );
  }

  return {
    descriptor: { ...descriptor, role: partition },
    sha256: actualSha,
    rows,
    keyed: buildListRows(rows),
    completeness: completeness.kind,
    confidence: confidence.status,
    free: free.decision,
  };
}

/** The `list_facts@2` sections of one gated edition: the list the page names. */
function listSections(gated: GatedEdition) {
  const { descriptor, rows, keyed } = gated;
  const partition = descriptor.role;
  // The counts in file order, for the histogram and the seeded examples; and
  // the keyed rows in selection order, for the methods that need the spelling
  // and for ADR-0018's named selections. No other method sees a surname.
  const rowCounts = rows.map((row) => row.count);
  const histogram = buildListHistogram(rowCounts);
  const roomSeed = LIST_ROOM_SEEDS[partition];

  return {
    partition,
    source: {
      dataset_id: 1681,
      external_record_id: descriptor.resource_id,
      sha256: gated.sha256,
      row_count: rows.length,
      snapshot_date: descriptor.data_date,
      source_page_url: PESEL_SOURCE.homepage_or_reference_url,
    },
    assessment: {
      completeness: gated.completeness,
      confidence_status: gated.confidence,
      confidence_method: RANK_CONFIDENCE_ASSESSMENT_METHOD,
      confidence_version: RANK_CONFIDENCE_ASSESSMENT_VERSION,
      free_surface: gated.free,
    },
    summary: listSummary(histogram),
    collision: listCollision(histogram, rowCounts, roomSeed),
    crowd: listCrowd(histogram, rowCounts, roomSeed + LIST_CROWD_SEED_OFFSET),
    dots: listDots(histogram),
    concentration: listConcentration(histogram),
    bands: listBands(histogram),
    endings: listEndings(keyed, partition, histogram.people),
    initials: listInitials(keyed),
    hyphenated: listHyphenated(keyed),
    named_top: listNamedTop(keyed),
  };
}

function computeList({ editions, refused }: SeriesInput): ComputedList {
  const role = editions[editions.length - 1]?.descriptor.role;

  // Each edition is gated in turn; only the first's and the last's rows are
  // kept, since `change` compares those two and nothing else reads a surname.
  const figures: EditionFigures[] = [];
  let first: GatedEdition | undefined;
  let last: GatedEdition | undefined;
  for (const [i, input] of editions.entries()) {
    const gated = gateEdition(input);
    const partition = gated.descriptor.role;
    const series = PESEL_SERIES_KEYS[partition];
    if (partition !== role || gated.descriptor.series !== series) {
      throw new ListFactsRefusedError(
        "SERIES_MISMATCHED",
        `resource ${gated.descriptor.resource_id} (${partition}, series ` +
          `${gated.descriptor.series ?? "none"}) is not an edition of the ` +
          `${role ?? "national"} list's series`,
      );
    }
    const twin = figures.find((edition) => edition.sha256 === gated.sha256);
    if (twin !== undefined) {
      throw new ListFactsRefusedError(
        "DUPLICATE_EDITION",
        `resource ${gated.descriptor.resource_id} (${gated.descriptor.data_date}) is ` +
          `byte-identical to resource ${twin.resource_id} (${twin.data_date}), SHA-256 ` +
          `${gated.sha256}: a publisher duplicate is not an edition (ADR-0019 §2.2)`,
      );
    }
    const figure = editionFigures(
      {
        series,
        resource_id: gated.descriptor.resource_id,
        data_date: gated.descriptor.data_date,
        sha256: gated.sha256,
      },
      gated.rows.map((row) => row.count),
    );
    const floor = figures[0]?.min_count;
    if (floor !== undefined && figure.min_count !== floor) {
      throw new ListFactsRefusedError(
        "FLOOR_MISMATCHED",
        `resource ${gated.descriptor.resource_id} (${gated.descriptor.data_date}) has a ` +
          `publication floor of ${String(figure.min_count)}, not the series' ${String(floor)}: ` +
          `editions are compared only on the same floor (ADR-0019 §1)`,
      );
    }
    figures.push(figure);
    if (i === 0) first = gated;
    if (i === editions.length - 1) last = gated;
  }
  if (first === undefined || last === undefined || figures.length < 2) {
    throw new ListFactsRefusedError(
      "SERIES_MISMATCHED",
      "a list's series needs at least two editions, its first and its last",
    );
  }

  const series = PESEL_SERIES_KEYS[last.descriptor.role];
  const sections = listSections(last);
  const facts = listFactsSchema.parse({
    ...sections,
    editions: listEditions(
      series,
      figures,
      refused.map((resource) => ({
        series: resource.series,
        resource_id: resource.resource_id,
        data_date: resource.data_date,
        sha256: resource.official_sha256,
        reason: resource.reason,
        duplicate_of: resource.duplicate_of,
      })),
    ),
    change: listChange(
      { edition: figures[0]!, rows: first.keyed },
      { edition: figures[figures.length - 1]!, rows: last.keyed },
      sections.named_top.items,
    ),
  });
  return { facts, rows: last.keyed };
}

/**
 * The artefact: the male list and the female list side by side, each
 * computed on its own from its own series, the birthday comparison (a model
 * constant) and the two lists' sets of surnames compared (ADR-0018 §2.3).
 */
export function buildListFactsArtefact(input: {
  readonly male: SeriesInput;
  readonly female: SeriesInput;
}): ListFactsArtefact {
  const maleList = input.male.editions[input.male.editions.length - 1];
  const femaleList = input.female.editions[input.female.editions.length - 1];
  if (maleList?.descriptor.role !== "national_male") {
    throw new ListFactsRefusedError("LISTS_MISMATCHED", "the male slot must hold the male list");
  }
  if (femaleList?.descriptor.role !== "national_female") {
    throw new ListFactsRefusedError(
      "LISTS_MISMATCHED",
      "the female slot must hold the female list",
    );
  }
  if (maleList.descriptor.data_date !== femaleList.descriptor.data_date) {
    throw new ListFactsRefusedError(
      "LISTS_MISMATCHED",
      "the two lists must come from the same reference date",
    );
  }
  const male = computeList(input.male);
  const female = computeList(input.female);
  return listFactsArtefactSchema.parse({
    schema_version: LIST_FACTS_SCHEMA_VERSION,
    generated_by: LIST_FACTS_GENERATOR,
    pipeline_version: LIST_FACTS_METHOD_VERSION,
    snapshot_date: maleList.descriptor.data_date,
    birthday_reference: birthdayReference(),
    lists: { male: male.facts, female: female.facts },
    overlap: listOverlap(male.rows, female.rows),
  });
}
