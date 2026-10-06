/**
 * `GIVEN_NAME_MEANING` (TASK-147, ADR-0045, D-046): what public-domain works
 * state about a first name's origin and meaning.
 *
 *   GivenName → first-name meaning SourceRecord entry → EvidenceItem → Claim
 *             → ClaimEvidence → ConfidenceAssessment → Citation
 *
 * The surname meaning chain (`meaning.ts`, ADR-0008) for a first name:
 *
 * - **One claim per name**, an `INTERPRETATION`, carrying each work's entry as
 *   the work states it. Two works stating different origins make one
 *   `CONFLICTING` claim holding both, never a winner.
 * - **Nothing is generated.** A name no work explains has no claim, and the
 *   report says so. The only words the project adds are an origin code, so
 *   works can be compared, and a literal Polish translation of an English
 *   gloss, marked as Name Atlas's (D-046 §2); both come from the source file.
 * - **Re-deriving follows the files.** A claim whose works changed is
 *   superseded by one that reads the current files; a claim no file supports
 *   any more is retracted. Unchanged, nothing is written.
 */
import { sql } from "kysely";
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { canonicalKey, NORMALIZATION_VERSION } from "@name-atlas/resolver";
import { GIVEN_NAME_MEANINGS_KIND } from "@name-atlas/sources";
import { assessGivenNameMeaning, evidenceSetHash, isValidCombination } from "./confidence.js";
import { TruthInvariantError } from "./derive.js";
import {
  GIVEN_NAME_MEANING_AGREEMENT_BASIS,
  GIVEN_NAME_MEANING_CONFIDENCE_ASSESSMENT_METHOD,
  GIVEN_NAME_MEANING_CONFIDENCE_ASSESSMENT_VERSION,
  GIVEN_NAME_MEANING_METHOD_VERSION,
  GIVEN_NAME_MEANING_PAYLOAD_VERSION,
  RUN_INPUT_SCHEMA_VERSION,
  WORKFLOW_VERSION,
} from "./version.js";

/** One work's entry for one first name, read back from a source record. */
export interface GivenNameInterpretation {
  /** The name as the file spells it, the lists' spelling. */
  readonly given_name: string;
  readonly source_id: string;
  readonly source_record_id: string;
  readonly work: {
    readonly title: string;
    readonly author_or_publisher: string;
    readonly year: number;
  };
  readonly printed_form: string;
  readonly origin: { readonly code: string; readonly as_printed: string } | null;
  readonly literal_gloss: string | null;
  readonly translation: {
    readonly language: string;
    readonly text: string;
    readonly by: string;
  } | null;
  readonly locator: string;
  readonly quotation: string;
}

export type GivenNameMeaningOutcome =
  /** No admissible work states anything about the name, and no claim stands. */
  | { readonly kind: "NO_SOURCE" }
  | {
      readonly kind: "DERIVED";
      readonly claim_id: string;
      readonly confidence_status: string;
      /** The earlier claim this one replaces, now SUPERSEDED. */
      readonly supersedes_claim_id: string | null;
    }
  | { readonly kind: "EXISTING"; readonly claim_id: string; readonly confidence_status: string }
  /** No file supports the claim any more; it is now RETRACTED. */
  | { readonly kind: "RETRACTED"; readonly claim_id: string };

/** Stable identity of the claim: what is known of this first name's meaning. */
export function givenNameMeaningClaimKey(givenNameId: string): string {
  return `GIVEN_NAME_MEANING|${givenNameId}`;
}

const text = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null;
const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/**
 * Every admissible first-name interpretation in the imported files, by the
 * name's canonical key, each name's in the works' order of publication.
 * Reads `ACTIVE` records of dictionary sources at an admissible tier
 * (ADR-0008 §4, asserted again here), and only first-name files.
 */
