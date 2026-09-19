/**
 * Input validation — stage 1 of resolution (docs/canonical/13 §4; TASK-003 §7.1).
 *
 * Pure. Decides whether an input may enter the resolver at all. Never
 * rejects a surname for being short, unusual, multi-word, hyphenated or
 * apostrophised (§4.2, §4.3): those are all `VALID`.
 */
import { collapseWhitespace } from "./normalize.js";
import { detectScripts } from "./script.js";
import type { ScriptDetection } from "./script.js";

/**
 * The implementable subset of docs/canonical/13 §4.1. The remaining
 * canonical outcomes (`POSSIBLE_MULTIPLE_QUERY_VALUES`,
 * `POSSIBLE_FULL_PERSON_NAME`, `UNSUPPORTED_SCRIPT_FOR_ENRICHMENT`) have no
 * defined detection rule in the canonical text and are not invented here.
 */
export type InputValidationStatus =
  | "VALID"
  | "EMPTY"
  | "EXCEEDS_OPERATIONAL_LIMIT"
  | "MALFORMED_CONTROL_CHARACTERS"
  | "MIXED_SCRIPT_REVIEW";

/**
 * Operational abuse limit in Unicode code points (§4.4). Configuration,
 * not domain truth — it says nothing about how long a surname can be.
 */
export const DEFAULT_MAX_INPUT_CODE_POINTS = 256;

export interface ValidationOptions {
  readonly maxCodePoints?: number;
}

export interface InputValidation extends ScriptDetection {
  readonly status: InputValidationStatus;
}

/**
 * Bidi controls, zero-width characters and non-printing controls (§4.5).
 * `Cc` is the control category, `Cf` the format category (which holds the
 * bidi controls, joiners, soft hyphen and U+FEFF); U+200B ZERO WIDTH SPACE
 * is listed explicitly so the rule does not depend on which category a
 * given Unicode version files it under.
 */
const CONTROL_OR_INVISIBLE = /[\p{Cc}\p{Cf}\u200b]/u;

/** Counts Unicode code points, not UTF-16 code units. */
function codePointLength(value: string): number {
  let length = 0;
  for (const _ of value) {
    length += 1;
  }
  return length;
}

/**
 * Validates a raw surname input. Checks run in a fixed order so the outcome
 * is deterministic when more than one condition holds: an over-long input
 * full of control characters is `EXCEEDS_OPERATIONAL_LIMIT`, not both.
 */
export function validateSurnameInput(
  rawInput: string,
  options: ValidationOptions = {},
): InputValidation {
  const maxCodePoints = options.maxCodePoints ?? DEFAULT_MAX_INPUT_CODE_POINTS;
  const scripts = detectScripts(rawInput);

  if (rawInput.length === 0 || collapseWhitespace(rawInput).length === 0) {
    return { status: "EMPTY", ...scripts };
  }
  if (codePointLength(rawInput) > maxCodePoints) {
    return { status: "EXCEEDS_OPERATIONAL_LIMIT", ...scripts };
  }
  if (CONTROL_OR_INVISIBLE.test(rawInput)) {
    return { status: "MALFORMED_CONTROL_CHARACTERS", ...scripts };
  }
  if (scripts.mixed_script) {
    return { status: "MIXED_SCRIPT_REVIEW", ...scripts };
  }
  return { status: "VALID", ...scripts };
}
