# 2026-09-30 — TASK-041: TERYT and Buryan 1933 for the VM are scripted and rehearsed; the VM run waits on TASK-040's finalize

Scope authority: `tasks/041-teryt-and-buryan-on-the-vm.md`. Base branch: `claude/eager-brown-s2u6qh` (TASK-040), as the task says, because `ops/vm/` exists only there. This session's branch `claude/awesome-darwin-af7l50` had no commits of its own. It sat on the stale default branch's `d6f1b6c`, 160 commits behind `main`, and was moved onto TASK-040's head `154a612`.

## Changed

- `tasks/041-teryt-and-buryan-on-the-vm.md`: the task. Its §2 lists every source the project holds, with what is loaded and why the rest is not.
- `ops/vm/extras.sh`: new. It refuses until `/var/lib/name-atlas/register-finalized` exists and the build unit is not running. Then:
  1. TERC and SIMC are downloaded through the "Pliki pełne" postback, and each CSV member is checked against `fixtures/teryt/source-manifest.json`.
  2. `seed:sources`, `import:teryt` and `import-onomastics --file sources/onomastics/buryan-1933.json` run.
  3. `packages/truth/bin/surname-meaning.ts` runs once per Buryan surname.
  4. The gate runs, then `GRANT SELECT` for the web role, `vacuumdb --analyze` and a `pg_dump` to `/var/lib/name-atlas/backup/name_atlas-register-2026-01-20-teryt-buryan.dump`.
- `.github/workflows/register-vm.yml`:
  - an `extras` step;
  - `claude/awesome-darwin-af7l50` in the push trigger;
  - `extras` in the `workflow_dispatch` options;
  - the web-role connection runs after `extras` too, and it also counts `places` and `ACTIVE` `SURNAME_MEANING` claims.
- `ops/vm/request`: `status`. `ops/vm/README.md`: `extras.sh` in the file table, step 6 in "Running it", and the second dump under backups.
- `STATUS.md` and `docs/CODEMAP.md`: the lines this makes untrue.

## Verified

