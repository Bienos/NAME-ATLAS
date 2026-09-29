# 2026-09-29 — ADR-0014: Polona metadata may be cited; a Polona attribution names author and work

**Scope:** recording two decisions the project owner made on 2026-09-29, answering D-021 items 2 and 3 raised by TASK-031. Branch `claude/procent-continuation-7c2e00`, restarted from `main` @ `87f43dc` after #14 and #16 merged.

## Changed

- **`docs/adr/0014-polona-metadata-and-attribution.md` (new).** It amends ADR-0007 in two places.
  - **§1.** An `UNKNOWN` permission is refused on public surfaces for **transcription and image**. Metadata follows ADR-0007 §4's metadata row, which refuses only `PROHIBITED`. The owner's answer: "Keep §4: citations allowed".
  - **§2.** A Polona object's `attribution_text` is composed per object by the connector: the creator when Polona names one, the title, then "Polona, Biblioteka Narodowa", with values as served. ADR-0007 §5 displays it verbatim. The owner's answer: "Author + title + source".
- **ADR-0007 header.** An "Amended by: ADR-0014" line.
- **D-021.** Items 2 and 3 are marked resolved by ADR-0014. Items 1 (automated access and caching) and 4 (the source default) stay open; for item 1 the owner chose "Decide later". The heading and status say so.
- **`packages/truth/src/polona-rights.test.ts`.** Comments only: they cited D-021's open misfits and now cite ADR-0014. One test was renamed to say what it asserts: "derives the library and the licence while no attribution text is stored". No assertion changed.
- **`docs/sources/polona.md` §12** and its at-a-glance row: a dated pointer to ADR-0014. The spike's record is otherwise unchanged.
- **`docs/CODEMAP.md`.** The ADR list gains `0012` and `0014`. It drops the stale note that `0012` was claimed by pull request #7, which merged earlier the same day.
- **`STATUS.md`.** The last-rewritten line, the CI line, the connector task now blocked on D-021 items 1 and 4, and the decisions line. The delete list gains the two merged branches. `claude/task-031-polona-spike` is listed because this session's git proxy refused to delete it (HTTP 403).

No code other than test comments changed. `rights.ts` already behaved as ADR-0014 §1 states, and `polona-rights.test.ts` pinned that behaviour before this change.

## Verified

Every command run from the repository root on the branch's working tree:

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm check:ids` | "every task, ADR, migration and decision number is used once" (ADR-0014 is free on `main`; open pull requests #13 and #15 add no ADR) |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | "All matched files use Prettier code style!" |
| `pnpm test` | exit 0, 1,060 passed, the same count as `main` @ `87f43dc`. `packages/truth/src/polona-rights.test.ts`: 8 passed. `packages/sources/src/polona/rights.test.ts`, which holds `docs/sources/polona.md`'s mapping table equal to the code: 6 passed. |
| `pnpm build` | exit 0; no line containing "warn" |

## Not verified

- **ADR-0014 §2 in code.** The composition is the Polona connector task's to implement. That task is not written, because D-021 items 1 and 4 block it.
- **`pnpm test:integration` and `pnpm test:golden`** were not run locally. No code they exercise changed; CI runs both.
