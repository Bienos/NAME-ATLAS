# TASK-044 — The landing atlas's last panel shows how the two lists changed, 2020–2026

- **Status:** IN PROGRESS (2026-09-30).
- **Requested by:** the project owner, 2026-09-30. On the live six-plate atlas (TASK-043), they asked that the last panel use more data. Offered three options, they chose "Real trend 2019–2026".
- **Depends on:**
  - TASK-043: `list_facts@2`, the six plates and ADR-0018;
  - TASK-042's database cutover: production's search answers for every surname, so named surnames can link.
- **Decision:** ADR-0019 (Proposed; accepted by merging).

---

## 1. Goal

The coda "Trend potrzebuje dwóch wydań. Mamy jedno." becomes **Plate VII · Zmiany w czasie**, built from the published editions of the same two lists. Per list, it shows:

- the surnames and the people on each edition of the series, in a small chart;
- a gap where an edition is missing (female 2022-01-27, a publisher duplicate);
- between the first edition (2020-01-22) and the last (2026-01-20):
  - the change in surnames and in people;
  - the surnames on the last edition that were not on the first, and the reverse;
- the first-edition counts of the last edition's three most common surnames (ADR-0018 `TOP_3`);
- whether the ten most common surnames, in order, are the same as on the first edition.

On every plate, named surnames become links to `/?surname=`.

## 2. Figures found on 2026-09-30 (to be reproduced by the generator, not copied)

| List | 2020-01-22 | 2021 | 2022-01-27 | 2023-01-30 | 2024-01-19 | 2025-01-22 | 2026-01-20 |
|---|---|---|---|---|---|---|---|
| male surnames / people | 283 221 / 19 879 045 | 298 692 / 19 987 207 (02-01) | 322 232 / 20 203 548 | 363 360 / 20 808 071 | 379 712 / 20 976 785 | 395 127 / 21 096 170 | 408 182 / 21 197 537 |
| female surnames / people | 299 612 / 20 220 345 | 311 240 / 20 263 212 (02-02) | gap: resource 38772 is byte-identical to 35279 | 389 365 / 21 369 477 | 400 764 / 21 479 386 | 411 012 / 21 535 515 | 420 082 / 21 560 302 |

Between 2020 and 2026:

- **On the 2026 list but not the 2020 one:** male 129 524 surnames (434 589 people); female 129 203 (468 988).
- **On the 2020 list but not the 2026 one:** male 4 563 surnames; female 8 733.
- **The three most common surnames:**
  - NOWAK 101 036 → 98 387, KOWALSKI 68 406 → 66 589, WIŚNIEWSKI 54 343 → 53 079 (male);
  - NOWAK 102 944 → 99 738, KOWALSKA 69 581 → 67 308, WIŚNIEWSKA 55 553 → 54 177 (female).
- **The ten most common surnames:** the same, in the same order, on both lists.

## 3. Registry additions (bytes of the CSV endpoint `https://api.dane.gov.pl/resources/<id>,<slug>/csv`; stable across two downloads)

