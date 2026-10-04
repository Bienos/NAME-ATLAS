# ADR-0034 — the deck ends in a share studio, behind a soft sign-in gate

- **Status:** Proposed, 2026-10-03. It is accepted when the project owner merges the pull request that carries it.
- **Date:** 2026-10-03
- **Deciders:** the project owner.
  - On the deck's last card: "it should be like the end button … leading to the next page and … it should essentially leave the cards", then a section "to create … a short video to share on Instagram … and then the card as well with information on it about the surname", reached by signing in, after which readers "access the download dashboard where you can create the video … copy, download the card … share on Instagram".
  - Offered a hard wall or a soft gate (the preview free, the download after sign-in), they chose **"soft gate"**, and **"no music in v1"** for the video.
- **Amends:** ADR-0022 §2.4 (the journey ends on the summary with the share card; it now ends on the studio), ADR-0025 (the deck's last card leads out of the deck), ADR-0027 §5.4 (what the sign-in gate guards, and the return address after sign-in).
- **Relates to:** ADR-0026 (the free tier lists "a share card per answer": unchanged, the card stays free with a free account), TASK-056 (the share cards), TASK-064 (the gate on the story-size image).
- **Implemented by:** TASK-093 (the end of the deck, the preview, the studio and the card). The video is a later task.

## 1. Context

- The deck's last card, "Podsumowanie", holds four figures and five actions of equal weight (share the link, the full page, compare, another surname, the offer). Nothing on it says the journey has an end or that a card is waiting.
- TASK-064 put the story-size card image behind a session when accounts are on. A reader without one learns this only after pressing "Udostępnij kartę", from one line of text.
- `PRODUCT.md` §6's free tier lists the cards and a share card for each answer, and later a free account to keep and share them. A wall before the cards, or before the reader has seen the card, would break the first and turn a shared link into a login page for the friend who opens it.

## 2. Decision

1. **The deck's last card leads out of the deck.** Its main action, and the deck's "next" control on the last card, open a page of their own: the **share studio**, `/pl/nazwisko/{slug}/udostepnij` and `/en/surname/{slug}/share`.
2. **The gate is soft.** Every reader sees the studio and a preview of the card: a smaller image marked as a preview, public and cached like any page asset. Downloading, copying and sharing the full image need a session when accounts are on, as TASK-064 already enforces on the image route. The cards, the full page, the comparison and the link to the page stay free of any sign-in.
3. **Sign-in returns to the studio.** The studio's address joins the surname page as an accepted return address (`safeNext`).
4. **With accounts off the studio is open to everyone,** with the full actions and no preview mark, so production behaves as today until accounts go live.
5. **The studio reads the session; the surname page still does not.** The studio is its own dynamic, `no-store`, `noindex` page, so the cached surname page never carries a reader's state (TASK-064 §2.3).
6. **The video comes later, without music in its first version.** It is drawn from the same validated facts as the card. Instagram lets the reader add a track from its own library, so the project licenses none.

## 3. Why not the alternatives

- **A hard wall before the rest of the journey.** It contradicts `PRODUCT.md` §6's free cards and stops a friend arriving from a shared link before they have seen anything.
- **Keeping everything inside the deck.** The last card already has five actions; the studio needs room for a choice of card, a preview and its actions, and later a video. A page of its own also gives sign-in a stable place to return to.
- **A watermark on the full image instead of a preview size.** The full image would leave the server for anyone, which is what TASK-064's gate exists to prevent.

## 4. Consequences

- One new page per language, one new public image route per language (the preview), and one more accepted return address.
- The deck's in-card sign-in line (TASK-064) stays for the top-bar button; the studio becomes the main path to the image.
- Conversion depends on accounts going live (ADR-0027 §5). Until then the studio only replaces the last card's actions.
- `next` is still not carried through sign-up and its mail (TASK-064 §4): a new reader who signs up returns to the studio by pressing its button again in the tab they left. Whether to carry it, and to say so in the privacy notice, is the owner's call.
