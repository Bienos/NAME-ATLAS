# 2026-10-01 — ADR-0029 (proposed): the family tree's storage, access and use

Branch `claude/sweet-feynman-wisze8`, built on `main` @ `fd6a871` (#64). No task file: a decision session. The owner chose the tree's design from two rounds of mockups and asked how the tree should be managed, stored and used.

## What changed

- **`docs/adr/0029-family-tree-storage.md`** (new, Proposed): schema `family` in the production database, read and written by `nameatlas_app` only (ADR-0027's role), no foreign key into the register, birthplaces as TERYT identifier strings; five tables (`trees`, `persons`, `parentage`, `members`, `audit_events`); relationships as rows with a role rather than father and mother columns; `living_status` with the canonical rule that unknown is treated as living; provenance as *wpisane przez Ciebie* plus a typed `source_note`, documents deferred; the session check then row-level security keyed on `app.user_id` set with `SET LOCAL`; sharing per tree with living people hidden from members by default; audit events for the operations that change who sees what; cascade on account deletion; JSON export; one contract object `tree` from which the browser derives every view and the dashboard's next question; connecting trees deferred with its three rules fixed (deceased only, proposal not merge, a link not a merge). **Amended the same day** at the owner's request ("someone said you are in his tree … you have to confirm … we could use KYC"): §2.6, claimed people. A living person is invited by one email at the owner's request, sees only their own row, and answers *To ja* / *To nie ja* / *Nie chcę kontaktu*; a claim makes the row theirs to correct and hide; a claimed person is the only bridge between two trees for the living; identity verification (mObywatel, mojeID, a commercial provider; D-030) unlocks a search for oneself across trees and settles disputes, and is never required to sign up; the owner then said verification is included in the 29,99 zł tier (recorded in §2.6.25 and D-030). Four screens and the owner's page were added to the design canvas.
- **`docs/DECISIONS_NEEDED.md`** gains D-027 (documents: when and where), D-028 (retention of a quiet account's tree), D-029 (dark or free before checkout exists), D-030 (the verification provider and its phase) and D-031 (what an owner keeps of a relative who objects). Numbers checked against `main` and the open pull requests (#65 takes ADR-0028 and D-025).
- `STATUS.md`: the "Last rewritten" line and the Next bullet on the tree.

The mockups themselves are a private design canvas outside the repository (the session's Artifact), as the redesign mockups of 2026-09-30 and 2026-10-01 were.

## Verification

Run on 2026-10-01 after the last edit:

- `pnpm check:ids` — exit 0: "every task, ADR, migration and decision number is used once".
- `pnpm format:check` — exit 0 after `pnpm install --frozen-lockfile` (Markdown is in `.prettierignore`, so it checks nothing this change touched).

## Not verified

- Nothing runs: the ADR proposes a schema and no migration, package, contract or page exists. Row-level security through PgBouncer's transaction mode with `SET LOCAL` is stated from PostgreSQL's documented behaviour and not yet proven by an integration test; the task that builds the schema proves it.
