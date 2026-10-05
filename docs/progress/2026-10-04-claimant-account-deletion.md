# 2026-10-04 — deleting a claimant's account no longer fails

Found by the legal review of the same day (`docs/progress/2026-10-04-legal-review.md`, "Found in passing" 1). The project owner asked for the fix.

## The defect

`0033_family_invitations.ts` gave `family.persons.claimed_by_user_id` a foreign key to `accounts.users` with `ON DELETE SET NULL`, next to CHECK `persons_claim_pair` (claimant and `claimed_at` both set or both null) and `persons_hidden_only_when_claimed`. The foreign key's action nulls only the claimant, so the check rejected the row. As a result, `deleteAccount`'s `DELETE FROM accounts.users` (`packages/accounts/src/service.ts`) failed for anyone who had confirmed ("To ja") their card in someone else's tree. Their account could not be deleted.

## What changed

- `packages/db/migrations/0034_family_release_claims_on_account_deletion.ts`: a `BEFORE DELETE` trigger on `accounts.users`. For each of the user's claimed rows it does what `release_claim` does when a claimant leaves (ADR-0029 §2.6.22): it clears the claimant, `claimed_at` and the hidden fields; suppresses the address the claim came from in that tree; and writes a `CLAIM_RELEASED` audit event. The audit event's user id is null, because that account is gone. The function is `SECURITY DEFINER`, owned by the build role like `release_claim`, with `EXECUTE` revoked from `PUBLIC`. `down` drops the trigger and the function.
- `tests/integration/src/family-claims.test.ts`: a new test. A claimant hides their birth year, then their account is deleted with `deleteAccount`'s statement as the app role. The test asserts that the deletion succeeds; the row is unclaimed with no hidden fields and the owner reads it again; the owner's next invitation of that address is `SUPPRESSED`; and the release is one audit event with a null user. The `0033` down test now migrates to `0032_…`, because `0034` rolls back first.
- The migration lists in `packages/db/src/migrator.test.ts`, `tests/integration/src/extensions.test.ts` and `tests/integration/src/canonical-key-v2.test.ts` now include `0034`.
- `docs/CODEMAP.md`, `STATUS.md`.

## Verification (run on 2026-10-04, real results)

The integration tests ran against a local PostgreSQL 16.14 with PostGIS 3 (`TEST_DATABASE_URL`, `packages/testing`'s substitute path), because Docker is not available in this session. CI uses the pinned `postgis/postgis:16-3.4` container.

- Before the fix, `vitest run src/family-claims.test.ts` (tests/integration) failed the new test with `new row for relation "persons" violates check constraint "persons_claim_pair"`, reproducing the defect. The `0033` down test also failed: it found 2 claims instead of 1, because the claim survived the failed deletion.
- After the fix: `family-claims`, `extensions`, `canonical-key-v2`, `family` and `accounts`: 5 files, 70 tests passed. The whole integration suite: 37 files, 440 tests passed.
- `pnpm test` (all workspace packages): exit 0. `pnpm typecheck`: exit 0. `pnpm lint`: exit 0. `pnpm check:ids`: "every task, ADR, migration and decision number is used once".

## Not verified

- The migration has not been applied to the VM's database; it reaches production with the next migration run there. Accounts and the tree are off in production, so no account is affected today.
- Not run in the pinned CI container (GitHub Actions was not starting jobs on 2026-10-04).
