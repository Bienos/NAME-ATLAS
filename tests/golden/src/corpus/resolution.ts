import type { CaseMetadata } from "../case.js";
import type { ResolutionCase } from "../expect-resolution.js";

/**
 * The resolution golden corpus (`docs/canonical/17` §10, §11, §13).
 *
 * Every case runs against `surname-set-v1` (`../fixtures.ts`) and carries both
 * an `expected` block and a `forbidden` list, per §4. The `forbidden` codes are
 * executable: see `../forbidden-resolution.ts`.
 *
 * ## What the candidate verbs mean
 *
 * §4's own worked example writes `"Łuczak": MAY_APPEAR`, and that is not
 * hedging — whether a particular fuzzy candidate clears a `pg_trgm` threshold is
 * a measured property of a corpus, not a semantic guarantee, and writing
 * `MUST_APPEAR` for one would make the corpus assert a recall figure it never
 * measured. `MAY_APPEAR` still asserts something: **if** the form appears, it
 * appears as a search-only candidate under `USER_CONFIRM`, with declared
 * provenance and no score a consumer could read as confidence. That is the
 * semantics §4 says the corpus exists to protect. `MUST_NOT_APPEAR` is used
 * where exclusion is structural rather than measured.
 *
 * Fuzzy **recall** is measured separately and on the real register by
 * `pnpm measure:fuzzy-recall` (TASK-015), which is where a number belongs.
 */

const COMMON = {
  case_version: 1,
  domain: "RESOLUTION",
  market: "PL",
  fixtures: { canonical_fixture_id: "surname-set-v1", source_fixture_ids: [] },
  created_at: "2026-09-21",
  created_by: "TASK-026",
  review: { required_role: "ENGINEERING", reviewed_at: null, reviewed_by: null },
  linked_issues: [],
} as const;

function meta(
  case_id: string,
  category: string,
  case_type: CaseMetadata["case_type"],
  blocking_level: CaseMetadata["blocking_level"],
  linked_requirements: readonly string[],
  notes: string,
): CaseMetadata {
  return { ...COMMON, case_id, category, case_type, blocking_level, linked_requirements, notes };
}

/** Resolved exactly, nobody asked, no suggestion list. */
const RESOLVED_EXACT = {
  outcome: "RESOLVED",
  resolution_status: "EXACT",
  decision_mode: "AUTOMATIC",
  auto_resolved: true,
  user_confirmation_required: false,
  human_review_required: false,
  matched_form: null,
  candidate_surname_displays: null,
} as const;

/** Not found, nobody harmed: an honest absence, never an error. */
const UNRESOLVED_UNKNOWN = {
  outcome: "UNRESOLVED",
  resolution_status: "UNKNOWN",
  // Whether anyone is asked to confirm depends on whether fuzzy retrieval
  // returned anything, which is a measured property of the fixture and not a
  // semantic guarantee. Both are correct; resolving silently is not.
  decision_mode: { one_of: ["USER_CONFIRM", "NONE"] },
  auto_resolved: false,
  user_confirmation_required: false,
  human_review_required: false,
  resolved_display: null,
  matched_form: null,
  candidate_surname_displays: null,
} as const;

