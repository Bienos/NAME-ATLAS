# ADR-0036 — Polona: requests at least 250 ms apart

- **Status:** Accepted 2026-10-04, by the project owner's decision in the session that wrote it.
- **Date:** 2026-10-04
- **Deciders:** the project owner. Told that the pass over the top 10,000 surnames would take about 23 hours at one request a second, they asked to "go faster". Offered 2× (500 ms), 4× (250 ms) or keeping one second until Polona is asked, they chose **"4× (0.25 s gap)"**, having been told that a higher rate makes a block by Polona more likely.
- **Amends:** ADR-0024 §2.2, only its interval ("at least one second apart"). Everything else in §2.2 stands: one request at a time, a user agent that names Name Atlas and its contact page, a timeout, a back-off on errors, a fixed set of searches per surname, never walking the collection.
- **Implemented by:** TASK-097.

## 1. Context

ADR-0024 §2.2 set the connector's pace at one request at a time, at least one second apart. A surname takes eight requests (`polonaInventoryRequests`), so about 8 s. The pass started on 2026-10-04 at 15:47 UTC over the surnames ranked within 10,000 (10,575 to search) ran at that pace and would have ended about 23 hours later. Polona's terms still say nothing about automated querying or request rates (D-021 item 1); the one-second gap was this project's own choice, not a limit Polona published.

## 2. Decision

1. **The minimum gap between the start of one Polona request and the next is 250 ms** (`POLONA_MIN_INTERVAL_MS`), across surnames as within one. Requests stay one at a time: no concurrency.
2. **The back-off is unchanged:** a failed request is retried after 5 s and then 20 s, three tries in all; ten failed surnames in a row stop the loader, and the unit restarts it after ten minutes, at most six times in 12 hours.
3. **If Polona answers with errors that point to the rate** (HTTP 429 or 503 in runs, or a loader stopped by ten failures in a row), the gap goes back to one second by a change to this decision, and the owner is told. The pass is resumable, so going back loses nothing searched.

## 3. Consequences

- A surname takes at least 2 s instead of about 8 s, more when Polona answers slowly; the remaining pass over the top 10,000 drops from about 21 hours to roughly 6–10.
- About four requests a second to a free public library service, from one address, for hours at a time. That is the accepted risk: Polona may rate-limit or block the VM's address. The user agent still names the project and its contact page, so Polona can reach the owner instead of blocking.
- The owner's offer to ask Polona what rate it is comfortable with stays open; an answer from Biblioteka Narodowa replaces this decision's number.