export async function loadGivenNameInterpretations(
  db: Kysely<DB> | Transaction<DB>,
): Promise<Map<string, GivenNameInterpretation[]>> {
  const records = await db
    .selectFrom("source_records as sr")
    .innerJoin("sources as src", "src.source_id", "sr.source_id")
    .select(["sr.source_id", "sr.source_record_id", "sr.raw_payload"])
    .where("src.source_type", "=", "DICTIONARY")
    .where("sr.record_status", "=", "ACTIVE")
    .where("src.authority_tier", "in", [
      "A_PRIMARY_OFFICIAL",
      "B_AUTHORITATIVE_INDEX",
      "C_SCHOLARLY_SECONDARY",
    ])
    .where(sql<boolean>`sr.raw_payload->>'kind' = ${GIVEN_NAME_MEANINGS_KIND}`)
    .orderBy("sr.source_record_id")
    .execute();

  const out = new Map<string, GivenNameInterpretation[]>();
  for (const r of records) {
    const payload = record(r.raw_payload);
    const work = record(payload?.["work"]);
    const entries = payload?.["entries"];
    const title = text(work?.["title"]);
    const author = text(work?.["author_or_publisher"]);
    const year = work?.["year"];
    if (!title || !author || typeof year !== "number" || !Array.isArray(entries)) continue;

    for (const raw of entries) {
      const entry = record(raw);
      const name = text(entry?.["given_name"]);
      const printed = text(entry?.["printed_form"]);
      const locator = text(entry?.["locator"]);
      const quotation = text(entry?.["quotation"]);
      if (entry === null || !name || !printed || !locator || !quotation) continue;
      const origin = record(entry["origin"]);
      const code = text(origin?.["code"]);
      const asPrinted = text(origin?.["as_printed"]);
      const translation = record(entry["translation"]);
      const translated = text(translation?.["text"]);
      const language = text(translation?.["language"]);
      const by = text(translation?.["by"]);
      const interpretation: GivenNameInterpretation = {
        given_name: name,
        source_id: r.source_id,
        source_record_id: r.source_record_id,
        work: { title, author_or_publisher: author, year },
        printed_form: printed,
        origin: code && asPrinted ? { code, as_printed: asPrinted } : null,
        literal_gloss: text(entry["literal_gloss"]),
        translation: translated && language && by ? { language, text: translated, by } : null,
        locator,
        quotation,
      };
      if (interpretation.origin === null && interpretation.literal_gloss === null) continue;
      const key = canonicalKey(name);
      out.set(key, [...(out.get(key) ?? []), interpretation]);
    }
  }
  for (const list of out.values()) {
    list.sort(
      (a, b) => a.work.year - b.work.year || a.source_record_id.localeCompare(b.source_record_id),
    );
  }
  return out;
}

/** The confidence inputs: distinct works, and the origins they state. */
export function givenNameMeaningAgreement(interpretations: readonly GivenNameInterpretation[]): {
  readonly supportingWorks: number;
  readonly worksStatingOrigin: number;
  readonly distinctOrigins: number;
} {
  const stating = interpretations.filter((i) => i.origin !== null);
  return {
    supportingWorks: new Set(interpretations.map((i) => i.source_id)).size,
    worksStatingOrigin: new Set(stating.map((i) => i.source_id)).size,
    distinctOrigins: new Set(stating.map((i) => i.origin?.code)).size,
  };
}

/** The source records a stored claim rests on, sorted. */
async function claimRecords(trx: Transaction<DB>, claimId: string): Promise<string[]> {
  const rows = await trx
    .selectFrom("claim_evidence as ce")
    .innerJoin("evidence_items as e", "e.evidence_item_id", "ce.evidence_item_id")
    .select("e.source_record_id")
    .where("ce.claim_id", "=", claimId)
    .execute();
  return rows.map((r) => r.source_record_id ?? "").sort();
}

/**
 * Derives (or keeps) one first name's meaning claim from `interpretations`,
 * the entries the current files hold for it, in one transaction.
 */
