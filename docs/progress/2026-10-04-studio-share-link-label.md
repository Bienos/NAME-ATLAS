# 2026-10-04 — The share studio's page-link button says "Udostępnij link"

Branch `claude/tender-curie-ybiyaj`, on `origin/main` @ `f4fcb8f`. A follow-up to TASK-093, asked for by the owner ("Do what you can") after the report on #101 named it as an open wording question.

## Changed

- Under "Co dalej", the studio's button that shares the surname page's link was labelled "Udostępnij". The card's own share button above it has the same label. The page-link button now reads "Udostępnij link" / "Share the link".
- `share-button.tsx`: `ShareButton` takes an optional `label`. Everywhere else it is unchanged and still reads "Udostępnij" / "Share".
- `messages.ts`: the new string `studioShareLink`. `share-studio.tsx` passes it.
- `share-studio.test.ts`: the studio renders the new label.

## Verified

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build`: all exit 0.

## Not verified

- Not checked in a browser. The change is one label, and the unit test renders it.
