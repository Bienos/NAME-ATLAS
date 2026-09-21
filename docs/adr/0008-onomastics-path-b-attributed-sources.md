# ADR-0008 — surname meaning comes from attributed sources, or it is a stated gap

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** project owner (instructed the open decisions be implemented rather than left waiting on outreach) + the TASK-022 session
- **Resolves:** `docs/DECISIONS_NEEDED.md` D-002
- **Depends on:** ADR-0007, which is what makes this decision safe to take before any licence exists
- **Canonical basis:** `docs/canonical/11` §7.2 (`MeaningInterpretation`), §8's claim taxonomy (`SURNAME_MEANING`: Surname → meaning/root, epistemic type `INTERPRETATION`, expected evidence "Scholarly onomastic evidence", confidence LIKELY/POSSIBLE/CONFLICTING), `docs/canonical/12` §2.1 and line 764 (IJP PAN classified **PARTNER P0** — "No production cache without agreement"), `docs/canonical/10` §5.3
- **Implemented by:** `packages/truth/src/meaning.ts`, `packages/sources/src/onomastics.ts`, migration `0014_surname_meaning.ts`

## Context

D-002 offered two paths and blocked the meaning capability until one was chosen:

- **Path A** — licence or partner with IJP PAN (or another specialist rights holder) for the *Internet Dictionary of Polish Surnames*.
- **Path B** — build meaning claim-by-claim from lawful scholarly and public-domain sources, accepting lower coverage.

Path A is a commercial conversation the project owner must have, and it cannot be had by writing code. What *was* in this project's control, and what was actually blocking, is the question underneath both paths: **what does the product do with a meaning, whatever its source, and what does it show when it has none?**

There is also a hard constraint that has nothing to do with rights. Polish surname etymology is genuinely contested, and a plausible-sounding etymology is trivial to generate and impossible for a reader to distinguish from a sourced one. `AGENTS.md` §9 forbids inventing source metadata, and a generated etymology is exactly that.

## Decision

### 1. Path B, with Path A left open at zero cost

Meaning is built claim-by-claim from sources that can be cited and whose rights permit the surface. A later IJP PAN licence is then not a rebuild: it is a new `Source`, a new `rights_profile`, and an import into the same chain.

Until such a licence exists, an IJP PAN profile carries `review_status = BLOCKED`, which ADR-0007's gate turns into `BLOCKED` on every public surface while leaving internal research open. **That is what unblocks D-002.** The decision is no longer load-bearing, because neither answer can leak: an unlicensed source cannot reach a reader, and a licensed one needs no code change.

### 2. A meaning is never generated

No suffix-pattern inference, no morphological guess, no model-written etymology, not even hedged. `-ski` is not evidence of anything the product may state. If no admissible source says it, the product says it does not know.

This is stated as a prohibition rather than a preference because the failure is invisible: a fabricated etymology reads exactly like a sourced one, and `PRODUCT.md` §7's promise that every published fact traces to its source is the whole product.

### 3. The gap is a first-class result, not an empty section

`NO_SOURCED_MEANING` is a state the contract carries and the page renders, with its own sentence in both languages. It is not an omitted field, not an empty list, and not silence. The reader is told that Name Atlas has no sourced meaning for this surname — which is true, checkable, and better than a guess.

**Consequence, stated plainly: meaning launches at zero coverage.** Every surname returns `NO_SOURCED_MEANING` until an admissible source is ingested. That is the correct state, not a defect, and it is why this ADR is worth having before any source exists: the shape is fixed and honest, so adding a source is an import rather than a design.

### 4. Admissibility is four conditions, all required

A source may support a meaning claim only if:

1. it is **citable** — author or publisher, title, year, and a locator within the work;
2. its **rights permit the surface**, evaluated by ADR-0007's gate;
3. it is classified **`C_SCHOLARLY_SECONDARY` or better** in `sources.reliability_tier`;
4. its **licence basis is stated** on the source record — public domain with a reason, an open licence by name, or a licence agreement.

An entry failing any of these is refused at import, not down-weighted at read time. A refusal is a result.

### 5. Competing interpretations are kept, never merged

Two sources proposing different roots do not average, and neither silently wins. Both are stored, the claim is assessed `CONFLICTING`, and both are shown with their sources. Onomastic disagreement is a fact about the scholarship, and hiding it would misrepresent the evidence.

Confidence follows from the evidence, by a stated and versioned method:

| Admissible sources | Agreement | Confidence |
|---|---|---|
| 0 | — | no claim at all (the gap) |
| 1 | — | `POSSIBLE` |
| ≥ 2 | same root and language | `LIKELY` |
| ≥ 2 | differing | `CONFLICTING` |

`VERIFIED` is unreachable for `SURNAME_MEANING` and that is deliberate: an interpretation is not a measurement. Canonical §8 expects LIKELY/POSSIBLE/CONFLICTING here and no more.

### 6. Synthetic source files cannot be imported by accident

Proving the chain end to end needs meaning entries, and this project has no licensed corpus. So the source-file format carries a `synthetic` flag, and the importer **refuses a synthetic file** unless the caller passes `allowSynthetic: true`. Tests pass it; nothing else does. A test fixture full of invented etymology can therefore never become a production claim by mistake.

## Consequences

- The meaning capability exists, is rights-gated, and shows an honest gap. It is not blocked on outreach.
- Coverage is zero until a source is ingested, and the product says so per surname.
- `MeaningInterpretation` (`docs/canonical/11` §7.2) is **not** built as a table. The claim's `structured_value` carries root form, root language, gloss and formation type, and nothing yet queries by root. `ARCHITECTURE.md` §10 invariant 10 — a derived value is a claim, not a column — and `AGENTS.md` §6 both point the same way. It lands when a reader needs it.
- **One schema constraint was widened.** `0004` created `citations_claim_uq` as `UNIQUE (claim_id)`, and its own comment scoped that to "this task's data". Keeping competing interpretations inside one claim (§5) means a claim can rest on two works, and a `CONFLICTING` reading that cites only one side of the disagreement would misrepresent the evidence. Migration `0016` widens the index to `(claim_id, source_record_id)`, which preserves the property `0004` wanted — re-derivation still cannot add a second citation for the same record — and stops it forbidding a legitimately multi-sourced claim.
- Path A remains the better product outcome. This ADR makes waiting for it free rather than blocking, and it does not pre-empt the owner's negotiation.
