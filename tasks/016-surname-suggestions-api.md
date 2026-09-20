# TASK-016 — surname suggestions on the read API (schema 1.3)

- **Status:** IMPLEMENTED 2026-09-20. All eight acceptance criteria met; see `PROGRESS.md`. No open
  decisions: everything it needed was settled by TASK-015 and by the existing contract's own
  precedents.
- **Created:** 2026-09-20, after TASK-015 built the retrieval it exposes.
- **Milestone:** M2. With this, only the consumer UI remains.
- **Depends on:** TASK-015 (`suggestSurnames`, the length policy, `SearchCandidate`), TASK-006 (the
  endpoint, the response contract and the query service).
- **Canonical basis:** `docs/canonical/16` §21 (the public identity object), §23 (`SectionState`),
  §35 (no internal probability crosses the boundary), §79 (expected misses are successful
  responses); `docs/canonical/13` §31 (outcome, match type and decision mode), §32.2 (do not
  silently replace input), §32.4, §32.5, §33.4 (never auto-resolve).

## 1. Goal

When a surname does not resolve, the API answers with the candidates the resolver found, marked as
suggestions a human confirms. Today it answers `UNRESOLVED` and stops, so the retrieval TASK-015
built is unreachable from outside the repository.

## 2. Three design questions, and how the existing contract settles them

**Does the top-level `status` gain `SUGGESTION_REQUIRED`?** No. `docs/canonical/13` §32.2 names that
outcome for a typo and §32.5 keeps `UNRESOLVED` "with spelling suggestion if any" for an unknown
surname. Telling those apart means asserting that an input *is* a typo, and TASK-015 measured
first-place accuracy at roughly four in five — not enough to make that claim at the top level. So
`status` stays `RESOLVED | UNRESOLVED | AMBIGUOUS`, and the distinction §32.2 draws is carried
**inside** the section, where the resolver actually computes it: `SUGGESTION_REQUIRED` for one
candidate, `MULTIPLE_CANDIDATES` for several.

**Does the section carry a rights decision?** No, and this follows the contract's own precedent
rather than a new judgement. A suggestion is a canonical surname string and its id — identity, not a
fact. The existing response already returns the `surname` identity object with **no** `surface`
decision, and gates only `population`, `rarity` and `distribution`, which carry counts. Identity has
never been gated here, so gating it now for suggestions would be the inconsistency. Record the
reasoning in `docs/contracts/surname-result.md` so the next reader does not have to re-derive it.

**What crosses the boundary from a `SearchCandidate`?** The identity, the match type, the decision
mode and the explanation codes. **Not** `trigram_similarity`, `edit_distance` or
`retrieval_rank_score`: `docs/canonical/16` §35 keeps internal scores off the wire, and
`docs/canonical/13` §24 is explicit that these are diagnostic features and "not historical
confidence". A client that needs to explain a suggestion uses the codes, which localise; a number
would invite a UI to render "91% match", which is exactly the claim the project does not make.

## 3. In scope

1. **Contract schema `1.3`** — a `suggestions` section on the surname result, required and nullable,
   **present exactly when `status` is not `RESOLVED`**. A resolved query needs none (an exact
   surname wins, §32.3). Both other outcomes mean "we did not give you a surname", and there a
   client needs to know whether anything is on offer and, if not, why; `AMBIGUOUS` therefore always
   carries `UNAVAILABLE` with the reason (`MULTIPLE_EXACT_MATCHES` or `MIXED_SCRIPT_REVIEW`), which
   is the only place the mixed-script signal can travel.
2. **`suggestionSchema`** — `{ surname: PublicSurnameIdentity, match_type: "FUZZY_CANDIDATE",
   explanation_codes: string[] }`. Nothing else.
