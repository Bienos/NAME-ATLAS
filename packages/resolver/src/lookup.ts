/**
 * Exact resolution lookup — stage 2 (docs/canonical/13 §1.3 tiers T0/T1;
 * TASK-003 §6.1, §7).
 *
 * Read-only, enforced three ways rather than promised in a comment:
 *
 *   1. Every query runs inside a PostgreSQL `READ ONLY` transaction. If any
 *      statement tried to write, the server would refuse it.
 *   2. Inside the transaction the handle is narrowed to {@link ReadOnlyQueries}
 *      (`selectFrom` only), so a write does not typecheck here.
 *   3. This module's import graph never reaches `testing/` — checked by
 *      `import-boundary.test.ts`, not assumed.
 *
 * Matching is exact and lexicographic: T0 (canonical key) wins outright;
 * T1 (eligible NameForm) is consulted only when T0 finds nothing. No fuzzy,
 * phonetic, transliteration, diacritic-fold or gender-form logic exists in
 * this path — the Polish fold table in `normalize.ts` is never called here.
 */
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { canonicalKey, toNfc } from "./normalize.js";
import { outcomeOf } from "./resolution.js";
import type {
  LookupStage,
  SurnameLookupOutcome,
  SurnameResolution,
  SurnameResolutionStatus,
} from "./resolution.js";
import { validateSurnameInput } from "./validation.js";
import type { InputValidation, ValidationOptions } from "./validation.js";
import { CANONICAL_KEY_VERSION, RESOLUTION_METHOD_VERSION } from "./version.js";

/** The only database capability the lookup path is allowed to hold. */
type ReadOnlyQueries = Pick<Transaction<DB>, "selectFrom">;

export type ResolveOptions = ValidationOptions;

interface ResolutionSeed {
  readonly rawInput: string;
  readonly nfc: string;
  readonly key: string;
  readonly validation: InputValidation;
}

interface MatchResult {
  readonly resolution_status: SurnameResolutionStatus;
  readonly resolved_surname_id: string | null;
  readonly resolved_canonical_display: string | null;
  readonly candidate_surname_ids: readonly string[];
  readonly matched_name_form_id: string | null;
  readonly matched_form: string | null;
}

const NO_MATCH: MatchResult = {
  resolution_status: "UNKNOWN",
  resolved_surname_id: null,
  resolved_canonical_display: null,
  candidate_surname_ids: [],
  matched_name_form_id: null,
  matched_form: null,
};

function buildResolution(seed: ResolutionSeed, match: MatchResult): SurnameResolution {
  const status = match.resolution_status;
  return {
    raw_input: seed.rawInput,
    unicode_nfc: seed.nfc,
    canonical_key: seed.key,
    canonical_key_version: CANONICAL_KEY_VERSION,
    validation_status: seed.validation.status,
    resolution_status: status,
    outcome: outcomeOf(status),
    resolved_surname_id: match.resolved_surname_id,
    resolved_canonical_display: match.resolved_canonical_display,
    candidate_surname_ids: match.candidate_surname_ids,
    matched_name_form_id: match.matched_name_form_id,
    matched_form: match.matched_form,
    resolution_method_version: RESOLUTION_METHOD_VERSION,
    user_confirmation_required: status === "MULTIPLE_EXACT" || status === "REVIEW_REQUIRED",
    detected_scripts: seed.validation.detected_scripts,
    primary_script: seed.validation.primary_script,
    mixed_script: seed.validation.mixed_script,
    script_confusable_flag: seed.validation.script_confusable_flag,
  };
}

/** Maps a non-VALID validation outcome onto `resolution_status` (TASK-003 §7.2, §7.3). */
function statusForInvalidInput(validation: InputValidation): SurnameResolutionStatus {
  switch (validation.status) {
    case "MIXED_SCRIPT_REVIEW":
      return "REVIEW_REQUIRED";
    case "EMPTY":
    case "EXCEEDS_OPERATIONAL_LIMIT":
    case "MALFORMED_CONTROL_CHARACTERS":
      return validation.status;
    case "VALID":
      throw new Error("statusForInvalidInput called with VALID input");
  }
}

