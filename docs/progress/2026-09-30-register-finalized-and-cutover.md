# 2026-09-30 — TASK-042: the register finalized on the VM and production cut over to it

Scope authority: `tasks/042-production-database-on-a-free-vm.md` (AC-6, AC-7). Decision: ADR-0017. Continues `docs/progress/2026-09-30-production-database-on-a-free-vm.md`, which left the build in step 7 of 7 with no `status` run since 04:55 UTC. Since 17:45 UTC, `name-atlas-two.vercel.app` serves the complete 2026-01-20 register from the Oracle Cloud VM.

GitHub Actions still starts no job (below), so the project owner ran the VM's steps from their own computer over SSH, with the session reading what they pasted. The workflow is only `scp` and `ssh` around the same scripts.

## Changed

- `ops/vm/finalize.sh`: the gate names the surnames the import flagged as mixed-script, checks that there are exactly 2, and requires every other surname to be complete. Before, it counted them as missing and failed (below).
- `ops/vm/status.sh`: `export LC_ALL=C.UTF-8`. An interactive `ssh` from a Mac forwards `LC_CTYPE=UTF-8`, which the VM lacks; psql's perl wrapper then warns on stderr, `q()` captures stderr, and the schema check printed "no schema yet" over a 14 GB database.
- `ops/vm/README.md`: the `finalize.sh` row says what the gate sets aside.
- `tasks/042-…`: AC-6 names the exception; the status line.
- `STATUS.md`: the "Last rewritten" line, the Production table (commit, database, deploys), the implemented list, the TASK-042 item under Next, the open pull requests, the Actions paragraph, and the owner's VM item.

## Verified

### GitHub Actions (this session, 16:50 UTC)

| Run | Result |
|---|---|
| 36747152644, `Register VM` by `workflow_dispatch` on `main`, step `status` | queued at 16:50:39, job "vm" failed at 16:51:20: `runner_id` 0, no runner name, no steps, the log endpoint answers HTTP 404. Every CI run since 05:53 UTC (for example 36743466910 at 16:20) shows the same shape. The reason is not visible through the API; the owner said Actions is unlocked tomorrow. |

### On the VM, by the owner over SSH (output pasted into the session)

| Step | Result |
|---|---|
| `status.sh`, 17:12 UTC | build unit `Result=success`, `NRestarts=0`, active from 02:45:15 to **05:36:04 UTC**; its log ends "[derive] finished 328456 surnames in 4204.8s", "rate 78.1/s \| failed 0", "[setup] done"; systemd: "Consumed 2h 8min 24.312s CPU time, 1.0G memory peak". `built: yes`, `finalized: no`. PostgreSQL and PgBouncer active, listening on 127.0.0.1:5432 and 0.0.0.0:6432; no upgrade waiting; up 14 h 45 min, load 0.08; memory 11,927 MB with 3,759 used and 3,160 shared; swap 0 used; disk 27 GB used of 145 GB. The database section printed "no schema yet" and eight perl locale warnings: the cause and fix are above. Step 6 therefore took 02:51 to about 04:26 (95 min) and step 7 04:26 to 05:36 (70 min); the whole build 2 h 51 min on 2 A1 cores, against the 5–7 hours projected. |
| `finalize.sh` as merged in #35, 17:1x UTC | the gate: ok surnames 598,476; ok national values 828,264; ok regional values 1,340,605; ok source records 4; ok the four hashes; ok 0 ACTIVE claims sharing a claim_key; ok 0 surnames with more than two ACTIVE claims of one type; **FAIL surnames missing population, rank or rarity = 2**; **FAIL surnames with regional data missing their distribution = 1**. Active claims: CURRENT_POPULATION 828,262, CURRENT_RANK 828,262, RARITY_CONTEXT 828,262, CURRENT_DISTRIBUTION 395,216. Database size 14 GB. "ERROR: the gate failed; nothing was changed". |
| a read-only query for every ACTIVE surname that is flagged mixed-script, lacks a population claim, or has regional rows and no distribution claim | two rows, both `primary_script = Latn`, `mixed_script = t`, `script_confusable_flag = t`, no population claim, no distribution claim: **HODŽIЌ** (no regional rows) and **ЌATOVIЌ** (regional rows). Nothing else. |

Why: the importer resolves each row with `mixedScript: "RESOLVE_FLAGGED"` and keeps a mixed-script value, flagged (TASK-010, `docs/canonical/13` §10.4; `packages/sources/src/importer.ts`). `derive-batch` then passes each surname's `canonical_display` back through the resolver with the default policy, which maps `MIXED_SCRIPT_REVIEW` to `REVIEW_REQUIRED`, and `deriveCurrentPopulation` and the others return `NO_RESULT` for it without throwing (`packages/truth/src/derive.ts`), so the batch counts it as done, not failed. The gate written in TASK-042 expected 0 and had only been rehearsed against a partial build (AC-3), where it failed for the intended reason. 828,264 national rows against 828,262 population claims is the same two surnames.

| Check on the fix, this session | Result |
|---|---|
| `shellcheck` 0.11.0 on `ops/vm/finalize.sh` | no findings |
| `bash -n` | ok |
| `pnpm format:check` | "All matched files use Prettier code style!" |
| `pnpm check:ids` | "every task, ADR, migration and decision number is used once" |
| the corrected file's SHA-256 | `e193beefee6402f8003b474f799fef6e288b58560b7f9422befd642f81e8c119` (commit `f8b737a`) |

