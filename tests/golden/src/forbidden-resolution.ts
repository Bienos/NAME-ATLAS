import { canonicalKey, polishDiacriticFold, toNfc } from "@name-atlas/resolver";
import type { NameFormFingerprint, ResolutionObservation } from "./observe.js";

/**
 * `docs/canonical/17` §13's resolution P0 hard fails, as **executable
 * predicates**.
 *
 * §4 asks every high-risk case to carry a `forbidden` list and says it "protects
 * semantics" in a way `expected top result = Łuczak` does not. A list of
 * strings protects nothing on its own, so each code below resolves to a
 * function that runs against what the system actually returned and actually
 * stored. Listing `AMBIGUOUS_SILENT_AUTO_RESOLUTION` on a case makes that check
 * run on that case; adding a code that has no predicate is a compile error.
 *
 * A predicate returns `null` when the rule holds, or a sentence naming what it
 * saw when it does not. It never throws: a case reports every rule it broke,
 * not the first.
 */

/**
 * The seven clauses of §13, plus four adjacent invariants the same cases are
 * the right place to protect. Each is mapped to its canonical clause in
 * {@link RESOLUTION_FORBIDDEN}.
 */
export type ResolutionForbiddenCode =
  | "FUZZY_CANDIDATE_AUTO_RESOLVED"
  | "PHONETIC_ONLY_AUTO_RESOLVED"
  | "OCR_CANDIDATE_ACCEPTED_AS_HISTORICAL_FORM"
  | "AMBIGUOUS_SILENT_AUTO_RESOLUTION"
  | "EXACT_ENTITY_DISPLACED_BY_FUZZY"
  | "MIXED_SCRIPT_CONFUSABLE_SILENTLY_NORMALIZED"
  | "SEARCH_CANDIDATE_PERSISTED_AS_HISTORICAL_FORM"
  | "SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION"
  | "HISTORICAL_VARIANT_CREATED_FROM_FOLD_ONLY"
  | "CANDIDATE_CARRIES_CONFIDENCE_SCORE"
  | "INVALID_INPUT_REPORTED_AS_UNKNOWN_SURNAME";

export interface ForbiddenRule<O> {
  /** The canonical clause this rule enforces. Quoted, not paraphrased. */
  readonly clause: string;
  /** What the rule means, for whoever reads the failure. */
  readonly rule: string;
  /** `null` when the rule holds; otherwise what was observed. */
  readonly check: (observation: O) => string | null;
}

/** Statuses that mean the resolver committed to one identity. */
const RESOLVED_STATUSES = new Set(["EXACT", "KNOWN_VARIANT"]);

/** Statuses that mean a human must choose. */
const HUMAN_STATUSES = new Set(["MULTIPLE_EXACT", "REVIEW_REQUIRED"]);

/**
 * `resolvable_name_forms` (migration 0002) admits only these. Restated here
 * deliberately: if a later migration widens the view, this corpus fails rather
 * than silently accepting a SEARCH_CANDIDATE as an identity.
 */
const RESOLVABLE_FORM_TYPES = new Set(["CANONICAL", "MODERN_VARIANT"]);
const RESOLVABLE_ATTESTATIONS = new Set(["ATTESTED", "DERIVED"]);

function findForm(
  forms: readonly NameFormFingerprint[],
  id: string,
): NameFormFingerprint | undefined {
  return forms.find((f) => f.name_form_id === id);
}

/** Rows present after the case that were not present before it. */
function newForms(o: ResolutionObservation): readonly NameFormFingerprint[] {
  const before = new Set(o.before.name_forms.map((f) => f.name_form_id));
  return o.after.name_forms.filter((f) => !before.has(f.name_form_id));
}

