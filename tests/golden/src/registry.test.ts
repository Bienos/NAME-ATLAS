import { describe, expect, it } from "vitest";
import { RESOLUTION_CASES } from "./corpus/resolution.js";
import { RIGHTS_CASES } from "./corpus/rights.js";
import { RESOLUTION_FORBIDDEN } from "./forbidden-resolution.js";
import type { ResolutionForbiddenCode } from "./forbidden-resolution.js";
import { RIGHTS_FORBIDDEN } from "./forbidden-rights.js";
import type { RightsForbiddenCode } from "./forbidden-rights.js";
import type { CaseMetadata } from "./case.js";

/**
 * The corpus's own invariants.
 *
 * A golden corpus fails quietly in two ways nothing else catches: a rule that
 * no case exercises, and a case that traces to no requirement. Both look fine
 * in a green test run. This file is what makes `docs/canonical/17` §4's
 * principle structural rather than aspirational, and it needs no database.
 */

const ALL_META: readonly CaseMetadata[] = [
  ...RESOLUTION_CASES.map((c) => c.meta),
  ...RIGHTS_CASES.map((c) => c.meta),
];

/**
 * `docs/canonical/17` §13's seven resolution hard fails, each mapped to the
 * predicate that enforces it. The canonical text is quoted verbatim so the
 * mapping can be checked by reading rather than by trusting the name.
 */
const RESOLUTION_HARD_FAILS: ReadonlyArray<readonly [string, ResolutionForbiddenCode]> = [
  ["FUZZY_CANDIDATE → AUTO", "FUZZY_CANDIDATE_AUTO_RESOLVED"],
  ["PHONETIC_ONLY → AUTO", "PHONETIC_ONLY_AUTO_RESOLVED"],
  ["OCR_CANDIDATE → ACCEPTED HISTORICAL FORM", "OCR_CANDIDATE_ACCEPTED_AS_HISTORICAL_FORM"],
  ["AMBIGUOUS → SILENT AUTO-RESOLUTION", "AMBIGUOUS_SILENT_AUTO_RESOLUTION"],
  ["EXACT ENTITY displaced by more frequent fuzzy entity", "EXACT_ENTITY_DISPLACED_BY_FUZZY"],
  [
    "MIXED-SCRIPT CONFUSABLE silently normalized into another identity",
    "MIXED_SCRIPT_CONFUSABLE_SILENTLY_NORMALIZED",
  ],
  [
    "SEARCH_CANDIDATE persisted as attested historical form without evidence",
    "SEARCH_CANDIDATE_PERSISTED_AS_HISTORICAL_FORM",
  ],
];

/** §21's four rights hard fails. The fourth needs two predicates: the state
 * where a block is already in force, and the transition into one. */
const RIGHTS_HARD_FAILS: ReadonlyArray<readonly [string, readonly RightsForbiddenCode[]]> = [
  [
    "commercial_use UNKNOWN + paid report contains evidence",
    ["COMMERCIAL_UNKNOWN_EVIDENCE_ON_PAID_SURFACE"],
  ],
  ["image_rights PROHIBITED + report embeds image", ["IMAGE_PROHIBITED_BUT_REPRODUCED"]],
  [
    "automated_access PROHIBITED + connector executes automatically",
    ["AUTOMATION_PROHIBITED_BUT_CONNECTOR_EXECUTES"],
  ],
  [
    "rights change blocks item + cached premium projection still exposes it",
    ["RIGHTS_BLOCKED_BUT_STILL_EXPOSED", "RESTRICTION_WIDENED_AN_EXISTING_DECISION"],
  ],
];

describe("every forbidden code is a rule that runs", () => {
  it("gives every resolution code a clause, a rule and a predicate", () => {
    for (const [code, rule] of Object.entries(RESOLUTION_FORBIDDEN)) {
      expect(rule.clause, code).not.toBe("");
      expect(rule.rule, code).not.toBe("");
      expect(typeof rule.check, code).toBe("function");
    }
  });

  it("gives every rights code a clause, a rule and a predicate", () => {
    for (const [code, rule] of Object.entries(RIGHTS_FORBIDDEN)) {
      expect(rule.clause, code).not.toBe("");
      expect(rule.rule, code).not.toBe("");
      expect(typeof rule.check, code).toBe("function");
    }
  });

  it("has no resolution rule that no case exercises", () => {
    const used = new Set(RESOLUTION_CASES.flatMap((c) => c.forbidden));
    const unused = Object.keys(RESOLUTION_FORBIDDEN).filter((code) => !used.has(code as never));
    expect(unused).toEqual([]);
  });

  it("has no rights rule that no case exercises", () => {
    const used = new Set(RIGHTS_CASES.flatMap((c) => c.forbidden));
    const unused = Object.keys(RIGHTS_FORBIDDEN).filter((code) => !used.has(code as never));
    expect(unused).toEqual([]);
  });
});