### The cutover (this session, through the Vercel API)

| Step | Result |
|---|---|
| `DATABASE_URL` (Production) | edited by the owner at 17:42:03 UTC (`updatedAt` 1790790123120); its value is not read here. Its stored comment still describes the Supabase pooler. |
| redeploy of `dpl_HAvMMx6BbErUEY9xbQZwXwkhQVua` (`main` @ `1e9fa81`) with `target: production` | `dpl_7TRC2cdHNf2NUognTgRV7N6sFQNg`, `source: redeploy`, created 17:44:23 UTC, READY 17:45:18 UTC, aliases `name-atlas-two.vercel.app`, `name-atlas-bienos.vercel.app`, `name-atlas-git-main-bienos.vercel.app`, region `fra1`. The app is unchanged. |
| `curl https://name-atlas-two.vercel.app/pl/nazwisko/adamczyk` | 200 in 1.46 s: "osób w rejestrze PESEL · 20 stycznia 2026 r", "około 1 na 945" (men) and "około 1 na 928" (women), "# 35 miejsce na liście nazwisk" and "miejsce 31", "15,4% było zameldowanych w województwie ŚLĄSKIE", "Zweryfikowane". On the Supabase slice this page said "Nie znaleziono takiego nazwiska" (the previous record). |
| `/pl/nazwisko/nowak` | 200 in 1.04 s, "około 1 na 215" and "1 na 216", "Zweryfikowane" |
| `/pl/nazwisko/bąk` | 200 in 0.59 s, counts and rarity, "Zweryfikowane" |
| `/en/surname/baran` | 200 in 0.65 s: "20,918 people in the PESEL register", "about 1 in 1,013", "20,208 people", "about 1 in 1,067", "Verified" |
| `/pl/nazwisko/hodžiќ` (one of the two set aside) | 200, "Nie znaleziono takiego nazwiska", as the resolver's policy intends |
| `/` | 200 in 1.07 s, the landing atlas with "408 182 nazwiska" |

Rollback: `dpl_HAvMMx6BbErUEY9xbQZwXwkhQVua` keeps the Supabase `DATABASE_URL`; an Instant Rollback to it returns production to the seven-surname slice.

### Correction at 19:03 UTC: the redeploy had rebuilt the pre-#37 app

#37 (TASK-043, the six-plate landing atlas) merged into `main` @ `b156bd8` at 17:31:50 UTC, and Vercel built it automatically (`dpl_FqLffcZJxPXho3wXQjPRoUM9EWjF` at 17:31:55, then `dpl_9BZDwyLJqe7RUbF4iukc6uL4jbdE` at 17:42:10, seven seconds after the `DATABASE_URL` edit; who started the second is not known here). The 17:44 redeploy above rebuilt `dpl_HAvMMx6…`, the deployment read as current at 16:50, so from 17:45 production served `1e9fa81`'s app, the landing page with plates I–III, against the VM. Noticed when this branch was rebased onto `main`. Fixed with a redeploy of `dpl_9BZDw…` (`b156bd8`) with `target: production`: `dpl_3Zf5iXwoTTmDfMRj6MR3RuYiPTc5`, created 19:03:22 UTC, READY 19:04:16, holding `name-atlas-two.vercel.app`. Checked: the landing page prints "Plansza I" to "Plansza VI" and "229 788 nazwisk jest na obu listach"; `/api/v1/surname-results?surname=ADAMCZYK` answers `population READY`, `meaning AVAILABLE`. So for 79 minutes the landing page was the older one; no surname page was affected.

## Not verified

- **The passing `finalize` run.** The owner copied the corrected `finalize.sh` to `~/name-atlas-ops/finalize.sh` on the VM through an `ssh … 'cat > …'` heredoc and ran it, and reported "done". The session did not see its output: not the checksum of the copied file, not the gate's lines, not `synchronous_commit` after step 2, not the prewarmed block count, not the dump's size. That production reads every table as `nameatlas_web` shows that step 3's `GRANT` ran. Whether `/var/lib/name-atlas/register-finalized` and the dump exist is for the next `status` run.
- **The `provision` re-run with a new web password.** The first password was not kept anywhere the owner could find, so, per `ops/vm/README.md` step 4, a new 40-character one was generated on their Mac and passed on stdin to `~/name-atlas-ops/provision.sh` (the copy the provision run staged; it lacks the later `cd /` line, which mattered only to `build.sh`). Reported done; output not seen. That production logs in through PgBouncer shows the password was set and PgBouncer's auth file rewritten. Whether PostgreSQL was restarted by it is not known; `provision.sh` restarts it only when a written file differs, and none should have.
- The repository secret `VM_DB_WEB_PASSWORD`: the owner reports it replaced. The `Register VM` connection step tests it on the next run.
- The two surnames set aside are not reachable by a visitor: typing either gives `MIXED_SCRIPT_REVIEW`, and their pages answer "not found". Whether the product should say something else for them is not decided and not blocking; no `D-` entry was added.
- The dump's restore, and a copy of it off the VM (unchanged from the previous record).