export const RESOLUTION_FORBIDDEN: {
  readonly [C in ResolutionForbiddenCode]: ForbiddenRule<ResolutionObservation>;
} = {
  FUZZY_CANDIDATE_AUTO_RESOLVED: {
    clause: "docs/canonical/17 §13 `FUZZY_CANDIDATE → AUTO`; docs/canonical/13 §33.4",
    rule: "A fuzzy candidate is a suggestion a human confirms. It never becomes an identity.",
    check: (o) => {
      const s = o.suggestion;
      if (s.kind !== "SUGGESTIONS") return null;
      const faults: string[] = [];
      if (s.decision_mode !== "USER_CONFIRM") {
        faults.push(`decision_mode was ${String(s.decision_mode)}`);
      }
      if (s.outcome !== "SUGGESTION_REQUIRED" && s.outcome !== "MULTIPLE_CANDIDATES") {
        faults.push(`outcome was ${String(s.outcome)}`);
      }
      for (const c of s.candidates) {
        if (c.search_only !== true) {
          faults.push(`candidate ${c.candidate_canonical_display} was not search_only`);
        }
        if (c.candidate_surname_id === o.resolution.resolved_surname_id) {
          faults.push(`candidate ${c.candidate_canonical_display} is also the resolved identity`);
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  PHONETIC_ONLY_AUTO_RESOLVED: {
    clause: "docs/canonical/17 §13 `PHONETIC_ONLY → AUTO`; docs/canonical/13 §25.2",
    rule:
      "Every candidate declares the tier and method that produced it, and a match whose only " +
      "evidence is phonetic never resolves. No phonetic matcher exists yet, so the " +
      "provenance half of this rule is what runs today and the phonetic half is the guard " +
      "for whoever adds one.",
    check: (o) => {
      const s = o.suggestion;
      if (s.kind !== "SUGGESTIONS") return null;
      const faults: string[] = [];
      for (const c of s.candidates) {
        if (c.method !== "FUZZY" || c.tier !== "T4_FUZZY") {
          faults.push(
            `candidate ${c.candidate_canonical_display} declared ${c.method}/${String(c.tier)}`,
          );
        }
        const phonetic = c.explanation_codes.filter((code) =>
          /PHONET|SOUNDEX|METAPHONE|DAITCH/u.test(code),
        );
        if (phonetic.length > 0 && RESOLVED_STATUSES.has(o.resolution.resolution_status)) {
          faults.push(
            `phonetic candidate ${c.candidate_canonical_display} (${phonetic.join(",")}) ` +
              `accompanied a ${o.resolution.resolution_status} resolution`,
          );
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  OCR_CANDIDATE_ACCEPTED_AS_HISTORICAL_FORM: {
    clause: "docs/canonical/17 §13 `OCR_CANDIDATE → ACCEPTED HISTORICAL FORM`",
    rule:
      "No existing name form may gain acceptance during a lookup: not a form_type promoted " +
      "to an attested one, not an attestation raised out of GENERATED_CANDIDATE, and not an " +
      "unaccepted association gaining a surname_id.",
    check: (o) => {
      const faults: string[] = [];
      for (const before of o.before.name_forms) {
        const after = findForm(o.after.name_forms, before.name_form_id);
        if (!after) {
          faults.push(`name form ${before.form} disappeared`);
          continue;
        }
        if (after.form_type !== before.form_type) {
          faults.push(`${before.form}: form_type ${before.form_type} → ${after.form_type}`);
        }
        if (after.attestation_status !== before.attestation_status) {
          faults.push(
            `${before.form}: attestation ${before.attestation_status} → ${after.attestation_status}`,
          );
        }
        if (before.surname_id === null && after.surname_id !== null) {
          faults.push(`${before.form}: unaccepted association gained surname_id`);
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  AMBIGUOUS_SILENT_AUTO_RESOLUTION: {
    clause: "docs/canonical/17 §13 `AMBIGUOUS → SILENT AUTO-RESOLUTION`; TASK-003 §7.3",
    rule:
      "An ambiguous or review-required lookup resolves to nothing, names its candidates and " +
      "asks. It never picks one.",
    check: (o) => {
      const r = o.resolution;
      if (!HUMAN_STATUSES.has(r.resolution_status)) return null;
      const faults: string[] = [];
      if (!r.user_confirmation_required) faults.push("user_confirmation_required was false");
      if (r.resolved_surname_id !== null) {
        faults.push(`resolved_surname_id was ${r.resolved_surname_id}`);
      }
      if (r.matched_name_form_id !== null) {
        faults.push(`matched_name_form_id was ${r.matched_name_form_id}`);
      }
      if (r.outcome !== "UNRESOLVED") faults.push(`outcome was ${r.outcome}`);
      if (r.resolution_status === "MULTIPLE_EXACT" && r.candidate_surname_ids.length < 2) {
        faults.push(`MULTIPLE_EXACT named ${String(r.candidate_surname_ids.length)} candidate ids`);
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  EXACT_ENTITY_DISPLACED_BY_FUZZY: {
    clause:
      "docs/canonical/17 §13 `EXACT ENTITY displaced by more frequent fuzzy entity`; " +
      "docs/canonical/13 §32.3",
    rule:
      "Where an exact entity exists it wins outright: no fuzzy list is produced alongside " +
      "it, and no fuzzy candidate may carry the input's own canonical key.\n\n" +
      "What this deliberately does **not** assert is the `reason` a suppression carries. " +
      "The first version of this rule required `EXACT_MATCH_EXISTS`, and running the corpus " +
      "showed that a five-character surname reports `INPUT_TOO_SHORT` instead — because the " +
      "exact-match guard is discovered *from the trigram shortlist*, and below six code " +
      "points no retrieval runs at all. Both are true of `Nowak`, and the hard fail §13 names " +
      "is the displacement, not the choice between two correct explanations of a suppression " +
      "that returned nothing. The reason code is pinned on both sides of the six-character " +
      "floor by RES-EXACT-001 and RES-EXACTWINS-001, where it belongs: a case expectation.",
    check: (o) => {
      const r = o.resolution;
      const s = o.suggestion;
      const faults: string[] = [];
      if (RESOLVED_STATUSES.has(r.resolution_status) && s.kind !== "NO_SUGGESTIONS") {
        faults.push(`a ${s.kind} accompanied a ${r.resolution_status} resolution`);
      }
      if (s.kind === "SUGGESTIONS") {
        for (const c of s.candidates) {
          if (canonicalKey(c.candidate_canonical_display) === r.canonical_key) {
            faults.push(
              `${c.candidate_canonical_display} shares the input's canonical key yet was ` +
                `offered as a fuzzy candidate`,
            );
          }
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  MIXED_SCRIPT_CONFUSABLE_SILENTLY_NORMALIZED: {
    clause:
      "docs/canonical/17 §13 `MIXED-SCRIPT CONFUSABLE silently normalized into another " +
      "identity`; docs/canonical/13 §16",
    rule:
      "Under the default REVIEW policy a mixed-script or confusable input is held for a " +
      "human and resolves to nothing. Under RESOLVE_FLAGGED it may resolve, but only " +
      "carrying its flags — which is what makes it not silent.",
    check: (o) => {
      const r = o.resolution;
      const faults: string[] = [];
      if (r.mixed_script && o.mixed_script_policy === "REVIEW") {
        if (r.resolution_status !== "REVIEW_REQUIRED") {
          faults.push(`mixed script resolved as ${r.resolution_status}`);
        }
        if (r.resolved_surname_id !== null) faults.push("mixed script named an identity");
        if (!r.user_confirmation_required) faults.push("no confirmation was required");
      }
      if (r.script_confusable_flag && RESOLVED_STATUSES.has(r.resolution_status)) {
        if (o.mixed_script_policy === "REVIEW") {
          faults.push(`a confusable input resolved as ${r.resolution_status}`);
        } else if (!r.mixed_script) {
          faults.push("a confusable input resolved without carrying mixed_script");
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  SEARCH_CANDIDATE_PERSISTED_AS_HISTORICAL_FORM: {
    clause:
      "docs/canonical/17 §13 `SEARCH_CANDIDATE persisted as attested historical form without " +
      "evidence`; §24's `SearchCandidate ≠ EvidenceItem`",
    rule:
      "The lookup and suggestion paths are read-only. Nothing they return is written back, " +
      "so no identity row appears at all — and certainly not an attested one.",
    check: (o) => {
      const faults: string[] = [];
      const added = newForms(o);
      for (const f of added) {
        faults.push(`name form ${f.form} (${f.form_type}/${f.attestation_status}) was created`);
      }
      if (o.after.surnames !== o.before.surnames) {
        faults.push(
          `surnames went from ${String(o.before.surnames)} to ${String(o.after.surnames)}`,
        );
      }
      if (o.after.knowledge_entities !== o.before.knowledge_entities) {
        faults.push(
          `knowledge_entities went from ${String(o.before.knowledge_entities)} to ` +
            `${String(o.after.knowledge_entities)}`,
        );
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION: {
    clause: "docs/canonical/17 §4's worked example; ADR-0005; docs/canonical/11 §4.3",
    rule:
      "Two strings with different canonical keys may only be the same identity because an " +
      "accepted NameForm says so. The bridge is named in the outcome, and that form is " +
      "eligible under `resolvable_name_forms`'s own rule — restated here so widening the " +
      "view fails this corpus.",
    check: (o) => {
      const r = o.resolution;
      if (!RESOLVED_STATUSES.has(r.resolution_status)) return null;
      const display = r.resolved_canonical_display;
      if (display === null) return "a resolved lookup named no display form";
      const faults: string[] = [];
      const keysDiffer = canonicalKey(display) !== r.canonical_key;
      if (keysDiffer) {
        if (r.resolution_status !== "KNOWN_VARIANT") {
          faults.push(
            `${r.unicode_nfc} resolved to ${display} as ${r.resolution_status} although ` +
              `their canonical keys differ`,
          );
        }
        if (r.matched_name_form_id === null) faults.push("no NameForm was named as the bridge");
      }
      if (r.resolution_status === "KNOWN_VARIANT") {
        if (r.matched_form === null) faults.push("KNOWN_VARIANT named no matched form");
        else if (canonicalKey(r.matched_form) !== r.canonical_key) {
          faults.push(`matched form ${r.matched_form} does not carry the input's canonical key`);
        }
        if (r.matched_name_form_id !== null) {
          const form = findForm(o.after.name_forms, r.matched_name_form_id);
          if (!form) faults.push("the matched NameForm id is not in name_forms");
          else {
            if (!RESOLVABLE_FORM_TYPES.has(form.form_type)) {
              faults.push(`matched form is a ${form.form_type}`);
            }
            if (!RESOLVABLE_ATTESTATIONS.has(form.attestation_status)) {
              faults.push(`matched form is ${form.attestation_status}`);
            }
            if (form.surname_id === null) faults.push("matched form has no accepted association");
          }
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  HISTORICAL_VARIANT_CREATED_FROM_FOLD_ONLY: {
    clause: "docs/canonical/17 §4's worked example; ADR-0005 §3",
    rule:
      "`polishDiacriticFold` is a candidate-generation aid, never an identity rule. A fold " +
      "collision must not produce a historical or variant form, and must not by itself be " +
      "what merged two identities.",
    check: (o) => {
      const r = o.resolution;
      const faults: string[] = [];
      for (const f of newForms(o)) {
        if (f.form_type === "HISTORICAL_ATTESTED" || f.form_type === "MODERN_VARIANT") {
          faults.push(`a ${f.form_type} form ${f.form} was created during a lookup`);
        }
      }
      const display = r.resolved_canonical_display;
      if (display !== null && RESOLVED_STATUSES.has(r.resolution_status)) {
        const foldsMatch =
          polishDiacriticFold(toNfc(r.unicode_nfc)) === polishDiacriticFold(toNfc(display));
        const keysDiffer = canonicalKey(display) !== r.canonical_key;
        if (foldsMatch && keysDiffer && r.matched_name_form_id === null) {
          faults.push(
            `${r.unicode_nfc} and ${display} share only a diacritic fold, and nothing else ` +
              `bridged them`,
          );
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  CANDIDATE_CARRIES_CONFIDENCE_SCORE: {
    clause: "docs/canonical/13 §25.3; docs/canonical/16 §35",
    rule:
      "A retrieval rank is not a confidence. No candidate carries a field a consumer could " +
      "read as a probability, likelihood or confidence.",
    check: (o) => {
      const s = o.suggestion;
      if (s.kind !== "SUGGESTIONS") return null;
      const faults: string[] = [];
      for (const c of s.candidates) {
        for (const key of Object.keys(c)) {
          if (key === "retrieval_rank_score") continue;
          if (/confidence|probability|likelihood|certainty|score/iu.test(key)) {
            faults.push(`candidate ${c.candidate_canonical_display} carries \`${key}\``);
          }
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  INVALID_INPUT_REPORTED_AS_UNKNOWN_SURNAME: {
    clause: "TASK-003 §7.3, §8 item 19",
    rule:
      "An input that never reached matching reports its own validation status. Reporting it " +
      "as UNKNOWN would tell a visitor their surname does not exist.",
    check: (o) => {
      const r = o.resolution;
      const faults: string[] = [];
      const neverMatched =
        r.validation_status !== "VALID" && r.validation_status !== "MIXED_SCRIPT_REVIEW";
      if (neverMatched) {
        if (r.resolution_status !== r.validation_status) {
          faults.push(`${r.validation_status} input reported as ${r.resolution_status}`);
        }
        if (r.outcome !== "INVALID_INPUT") faults.push(`outcome was ${r.outcome}`);
        if (r.resolved_surname_id !== null) faults.push("an invalid input named an identity");
      }
      if (r.resolution_status === "UNKNOWN" && neverMatched) {
        faults.push("an invalid input was reported as an unknown surname");
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },
};

export const RESOLUTION_FORBIDDEN_CODES = Object.keys(
  RESOLUTION_FORBIDDEN,
) as readonly ResolutionForbiddenCode[];