export async function deriveGivenNameMeaningFor(
  db: Kysely<DB>,
  givenNameId: string,
  interpretations: readonly GivenNameInterpretation[],
): Promise<GivenNameMeaningOutcome> {
  const claimKey = givenNameMeaningClaimKey(givenNameId);
  return db.transaction().execute(async (trx): Promise<GivenNameMeaningOutcome> => {
    const existing = await trx
      .selectFrom("claims")
      .select(["claim_id", "method_version"])
      .where("claim_key", "=", claimKey)
      .where("claim_status", "=", "ACTIVE")
      .forUpdate()
      .execute();
    if (existing.length > 1) {
      throw new TruthInvariantError(
        "CONFLICTING_ACTIVE_CLAIMS",
        `${existing.length} active claims share claim_key ${claimKey}`,
      );
    }
    const current = existing[0];

    if (interpretations.length === 0) {
      if (current === undefined) return { kind: "NO_SOURCE" };
      await trx
        .updateTable("claims")
        .set({ claim_status: "RETRACTED" })
        .where("claim_id", "=", current.claim_id)
        .execute();
      return { kind: "RETRACTED", claim_id: current.claim_id };
    }

    const wanted = [...new Set(interpretations.map((i) => i.source_record_id))].sort();
    if (current !== undefined) {
      const had = [...new Set(await claimRecords(trx, current.claim_id))].sort();
      if (
        current.method_version === GIVEN_NAME_MEANING_METHOD_VERSION &&
        had.length === wanted.length &&
        had.every((id, i) => id === wanted[i])
      ) {
        const assessment = await trx
          .selectFrom("confidence_assessments")
          .select("status")
          .where("claim_id", "=", current.claim_id)
          .orderBy("assessed_at", "desc")
          .executeTakeFirst();
        return {
          kind: "EXISTING",
          claim_id: current.claim_id,
          confidence_status: assessment?.status ?? "INSUFFICIENT_DATA",
        };
      }
      await trx
        .updateTable("claims")
        .set({ claim_status: "SUPERSEDED" })
        .where("claim_id", "=", current.claim_id)
        .execute();
    }
    return writeClaim(trx, givenNameId, claimKey, interpretations, current?.claim_id ?? null);
  });
}

