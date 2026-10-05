/**
 * `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` (TASK-122, ADR-0032 §6):
 * how many people carry a first name on one PESEL list, and its rank there.
 *
 *   GivenName → given_name_counts (one per list) → EvidenceItem → Claim
 *            → ClaimEvidence → ConfidenceAssessment → Citation        (count)
 *   … → COMPLETENESS GATE → rank → derived EvidenceItem
 *     → EvidenceDependency(COUNT, UNIVERSE) → Claim → …              (rank)
 *
 * The same chain as the surname claims (`derive.ts`, `rank.ts`), with three
 * given-name rules:
 *
 *   1. **Lists stay apart.** One claim per list (a sex and a name position,
 *      its source record's comparability group). Two lists are never summed,
 *      and a name on both has two counts and two ranks (ADR-0032 §1).
 *   2. **Placeholders are not names.** The rank is over the names a complete
 *      import stored; the gate compares that set against the registry's
 *      `official_name_row_count`, which leaves the publisher's placeholder
 *      rows out (ADR-0032 §3). A rank over an excerpt is refused, never
 *      computed (`completeness.ts`).
 *   3. **Nothing about a person.** A given name is a word with a count; no
 *      claim joins it to a surname or to anyone (ADR-0032 §1, §7).
 *
 * Doubtful forms (`form_review`) get their claims like any other row: a claim
 * is not a surface, and a surface must leave them out until reviewed (§4).
 * No share or "1 in X" is derived: the placeholders' people are in the
 * publisher's total but not stored, so the universe of a share is not here.
 */
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { canonicalKey, NORMALIZATION_VERSION } from "@name-atlas/resolver";
import { GIVEN_NAME_RESOURCES_2026 } from "@name-atlas/sources";
import type { GivenNameResourceDescriptor } from "@name-atlas/sources";
import { assessUniverseCompleteness } from "./completeness.js";
import type { IncompleteReason } from "./completeness.js";
import {
  assessCurrentPopulation,
  assessDerivedStatistic,
  evidenceSetHash,
  isValidCombination,
} from "./confidence.js";
import type { ConfidenceVerdict } from "./confidence.js";
import { buildRankTable, rankInTable } from "./rank.js";
import type { RankTable } from "./rank.js";
import { TruthInvariantError } from "./derive.js";
import { loadSourceContext } from "./universe.js";
import type { DerivationSourceContext } from "./universe.js";
import {
  CONFIDENCE_ASSESSMENT_METHOD,
  CONFIDENCE_ASSESSMENT_VERSION,
  GIVEN_NAME_POPULATION_METHOD_VERSION,
  GIVEN_NAME_RANK_METHOD_VERSION,
  RANK_CONFIDENCE_ASSESSMENT_METHOD,
  RANK_CONFIDENCE_ASSESSMENT_VERSION,
  RANK_TIES_POLICY,
  RUN_INPUT_SCHEMA_VERSION,
  WORKFLOW_VERSION,
} from "./version.js";

const COUNTRY_CODE = "PL";
const RANK_DERIVATION_METHOD = "competition_rank_over_source_record_given_name_counts";

/** Stable identity of a count claim: the name on one list version. */
export function givenNamePopulationClaimKey(givenNameId: string, sourceRecordId: string): string {
  return `GIVEN_NAME_POPULATION|${givenNameId}|${sourceRecordId}`;
}

/** Stable identity of a rank claim: the name's place on one list version. */
export function givenNameRankClaimKey(givenNameId: string, sourceRecordId: string): string {
  return `GIVEN_NAME_RANK|${givenNameId}|${sourceRecordId}`;
}

/** The registry descriptor of a stored list, by the publisher's resource id. */
function descriptorOf(externalRecordId: string | null): GivenNameResourceDescriptor | undefined {
  return GIVEN_NAME_RESOURCES_2026.find((r) => r.resource_id === externalRecordId);
}

