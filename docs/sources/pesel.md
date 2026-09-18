# PESEL surname source — TASK-002 research record

Reproducible source-verification record for `tasks/002-pesel-source-spike.md` (D-001 in `docs/DECISIONS_NEEDED.md`).

**Status: IN PROGRESS.** Dataset-level facts are verified. All resource-level facts (items 2–11, 19–20 below) remain unresolved pending the resource listing. **D-001 is not resolved.**

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

## Resource-level facts — UNRESOLVED (blocks D-001; needed for TASK-004)

| TASK-002 §8 item | Status | Note |
|---|---|---|
| 2 — exact resource ID(s) | UNRESOLVED | Requires the resource listing. Next step below. |
| 3 — exact download/API identifier | PARTIAL | Dataset-level API identifier known (slug above); resource-level identifier UNRESOLVED. |
| 4 — male/female resource structure | UNRESOLVED | 21 resources exist; which are current male/female production resources is not yet known. |
| 5 — exact file structure | UNRESOLVED | |
| 6 — resource reference date | UNRESOLVED | Must come from resource metadata, not dataset `verified`/`modified` (see above). |
| 7 — portal/dataset "updated" date, as distinct from item 6 | UNRESOLVED | Field(s) exist at dataset level (`verified`, `modified`); actual values not yet recorded. Relationship to item 6 still to be established once item 6 is known. |
| 8 — SHA-256 checksum | UNRESOLVED | No file downloaded yet. |
| 9 — encoding | UNRESOLVED | |
| 10 — exact headers | UNRESOLVED | |
| 11 — exact field types | UNRESOLVED | |
| 18 — reproducible metadata record | IN PROGRESS | This document; complete once items 2–11 are filled in. |
| 19 — fixture (~20–50 real rows) | UNRESOLVED | Cannot select real rows without a downloaded resource. |
| 20 — fail-closed schema validator | UNRESOLVED | Cannot write a schema against an unconfirmed structure (TASK-002 §4 item 12 requires the *confirmed* structure). |

## Next required evidence

Resource listing for dataset 1681:

```text
https://api.dane.gov.pl/1.4/datasets/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel/resources
```

This session confirmed (again) that it cannot reach this URL — `curl` returns `CONNECT tunnel failed, response 403`; `WebFetch` returns `EGRESS_BLOCKED`. The project owner will need to supply this response the same way as the dataset-level facts above: retrieved manually, then relayed here. Once supplied, this record should be updated with:

- the full resource list (21 entries): each resource's ID, title, format, and any date fields it carries;
- identification of which resource(s) are the current male and female (or combined) production files;
- from there, the actual file download, checksum, structure, and fixture selection per TASK-002 §4.

## D-001 status

**OPEN.** Dataset-level facts are now verified and recorded above. All resource-level facts remain unresolved. D-001 must not be marked resolved until items 2–11 and 19–20 are filled in from verified resource-level evidence.
