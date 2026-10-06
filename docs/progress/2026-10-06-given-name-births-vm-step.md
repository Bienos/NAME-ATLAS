# 2026-10-06 — The Register VM step `given-name-births` (TASK-142)

One Register VM run loads the first names given to children (dane.gov.pl dataset 219; TASK-136, ADR-0042) and derives their claims (TASK-137, TASK-139, ADR-0043) in production. The baby-name page (TASK-141) then has data once the owner turns it on (`tasks/142-given-name-births-vm-step.md`). Built on `main` @ `435e8bd`. It has not been run on the VM.

## What changed

- **`ops/vm/given-name-births.sh`** (new), on `given-names.sh`'s pattern:
  1. unpack and install;
  2. `pnpm db:migrate`. Then check that the three claim types exist, and that the commit derives trends at `given_name_birth_trend@2`, the version the gate expects;
  3. download each file of `BIRTH_NAME_RESOURCES` into `$APP/data/given-name-births/`, skipping a copy that already matches. A download whose size or SHA-256 differs is deleted and refused, and nothing is imported;
  4. import with the committed metadata (`docs/sources/acquisition/2026-10-06/metadata/`);
  5. `derive-given-name-births` in one process, reading its tally;
  6. the gate:
     - one `ACTIVE` record per file;
     - each file's lists, rows and children as the registry gives them;
     - 52 `ACTIVE` lists, none sharing a year and sex;
     - count claims = rank claims = stored counts on `ACTIVE` lists;
     - every `ACTIVE` trend at `@2`, none at `@1`, and as many as tallied;
     - nothing refused;
     - no shared `claim_key`.

     Then the web role's grant and its read check, and the marker `/var/lib/name-atlas/given-name-births-loaded`.

  It refuses without `finalize`'s marker, while the register build, the archive load, the bearers load or the change-over-time batch runs, and with a relative archive path.
- **`.github/workflows/register-vm.yml`:** the step `given-name-births`:
  - in the header, the choices, the validation `case` and its own job step;
  - in the web-role check's condition;
  - a query there printing the three claim types' `ACTIVE` counts.
- **Docs:**
  - `ops/vm/README.md`: the files table, the run order with a "by hand over SSH" paragraph and its three commands, and the steps that migrate production;
  - `docs/CODEMAP.md`, `STATUS.md`, `tasks/142-given-name-births-vm-step.md`.

## Verification (commands run, results as returned)

| Command | Result |
|---|---|
| `pnpm check:vm` | exit 0: "16 scripts parse, and 6 dumps exclude private rows or stream them directly into age" (15 before this change) |
| `pnpm check:ids` | exit 0 |
| `bash -n ops/vm/given-name-births.sh` | exit 0 |
| `shellcheck ops/vm/given-name-births.sh` (0.11.0, installed with `pip install shellcheck-py`) | exit 0, no findings |
| `actionlint .github/workflows/register-vm.yml` (1.7.12, `pip install actionlint-py`) | exit 1, two `SC2029:info` findings in the `archive` and `bearers` steps. `main` @ `435e8bd` gives the same two; none are in the new step |
| `register-vm.yml` loaded with Python's `yaml.safe_load` | parses; `given-name-births` is among the step options and has its own job step |
| `pnpm format:check` | exit 1 on 16 TypeScript files this change does not touch; `main` @ `435e8bd` fails the same way. The installed Prettier is 3.8.1. `pnpm exec prettier --check` on the five changed Markdown/YAML files passes |

**The step itself, on a stand-in for the VM.** This container played the VM:
- as root, with the build user `nameatlas` and its home at `/srv/name-atlas`;
- with `node` and `pnpm` linked into `/usr/local/bin`;
- with PostgreSQL 16 and PostGIS 3.4.2, and peer authentication over the Unix socket;
- with `name_atlas` created as `provision.sh` creates it, with extensions and grants, and migrated to `0039_full_name_reports` with Kysely's `migrateTo`;
- with the roles `nameatlas` and `nameatlas_web`, and `finalize`'s marker;
- with the archive from `git archive HEAD` of `435e8bd` (this change touches no file inside the archive that the step runs), and the script copied beside it.

The proxy's CA bundle was copied where the build user could read it, and passed with the proxy variables through `env -i`. The VM does not need that.

1. **First run** (AC-1): exit 0, 155 s.
   - **Migrations:** 0040 and 0041 applied: "migrations 41, last 0041_given_name_birth_claims".
   - **Downloads:** all 13 files downloaded, each matching the registry's SHA-256. 21457 was 440,085 bytes.
   - **Imports:** each `IMPORTED`, 0 flagged. 21457 gave 24,461 counts and 3,602 new names; the twelve yearly files gave 799 to 1,033 counts each.
   - **Derivation:** done in 89.6 s: "4624 names (0 flagged): counts 35598 new, 0 kept, 0 refused; ranks 35598 new, 0 kept, 0 refused; trends 1904 new, 0 kept, 0 refused, 0 superseded".
   - **The gate:** every line `ok`:
     - each file has 1 `ACTIVE` record;
     - lists, rows and children per file are as the registry gives them (21457: 40, 24,461, 8,064,304);
     - 52 `ACTIVE` lists, 0 sharing a year and sex;
     - 35,598 count, 35,598 rank and 1,904 trend claims;
     - 0 trends not at `@2` and 0 at `@1`;
     - nothing refused;
     - 0 shared claim keys;
     - 0 tables unreadable by the web role.

   The last line was "done: 52 lists, 35598 counts, each with its count and rank claim; 1904 trends", and the marker was written. In this run the importer's lines carried the step's prefix twice. The `sed` was corrected before the second run, and the corrected script is the one committed.
2. **Second run** (AC-2): exit 0, 60 s.
   - All 13 files were "already on disk with the registry's checksum".
   - All 13 imports were `ALREADY_IMPORTED`, with 0 counts imported.
   - The derivation: "counts 0 new, 35598 kept … ranks 0 new, 35598 kept … trends 0 new, 1904 kept, 0 refused, 0 superseded".
   - The same gate passed.
   - Before and after: 73,100 claims, 109,369 evidence items, 13 source records, 35,598 counts.
3. **A file that differs from the registry** (AC-3): in the archive's registry, 21457's SHA-256 was replaced with 64 zeros. The run exited 1 at step 3/6 with "21457: downloaded 440085 bytes, SHA-256 471d8ff9…ca6a7; the registry pins 440085 bytes, 0000…0000. The publisher has changed the file: nothing is imported."
   - Claims, source records and counts were the same before and after (73,100, 13, 35,598).
   - No `.partial` file was left.
4. **Refusals** (AC-4):
   - without `finalize`'s marker: "finalize has not run (/var/lib/name-atlas/register-finalized is missing)", exit 1;
   - with the relative path `app.tar.gz`: "usage: given-name-births.sh ABSOLUTE_PATH_TO_ARCHIVE", exit 1, and the archive was left in place.
5. **The workflow's new web-role query**, run as `nameatlas_web` over TCP to `127.0.0.1` with a password, with `default_transaction_read_only` on: "GIVEN_NAME_BIRTH_COUNT claims 35598", "GIVEN_NAME_BIRTH_RANK claims 35598", "GIVEN_NAME_BIRTH_TREND claims 1904", exit 0.

## Not verified

- The step on the VM itself: PostgreSQL 17, the VM's network to `api.dane.gov.pl`, and its build user's real privileges.
- The busy-unit refusal, since this container has no systemd.
- The workflow job. GitHub Actions starts no jobs on this account, so there is no CI result.
- The "by hand over SSH" commands, which were not run against any host.