/** Per-list facts a run reuses: names stored, and the rank table once the gate passed. */
export interface GivenNameRunCache {
  readonly rowCounts: Map<string, number>;
  readonly rankTables: Map<string, RankTable>;
  readonly sources: Map<string, DerivationSourceContext>;
}

export function newGivenNameRunCache(): GivenNameRunCache {
  return { rowCounts: new Map(), rankTables: new Map(), sources: new Map() };
}

export type GivenNameClaimOutcome =
  | { readonly kind: "DERIVED" | "EXISTING"; readonly claim_id: string }
  | { readonly kind: "REFUSED"; readonly reason: IncompleteReason };

export interface GivenNameListResult {
  readonly comparability_group: string | null;
  readonly source_record_id: string;
  readonly count: number;
  readonly population: GivenNameClaimOutcome;
  /** The rank, when one was derived or already stood. */
  readonly rank: GivenNameClaimOutcome & {
    readonly value?: number;
    readonly universe_size?: number;
  };
}

export type GivenNameDerivationOutcome =
  | {
      readonly kind: "DERIVED";
      readonly given_name_id: string;
      readonly display_name: string;
      readonly lists: readonly GivenNameListResult[];
    }
  | { readonly kind: "NOT_FOUND" };

interface CountRow {
  readonly given_name_count_id: string;
  readonly source_record_id: string;
  readonly source_id: string;
  readonly count: number;
  readonly external_record_id: string | null;
  readonly content_hash: string;
  readonly comparability_group: string | null;
  readonly universe_description: string | null;
  readonly source_url: string | null;
  readonly retrieved_at: Date;
}

function checkVerdict(verdict: ConfidenceVerdict): void {
  if (!isValidCombination(verdict.epistemic_type, verdict.status)) {
    throw new TruthInvariantError(
      "INVALID_EPISTEMIC_COMBINATION",
      `(${verdict.epistemic_type}, ${verdict.status}) is not permitted by docs/canonical/11 §12.3`,
    );
  }
}

async function activeClaimId(trx: Transaction<DB>, claimKey: string): Promise<string | null> {
  const rows = await trx
    .selectFrom("claims")
    .select("claim_id")
    .where("claim_key", "=", claimKey)
    .where("claim_status", "=", "ACTIVE")
    .execute();
  if (rows.length > 1) {
    throw new TruthInvariantError(
      "CONFLICTING_ACTIVE_CLAIMS",
      `${rows.length} active claims share claim_key ${claimKey}`,
    );
  }
  return rows[0]?.claim_id ?? null;
}

/**
 * Derives (or re-reads) both claims on every list a given name is on. The
 * input is the name as written; it is found by its canonical key, as the
 * importer stored it. Idempotent: an existing ACTIVE claim is reused.
 */
export async function deriveGivenName(
  db: Kysely<DB>,
  input: string,
  cache: GivenNameRunCache = newGivenNameRunCache(),
): Promise<GivenNameDerivationOutcome> {
  const found = await db
    .selectFrom("given_names")
    .select(["given_name_id", "canonical_display"])
    .where("canonical_key", "=", canonicalKey(input))
    .executeTakeFirst();
  if (found === undefined) return { kind: "NOT_FOUND" };
  return deriveGivenNameById(db, found.given_name_id, found.canonical_display, cache);
}

