# ADR-0007 — rights are evaluated per asset kind, per surface, and fail closed

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** project owner (instructed the open decisions be implemented rather than left waiting on outreach) + the TASK-021 session
- **Resolves:** `docs/DECISIONS_NEEDED.md` D-003
- **Implements:** `docs/canonical/12` §6.1 (precedence), §6.2 (dimensions), §6.3 (decision matrix), §6.4 (hard gates), §16.4 (Polona object-level rights), §16.5 (OCR)
- **Deviates from canonical:** nothing. This ADR chooses among options canonical 12 leaves open; it contradicts no canonical statement
- **Implemented by:** `packages/truth/src/rights.ts`, `packages/truth/src/rights-load.ts`
- **Amended by:** ADR-0014 (2026-09-29). §1's refusal of `UNKNOWN` on public surfaces applies to transcription and image; metadata follows §4. §5 gains a composition rule for Polona attributions.

## Context

D-003 asked five questions that no amount of code could answer by itself, and blocked M3 until answered. They are answered here so that the historical layer can be built, and so that nothing unlawful can be surfaced while the answers are being confirmed with Biblioteka Narodowa.

The situation canonical 12 §16.4 describes is that **Polona rights differ per object**, and that three permissions — metadata, OCR/transcription, image — must be evaluated **independently**. Before this ADR the codebase had one rights evaluation (`evaluateSurface`) that read `metadata_rights` alone and returned one decision per surface. That is correct for PESEL, where the only asset is a data row, and insufficient for a digital library, where one object can be metadata-open and image-restricted at the same time.

## Decision

### 1. Unknown or unreadable rights fail closed

`UNKNOWN` is not a maybe. On any public surface (`FREE`, `PAID`, `SEO`) an asset whose governing permission is `UNKNOWN` is **BLOCKED**, exactly as if it were `PROHIBITED`. `INTERNAL` remains open for metadata so that research and rights review can proceed, because refusing to let staff read what was retrieved would make the rights question unanswerable.

This extends §6.4's existing treatment of `commercial_use` (where `UNKNOWN` already equals `PROHIBITED`) to every dimension, and it is the proposed posture D-003 recorded.

### 2. OCR text may be stored internally always, excerpted publicly only when allowed

Storing retrieved OCR is evidence handling, not publication: without the matched text there is no `EvidenceItem` to assess and no way to show why a claim was made. So OCR is stored whatever the rights say, and is reachable only from internal surfaces by default.

Publishing an excerpt is a separate permission. An excerpt appears on a public surface only when `transcription_rights === "ALLOWED"`, and is capped at **300 characters** (`TRANSCRIPTION_EXCERPT_MAX_CHARS`). The cap is a deliberate policy number, not a measurement: it is long enough to show a surname in its sentence and short enough that no sequence of excerpts reconstitutes a page. Every published excerpt carries its page/canvas locator and its attribution.

### 3. Scans are reproduced only on an explicit `ALLOWED`; otherwise link, never copy

This is §6.4's third hard gate taken literally — `if image_rights != ALLOWED: digital_asset.reproduction_eligible = false`. The fallback is not "omit": it is the new decision **`LOCATOR_ONLY`**, meaning the product may state that the object exists and link to it at a stable locator, but may not copy, crop, proxy or re-host the scan.

`LOCATOR_ONLY` exists because "blocked" and "linkable" are genuinely different outcomes for a user, and collapsing them would hide real evidence that we are entitled to point at.

### 4. Surfaces are unlocked per (asset kind × surface), not per source

Eligibility is a matrix, computed by `evaluateRightsMatrix`. The metadata row reproduces `evaluateSurface`'s existing behaviour unchanged — asserted by test, so the PESEL surfaces cannot shift under this change. The transcription and image rows add the independence §16.4 requires.

### 5. Attribution is derived, required, and carried with the decision

When `attribution_required` is set, the decision is `ALLOWED_WITH_ATTRIBUTION` rather than `ALLOWED`, and it carries the text to display: `attribution_text` verbatim when the profile has one, otherwise a line built from `source_owner` and `rights_url`. If attribution is required and neither is available, the asset is **BLOCKED** — an attribution obligation that cannot be discharged is not a licence to publish without it.

### 6. Precedence: a child layer may only tighten

§6.1's chain (asset overrides record overrides source default) is implemented as a most-restrictive-wins fold over `ALLOWED < CONDITIONAL < UNKNOWN < PROHIBITED`. A child layer that is *more* permissive than its parent is ignored, not honoured. This is what makes per-object rights safe to ingest from a third party: a wrong or hostile object-level value can only ever restrict us further.

## Consequences

- M3 is unblocked. Historical evidence can be discovered, stored and lawfully surfaced under a policy that is executable rather than aspirational.
- The defaults are conservative, so the first Polona objects will surface as metadata and citation only, with imagery appearing as rights are confirmed per object. That is the sequence canonical 12 line 827 already recommends.
- **This ADR does not assert what Polona's terms say.** It decides what Name Atlas does with whatever they say. The rights values themselves must still be read from each object at ingest, which §16.3 already requires as a retrieval stage.
- The 300-character cap and the `INTERNAL`-metadata exception are the two judgement calls here. Either can be changed by a superseding ADR without touching the evaluation's shape.
