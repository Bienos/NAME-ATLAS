# 2026-10-09 — Plate 01 matches the rank claims by their source record (TASK-178 follow-up)

**Changed.** After #218 reached production (`1efdb0a`, deployment `dpl_AyRbfhqDCXxsUNbd9FMULAzLPuWv`, READY at 14:59 UTC), `/pl/atlas` served every plate but plate 01 showed its fallback ("Lista dziesięciu najczęstszych nie jest dziś dostępna; trzy pierwsze pochodzą z artefaktu."). The production rank claims exist (the NOWAK page lists its neighbours from them) and carry the registry's groups, `pesel_2026_national_male` and `pesel_2026_national_female`; `commonFor` in `list-atlas.tsx` matched a list to its side by the artefact's partition names, `national_male` and `national_female`, which only the fixtures used. No list ever matched, so the plate fell back on every request; nothing was logged because the loader had not failed.

- `packages/truth/src/common.ts`: `mostCommonSurnames` also returns each list's `external_record_id`, read from the claim's `universe` (the dane.gov.pl resource id `rank.ts` writes there), beside the group and the snapshot date.
- `apps/web/src/lib/common-surnames.tsx`, `common-surnames-load.ts`: `CommonList` carries it through.
- `apps/web/src/lib/list-atlas.tsx`: `commonFor` takes the artefact's list and returns the rank list whose `external_record_id` is that list's `source.external_record_id`, so the ranks and the counts beside them are of one register list; the group's name is no longer read.
- Tests: `atlas-page.test.ts` renders the rank lists with the registry's groups and record ids, and a new case shows that a list over another resource is not used whatever its group is called, and that the record id matches whatever the group is called; `common-surnames.test.ts` and `tests/integration/src/common-surnames.test.ts` carry the field (the integration test's inserted claims now write `universe.external_record_id` and expect it back).

**Verified.**

- `pnpm typecheck`: no errors. `pnpm lint`: no errors, no warnings. `pnpm format:check`: `All matched files use Prettier code style!`
- `pnpm --filter web test`: 117 files, 1366 tests passed (one new). `pnpm --filter @name-atlas/truth test`: 39 files, 449 tests passed.
- `pnpm build`: exit 0 (`/pl/atlas` and `/en/atlas` built as dynamic routes).

**Not verified.** `pnpm test:integration` (Testcontainers; no Docker daemon in this session), so the updated integration test did not run here; plate 01 with real rank claims before the deployment (the fixtures' database derives no rank claims). The production check after the deployment is recorded as a comment on the pull request.
