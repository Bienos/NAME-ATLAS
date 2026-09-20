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

/**
 * What a `MIXED_SCRIPT_REVIEW` input does (docs/canonical/13 §10.4; TASK-010).
 *
 * - `"REVIEW"` (default): the input never reaches the database and resolves
 *   `REVIEW_REQUIRED`. The query path. A user typing a Latin word with one
 *   Cyrillic lookalike gets a review outcome, never a silent match.
 * - `"RESOLVE_FLAGGED"`: the lookup runs on the exact canonical key and the
 *   resolution carries the real match status **and** the finding
 *   (`validation_status`, `mixed_script`, `script_confusable_flag`,
 *   `user_confirmation_required`). For bulk ingestion of an authoritative
 *   register, whose own row is evidence of what the register says: §10.4
 *   asks for a flag, not a rejection.
 *
 * Every other validation failure short-circuits regardless of this option.
 */
export type MixedScriptPolicy = "REVIEW" | "RESOLVE_FLAGGED";

export interface ResolveOptions extends ValidationOptions {
  readonly mixedScript?: MixedScriptPolicy;
}

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
    // A flagged input that matched is still a review matter for a person;
    // the flag travels with the resolution rather than being lost in the
    // match status (TASK-010).
    user_confirmation_required:
      status === "MULTIPLE_EXACT" ||
      status === "REVIEW_REQUIRED" ||
      seed.validation.status === "MIXED_SCRIPT_REVIEW",
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

interface CanonicalRow {
  readonly surname_id: string;
  readonly canonical_display: string;
}

interface EligibleForm {
  readonly name_form_id: string;
  readonly surname_id: string;
  readonly form: string;
}

/**
 * Tier T0 classification over the `surnames` rows sharing one canonical
 * key. Unique by the `surnames.canonical_key` constraint, so at most one
 * row is expected; more than one is a broken invariant and fails closed
 * rather than picking one (TASK-003 §6.1 ambiguity rule).
 *
 * Pure: the single lookup and the bulk lookup (TASK-013) both call this on
 * rows they fetched, so the two paths cannot classify differently.
 */
