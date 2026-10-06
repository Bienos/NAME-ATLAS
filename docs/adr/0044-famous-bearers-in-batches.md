# ADR-0044 — Famous bearers: Wikidata asked about many surnames at once

- **Status:** Accepted 2026-10-05, by the project owner's decision in the session that wrote it.
- **Date:** 2026-10-05
- **Deciders:** the project owner. Told that famous people are loaded only for the 2,723 surnames ranked within 2,000, and that every surname at one query each would take 7–22 days, they asked: "do famous people for everyone but do it quicker".
- **Amends:** ADR-0030 §2.2, only "one query for the people filed under the family-name items labelled with the surname" and "a second only for the descriptions and articles of those kept": both are now asked for a batch of surnames. Everything else in §2.2 stands: one query at a time, at least one second apart, a user agent naming Name Atlas and its contact page, a timeout, three tries, the service's own `Retry-After` honoured, queried ahead of time by a loader and never when a page is viewed. ADR-0030 §2.1 and §2.3–§2.8 are unchanged.
- **Implemented by:** TASK-140.

## 1. Context

The loader asked the Wikidata Query Service one or two questions per surname, a second apart at least. The pass over the top 2,000 took 8,875 s for 2,723 surnames (3.26 s each; Register VM status run 37217149747, 2026-10-04). The register has 598,476 surnames, so every one would take about 7 days at one query a surname and about 22 at the measured pace. Most of those queries answer that nobody is filed under the surname. A WOJTYLA reader (#28,271) is told that Wikidata has not been asked.

Measured against the service on 2026-10-05:

- The people query over many surnames' labels at once, grouped by person and by the label the person was found under, gives each surname exactly the people its own query gives. 6 surnames compared by person through the raw query, and 30 surnames from NOWAK (451 people) to the long tail compared summary for summary through the loader's own code: all identical.
- 50 surnames ranked 2,001–10,000 answered in 2–5 s a batch, details included; 200 ranked 10,001–50,000 in 17–36 s; 400 ranked below 50,000 in 2–12 s. The service stops a query at 60 s.
- One in five to one in ten surnames in the long tail have somebody in Wikidata (mostly surnames shared with other countries), so the tail cannot be skipped.

## 2. Decision

1. **The people query is asked for a batch of surnames:** all their labels in one `VALUES`, each row carrying the label the person was found under (`BIND(STR(?label) AS ?key)`, `GROUP BY ?person ?key`). A surname's people are the rows whose label is one of its own, each person once, then ADR-0030 §2.1's exact-name test. A batch is 50 surnames whose first is ranked within 10,000, 100 within 50,000, 400 beyond, best rank first. It is sent by `POST`, since a batch's labels are too long for an address.
2. **The details query is asked for the people a batch keeps,** at most 200 people a query, a surname's people never split between two.
3. **A batch the service cannot finish is split, not repeated:** a query out of time (the service's `TimeoutException`, or no answer within the client's 60 s) or an answer cut off mid-way is asked again as two halves, down to one surname. Any other failure leaves the batch's surnames for the next run; ten whole batches failing in a row stop the loader, as ten surnames did.
4. **What is stored and claimed does not change.** Each surname gets the same summary (`wikidata_bearers@1`) as its own queries would give, stored as its own source record (`wikidata-bearers:{surname}`), whose address is still the surname's own query in the query service's editor, and its own `NOTABLE_BEARERS` claim. The record's response digests name the batch answers (`bearers_batch`, `details_batch`). A summary equal to the one stored changes nothing.
5. **One surname is still asked alone:** `--surname NAME`, which a removal request (ADR-0030 §2.5) uses, keeps the two queries of ADR-0030 §2.2.
6. **Every surname may be loaded:** the Register VM workflow's `top_rank` reaches the `bearers` step (any value of 301,370 or more takes all 598,476), and `restart_bearers` restarts a running load on a new commit.

## 3. Why not the alternatives

- **A shorter gap between single queries,** as ADR-0036 did for Polona. 1.2 million queries would still take days at four a second, and would press on a free public service far harder than about 2,000 batch queries do.
- **Several queries at once.** The service allows a few, but it budgets one minute of query time a minute per client; one batch at a time stays inside that without a scheduler.
- **The Wikidata dump.** Over 100 GB to download and read through for what a few thousand queries answer, and the summaries would no longer be the answer of a query a reader can run.
- **Querying only surnames that have a family-name item.** It needs a list of all such items first, which the service cannot return in one query; the batch query finds them anyway.

## 4. Consequences

- Every surname can say who in Wikidata shares it, or that nobody with a Wikipedia article does, instead of "not yet asked". Estimated from the samples at about 4–6 hours for all 598,476: roughly 2,000 batch queries and as many details queries as the kept people need, the database's writing overlapped with the next query (6.5 ms a surname on a local database).
- About 595,000 more source records, claims and their evidence rows on the VM; each record keeps the surname's query address (about 1.6 KB). The disk had 101 GB free on 2026-10-04.
- While the load runs, `archive`, `accounts` and `meanings` refuse to start, as they did for the top-2,000 pass: hours, not days.
- A batch answer is one response for many surnames: if the service changes between two batches, two surnames' summaries can differ in date by the time the load takes, as single queries already did.
- If the service answers the batches with errors that point to load (repeated 429 or 503), the batch sizes go down by a change to this decision, and the owner is told. The load is resumable, so nothing loaded is lost.
