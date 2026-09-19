# ADR-0004 — `PopulationValueDTO.unit` admits `SURNAME_OCCURRENCES`

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** project owner + TASK-005 implementation session
- **Depends on:** ADR-0002 (PostgreSQL access and query layer)
- **Deviates from:** `docs/canonical/16` §26, which fixes the unit as the literal `"PEOPLE"`
- **Resolves:** `docs/DECISIONS_NEEDED.md` D-010 · unblocks `tasks/006-surname-result-read-api.md`
- **Related, still open:** TASK-004 §14 **U-4** (the underlying source question), D-007 (publisher contact)

## Context

`docs/canonical/16` §26 defines the population value the API returns:

```ts
interface PopulationValueDTO {
  status: NumericValueStatus;
  value: number | null;
  unit: "PEOPLE";
  scope_label_code: string;
}
```

`unit` is a single-member literal. Any response built to this contract asserts that the number is a count **of people**.

That is not what the source says. The PESEL dataset's own notes describe *"liczba wystąpień"* — the number of **occurrences** of a current-surname value among living persons in the register. That one occurrence corresponds to one living person is strongly implied and very probably true, but the publisher never states it, and nobody has confirmed it. TASK-004 recorded this as §14 U-4 and it is still unanswered.

TASK-005 took the conservative route: the `CURRENT_POPULATION` claim payload carries the publisher's verbatim universe description in `source_population_scope` and stores **no unit at all**. An integration test asserts the stored payload contains neither `"unit"` nor `"PEOPLE"`.

That leaves a gap exactly at the API boundary. `ARCHITECTURE.md` §6 states the frontend "never derives a fact" and consumes validated presentation objects only, so the unit cannot be softened downstream — whatever the DTO carries *is* the product's assertion. A read layer built literally to §26 would therefore publish, to end users, a claim the truth layer beneath it is forbidden to make. `PRODUCT.md` §7 rule 1 promises every published fact traces to a source; this would be the first published fact, and the trace would not support it.

Waiting is also a cost: TASK-006 cannot write its contract at all while the unit is undecided, and the publisher enquiry has no committed turnaround.

## Decision

**Widen the unit to a two-member enum. PESEL-derived `CURRENT_POPULATION` responses carry `SURNAME_OCCURRENCES`.**

```ts
type PopulationUnit =
  | "PEOPLE"               // a source that genuinely counts people
  | "SURNAME_OCCURRENCES"; // occurrences of a surname value in a register

interface PopulationValueDTO {
  status: NumericValueStatus;
  value: number | null;
  unit: PopulationUnit;
  scope_label_code: string;
}
```

- PESEL national resources `1148808` / `1148811` emit `unit: "SURNAME_OCCURRENCES"`.
- `scope_label_code` carries a code for the publisher's universe (e.g. `PESEL_CURRENT_SURNAME`), which the frontend localises. The publisher's verbatim Polish scope text remains available from the claim's `source_population_scope` for any surface that wants to show it exactly.
- `"PEOPLE"` stays in the enum, unused for now. It is what PESEL switches to if U-4 is answered affirmatively, and what a future source that genuinely counts people would use.

Everything else in §26 is unchanged: `NumericValueStatus`, the nullable `value`, and the rule that a suppressed or absent value is never `{"value": 0}`.

## Why

- **It is the only option that publishes nothing false.** Shipping `"PEOPLE"` on the strength of an implication would put an unsupported assertion in the one place the product promises traceability, and it would be invisible to every downstream reviewer — the DTO would look canonical.
- **It is reversible in the cheap direction.** Widening an enum is additive. If the publisher confirms U-4, the fix is to change one emitted *value*, not the schema, and no consumer breaks. Had we shipped `"PEOPLE"` and later found it wrong, the correction would be a breaking contract change plus a public correction.
- **It does not block on an external party.** D-007's enquiry to Ministerstwo Cyfryzacji is still worth sending, and remains the route to `"PEOPLE"`. This decision means TASK-006 does not wait for it.
- **The distinction is small in practice and large in principle.** For almost every surname the two readings give the same number. The point is that Name Atlas says what its sources support — which is the differentiator `PRODUCT.md` §7 records.

## Consequences

- `docs/canonical/16` §26 is **not** implemented verbatim. A future reader comparing the contract to the canonical text will find this difference; this ADR is the reason, and the contract schema must carry a comment pointing here.
- The UI needs a label for `SURNAME_OCCURRENCES` that reads naturally in Polish and English. That is a copy decision, not an engineering one, and belongs to whichever task first renders the value.
- `tasks/006-surname-result-read-api.md` AC-12 is now concrete: the test asserts `SURNAME_OCCURRENCES`.
- TASK-005 is unaffected. It stores no unit, and that stays correct — the unit is a presentation-boundary concept, not a claim-payload one.
- D-007's publisher enquiry gains a second question worth asking alongside the licence one.

## Do not revisit unless

- TASK-004 §14 U-4 is answered by the publisher — then PESEL's emitted value changes to `"PEOPLE"` (or is confirmed as occurrences), by editing the value, not this ADR's structure; or
- `docs/canonical/16` §26 is itself revised, at which point this ADR should be reconciled with it rather than silently kept.

A preference for matching the canonical literal exactly, at the cost of asserting a unit no source states, is **not** a reason to revisit this.
