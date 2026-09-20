/**
 * Fuzzy candidate retrieval — stages 8 and 9 (docs/canonical/13 §19, §20.1;
 * TASK-015).
 *
 * Two stages, because one does not work. `pg_trgm` retrieves a shortlist;
 * Damerau-Levenshtein ranks it. Measured on the real 598,476-surname register,
 * ordering by trigram similarity alone put the intended surname first in 53 of
 * 100 nine-to-eleven-character single-edit cases; reranking the same shortlist
 * put it first in **80**. For the transposition class specifically the rerank
 * with its transposition rule recovered **25 of 25** where trigram order
 * recovered 8. The rerank is the feature, not a polish.
 *
 * Everything this module produces is a **suggestion a human confirms**. It
 * never resolves, never auto-corrects, and nothing it returns can reach a
 * claim: the truth-chain derivations require `EXACT` and keep requiring it
 * (docs/canonical/13 §33.4, §33.2; TASK-015 AC-2).
 *
 * Read-only on the same three grounds as `lookup.ts`: a `READ ONLY`
 * transaction, a handle narrowed to `selectFrom`, and an import graph that
 * never reaches `testing/`.
 */
import { sql } from "kysely";
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { damerauLevenshtein, hasAdjacentTransposition } from "./distance.js";
import { canonicalKey, toNfc } from "./normalize.js";
import { detectScripts } from "./script.js";
import { validateSurnameInput } from "./validation.js";
import type { InputValidation, ValidationOptions } from "./validation.js";
import { CANONICAL_KEY_VERSION, FUZZY_METHOD_VERSION, FUZZY_THRESHOLD_VERSION } from "./version.js";

/** The only database capability this path is allowed to hold. */
type ReadOnlyQueries = Pick<Transaction<DB>, "selectFrom">;

/** Largest shortlist one retrieval returns (docs/canonical/13 §21.1). */
export const SHORTLIST_CAP = 25;

/** Largest reranked list returned to a caller (docs/canonical/13 §21.1). */
export const RERANKED_CAP = 10;

/**
 * Shortest input that gets fuzzy suggestions at all.
 *
 * **Six.** `docs/canonical/13` §21 puts 1–3 characters on exact and known forms
 * only; measurement extends that to 5. Over 94 single-edit cases on real 4–5
 * character surnames the best any threshold achieved was 30 first-place hits,
 * with a shortlist saturated at the cap for every query and **0 of 25
 * transpositions recovered at any threshold**. What a shorter input retrieves is
 * an alphabet walk of real surnames: `NOWK` returns `NOWS`, `NOWY`, `NOWE` and
 * `NOWA`, all at similarity 0.429.
 *
 * So a short input returns nothing, and says so. That is D-017's chosen option
 * and an acceptance criterion, not a gap to close later.
 */
export const MIN_FUZZY_INPUT_LENGTH = 6;

/**
 * One length band's similarity threshold, with the measurement that set it.
 *
 * `docs/canonical/13` §21 requires fuzzy behaviour to depend on length and says
 * its own table holds "initial operational rules, not linguistic truths". These
 * values are measured rather than initial, and they remain operational rules:
 * re-run `pnpm measure:fuzzy-recall` after any change to the corpus or the
 * ranking and move them if the numbers move.
 *
 * The selection rule was: **the tightest threshold that costs no recall.** A
 * tighter threshold means a smaller shortlist and a faster query, so where
 * recall is flat across a range the top of that range wins.
 */
export interface FuzzyLengthBand {
  readonly minLength: number;
  readonly maxLength: number;
  readonly similarityThreshold: number;
  /** First-place hits out of the measured single-edit cases in this band. */
  readonly measuredFirstPlace: string;
  /** Transposition-class recovery, the hardest class, in this band. */
  readonly measuredTranspositionRecovery: string;
}

/**
 * Measured 2026-09-20 on the ingested register (598,476 surnames), 25 surnames
 * per band by descending national count, four single-edit classes each.
 */
export const FUZZY_LENGTH_BANDS: readonly FuzzyLengthBand[] = [
  {
    minLength: 6,
    maxLength: 8,
    similarityThreshold: 0.25,
    measuredFirstPlace: "77/100",
    measuredTranspositionRecovery: "22/25",
  },
  {
    minLength: 9,
    maxLength: 11,
    similarityThreshold: 0.4,
    measuredFirstPlace: "80/100",
    measuredTranspositionRecovery: "25/25",
  },
  {
    minLength: 12,
    maxLength: Number.MAX_SAFE_INTEGER,
    similarityThreshold: 0.5,
    measuredFirstPlace: "87/100",
    measuredTranspositionRecovery: "25/25",
  },
];

