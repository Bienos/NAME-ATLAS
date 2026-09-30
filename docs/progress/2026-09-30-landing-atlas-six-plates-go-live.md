# 2026-09-30 — TASK-043 go-live: #37 merged, `main` @ `b156bd8` in production

The project owner's instruction was "go wtih 2 push live", confirmed with "Yes, keep building it" after the search work was stopped. TASK-043's pull request, #37, was merged and `main` deployed to production.

## Changed

- **#37 merged into `main`** as merge commit `b156bd8`, with a merge commit so the branch history is kept. ADR-0018 is accepted by this merge.
- **Production deployed automatically** from the push to `main`, because Vercel's production branch is `main`. No deployment was created by hand.
- **Records:**
  - ADR-0018's status;
  - TASK-043's status line;
  - `STATUS.md`: "Last rewritten", the "Deployed commit" and "Deploys" rows, and the open pull requests;
  - this record.

## Verified

- **Before the merge:**
  - #37's head `cfc3c0e` built on Vercel as a preview, `dpl_DVRZHB9KamtMR85Joh1m2UwFfoQW`: "Build Completed in /vercel/output [44s]" (`list_deployment_events`).
  - The `verify` job of the CI workflow failed twice on the head, each within 3 seconds, with no runner. This is the GitHub Actions outage `STATUS.md` records, so there is no CI result.
- **The production deployment:** `get_deployment dpl_FqLffcZJxPXho3wXQjPRoUM9EWjF` returns:
  - state `READY`, target `production`, source `git`;
  - `githubCommitRef: main`, `githubCommitSha: b156bd87bfd7edd6612f8b5789fca6f95bf63ce1`, region `fra1`;
  - aliases `name-atlas-two.vercel.app`, `name-atlas-bienos.vercel.app` and `name-atlas-git-main-bienos.vercel.app`, with `aliasError: null`;
  - building from 17:31:58 UTC, ready at 17:32:52.
- **The live page:** `curl https://name-atlas-two.vercel.app/` (no login) returns 200 and 175 453 bytes.
  - The rendered text contains:
    - "Atlas nazwisk";
    - "Każde nazwisko to jeden punkt.";
    - "Połowa mężczyzn nosi jedno z 4 210 nazwisk";
    - "106 813 nazwisk nosi dokładnie dwóch mężczyzn";
    - "118 775 nazwisk noszą dokładnie dwie kobiety";
    - "Co czwarty mężczyzna nosi nazwisko na";
    - "Najwięcej mężczyzn ma nazwisko na";
    - "229 788 nazwisk";
    - "ŻMUDA-TRZEBIATOWSKA";
    - "Trend potrzebuje dwóch wydań".
  - It does not contain "Losuj", "Polska w nazwiskach" or TASK-040's "Suwak".
  - The HTML has two `<canvas` elements and no `href="/?surname=` link.
- **Assets:** all 6 `/_next/static` scripts and stylesheets the page references return 200.
- **The English page:** `/?lang=en` contains "Surname atlas" and "Every surname is one dot".

## Not verified

- The live page in a browser: headless Chromium here does not trust the proxy's certificate for external sites, and TLS checking is not turned off. The browser checks ran on a local production build of the same code (`docs/progress/2026-09-30-landing-atlas-six-plates.md`).
- CI, for the reason above.