function classifyCanonical(rows: readonly CanonicalRow[]): MatchResult | null {
  if (rows.length === 0) {
    return null;
  }
  if (rows.length > 1) {
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

/**
 * Tier T1 classification over the eligible NameForms sharing one search
 * key. Eligibility is not a predicate here — it is the
 * `resolvable_name_forms` view's definition (migration 0002), so an
 * ineligible row never reaches this function.
 *
 * Returns the matched form when exactly one surname is named, so the caller
 * can fetch that surname's display; `null` for no match; `MULTIPLE_EXACT`
 * when the forms disagree.
 */
function classifyForms(
  forms: readonly EligibleForm[],
): { readonly kind: "NONE" } | { readonly kind: "ONE"; readonly form: EligibleForm } | MatchResult {
  if (forms.length === 0) {
    return { kind: "NONE" };
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
    return { kind: "NONE" };
  }
  return { kind: "ONE", form: matched };
}

function knownVariant(form: EligibleForm, surname: CanonicalRow): MatchResult {
  return {
    ...NO_MATCH,
    resolution_status: "KNOWN_VARIANT",
    resolved_surname_id: surname.surname_id,
    resolved_canonical_display: surname.canonical_display,
    matched_name_form_id: form.name_form_id,
    matched_form: form.form,
  };
}

/**
 * kysely-codegen types every view column as nullable; the view's own WHERE
 * clause guarantees these are not. A violation is a failure, never data.
 */
function eligibleForm(row: {
  name_form_id: string | null;
  surname_id: string | null;
  form: string | null;
}): EligibleForm {
  if (row.name_form_id === null || row.surname_id === null || row.form === null) {
    throw new Error("resolvable_name_forms returned a row violating its own definition");
  }
  return { name_form_id: row.name_form_id, surname_id: row.surname_id, form: row.form };
}

/** Tier T0 for one key. */
async function matchCanonical(read: ReadOnlyQueries, key: string): Promise<MatchResult | null> {
  const rows = await read
    .selectFrom("surnames")
    .select(["surname_id", "canonical_display"])
    .where("canonical_key", "=", key)
    .orderBy("surname_id")
    .execute();
  return classifyCanonical(rows);
}

/** Tier T1 for one key. */
async function matchNameForm(read: ReadOnlyQueries, key: string): Promise<MatchResult> {
  const rows = await read
    .selectFrom("resolvable_name_forms")
    .select(["name_form_id", "surname_id", "form"])
    .where("search_key", "=", key)
    .orderBy("name_form_id")
    .execute();
  const classified = classifyForms(rows.map(eligibleForm));
  if ("resolution_status" in classified) {
    return classified;
  }
  if (classified.kind === "NONE") {
    return NO_MATCH;
  }
  const surname = await read
    .selectFrom("surnames")
    .select(["surname_id", "canonical_display"])
    .where("surname_id", "=", classified.form.surname_id)
    .executeTakeFirst();
  if (!surname) {
    // The view joins on an existing FK; a missing parent is a broken invariant.
    throw new Error(`name_form ${classified.form.name_form_id} references missing surname`);
  }
  return knownVariant(classified.form, surname);
}

/** Validates and keys an input; shared by the single and bulk paths. */
function seedFor(rawInput: string, options: ResolveOptions): ResolutionSeed {
  return {
    rawInput,
    nfc: toNfc(rawInput),
    key: canonicalKey(rawInput),
    validation: validateSurnameInput(rawInput, options),
  };
}

/** True when the seed must not reach the database (AC-08), per the mixed-script policy. */
function shortCircuits(seed: ResolutionSeed, options: ResolveOptions): boolean {
  const proceedFlagged =
    seed.validation.status === "MIXED_SCRIPT_REVIEW" && options.mixedScript === "RESOLVE_FLAGGED";
  return seed.validation.status !== "VALID" && !proceedFlagged;
}

function invalidResolution(seed: ResolutionSeed): SurnameLookupOutcome {
  return {
    kind: "RESOLUTION",
    resolution: buildResolution(seed, {
      ...NO_MATCH,
      resolution_status: statusForInvalidInput(seed.validation),
    }),
  };
}

function lookupFailure(
  seed: ResolutionSeed,
  stage: LookupStage,
  cause: unknown,
): SurnameLookupOutcome {
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
  const seed = seedFor(rawInput, options);
  if (shortCircuits(seed, options)) {
    return invalidResolution(seed);
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
    return lookupFailure(seed, stage, cause);
  }
}

/** Largest `IN (…)` list one statement carries in the bulk path. */
const BULK_CHUNK = 5_000;

function chunked<T>(items: readonly T[]): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += BULK_CHUNK) {
    chunks.push(items.slice(i, i + BULK_CHUNK));
  }
  return chunks;
}

/**
 * Resolves many inputs with the same rules as {@link resolveSurname}, in
 * one `READ ONLY` transaction (TASK-013).
 *
 * Exists for bulk ingestion, where 400,000 sequential lookups were the
 * import's second-largest cost. It is not a second algorithm: validation,
 * keying, short-circuiting and the T0/T1 classification are the very
 * functions the single path calls; only the fetch shape differs — keys go
 * to the database in `IN (…)` lists instead of one at a time. An
 * integration test asserts input-by-input equality with `resolveSurname`.
 *
 * Returns one outcome per input, in input order. Inputs that never reach
 * the database resolve exactly as they would singly. A database failure
 * returns `LOOKUP_FAILED` for every input that was still pending — never
 * `UNKNOWN`. The query path never calls this.
 */