/**
 * The threshold for an input of this length, or `null` where no fuzzy retrieval
 * runs at all. Pure, so the policy is testable without a database.
 */
export function thresholdForLength(length: number): number | null {
  if (length < MIN_FUZZY_INPUT_LENGTH) return null;
  const band = FUZZY_LENGTH_BANDS.find((b) => length >= b.minLength && length <= b.maxLength);
  return band?.similarityThreshold ?? null;
}

/** The only tier this module emits (docs/canonical/13 §25.2). */
export const FUZZY_TIER = "T4_FUZZY" as const;

/**
 * Why a candidate exists (docs/canonical/13 §24: "Every candidate must explain
 * why it exists"). A field this stage cannot measure is **absent**, never
 * `false` — reporting `phonetic_overlap: false` would assert a negative this
 * task never tested.
 */
export interface CandidateFeatures {
  readonly exact_canonical: false;
  readonly exact_known_form: false;
  readonly trigram_similarity: number;
  readonly edit_distance: number;
  readonly transposition_detected: boolean;
  readonly same_primary_script: true;
}

/**
 * A generated candidate (docs/canonical/13 §18.1).
 *
 * A value object, never a row: §18.2 keeps generated candidates out of the
 * knowledge model at P0, so no `NameForm`, no `Surname` and no table is created
 * for anything here.
 */
export interface SearchCandidate {
  readonly input_form: string;
  readonly generated_form: string;
  readonly candidate_surname_id: string;
  readonly candidate_canonical_display: string;
  readonly method: "FUZZY";
  readonly method_version: string;
  readonly tier: typeof FUZZY_TIER;
  readonly features: CandidateFeatures;
  readonly explanation_codes: readonly string[];
  /**
   * Diagnostic only. Ordering is the lexicographic comparator's
   * (`docs/canonical/13` §25.1 rejects "a single black-box score"), and this
   * number never overrides it. Never a confidence, probability or likelihood
   * (§25.3).
   */
  readonly retrieval_rank_score: number;
  /** §18.1: these candidates are for search and suggestion, never identity. */
  readonly search_only: true;
}

/** Why no suggestion was produced. Each is a distinct, reportable situation. */
export type NoSuggestionReason =
  /** Input failed validation. Never reached the database. */
  | "INVALID_INPUT"
  /** Below {@link MIN_FUZZY_INPUT_LENGTH}. Retrieval would return noise. */
  | "INPUT_TOO_SHORT"
  /** The input resolves exactly, so an exact entity wins (§32.3). */
  | "EXACT_MATCH_EXISTS"
  /** Retrieval ran and nothing cleared this length's threshold. */
  | "NO_CANDIDATE_ABOVE_THRESHOLD";

export type SuggestionOutcome =
  | {
      readonly kind: "SUGGESTIONS";
      readonly input_form: string;
      readonly canonical_key: string;
      readonly canonical_key_version: string;
      /**
       * `SUGGESTION_REQUIRED` for one candidate, `MULTIPLE_CANDIDATES` for
       * more (docs/canonical/13 §31). Never `RESOLVED`.
       */
      readonly outcome: "SUGGESTION_REQUIRED" | "MULTIPLE_CANDIDATES";
      /** Always `USER_CONFIRM`. A fuzzy match is never auto-resolved (§33.4). */
      readonly decision_mode: "USER_CONFIRM";
      readonly candidates: readonly SearchCandidate[];
      readonly similarity_threshold: number;
      readonly threshold_version: string;
      readonly method_version: string;
      /** How many rows retrieval returned before the rerank and the cap. */
      readonly shortlist_size: number;
    }
  | {
      readonly kind: "NO_SUGGESTIONS";
      readonly input_form: string;
      readonly canonical_key: string;
      readonly reason: NoSuggestionReason;
      readonly message: string;
      readonly method_version: string;
      /** Null where no retrieval ran. */
      readonly similarity_threshold: number | null;
    }
  | {
      readonly kind: "LOOKUP_FAILED";
      readonly input_form: string;
      readonly canonical_key: string;
      readonly method_version: string;
      readonly message: string;
      readonly cause: unknown;
    };

interface ShortlistRow {
  readonly surname_id: string;
  readonly canonical_display: string;
  readonly canonical_key: string;
  readonly primary_script: string;
  readonly similarity: number;
}

