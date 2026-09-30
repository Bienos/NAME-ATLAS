# 2026-09-30 — TASK-045: the fifteen earlier PESEL editions loaded into production's database on the VM

Scope authority: `tasks/045-pesel-editions-on-the-vm.md` (AC-3, AC-4). Follows `docs/progress/2026-09-30-pesel-editions-on-the-vm.md` (the build and the local rehearsal). The project owner ran `ops/vm/editions.sh` from their own computer over SSH: GitHub Actions still starts no job (a `Register VM` dispatch of the `editions` step at 20:37 UTC failed in 5 s, run 36773910954, no runner), and the session has no route to the VM. The branch was downloaded from GitHub in a browser, copied with `scp` to `~/name-atlas-ops/branch.tar.gz`, repacked on the VM (`tar -czf app.tar.gz -C src .`) and passed to `editions.sh` as its archive, which is what the workflow step does. The session read the output the owner pasted.

## Verified (from the pasted output)

| Step | Result |
|---|---|
| before | 598,476 surnames; `ACTIVE` claims `CURRENT_POPULATION` 828,262, `CURRENT_RANK` 828,262, `RARITY_CONTEXT` 828,262, `CURRENT_DISTRIBUTION` 395,216, `SURNAME_MEANING` 25 |
| unpack and `pnpm install --frozen-lockfile` | "Done in 1.1s using pnpm v10.33.0" (the tree's `node_modules` was already there) |
| fetch | fifteen files downloaded, each "saved and verified" against the registry's SHA-256; the 2019 women's file from its media URL, the others from the CSV endpoints |
| metadata | fifteen objects fetched, each checked to be its own |
| import | fifteen `IMPORTED`, every one with `rows quarantined 0` and **`surnames created 0`** |
| gate | all `ok`: one `ACTIVE` source record per edition; every edition's values between 1 and its row count; **surnames unchanged = 598476**; **`ACTIVE` claims unchanged** (the five counts above, identical); no surname with more than two `ACTIVE` claims of one type |
| after | database 17 GB; `nameatlas_web` cannot read 0 tables; `VACUUM ANALYZE` ran; dump `/var/lib/name-atlas/backup/name_atlas-register-2026-01-20-editions.dump`, 1.7 GB; "done: every edition is loaded; the pages read the current resources only" |

Rows per resource, each line's read = not written + imported (checked here by arithmetic):

| Resource | Read | Not written | Written |
|---|---:|---:|---:|
| 18990 men 2019-06-30 | 277,108 | 7,226 | 269,882 |
| 18989 women 2019-06-30 | 297,456 | 12,467 | 284,989 |
| 22817 men 2020-01-22 | 283,221 | 2,946 | 280,275 |
| 22815 women 2020-01-22 | 299,612 | 6,620 | 292,992 |
| 28052 men 2021-02-01 | 298,692 | 2,599 | 296,093 |
| 35279 women 2021-02-02 | 311,240 | 5,835 | 305,405 |
| 36401 men 2022-01-27 | 322,232 | 2,211 | 320,021 |
| 44647 men 2023-01-30 | 363,360 | 2,348 | 361,012 |
| 44646 women 2023-01-30 | 389,365 | 5,105 | 384,260 |
| 54097 men 2024-01-19 | 379,712 | 1,666 | 378,046 |
| 54098 women 2024-01-19 | 400,764 | 3,461 | 397,303 |
| 63892 men 2025-01-22 | 395,127 | 820 | 394,307 |
| 63888 women 2025-01-22 | 411,012 | 1,737 | 409,275 |
| 65049 regional men 2025-02-24 | 646,100 | 222 | 645,878 |
| 65090 regional women 2025-02-24 | 694,199 | 472 | 693,727 |
| **Total** | **5,769,200** | **55,735** | **5,713,465** |

National lists: 4,428,901 read, 55,041 not written, 4,373,860 written. Regional: 1,340,299 read, 694 not written, 1,339,605 written. The regional importer writes one snapshot per surname (187,302 and 205,267) and one value per cell.

Mixed-script rows imported and flagged: HODŽIЌ and ЌATOVIЌ in every women's national edition from 2019 to 2025 (2019, 2020, 2021, 2023, 2024, 2025), ЌATOVIЌ in the 2025 regional women's. They are the two surnames already in the register without figures; their older rows are stored, and no claim is derived from them.

### The placeholder warning in STATUS, checked against the loaded bytes

The previous STATUS and `docs/sources/pesel-earlier-editions.md` (recovered from `claude/peaceful-planck-u659j1`) warned that the older files hold placeholder surnames and a spreadsheet artifact. The files fetched for this run, searched here on 2026-09-30 (the copies fetched by the rehearsal, which the VM's checksum-verified files equal):

| Finding | Where |
|---|---|
| `BRAK NAZWISKA` and `BRAK DANYCH` ("no surname", "no data"): two lines in each of the 2019 men's and women's, the 2020 men's and women's and the 2022 men's files, one in the 2025 women's; none in 2021, 2023, 2024 or the regional files. Counts between 117 and 2,427 | searched with `grep` over the downloaded CSVs |
| `True` where the surname `PRAWDA` belongs: one row in each of the 2020 men's (291) and women's (285), 2021 men's (284) and women's (284) and 2022 men's (282) files. `PRAWDA` itself is text in 2019 and 2023–2025 and in the regional files | the recovered record read the native XLSX: its cell is a spreadsheet boolean, TRUE, which the CSV export writes as `True` |
| none of the strings is a surname of the current register: the live API answers `UNRESOLVED` for `BRAK DANYCH`, `BRAK NAZWISKA` and `TRUE`, and `RESOLVED` with a population for `PRAWDA` | `GET /api/v1/surname-results?surname=…` on production |

So the importer's rule, that an edition creates no surname entity, dropped every such row into "rows not written", and the gate's "surnames unchanged = 598476" confirms nothing was created. The cost is one gap, recorded for the feature that reads the editions: **`PRAWDA` has no 2020, 2021 or 2022 data point in the database**, because the files call it `True`. A reader of these editions must never map `True` to `PRAWDA` on the strength of a similar count; that decision is the trend task's, with the publisher's confirmation. The placeholders are not surnames, and the landing's list-scope figures (TASK-044), which read whole files, are unaffected by this run.

### The live site after the run

`curl https://name-atlas-two.vercel.app` after the output arrived: ADAMCZYK (`/pl/nazwisko/adamczyk`): 200 in 2.6 s, "około 1 na 945" and "1 na 928", men's count 22,435, "Zweryfikowane"; NOWAK: 200, "1 na 215" and "1 na 216"; BARAN (`/en/surname/baran`): 200, "about 1 in 1,013" and "1,067", 20,918 people. All equal the values recorded before the run (`docs/progress/2026-09-30-register-finalized-and-cutover.md`). The API answers `population READY`, `rarity READY` and, for ADAMCZYK and NOWAK, `meaning AVAILABLE`.

## Not verified

- **The pages after the load, beyond three surnames.** The gate proves the claim counts unchanged, and the loaders exclude editions by construction (`isPeselEdition`); no full crawl was made.
- **The gate's check per edition is a range** (1 to the file's rows), not an exact count; the exact figures are the importer's own report above, read by the session, not by the gate.
- **The restore of any of the three dumps**, and a copy off the VM (unchanged).
- **The workflow's `editions` step.** The same script ran, but by hand: the workflow's archive step (`git archive HEAD`, then the VM-side extraction) did not run. Actions is down.
- The workflow's `push` trigger names `claude/eager-brown-s2u6qh`, which the owner deleted on 2026-09-30. A push can no longer start it; `workflow_dispatch` still can.