/** Tier T0: exact canonical key. Unique by the `surnames.canonical_key` constraint. */
async function matchCanonical(read: ReadOnlyQueries, key: string): Promise<MatchResult | null> {
  const rows = await read
    .selectFrom("surnames")
    .select(["surname_id", "canonical_display"])
    .where("canonical_key", "=", key)
    .orderBy("surname_id")
    .execute();

  if (rows.length === 0) {
    return null;
  }
  if (rows.length > 1) {
    // Unreachable while the UNIQUE constraint holds. If it ever does not,
    // fail closed rather than pick one (TASK-003 §6.1 ambiguity rule).
    return {
      ...NO_MATCH,
      resolution_status: "MULTIPLE_EXACT",
      candidate_surname_ids: [...new Set(rows.map((row) => row.surname_id))].sort(),
    };
  }
  const [row] = rows;
  if (!row) {
    return null;
  }
  return {
    ...NO_MATCH,
    resolution_status: "EXACT",
    resolved_surname_id: row.surname_id,
    resolved_canonical_display: row.canonical_display,
  };
}

interface EligibleForm {
  readonly name_form_id: string;
  readonly surname_id: string;
  readonly form: string;
}

/**
 * Tier T1: exact match against an eligible NameForm. Eligibility is not a
 * predicate here — it is the `resolvable_name_forms` view's definition
 * (migration 0002), so an ineligible row is invisible to this query.
 */
async function matchNameForm(read: ReadOnlyQueries, key: string): Promise<MatchResult> {
  const rows = await read
    .selectFrom("resolvable_name_forms")
    .select(["name_form_id", "surname_id", "form"])
    .where("search_key", "=", key)
    .orderBy("name_form_id")
    .execute();

  // kysely-codegen types every view column as nullable; the view's own
  // WHERE clause guarantees these are not. Treat a violation as a failure,
  // never as data.
  const forms: EligibleForm[] = rows.map((row) => {
    if (row.name_form_id === null || row.surname_id === null || row.form === null) {
      throw new Error("resolvable_name_forms returned a row violating its own definition");
    }
    return { name_form_id: row.name_form_id, surname_id: row.surname_id, form: row.form };
  });

  if (forms.length === 0) {
    return NO_MATCH;
  }

  const distinctSurnameIds = [...new Set(forms.map((form) => form.surname_id))];
  if (distinctSurnameIds.length > 1) {
    return {
      ...NO_MATCH,
      resolution_status: "MULTIPLE_EXACT",
      candidate_surname_ids: [...distinctSurnameIds].sort(),
    };
  }

  const [matched] = forms;
  if (!matched) {
    return NO_MATCH;
  }
  const surname = await read
    .selectFrom("surnames")
    .select(["surname_id", "canonical_display"])
    .where("surname_id", "=", matched.surname_id)
    .executeTakeFirst();
  if (!surname) {
    // The view joins on an existing FK; a missing parent is a broken invariant.
    throw new Error(`name_form ${matched.name_form_id} references missing surname`);
  }

  return {
    resolution_status: "KNOWN_VARIANT",
    resolved_surname_id: surname.surname_id,
    resolved_canonical_display: surname.canonical_display,
    candidate_surname_ids: [],
    matched_name_form_id: matched.name_form_id,
    matched_form: matched.form,
  };
}

/**
 * Resolves a raw surname input to a canonical surname by exact match only.
 *
 * Invalid input never touches the database (AC-08). Valid input runs T0
 * then T1 inside one `READ ONLY` transaction. Any database failure is
 * returned as `LOOKUP_FAILED`, never thrown and never disguised as
 * `UNKNOWN`.
 */
export async function resolveSurname(
  db: Kysely<DB>,
  rawInput: string,
  options: ResolveOptions = {},
): Promise<SurnameLookupOutcome> {
  const validation = validateSurnameInput(rawInput, options);
  const seed: ResolutionSeed = {
    rawInput,
    nfc: toNfc(rawInput),
    key: canonicalKey(rawInput),
    validation,
  };

  if (validation.status !== "VALID") {
    return {
      kind: "RESOLUTION",
      resolution: buildResolution(seed, {
        ...NO_MATCH,
        resolution_status: statusForInvalidInput(validation),
      }),
    };
  }

  let stage: LookupStage = "TRANSACTION";
  try {
    const match = await db
      .transaction()
      .setAccessMode("read only")
      .execute(async (trx) => {
        const read: ReadOnlyQueries = trx;
        stage = "T0_CANONICAL";
        const canonical = await matchCanonical(read, seed.key);
        if (canonical) {
          return canonical;
        }
        stage = "T1_NAME_FORM";
        return matchNameForm(read, seed.key);
      });
    return { kind: "RESOLUTION", resolution: buildResolution(seed, match) };
  } catch (cause: unknown) {
    return {
      kind: "LOOKUP_FAILED",
      raw_input: seed.rawInput,
      unicode_nfc: seed.nfc,
      canonical_key: seed.key,
      resolution_method_version: RESOLUTION_METHOD_VERSION,
      stage,
      message: cause instanceof Error ? cause.message : String(cause),
      cause,
    };
  }
}