async function deriveGivenNameById(
  db: Kysely<DB>,
  givenNameId: string,
  displayName: string,
  cache: GivenNameRunCache,
): Promise<GivenNameDerivationOutcome & { kind: "DERIVED" }> {
  const rows: CountRow[] = await db
    .selectFrom("given_name_counts as c")
    .innerJoin("source_records as sr", "sr.source_record_id", "c.source_record_id")
    .select([
      "c.given_name_count_id",
      "c.source_record_id",
      "sr.source_id",
      "c.count",
      "sr.external_record_id",
      "sr.content_hash",
      "sr.comparability_group",
      "sr.universe_description",
      "sr.source_url",
      "sr.retrieved_at",
    ])
    .where("c.given_name_id", "=", givenNameId)
    .where("sr.record_status", "=", "ACTIVE")
    .orderBy("sr.comparability_group")
    .execute();

  // The universe facts are read outside the writing transaction, once per list.
  for (const row of rows) {
    if (!cache.rowCounts.has(row.source_record_id)) {
      const n = await db
        .selectFrom("given_name_counts")
        .select((eb) => eb.fn.countAll<string>().as("n"))
        .where("source_record_id", "=", row.source_record_id)
        .executeTakeFirstOrThrow();
      cache.rowCounts.set(row.source_record_id, Number(n.n));
    }
    if (!cache.sources.has(row.source_id)) {
      cache.sources.set(row.source_id, await loadSourceContext(db, row.source_id));
    }
  }

  const lists = await db.transaction().execute(async (trx) => {
    let runId: string | null = null;
    const run = async (): Promise<string> => {
      if (runId !== null) return runId;
      runId = uuidv7();
      await trx
        .insertInto("research_runs")
        .values({
          research_run_id: runId,
          run_type: "BASIC_GIVEN_NAME",
          surname_id: null,
          raw_input: JSON.stringify({ given_name_id: givenNameId }),
          input_schema_version: RUN_INPUT_SCHEMA_VERSION,
          workflow_version: WORKFLOW_VERSION,
          connector_manifest: JSON.stringify({ source_ids: rows.map((r) => r.source_id) }),
          prompt_manifest: JSON.stringify({}),
          model_manifest: JSON.stringify({}),
          normalization_version: NORMALIZATION_VERSION,
          rights_snapshot_hash: null,
          run_status: "RUNNING",
          qa_status: "NOT_RUN",
          started_at: new Date(),
          completed_at: null,
          error_summary: null,
        })
        .execute();
      return runId;
    };

    const out: GivenNameListResult[] = [];
    for (const row of rows) {
      out.push(await deriveList(trx, givenNameId, row, cache, run));
    }
    if (runId !== null) {
      await trx
        .updateTable("research_runs")
        .set({ run_status: "COMPLETE", qa_status: "PASS", completed_at: new Date() })
        .where("research_run_id", "=", runId)
        .execute();
    }
    return out;
  });

  return { kind: "DERIVED", given_name_id: givenNameId, display_name: displayName, lists };
}

