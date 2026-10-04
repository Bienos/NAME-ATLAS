# 2026-10-04 — TASK-093: the share studio behind a soft sign-in gate

Branch `claude/tender-curie-ybiyaj`, on `origin/main` @ `bc364df` (#96, which carried ADR-0034 and this task).

## Changed

- **The deck's end** (`deck.tsx`, `deck-client.tsx`, `surname-page.tsx`):
  - The last card keeps its recap and has one primary link, "Twoja karta jest gotowa →" / "Your card is ready →", to the studio. Below it are only the full page and another surname.
  - The page-link share, the comparison and the offer moved to the studio.
  - On the last card, the deck's → control is a link to the same address, and the → key follows it.
  - `studioCards` lists the cards that have an image, summary first. `deckFinish` gives the studio's address. When a surname has no card with an image, the last card is as it was.
- **The preview:**
  - `renderShareCard` takes a `preview` label. It then draws the same card at 540 × 960, scaled from the 1080 × 1920 layout, with the label in a band across the lower third.
  - `sharePreviewResponse` in `share-route.ts` answers it with the image's 404, 308 and 503 rules. It is publicly cached and applies no gate.
  - The two routes are `/pl/nazwisko/{slug}/karta/{card}/podglad` and `/en/surname/{slug}/card/{card}/preview`.
  - The image route's register lookup is now one function, `factsFor`, shared by both handlers. `shareCardResponse`'s behaviour is unchanged.
- **The studio** (`share-studio.tsx`, `studio-client.tsx`, `app/pl/nazwisko/[slug]/udostepnij/`, `app/en/surname/[slug]/share/`):
  - A dynamic, `noindex` page that reads the session through `downloadGate`.
  - It shows the card row, the image, and then by verdict: `off`/`open` get the full image and the buttons, `sign-in` gets the preview with sign-in and sign-up links, `unavailable` gets the preview with a message. Below come the ways on.
  - A retired slug redirects to the studio at the current slug. A surname with no answer, or no card, is a 404.
  - The language switch leads to the other language's studio.
- **One module for the image** (`share-actions.ts`): fetching, sharing, saving and copying the card's image, used by the deck's top-bar button (unchanged in behaviour) and the studio. "Kopiuj obraz" builds its `ClipboardItem` from a promise, as Safari requires. `fileStem` moved here and is re-exported from `deck-client.tsx`.
- **`safeNext`** also accepts `/pl/nazwisko/{slug}/udostepnij` and `/en/surname/{slug}/share`, optionally with `?card=` naming one of `SHARE_CARDS`, under the same slug and length rules.
  - Password sign-in, Google's start and callback, and Google's terms step all check `next` with it.
  - So a reader who signs in, or signs up with Google, returns to the studio. This was found by reading the code (`google-routes.ts`, `account-page.tsx`), not run, since there is no Google client here.
- **Other files:**
  - `messages.ts`: the studio's strings, Polish and English.
  - `globals.css`: the studio, plus the end card's and the → control's amber.
- **Tests:**
  - `deck.test.ts`: TASK-057 AC-3's test that the last card links to the offer is replaced by TASK-093 AC-1's, since the offer moved to the studio.
  - `share-route.test.ts`: the preview.
  - `account-paths.test.ts`: the studio addresses and 15 refused variants.
  - `share-studio.test.ts`, new: each verdict, the card row, the ways on, `chosenCard`, `noindex`.
- **Docs:**
  - ADR-0034 is accepted, and its §4 now notes Google sign-in.
  - "Amended by" lines in ADR-0022, ADR-0025 and ADR-0027 §5.4.
  - The task's status, `docs/CODEMAP.md` (a row for the studio), and `STATUS.md` (a "Built" line; "Next" now names the video).

## Verified

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`: exit 0.
- `pnpm test`: exit 0, `apps/web` 741 tests in 67 files, every package passing.
- `pnpm build`: exit 0, listing the four new routes.
- **Local server and browser run:**
  - **Setup:** the final build under `next start`, twice: accounts off on port 3100, and accounts on on port 3101.
    - Accounts on used `ACCOUNTS_DATABASE_URL` as `nameatlas_app` and placeholder Resend variables (no mail was sent).
    - The database was a local PostgreSQL 16 with PostGIS 3.4, every migration through 0032, `ops/vm/accounts-roles.sql`, and the repository's fixture excerpt of the PESEL files (44 surnames, derived).
    - A test reader was inserted with a password hashed by `hashPassword`. The browser was headless Chromium with Playwright 1.56.
  - **curl:**
    - The studio answers `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` on both servers.
    - The preview answers 200 `image/png` with the public cache header on both. The PNG is 540 × 960, and the band reads "PODGLĄD · NAME ATLAS".
    - The full image answers 200 public with accounts off, and 401 `no-store` with accounts on and no session.
  - **Browser, 18 of 18 checks passed:**
    - **Accounts off:**
      - The last card's link and → control lead to `/pl/nazwisko/nowak/udostepnij?card=summary`, and the card has three links.
      - The → key opens the studio, which shows the full image and no prompt.
      - "Pobierz" saved `nowak-summary.png`, 1080 × 1920.
    - **Accounts on, anonymous:**
      - The end card's button opens the studio, which shows the preview and no "Pobierz".
      - The sign-in link is `/pl/konto/zaloguj?next=%2Fpl%2Fnazwisko%2Fnowak%2Fudostepnij%3Fcard%3Dsummary`, and the sign-in page carries it as a hidden field.
    - **Accounts on, after signing in:**
      - The reader is back on the studio with the full image.
      - "Pobierz" saved a 1080 × 1920 PNG, and the route answered `private, no-store`.
    - **English:** the English studio shows "Your card" and "Download".
    - **Phone width (390 px):** no horizontal overflow.
  - **Errors:** none on the pages or in the console, apart from 404s for `/_vercel/insights/script.js`, which exists only on Vercel. The harness counted those and reported 18 of 19; that check was re-run listing every response of 400 or more, and those were the only ones.

## Not verified

- **The share sheet and "Kopiuj obraz":** Web Share with files and image clipboard writes cannot be exercised headless. Their code paths are covered only by typecheck. A phone and Safari should be tried after deploy.
- **More than one card in the studio row:** NOWAK in the fixture register has only the summary card (the excerpt withholds rarity and distribution), so the browser showed no card row. The row is covered by the unit test.
- **Google sign-in:** not run (no client ID). It returns to the studio by code reading only.
- **`test:integration` and `test:golden`:** not run. This change touches no package, query or migration.
- **Production:** not deployed.
- **The "Udostępnij" button under "Co dalej":** it shares the page's link (the existing `ShareButton`), as §3.3 says. Beside the card's own "Udostępnij" it may read as the same action. Its wording is the owner's call.