| id | role | data date | sha256 | bytes | rows |
|---|---|---|---|---|---|
| 22817 | national_male | 2020-01-22 | a6af514f921c30771591bced6785c6559d63f5e88868e25eaad130eb36fd805d | 3 662 490 | 283 221 |
| 28052 | national_male | 2021-02-01 | ea466f2b8611be038913c6354bb13a5d029f5ff0ced07eea7ef282f5f52c215c | 3 859 773 | 298 692 |
| 36401 | national_male | 2022-01-27 | 4389d8964dd37c7ab71306d537e98b365e171831d2be9e63b84bdcaaf33ca68d | 4 160 756 | 322 232 |
| 44647 | national_male | 2023-01-30 | 7e95c307a2ebf62b1ea14b936925c46cc0b6db960dec8fc98c6b5fe8980f9af0 | 4 692 377 | 363 360 |
| 54097 | national_male | 2024-01-19 | 3c722cada73f0b52184931a4cc521a5c7d6905683f5103a417f867fd9547be0e | 4 904 484 | 379 712 |
| 63892 | national_male | 2025-01-22 | 079695630265bf0bcb2f944743799850465123fbd280ead736f3274d867818cb | 5 114 559 | 395 127 |
| 22815 | national_female | 2020-01-22 | b0ede69ca79698cd8f6b09462916234be67dd4322d888e6a9263b89a52bfd99b | 3 988 200 | 299 612 |
| 35279 | national_female | 2021-02-02 | 9af26480ed3035e7e6b9349033c4ccd76bee3eeb5e8ac7ce299a8d00ba0b62e0 | 4 141 803 | 311 240 |
| 44646 | national_female | 2023-01-30 | 326bfc3dcf2b55886073a46780acaefec3fb2bc4444f6ddbc052938c1aa05cb2 | 5 169 657 | 389 365 |
| 54098 | national_female | 2024-01-19 | 7988d01d8f85f84cd84bb0069b9129c9b3944aba5349709cffca21555d6fcf28 | 5 324 053 | 400 764 |
| 63888 | national_female | 2025-01-22 | 9ac287db5266fc03d3e24a497244d071b3ef2fb4907c43c2b07844912db0d27a | 5 465 724 | 411 012 |
| 38772 | refused | 2022-01-27 | 9af26480… (= 35279) | 4 141 803 | 311 240 |

- The 2020 files head their columns `Nazwisko aktualne,Liczba`, as 2026 does.
- The 2019 files head theirs `nazwisko,liczba` and are not registered (ADR-0019 §2.2).
- Resource 44646's portal `data_date` says 2023-01-31; its title and description say "stan na 30.01.2023", and the reference date is the stated one.

## 4. In scope

1. **`packages/sources`:**
   - the eleven descriptors, with a `series` key on every national descriptor (2026 included);
   - resource 38772 recorded as refused, with its reason;
   - `fetch-pesel` able to download the series;
   - tests.
2. **`packages/contracts`:** `list_facts@3`, adding a per-list `editions` section (each edition's lineage, surnames and people, and gaps with their reason) and a `change` section (§1). Tests and `docs/contracts/list-facts.md`.
3. **`packages/truth`:** pure derivations with tests; the generator reads the series (every file gated); the regenerated artefact.
4. **`apps/web`:**
   - Plate VII replaces the coda;
   - named surnames on every plate link to `/?surname=`;
   - Polish and English copy;
   - tests.
5. ADR-0019, a line in `ARCHITECTURE.md` §10, this file, `STATUS.md`, `docs/CODEMAP.md` and a `docs/progress/` record.

## 5. Out of scope

- The 2019 editions, and the regional files of earlier years.
- Per-surname trends on the surname page.
- Any cause of a change.
- Any surname named for its growth.

## 6. Acceptance criteria

- **AC-01:** Each new descriptor's checksum, size and row count equal the bytes, and the generator refuses a file that differs. Resource 38772 is refused as a duplicate. Tested, and run on the real files.
- **AC-02:** The schema rejects each of these:
  - editions out of date order;
  - a gap without a reason;
  - a change figure that does not equal the difference between the last and first editions;
  - editions of different series in one list.
- **AC-03:** `pnpm truth:list-facts` twice writes byte-identical output. Every new figure agrees with an independent recount from the raw CSVs, and the progress record shows both.
- **AC-04:** Plate VII renders for both lists from `listFacts()`.
  - Every number on it is a stored value, and no number is a sum of the two lists.
  - The female 2022 gap is shown as a gap with its reason.
  - The copy guard passes, with "przyczyn" wording absent.
- **AC-05:** Every named surname on the page is a selection at or above the floor and links to `/?surname=<published>`. No surname appears for its growth.
- **AC-06:** Fail-soft, overflow, targets and reduced motion as in TASK-043's AC-06 and AC-07.
- **AC-07:** `pnpm check:ids`, `typecheck`, `lint`, `format:check`, `test` and `build` pass.

## 7. Definition of done

- Every acceptance criterion is shown by a command or test that was run.
- Merge. `main` deploys to production. Verify Plate VII live with curl.

**STOP.**