async function deriveList(
  trx: Transaction<DB>,
  givenNameId: string,
  row: CountRow,
  cache: GivenNameRunCache,
  run: () => Promise<string>,
): Promise<GivenNameListResult> {
  const base = {
    comparability_group: row.comparability_group,
    source_record_id: row.source_record_id,
    count: row.count,
  };
  const descriptor = descriptorOf(row.external_record_id);
  if (descriptor === undefined) {
    // No registry entry: no dated count can be cited, and no universe checked.
    const refused = { kind: "REFUSED", reason: "UNKNOWN_RESOURCE" } as const;
    return { ...base, population: refused, rank: refused };
  }
  if (!Number.isInteger(row.count) || row.count < 2) {
    throw new TruthInvariantError(
      "INVALID_DISTRIBUTION_COUNT",
      `given_name_count ${row.given_name_count_id} has count ${row.count}, which violates the ` +
        "publisher's minimum of 2",
    );
  }
  const source = cache.sources.get(row.source_id);
  if (source === undefined) throw new Error(`source ${row.source_id} was not loaded`);

  // --- The count ----------------------------------------------------------
  const populationKey = givenNamePopulationClaimKey(givenNameId, row.source_record_id);
  let populationClaimId = await activeClaimId(trx, populationKey);
  let countEvidenceId: string;
  let population: GivenNameClaimOutcome;
  if (populationClaimId !== null) {
    const link = await trx
      .selectFrom("claim_evidence")
      .select("evidence_item_id")
      .where("claim_id", "=", populationClaimId)
      .executeTakeFirstOrThrow();
    countEvidenceId = link.evidence_item_id;
    population = { kind: "EXISTING", claim_id: populationClaimId };
  } else {
    const runId = await run();
    countEvidenceId = uuidv7();
    await trx
      .insertInto("evidence_items")
      .values({
        evidence_item_id: countEvidenceId,
        evidence_type: "OFFICIAL_DATASET_FIELD",
        source_record_id: row.source_record_id,
        subject_entity_id: givenNameId,
        structured_value: JSON.stringify({
          count: row.count,
          given_name_count_id: row.given_name_count_id,
          as_of_date: descriptor.data_date,
          universe_description: row.universe_description,
        }),
        raw_excerpt: null,
        supporting_locator: `given_name_count:${row.given_name_count_id}`,
        verification_status: "VERIFIED",
        derivation_method: null,
        derivation_version: null,
        created_by_run_id: runId,
      })
      .execute();
    populationClaimId = uuidv7();
    await trx
      .insertInto("claims")
      .values({
        claim_id: populationClaimId,
        claim_key: populationKey,
        claim_type: "GIVEN_NAME_POPULATION",
        epistemic_type: "FACT",
        scope: "SHARED",
        subject_entity_id: givenNameId,
        object_entity_id: null,
        structured_value: JSON.stringify({
          count: row.count,
          country_code: COUNTRY_CODE,
          snapshot_date: descriptor.data_date,
          source_population_scope: row.universe_description,
          comparability_group: row.comparability_group,
        }),
        statement_key: null,
        claim_status: "ACTIVE",
        supersedes_claim_id: null,
        created_by_run_id: runId,
        method_version: GIVEN_NAME_POPULATION_METHOD_VERSION,
      })
      .execute();
    await trx
      .insertInto("claim_evidence")
      .values({
        claim_id: populationClaimId,
        evidence_item_id: countEvidenceId,
        relationship: "SUPPORTS",
        reason_code: "OFFICIAL_DATASET_VALUE_FOR_GIVEN_NAME",
        notes: null,
      })
      .execute();
    const verdict = assessCurrentPopulation({
      extractionReproducible: true,
      exactResolution: true,
      sourceScopePreserved: (row.universe_description ?? "").trim().length > 0,
      noMaterialConflict: true,
    });
    checkVerdict(verdict);
    await insertAssessmentAndCitation(trx, {
      claimId: populationClaimId,
      evidenceIds: [countEvidenceId],
      verdict,
      method: CONFIDENCE_ASSESSMENT_METHOD,
      version: CONFIDENCE_ASSESSMENT_VERSION,
      row,
      source,
      dataDate: descriptor.data_date,
    });
    population = { kind: "DERIVED", claim_id: populationClaimId };
  }

  // --- The rank: only over a complete list -----------------------------------
  const verdict = assessUniverseCompleteness({
    externalRecordId: row.external_record_id,
    actualContentHash: row.content_hash,
    actualRowCount: cache.rowCounts.get(row.source_record_id) ?? 0,
    descriptor: {
      officialSha256: descriptor.official_sha256,
      officialRowCount: descriptor.official_name_row_count,
    },
  });
  if (verdict.kind === "INCOMPLETE") {
    return { ...base, population, rank: { kind: "REFUSED", reason: verdict.reason } };
  }
  let table = cache.rankTables.get(row.source_record_id);
  if (table === undefined) {
    const histogram = await trx
      .selectFrom("given_name_counts")
      .select(["count", (eb) => eb.fn.countAll<string>().as("frequency")])
      .where("source_record_id", "=", row.source_record_id)
      .groupBy("count")
      .execute();
    table = buildRankTable(
      histogram.map((h) => ({ count: h.count, frequency: Number(h.frequency) })),
    );
    cache.rankTables.set(row.source_record_id, table);
  }
  const rank = rankInTable(table, row.count);
  const universeSize = verdict.universeSize;

  const rankKey = givenNameRankClaimKey(givenNameId, row.source_record_id);
  const existingRank = await activeClaimId(trx, rankKey);
  if (existingRank !== null) {
    return {
      ...base,
      population,
      rank: { kind: "EXISTING", claim_id: existingRank, value: rank, universe_size: universeSize },
    };
  }

  const runId = await run();
  const universeEvidenceId = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: universeEvidenceId,
      evidence_type: "AUTHORITATIVE_INDEX",
      source_record_id: row.source_record_id,
      subject_entity_id: null,
      structured_value: JSON.stringify({
        universe_kind: "SOURCE_RECORD_GIVEN_NAME_COUNTS",
        universe_size: universeSize,
        source_record_id: row.source_record_id,
        external_record_id: row.external_record_id,
        comparability_group: row.comparability_group,
        completeness_basis:
          "registry official_sha256 and official_name_row_count both matched; placeholders excluded",
      }),
      raw_excerpt: null,
      supporting_locator: `source_record:${row.source_record_id}`,
      verification_status: "VERIFIED",
      derivation_method: null,
      derivation_version: null,
      created_by_run_id: runId,
    })
    .execute();
  const derivedEvidenceId = uuidv7();
  await trx
    .insertInto("evidence_items")
    .values({
      evidence_item_id: derivedEvidenceId,
      evidence_type: "DERIVED_STATISTIC",
      source_record_id: row.source_record_id,
      subject_entity_id: givenNameId,
      structured_value: JSON.stringify({
        rank,
        count: row.count,
        universe_size: universeSize,
        ties_policy: RANK_TIES_POLICY,
        algorithm_version: GIVEN_NAME_RANK_METHOD_VERSION,
      }),
      raw_excerpt: null,
      supporting_locator: `source_record:${row.source_record_id}`,
      verification_status: "VERIFIED",
      derivation_method: RANK_DERIVATION_METHOD,
      derivation_version: GIVEN_NAME_RANK_METHOD_VERSION,
      created_by_run_id: runId,
    })
    .execute();
  for (const [dependsOn, role] of [
    [countEvidenceId, "COUNT"],
    [universeEvidenceId, "UNIVERSE"],
  ] as const) {
    await trx
      .insertInto("evidence_dependencies")
      .values({
        evidence_dependency_id: uuidv7(),
        derived_evidence_item_id: derivedEvidenceId,
        depends_on_evidence_item_id: dependsOn,
        dependency_role: role,
      })
      .execute();
  }
  const rankClaimId = uuidv7();
  await trx
    .insertInto("claims")
    .values({
      claim_id: rankClaimId,
      claim_key: rankKey,
      claim_type: "GIVEN_NAME_RANK",
      epistemic_type: "FACT",
      scope: "SHARED",
      subject_entity_id: givenNameId,
      object_entity_id: null,
      structured_value: JSON.stringify({
        rank,
        universe_size: universeSize,
        ties_policy: RANK_TIES_POLICY,
        country_code: COUNTRY_CODE,
        snapshot_date: descriptor.data_date,
        comparability_group: row.comparability_group,
      }),
      statement_key: null,
      claim_status: "ACTIVE",
      supersedes_claim_id: null,
      created_by_run_id: runId,
      method_version: GIVEN_NAME_RANK_METHOD_VERSION,
    })
    .execute();
  await trx
    .insertInto("claim_evidence")
    .values({
      claim_id: rankClaimId,
      evidence_item_id: derivedEvidenceId,
      relationship: "SUPPORTS",
      reason_code: "DERIVED_RANK_FOR_GIVEN_NAME",
      notes: null,
    })
    .execute();
  const rankVerdict = assessDerivedStatistic({
    computationReproducible: true,
    inputsComplete: true,
    upstreamEvidenceVerified: true,
    noMaterialConflict: true,
  });
  checkVerdict(rankVerdict);
  await insertAssessmentAndCitation(trx, {
    claimId: rankClaimId,
    evidenceIds: [derivedEvidenceId],
    verdict: rankVerdict,
    method: RANK_CONFIDENCE_ASSESSMENT_METHOD,
    version: RANK_CONFIDENCE_ASSESSMENT_VERSION,
    row,
    source,
    dataDate: descriptor.data_date,
  });
  return {
    ...base,
    population,
    rank: { kind: "DERIVED", claim_id: rankClaimId, value: rank, universe_size: universeSize },
  };
}