async function writeClaim(
  trx: Transaction<DB>,
  givenNameId: string,
  claimKey: string,
  interpretations: readonly GivenNameInterpretation[],
  supersedes: string | null,
): Promise<GivenNameMeaningOutcome & { kind: "DERIVED" }> {
  const runId = uuidv7();
  await trx
    .insertInto("research_runs")
    .values({
      research_run_id: runId,
      run_type: "BASIC_GIVEN_NAME",
      surname_id: null,
      raw_input: JSON.stringify({ given_name_id: givenNameId, claim_key: claimKey }),
      input_schema_version: RUN_INPUT_SCHEMA_VERSION,
      workflow_version: WORKFLOW_VERSION,
      connector_manifest: JSON.stringify({
        source_ids: [...new Set(interpretations.map((i) => i.source_id))],
      }),
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

  // One evidence item per work's entry. MACHINE_EXTRACTED, as for surname
  // meanings: read out of a supplied file, not reviewed in the database.
  const evidenceIds: string[] = [];
  for (const i of interpretations) {
    const evidenceItemId = uuidv7();
    evidenceIds.push(evidenceItemId);
    await trx
      .insertInto("evidence_items")
      .values({
        evidence_item_id: evidenceItemId,
        evidence_type: "SCHOLARLY_SOURCE",
        source_record_id: i.source_record_id,
        subject_entity_id: givenNameId,
        structured_value: JSON.stringify({
          printed_form: i.printed_form,
          origin: i.origin,
          literal_gloss: i.literal_gloss,
          translation: i.translation,
          work: i.work,
        }),
        raw_excerpt: i.quotation,
        supporting_locator: i.locator,
        verification_status: "MACHINE_EXTRACTED",
        derivation_method: null,
        derivation_version: null,
        created_by_run_id: runId,
      })
      .execute();
  }

  const agreement = givenNameMeaningAgreement(interpretations);
  const claimId = uuidv7();
  await trx
    .insertInto("claims")
    .values({
      claim_id: claimId,
      claim_key: claimKey,
      claim_type: "GIVEN_NAME_MEANING",
      epistemic_type: "INTERPRETATION",
      // A statement about a name as a word (0044), never about a person.
      scope: "SHARED",
      subject_entity_id: givenNameId,
      object_entity_id: null,
      structured_value: JSON.stringify({
        payload_version: GIVEN_NAME_MEANING_PAYLOAD_VERSION,
        interpretations: interpretations.map((i) => ({
          printed_form: i.printed_form,
          origin: i.origin,
          literal_gloss: i.literal_gloss,
          translation: i.translation,
          work: i.work,
          locator: i.locator,
          quotation: i.quotation,
          source_id: i.source_id,
          source_record_id: i.source_record_id,
        })),
        supporting_works: agreement.supportingWorks,
        works_stating_origin: agreement.worksStatingOrigin,
        distinct_origins: agreement.distinctOrigins,
        agreement_basis: GIVEN_NAME_MEANING_AGREEMENT_BASIS,
        algorithm_version: GIVEN_NAME_MEANING_METHOD_VERSION,
      }),
      statement_key: null,
      claim_status: "ACTIVE",
      supersedes_claim_id: supersedes,
      created_by_run_id: runId,
      method_version: GIVEN_NAME_MEANING_METHOD_VERSION,
    })
    .execute();
  for (const evidenceItemId of evidenceIds) {
    await trx
      .insertInto("claim_evidence")
      .values({
        claim_id: claimId,
        evidence_item_id: evidenceItemId,
        relationship: "SUPPORTS",
        reason_code: "ATTRIBUTED_ONOMASTIC_INTERPRETATION",
        notes: null,
      })
      .execute();
  }

  const verdict = assessGivenNameMeaning(agreement);
  if (!isValidCombination(verdict.epistemic_type, verdict.status)) {
    throw new TruthInvariantError(
      "INVALID_EPISTEMIC_COMBINATION",
      `(${verdict.epistemic_type}, ${verdict.status}) is not permitted by docs/canonical/11 §12.3`,
    );
  }
  if (verdict.status === "VERIFIED") {
    throw new TruthInvariantError(
      "MEANING_CANNOT_BE_VERIFIED",
      "a GIVEN_NAME_MEANING claim may never be assessed VERIFIED (ADR-0008 §5, ADR-0045)",
    );
  }
  await trx
    .insertInto("confidence_assessments")
    .values({
      confidence_assessment_id: uuidv7(),
      claim_id: claimId,
      status: verdict.status,
      rationale: verdict.rationale,
      evidence_set_hash: evidenceSetHash(evidenceIds),
      assessment_method: GIVEN_NAME_MEANING_CONFIDENCE_ASSESSMENT_METHOD,
      assessment_version: GIVEN_NAME_MEANING_CONFIDENCE_ASSESSMENT_VERSION,
      human_review_required: verdict.human_review_required,
      review_status: "AUTO",
      assessed_at: new Date(),
    })
    .execute();

  // One citation per work, with the entry's locator.
  const cited = new Set<string>();
  for (const i of interpretations) {
    if (cited.has(i.source_record_id)) continue;
    cited.add(i.source_record_id);
    const r = await trx
      .selectFrom("source_records as sr")
      .innerJoin("sources as src", "src.source_id", "sr.source_id")
      .select([
        "sr.source_url",
        "sr.retrieved_at",
        "src.name",
        "src.publisher",
        "src.homepage_or_reference_url",
        "src.default_rights_profile_id",
      ])
      .where("sr.source_record_id", "=", i.source_record_id)
      .executeTakeFirstOrThrow();
    await trx
      .insertInto("citations")
      .values({
        citation_id: uuidv7(),
        source_id: i.source_id,
        source_record_id: i.source_record_id,
        title: r.name,
        publisher: r.publisher,
        publication_date: `${String(i.work.year)}-01-01`,
        url_or_reference:
          r.source_url ??
          r.homepage_or_reference_url ??
          `${i.work.author_or_publisher}, ${i.work.title} (${String(i.work.year)})`,
        supporting_locator: i.locator,
        accessed_at: r.retrieved_at,
        rights_profile_id: r.default_rights_profile_id,
        claim_id: claimId,
      })
      .execute();
  }

  await trx
    .updateTable("research_runs")
    .set({ run_status: "COMPLETE", qa_status: "PASS", completed_at: new Date() })
    .where("research_run_id", "=", runId)
    .execute();

  return {
    kind: "DERIVED",
    claim_id: claimId,
    confidence_status: verdict.status,
    supersedes_claim_id: supersedes,
  };
}

/** Derives one first name's meaning claim; the name as written, found by its canonical key. */
export async function deriveGivenNameMeaning(
  db: Kysely<DB>,
  input: string,
): Promise<GivenNameMeaningOutcome | { readonly kind: "NOT_FOUND" }> {
  const key = canonicalKey(input);
  const name = await db
    .selectFrom("given_names")
    .select("given_name_id")
    .where("canonical_key", "=", key)
    .executeTakeFirst();
  if (name === undefined) return { kind: "NOT_FOUND" };
  const all = await loadGivenNameInterpretations(db);
  return deriveGivenNameMeaningFor(db, name.given_name_id, all.get(key) ?? []);
}

export interface GivenNameMeaningTally {
  /** Names the files hold, and names with a claim standing before the run. */
  readonly names: number;
  readonly derived: number;
  readonly existing: number;
  readonly superseded: number;
  readonly retracted: number;
  /** Standing claims by confidence after the run. */
  readonly by_confidence: Readonly<Record<string, number>>;
  /** Names a file holds that are not on the lists, so have no claim. */
  readonly not_on_lists: readonly string[];
}

/**
 * Derives the meaning claim of every first name a file holds, and revisits
 * every name with a standing claim. Idempotent.
 */
export async function deriveAllGivenNameMeanings(db: Kysely<DB>): Promise<GivenNameMeaningTally> {
  const all = await loadGivenNameInterpretations(db);
  const named =
    all.size === 0
      ? []
      : await db
          .selectFrom("given_names")
          .select(["given_name_id", "canonical_key"])
          .where("canonical_key", "in", [...all.keys()])
          .execute();
  const standing = await db
    .selectFrom("claims as c")
    .innerJoin("given_names as g", "g.given_name_id", "c.subject_entity_id")
    .select(["g.given_name_id", "g.canonical_key"])
    .where(sql<boolean>`c.claim_type::text = 'GIVEN_NAME_MEANING'`)
    .where("c.claim_status", "=", "ACTIVE")
    .execute();
  const targets = new Map<string, string>();
  for (const n of [...named, ...standing]) targets.set(n.given_name_id, n.canonical_key);
  const found = new Set(named.map((n) => n.canonical_key));

  let derived = 0;
  let existing = 0;
  let superseded = 0;
  let retracted = 0;
  const byConfidence: Record<string, number> = {};
  for (const [id, key] of [...targets].sort(([a], [b]) => a.localeCompare(b))) {
    const outcome = await deriveGivenNameMeaningFor(db, id, all.get(key) ?? []);
    if (outcome.kind === "DERIVED") {
      derived += 1;
      if (outcome.supersedes_claim_id !== null) superseded += 1;
    } else if (outcome.kind === "EXISTING") {
      existing += 1;
    } else if (outcome.kind === "RETRACTED") {
      retracted += 1;
    }
    if (outcome.kind === "DERIVED" || outcome.kind === "EXISTING") {
      byConfidence[outcome.confidence_status] = (byConfidence[outcome.confidence_status] ?? 0) + 1;
    }
  }
  return {
    names: targets.size,
    derived,
    existing,
    superseded,
    retracted,
    by_confidence: byConfidence,
    not_on_lists: [...all]
      .filter(([k]) => !found.has(k))
      .map(([, list]) => list[0]?.given_name ?? "")
      .sort(),
  };
}
