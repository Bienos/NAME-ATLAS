/**
 * @name-atlas/resolver — exact surname resolution (TASK-003).
 *
 * Public surface: pure normalisation/validation, the outcome contract, and
 * one read-only lookup. Test-only seeding lives behind the separate
 * `@name-atlas/resolver/testing` entry and is never re-exported here.
 */
export {
  canonicalKey,
  collapseWhitespace,
  fullCaseFold,
  mapSeparators,
  polishDiacriticFold,
  simpleCaseFold,
  toNfc,
} from "./normalize.js";
export { detectScripts } from "./script.js";
export type { ScriptCode, ScriptDetection } from "./script.js";
export { DEFAULT_MAX_INPUT_CODE_POINTS, validateSurnameInput } from "./validation.js";
export type { InputValidation, InputValidationStatus, ValidationOptions } from "./validation.js";
export { outcomeOf } from "./resolution.js";
export type {
  LookupStage,
  ResolutionOutcome,
  ResolutionStatus,
  SurnameLookupOutcome,
  SurnameResolution,
  SurnameResolutionStatus,
} from "./resolution.js";
export { resolveSurname, resolveSurnamesBulk } from "./lookup.js";
export type { MixedScriptPolicy, ResolveOptions } from "./lookup.js";
export {
  CANONICAL_KEY_VERSION,
  NORMALIZATION_VERSION,
  POLISH_FOLD_VERSION,
  RESOLUTION_METHOD_VERSION,
  SCRIPT_PROFILE_VERSION,
  unicodeRuntime,
} from "./version.js";
export type { UnicodeRuntime } from "./version.js";
