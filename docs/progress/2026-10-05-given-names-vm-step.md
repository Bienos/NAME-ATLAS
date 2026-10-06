# 2026-10-05 — The Register VM step `given-names` (TASK-133)

One Register VM run loads the PESEL first-name lists and derives their claims in production, so the full-name report (TASK-124) has its first-name facts there (`tasks/133-given-names-vm-step.md`). Built on `main` @ `4aa1c04`. It has not been run on the VM.

## What changed

- **`ops/vm/given-names.sh`** (new), on `meanings.sh`'s pattern:
  1. unpack and install;
  2. `pnpm db:migrate`;
  3. download each file the registry names into `$APP/data/given-names/`, skipping a copy that already matches. A download whose size or SHA-256 differs from the registry is refused, and nothing is imported;
  4. import with the committed metadata;
  5. `derive-given-names` in one process;
  6. the gate, read access for the web role, and the marker `/var/lib/name-atlas/given-names-loaded`.

  It refuses without `finalize`'s marker, and while the register build, the archive load, the bearers load or the change-over-time batch runs.
- **`.github/workflows/register-vm.yml`:** the step `given-names`, in the header, the choices, the validation and its own job step. The web-role connection after it also prints the `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` counts.
- **Docs:** `ops/vm/README.md` (the files table, the run order, and the steps that migrate production), `docs/CODEMAP.md`, `STATUS.md`, `tasks/133-given-names-vm-step.md`.

## Verification (commands run, results as returned)

| Command | Result |
|---|---|
| `pnpm check:vm` | exit 0: "15 scripts parse, and 6 dumps exclude private rows or stream them directly into age" |
| `pnpm format:check`, `pnpm lint`, `pnpm check:ids` | exit 0 |
| `register-vm.yml` loaded with Python's `yaml.safe_load` | parses |

**The step itself, on a stand-in for the VM.** This container played the VM:
- as root, with the build user `nameatlas` and its home at `/srv/name-atlas`, holding a copy of the pnpm store;
- with `node` and `pnpm` in `/usr/local/bin`;
- with PostgreSQL 16.14 and peer authentication over the Unix socket. The VM runs 17.
- `name_atlas` was migrated to `0030_family_safeguards`, with the roles `nameatlas` and `nameatlas_web` and `finalize`'s marker;
- the archive came from `git archive HEAD` of `b57552d`.

The proxy's CA bundle was copied where the build user could read it. That is the one setting the VM does not need.

1. **First run** (AC-1): exit 0, 2 min 0 s.
   - **Migrations:** 0031 to 0039 applied, "migrations 39, last 0039_full_name_reports".
   - **Downloads:** both files downloaded, 1,095,529 and 557,487 bytes, and each matched the registry's SHA-256.
   - **Imports:** `IMPORTED resource 1159669`, 46,197 names (170 flagged); `IMPORTED resource 1159670`, 28,781 names (25,236 new, 3,545 reused, 17 flagged). The placeholders were reported and not stored.
   - **Derivation:** done in 99.0 s. "71433 names: counts 74978 new, 0 kept, 0 refused; ranks 74978 new, 0 kept, 0 refused".
   - **The gate:** every check `ok`:
     - each file has 1 `ACTIVE` record;
     - names stored are 46,197 and 28,781;
     - names derived are 71,433;
     - nothing refused;
     - 74,978 `ACTIVE` count claims and 74,978 `ACTIVE` rank claims;
     - no claim key is shared;
     - no table is unreadable by the web role.

   The marker was written.
2. **Second run** (AC-2): exit 0, 28.5 s.
   - Both files were "already on disk with the registry's checksum".
   - Both imports were `ALREADY_IMPORTED`.
   - "counts 0 new, 74978 kept … ranks 0 new, 74978 kept, 0 refused".
   - The same gate passed.
3. **A file that differs from the registry** (AC-3): the archive's registry had 1159669's SHA-256 replaced with zeros. The run exited 1 at step 3 with "1159669: downloaded 1095529 bytes, SHA-256 6a6e3083…7853; the registry pins 1095529 bytes, 0000…0000. The publisher has changed the file: nothing is imported." `source_records` held 2 rows before and after, and no `.partial` file was left.
4. **Refusals** (AC-4):
   - without `finalize`'s marker: "finalize has not run (/var/lib/name-atlas/register-finalized is missing)", exit 1;
   - with a relative archive path: the usage line, exit 1.
5. **The workflow's new web-role query**, run as `nameatlas_web` over TCP: "GIVEN_NAME_POPULATION claims 74978" and "GIVEN_NAME_RANK claims 74978".

## Not verified

- The step on the VM itself: PostgreSQL 17, the VM's network and its build user's real privileges.
- The busy-unit refusal, since this container has no systemd.
- `shellcheck`, which is not installed here and is not run by CI.

## Landed

On 2026-10-06 the branch's two commits (`b57552d`, `c313733`) were cherry-picked onto `claude/relaxed-dirac-cbere4`, on `origin/main` @ `015b788` (#151, TASK-131), and renumbered from TASK-125 to TASK-133: #150 (the `bearers` rank limit) holds TASK-125, and TASK-131 is the diacritic spelling hint. `.github/workflows/register-vm.yml` and `ops/vm/README.md` merged without a conflict, and #150's `top_rank` change to the `bearers` step is kept beside the new step. In `STATUS.md`, "Last rewritten" names this change, the full-name report bullet carries this change's sentence, and the D-044 bullet from #158 is kept. Checks on the landed tree: `yaml.safe_load` parses `register-vm.yml`, with `given-names` and `bearers` among the step options, `top_rank` still an input, and the `bearers`, `meanings` and `given-names` steps present; `pnpm exec prettier --check` on the six changed files other than `given-names.sh` passes (Prettier has no parser for shell); `pnpm check:ids` passes; `pnpm check:vm` passes ("15 scripts parse, and 6 dumps exclude private rows or stream them directly into age"); `bash -n ops/vm/given-names.sh` passes. `actionlint` and `shellcheck` are not installed here. GitHub Actions still starts no jobs (CI on `main` @ `015b788`, created 10:50 UTC, failed within seconds), so no CI result exists. The step has not been run on the VM.