describe("docs/canonical/17 §13 — every resolution P0 hard fail is covered", () => {
  it.each(RESOLUTION_HARD_FAILS)("%s", (_clause, code) => {
    expect(RESOLUTION_FORBIDDEN[code]).toBeDefined();
    const cases = RESOLUTION_CASES.filter((c) => c.forbidden.includes(code));
    expect(cases.length).toBeGreaterThan(0);
    // A hard fail blocks release, so the case that guards it must say so.
    expect(cases.some((c) => c.meta.blocking_level === "P0")).toBe(true);
  });
});

describe("docs/canonical/17 §21 — every rights P0 hard fail is covered", () => {
  it.each(RIGHTS_HARD_FAILS)("%s", (_clause, codes) => {
    for (const code of codes) {
      expect(RIGHTS_FORBIDDEN[code]).toBeDefined();
      const cases = RIGHTS_CASES.filter((c) => c.forbidden.includes(code));
      expect(cases.length, code).toBeGreaterThan(0);
      expect(cases.some((c) => c.meta.blocking_level === "P0")).toBe(true);
    }
  });
});

describe("docs/canonical/17 §20 — every named rights profile has a case", () => {
  it.each([
    "RIGHTS-FULLY-OPEN",
    "RIGHTS-ATTRIBUTION",
    "RIGHTS-METADATA-OPEN-IMAGE-BLOCKED",
    "RIGHTS-COMMERCIAL-UNKNOWN",
    "RIGHTS-NONCOMMERCIAL",
    "RIGHTS-AUTOMATION-PROHIBITED",
    "RIGHTS-PARTNERSHIP-REQUIRED",
    "RIGHTS-EXPIRED",
    "RIGHTS-CHANGED-AFTER-CLAIM",
  ])("%s", (caseId) => {
    expect(RIGHTS_CASES.map((c) => c.meta.case_id)).toContain(caseId);
  });

  it("evaluates every profile against every implemented surface and asset kind", () => {
    // §20 also names a SHARE surface. There is no evaluator for one — the
    // share control carries a page URL, not evidence — and no case pretends
    // otherwise. See `corpus/rights.ts` for the recorded gap.
    for (const goldenCase of RIGHTS_CASES) {
      expect(Object.keys(goldenCase.expected.surfaces).sort()).toEqual([
        "FREE",
        "INTERNAL",
        "PAID",
        "SEO",
      ]);
      expect(Object.keys(goldenCase.expected.matrix)).toHaveLength(12);
    }
  });
});

describe("docs/canonical/17 §6 — every case carries its required metadata", () => {
  it("gives every case a unique id", () => {
    const ids = ALL_META.map((m) => m.case_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("traces every case to at least one named requirement", () => {
    const untraceable = ALL_META.filter((m) => m.linked_requirements.length === 0);
    expect(untraceable.map((m) => m.case_id)).toEqual([]);
  });

  it("gives every case a note saying what it is for", () => {
    expect(ALL_META.filter((m) => m.notes.trim() === "").map((m) => m.case_id)).toEqual([]);
  });

  it("records a creation date in ISO form and no fabricated review", () => {
    for (const m of ALL_META) {
      expect(m.created_at, m.case_id).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      // §6: "Never overwrite historical expected behavior silently." Nothing
      // here has been reviewed by the role it needs, and the corpus says so
      // rather than carrying a date nobody stood behind.
      expect(m.review.reviewed_at === null, m.case_id).toBe(m.review.reviewed_by === null);
    }
  });
});

describe("docs/canonical/17 §4 — every case carries EXPECTED and FORBIDDEN", () => {
  it("gives every resolution case at least one forbidden rule", () => {
    const bare = RESOLUTION_CASES.filter((c) => c.forbidden.length === 0);
    expect(bare.map((c) => c.meta.case_id)).toEqual([]);
  });

  it("gives every rights case at least one forbidden rule", () => {
    const bare = RIGHTS_CASES.filter((c) => c.forbidden.length === 0);
    expect(bare.map((c) => c.meta.case_id)).toEqual([]);
  });

  it("states a positive expectation on every case as well as a refusal", () => {
    // A corpus of refusals alone is satisfied by a system that refuses
    // everything. Each domain must contain at least one case that expects a
    // real answer.
    expect(RESOLUTION_CASES.some((c) => c.expected.resolution.resolved_display !== null)).toBe(
      true,
    );
    expect(
      RIGHTS_CASES.some((c) =>
        Object.values(c.expected.matrix).some((d) => d.startsWith("ALLOWED")),
      ),
    ).toBe(true);
  });
});
