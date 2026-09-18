# DECISIONS_NEEDED.md — unresolved decisions

Only decisions that **materially affect implementation** and are not yet resolved. Speculative future choices do not belong here.

Resolved decisions move to `docs/adr/` and are deleted from this file.

Status legend: **BLOCKS TASK-00N** · **BLOCKS MILESTONE** · **NON-BLOCKING NOW**

---

## D-001 — Exact production PESEL resource, scope and version metadata

**Status:** BLOCKS TASK-004 (PESEL ingestion). Does not block TASK-001. **Still OPEN — TASK-002 attempted verification and was blocked before any source fact could be checked.**
**Owner:** project owner + TASK-002 source spike.

### TASK-002 attempt — BLOCKED (this session)

TASK-002 (`tasks/002-pesel-source-spike.md`) was picked up to resolve this decision. Its own source preflight requires confirming real outbound access to `dane.gov.pl` before doing anything else. That check failed:

- `https://dane.gov.pl/pl/dataset/1681,nazwis` — `EGRESS_BLOCKED` (confirmed via WebFetch)
- `https://dane.gov.pl/`, `https://www.dane.gov.pl/`, `https://api.dane.gov.pl/` — all returned `curl: (56) CONNECT tunnel failed, response 403` (confirmed via direct `curl` through this session's egress proxy)
- DNS resolution for `dane.gov.pl` succeeds (`185.41.93.178`) — this is a policy-level block at the egress proxy, not a DNS or connectivity fault, and not transient.

Per TASK-002 §11 and this session's own instructions: no dataset fact, resource ID, URL, date, schema, checksum or licence term was fabricated, inferred, or reconstructed from the canonical corpus to compensate. No mirror or third-party source was substituted. **Every one of the 20 facts TASK-002 §8 requires remains exactly as unverified as before this session** — none can be marked resolved without live access to the source.

**What must be supplied to unblock this**, either by a session with real outbound access to `dane.gov.pl`/`api.dane.gov.pl`, or manually by the project owner:

1. The current resource list from `https://dane.gov.pl/pl/dataset/1681,nazwis` — exact resource ID(s), title(s), and whether male/female surnames are separate resources.
2. The actual resource file(s) for the current annual snapshot, downloaded from that page (or via the Open Data API — its real endpoint also needs recording; `docs/canonical/12` §2.1 only describes it generically).
3. The portal's "Updated" timestamp for the dataset, as currently displayed.
4. Whether the resource file itself states its own reference date (distinct from the portal's "Updated" timestamp) — and if so, its value.
5. A SHA-256 checksum computed over the exact downloaded file(s).
6. The file's real encoding, delimiter, header row (exact column names as written), and one representative sample of values per column (to derive real types, not assumed ones).
7. Any resource-level notes or accompanying documentation stating: living-only scope, current-surname-field semantics, and the single-occurrence suppression rule and its exact threshold.
8. The dataset's licence/reuse/attribution statement as shown on the portal.
9. Approximately 20–50 representative real rows (or the full file, from which such a sample can be drawn) covering: Polish diacritics, common surnames, any distinct male/female forms the resource carries, and a near-threshold row if the resource's shape makes that observable.

Once supplied, a fresh TASK-002 implementation session can proceed directly to §4–§8 of `tasks/002-pesel-source-spike.md` without repeating this network check.

What is settled (`docs/canonical/12` §2.1): the source is the `dane.gov.pl` dataset *"Nazwiska występujące w rejestrze PESEL"*, dataset 1681, published by the Ministry of Digital Affairs. It covers surnames of living people using the current-surname field, omits surnames occurring only once, excludes deceased people, is updated annually, and was updated 2026-01-28. It is national, not regional.

What is not settled and must be pinned before ingestion:

- exact resource ID(s) and file(s) to import, and whether male and female surnames are separate resources;
- the resource structure: headers, column types, encoding, delimiter;
- the **resource reference date** as distinct from the **portal/dataset updated date** — both are needed, and they are not the same field;
- checksum of the exact file imported;
- reuse/attribution metadata sufficient to populate a `RightsProfile`;
- the denominator to be used for any `1-in-X` claim, and whether its population universe is actually compatible with the dataset's universe (living PESEL entries with a current-surname field) — if not, rarity is expressed as rank/percentile only;
- how "absent from the dataset" is represented, given single-occurrence suppression. Absence is not zero; a state such as `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT` is required.

**Why it blocks:** ingesting before this is pinned produces a `DistributionSnapshot` with unverifiable provenance and a rarity claim that may be arithmetically invalid.

---

## D-002 — Onomastics rights and source strategy

**Status:** BLOCKS the meaning/etymology capability (M2 onward). NON-BLOCKING for M0–M1.
**Owner:** project owner (commercial/legal outreach).

IJP PAN's *Internet Dictionary of Polish Surnames* is the strongest specialist source, but (`docs/canonical/12` §2.1, `docs/canonical/10` §5.3):

- its PESEL frequency/geography base is **2014**, so it is not a current-data source;
- being free to read establishes no permission for bulk commercial ingestion, caching or redistribution — status is partnership-required / legal-review.

Decision required:

- **Path A** — secure a commercial licence or partnership with IJP PAN or another specialist onomastic rights holder; or
- **Path B** — build meaning/origin claim-by-claim from lawful scholarly and public-domain sources, accepting lower coverage and more `INSUFFICIENT_DATA` results.

Either way, define what the product shows when neither path yields evidence for a surname. The answer must be an honest gap, never a generated etymology.

---

## D-003 — Polona rights per surface: metadata, OCR/transcription, image

**Status:** BLOCKS M3 (historical discovery). NON-BLOCKING now.
**Owner:** project owner + rights review, informed by the TASK-010 Polona spike.

Polona exposes object-level rights and they differ per object (`docs/canonical/12` §16.4). Three permissions must be modelled and evaluated **independently**: `metadata_rights`, `transcription_rights` (OCR), `image_rights`.

Decision required:

- the default posture when an object's rights are unknown or unreadable (proposed: fail closed — internal use only, no free/premium/SEO surface);
- whether OCR text extracted from a public-domain scan may be stored, excerpted and cited, and at what length;
- whether scans may be reproduced at all, or only linked with a stable locator;
- which surfaces (free / premium / SEO / share) each permission combination unlocks;
- attribution text and format required per rights state.

Consequence if unresolved: historical evidence can be discovered but not lawfully surfaced, which turns M3 into internal-only work.

---

## D-004 — Current regional surname map availability

**Status:** BLOCKS the current-geography capability indefinitely. NON-BLOCKING for the paid MVP critical path.
**Owner:** project owner (data licensing).

No lawful, genuinely current regional surname dataset is established (`docs/canonical/10` §5.2). The open PESEL surname dataset is national.

Decision required — one of:

- **Preferred** — licence a lawful dataset with appropriately current counts at voivodeship/powiat or equivalent level;
- **Fallback A** — use an older regional dataset, labelled with its actual snapshot date (e.g. "regional distribution in the 2014 PESEL snapshot"), clearly marked as not current;
- **Fallback B** — ship without modern regional distribution, keeping current national count → rarity → origin/meaning → historical evidence.

**Forbidden regardless of decision:** distributing a current national total across regions using old proportions and presenting the result as current fact. Current national count, current regional distribution, older regional distribution and historical occurrence map are four distinct things and must never be collapsed.

Until this is resolved, the current map stays conditional and the product ships without it.

---

## D-005 — RESOLVED (TASK-001)

**Resolution:** pin `postgis/postgis:16-3.4@sha256:44126d872ac91993766c341e369c539e8196614321765d36a6f1bab0419a5fa5` everywhere PostgreSQL is needed — local development, CI and Testcontainers.

- The digest was confirmed against Docker Hub's registry API at implementation time (not guessed): PostgreSQL 16, PostGIS 3.4.2.
- Used in `packages/testing/src/postgres-container.ts` (`POSTGRES_TEST_IMAGE`, Testcontainers), and in `.github/workflows/ci.yml`'s `services.postgres` block (same tag+digest, kept in sync by comment).
- Because `postgis/postgis` is built on top of the official `postgres` image, it carries every contrib module the stock image ships, including `pg_trgm`, in addition to PostGIS — one image satisfies both extensions.
- The bootstrap migration (`packages/db/migrations/0001_bootstrap_extensions.ts`) runs `CREATE EXTENSION IF NOT EXISTS postgis` and `CREATE EXTENSION IF NOT EXISTS pg_trgm`. Both are asserted present by `tests/integration/src/extensions.test.ts` (querying `pg_extension`), not by eye.
- Locally, this was additionally cross-checked against `postgresql-16` + the `postgresql-16-postgis-3` apt package (PostgreSQL 16.13, PostGIS 3.4.2) — see PROGRESS.md for why, and for the exact verification performed against a real database.

No further action needed. Do not revisit unless the pinned digest is deliberately rotated (a new ADR-0002-adjacent decision, not a re-litigation of the choice of image).

---

## Reviewed and not blocking TASK-001

Recorded so they are not re-raised:

- **Deployment host / blueprint details** — `docs/canonical/23` §6 recommends a single EU hosting plane. TASK-001 only needs CI and a local database; no hosting account is required to complete it.
- **Contract generator and OpenAPI version** — contract *semantics* are canonical (`docs/canonical/16` §1.3); generator choice is implementation detail, decided when contracts are actually built at M2.
- **Build orchestrator (Turborepo or equivalent)** — explicitly optional (`docs/canonical/23` §7). Not needed at TASK-001.
- **Analytics tooling** — decided in `docs/canonical/18`; not implemented before M2 and consent-gated when it is.
- **Payment provider** — decided in `docs/canonical/20`; irrelevant until M6 and deliberately blocked until premium inventory is proven.
