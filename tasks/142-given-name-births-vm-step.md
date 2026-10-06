# TASK-142 — The Register VM step `given-name-births`: the first names given to children and their claims in production

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-given-name-births-vm-step.md`). It has not been run on the VM.
- **Number:** 142, the next free on `origin/main` @ `435e8bd` and in open pull requests (#168 holds TASK-140 and ADR-0044). No migration, no ADR.
- **Requested by:** the project owner, 2026-10-06: a Register VM step that loads dataset 219 and derives its claims, so the baby-name page (TASK-141, #169) has data once the owner turns it on.
- **Decision:** no new ADR. The step follows `ops/vm/given-names.sh` (TASK-133). The data are ADR-0042's (TASK-136) and the claims ADR-0043's (TASK-137, TASK-139).
- **Model guidance:** implementation session.

## 1. Goal

The baby-name page reads `GIVEN_NAME_BIRTH_COUNT`, `GIVEN_NAME_BIRTH_RANK` and `GIVEN_NAME_BIRTH_TREND`, and production holds none of them. Migrations 0040 and 0041 are not on the VM either. One run of a new Register VM step, `given-name-births`, should do all of this, gated and repeatable:

- migrate;
- load the thirteen files of `BIRTH_NAME_RESOURCES`, refusing any file that differs from the registry;
- derive the three claim types.

## 2. Facts (2026-10-06)

1. `packages/sources/src/given-names/births-registry.ts` pins each file's URL, SHA-256, size, rows and children. There are 13 files: 21457 (2000–2019, 40 lists) and twelve yearly files (2020–2025, one list each), so 52 lists.
2. Out of band (TASK-137, TASK-139), the full files gave 35,598 counts, 35,598 ranks and 1,904 trends at `given_name_birth_trend@2`, with none refused and none flagged.
3. GitHub Actions starts no jobs on this account (billing). The owner may run steps by hand over SSH.
4. Open PR #168 also edits `.github/workflows/register-vm.yml` and `ops/vm/README.md`. Whichever merges second gets the conflict.

## 3. In scope

- **`ops/vm/given-name-births.sh`**, on `given-names.sh`'s pattern:
  - runs as root;
  - refuses without `finalize`'s marker, while a busy unit runs, and with a relative archive path;
  - unpacks the commit and installs;
  - runs `pnpm db:migrate` and checks that the three claim types exist afterwards. It also checks that the commit's `GIVEN_NAME_BIRTH_TREND_METHOD_VERSION` is the one the gate expects;
  - downloads each registry file into `$APP/data/given-name-births/`, skipping a copy that already matches. A download that differs is refused and deleted, and nothing is imported;
  - imports each file with its metadata under `docs/sources/acquisition/2026-10-06/metadata/`;
  - derives in one process;
  - runs the gate:
    - one `ACTIVE` record per file;
    - each file's lists, rows and children as the registry gives them;
    - 52 `ACTIVE` lists, none sharing a year and sex;
    - `ACTIVE` count claims = `ACTIVE` rank claims = stored counts on `ACTIVE` lists;
    - `ACTIVE` trend claims all at `given_name_birth_trend@2`, none at `@1`, and as many as the derivation tallied;
    - nothing refused;
    - no claim key shared by two `ACTIVE` claims;
    - read access for the web role;
  - writes the marker `/var/lib/name-atlas/given-name-births-loaded`.
- **`.github/workflows/register-vm.yml`:** the header line, the choice, the validation `case`, the job step, the web-role check's condition, and a query printing the three claim types' `ACTIVE` counts.
- **`ops/vm/README.md`:** the files table, the run order, the steps that migrate production, and a "by hand over SSH" paragraph with its three commands.
- `docs/CODEMAP.md`, `STATUS.md` and a progress record.

## 4. Out of scope

- Running anything on the real VM.
- Changing other steps or `ops/vm/bearers.sh`.
- The importer, the derivation or the claims.
- Vercel settings, including `BABY_NAMES_ENABLED`.

## 5. Acceptance criteria

- AC-1: on a database at `0039` with `finalize`'s marker, the step:
  - applies 0040 and 0041;
  - downloads and imports the 13 files;
  - derives 35,598 counts, 35,598 ranks and 1,904 trends with none refused;
  - passes the gate.
- AC-2: a second run downloads, imports and derives nothing, and passes the gate.
- AC-3: with one registry SHA-256 replaced by zeros in the archive, the step is refused at the download. Nothing is imported and no `.partial` is left.
- AC-4: the step refuses without `finalize`'s marker and with a relative archive path.
- AC-5: `pnpm check:vm` passes with the new script among those that parse. The workflow parses. The new web-role query returns the three counts when run as `nameatlas_web`.

## 6. Verification

Run these:
- `pnpm check:vm`, `pnpm check:ids`, `pnpm format:check`, `bash -n`;
- `shellcheck` and `actionlint`, if installable;
- `yaml.safe_load` of the workflow.

Then run the step on a stand-in VM, as TASK-133's record did:
- this container as root;
- the build user `nameatlas` with home `/srv/name-atlas`;
- PostgreSQL 16 with PostGIS 3 and peer auth;
- `name_atlas` migrated to `0039`;
- the roles `nameatlas` and `nameatlas_web`;
- `finalize`'s marker.
