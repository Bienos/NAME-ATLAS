# 2026-10-07 — The sample report's PDF on Vercel: pdfkit's built-in fonts traced

**What was wrong.** After TASK-172 (#204) was deployed (`dpl_9S9Q9CvBhcy8MXTyjfyoa8VuMLhE`, `main` @ `6e2fb72`), `https://name-atlas.pl/pl/przykladowy-raport.pdf` answered `500`. The deployment's runtime log for the request said:

> Error: Cannot find module '/var/task/node_modules/.pnpm/pdfkit@0.20.1/node_modules/pdfkit/js/standard-fonts/Helvetica.cjs'

**Why.**
- **What pdfkit loads:** pdfkit, which `@react-pdf/renderer` uses, loads its built-in Helvetica whenever it opens a document. It loads it through `require("#standard-fonts/Helvetica")`, which its `imports` map resolves to `js/standard-fonts/Helvetica.cjs`. That file requires `js/standard-fonts/chunks/standardGlyphNames-….cjs`.
- **What the trace held:** the build's file trace for the route listed the `.mjs` files of that folder and none of the `.cjs` ones.
- **Why it passed locally:** under `next start` every file of `node_modules` is there, so TASK-172's local checks passed.

**The change.** `apps/web/next.config.ts` adds `../../node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/standard-fonts/**/*.cjs` to `outputFileTracingIncludes` for `/pl/przykladowy-raport.pdf` and `/en/sample-report.pdf`. There is no other change.

## Verification (commands run, results as returned)

On `claude/fix-report-pdf-trace`, built from `main` @ `978b7ee`:

| Command | Result |
|---|---|
| `pnpm build` in `apps/web` (`DATABASE_URL` an empty database) | exit 0 |
| The routes' `.next/server/app/…/route.js.nft.json` | each lists 406 files, among them the 14 `.cjs` fonts and the chunk |
| The route's traced files alone, copied into an empty folder; pdfkit opened from there | without the `.cjs` files: `Cannot find module …/Helvetica.cjs`, as on Vercel. With them, before the chunk was added: `Cannot find module './chunks/standardGlyphNames-DNHAb7rp.cjs'`. With both: no error |
| The same, `@react-pdf/renderer`'s `renderToBuffer` of an A4 page in Instrument Sans and the default Helvetica, for each route's traced files | `rendered 4623 bytes`, both routes |
| `pnpm typecheck`, `lint`, `format:check`, `check:ids` | exit 0 |

## Not verified

- **On Vercel:** not checked before the merge; the file is fetched from production after it.
- **Locally, end to end:** the route itself was not run from its traced files alone; the check runs the library from them.
