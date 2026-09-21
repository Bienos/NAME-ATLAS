import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { canonicalKey, NORMALIZATION_VERSION, resolveSurname } from "@name-atlas/resolver";
import { assessSurnameMeaning, evidenceSetHash, isValidCombination } from "./confidence.js";
import { TruthInvariantError } from "./derive.js";
import { loadSourceContext } from "./universe.js";
import type { DerivationSourceContext } from "./universe.js";
import { evaluateAllSurfaces } from "./rights.js";
import type { EffectiveRights, SurfaceEligibility } from "./rights.js";
import {
  MEANING_AGREEMENT_BASIS,
  MEANING_CONFIDENCE_ASSESSMENT_METHOD,
  MEANING_CONFIDENCE_ASSESSMENT_VERSION,
  RUN_INPUT_SCHEMA_VERSION,
  SURNAME_MEANING_METHOD_VERSION,
  SURNAME_MEANING_PAYLOAD_VERSION,
  WORKFLOW_VERSION,
} from "./version.js";
import type { CanonicalSurnameIdentity } from "./result.js";

/**
 * The `SURNAME_MEANING` truth chain (TASK-022, ADR-0008).
 *
 *   Surname → onomastic SourceRecord entry → EvidenceItem → Claim
 *           → ClaimEvidence → ConfidenceAssessment → Citation
 *
 * `docs/canonical/11` §8 types this claim as an `INTERPRETATION` supported by
 * "Scholarly onomastic evidence", with LIKELY/POSSIBLE/CONFLICTING confidence.
 * Every word of that matters here:
 *
 * - **Interpretation, not fact.** The chain never emits `VERIFIED`.
 * - **Scholarly evidence, or nothing.** ADR-0008 §2 prohibits generating a
 *   meaning. There is no inference from surname form in this module, no
 *   fallback, and no hedged guess. Zero admissible works produce **zero
 *   claims**, and the read path turns that into a stated gap.
 * - **Disagreement is preserved.** Two works proposing different roots yield
 *   one `CONFLICTING` claim carrying both, never an average and never a winner.
 *
 * What this module never does: write a meaning it was not given, merge two
 * works' wording into one gloss, or let a rights value influence a confidence
 * value (`ARCHITECTURE.md` §10 invariant 2).
 */

/** An interpretation as one work states it, read back from a source record. */
export interface OnomasticInterpretation {
  readonly source_id: string;
  readonly source_record_id: string;
  readonly work_title: string;
  readonly work_author_or_publisher: string;
  readonly work_year: number;
  readonly root_form: string | null;
  readonly root_language: string | null;
  readonly literal_gloss: string;
  readonly formation_type: string;
  readonly locator: string;
  readonly quotation: string | null;
}

export interface SurnameMeaningClaimResult {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly method_version: string;
  readonly interpretations: readonly OnomasticInterpretation[];
  readonly confidence_status: string;
  readonly rationale: string | null;
  readonly human_review_required: boolean;
}

export type SurnameMeaningResult =
  | {
      readonly kind: "NO_RESULT";
      readonly reason: string;
      readonly resolution_status: string;
      readonly surname: CanonicalSurnameIdentity | null;
      readonly message: string;
    }
  | {
      readonly kind: "RESULT";
      readonly resolution_status: string;
      readonly surname: CanonicalSurnameIdentity;
      readonly meaning: SurnameMeaningClaimResult | null;
      readonly surface_eligibility: readonly SurfaceEligibility[];
    };

/**
 * Stable semantic identity for the claim. One meaning claim per surname: the
 * claim is "what this surname means", and competing interpretations are
 * evidence *within* it rather than rival claims, which is what lets a
 * disagreement be assessed `CONFLICTING` instead of producing two claims that
 * each look confident alone.
 */
export function surnameMeaningClaimKey(surnameId: string): string {
  return `SURNAME_MEANING|${surnameId}`;
}