| Command | Result |
|---|---|
| `shellcheck ops/vm/*.sh` (0.9.0) | exit 0, no findings |
| `actionlint .github/workflows/register-vm.yml` (1.7.7) | exit 0 |
| `pnpm exec prettier --check` on the task, the README and the workflow; `pnpm check:ids` | "All matched files use Prettier code style!"; "every task, ADR, migration and decision number is used once" |
| The TERYT postback from this session: a GET of the page, then a POST per file with `__EVENTTARGET=ctl00$body$B{TERC,SIMC}UrzedowyPobierz`, `__VIEWSTATE`, `__VIEWSTATEGENERATOR` and `ctl00$body$TBData` as served (`30 września 2026`) | `TERC_Urzedowy_2026-09-30.zip` 132,136 bytes and `SIMC_Urzedowy_2026-09-30.zip` 3,349,858 bytes. CSV members `557edb286b399cc7f84a3ee0fbeb809b3928e64da70c7eda8b71fa7f06e585d4` and `316c6446da15f53fef77ae3f28bda60f9c0300120c217eaa4431e1661a018c5a`, equal to the manifest's. |
| `Register VM` run 36667029657 (`status`, this branch's first push, 04:01 UTC) | success. Build: `[derive] 180000 done \| 42.6/s \| 0 failed` at 04:01:24, `built: no`, `finalized: no`. Database 7,845 MB; 598,476 surnames; 4 source records; `ACTIVE` claims `CURRENT_POPULATION` 320,666, `CURRENT_RANK` 320,666, `RARITY_CONTEXT` 320,666, `CURRENT_DISTRIBUTION` 301,702; migrations 23. The web role over TLS 1.3 through PgBouncer: `surnames 598476`, `places 16`, `SURNAME_MEANING claims 0`, a write refused. |

**The rehearsal (AC-2).** It ran on Ubuntu 24.04.4 in this session's container, with PostgreSQL 16 and PostGIS 3.4 from Ubuntu's packages (the VM has 17 and 3.6 from PGDG) and Node 22.22.2. Everything was set up as `provision.sh` sets it up:

- the system user `nameatlas` with home `/srv/name-atlas`;
- the roles `nameatlas` and `nameatlas_web`, with `default_transaction_read_only = on` for the web role;
- the database owned by `nameatlas`, with `postgis`, `pg_trgm` and `pg_prewarm` created by the superuser;
- default privileges granting the web role `SELECT`.

The committed tree (`git archive HEAD`) went to `/srv/name-atlas/app`, with this checkout's `node_modules`. As `nameatlas` over the socket:

- `pnpm db:migrate` applied 0001–0023;
- the four PESEL excerpts were imported with their own `--sha256`, as `docs/LOCAL_DATABASE.md` shows;
- `pnpm seo:backfill-slugs` ran;
- `pnpm truth:derive-batch --all --rank` gave "finished 44 surnames … failed 0".

The environment's proxy CA sits under `/root`, which `nameatlas` cannot read, so the rehearsal passed a world-readable copy through `CURL_CA_BUNDLE`, `SSL_CERT_FILE` and `NODE_EXTRA_CA_CERTS`. The VM has no proxy.

| Run | Result |
|---|---|
| `bash ops/vm/extras.sh` without the marker | exit 1: "finalize has not run (/var/lib/name-atlas/register-finalized is missing) …". `source_records` 4 before and after. |
| with the marker, first run | exit 0 in 1 min 4 s. Both files: the member names `TERC_Urzedowy_2026-09-30.csv` and `SIMC_Urzedowy_2026-09-30.csv`, "as the manifest records". `seed-sources`: inserted 96. `[teryt] IMPORTED`: 4,360 TERC and 101,865 SIMC rows, `STAN_NA` 2026-01-01, voivodeships reused 16, 380 powiats, 2,479 gminas, 101,865 localities, 104,724 places, names, external ids and memberships, 106,227 source records. Buryan: "IMPORTED … 25 entries stored". Of its 25 surnames, 7 are in the excerpts and got `POSSIBLE (1 interpretation(s))`: JANKOWSKI, SZYMAŃSKI, WÓJCIK, KOWALCZYK, NOWAK, MAZUR, DĄBROWSKI. 18 are `UNRESOLVED`, because they are not in the excerpts. Every gate check `ok`: TERC ids 2,875, SIMC ids 101,865, TERYT source records 106,227, `REGION` places 16, 0 Buryan surnames in the register without a meaning, 7 `ACTIVE` `SURNAME_MEANING` claims, 0 shared claim keys, PESEL unchanged (44 surnames, 45 national and 78 regional values, the same four hashes). Places by type: `REGION` 16, `COUNTY_DISTRICT` 380, `MUNICIPALITY` 2,479, `CITY` 1,026, `VILLAGE` 43,641, `OTHER` 57,198. The web role could read every table. Dump 24 MB; database 208 MB. |
| second run | exit 0. "already verified" for both files; `seed-sources` inserted 0, 96 left unchanged; `[teryt] ALREADY IMPORTED … Nothing written.`; Buryan `ALREADY_IMPORTED`; the same 7 meanings; every check `ok`. Rows before and after: 106,232 source records, 104,740 places, 52 claims, 52 evidence items, 98 sources, unchanged. |
| `surname-meaning.ts NOWAK` once more | `research_runs` 52 before and after: re-deriving writes nothing. |
| `SET ROLE nameatlas_web` then the two counts | `places 104740`, `SURNAME_MEANING 7` |

## Not verified

- **The `extras` run on the VM (AC-3, AC-4).** It waits for TASK-040's build to finish and for its `finalize` to pass. At 04:01 UTC the build was deriving, at 180,000 surnames.
- **That all 25 Buryan surnames resolve against the full register.** The excerpts hold 7. The script reports the count, and the VM run will show it.
- **The postback on a later day.** The page's date field will carry that day's date, and the member name will change with it. The member's bytes are expected to hash the same while `STAN_NA` stays 2026-01-01. If they do not, the script stops before importing.
- **PostgreSQL 17, PostGIS 3.6 and arm64** were not rehearsed; the VM's own run is the test.

A `finalize.sh` re-run after `extras` fails its "source records = 4" check. That is expected (task §3), not a defect.