/**
 * The ranking (docs/canonical/13 §25.1: tier, then features, lexicographically,
 * with a stable tie break — not one opaque number).
 *
 * The transposition step is measured, not intuited. Turning it off and
 * re-running the same sweep, at each band's own threshold:
 *
 * | Length | First place without | with | Transposition without | with |
 * |---|---:|---:|---:|---:|
 * | 6-8 | 74/100 | 77/100 | 18/25 | 22/25 |
 * | 9-11 | 63/100 | 80/100 | 8/25 | 25/25 |
 * | 12+ | 84/100 | 87/100 | 22/25 | 25/25 |
 *
 * The reason it works: at equal edit distance, swapping two adjacent letters is
 * a typing slip, while a deletion is often a genuinely different surname.
 * `CICHWOSKI` is one edit from both `CICHOWSKI` (transposed) and `CICHOSKI`
 * (deleted), and trigram similarity prefers the wrong one — 0.583 against
 * 0.429.
 */
export function compareCandidates(a: SearchCandidate, b: SearchCandidate): number {
  if (a.features.edit_distance !== b.features.edit_distance) {
    return a.features.edit_distance - b.features.edit_distance;
  }
  if (a.features.transposition_detected !== b.features.transposition_detected) {
    return a.features.transposition_detected ? -1 : 1;
  }
  if (a.features.trigram_similarity !== b.features.trigram_similarity) {
    return b.features.trigram_similarity - a.features.trigram_similarity;
  }
  // Stable and deterministic: the key, not the count. Choosing the more common
  // surname would be exactly what §32.4 forbids.
  return a.generated_form < b.generated_form ? -1 : a.generated_form > b.generated_form ? 1 : 0;
}

/**
 * A single diagnostic number combining the same features the comparator uses
 * (docs/canonical/13 §25.3 permits a versioned rule-based within-tier score and
 * fixes its name). Bounded to (0, 1]. It is **not** the ordering key.
 */
function rankScore(similarity: number, distance: number, transposed: boolean): number {
  const distanceTerm = 1 / (1 + distance);
  const raw = 0.5 * similarity + 0.4 * distanceTerm + (transposed ? 0.1 : 0);
  return Number(raw.toFixed(6));
}

function explanationCodes(similarity: number, distance: number, transposed: boolean): string[] {
  const codes: string[] = [];
  if (transposed) codes.push("ADJACENT_TRANSPOSITION");
  if (distance === 1) codes.push("EDIT_DISTANCE_1");
  else if (distance === 2) codes.push("EDIT_DISTANCE_2");
  else codes.push(`EDIT_DISTANCE_${String(distance)}`);
  codes.push(similarity >= 0.5 ? "TRIGRAM_HIGH" : "TRIGRAM_MODERATE");
  return codes;
}

/** The trigram shortlist — stage 8. Threshold set per statement, never globally. */
async function retrieveShortlist(
  trx: Transaction<DB>,
  key: string,
  threshold: number,
): Promise<ShortlistRow[]> {
  // SET LOCAL, so the threshold dies with this transaction and never leaks into
  // another session's queries.
  await sql`SET LOCAL pg_trgm.similarity_threshold = ${sql.lit(threshold)}`.execute(trx);
  const read: ReadOnlyQueries = trx;
  const rows = await read
    .selectFrom("surnames")
    .select(["surname_id", "canonical_display", "canonical_key", "primary_script"])
    .select(sql<number>`similarity(canonical_key, ${key})`.as("similarity"))
    .where(sql<boolean>`canonical_key % ${key}`)
    .orderBy(sql`similarity(canonical_key, ${key}) DESC`)
    .orderBy("canonical_key")
    .limit(SHORTLIST_CAP)
    .execute();
  return rows.map((row) => ({
    surname_id: row.surname_id,
    canonical_display: row.canonical_display,
    canonical_key: row.canonical_key,
    primary_script: row.primary_script,
    similarity: Number(row.similarity),
  }));
}

function noSuggestions(
  input: string,
  key: string,
  reason: NoSuggestionReason,
  message: string,
  threshold: number | null,
): SuggestionOutcome {
  return {
    kind: "NO_SUGGESTIONS",
    input_form: input,
    canonical_key: key,
    reason,
    message,
    method_version: FUZZY_METHOD_VERSION,
    similarity_threshold: threshold,
  };
}

export interface SuggestOptions extends ValidationOptions {
  /** Cap on returned candidates. Never above {@link RERANKED_CAP}. */
  readonly limit?: number;
}

