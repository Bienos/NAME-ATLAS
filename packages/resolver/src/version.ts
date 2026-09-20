/**
 * Versioning for the resolution rules (docs/canonical/13 §5.7).
 *
 * The canonical text asks for `unicode_standard_version`,
 * `unicode_normalization_version`, `casefold_version` and
 * `security_profile_version` to be persisted, "or a resolver build that
 * deterministically implies them". These constants are that build
 * identifier: fixed strings, changed only when the rules they name change,
 * so a stored resolution can always be replayed against the rules that
 * produced it.
 *
 * They are deliberately NOT derived from the running Node/ICU version.
 * A value that changes when the runtime is upgraded would make every
 * previously stored resolution unreplayable. The runtime's own Unicode data
 * is reported separately by {@link unicodeRuntime} for diagnostics, and is
 * pinned in practice by `.nvmrc` plus the behavioural tests in
 * `normalize.test.ts` — a runtime whose case folding or normalisation
 * differs fails those tests rather than silently changing identity.
 */

/**
 * Version of the canonical identity key pipeline (docs/canonical/13 §5.2, as
 * amended by ADR-0005).
 *
 * `canonical_key_v2` replaced v1's Unicode full case folding with simple case
 * folding, because full folding expands `ẞ` to `ss` and collided 171 distinct
 * surnames in the production resource (D-013). Keys are identical between the
 * versions for every input without a code point the two treat differently, so
 * a v1 row usually — but not always — already holds its v2 key. Migration
 * `0006_canonical_key_v2` recomputes every one of them from the stored display
 * text rather than assuming.
 */
export const CANONICAL_KEY_VERSION = "canonical_key_v2";

/**
 * Version of the deterministic search representation stored in
 * `name_forms.search_key`. Identical to {@link CANONICAL_KEY_VERSION}
 * because a form's search key is that form's canonical key — which is what
 * makes tier T1 an exact match against the same function that produced the
 * query's key, rather than a second, looser algorithm.
 */
export const NORMALIZATION_VERSION = CANONICAL_KEY_VERSION;

/** Version of the explicit Polish diacritic fold table (docs/canonical/13 §6.1). */
export const POLISH_FOLD_VERSION = "pl_diacritic_fold_v1";

/** Version of the script-detection and mixed-script policy (docs/canonical/13 §10). */
export const SCRIPT_PROFILE_VERSION = "script_profile_v1";

/**
 * Version of the whole resolution method: validation, normalisation, script
 * policy and the T0/T1 matching tiers taken together. This is what a
 * `SurnameResolution` records.
 *
 * Bumped to v2 with {@link CANONICAL_KEY_VERSION}: normalisation is part of
 * the method, so a resolution stored under v1 was produced by different rules
 * and must not claim to be replayable under these ones.
 */
export const RESOLUTION_METHOD_VERSION = "exact_resolver_v2";

export interface UnicodeRuntime {
  readonly node: string;
  readonly icu: string | undefined;
  readonly unicode: string | undefined;
  readonly cldr: string | undefined;
}

/**
 * Reports the Unicode data the current runtime actually carries. Diagnostic
 * only — never part of a resolution's identity. Exists so a mismatch
 * between environments can be seen rather than inferred, which is the
 * failure mode docs/canonical/13 §5.7 warns about ("prefer one shared
 * resolver library/runtime rather than different services using different
 * language-runtime Unicode tables").
 */
export function unicodeRuntime(): UnicodeRuntime {
  return {
    node: process.versions.node,
    icu: process.versions["icu"],
    unicode: process.versions["unicode"],
    cldr: process.versions["cldr"],
  };
}