async function insertAssessmentAndCitation(
  trx: Transaction<DB>,
  args: {
    readonly claimId: string;
    readonly evidenceIds: readonly string[];
    readonly verdict: ConfidenceVerdict;
    readonly method: string;
    readonly version: string;
    readonly row: CountRow;
    readonly source: DerivationSourceContext;
    readonly dataDate: string;
  },
): Promise<void> {
  const { claimId, verdict, row, source } = args;
  await trx
    .insertInto("confidence_assessments")
    .values({
      confidence_assessment_id: uuidv7(),
      claim_id: claimId,
      status: verdict.status,
      rationale: verdict.rationale,
      evidence_set_hash: evidenceSetHash([...args.evidenceIds]),
      assessment_method: args.method,
      assessment_version: args.version,
      human_review_required: verdict.human_review_required,
      review_status: "AUTO",
      assessed_at: new Date(),
    })
    .execute();
  await trx
    .insertInto("citations")
    .values({
      citation_id: uuidv7(),
      source_id: source.source_id,
      source_record_id: row.source_record_id,
      title: source.name,
      publisher: source.publisher,
      publication_date: args.dataDate,
      url_or_reference:
        row.source_url ?? source.homepage_or_reference_url ?? source.rights_url ?? "",
      supporting_locator: row.external_record_id ? `resource:${row.external_record_id}` : null,
      accessed_at: row.retrieved_at,
      rights_profile_id: source.rights_profile_id,
      claim_id: claimId,
    })
    .execute();
}