3. **`suggestionsSectionSchema`** — `{ state, outcome, decision_mode, reason_code, suggestions[] }`
   with refinements that make the rules unbreakable rather than conventional:
   - `suggestions` non-empty exactly when `state` is `READY`;
   - `outcome` is `SUGGESTION_REQUIRED` with exactly one suggestion and `MULTIPLE_CANDIDATES` with
     more, and is null when `state` is not `READY`;
   - `decision_mode` is `USER_CONFIRM` whenever suggestions are present, and never `AUTO`.
4. **`querySurnameResult` wiring.** Suggestions are requested only when the resolver returned
   `UNKNOWN`. Specifically **not** for `REVIEW_REQUIRED`: `docs/canonical/13` §33.4 names
   mixed-script identity as a case never to auto-resolve, and offering Latin neighbours for an input
   carrying a Cyrillic lookalike would be worse than offering nothing. That path returns
   `state: UNAVAILABLE`, `reason_code: MIXED_SCRIPT_REVIEW`.
5. **Reason codes** when `state` is `UNAVAILABLE`: `INPUT_TOO_SHORT`, `NO_CANDIDATE_ABOVE_THRESHOLD`,
   `MIXED_SCRIPT_REVIEW`, `SUGGESTIONS_UNAVAILABLE` (retrieval failed). A retrieval failure must
   **not** fail the whole request: the population section of a resolved surname does not depend on
   it, and an unresolved query with a broken index is still a valid `UNRESOLVED` answer.
6. Tests, `docs/contracts/surname-result.md`, `PROGRESS.md`, `docs/CODEMAP.md`.

## 4. Out of scope

- A new endpoint. `docs/canonical/16` §7 lists `POST /api/v1/surname-searches`; this task adds a
  section to the resource that already exists, and the contract already records that this endpoint
  folds into the profile resource later. A second path for the same question is not worth a
  version.
- Autocomplete, prefix search, paging, ranking parameters, or a threshold query parameter. The
  threshold is measured and versioned; letting a caller set it would let a caller manufacture noise.
- Confirming a suggestion. Accepting one is a second request for the surname it names, which already
  works; a confirmation resource with server-side state belongs to whichever task needs it.
- Any change to what resolves. Nothing here can make a fuzzy candidate into a resolution.
- The UI.

## 5. Acceptance criteria

- **AC-1** A resolved surname is byte-for-byte what it is today except for the added `suggestions:
  null`, and its `population`, `rarity` and `distribution` sections are unchanged.
- **AC-2** An unresolved input with near neighbours returns `200`, `status: UNRESOLVED`,
  `suggestions.state: READY`, and the candidates in reranked order.
- **AC-3** One candidate gives `outcome: SUGGESTION_REQUIRED`; more than one gives
  `MULTIPLE_CANDIDATES`. Both give `decision_mode: USER_CONFIRM`; neither ever gives `AUTO`.
- **AC-4** A short input returns `state: UNAVAILABLE`, `reason_code: INPUT_TOO_SHORT`, and an empty
  list — never a nearest-neighbour walk.
- **AC-5** A mixed-script input returns `AMBIGUOUS`, as today, with `state: UNAVAILABLE`,
  `reason_code: MIXED_SCRIPT_REVIEW` and no suggestions at all.
- **AC-6** No payload field carries a similarity, a distance, a score, a percentage or anything
  named `confidence`. Asserted by walking the serialized response, not by inspection.
- **AC-7** The response validates against schema `1.3`, and `suggestions` is present exactly when
  `status` is not `RESOLVED`.
- **AC-8** A retrieval failure degrades to `state: UNAVAILABLE` with `reason_code:
  SUGGESTIONS_UNAVAILABLE` and a `200`, never a `500`.

## 6. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
TEST_DATABASE_URL=… pnpm test:integration
pnpm build
```

## 7. Do not

- Do not put a similarity, a score or a percentage in the payload under any name.
- Do not add `SUGGESTION_REQUIRED` to the top-level `status` enum.
- Do not suggest anything for a mixed-script input.
- Do not let a retrieval failure turn a valid answer into an error.
- Do not make any suggestion auto-applicable, and do not reorder candidates by how common a surname
  is (`docs/canonical/13` §32.4).
