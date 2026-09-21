import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { resolveSurname, suggestSurnames } from "@name-atlas/resolver";
import { RESOLUTION_CASES } from "./corpus/resolution.js";
import { RESOLUTION_FORBIDDEN } from "./forbidden-resolution.js";
import { seedCorpus } from "./fixtures.js";
import { corpusMetrics } from "./metrics.js";
import { assertCorpusPreconditions, snapshotIdentity } from "./observe.js";
import type { ResolutionObservation } from "./observe.js";
import { describeOneOf, matchesOneOf, projectionsOf } from "./expect-resolution.js";
import { formatViolations, runForbidden } from "./run.js";

/**
 * The resolution golden corpus (`docs/canonical/17` §10–§13 — Layer 3,
 * "Absolute P0").
 *
 * Runs against a real PostgreSQL, because the tiers being tested are a unique
 * index and a view: an exact resolver exercised against a stub proves nothing
 * about either. Every case is executed once in `beforeAll`, with an identity
 * snapshot taken either side of it, and the assertions then read those
 * observations — so the suite is one pass over the corpus rather than one
 * database round per assertion.
 */
describe("resolution golden corpus", () => {
  let database: TestDatabase | undefined;
  const observations = new Map<string, ResolutionObservation>();
  const displays = new Map<string, string>();

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    const db = database.db;
    await assertCorpusPreconditions(db);

    const seeded = await seedCorpus(db);
    // Display forms by surname_id, so `candidate_surname_displays` can be
    // asserted as names rather than as uuids nobody can read in a diff.
    const rows = await db
      .selectFrom("surnames")
      .select(["surname_id", "canonical_display"])
      .execute();
    for (const row of rows) displays.set(row.surname_id, row.canonical_display);
    expect(seeded.fixture_id).toBe("surname-set-v1");

    for (const goldenCase of RESOLUTION_CASES) {
      const before = await snapshotIdentity(db);
      const lookup = await resolveSurname(db, goldenCase.input.raw_surname);
      if (lookup.kind !== "RESOLUTION") {
        throw new Error(
          `${goldenCase.meta.case_id}: lookup failed at ${lookup.stage}: ${lookup.message}`,
        );
      }
      const suggestion = await suggestSurnames(db, goldenCase.input.raw_surname);
      if (suggestion.kind === "LOOKUP_FAILED") {
        throw new Error(`${goldenCase.meta.case_id}: suggestion lookup failed`);
      }
      const after = await snapshotIdentity(db);
      observations.set(goldenCase.meta.case_id, {
        resolution: lookup.resolution,
        suggestion,
        before,
        after,
        mixed_script_policy: "REVIEW",
      });
    }
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  function observationFor(caseId: string): ResolutionObservation {
    const o = observations.get(caseId);
    if (!o) throw new Error(`no observation for ${caseId} — see the beforeAll failure above`);
    return o;
  }

  describe.each(RESOLUTION_CASES.map((c) => [c.meta.case_id, c] as const))(
    "%s",
    (caseId, goldenCase) => {
      const want = goldenCase.expected.resolution;

      it("reaches the expected outcome and match type", () => {
        const r = observationFor(caseId).resolution;
        expect(
          matchesOneOf(want.outcome, r.outcome),
          `expected outcome ${describeOneOf(want.outcome)}, got ${r.outcome}`,
        ).toBe(true);
        expect(
          matchesOneOf(want.resolution_status, r.resolution_status),
          `expected status ${describeOneOf(want.resolution_status)}, got ${r.resolution_status}`,
        ).toBe(true);
      });

      it("sets the decision mode and the three human-in-the-loop flags as expected", () => {
        const o = observationFor(caseId);
        const p = projectionsOf(o);
        expect(
          matchesOneOf(want.decision_mode, p.decision_mode),
          `expected decision mode ${describeOneOf(want.decision_mode)}, got ${p.decision_mode}`,
        ).toBe(true);
        expect({
          auto_resolved: p.auto_resolved,
          user_confirmation_required: o.resolution.user_confirmation_required,
          human_review_required: p.human_review_required,
        }).toEqual({
          auto_resolved: want.auto_resolved,
          user_confirmation_required: want.user_confirmation_required,
          human_review_required: want.human_review_required,
        });
      });

      it("names the expected identity, or none", () => {
        const r = observationFor(caseId).resolution;
        expect(r.resolved_canonical_display).toBe(want.resolved_display);
        expect(r.matched_form).toBe(want.matched_form);
        // An id and a display form always travel together: one without the
        // other is a half-resolved identity a consumer would have to guess at.
        expect(r.resolved_surname_id === null).toBe(r.resolved_canonical_display === null);
      });

      it("names the expected candidate identities where the lookup was ambiguous", () => {
        if (want.candidate_surname_displays === null) return;
        const r = observationFor(caseId).resolution;
        const named = r.candidate_surname_ids
          .map((id) => displays.get(id) ?? id)
          .sort((a, b) => a.localeCompare(b, "pl"));
        // §11: "Do not evaluate only top-1 string." For an ambiguous lookup the
        // whole set is the answer, so the whole set is asserted.
        expect(named).toEqual([...want.candidate_surname_displays]);
      });

      it("produces the expected kind of suggestion outcome", () => {
        const s = observationFor(caseId).suggestion;
        const expectation = goldenCase.expected.suggestion;
        if (expectation.kind === "ANY") return;
        expect(s.kind).toBe(expectation.kind);
        if (expectation.kind === "NO_SUGGESTIONS" && s.kind === "NO_SUGGESTIONS") {
          expect(s.reason).toBe(expectation.reason);
        }
      });

      it("honours every candidate inclusion and exclusion the case states", () => {
        const s = observationFor(caseId).suggestion;
        const present =
          s.kind === "SUGGESTIONS" ? s.candidates.map((c) => c.candidate_canonical_display) : [];
        for (const [display, verb] of Object.entries(goldenCase.expected.candidate_behavior)) {
          if (verb === "MUST_APPEAR") expect(present).toContain(display);
          if (verb === "MUST_NOT_APPEAR") expect(present).not.toContain(display);
          // MAY_APPEAR asserts nothing about presence — and everything about
          // what presence means, which the forbidden rules below check.
        }
      });

      it("gives every candidate it does return a real, declared provenance", () => {
        const s = observationFor(caseId).suggestion;
        if (s.kind !== "SUGGESTIONS") return;
        for (const c of s.candidates) {
          expect(displays.has(c.candidate_surname_id)).toBe(true);
          expect(displays.get(c.candidate_surname_id)).toBe(c.candidate_canonical_display);
          expect(c.method_version).not.toBe("");
          expect(c.explanation_codes.length).toBeGreaterThan(0);
        }
      });

      it("breaks none of its forbidden rules", () => {
        const violations = runForbidden(
          RESOLUTION_FORBIDDEN,
          goldenCase.forbidden,
          observationFor(caseId),
        );
        expect(formatViolations(caseId, violations)).toBe("");
      });
    },
  );

  describe("corpus-wide resolution invariants (§12, §13)", () => {
    it("applies EVERY forbidden rule to EVERY case, not only the ones each case lists", () => {
      // §13's hard fails are absolute: a case that does not list one must still
      // satisfy it. The per-case lists say what each case is *about*.
      const failures: string[] = [];
      for (const goldenCase of RESOLUTION_CASES) {
        const violations = runForbidden(
          RESOLUTION_FORBIDDEN,
          Object.keys(RESOLUTION_FORBIDDEN),
          observationFor(goldenCase.meta.case_id),
        );
        if (violations.length > 0) {
          failures.push(formatViolations(goldenCase.meta.case_id, violations));
        }
      }
      expect(failures.join("\n")).toBe("");
    });

    it("has a FALSE MERGE RATE of zero (§12 launch priority)", () => {
      const metrics = corpusMetrics(
        RESOLUTION_CASES.map((c) => [c, observationFor(c.meta.case_id)] as const),
      );
      expect(metrics.false_merges).toEqual([]);
    });

    it("has a FALSE AUTO-RESOLVE RATE of zero (§12 launch priority)", () => {
      const metrics = corpusMetrics(
        RESOLUTION_CASES.map((c) => [c, observationFor(c.meta.case_id)] as const),
      );
      expect(metrics.false_auto_resolves).toEqual([]);
      expect(metrics.ambiguous_auto_resolves).toEqual([]);
    });

    it("resolves every identity it does resolve to the right one", () => {
      const metrics = corpusMetrics(
        RESOLUTION_CASES.map((c) => [c, observationFor(c.meta.case_id)] as const),
      );
      expect(metrics.wrong_identities).toEqual([]);
      // A corpus in which nothing resolves would satisfy every refusal above.
      expect(metrics.resolved).toBeGreaterThan(0);
    });

    it("wrote nothing at all: the whole corpus left the identity tables untouched", () => {
      const first = RESOLUTION_CASES[0];
      const last = RESOLUTION_CASES[RESOLUTION_CASES.length - 1];
      if (!first || !last) throw new Error("the corpus is empty");
      const start = observationFor(first.meta.case_id).before;
      const end = observationFor(last.meta.case_id).after;
      expect({
        knowledge_entities: end.knowledge_entities,
        surnames: end.surnames,
        name_forms: end.name_forms.length,
      }).toEqual({
        knowledge_entities: start.knowledge_entities,
        surnames: start.surnames,
        name_forms: start.name_forms.length,
      });
      expect(end.name_forms).toEqual(start.name_forms);
    });
  });
});
