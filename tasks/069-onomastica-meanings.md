# TASK-069 — *Onomastica* back as a meaning source: the first article's etymologies

- **Status:** IMPLEMENTED 2026-09-30, locally verified against the full 2026-01-20 national register. Not loaded on the VM: that needs one `extras` run (§6).
- **Requested by:** the project owner, 2026-09-30: "bring back onomastica if not here find it and use that source".
- **Milestone:** none in `PLAN.md`. It serves `PRODUCT.md` §5's free scope: "basic origin/meaning where evidence supports it".
- **Depends on:** TASK-022 (the meaning chain, ADR-0008), TASK-032 (the *Onomastica* record, `docs/sources/onomastica.md`) and TASK-041 (`ops/vm/extras.sh`).
- **Decision:** D-022, answered again by the project owner on 2026-09-30 with option (b). This task records it.

## 1. Goal

Surnames that *Onomastica* gives an etymology for show it on their page as a `SURNAME_MEANING` claim, attributed to the article, its page and its licence, through the chain Buryan 1933 already uses. No code path changes.

## 2. Facts that shape the work (checked 2026-09-30)

1. **The journal was dropped, not lost.** D-022 was answered "Drop Onomastica" on 2026-09-29. TASK-032's record, inventory and checksums are all on `main`, and `onomastica.ijppan.pl` answered (OAI `Identify`, HTTP 200).
2. **The licence.** The OJS copies of vols 64–69 print CC BY-ND 4.0 International on page 1. Other pages of the journal's site contradict it (`docs/sources/onomastica.md` §8). The owner now relies on the printed licence.
3. **Which article.** Of the vol. 64–69 titles about surnames, J. B. Walkowiak, "Współczesne nazwiska Polaków o możliwej genezie litewskiej nieobecne w LPŽ…", *Onomastica* LXIV (2020), s. 211–228, DOI `10.17651/ONOMAST.64.16`, is a list of contemporary Polish surnames, each with the author's etymology in parentheses. The PDF fetched on 2026-09-30 has SHA-256 `b9b6fefc…945897`, the same bytes TASK-032 recorded.
4. **The importer already fits.** `importOnomasticSource` takes one work per file with an `OPEN_LICENCE` basis. It writes `source_type = DICTIONARY`, `granularity = SURNAME` and `geographic_scope = {PL}` for every work (`docs/sources/onomastica.md` §11). That is accepted here and not changed.
5. **NoDerivatives.** A verbatim excerpt is a reproduction in part, which the licence grants. A paraphrase or a root form chosen by this project would not be clearly so.

## 3. In scope

- `docs/DECISIONS_NEEDED.md` D-022, `docs/sources/onomastica.md`'s header, `docs/CODEMAP.md`: the decision recorded.
- `datasets/onomastics/onomastica-64-16-walkowiak.json`: one entry per headword surname in either 2026-01-20 national list. `literal_gloss` is the author's parenthetical, verbatim. `locator` is the printed page. `root_form` and `root_language` are null and `formation_type` is `UNKNOWN`. Entries are left out where the headword has no parenthetical, the author calls the etymology unclear, the PDF's text layer garbles the accent marks, or the surname is not in the register; the file's `_note` names every one.
- `ops/vm/extras.sh` (and its README row and workflow comment): import every file in `sources/onomastics/` and `datasets/onomastics/`, derive each listed surname once, and gate on all of them.
- `packages/sources/src/onomastics.test.ts`: every committed real file parses as admissible, is not synthetic, lists each surname once, and has a distinct `source_key`.

## 4. Out of scope

- Other *Onomastica* articles (Kurdyła, vol. 66; Radwanowice, vol. 67), vols 56–63, and the journals.pan.pl copies.
- The entries left out for garbled text. Checking them against the page images would admit them.
- Any importer, contract, page or ADR change.
- Running `extras` on the VM.

## 5. Acceptance criteria

- **AC-1.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `shellcheck ops/vm/extras.sh` pass.
- **AC-2.** Locally, with both full 2026-01-20 national lists imported, `import-onomastics` imports the file, and `demo:surname-meaning` gives every listed surname a meaning with one interpretation, `POSSIBLE`, citing the article and its page.

## 6. After merge

One `Register VM` run of `extras` on `main` (or `sudo bash ops/vm/extras.sh` over SSH while Actions starts no job) loads the file into production. Its gate expects 172 listed surnames with a meaning: Buryan's 25 and this file's 147.