export const RESOLUTION_CASES: readonly ResolutionCase[] = [
  // --- exact identity ------------------------------------------------------
  {
    meta: meta(
      "RES-EXACT-001",
      "EXACT",
      "SYNTHETIC",
      "P0",
      ["docs/canonical/13 §18", "TASK-003 AC-1"],
      "The baseline. If this fails nothing else in the corpus means anything.",
    ),
    input: { raw_surname: "Nowak", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: { ...RESOLVED_EXACT, resolved_display: "Nowak" },
      suggestion: { kind: "NO_SUGGESTIONS", reason: "EXACT_MATCH_EXISTS" },
      candidate_behavior: {},
    },
    forbidden: [
      "EXACT_ENTITY_DISPLACED_BY_FUZZY",
      "SEARCH_CANDIDATE_PERSISTED_AS_HISTORICAL_FORM",
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
    ],
  },
  {
    meta: meta(
      "RES-EXACT-002",
      "CASE_FOLD",
      "MUTATED_REAL_STRING",
      "P0",
      ["ADR-0005", "docs/canonical/13 §5.2"],
      "canonical_key_v2 simple-case-folds, so the address is case-insensitive while the " +
        "stored display form is untouched.",
    ),
    input: { raw_surname: "nowak", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: { ...RESOLVED_EXACT, resolved_display: "Nowak" },
      suggestion: { kind: "NO_SUGGESTIONS", reason: "EXACT_MATCH_EXISTS" },
      candidate_behavior: {},
    },
    forbidden: [
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
      "SEARCH_CANDIDATE_PERSISTED_AS_HISTORICAL_FORM",
    ],
  },
  {
    meta: meta(
      "RES-EXACTWINS-001",
      "EXACT_PRECEDENCE",
      "SYNTHETIC",
      "P0",
      ["docs/canonical/17 §13", "docs/canonical/13 §32.3"],
      "§13's `EXACT ENTITY displaced by more frequent fuzzy entity`, stated directly: where " +
        "an exact entity exists, no fuzzy list is produced at all.",
    ),
    input: { raw_surname: "Kowalski", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: { ...RESOLVED_EXACT, resolved_display: "Kowalski" },
      suggestion: { kind: "NO_SUGGESTIONS", reason: "EXACT_MATCH_EXISTS" },
      candidate_behavior: { Kowalski: "MUST_NOT_APPEAR", Kowalskj: "MUST_NOT_APPEAR" },
    },
    forbidden: ["EXACT_ENTITY_DISPLACED_BY_FUZZY", "FUZZY_CANDIDATE_AUTO_RESOLVED"],
  },

  // --- §4's worked example: diacritics -------------------------------------
  {
    meta: meta(
      "RES-DIAC-001",
      "DIACRITIC",
      "MUTATED_REAL_STRING",
      "P0",
      ["docs/canonical/17 §4", "ADR-0005 §3"],
      "This is §4's own example, transcribed. `Łuczak` is stored; `Luczak` is not. A fold " +
        "may suggest the one from the other and may never make them the same identity.",
    ),
    input: { raw_surname: "Luczak", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: UNRESOLVED_UNKNOWN,
      suggestion: { kind: "ANY", reason: null },
      candidate_behavior: { Łuczak: "MAY_APPEAR" },
    },
    forbidden: [
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
      "HISTORICAL_VARIANT_CREATED_FROM_FOLD_ONLY",
      "FUZZY_CANDIDATE_AUTO_RESOLVED",
      "CANDIDATE_CARRIES_CONFIDENCE_SCORE",
    ],
  },
  {
    meta: meta(
      "RES-DIAC-002",
      "DIACRITIC",
      "SYNTHETIC",
      "P0",
      ["ADR-0005 §3"],
      "The other half of RES-DIAC-001: the stored form addresses itself exactly. Without " +
        "this the corpus could be satisfied by a resolver that resolves nothing.",
    ),
    input: { raw_surname: "Łuczak", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: { ...RESOLVED_EXACT, resolved_display: "Łuczak" },
      suggestion: { kind: "NO_SUGGESTIONS", reason: "EXACT_MATCH_EXISTS" },
      candidate_behavior: {},
    },
    forbidden: ["SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION"],
  },
  {
    meta: meta(
      "RES-DIAC-003",
      "DIACRITIC",
      "MUTATED_REAL_STRING",
      "P0",
      ["ADR-0005 §3", "docs/canonical/13 §5.2"],
      "`Górski` stored, `Gorski` asked. A second diacritic pair, because one example is a " +
        "special case and two is a rule.",
    ),
    input: { raw_surname: "Gorski", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: UNRESOLVED_UNKNOWN,
      suggestion: { kind: "ANY", reason: null },
      candidate_behavior: { Górski: "MAY_APPEAR" },
    },
    forbidden: [
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
      "HISTORICAL_VARIANT_CREATED_FROM_FOLD_ONLY",
    ],
  },

  // --- accepted relations --------------------------------------------------
  {
    meta: meta(
      "RES-VARIANT-001",
      "KNOWN_VARIANT",
      "SYNTHETIC",
      "P0",
      ["docs/canonical/11 §4.3", "TASK-003 §7.4"],
      "An accepted MODERN_VARIANT is the *only* thing that may bridge two canonical keys, " +
        "and the outcome names it. This is the positive case that gives " +
        "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION something to be about.",
    ),
    input: { raw_surname: "Novak", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: {
        outcome: "RESOLVED",
        resolution_status: "KNOWN_VARIANT",
        decision_mode: "AUTOMATIC",
        auto_resolved: true,
        user_confirmation_required: false,
        human_review_required: false,
        resolved_display: "Nowak",
        matched_form: "Novak",
        candidate_surname_displays: null,
      },
      suggestion: { kind: "NO_SUGGESTIONS", reason: "EXACT_MATCH_EXISTS" },
      candidate_behavior: {},
    },
    forbidden: [
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
      "EXACT_ENTITY_DISPLACED_BY_FUZZY",
      "OCR_CANDIDATE_ACCEPTED_AS_HISTORICAL_FORM",
    ],
  },

  // --- §13: AMBIGUOUS → SILENT AUTO-RESOLUTION -----------------------------
  {
    meta: meta(
      "RES-AMBIG-001",
      "AMBIGUOUS",
      "SYNTHETIC",
      "P0",
      ["docs/canonical/17 §13", "TASK-003 §7.3"],
      "One attested string, two accepted associations — the gendered pair that makes this " +
        "the ordinary Polish case. The system names both and picks neither.",
    ),
    input: { raw_surname: "Grabowsky", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: {
        outcome: "UNRESOLVED",
        resolution_status: "MULTIPLE_EXACT",
        decision_mode: "USER_CONFIRM",
        auto_resolved: false,
        user_confirmation_required: true,
        human_review_required: false,
        resolved_display: null,
        matched_form: null,
        candidate_surname_displays: ["Grabowska", "Grabowski"],
      },
      suggestion: { kind: "ANY", reason: null },
      candidate_behavior: {},
    },
    forbidden: [
      "AMBIGUOUS_SILENT_AUTO_RESOLUTION",
      "FUZZY_CANDIDATE_AUTO_RESOLVED",
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
    ],
  },

  // --- §13: ineligible forms never become identities -----------------------
  {
    meta: meta(
      "RES-CANDIDATE-001",
      "SEARCH_CANDIDATE",
      "FAILURE_SIMULATION",
      "P0",
      ["docs/canonical/17 §13", "docs/canonical/11 §4.3", "docs/canonical/17 §24"],
      "A SEARCH_CANDIDATE/GENERATED_CANDIDATE form for Kowalski exists in the table. It is " +
        "a search aid. Asking for it must not reach Kowalski, and must not promote the row.",
    ),
    input: { raw_surname: "Kowalskj", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: UNRESOLVED_UNKNOWN,
      suggestion: { kind: "ANY", reason: null },
      candidate_behavior: {},
    },
    forbidden: [
      "SEARCH_CANDIDATE_PERSISTED_AS_HISTORICAL_FORM",
      "OCR_CANDIDATE_ACCEPTED_AS_HISTORICAL_FORM",
      "FUZZY_CANDIDATE_AUTO_RESOLVED",
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
    ],
  },
  {
    meta: meta(
      "RES-OCR-001",
      "HISTORICAL_FORM",
      "FAILURE_SIMULATION",
      "P0",
      ["docs/canonical/17 §13", "docs/canonical/11 §4.3"],
      "`Kowalzki` is stored as HISTORICAL_ATTESTED against Kowalski. A historical spelling " +
        "is evidence about the past, not an address for a modern lookup, so it resolves " +
        "nothing — and the lookup does not accept it as anything else either.",
    ),
    input: { raw_surname: "Kowalzki", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: UNRESOLVED_UNKNOWN,
      suggestion: { kind: "ANY", reason: null },
      candidate_behavior: {},
    },
    forbidden: [
      "OCR_CANDIDATE_ACCEPTED_AS_HISTORICAL_FORM",
      "SEARCH_CANDIDATE_PERSISTED_AS_HISTORICAL_FORM",
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
    ],
  },
  {
    meta: meta(
      "RES-DISPUTED-001",
      "DISPUTED_FORM",
      "FAILURE_SIMULATION",
      "P0",
      ["docs/canonical/11 §4.3"],
      "An eligible form_type with a contested attestation. Contested is not a weak yes.",
    ),
    input: { raw_surname: "Cichowsky", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: UNRESOLVED_UNKNOWN,
      suggestion: { kind: "ANY", reason: null },
      candidate_behavior: {},
    },
    forbidden: [
      "AMBIGUOUS_SILENT_AUTO_RESOLUTION",
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
      "OCR_CANDIDATE_ACCEPTED_AS_HISTORICAL_FORM",
    ],
  },
  {
    meta: meta(
      "RES-UNACCEPTED-001",
      "UNACCEPTED_ASSOCIATION",
      "FAILURE_SIMULATION",
      "P0",
      ["docs/canonical/11 §4.3", "docs/canonical/17 §13"],
      "The string exists; nothing has decided whose it is. A lookup must not be what decides.",
    ),
    input: { raw_surname: "Nowaczek", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: UNRESOLVED_UNKNOWN,
      suggestion: { kind: "ANY", reason: null },
      candidate_behavior: {},
    },
    forbidden: [
      "OCR_CANDIDATE_ACCEPTED_AS_HISTORICAL_FORM",
      "SEARCH_CANDIDATE_PERSISTED_AS_HISTORICAL_FORM",
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
    ],
  },

  // --- typos: §5's own example --------------------------------------------
  {
    meta: meta(
      "RES-TYPO-001",
      "TYPO",
      "MUTATED_REAL_STRING",
      "P0",
      ["docs/canonical/17 §5", "docs/canonical/13 §20.1"],
      "§5's worked case, `Cichwoski` for `Cichowski`: an adjacent transposition, the class " +
        "the rerank exists for. Whether it clears the threshold is measured by " +
        "`pnpm measure:fuzzy-recall`; what is asserted here is that if it appears it appears " +
        "as a suggestion a human confirms.",
    ),
    input: { raw_surname: "Cichwoski", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: UNRESOLVED_UNKNOWN,
      suggestion: { kind: "ANY", reason: null },
      candidate_behavior: { Cichowski: "MAY_APPEAR" },
    },
    forbidden: [
      "FUZZY_CANDIDATE_AUTO_RESOLVED",
      "PHONETIC_ONLY_AUTO_RESOLVED",
      "CANDIDATE_CARRIES_CONFIDENCE_SCORE",
      "EXACT_ENTITY_DISPLACED_BY_FUZZY",
      "SEARCH_CANDIDATE_PERSISTED_AS_HISTORICAL_FORM",
    ],
  },
  {
    meta: meta(
      "RES-TYPO-002",
      "TYPO",
      "MUTATED_REAL_STRING",
      "P0",
      ["docs/canonical/13 §20.1"],
      "A deletion rather than a transposition, on a longer surname, so the length bands are " +
        "not all exercised at one length.",
    ),
    input: { raw_surname: "Kwiatkowsi", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: UNRESOLVED_UNKNOWN,
      suggestion: { kind: "ANY", reason: null },
      candidate_behavior: { Kwiatkowski: "MAY_APPEAR" },
    },
    forbidden: [
      "FUZZY_CANDIDATE_AUTO_RESOLVED",
      "PHONETIC_ONLY_AUTO_RESOLVED",
      "CANDIDATE_CARRIES_CONFIDENCE_SCORE",
    ],
  },
  {
    meta: meta(
      "RES-SHORT-001",
      "SHORT_INPUT",
      "SYNTHETIC",
      "P1",
      ["D-017", "TASK-015 AC-6", "docs/canonical/13 §21"],
      "Below six code points the retrieval is an alphabet walk, so it does not run and says " +
        "so. A named refusal, not an empty list.",
    ),
    input: { raw_surname: "Ba", locale: "pl-PL", country: "PL" },
    expected: {
      // Retrieval provably does not run below six code points, so unlike the
      // other unresolved cases there is nothing for anyone to confirm.
      resolution: { ...UNRESOLVED_UNKNOWN, decision_mode: "NONE" },
      suggestion: { kind: "NO_SUGGESTIONS", reason: "INPUT_TOO_SHORT" },
      candidate_behavior: {},
    },
    forbidden: ["FUZZY_CANDIDATE_AUTO_RESOLVED", "SEARCH_CANDIDATE_PERSISTED_AS_HISTORICAL_FORM"],
  },
  {
    meta: meta(
      "RES-UNKNOWN-001",
      "ABSENT",
      "SYNTHETIC",
      "P0",
      ["ARCHITECTURE.md §10 invariant 4", "docs/canonical/16 §26"],
      "An invented string nothing in the fixture resembles. Absence is a result: not an " +
        "error, not a zero, and not a guess.",
    ),
    input: { raw_surname: "Qzyrfblat", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: UNRESOLVED_UNKNOWN,
      suggestion: { kind: "ANY", reason: null },
      candidate_behavior: {},
    },
    forbidden: [
      "FUZZY_CANDIDATE_AUTO_RESOLVED",
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
      "SEARCH_CANDIDATE_PERSISTED_AS_HISTORICAL_FORM",
    ],
  },

  // --- §13: MIXED-SCRIPT CONFUSABLE ---------------------------------------
  {
    meta: meta(
      "RES-MIXED-001",
      "MIXED_SCRIPT_CONFUSABLE",
      "FAILURE_SIMULATION",
      "P0",
      ["docs/canonical/17 §13", "docs/canonical/13 §16", "TASK-003 §7.2"],
      "`Kowalski` with the Latin `i` replaced by Cyrillic `і` (U+0456). To a reader the two " +
        "are the same word; to the system they are two identities, and it refuses to choose.",
    ),
    input: { raw_surname: "Kowalskі", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: {
        outcome: "UNRESOLVED",
        resolution_status: "REVIEW_REQUIRED",
        decision_mode: "USER_CONFIRM",
        auto_resolved: false,
        user_confirmation_required: true,
        human_review_required: true,
        resolved_display: null,
        matched_form: null,
        candidate_surname_displays: null,
      },
      // `suggestSurnames` refuses anything validation did not pass, so a
      // confusable input gets no fuzzy list either — it is held, not guessed at.
      suggestion: { kind: "NO_SUGGESTIONS", reason: "INVALID_INPUT" },
      candidate_behavior: { Kowalski: "MUST_NOT_APPEAR" },
    },
    forbidden: [
      "MIXED_SCRIPT_CONFUSABLE_SILENTLY_NORMALIZED",
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
      "AMBIGUOUS_SILENT_AUTO_RESOLUTION",
    ],
  },
  {
    meta: meta(
      "RES-MIXED-002",
      "SINGLE_SCRIPT_NON_LATIN",
      "SYNTHETIC",
      "P0",
      ["docs/canonical/13 §16", "docs/canonical/17 §9.3"],
      "The necessary counterweight to RES-MIXED-001: a wholly Cyrillic entity resolves " +
        "normally. The rule is about *mixing* scripts, not about not being Latin, and a " +
        "corpus that only tested the refusal would be satisfied by a resolver that refused " +
        "every non-Latin name.",
    ),
    input: { raw_surname: "Ковальський", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: { ...RESOLVED_EXACT, resolved_display: "Ковальський" },
      suggestion: { kind: "NO_SUGGESTIONS", reason: "EXACT_MATCH_EXISTS" },
      candidate_behavior: {},
    },
    forbidden: [
      "MIXED_SCRIPT_CONFUSABLE_SILENTLY_NORMALIZED",
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
    ],
  },

  // --- §9.2 compound / particle: the separator map is a declared rule ------
  {
    meta: meta(
      "RES-SEP-001",
      "COMPOUND",
      "MUTATED_REAL_STRING",
      "P0",
      ["ADR-0005 §2", "docs/canonical/17 §9.2"],
      "An en dash (U+2013) where the stored form has a hyphen. ADR-0005's separator map " +
        "folds every dash-like code point to `-`, so this is the same address.",
    ),
    input: { raw_surname: "Nowak–Kowalska", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: { ...RESOLVED_EXACT, resolved_display: "Nowak-Kowalska" },
      suggestion: { kind: "NO_SUGGESTIONS", reason: "EXACT_MATCH_EXISTS" },
      candidate_behavior: {},
    },
    forbidden: [
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
      "HISTORICAL_VARIANT_CREATED_FROM_FOLD_ONLY",
    ],
  },
  {
    meta: meta(
      "RES-SEP-002",
      "COMPOUND",
      "MUTATED_REAL_STRING",
      "P0",
      ["ADR-0005 §2", "docs/canonical/17 §9.2"],
      "A space where the stored form has a hyphen. The separator map folds dashes to each " +
        "other and does **not** fold a space into a dash: `Nowak Kowalska` and " +
        "`Nowak-Kowalska` are different strings and stay different identities. The pair with " +
        "RES-SEP-001 is what makes the rule legible.",
    ),
    input: { raw_surname: "Nowak Kowalska", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: UNRESOLVED_UNKNOWN,
      suggestion: { kind: "ANY", reason: null },
      candidate_behavior: { "Nowak-Kowalska": "MAY_APPEAR" },
    },
    forbidden: [
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
      "HISTORICAL_VARIANT_CREATED_FROM_FOLD_ONLY",
      "FUZZY_CANDIDATE_AUTO_RESOLVED",
    ],
  },

  // --- §7.4 failure simulations: invalid input is not an absent surname ----
  {
    meta: meta(
      "RES-INVALID-001",
      "EMPTY_INPUT",
      "FAILURE_SIMULATION",
      "P0",
      ["TASK-003 §7.3", "docs/canonical/16 §78"],
      "Nothing was asked, so nothing is absent.",
    ),
    input: { raw_surname: "", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: {
        outcome: "INVALID_INPUT",
        resolution_status: "EMPTY",
        decision_mode: "NONE",
        auto_resolved: false,
        user_confirmation_required: false,
        human_review_required: false,
        resolved_display: null,
        matched_form: null,
        candidate_surname_displays: null,
      },
      suggestion: { kind: "NO_SUGGESTIONS", reason: "INVALID_INPUT" },
      candidate_behavior: {},
    },
    forbidden: ["INVALID_INPUT_REPORTED_AS_UNKNOWN_SURNAME"],
  },
  {
    meta: meta(
      "RES-INVALID-002",
      "CONTROL_CHARACTERS",
      "FAILURE_SIMULATION",
      "P0",
      ["TASK-003 §7.3", "docs/canonical/13 §4.4"],
      "A NUL inside an otherwise valid surname. Telling this visitor their surname does not " +
        "exist would be a lie about their family, not a technicality.",
    ),
    input: { raw_surname: "Nowak\u0000", locale: "pl-PL", country: "PL" },
    expected: {
      resolution: {
        outcome: "INVALID_INPUT",
        resolution_status: "MALFORMED_CONTROL_CHARACTERS",
        decision_mode: "NONE",
        auto_resolved: false,
        user_confirmation_required: false,
        human_review_required: false,
        resolved_display: null,
        matched_form: null,
        candidate_surname_displays: null,
      },
      suggestion: { kind: "NO_SUGGESTIONS", reason: "INVALID_INPUT" },
      candidate_behavior: { Nowak: "MUST_NOT_APPEAR" },
    },
    forbidden: [
      "INVALID_INPUT_REPORTED_AS_UNKNOWN_SURNAME",
      "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION",
    ],
  },
  {
    meta: meta(
      "RES-INVALID-003",
      "OPERATIONAL_LIMIT",
      "FAILURE_SIMULATION",
      "P1",
      ["TASK-003 §7.3", "docs/canonical/13 §4.4"],
      "An abuse limit, and it says so: `EXCEEDS_OPERATIONAL_LIMIT` is a statement about this " +
        "service, never about how long a surname may be.",
    ),
    input: { raw_surname: "a".repeat(300), locale: "pl-PL", country: "PL" },
    expected: {
      resolution: {
        outcome: "INVALID_INPUT",
        resolution_status: "EXCEEDS_OPERATIONAL_LIMIT",
        decision_mode: "NONE",
        auto_resolved: false,
        user_confirmation_required: false,
        human_review_required: false,
        resolved_display: null,
        matched_form: null,
        candidate_surname_displays: null,
      },
      suggestion: { kind: "NO_SUGGESTIONS", reason: "INVALID_INPUT" },
      candidate_behavior: {},
    },
    forbidden: ["INVALID_INPUT_REPORTED_AS_UNKNOWN_SURNAME"],
  },
];
