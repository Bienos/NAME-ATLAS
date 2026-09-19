/**
 * Script detection (docs/canonical/13 §5.6, §10).
 *
 * Uses Node's built-in Unicode `Script_Extensions` property escapes, backed
 * by V8's ICU data — the "pinned Unicode/ICU implementation" §10.2 asks for,
 * without a new dependency (TASK-003 §6.1). Detection only: it flags a
 * mixed-script input for review; it never normalises one script into
 * another.
 */

/** ISO 15924 script code, e.g. `Latn`, `Cyrl`, `Zyyy` (Common). */
export type ScriptCode = string;

const COMMON: ScriptCode = "Zyyy";
const INHERITED: ScriptCode = "Zinh";
const UNKNOWN: ScriptCode = "Zzzz";

/**
 * Scripts the detector distinguishes, in test order.
 *
 * Common and Inherited are tested first, on the `Script` property: a
 * combining mark such as U+0308 carries several scripts in its
 * `Script_Extensions` (Latin among them) and would otherwise be classified
 * as whichever real script is tested first — which would wrongly flag a
 * Cyrillic surname carrying a diaeresis as Latin + Cyrillic. Punctuation
 * and marks never decide script (§10.3).
 *
 * Real scripts are then tested on `Script_Extensions`, as §10.2 asks. P0 is
 * Latin, P1 is Cyrillic (§10.1); the rest are "architecture-ready" —
 * recognised so they are named honestly in `detected_scripts` rather than
 * lumped as unknown.
 */
const SCRIPT_TESTS: ReadonlyArray<readonly [ScriptCode, RegExp]> = [
  [COMMON, /^\p{Script=Common}$/u],
  [INHERITED, /^\p{Script=Inherited}$/u],
  ["Latn", /^\p{Script_Extensions=Latin}$/u],
  ["Cyrl", /^\p{Script_Extensions=Cyrillic}$/u],
  ["Grek", /^\p{Script_Extensions=Greek}$/u],
  ["Hebr", /^\p{Script_Extensions=Hebrew}$/u],
  ["Arab", /^\p{Script_Extensions=Arabic}$/u],
  ["Armn", /^\p{Script_Extensions=Armenian}$/u],
  ["Geor", /^\p{Script_Extensions=Georgian}$/u],
  ["Deva", /^\p{Script_Extensions=Devanagari}$/u],
  ["Thai", /^\p{Script_Extensions=Thai}$/u],
  ["Hani", /^\p{Script_Extensions=Han}$/u],
  ["Hira", /^\p{Script_Extensions=Hiragana}$/u],
  ["Kana", /^\p{Script_Extensions=Katakana}$/u],
  ["Hang", /^\p{Script_Extensions=Hangul}$/u],
];

/**
 * Script pairs whose letters are visually confusable (UTS #39). Latin and
 * Cyrillic `а`/`a` is the case §5.6 names; Greek shares the same problem.
 */
const CONFUSABLE_PAIRS: ReadonlyArray<readonly [ScriptCode, ScriptCode]> = [
  ["Latn", "Cyrl"],
  ["Latn", "Grek"],
  ["Cyrl", "Grek"],
];

export interface ScriptDetection {
  /** Every script observed, in first-occurrence order (§10.2). Includes Common/Inherited. */
  readonly detected_scripts: readonly ScriptCode[];
  /** The most frequent real script; `Zyyy` if the input holds no letters of any script. */
  readonly primary_script: ScriptCode;
  /** True when two or more real scripts occur (§10.3: Common/Inherited never count). */
  readonly mixed_script: boolean;
  /** True when the mixed scripts include a confusable pair such as Latin + Cyrillic (§5.6). */
  readonly script_confusable_flag: boolean;
}

function scriptOf(codePoint: string): ScriptCode {
  for (const [code, test] of SCRIPT_TESTS) {
    if (test.test(codePoint)) {
      return code;
    }
  }
  return UNKNOWN;
}

function isRealScript(code: ScriptCode): boolean {
  return code !== COMMON && code !== INHERITED && code !== UNKNOWN;
}

/** Classifies every code point and summarises per docs/canonical/13 §10.2. */
export function detectScripts(value: string): ScriptDetection {
  const detected: ScriptCode[] = [];
  const counts = new Map<ScriptCode, number>();

  for (const codePoint of value) {
    const code = scriptOf(codePoint);
    if (!detected.includes(code)) {
      detected.push(code);
    }
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  const realScripts = detected.filter(isRealScript);

  let primary: ScriptCode = COMMON;
  let primaryCount = -1;
  for (const code of realScripts) {
    const count = counts.get(code) ?? 0;
    if (count > primaryCount) {
      primary = code;
      primaryCount = count;
    }
  }

  const mixed = realScripts.length > 1;
  const confusable =
    mixed && CONFUSABLE_PAIRS.some(([a, b]) => realScripts.includes(a) && realScripts.includes(b));

  return {
    detected_scripts: detected,
    primary_script: primary,
    mixed_script: mixed,
    script_confusable_flag: confusable,
  };
}
