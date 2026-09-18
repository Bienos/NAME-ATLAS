# PESEL surname source — TASK-002 research record

Reproducible source-verification record for `tasks/002-pesel-source-spike.md` (D-001 in `docs/DECISIONS_NEEDED.md`).

**Status: IN PROGRESS.** Dataset-level facts are verified. The four current production/regional resource IDs are now verified. File-level facts (structure, encoding, checksum, real rows) remain unresolved — no file has been downloaded or inspected. **D-001 is not resolved.**

## How this record is being built

Automated access to `dane.gov.pl` and `api.dane.gov.pl` is blocked by this session's network egress policy (confirmed repeatedly: `WebFetch` returns `EGRESS_BLOCKED`; `curl` returns `CONNECT tunnel failed, response 403`; DNS resolves fine, so this is a policy block, not a connectivity fault — see `docs/DECISIONS_NEEDED.md` D-001 and `PROGRESS.md` for the exact checks run).

Per TASK-002 §11, the project owner is supplying the required evidence manually instead. **Facts recorded below as "source: project owner" were retrieved by the project owner directly from the official API and relayed into this session — not independently fetched or verified by this session.** Nothing below has been inferred, guessed, or reconstructed from the canonical corpus to fill a gap; every unresolved item is marked as such.

## Dataset-level facts — VERIFIED (source: project owner, manual retrieval from the official `dane.gov.pl` API, dataset 1681)

| Fact | Value | Corresponds to TASK-002 §8 item |
|---|---|---|
| Dataset ID | `1681` | 1 |
| Dataset slug (full, API form) | `1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel` | 1 |
| Dataset title | *Nazwiska występujące w rejestrze PESEL* | 1 |
| Publishing institution | Institution ID `333` — Ministerstwo Cyfryzacji (the Polish ministry `docs/canonical/12` §2.1 calls "the Ministry of Digital Affairs" — same institution, English gloss varies) | 1 |
| Licence | CC0 1.0 | 17 |
| Update frequency (stated) | Yearly | corroborates `docs/canonical/12` §2.1 ("updated annually"); not item 6/7 itself |
| Geography | Poland | context for D-004 — national scope confirmed, not regional; does not resolve D-004 |
| Population scope | Living persons only; deceased persons excluded | 12 |
| Surname field used | Current-surname field | 13 |
| Suppression rule | Surnames occurring exactly once are excluded | 14 |
| Dataset formats offered (platform-wide, not yet tied to a specific resource) | CSV, JSON-LD, XLSX | context for item 5 — not yet resource-specific |
| Resource count | 21 | context for item 2 — the set to narrow down |

### Item 15 — meaning of a missing surname row (derived, not independently new evidence)

Following directly from the verified suppression rule (item 14) and `docs/canonical/12` §9.5 / ARCHITECTURE.md §10 invariant 4: a surname absent from a PESEL surname resource means one of — zero living people carry it with that current-surname value, **or** exactly one person does (suppressed), **or** it is otherwise outside the resource's scope. It does **not** mean a confirmed zero. This is the `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT` state `docs/canonical/12` §9.5 anticipates. Marked verified on the strength of item 14; resource-level inspection should still confirm no additional, undisclosed suppression rule exists beyond "count = 1".

### Explicitly NOT inferred from dataset-level metadata (per the project owner's instruction)

- `verified` (a dataset-level verification timestamp) and `modified` (dataset-level "last modified") are **dataset metadata fields, not the PESEL data reference date**. Their existence is noted; their actual values were not included in what was relayed to this session, so they are not recorded here as dates. Do not treat either as item 6 or item 7 until a resource-level date is found and the relationship between the two is explicitly stated.
- No resource ID, title, download URL, format, checksum, header, field type or male/female split has been inferred from the dataset-level response. The dataset having 21 resources does not tell us which are the current male/female production resources — that is exactly what remains open.

## Resource-level facts — VERIFIED: current national production resources (source: project owner, manual retrieval from `/resources?per_page=100` on dataset 1681)

Retrieved via the resource listing endpoint (this session still cannot reach it directly — see "Next required evidence" below; the project owner supplied the response).

Per the project owner's explicit instruction, `data_date`, `created`, `modified`, `verified` and `retrieved_at` are distinct metadata fields and are **not** inferred from one another. Only `data_date` has a stated value below; the other four field names are known to exist on a resource object from this same API family, but no value for any of them (dataset- or resource-level) has been relayed to this session. They are recorded as "not yet supplied", not assumed equal to `data_date` or to each other.

| | Male | Female |
|---|---|---|
| Resource ID | `1148808` | `1148811` |
| Title | *Nazwiska męskie - stan na 2026-01-20* | *Nazwiska żeńskie - stan na 2026-01-20* |
| `data_date` | `2026-01-20` | `2026-01-20` |
| `created` | not yet supplied | not yet supplied |
| `modified` | not yet supplied | not yet supplied |
| `verified` | not yet supplied | not yet supplied |
| `retrieved_at` | not yet supplied | not yet supplied |
| Formats offered | XLSX, CSV, JSON-LD | XLSX, CSV, JSON-LD |

These two resources are recorded as the current 2026 national production pair (male/female separate resources, per item 4) for the same `data_date`. **Do not fall back to a 2025 or earlier resource** — noted per the project owner's explicit instruction, in case a future session is tempted to substitute an older resource for convenience.