export async function resolveSurnamesBulk(
  db: Kysely<DB>,
  rawInputs: readonly string[],
  options: ResolveOptions = {},
): Promise<readonly SurnameLookupOutcome[]> {
  const seeds = rawInputs.map((rawInput) => seedFor(rawInput, options));
  const outcomes: (SurnameLookupOutcome | undefined)[] = seeds.map((seed) =>
    shortCircuits(seed, options) ? invalidResolution(seed) : undefined,
  );
  const pendingKeys = [
    ...new Set(seeds.filter((_, i) => outcomes[i] === undefined).map((s) => s.key)),
  ];
  if (pendingKeys.length === 0) {
    return outcomes as SurnameLookupOutcome[];
  }

  let stage: LookupStage = "TRANSACTION";
  try {
    const matches = await db
      .transaction()
      .setAccessMode("read only")
      .execute(async (trx) => {
        const read: ReadOnlyQueries = trx;
        const byKey = new Map<string, MatchResult>();

        stage = "T0_CANONICAL";
        const canonicalByKey = new Map<string, CanonicalRow[]>();
        for (const keys of chunked(pendingKeys)) {
          const rows = await read
            .selectFrom("surnames")
            .select(["surname_id", "canonical_display", "canonical_key"])
            .where("canonical_key", "in", keys)
            .orderBy("surname_id")
            .execute();
          for (const row of rows) {
            const bucket = canonicalByKey.get(row.canonical_key) ?? [];
            bucket.push({ surname_id: row.surname_id, canonical_display: row.canonical_display });
            canonicalByKey.set(row.canonical_key, bucket);
          }
        }
        const unmatched: string[] = [];
        for (const key of pendingKeys) {
          const match = classifyCanonical(canonicalByKey.get(key) ?? []);
          if (match) {
            byKey.set(key, match);
          } else {
            unmatched.push(key);
          }
        }

        stage = "T1_NAME_FORM";
        const formsByKey = new Map<string, EligibleForm[]>();
        for (const keys of chunked(unmatched)) {
          const rows = await read
            .selectFrom("resolvable_name_forms")
            .select(["name_form_id", "surname_id", "form", "search_key"])
            .where("search_key", "in", keys)
            .orderBy("name_form_id")
            .execute();
          for (const row of rows) {
            if (row.search_key === null) {
              throw new Error("resolvable_name_forms returned a row violating its own definition");
            }
            const bucket = formsByKey.get(row.search_key) ?? [];
            bucket.push(eligibleForm(row));
            formsByKey.set(row.search_key, bucket);
          }
        }
        const singles = new Map<string, EligibleForm>();
        for (const key of unmatched) {
          const classified = classifyForms(formsByKey.get(key) ?? []);
          if ("resolution_status" in classified) {
            byKey.set(key, classified);
          } else if (classified.kind === "ONE") {
            singles.set(key, classified.form);
          } else {
            byKey.set(key, NO_MATCH);
          }
        }
        const parentIds = [...new Set([...singles.values()].map((form) => form.surname_id))];
        const parents = new Map<string, CanonicalRow>();
        for (const ids of chunked(parentIds)) {
          const rows = await read
            .selectFrom("surnames")
            .select(["surname_id", "canonical_display"])
            .where("surname_id", "in", ids)
            .execute();
          for (const row of rows) {
            parents.set(row.surname_id, row);
          }
        }
        for (const [key, form] of singles) {
          const surname = parents.get(form.surname_id);
          if (!surname) {
            throw new Error(`name_form ${form.name_form_id} references missing surname`);
          }
          byKey.set(key, knownVariant(form, surname));
        }
        return byKey;
      });

    return seeds.map((seed, i) => {
      const settled = outcomes[i];
      if (settled) {
        return settled;
      }
      const match = matches.get(seed.key);
      if (!match) {
        throw new Error(`bulk resolution produced no match for key ${JSON.stringify(seed.key)}`);
      }
      return { kind: "RESOLUTION", resolution: buildResolution(seed, match) };
    });
  } catch (cause: unknown) {
    return seeds.map((seed, i) => outcomes[i] ?? lookupFailure(seed, stage, cause));
  }
}
