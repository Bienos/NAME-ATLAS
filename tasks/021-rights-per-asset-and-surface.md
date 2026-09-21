# TASK-021 — rights per asset kind and surface (D-003)

- **Status:** IMPLEMENTED 2026-09-21.
- **Milestone:** M3 prerequisite. Not historical discovery itself — the gate that makes it lawful.
- **Resolves:** `docs/DECISIONS_NEEDED.md` D-003, by ADR-0007.
- **Canonical basis:** `docs/canonical/12` §6.1 precedence, §6.2 dimensions, §6.3 decision matrix,
  §6.4 hard gates, §16.4 Polona object-level rights, §16.5 OCR preservation.

## 1. Goal

One object can be metadata-open and image-restricted at the same time. Today the codebase cannot
express that: `evaluateSurface` reads `metadata_rights` and returns a single decision per surface.
Make rights evaluation per **asset kind** — metadata, transcription, image — with the answers ADR-0007
gives to D-003's five questions encoded as code rather than intention.

## 2. In scope

1. **`AssetKind`** — `METADATA | TRANSCRIPTION | IMAGE`, evaluated independently (§16.4).
2. **`resolveEffectiveRights`** — §6.1's chain as a most-restrictive-wins fold over
   `ALLOWED < CONDITIONAL < UNKNOWN < PROHIBITED`. A child layer can only tighten.
3. **`classifyRightsState`** — the eight rows of §6.3's matrix, with a documented precedence for the
   cases where several rows apply at once.
4. **`evaluateAsset` / `evaluateRightsMatrix`** — the (asset × surface) decision, with
   `ALLOWED_WITH_ATTRIBUTION` and `LOCATOR_ONLY` as real outcomes alongside `ALLOWED`/`BLOCKED`.
5. **§6.4's three hard gates as named functions** — `connectorExecutable`, `paidSurfaceEligible`,
   `reproductionEligible`.
6. **Attribution** — `attributionFor`, and the rule that an undischargeable attribution obligation
   blocks rather than publishes.
7. **The OCR excerpt policy** — `excerptTranscription`, capped at `TRANSCRIPTION_EXCERPT_MAX_CHARS`.
8. **`loadEffectiveRights`** — reads source default and the record-level override
   (`source_records.rights_profile_id`, which has existed unused since migration 0003) and folds them
   by §6.1.
9. **The admin inspector shows the matrix**, because a rights decision nobody can see is a rights
   decision nobody can check.

## 3. Out of scope

- The Polona connector itself: no search, no retrieval, no IIIF, no network call.
- The `digital_assets` table. §6.1's asset layer is accepted as a parameter by
  `resolveEffectiveRights`, so the precedence is complete and testable now; the table lands with the
  connector that needs rows in it (`ARCHITECTURE.md` §10 invariant 10 — no storage without a writer).
- Any change to what PESEL surfaces. The metadata row must reproduce `evaluateSurface` exactly.
- Asserting what Polona's actual terms are. This task decides what we do with them.

## 4. Acceptance criteria

- **AC-1** `evaluateAsset(rights, "METADATA", s)` agrees with `evaluateSurface(rights, s)` for every
  surface and every rights posture the existing tests carry. PESEL's surfaces do not move.
- **AC-2** A metadata-open, image-restricted object yields metadata `ALLOWED` and image `BLOCKED` or
  `LOCATOR_ONLY` on the same surface — §6.3 row 3, §16.4's independence.
- **AC-3** `UNKNOWN` on an asset's own dimension stops it being reproduced or excerpted on
  `FREE`, `PAID` and `SEO`: transcription is `BLOCKED`, and an image degrades to `LOCATOR_ONLY`
  at best — never to a copied scan.
- **AC-4** A child rights layer that is more permissive than its parent is ignored; one that is more
  restrictive is applied (§6.1).
- **AC-5** `image_rights !== "ALLOWED"` makes `reproductionEligible` false, for every other value
  including `CONDITIONAL` (§6.4 verbatim).
- **AC-6** An excerpt is refused unless `transcription_rights === "ALLOWED"`, and is never longer than
  the cap; truncation is reported, never silent.
- **AC-7** `attribution_required` with no usable text blocks the asset.
- **AC-8** `classifyRightsState` returns each of §6.3's eight rows for a profile of that shape.
- **AC-9** `loadEffectiveRights` folds a record-level override over the source default, and returns
  the source default unchanged when there is no override.
- **AC-10** The inspector renders the matrix for a real surname against the live database.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:integration && pnpm build
```

and the inspector run in §4 AC-10 against `name_atlas_dev`.
