# 2026-10-01 — ADR-0028: what may be shown, and D-025 on the owner's new tiers

Branch `claude/what-may-be-shown`, built on `main` @ `fd6a871` (#64). No task file: a decision record, written at the project owner's request ("do it best way but show all").

## Changed

- **`docs/adr/0028-what-may-be-shown.md`** (new). One rule per kind of data — published statistics, Polona, archive registers, person-level records, famous bearers, readers' trees, partners' data, surname comparisons, sensitive context — and a table of what each surface may show. It settles ADR-0025 §2.7's open question on living famous bearers (§2.5) and fixes that no public page names a person from a register (§2.3) and that no price unlocks a living person's record (§2.10). The archive periods it cites (births 100 years, marriages and deaths 80) are from Prawo o aktach stanu cywilnego, art. 28, as summarised by prawo.pl; the act's text was not read in this session.
- **`docs/DECISIONS_NEEDED.md`**: D-025, the four tiers the owner named in a chat on 2026-10-01 evening (28,99, 89,99, 199, 800 zł) against ADR-0026's, with the four points to confirm before an ADR supersedes ADR-0026.
- **`STATUS.md`**: "Last rewritten", the "More cards" line (the Wikidata precondition is now ADR-0028 §2.5; the archive-register index added), and the open decisions (D-025).

## Verified

- `bash scripts/check-unique-ids.sh` (what `pnpm check:ids` runs) — exit 0: "every task, ADR, migration and decision number is used once".
- Formatting: every changed file is Markdown, which `.prettierignore` excludes (`*.md`), so `pnpm format:check` does not cover it. Not run: the session could not install Prettier (the npm registry answered 403).

## Not verified

- No code changed, so no build or test suite was run for behaviour.
- ADR-0028 is not a lawyer's review. ADR-0023 §2.5's legal gate before selling still holds.
