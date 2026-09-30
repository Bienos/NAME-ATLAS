# 2026-09-30 — TASK-040 merged and deployed: the landing atlas is live

The project owner asked for TASK-040 to be merged and deployed to production: "yes merge it and deploy to production" (2026-09-30).

## Done

- **Merged #32** into `main` as `12fb474` ("Merge #32: TASK-040 — …"), with a merge commit.
  - CI had no result. GitHub Actions has started no job since 05:53 UTC on 2026-09-30, on any branch; #31 records the outage.
  - The local suite on the branch passed: typecheck, lint, format, every package's tests and the build (`docs/progress/2026-09-30-landing-atlas-list-facts.md`).
  - `pnpm db:migrate`, `test:integration` and `test:golden` have not run anywhere for this change.
- **Deployed `main` @ `12fb474` to production** through the Vercel API: `create_deployment` with target `production` and git source `Bienos/NAME-ATLAS`, ref `main`, that sha.
  - This was needed because Vercel's production branch is still `claude/exciting-noether-05np1s`, so a merge to `main` does not deploy by itself. The same merge also built an ordinary preview, `dpl_BbfCkUQfzcZ95UfKW9nMH4pCH39T`.
  - Deployment `dpl_EqKfZrJcfQ139NcKcL1h1Ln3Xmxm`, region `fra1`, state `READY`.
  - Its aliases are `name-atlas-two.vercel.app`, `name-atlas-bienos.vercel.app` and `name-atlas-git-main-bienos.vercel.app`.
- **Rollback candidate:** the deployment this one replaced, `dpl_B2D15z8i9FYbL6gqoUU2nEy9e2MC` (`main` @ `ea03941`, Merge #24). Before this change, `STATUS.md` named `0eb4814` (Merge #11) as the deployed commit. That line was already out of date: Vercel lists `ea03941` as the latest production deployment before this one.
- **Documents now true after the merge:**
  - ADR-0015 is Accepted.
  - `docs/contracts/list-facts.md` is accepted (also in the contracts README and `docs/CODEMAP.md`).
  - TASK-040's status line says it is merged and deployed.
  - `STATUS.md` is rewritten.

## Verified

- **`get_deployment` for `name-atlas-two.vercel.app`** returns `dpl_EqKfZrJcfQ139NcKcL1h1Ln3Xmxm`: `READY`, target `production`, git sha `12fb474436fb0eae8556852d5928703745cf819b`, `aliasError: null`.
- **`curl https://name-atlas-two.vercel.app/`** (no login; production is not behind Vercel Authentication) returns status 200 and 333 682 bytes. The rendered text contains:
  - the section title "Dwie listy, trzy plansze";
  - the plate I headline "Na liście mężczyzn typowe nazwisko nosi 5 osób…";
  - the plate II headline "Ile osób musi wejść, zanim nazwisko się powtórzy?" and "Wystarczą 82 osoby";
  - the plate III headline "Tysiąc nieznajomych z listy mężczyzn: średnio 921…".

  It contains none of "Polaków", "w Polsce" or "nosicieli".
- **All 6 `/_next/static` assets** the page references return 200.

## Not verified

- **No browser rendering of the production URL.** This session's headless Chromium does not trust the egress proxy's CA (`ERR_CERT_AUTHORITY_INVALID`), and certificate checks were not switched off to get around it.
  - The browser checks for this commit ran on a local production build and against the Vercel preview of the branch: `docs/progress/2026-09-30-landing-atlas-list-facts.md`.
- **CI** (see above).