`data_date` (`2026-01-20`) is treated as the **resource reference date** (item 6) — it is the resource's own stated date, distinct from any dataset-level portal-update timestamp. Item 7 (the portal/dataset "updated" date) remains unresolved: no value for `verified`/`modified`/`created` has been supplied at either the dataset or the resource level, so it cannot yet be compared against item 6. **Do not assume item 7 equals item 6** — that is exactly the conflation TASK-002 exists to prevent (`docs/canonical/12` §2.1, D-001).

## Resource-level facts — VERIFIED: current regional resources (same retrieval)

| | Male | Female |
|---|---|---|
| Resource ID | `1148786` | `1148790` |
| Title | *Nazwiska męskie wg województwa zameldowania na pobyt stały - stan na 2026-01-20* | *Nazwiska żeńskie wg województwa zameldowania na pobyt stały - stan na 2026-01-20* |
| `data_date` | `2026-01-20` | `2026-01-20` |

**These establish that a current (2026-01-20), lawful, official regional resource exists** — relevant to D-004 in `docs/DECISIONS_NEEDED.md`. This is a fact about resource *existence*, not a decision to build a regional map; see D-004 for the current status and what remains open.

### Hard semantic restriction on the regional resources

The regional dimension is **województwo zameldowania na pobyt stały** — voivodeship of *permanent registered residence* (a legal registration record), for the current-surname holder. Per the project owner's explicit instruction, this **must never be described, in any future task, claim, or UI copy, as**:

- surname origin;
- ancestry;
- birthplace;
- historical distribution;
- necessarily current physical residence (registered domicile and actual current residence can differ — people do not always update registration when they move).

It is, at most, a current administrative registration snapshot. Any future claim built on this resource must carry that exact scope in its methodology, not a looser gloss such as "where the surname comes from" or "where people with this surname currently live."

## Still unresolved (file-level — no file has been downloaded or inspected)

| TASK-002 §8 item | Status | Note |
|---|---|---|
| 2 — exact resource ID(s) | **VERIFIED** | National: `1148808` (male), `1148811` (female). Regional: `1148786` (male), `1148790` (female). |
| 3 — exact download/API identifier | PARTIAL | Resource IDs and titles known; the exact file-download URL/mechanism for a given resource ID has not been supplied or attempted (this session's `api.dane.gov.pl` access remains blocked — see below). |
| 4 — male/female resource structure | **VERIFIED** | Separate resources per sex, confirmed for both the national and regional pairs. |
| 5 — exact file structure | UNRESOLVED | No file downloaded; headers/types are per-format and per-file facts, not resource-listing facts. |
| 6 — resource reference date | **VERIFIED (national and regional)** | `data_date = 2026-01-20` for all four resources above. |
| 7 — portal/dataset "updated" date, distinct from item 6 | UNRESOLVED | `created`/`modified`/`verified`/`retrieved_at` field names are known to exist; no values supplied at dataset or resource level. Do not infer from `data_date`. |
| 8 — SHA-256 checksum | UNRESOLVED | Requires the downloaded file bytes. |
| 9 — encoding | UNRESOLVED | Requires the downloaded file. |
| 10 — exact headers | UNRESOLVED | Requires the downloaded file. |
| 11 — exact field types | UNRESOLVED | Requires the downloaded file. |
| 18 — reproducible metadata record | IN PROGRESS | This document; complete once items 5–11 are filled in for the two national resources. |
| 19 — fixture (~20–50 real rows) | UNRESOLVED | Cannot select real rows without a downloaded file. |
| 20 — fail-closed schema validator | UNRESOLVED | Cannot write a schema against an unconfirmed file structure (TASK-002 §4 item 12 requires the *confirmed* structure). |

## Next required evidence

To finish TASK-002 for the national pair (the ingestion target — the regional pair is D-004's concern, not TASK-002's, per the out-of-scope note above), the following must still be supplied — this session's `dane.gov.pl`/`api.dane.gov.pl` access remains blocked (reconfirmed again this session: `curl` → `CONNECT tunnel failed, response 403` on `dane.gov.pl` and on `api.dane.gov.pl/1.4/resources/1148808,...`; `WebFetch` → `EGRESS_BLOCKED`):

1. The actual CSV file bytes for resource `1148808` (male) and `1148811` (female) — or the exact download URL(s) for them, so a future session with access can fetch them itself.
2. The exact header row and a representative sample of values per column, from the real file (to derive real field types, not assumed ones).
3. The file's real encoding (as observed from the bytes, not assumed from a declared content-type) and delimiter.
4. A SHA-256 checksum computed over the exact downloaded file(s).
5. Values for `created`, `modified`, `verified`, `retrieved_at` at the resource and/or dataset level, if available, to resolve item 7 and its relationship to `data_date` (item 6).
6. Approximately 20–50 representative real rows (or the full file, from which such a sample can be drawn) — the fixture required by TASK-002 §6.

## D-001 status

**OPEN — substantially advanced, not resolved.** Items 1, 2, 4, 6, 12, 13, 14, 15, 17 are now verified. Items 3 (partial), 5, 7, 8, 9, 10, 11, 19, 20 remain unresolved and require the actual national CSV files (male `1148808`, female `1148811`) to be inspected. D-001 must not be closed until those are verified.
