/**
 * `list_facts_pipeline@1` — from the bytes of one published national list to
 * its validated facts, and from the two lists to the `list_facts@1` artefact
 * (TASK-040, ADR-0015, `docs/contracts/list-facts.md`).
 *
 * Pure: bytes in, facts out, no file system and no database. The generator
 * (`bin/build-list-facts.ts`) reads the files and writes the result.
 *
 * Fail-closed, in this order, with no switch to get past any step:
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
 * Confidence and rights are decided separately and neither reads the other
 * (`ARCHITECTURE.md` §5–6, ADR-0001). The two lists are computed apart and
 * placed side by side; nothing here adds, merges or compares them.
 */
import {
  LIST_FACTS_SCHEMA_VERSION,
  listFactsArtefactSchema,
  listFactsSchema,
} from "@name-atlas/contracts";
import type { ListFacts, ListFactsArtefact } from "@name-atlas/contracts";
import {
  PESEL_RIGHTS_PROFILE,
  PESEL_SOURCE,
  decodePeselBytes,
  parsePeselFile,
  sha256Hex,
  verifyResourceBytes,
} from "@name-atlas/sources";
import type { PeselResourceDescriptor } from "@name-atlas/sources";
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
import { birthdayReference, listCollision } from "./collision.js";
import { listCrowd } from "./crowd.js";
import { buildListHistogram } from "./histogram.js";
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
  | "LISTS_MISMATCHED";

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

/** Computes, and validates against the contract, the facts of one national list. */
export function computeListFacts({ descriptor, bytes }: ListInput): ListFacts {
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

  // The surname strings stop here: only the counts, in file order, go on.
  const rowCounts = rows.map((row) => row.count);
  const histogram = buildListHistogram(rowCounts);
  const roomSeed = LIST_ROOM_SEEDS[partition];

  return listFactsSchema.parse({
    partition,
    source: {
      dataset_id: 1681,
      external_record_id: descriptor.resource_id,
      sha256: actualSha,
      row_count: rows.length,
      snapshot_date: descriptor.data_date,
      source_page_url: PESEL_SOURCE.homepage_or_reference_url,
    },
    assessment: {
      completeness: completeness.kind,
      confidence_status: confidence.status,
      confidence_method: RANK_CONFIDENCE_ASSESSMENT_METHOD,
      confidence_version: RANK_CONFIDENCE_ASSESSMENT_VERSION,
      free_surface: free.decision,
    },
    summary: listSummary(histogram),
    collision: listCollision(histogram, rowCounts, roomSeed),
    crowd: listCrowd(histogram, rowCounts, roomSeed + LIST_CROWD_SEED_OFFSET),
  });
}

/**
 * The artefact: the male list and the female list side by side, each
 * computed on its own, plus the birthday comparison (a model constant).
 */
export function buildListFactsArtefact(input: {
  readonly male: ListInput;
  readonly female: ListInput;
}): ListFactsArtefact {
  if (input.male.descriptor.role !== "national_male") {
    throw new ListFactsRefusedError("LISTS_MISMATCHED", "the male slot must hold the male list");
  }
  if (input.female.descriptor.role !== "national_female") {
    throw new ListFactsRefusedError(
      "LISTS_MISMATCHED",
      "the female slot must hold the female list",
    );
  }
  if (input.male.descriptor.data_date !== input.female.descriptor.data_date) {
    throw new ListFactsRefusedError(
      "LISTS_MISMATCHED",
      "the two lists must come from the same reference date",
    );
  }
  return listFactsArtefactSchema.parse({
    schema_version: LIST_FACTS_SCHEMA_VERSION,
    generated_by: LIST_FACTS_GENERATOR,
    pipeline_version: LIST_FACTS_METHOD_VERSION,
    snapshot_date: input.male.descriptor.data_date,
    birthday_reference: birthdayReference(),
    lists: { male: computeListFacts(input.male), female: computeListFacts(input.female) },
  });
}
