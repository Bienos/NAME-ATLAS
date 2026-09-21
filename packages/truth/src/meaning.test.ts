import { describe, expect, it } from "vitest";
import { assessSurnameMeaning, isValidCombination } from "./confidence.js";
import { distinctWorks, interpretationsAgree, surnameMeaningClaimKey } from "./meaning.js";
import type { OnomasticInterpretation } from "./meaning.js";

/**
 * TASK-022 — the pure half of the `SURNAME_MEANING` chain (ADR-0008 §5).
 *
 * The interpretations here are mechanical fixtures. None is a statement about a
 * real surname's origin; the roots are the literal strings `root-a`/`root-b`.
 */

function interpretation(patch: Partial<OnomasticInterpretation> = {}): OnomasticInterpretation {
  return {
    source_id: "src-a",
    source_record_id: "rec-a",
    work_title: "Work A",
    work_author_or_publisher: "Author A",
    work_year: 1900,
    root_form: "root-a",
    root_language: "lang",
    literal_gloss: "gloss",
    formation_type: "OTHER",
    locator: "p. 1",
    quotation: null,
    ...patch,
  };
}

describe("ADR-0008 §5: confidence follows the evidence", () => {
  it("gives a single work POSSIBLE, never LIKELY", () => {
    const verdict = assessSurnameMeaning({ supportingWorks: 1, worksAgree: true });
    expect(verdict.status).toBe("POSSIBLE");
    expect(verdict.epistemic_type).toBe("INTERPRETATION");
    expect(verdict.rationale).toMatch(/single work is a single opinion/u);
  });

  it("gives two agreeing works LIKELY", () => {
    expect(assessSurnameMeaning({ supportingWorks: 2, worksAgree: true }).status).toBe("LIKELY");
  });

  it("gives two disagreeing works CONFLICTING, and asks for review", () => {
    const verdict = assessSurnameMeaning({ supportingWorks: 2, worksAgree: false });
    expect(verdict.status).toBe("CONFLICTING");
    expect(verdict.human_review_required).toBe(true);
  });

  it("gives no works INSUFFICIENT_DATA, and says absence is not a meaning", () => {
    const verdict = assessSurnameMeaning({ supportingWorks: 0, worksAgree: true });
    expect(verdict.status).toBe("INSUFFICIENT_DATA");
    expect(verdict.rationale).toMatch(/absence of scholarship is not a meaning/u);
  });

  it("never reaches VERIFIED, at any number of agreeing works", () => {
    // An interpretation is not a measurement. This is the failure the whole
    // decision exists to prevent, so it is asserted rather than assumed.
    for (const supportingWorks of [1, 2, 3, 10, 1000]) {
      for (const worksAgree of [true, false]) {
        expect(assessSurnameMeaning({ supportingWorks, worksAgree }).status).not.toBe("VERIFIED");
      }
    }
  });

  it("only ever emits a status canonical/11 §12.3 permits for an INTERPRETATION", () => {
    for (const supportingWorks of [0, 1, 2, 5]) {
      for (const worksAgree of [true, false]) {
        const v = assessSurnameMeaning({ supportingWorks, worksAgree });
        expect(isValidCombination(v.epistemic_type, v.status)).toBe(true);
      }
    }
  });

  it("carries a rationale on every path — an assessment with no reason is not one", () => {
    for (const supportingWorks of [0, 1, 2]) {
      for (const worksAgree of [true, false]) {
        expect(
          assessSurnameMeaning({ supportingWorks, worksAgree }).rationale.length,
        ).toBeGreaterThan(20);
      }
    }
  });
});

describe("agreement is strict (MEANING_AGREEMENT_BASIS)", () => {
  it("treats one interpretation as agreeing with itself", () => {
    expect(interpretationsAgree([interpretation()])).toBe(true);
    expect(interpretationsAgree([])).toBe(true);
  });

  it("agrees on identical root and language, ignoring case", () => {
    expect(
      interpretationsAgree([
        interpretation({ root_form: "root-a", root_language: "lang" }),
        interpretation({ root_form: "ROOT-A", root_language: "LANG" }),
      ]),
    ).toBe(true);
  });

  it("disagrees on a different root", () => {
    expect(interpretationsAgree([interpretation(), interpretation({ root_form: "root-b" })])).toBe(
      false,
    );
  });

  it("disagrees on a different language for the same root", () => {
    expect(
      interpretationsAgree([interpretation(), interpretation({ root_language: "other" })]),
    ).toBe(false);
  });

  it("does not let a work with no root agree with one that has a root", () => {
    // "We do not know the root but it means X" and "the root is Y" are
    // different statements. Collapsing them would invent agreement.
    expect(interpretationsAgree([interpretation(), interpretation({ root_form: null })])).toBe(
      false,
    );
  });

  it("treats two works that both propose no root as agreeing", () => {
    expect(
      interpretationsAgree([
        interpretation({ root_form: null, root_language: null }),
        interpretation({ root_form: null, root_language: null }),
      ]),
    ).toBe(true);
  });
});

describe("works are counted, not entries", () => {
  it("counts two entries from one work as one work", () => {
    expect(distinctWorks([interpretation(), interpretation({ locator: "p. 2" })])).toBe(1);
  });

  it("counts entries from two works as two", () => {
    expect(distinctWorks([interpretation(), interpretation({ source_id: "src-b" })])).toBe(2);
  });

  it("means one work quoting itself twice stays POSSIBLE", () => {
    // Otherwise a single work with two entries for a surname would promote
    // itself to LIKELY, which is exactly the manufactured confidence ADR-0008
    // §5 rules out.
    const twice = [interpretation(), interpretation({ locator: "p. 2" })];
    expect(
      assessSurnameMeaning({
        supportingWorks: distinctWorks(twice),
        worksAgree: interpretationsAgree(twice),
      }).status,
    ).toBe("POSSIBLE");
  });
});

describe("claim key", () => {
  it("is one per surname, with no timestamp or run id", () => {
    expect(surnameMeaningClaimKey("abc")).toBe("SURNAME_MEANING|abc");
    expect(surnameMeaningClaimKey("abc")).toBe(surnameMeaningClaimKey("abc"));
  });
});