/** Register-wide tallies of {@link deriveGivenName}. */
export interface GivenNameRunTally {
  readonly names: number;
  readonly population: {
    readonly derived: number;
    readonly existing: number;
    readonly refused: number;
  };
  readonly rank: {
    readonly derived: number;
    readonly existing: number;
    readonly refused: Readonly<Partial<Record<IncompleteReason, number>>>;
  };
}

export interface GivenNameRunOptions {
  readonly concurrency?: number;
  readonly batchSize?: number;
  readonly limit?: number;
  readonly onProgress?: (names: number) => void;
}

/**
 * Derives both claims for every stored given name, in `given_name_id` order,
 * `concurrency` names at once, with one cache for the run. Idempotent.
 */
export async function deriveAllGivenNames(
  db: Kysely<DB>,
  options: GivenNameRunOptions = {},
): Promise<GivenNameRunTally> {
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const batchSize = options.batchSize ?? 500;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const cache = newGivenNameRunCache();
  const population = { derived: 0, existing: 0, refused: 0 };
  const rank = {
    derived: 0,
    existing: 0,
    refused: {} as Partial<Record<IncompleteReason, number>>,
  };
  let names = 0;
  let after = "00000000-0000-0000-0000-000000000000";

  while (names < limit) {
    const batch = await db
      .selectFrom("given_names")
      .select(["given_name_id", "canonical_display"])
      .where("given_name_id", ">", after)
      .orderBy("given_name_id")
      .limit(Math.min(batchSize, limit - names))
      .execute();
    if (batch.length === 0) break;
    after = batch[batch.length - 1]?.given_name_id ?? after;

    let next = 0;
    const worker = async () => {
      for (let i = next++; i < batch.length; i = next++) {
        const row = batch[i];
        if (row === undefined) continue;
        const outcome = await deriveGivenNameById(
          db,
          row.given_name_id,
          row.canonical_display,
          cache,
        );
        for (const list of outcome.lists) {
          if (list.population.kind === "REFUSED") population.refused += 1;
          else population[list.population.kind === "DERIVED" ? "derived" : "existing"] += 1;
          if (list.rank.kind === "REFUSED") {
            rank.refused[list.rank.reason] = (rank.refused[list.rank.reason] ?? 0) + 1;
          } else {
            rank[list.rank.kind === "DERIVED" ? "derived" : "existing"] += 1;
          }
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    names += batch.length;
    options.onProgress?.(names);
  }
  return { names, population, rank };
}