/**
 * Suggests real surnames an unresolved input might be.
 *
 * Returns suggestions only. It never resolves, and `resolveSurname` is
 * unchanged by its existence — a caller runs exact resolution first and reaches
 * here only when that found nothing.
 *
 * An input that *does* resolve exactly returns `EXACT_MATCH_EXISTS` and no
 * candidates, because an exact entity must win (docs/canonical/13 §32.3).
 * `KOWALSKY` is a real surname in the register whose trigram neighbours include
 * `KOWALSKI` and `KOWALSKA`; suggesting them over itself would be wrong.
 */
export async function suggestSurnames(
  db: Kysely<DB>,
  rawInput: string,
  options: SuggestOptions = {},
): Promise<SuggestionOutcome> {
  const nfc = toNfc(rawInput);
  const key = canonicalKey(rawInput);
  const validation: InputValidation = validateSurnameInput(rawInput, options);

  if (validation.status !== "VALID") {
    return noSuggestions(
      rawInput,
      key,
      "INVALID_INPUT",
      `input rejected by validation: ${validation.status}`,
      null,
    );
  }

  const length = [...key].length;
  const threshold = thresholdForLength(length);
  if (threshold === null) {
    return noSuggestions(
      rawInput,
      key,
      "INPUT_TOO_SHORT",
      `an input of ${String(length)} characters gets no fuzzy suggestions: below ` +
        `${String(MIN_FUZZY_INPUT_LENGTH)} characters retrieval returns unrelated real surnames ` +
        "rather than likely corrections",
      null,
    );
  }

  const inputScript = detectScripts(nfc).primary_script;
  const limit = Math.min(options.limit ?? RERANKED_CAP, RERANKED_CAP);

  try {
    const shortlist = await db
      .transaction()
      .setAccessMode("read only")
      .execute(async (trx) => retrieveShortlist(trx, key, threshold));

    // §32.3: an exact entity wins outright, and retrieval already found it.
    if (shortlist.some((row) => row.canonical_key === key)) {
      return noSuggestions(
        rawInput,
        key,
        "EXACT_MATCH_EXISTS",
        "the input matches a surname exactly, so no suggestion is offered",
        threshold,
      );
    }

    const candidates = shortlist
      // Hard contradiction (§25.4): a fuzzy neighbour in another script is not
      // a typo of this input. Transliteration is a separate stage (§11).
      .filter((row) => row.primary_script === inputScript)
      .map((row): SearchCandidate => {
        const distance = damerauLevenshtein(key, row.canonical_key);
        const transposed = hasAdjacentTransposition(key, row.canonical_key);
        return {
          input_form: rawInput,
          generated_form: row.canonical_display,
          candidate_surname_id: row.surname_id,
          candidate_canonical_display: row.canonical_display,
          method: "FUZZY",
          method_version: FUZZY_METHOD_VERSION,
          tier: FUZZY_TIER,
          features: {
            exact_canonical: false,
            exact_known_form: false,
            trigram_similarity: Number(row.similarity.toFixed(6)),
            edit_distance: distance,
            transposition_detected: transposed,
            same_primary_script: true,
          },
          explanation_codes: explanationCodes(row.similarity, distance, transposed),
          retrieval_rank_score: rankScore(row.similarity, distance, transposed),
          search_only: true,
        };
      })
      .sort(compareCandidates)
      .slice(0, limit);

    if (candidates.length === 0) {
      return noSuggestions(
        rawInput,
        key,
        "NO_CANDIDATE_ABOVE_THRESHOLD",
        `no surname reached similarity ${String(threshold)} for an input of ` +
          `${String(length)} characters`,
        threshold,
      );
    }

    return {
      kind: "SUGGESTIONS",
      input_form: rawInput,
      canonical_key: key,
      canonical_key_version: CANONICAL_KEY_VERSION,
      outcome: candidates.length === 1 ? "SUGGESTION_REQUIRED" : "MULTIPLE_CANDIDATES",
      decision_mode: "USER_CONFIRM",
      candidates,
      similarity_threshold: threshold,
      threshold_version: FUZZY_THRESHOLD_VERSION,
      method_version: FUZZY_METHOD_VERSION,
      shortlist_size: shortlist.length,
    };
  } catch (cause: unknown) {
    return {
      kind: "LOOKUP_FAILED",
      input_form: rawInput,
      canonical_key: key,
      method_version: FUZZY_METHOD_VERSION,
      message: "candidate retrieval failed",
      cause,
    };
  }
}
