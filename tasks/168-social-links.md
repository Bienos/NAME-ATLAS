# TASK-168 — The footer's social links lead to the owner's accounts

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-social-links.md`).
- **Requested by:** the project owner, 2026-10-07: "https://www.tiktok.com/@nameatlas_ , https://www.instagram.com/nameatlas_/ , https://www.facebook.com/profile.php?id=61595400800918 these are my social media please add them as well to the website".
- **Numbers:** TASK-168 (163, 164 and 166 are on `main`; open #196 holds 165, #201 holds 167). `pnpm check:ids` run before commit.

## In scope

- The footer's social links (`followLinks`, TASK-057), which led to the home page until the owner gave addresses, lead to Instagram, TikTok and Facebook at the given addresses, in a new tab (`rel="me noopener noreferrer"`).
- YouTube, which had no address, is removed from the footer.
- The landing page's `Organization` (TASK-123) names the three accounts in `sameAs`.

## Out of scope

Icons, a new footer layout, share buttons, any other page.

## Acceptance

- **AC-1:** the footer shows Blog, Instagram, TikTok and Facebook in both languages; the three socials lead to the given addresses; YouTube is gone.
- **AC-2:** the landing page's `Organization` carries the three addresses as `sameAs`.

## Verification

`pnpm format:check`, `check:ids`, `lint`, `typecheck`, `test`.
