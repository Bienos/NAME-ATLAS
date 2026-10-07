# 2026-10-07 — TASK-168: the footer's social links lead to the owner's accounts

## What changed

- `apps/web/src/lib/site-links.ts`: new `SOCIAL_LINKS` (Instagram `https://www.instagram.com/nameatlas_/`, TikTok `https://www.tiktok.com/@nameatlas_`, Facebook `https://www.facebook.com/profile.php?id=61595400800918`, as the owner gave them); `followLinks` returns Blog then these. YouTube, which led to the home page as a placeholder, removed.
- `apps/web/src/lib/site-footer.tsx`: the social links open in a new tab, `rel="me noopener noreferrer"`.
- `apps/web/src/lib/structured-data.ts`: the landing page's `Organization` carries the three addresses as `sameAs`.
- Tests: `blog.test.ts`, `offer-page.test.ts`, `contact-page.test.ts`, `structured-data.test.ts` updated to the new links.
- `tasks/168-social-links.md`; `STATUS.md`.

## Verification (run in this session, on `ecfd4a8` plus this change)

GitHub Actions starts no job (every `CI` run since at least #200, `main` included, fails in seconds with no log), so every step of `ci.yml` was run locally:

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm check:vm`, `python3 scripts/test-backup.py`: exit 0.
- `pnpm test`: every package passed; `apps/web` 109 files, 1233 tests.
- `pnpm db:migrate` against `postgis/postgis:16-3.4`: exit 0; `pnpm db:generate-types` left `packages/db/src/generated` unchanged.
- `pnpm test:integration`: 50 files, 546 tests passed. `pnpm test:golden`: 4 files, 364 tests passed.
- `pnpm build`: exit 0. `pnpm e2e:seed`: exit 0. `pnpm test:e2e`: 10 passed.

## Not verified

- That the three addresses resolve to the owner's accounts (not fetched from this session).
- The footer in a browser, on staging or in production.
