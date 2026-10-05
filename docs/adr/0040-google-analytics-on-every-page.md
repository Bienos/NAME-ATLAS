# ADR-0040 — Google Analytics on every page, its cookies only with consent

- **Status:** Proposed 2026-10-05. It becomes accepted when the project owner merges the pull request that carries it.
- **Date:** 2026-10-05
- **Deciders:** the project owner. Told that GA loaded only after "Accept" (ADR-0038), they answered "it should be there always, not only when users say ok". Cookies without consent were not built: the banner still decides them (see Context).
- **Amends:** ADR-0038 §1 ("GA4 loads only after the visitor presses Accept … Before that, and after Reject, no request goes to Google"). ADR-0038 §2–§4 still hold.
- **Relates to:** TASK-109, D-037, D-042, `ARCHITECTURE.md` §9 (separate analytics per environment).
- **Implemented by:** TASK-115.

## Context

Google's "Set up a Google tag" page asks for the tag in every page's head, and for consent mode where visitors are in the EEA. Under ADR-0038 the tag was absent until "Accept", so GA counted only visitors who accepted and Google's installation test could not find the tag. Storing `_ga` cookies without consent would breach the cookie rule (PT art. 399, ePrivacy art. 5(3)); Google's consent mode is the documented way to have the tag on every page without them.

## Decision

1. Google's script is in every page's `<head>`, on every host.
2. On production's host (`name-atlas.pl`) the page configures it for every visitor and sends one `page_view` per route, with consent mode starting from every type denied. Elsewhere (staging, previews, CI, local) it is never configured and sends nothing.
3. "Accept" grants `analytics_storage` only, and Google then sets its cookies. Until then, and after "Reject", `analytics_storage` stays denied: Google sets no cookie, and page views are still sent. "Reject" after an acceptance deletes the `_ga` cookies.
4. The privacy notice says so: page views on art. 6(1)(f) GDPR, the cookies on consent. Whether that holds is D-042, for counsel.

## Consequences

- GA counts every visitor on production, not only those who accept; returning visitors are recognised only with consent.
- Google receives the IP address and the redacted address of visitors who rejected. D-042 records the legal question; option (b) there returns to ADR-0038.
- Every page loads Google's script, on every host, including CI's end-to-end run.
