# ADR-0020 — a surname's count may be shown across the editions of its list, as one derived claim per list

- **Status:** Proposed. It is accepted when the project owner merges TASK-046's pull request.
- **Date:** 2026-09-30
- **Deciders:** the project owner, 2026-09-30: "build the change over time section" (the session had offered it as the first product step after the register reached production), and, the same evening, that the 2019 lists describe living persons ("no use it is is living persona").
- **Relates to:** ADR-0019 (the list-scope comparison of editions), ADR-0007 (rights), ADR-0004 (the unit of a count), `docs/canonical/14` §13.5 (`SURNAME_DISTRIBUTION_SHIFT`), TASK-025 (comparisons refuse different dates), TASK-045 (the editions are loaded).
- **Amends:**
  - ADR-0019 §3's last alternative ("trends per surname on the surname page … a larger change to the claim chain"): this ADR is that change, for the national count only.
  - ADR-0019 §2.2 and its first alternative, **for the surname-level section only**: the 2019 editions join it (§2.2 below). The landing's series is unchanged until a later task amends ADR-0019 for it.
- **Code:** `packages/sources/src/registry.ts`, `packages/truth/src/shift.ts`, `packages/db/migrations/0024_distribution_shift.ts`, `packages/contracts/src/surname-result.ts` (schema 1.7), `apps/web`.

## 1. Context

- **Every edition is in the database.** TASK-045 loaded the 2019 pair, the 2020–2025 national editions and the 2025 regional pair as dated snapshots. No page reads them: a derivation takes the four 2026 resources only.
- **What a visitor can ask.** Did more or fewer people carry my surname in the past? The free scope promises "current existence and national count", and the premium scope lists "surname-level geographic change over time". The free page has a dated count and a rank, and nothing about time.
- **The register grows faster than the population.** Men's list totals: 19,859,783 (2019), 19,879,045, 19,987,207, 20,203,548, 20,808,071 (2023), 20,976,785, 21,096,170, 21,197,537 (2026). The step from 2022 to 2023 alone adds 604,523 people. GUS's resident population fell over the same years, and no source says who enters the register (`docs/sources/candidate-sources.md` §2). A surname's raw count therefore rises or falls partly because the list does.
- **Editions are stored partially, on purpose.** An edition's rows for surnames the current register lacks are not written (TASK-045 §3), so an edition's stored row count is below its official row count, and the row-count completeness gate that rank and rarity use cannot apply to it.

## 2. Decision

1. **One claim per surname and list.** A new claim type, `SURNAME_DISTRIBUTION_SHIFT` (the taxonomy's own name, `docs/canonical/14` §13.5), surname scope, `FACT`. It is derived offline in batch, like the population and rarity claims, and the request path only reads it. Its subject is one surname's national count across the editions of **one list**; the male and the female lists are two claims and are never added.
2. **Which editions.**
   1. The editions of ADR-0019's series, 2020-01-22 to 2026-01-20, as registered.
   2. **Plus the 2019-06-30 edition of each list.** The publisher's description of the 2019 files is shorter and omits "osób żyjących", and their header differs. The project owner ruled on 2026-09-30 that they describe living persons with their current surname. Their list totals are consistent with that: between 2019 and 2020 the men's total moves by +0.10% and the women's by −0.14%, the smallest step in either list apart from the last one. That is consistent with the ruling, not proof of it. The claim marks the 2019 point with a code (`UNIVERSE_DESCRIPTION_DIFFERS`), and the page says so in a note.
   3. The female 2022-01-27 resource is a publisher duplicate of the 2021 one. The claim carries it as a **gap** (`PUBLISHER_DUPLICATE`), never a point. The page says so.
3. **Each point** is the surname's count on that edition, read from that edition's snapshot, with the edition's published total of people (the sum of every count on the list) and one in X over that total. The total comes from the registry, where it is pinned from the file's bytes and checked against the list-facts artefact for 2020–2026, not from summing stored rows, which are partial for an edition.
4. **A surname absent from an edition** gets a point with status `NOT_ON_LIST` and no count: it is below the publisher's floor of 2 or was not on the list, never zero. No claim is derived unless at least two points are known.
5. **The page shows the change beside the list's growth,** not instead of it: per edition, the count and one in X, and in the summary the change of the count and of the list total between the first and the last known point, each in per cent to one decimal. It states what changed. It never says why (births, deaths, marriages, migration, the register's coverage), and uses no word of popularity, decline or fashion.
6. **Confidence** follows the derived-statistic rule already in force (`assessDerivedStatistic`): every point is a verified official field, the computation is reproducible, the claim has no competing active claim. Rights follow the PESEL profile, evaluated for the surface like every PESEL-derived claim. Neither reads the other.
7. **Evidence and lineage.** Each known point has its own `OFFICIAL_DATASET_FIELD` evidence item. One `DERIVED_STATISTIC` evidence item holds the shares and the changes and depends on every point's evidence (role `COUNT`). The claim has one citation, to the dataset, naming every edition's resource in its locator.
8. **A new edition** extends the claim by a new claim key, and the previous claim is superseded, never rewritten.
9. **Scope.** National counts only. The 2025 regional edition is loaded and stays unread here: a regional change needs its own coverage rules (D-004) and is a separate decision.
10. **Rollout order.** The migration adding the claim type runs first; then the batch derives the claims; then the web deploy that reads them. The read is written so that a database without the claim type answers "no change section", not an error.

## 3. Why not the alternatives

- **Show raw counts only.** The list grows, so the reader would see a fall or a rise the list explains. One in X beside the count shows both.
- **Compute the series in the page or the API on request.** Presentation layers never derive facts (`AGENTS.md` §10), and every published figure needs evidence, confidence and a citation.
- **Leave 2019 out, as ADR-0019 does for the landing.** The owner ruled it in, and it adds the longest baseline. The cost is two series definitions on one site until the landing follows.
- **Store the trend in a table that is not a claim.** It would bypass the chain the product rests on.
- **Derive claims for every older edition's own count** (a `CURRENT_POPULATION` per edition). The pages would show several counts per list, which `TASK-045` excluded on purpose.

## 4. Consequences

- A migration adds one enum value, `SURNAME_DISTRIBUTION_SHIFT`, and its surname-scope check.
- The registry gains the people total of each national edition and an ordered list of the editions a trend reads.
- The contract `surname-result` becomes 1.7, additively: one nullable section, present exactly when the status is `RESOLVED`. A surname with no claim gets `UNAVAILABLE` with the reason `NO_CHANGE_DERIVED`, which does not say why (a surname on one edition and one the batch has not reached look the same to a request path that derives nothing), and the page shows no chapter for it.
- The batch is large: about 830,000 claims, each with up to ten or so rows of evidence. It is resumable, like the register build, and runs on the VM.
- Until a later task amends ADR-0019, the landing's Plate VII reads 2020–2026 and the surname page reads 2019–2026.

## Do not revisit unless

- the publisher states that the 2019 lists have a different universe, or
- the publisher explains the growth of the register and the explanation changes how a count across editions should be read.
