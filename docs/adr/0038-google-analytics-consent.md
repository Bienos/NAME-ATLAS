# ADR-0038 — Google Analytics 4, only with the visitor's consent

- **Status:** Proposed 2026-10-04. It becomes accepted when the project owner merges the pull request that carries it.
- **Date:** 2026-10-04
- **Deciders:** the project owner. They asked for Google's tag for `G-ZC9D1RK4NN` to be installed; offered a consent banner, cookieless consent mode with no banner, the tag pasted as given, or no GA, they chose **"Consent banner"**.
- **Amends:** `docs/canonical/18` §1 ("Do not add another analytics vendor in P0", PostHog as the P0 platform): Google Analytics 4 is added beside Vercel Web Analytics. PostHog is not built.
- **Relates to:** TASK-058 (no surname in analytics), TASK-046 (the privacy notice), TASK-048 (the CSP), `DECISIONS_NEEDED.md`'s "consent-gated when it is".
- **Implemented by:** TASK-109.

## Decision

1. GA4 loads only after the visitor presses "Accept" on a banner whose "Reject" is equal in weight. Before that, and after "Reject", no request goes to Google. The choice is kept in `localStorage`; the privacy page can reopen the banner to change it.
2. Consent mode starts with every type denied and grants `analytics_storage` only. Google signals and ad personalisation stay off.
3. Every address, title and referrer GA receives goes through `analyticsUrl` (TASK-058): no surname, tree id, person id or query string.
4. The privacy notice names GA, its basis (consent, Art. 6(1)(a) GDPR), the cookies and the processor, in the same change.

## Consequences

- GA counts only visitors who accept; Vercel Web Analytics, cookieless, still counts everyone.
- The property's own settings (data retention, enhanced measurement's history-based page views, which would send unredacted addresses) are configured in Google's console, not in this repository.