interface OnomasticRecordRow {
  readonly source_id: string;
  readonly source_record_id: string;
  readonly raw_payload: unknown;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Reads every admissible interpretation of one surname out of the onomastic
 * source records already imported.
 *
 * Matches on the resolver's canonical key, so a work spelling an entry in a
 * different case still matches, and a work spelling it differently does not —
 * which is correct: that would be a different surname, and claiming otherwise
 * would be a variant relation this task does not build.
 */
export async function loadInterpretations(
  db: Kysely<DB>,
  canonicalKeyValue: string,
): Promise<readonly OnomasticInterpretation[]> {
  const records = await db
    .selectFrom("source_records as sr")
    .innerJoin("sources as src", "src.source_id", "sr.source_id")
    .select(["sr.source_id", "sr.source_record_id", "sr.raw_payload"])
    .where("src.source_type", "=", "DICTIONARY")
    .where("sr.record_status", "=", "ACTIVE")
    // Admissibility condition 3 is enforced at import, and asserted again here
    // so a tier downgraded after import stops supporting a claim.
    .where("src.authority_tier", "in", [
      "A_PRIMARY_OFFICIAL",
      "B_AUTHORITATIVE_INDEX",
      "C_SCHOLARLY_SECONDARY",
    ])
    .orderBy("sr.created_at")
    .execute();

  const found: OnomasticInterpretation[] = [];

  for (const record of records as readonly OnomasticRecordRow[]) {
    const payload = asObject(record.raw_payload);
    const work = asObject(payload?.["work"]);
    const entries = payload?.["entries"];
    if (!work || !Array.isArray(entries)) continue;

    const title = text(work["title"]);
    const author = text(work["author_or_publisher"]);
    const year = work["year"];
    if (!title || !author || typeof year !== "number") continue;

    for (const raw of entries) {
      const entry = asObject(raw);
      if (!entry) continue;
      const surname = text(entry["surname"]);
      const gloss = text(entry["literal_gloss"]);
      const locator = text(entry["locator"]);
      if (!surname || !gloss || !locator) continue;
      // The work's own spelling is normalised with the resolver's own rule, so
      // "the same surname" means the same thing here as everywhere else.
      if (canonicalKey(surname) !== canonicalKeyValue) continue;

      found.push({
        source_id: record.source_id,
        source_record_id: record.source_record_id,
        work_title: title,
        work_author_or_publisher: author,
        work_year: year,
        root_form: text(entry["root_form"]),
        root_language: text(entry["root_language"]),
        literal_gloss: gloss,
        formation_type: text(entry["formation_type"]) ?? "UNKNOWN",
        locator,
        quotation: text(entry["quotation"]),
      });
    }
  }

  return found;
}

/**
 * Whether every interpretation proposes the same root and language
 * (`MEANING_AGREEMENT_BASIS`).
 *
 * An interpretation with no root proposed cannot agree with one that has a
 * root: "we don't know the root but it means X" and "the root is Y" are
 * different statements, and collapsing them would invent agreement.
 */
export function interpretationsAgree(interpretations: readonly OnomasticInterpretation[]): boolean {
  if (interpretations.length <= 1) return true;
  const key = (i: OnomasticInterpretation): string =>
    `${(i.root_form ?? "").toLocaleLowerCase()}|${(i.root_language ?? "").toLocaleLowerCase()}`;
  const first = key(interpretations[0]!);
  return interpretations.every((i) => key(i) === first);
}

/** How many distinct works support the interpretations, not how many entries. */
export function distinctWorks(interpretations: readonly OnomasticInterpretation[]): number {
  return new Set(interpretations.map((i) => i.source_id)).size;
}

export interface DeriveMeaningOptions {
  /** Overridable so tests can exercise a restrictive rights posture. */
  readonly rightsOverride?: EffectiveRights;
}

/**
 * Derives (or re-reads) the `SURNAME_MEANING` chain for one raw surname input.
 *
 * Returns `meaning: null` — not an empty claim — when no admissible work covers
 * the surname. That is the state ADR-0008 §3 makes a first-class result, and it
 * is the expected outcome for every surname until an onomastic source is
 * imported.
 */
export async function deriveSurnameMeaning(
  db: Kysely<DB>,
  rawInput: string,
  options: DeriveMeaningOptions = {},
): Promise<SurnameMeaningResult> {
  const lookup = await resolveSurname(db, rawInput);
  if (lookup.kind === "LOOKUP_FAILED") {
    return {
      kind: "NO_RESULT",
      reason: "LOOKUP_FAILED",
      resolution_status: "LOOKUP_FAILED",
      surname: null,
      message: `resolution lookup failed at ${lookup.stage}`,
    };
  }

  const resolution = lookup.resolution;
  const status = resolution.resolution_status;
  if (resolution.outcome === "INVALID_INPUT") {
    return {
      kind: "NO_RESULT",
      reason: "INVALID_INPUT",
      resolution_status: status,
      surname: null,
      message: `input rejected by validation: ${status}`,
    };
  }
  if (status !== "EXACT" || !resolution.resolved_surname_id) {
    return {
      kind: "NO_RESULT",
      reason: "UNRESOLVED",
      resolution_status: status,
      surname: null,
      message: "input did not resolve exactly to a canonical surname",
    };
  }

  const surnameRow = await db
    .selectFrom("surnames")
    .select(["surname_id", "canonical_display", "canonical_key", "primary_script"])
    .where("surname_id", "=", resolution.resolved_surname_id)
    .executeTakeFirst();
  if (!surnameRow) {
    throw new TruthInvariantError(
      "RESOLVED_SURNAME_MISSING",
      `resolver returned surname ${resolution.resolved_surname_id} which does not exist`,
    );
  }
  const surname: CanonicalSurnameIdentity = {
    surname_id: surnameRow.surname_id,
    canonical_display: surnameRow.canonical_display,
    canonical_key: surnameRow.canonical_key,
    primary_script: surnameRow.primary_script,
  };

  const interpretations = await loadInterpretations(db, surname.canonical_key);

  if (interpretations.length === 0) {
    // ADR-0008 §3. No claim is written, and no rights are evaluated, because
    // there is no source whose rights could be in force. The read path turns
    // this into NO_SOURCED_MEANING.
    return {
      kind: "RESULT",
      resolution_status: status,
      surname,
      meaning: null,
      surface_eligibility: [],
    };
  }

  // Rights come from the work supporting the claim. Where several works
  // support it, the most restrictive posture governs, because publishing the
  // claim publishes all of its evidence.
  const source = await loadSourceContext(db, interpretations[0]!.source_id);
  const surfaceEligibility = evaluateAllSurfaces(options.rightsOverride ?? source.rights);

  const meaning = await db
    .transaction()
    .execute(async (trx) => deriveOneMeaning(trx, surname, interpretations, source));

  return {
    kind: "RESULT",
    resolution_status: status,
    surname,
    meaning,
    surface_eligibility: surfaceEligibility,
  };
}

async function deriveOneMeaning(
  trx: Transaction<DB>,
  surname: CanonicalSurnameIdentity,
  interpretations: readonly OnomasticInterpretation[],
  source: DerivationSourceContext,
): Promise<SurnameMeaningClaimResult> {
  const claimKey = surnameMeaningClaimKey(surname.surname_id);

  const existing = await trx
    .selectFrom("claims")
    .select(["claim_id"])
    .where("claim_key", "=", claimKey)
    .where("claim_status", "=", "ACTIVE")
    .execute();
  if (existing.length > 1) {
    throw new TruthInvariantError(
      "CONFLICTING_ACTIVE_CLAIMS",
      `${existing.length} active claims share claim_key ${claimKey}`,
    );
  }
  const existingClaim = existing[0];
  if (existingClaim) {
    return projectMeaning(trx, existingClaim.claim_id, interpretations);
  }

  const runId = uuidv7();
  await trx
    .insertInto("research_runs")
    .values({
      research_run_id: runId,
      run_type: "BASIC_SURNAME",
      surname_id: surname.surname_id,
      raw_input: JSON.stringify({ surname_id: surname.surname_id, claim_key: claimKey }),
      input_schema_version: RUN_INPUT_SCHEMA_VERSION,
      workflow_version: WORKFLOW_VERSION,
      connector_manifest: JSON.stringify({ source_id: source.source_id, source_name: source.name }),
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

  // --- One evidence item per attributed interpretation --------------------
  // SCHOLARLY_SOURCE, and MACHINE_EXTRACTED: the text was read out of a
  // supplied file without human review, and saying otherwise would overstate
  // it (docs/canonical/11 §9.3's verification vocabulary).
  const evidenceIds: string[] = [];
  for (const interpretation of interpretations) {
    const evidenceItemId = uuidv7();
    evidenceIds.push(evidenceItemId);
    await trx
      .insertInto("evidence_items")
      .values({
        evidence_item_id: evidenceItemId,
        evidence_type: "SCHOLARLY_SOURCE",
        source_record_id: interpretation.source_record_id,
        subject_entity_id: surname.surname_id,
        structured_value: JSON.stringify({
          root_form: interpretation.root_form,
          root_language: interpretation.root_language,
          literal_gloss: interpretation.literal_gloss,
          formation_type: interpretation.formation_type,
          work: {
            title: interpretation.work_title,
            author_or_publisher: interpretation.work_author_or_publisher,
            year: interpretation.work_year,
          },
        }),
        // The work's own wording, where the file carried it. Never rewritten.
        raw_excerpt: interpretation.quotation,
        supporting_locator: interpretation.locator,
        verification_status: "MACHINE_EXTRACTED",
        derivation_method: null,
        derivation_version: null,
        created_by_run_id: runId,
      })
      .execute();
  }

  const works = distinctWorks(interpretations);
  const agree = interpretationsAgree(interpretations);

  // --- Claim: one per surname, carrying every interpretation --------------
  const claimId = uuidv7();
  await trx
    .insertInto("claims")
    .values({
      claim_id: claimId,
      claim_key: claimKey,
      claim_type: "SURNAME_MEANING",
      // docs/canonical/11 §8: an INTERPRETATION, whatever its support.
      epistemic_type: "INTERPRETATION",
      scope: "SURNAME_LEVEL",
      subject_entity_id: surname.surname_id,
      object_entity_id: null,
      structured_value: JSON.stringify({
        payload_version: SURNAME_MEANING_PAYLOAD_VERSION,
        interpretations: interpretations.map((i) => ({
          root_form: i.root_form,
          root_language: i.root_language,
          literal_gloss: i.literal_gloss,
          formation_type: i.formation_type,
          work: {
            title: i.work_title,
            author_or_publisher: i.work_author_or_publisher,
            year: i.work_year,
          },
          locator: i.locator,
          source_id: i.source_id,
          source_record_id: i.source_record_id,
        })),
        supporting_works: works,
        works_agree: agree,
        agreement_basis: MEANING_AGREEMENT_BASIS,
        algorithm_version: SURNAME_MEANING_METHOD_VERSION,
      }),
      statement_key: null,
      claim_status: "ACTIVE",
      supersedes_claim_id: null,
      created_by_run_id: runId,
      method_version: SURNAME_MEANING_METHOD_VERSION,
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

  // --- Confidence: ADR-0008 §5's table -----------------------------------
  const verdict = assessSurnameMeaning({ supportingWorks: works, worksAgree: agree });
  if (!isValidCombination(verdict.epistemic_type, verdict.status)) {
    throw new TruthInvariantError(
      "INVALID_EPISTEMIC_COMBINATION",
      `(${verdict.epistemic_type}, ${verdict.status}) is not permitted by docs/canonical/11 §12.3`,
    );
  }
  if (verdict.status === "VERIFIED") {
    // ADR-0008 §5 makes this unreachable. Asserted rather than assumed,
    // because an interpretation presented as verified is the exact failure the
    // whole decision exists to prevent.
    throw new TruthInvariantError(
      "MEANING_CANNOT_BE_VERIFIED",
      "a SURNAME_MEANING claim may never be assessed VERIFIED; an interpretation is not a " +
        "measurement (ADR-0008 §5)",
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
      assessment_method: MEANING_CONFIDENCE_ASSESSMENT_METHOD,
      assessment_version: MEANING_CONFIDENCE_ASSESSMENT_VERSION,
      human_review_required: verdict.human_review_required,
      review_status: "AUTO",
      assessed_at: new Date(),
    })
    .execute();

  // --- Citations: one per work, each with its locator (AC-8) --------------
  const citedRecords = new Set<string>();
  for (const interpretation of interpretations) {
    if (citedRecords.has(interpretation.source_record_id)) continue;
    citedRecords.add(interpretation.source_record_id);

    const record = await trx
      .selectFrom("source_records as sr")
      .innerJoin("sources as src", "src.source_id", "sr.source_id")
      .select([
        "sr.source_url",
        "sr.retrieved_at",
        "src.source_id",
        "src.name",
        "src.publisher",
        "src.homepage_or_reference_url",
        "src.default_rights_profile_id",
      ])
      .where("sr.source_record_id", "=", interpretation.source_record_id)
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("citations")
      .values({
        citation_id: uuidv7(),
        source_id: record.source_id,
        source_record_id: interpretation.source_record_id,
        title: record.name,
        publisher: record.publisher,
        // The work's year of publication, which is what a reader checks it by.
        publication_date: `${String(interpretation.work_year)}-01-01`,
        // The column is `url_or_reference`, and a printed work legitimately has
        // no URL. A bibliographic reference is what a reader checks it by, so
        // one is composed where no link exists — never left blank, which the
        // `citations_url_not_blank` constraint rightly refuses.
        url_or_reference:
          record.source_url ??
          record.homepage_or_reference_url ??
          `${interpretation.work_author_or_publisher}, ${interpretation.work_title} ` +
            `(${String(interpretation.work_year)})`,
        supporting_locator: interpretation.locator,
        accessed_at: record.retrieved_at,
        rights_profile_id: record.default_rights_profile_id,
        claim_id: claimId,
      })
      .execute();
  }

  await trx
    .updateTable("research_runs")
    .set({ run_status: "COMPLETE", qa_status: "PASS", completed_at: new Date() })
    .where("research_run_id", "=", runId)
    .execute();

  return projectMeaning(trx, claimId, interpretations);
}

/** Reads a persisted meaning claim back out as the developer-facing projection. */
async function projectMeaning(
  trx: Transaction<DB>,
  claimId: string,
  interpretations: readonly OnomasticInterpretation[],
): Promise<SurnameMeaningClaimResult> {
  const claim = await trx
    .selectFrom("claims")
    .select(["claim_id", "claim_key", "method_version"])
    .where("claim_id", "=", claimId)
    .executeTakeFirstOrThrow();

  const assessment = await trx
    .selectFrom("confidence_assessments")
    .select(["status", "rationale", "human_review_required"])
    .where("claim_id", "=", claimId)
    .orderBy("assessed_at", "desc")
    .executeTakeFirst();

  return {
    claim_id: claim.claim_id,
    claim_key: claim.claim_key,
    method_version: claim.method_version,
    interpretations,
    confidence_status: assessment?.status ?? "INSUFFICIENT_DATA",
    rationale: assessment?.rationale ?? null,
    human_review_required: assessment?.human_review_required ?? false,
  };
}
