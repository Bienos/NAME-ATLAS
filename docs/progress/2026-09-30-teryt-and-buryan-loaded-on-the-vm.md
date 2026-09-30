# 2026-09-30 — TERYT and Buryan 1933 loaded into production's database on the VM

Scope authority: the project owner's instruction in this session ("run extras.sh for teryt and buryan now"), and `tasks/041-teryt-and-buryan-on-the-vm.md` on branch `claude/awesome-darwin-af7l50`, which wrote and rehearsed the script (`docs/progress/2026-09-30-teryt-and-buryan-on-the-vm.md` on that branch). That branch is not merged and has no pull request; its number 041 is free on `main` (#34's TASK-041 was closed without merging and `main` has no `tasks/041-*`). Follows `docs/progress/2026-09-30-register-finalized-and-cutover.md`.

## What was run

`ops/vm/extras.sh` as it is on `claude/awesome-darwin-af7l50` (188 lines, SHA-256 `4961e349704a0619fffe82c3585635fc0c5f12294e4e78c733646c6cdbe545b0`), copied by the owner to `~/name-atlas-ops/extras.sh` on the VM through an `ssh … 'cat > …'` heredoc and run as `sudo env LC_ALL=C.UTF-8 bash ~/name-atlas-ops/extras.sh`, because GitHub Actions still starts no job. Nothing in this repository changed for it: the VM's app tree (`bf3d359`) already held `fixtures/teryt/source-manifest.json`, `sources/onomastics/buryan-1933.json` (25 entries), `seed:sources`, `import:teryt`, `import-onomastics` and `packages/truth/bin/surname-meaning.ts`, and `shellcheck` 0.11.0 and `bash -n` passed on the script here.

## Verified (this session, on production, after the owner reported the run done)

| Check | Result |
|---|---|
| `GET /api/v1/surname-results?surname=ADAMCZYK` | `meaning.state = AVAILABLE`, `surface.decision = ALLOWED`, `reason_code = RIGHTS_PERMIT_FREE_SURFACE` |
| the same for JANKOWSKI, KUBIAK, NOWAK | `AVAILABLE`, `ALLOWED`, one interpretation each; NOWAK's `formation_type` OCCUPATIONAL, the others OTHER; glosses in Buryan's 1933 orthography ("Z imienia Jan wywodzą się nazwiska …", "Bardzo wżył się w naród polski Jakób-Kuba …") |
| `https://name-atlas-two.vercel.app/pl/nazwisko/adamczyk` | 200 in 0.74 s. Chapter 04 "Co oznacza to nazwisko?" now reads "Z imienia Adam powstał: […] Adamczyk", marked "Możliwe", "Opracowanie naukowe Polska · ks. Józef Buryan · 1933", root "Adam", type "inne", and the foot of the page cites the work. A fetch a few minutes earlier, before the derivation had finished, still showed "Nie mamy udokumentowanego znaczenia tego nazwiska". |

So the Buryan import, the `SURNAME_MEANING` derivation and the web role's read access on the new tables all happened, and the rights gate publishes the work (its `licence_basis` is `PUBLIC_DOMAIN`).

## Not verified

- **The run's own output.** The owner reported "done" and the session did not see it: not the checksum of the copied script, not the TERC and SIMC member names and hashes against the manifest, not `seed-sources`' and `import:teryt`'s counts, not how many of the 25 Buryan surnames resolved, not the gate's lines (TERC ids 2,875, SIMC ids 101,865, TERYT source records 106,227, `PESEL as finalize left it`), not the database size, not the second dump (`name_atlas-register-2026-01-20-teryt-buryan.dump`). Nothing on the site reads TERYT below the voivodeship level yet, so the TERYT import is inferred only from the script's order: the Buryan step comes after it and after its own `set -e`, and the Buryan step happened. The next `Register VM` `status` run, or the owner pasting the output, settles it.
- TASK-041's AC-3 and AC-4 on that branch therefore stand as reported, not observed, and that branch's task file and STATUS lines were not updated here.
- A `finalize.sh` re-run now fails its "source records = 4" check by design (TERYT adds 106,227); the script's header says so.
