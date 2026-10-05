# 2026-10-04 — the claimant's card page no longer sends a person's id to the statistics

Found by the legal review of the same day (`docs/progress/2026-10-04-legal-review.md`, "Found in passing" 2). The project owner asked for the fix.

## The defect

`apps/web/src/lib/analytics-path.ts` `redactTreePath` replaced only the fifth path segment (a tree's id) and the seventh (a person's id under `{tree}/osoba/{person}`). A claimant's own card (`tree-paths.ts`: `/pl/konto/drzewa/karta/{personId}`, `/en/account/trees/card/{personId}`) has the person's id in the sixth segment, so it reached the analytics unchanged. Since TASK-109 (#126), the same function also filters Google Analytics' addresses.

## What changed

- `redactTreePath` now replaces every UUID segment under the tree routes: the one right after the prefix is `[tree]`, and any later one is `[person]`. Paths without ids are unchanged.
- `analytics-path.test.ts`: the card route in both languages is redacted, and the cards list and the invitation page are left as they are.
- `STATUS.md`.

## Verification (run on 2026-10-04, real results)

- With the old `analytics-path.ts` restored (git stash), the new test failed: expected `/pl/konto/drzewa/karta/[person]`, received `/pl/konto/drzewa/karta/0199a1b2-0000-7000-8000-00000000ab03`. With the fix: 11 of 11 passed.
- `pnpm --filter web test`: 78 files, 830 tests passed. `typecheck`: exit 0. `pnpm lint`: exit 0. `pnpm check:ids`: passes.

## Not verified

- Not seen in a browser against the real analytics scripts. Not run in CI (GitHub Actions was not starting jobs on 2026-10-04). Accounts and the tree are off in production, so no such page has been served there.
