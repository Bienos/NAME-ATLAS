# TASK-133 — The Register VM step `given-names`: the first-name lists and their claims in production

- **Status:** IMPLEMENTED 2026-10-05 (`docs/progress/2026-10-05-given-names-vm-step.md`). It has not been run on the VM.
- **Number:** 133. Written and built on 2026-10-05 as TASK-125 on `claude/blissful-archimedes-e02l3i`; renumbered when it landed on 2026-10-06, because #150 (the `bearers` rank limit) holds TASK-125 on `main`. No migration.
- **Requested by:** the project owner, 2026-10-05: "build the given-names VM step", after TASK-124 merged.
- **Decision:** no new ADR. The step follows `ops/vm/meanings.sh`, and the data and claims it loads are ADR-0032's and TASK-122's.
- **Model guidance:** implementation session.

## 1. Goal

The full-name report (TASK-124) reads each first name's count and rank on each list, and production holds none. TASK-078's import and TASK-122's derivation have only run out of band. One Register VM run of a new step, `given-names`, should load the official 2026-01-20 first-name lists and derive their claims in production, gated, repeatable, and refusing any file that differs from the registry.

## 2. Facts (2026-10-05)

1. The Register VM workflow has no first-name step. Production has not applied migrations 0031 (the given-name tables), 0038 (their claim types) or 0039 (the full-name report).
2. The registry pins each file's URL, SHA-256, size and count of names (`packages/sources/src/given-names/registry.ts`). The import CLI checks the checksum before parsing, and is idempotent on identical bytes.
3. Out of band (TASK-122), the full files gave 71,433 names, and 74,978 counts and 74,978 ranks, in about 3 minutes.
4. `meanings.sh` is the pattern for a step that imports and derives in one run, then gates.

## 3. In scope

- **`ops/vm/given-names.sh`:**
  1. unpack the pushed commit and install;
  2. migrate;
  3. download each registry file into `$APP/data/given-names/` unless the copy there already matches. Refuse a download whose size or SHA-256 differs, and import nothing;
  4. import each file with its committed metadata;
  5. derive every name in one process;
  6. the gate:
     - one `ACTIVE` record per file;
     - the registry's count of names stored for each;
     - names derived equal to `given_names`;
     - no count or rank refused;
     - as many `ACTIVE` count claims and rank claims as stored rows;
     - one `ACTIVE` claim per claim key;
     - the web role can read every table.

  A marker is written when the gate passes. The step refuses without `finalize`'s marker, and while the register build, the archive load, the bearers load or the change-over-time batch runs.
- **`.github/workflows/register-vm.yml`:** the step, in the header, the choices, the validation and its own job step. The web-role connection after it prints the two claim counts.
- **Docs:** `ops/vm/README.md` (the files table and the run order), `docs/CODEMAP.md`, `STATUS.md`.

## 4. Out of scope

- Running the step on the VM (the owner's).
- Second names, earlier editions, a change to the registry.
- Building full-name reports on production. The preview flag stays off.

## 5. Acceptance criteria

- AC-1: on a database at migration 0030 with `finalize`'s marker, the step applies 0031–0039, downloads both files, imports 46,197 and 28,781 names, derives 74,978 counts and 74,978 ranks with none refused, and passes the gate.
- AC-2: a second run downloads, imports and derives nothing, and passes the gate.
- AC-3: a file whose SHA-256 differs from the registry is refused before import, and nothing is written.
- AC-4: the step refuses without `finalize`'s marker, and with a relative archive path.
- AC-5: `pnpm check:vm` passes, and the workflow parses.

## 6. Verification

`pnpm check:vm`, `format:check`, `check:ids`, `lint`, and the workflow parsed as YAML. Then the step itself, run as root in a container standing in for the VM:
- the build user `nameatlas`, with its home at `/srv/name-atlas`;
- PostgreSQL with peer authentication over the Unix socket;
- a database at migration 0030;
- `finalize`'s marker;
- the archive from `git archive HEAD`.
