# National trends, diversity, gender, living vs deceased, and language trivia (fact lab: national family)

This is a research prototype. It shows which national "did you know?" facts, trend cards and editorial stories the official data can honestly support. It is not product code.

Every number below was produced by the scripts in `scripts/national/` (entry point `run_all.py`) on the files listed in the next section. Nothing was estimated or filled in from memory.
- Numbers that are not a cell of a result CSV are written to `data/national/notes_derived_numbers.csv` by `z_notes_numbers.py`.
- Console-only statistics are in the run log, `/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad/analysis/national/run_all.log`.

## Files, versions, methods

**Sources.** All PESEL files are from the Ministry of Digital Affairs on dane.gov.pl, CC0 1.0 at dataset level. Full SHA-256 values are in `/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad/data/pesel_sha256.txt`. `a00_data_quality.py` re-hashes every file on each run. In this session all 21 files matched the pinned list.

| Role | Files (dataset_sex_date_resource) | Reference dates | SHA-256 (first 12) |
|---|---|---|---|
| Living persons, national, **male list** (1681) | `1681_M_2019-06-30_r18990`, `…2020-01-22_r22817`, `…2021-02-01_r28052`, `…2022-01-27_r36401`, `…2023-01-30_r44647`, `…2024-01-19_r54097`, `…2025-01-22_r63892`, `…2026-01-20_r1148808` | 8 dates | `e975ecc4226a`, `a6af514f921c`, `ea466f2b8611`, `4389d8964dd3`, `7e95c307a2eb`, `3c722cada73f`, `079695630265`, `ce4238feda85` |
| Living persons, national, **female list** (1681) | `1681_F_2019-06-30_r18988`, `…2020-01-22_r22815`, `…2021-02-02_r35279`, `…2023-01-30_r44646`, `…2024-01-19_r54098`, `…2025-01-22_r63888`, `…2026-01-20_r1148811` | 7 dates | `c35e44779eb3`, `b0ede69ca796`, `9af26480ed30`, `326bfc3dcf2b`, `7988d01d8f85`, `9ac287db5266`, `c508680d084d` |
| Excluded: "2022" female file | `1681_F_2022-01-27_r38772` | none | `9af26480ed30`. **Byte-identical to the 2021 female file**, so there is no female 2022 snapshot. |
| Register **including deceased** persons, national (568) | `568_M_2024-01-19_r54119`, `568_M_2025-01-22_r63886`, `568_F_2024-01-19_r54120`, `568_F_2025-01-22_r63883`, `568_F_2026-01-20_r1148815` | 2024-01-19, 2025-01-22 (M, F), 2026-01-20 (F only; no male 2026 file exists) | `f72e322f7f4c`, `8dbc1dd6255e`, `c158b6ffa5f2`, `be688569c120`, `4aea1ca60348` |
| SGJP inflection data (Morfeusz 2 release 2026-08-24, BSD-2) | `sgjp.tab.gz` | none | `3b2ee079143b` |
| sjp.pl word list with inflected forms (`odm.txt`; CC BY 4.0 or Apache 2.0, credit sjp.pl) | `sjp_odm.zip` | none | `d8c2390462b8` |

**Counting unit and wording.**
- "Entries" means occurrences (`Liczba`) in the register. That one entry equals one person is **not verified** (D-006, open). No sentence below says "people".
- Single occurrences are suppressed at source, so a missing form means "**fewer than 2 entries or absent**", never zero.
- The register includes foreigners living in Poland.
- No voivodeship data is used in this family.

**Two lists, never merged.** The male list and the female list are always shown side by side. Every user-facing sentence below gives the two figures separately. Paired totals (`PAIR-V1` units, M + F) appear only as internal analysis and are marked *(internal)*. Two recorded project decisions bind this family:
- **TASK-004 U-1 / AC-17** forbids summing, merging *and comparing* the two partitions in the product data model. The publisher does not say whether the split is by the bearer's sex or by the grammatical form. This hits A6 (F/M ratios) directly; see A6.
- **D-006** blocks any rarity or 1-in-X derivation until the unit and a compatible denominator are settled. Shares and 1-in-X values below are research only.

**Method tags.** Each is defined in `common.py` or in the script header.

| Tag | Definition |
|---|---|
| `PAIR-V1` | A form ending -SKA/-CKA/-DZKA maps to -SKI/-CKI/-DZKI; every other form is its own key. -Y/-A, -OV/-OVA and similar are **not** paired. |
| `RANK-V1` | Competition ranking ("1224") within **one** list at one date. |
| `SHARE-V1` (sex-specific) | Entries ÷ all published entries in that list. |
| `ONEIN-V1` | round(denominator ÷ entries), with the same denominator. |
| `SUFFIX-V1` | First matching spelling rule. Placeholder values get their own class since this session. |
| `GENDER-V1` | F-list entries ÷ M-list entries of the paired form. |
| `AGE-V1` | (including-deceased − living) ÷ including-deceased, same form, same list, same date. |
| `ELIG-V1` | Editorial minimum (rule 7) applied **per list**: the male form has ≥20 entries in the male list, or the female form has ≥20 entries in the female list. |
| `LEX-V1` | Surname in lowercase = a lowercase base form in sjp.pl `odm.txt`; part of speech comes from SGJP common-word lemmas. |
| `DECL-V1` | SGJP surname lemmas (m1 for men, f for women), forms by case and number, **depreciative (`depr`) forms excluded and never shown**. |

**Denominators, 2026-01-20.**
- Male list: 21,197,537 entries in 408,182 file rows.
- Female list: 21,560,302 entries in 420,082 rows.
- Both include the placeholder-like values NN = 8 and XXX = 4 (male list) and NN = 3 (female list). Without them the lists have 408,180 and 420,081 forms. Suppressed singletons are not in any denominator.

**How the -SKA overlap is handled.**
- The 2026 male list has **632 forms ending -SKA/-CKA/-DZKA** (43,991 entries; 563 single-word). Examples: KRASKA 2,446, KLUSKA 2,335, GĄSKA 2,213. These are invariant surnames, not feminine forms (DQ-09b).
- Naive -SKI/-SKA pairing would merge the female-list KRASKA with KRASKI. This analysis handles it in three ways:
  1. User-facing figures are **per-list exact forms**, so they are unaffected.
  2. `PAIR-V1` flags a unit as a collision when its -SKA form has ≥20 male-list entries: 225 keys in 2026, 129,102 unit entries (DQ-09). Those units are excluded from paired movers, F/M ratio statistics and paired ageing extremes.
  3. KRASKA itself is read as the same form in both lists (invariant override).
- The regional family used a different tie-break (`pair-v1.1`), but the per-list numbers agree. KOWALSKI 66,589 (M) + KOWALSKA 67,308 (F) are the two cells behind the regional notes' paired 133,897. The internal `PAIR-V1` unit (134,435) also counts 535 female-list KOWALSKI and 3 male-list KOWALSKA entries.

**Changes in this resumed session.**
- **Checked.** `run_all.log` showed all 10 steps finished without errors. Regenerating the 27 CSVs from the scripts gave byte-identical files, so the repo script copies matched the outputs.
- **Fixed (`a03`).** `SUFFIX-V1` counted placeholders as surnames: `BRAK DANYCH`/`BRAK NAZWISKA` as SPACE_SEPARATED, "-" as HYPHENATED and "." as OTHER. Example: male 2019 SPACE_SEPARATED was 21,469 entries; corrected, it is 20,296.
- **Fixed (`a09`).** `sgjp_declension.csv` printed the pejorative plural forms in a column. It is now a yes/no flag.
- **Added (rule 10).** Per-list figures:
  - A1 share and 1-in-X;
  - A8 index and counts per list;
  - A9/A10 counts and per-list ranks, with eligibility switched to `ELIG-V1` (136,968 → 103,330 eligible units);
  - per-list first letters and rare letters.
- **Added (checks).**
  - `topn_direction_2019_2026.csv`, `deceased_consistency_checks.csv`, `words_summary_by_list_2026.csv` and `notes_derived_numbers.csv`;
  - DQ-09b and DQ-10;
  - a max-entries column in `entry_exit_summary.csv`.
- **Rerun.** The whole pipeline was rerun end to end several times (about 2.5 minutes per run). The final run reproduced every CSV byte for byte, and `scripts/national/` equals the scratchpad copy.

**Showcase surnames.** NOWAK; KOWALSKI/KOWALSKA; WIŚNIEWSKI/WIŚNIEWSKA; KACZMAREK; SZCZEPAŃSKI/SZCZEPAŃSKA; GRZEGORCZYK; CZEKIERDA. Extras chosen by the earlier run:
- **MAZUR**: of the 100 most common forms of June 2019, the only one with more entries in 2026 in *both* lists.
- **KRASKA**: an invariant -SKA surname in the male list, which shows the pairing collision.
- **KOZIOŁ**: SGJP accepts two genitives.

All per-surname values are in `showcase_surnames.csv` (one row per metric, with scope, date, source files, method and proposed label). Yearly series are in `showcase_yearly_series.csv`.

---

## A1. Baseline surname card

**What the user sees**

- EN: "NOWAK: 98,387 entries in the male list and 99,738 in the female list of the PESEL register of living persons (as of 20 Jan 2026). It is the most common surname in both lists."
- PL: „NOWAK: 98 387 wpisów w wykazie nazwisk męskich i 99 738 wpisów w wykazie nazwisk żeńskich rejestru PESEL osób żyjących (stan na 20.01.2026). To pierwsze miejsce w obu wykazach.”
- EN, rare surname: "CZEKIERDA: 217 entries in the male list (position 14,932) and 212 in the female list (position 15,540), PESEL register of living persons, 20 Jan 2026."
- Only after D-006 is resolved: "About 1 in 215 entries in the male list of the PESEL register of living persons is NOWAK (1 in 216 in the female list; 20 Jan 2026)."

**Where it's used.** Surname page (core card). Premium report (rank history per list).

**Data & method.**
- Counts are the raw `Liczba` of the exact form: the male form in the male list and the female form in the female list (`PAIR-V1` feminine for -SKI, otherwise the same form).
- Rank is `RANK-V1` within each list.
- Share and 1-in-X use `SHARE-V1`/`ONEIN-V1` with that list's own denominator.
- Cross-form entries go in a footnote, e.g. KOWALSKI written in the female list.

**Real results** (2026-01-20; `showcase_surnames.csv`, `notes_derived_numbers.csv`)

| Surname | Male list: entries (rank) | share / 1 in X | Female list: entries (rank) | share / 1 in X | Cross-forms (footnote) |
|---|---|---|---|---|---|
| NOWAK | 98,387 (1) | 0.4641% / 215 | 99,738 (1) | 0.4626% / 216 | none |
| KOWALSKI / KOWALSKA | 66,589 (2) | 0.3141% / 318 | 67,308 (2) | 0.3122% / 320 | KOWALSKI in F list 535; KOWALSKA in M list 3 |
| WIŚNIEWSKI / WIŚNIEWSKA | 53,079 (3) | 0.2504% / 399 | 54,177 (3) | 0.2513% / 398 | WIŚNIEWSKI in F list 203 |
| KACZMAREK | 29,820 (18) | 0.1407% / 711 | 30,240 (18) | 0.1403% / 713 | none |
| SZCZEPAŃSKI / SZCZEPAŃSKA | 16,419 (63) | 0.0775% / 1,291 | 16,778 (63) | 0.0778% / 1,285 | SZCZEPAŃSKI in F list 62 |
| GRZEGORCZYK | 5,128 (370) | 0.0242% / 4,134 | 5,334 (362) | 0.0247% / 4,042 | none |
| CZEKIERDA | 217 (14,932) | 0.0010% / 97,685 | 212 (15,540) | 0.0010% / 101,700 | none |
| MAZUR | 34,576 (13) | 0.1631% / 613 | 35,206 (13) | 0.1633% / 612 | none |
| KRASKA | 2,446 (1,035) | 0.0115% / 8,666 | 2,495 (1,017) | 0.0116% / 8,641 | invariant form in both lists |
| KOZIOŁ | 11,991 (103) | 0.0566% / 1,768 | 11,573 (118) | 0.0537% / 1,863 | none |

`top_units_2026.csv` holds the top 200 units with both list counts.

**Rules & caveats**

- **Proposed labels.**
  - Counts and within-list ranks: **VERIFIED** ("the file lists N entries").
  - Share and 1-in-X: **LIKELY** (derived), and **product use is BLOCKED by D-006**. The unit is unverified and the denominator is published list entries, not a population figure.
- Never add the two lists into one headline number or one ranking. Never say "people", "Poles" or "women/men". Say "entries in the male/female list".
- `PAIR-V1` does not pair adjectival -Y/-A surnames. On a KONIECZNY page the v1 female-list figure is the female-list form KONIECZNY (2,503). KONIECZNA (11,693) is a separate unit until pairing is extended (`pairing_gaps_2026.csv`).
- KRASKA must never be shown as the "female form of KRASKI".

**Presentation idea.** A two-column card (male list | female list) on one scale, with a rank badge per list. Cross-form entries go in a muted footnote. Add the 1-in-X icon row only after D-006.

**Interest rating: 5.** This is the core card of every surname page, and every value is a direct file reading.

---

## A2. Per-surname trend, June 2019 → January 2026

**What the user sees**

- EN: "Entries for NOWAK in the male list fell from 101,473 (30 Jun 2019) to 98,387 (20 Jan 2026), −3.04%. In the female list they fell from 103,439 to 99,738, −3.58% (PESEL register of living persons)."
- PL: „Liczba wpisów NOWAK w wykazie nazwisk męskich rejestru PESEL osób żyjących spadła z 101 473 (stan na 30.06.2019) do 98 387 (20.01.2026), czyli o 3,04%. W wykazie żeńskim spadła z 103 439 do 99 738 (o 3,58%).”
- EN: "Of the 100 most common surnames in the female list of the PESEL register of living persons in June 2019, only MAZUR has more entries in January 2026: 35,206 against 34,184 (30 Jun 2019 → 20 Jan 2026). In the male list two rose: MAZUR (34,033 → 34,576) and KOZAK (12,733 → 13,597)."
- PL: „Spośród 100 najczęstszych nazwisk w wykazie żeńskim rejestru PESEL osób żyjących z czerwca 2019 r. tylko MAZUR ma w styczniu 2026 r. więcej wpisów: 35 206 wobec 34 184. W wykazie męskim wzrosły dwa: MAZUR (34 033 → 34 576) i KOZAK (12 733 → 13 597).”

**Where it's used.** Surname page (sparkline per list). Editorial ("the biggest surnames are shrinking while the lists grow"). Premium report (full series).

**Data & method.**
- Raw values per list and date (`showcase_yearly_series.csv`). Change = (b − a)/a.
- **June 2019.** The first snapshot is dated 30 June; the rest are January. The span 2019-06-30 → 2026-01-20 is 2,396 days, or 6.56 years.
- For a same-season comparison, the notes also give 2020-01-22 → 2026-01-20 (6.00 years).
- **Female 2022.** It is a copy of 2021 and is excluded. The female series has a gap: do not interpolate or draw a line through it.
- The 2021 male and female dates differ by one day (1 and 2 Feb).
- The 2019 file has a discontinuity for rare and hyphenated forms (DQ-10). Common surnames look continuous (NOWAK male list 2019 101,473 → 2020 101,036). For rare forms, prefer 2020 as the baseline.
- `topn_direction_2019_2026.csv` counts how many of each list's top-N forms of the base year fell or rose.

**Real results**

| Surname | Male 2019 → 2026 | Δ% | Female 2019 → 2026 | Δ% | Δ% 2020 → 2026 (M / F) | Δ% 2025 → 2026 (M / F) | Rank 2019 → 2026 (M; F) |
|---|---|---|---|---|---|---|---|
| NOWAK | 101,473 → 98,387 | −3.04 | 103,439 → 99,738 | −3.58 | −2.62 / −3.11 | −0.48 / −0.58 | 1 → 1; 1 → 1 |
| KOWALSKI / KOWALSKA | 68,692 → 66,589 | −3.06 | 69,920 → 67,308 | −3.74 | −2.66 / −3.27 | −0.45 / −0.61 | 2 → 2; 2 → 2 |
| WIŚNIEWSKI / WIŚNIEWSKA | 54,559 → 53,079 | −2.71 | 55,816 → 54,177 | −2.94 | −2.33 / −2.48 | −0.56 / −0.45 | 3 → 3; 3 → 3 |
| KACZMAREK | 30,776 → 29,820 | −3.11 | 31,266 → 30,240 | −3.28 | −2.58 / −2.82 | −0.38 / −0.67 | 18 → 18; 18 → 18 |
| SZCZEPAŃSKI / SZCZEPAŃSKA | 16,894 → 16,419 | −2.81 | 17,393 → 16,778 | −3.54 | −2.52 / −3.01 | −0.62 / −0.47 | 63 → 63; 63 → 63 |
| GRZEGORCZYK | 5,275 → 5,128 | −2.79 | 5,513 → 5,334 | −3.25 | −2.64 / −2.86 | −0.60 / −0.58 | 370 → 370; 359 → 362 |
| CZEKIERDA | 225 → 217 | −3.56 | 232 → 212 | −8.62 | −3.98 / −7.42 | −0.91 / −2.75 | 13,725 → 14,932; 13,562 → 15,540 |
| MAZUR | 34,033 → 34,576 | +1.60 | 34,184 → 35,206 | +2.99 | +1.72 / +3.16 | −0.05 / −0.18 | 14 → 13; 14 → 13 |
| KRASKA | 2,495 → 2,446 | −1.96 | 2,562 → 2,495 | −2.62 | −1.73 / −2.12 | −0.24 / −0.76 | 1,020 → 1,035; 1,001 → 1,017 |
| KOZIOŁ | 12,321 → 11,991 | −2.68 | 12,101 → 11,573 | −4.36 | −2.38 / −4.15 | −0.33 / −0.58 | 104 → 103; 114 → 118 |

Series notes:
- MAZUR peaked in 2025 in both lists (34,595 M; 35,269 F). Every other showcase surname peaked in 2019, except CZEKIERDA's male list, which peaked in 2021 at 227.
- CZEKIERDA's rank drop comes from other forms overtaking it, not from newly published forms. It lost only 8 (M) and 20 (F) entries.
  - Male list: 1,293 forms that had no more entries than CZEKIERDA in 2019 now have more. None of the forms above it in 2026 is newly published.
  - Female list: 1,988 overtook it, and 1 form above it is newly published.
  - Placeholder values are excluded from this count (`notes_derived_numbers.csv`).

Top-N direction (`topn_direction_2019_2026.csv`):

| Base (June 2019) | Male list: fell / rose / unchanged | Female list: fell / rose / unchanged |
|---|---|---|
| top 10 | 10 / 0 / 0 | 10 / 0 / 0 |
| top 100 | 98 / 2 (MAZUR, KOZAK, rank 99) / 0 | 99 / 1 (MAZUR) / 0 |
| top 1,000 | 971 / 28 / 1 | 973 / 27 / 0 |

Over the same span the lists themselves grew: male list 19,859,783 → 21,197,537 entries (+6.74%) and female list 20,249,319 → 21,560,302 (+6.47%). KOZAK was rank 109 in the 2019 female list, so it is outside that list's top 100.

**Rules & caveats**

- **Proposed labels.**
  - Values and arithmetic: **VERIFIED**.
  - "Trend" wording: **LIKELY**.
  - Causes: **INSUFFICIENT_DATA**. The files separate no births, deaths, surname changes, registrations or deregistrations.
- Never "dying out", "disappearing" or "in decline because…". Always print both dates, and flag that 2019 is a June snapshot.
- Do not join 2021 to 2023 in the female series as if 2022 existed.

**Presentation idea.** Small multiples: two lines per surname (M, F) indexed to January 2020 = 100. Mark 2019 with a hollow "June" dot and show a gap at female 2022. The editorial card uses the top-100 table as a bar pair.

**Interest rating: 4.** The data is clean and it is a natural surname-page chart, but the changes are small (−2% to −4%) for most surnames.

---

## A3. Biggest movers and spelling-class trends

**What the user sees**

- EN: "Between 30 Jun 2019 and 20 Jan 2026 the largest fall in entries in both lists of the PESEL register of living persons was NOWAK: −3,086 in the male list (−3.04%) and −3,701 in the female list (−3.58%)."
- EN: "Surnames spelled with the ending -ENKO made up 0.25% of male-list entries in June 2019 and 0.98% in January 2026. In the female list the figures are 0.19% and 1.21% (PESEL register of living persons)."
- PL: „Nazwiska zakończone na -ENKO stanowiły 0,25% wpisów w wykazie nazwisk męskich w czerwcu 2019 r. i 0,98% w styczniu 2026 r.; w wykazie żeńskim 0,19% i 1,21% (rejestr PESEL osób żyjących).”

**Where it's used.** Editorial (a neutral "the register's spelling is changing" card). Premium report. On the surname page, only the surname's own spelling class as a plain label.

**Data & method.**
- `movers_2019_2026.csv` covers forms published at both dates, per list.
  - Absolute lists need ≥20 entries at both dates.
  - Relative lists need ≥500 entries in 2019.
  - The PAIRED scope is internal only, with collision keys excluded.
- `suffix_classes_by_year.csv` uses `SUFFIX-V1`, where the first matching rule wins. Order: HYPHENATED, SPACE_SEPARATED, -SKI/-SKA, -DZKI/-DZKA, -CKI/-CKA, -OWICZ/-EWICZ, -ICZ, -CZYK, -UK, -ENKO, -AK, -EK, OTHER, and a PLACEHOLDER class.
- The shares' denominators are all published entries of the list.

**Real results**

- **Largest absolute falls:**
  - Male list: NOWAK −3,086; KOWALSKI −2,103; WIŚNIEWSKI −1,480; SZYMAŃSKI −1,413; WÓJCIK −1,378.
  - Female list: NOWAK −3,701; KOWALSKA −2,612; WÓJCIK −1,784; WIŚNIEWSKA −1,639; SZYMAŃSKA −1,530.
- **Forms with ≥500 entries in 2019:**
  - Male list: 6,258 forms; 497 rose, 5,715 fell, 46 unchanged.
  - Female list: 6,350 forms; 609 rose, 5,702 fell, 39 unchanged.
- **Largest relative falls (base ≥500):**
  - Male list: SZKOP 622 → 564 (−9.32%); SIEJA 612 → 559 (−8.66%); GAJDZIK 549 → 503 (−8.38%).
  - Female list: OLSZOWA 582 → 501 (−13.92%); MŰLLER 555 → 479 (−13.69%, a double-acute spelling, see DQ-08); KWAŚNA 1,435 → 1,275 (−11.15%).
- **Largest rises.** In both lists these are forms with spelling patterns such as -ENKO, -UK and -OV/-OVA (full lists in the CSV).
  - Absolute, male list: MELNYK 1,626 → 6,442.
  - Absolute, female list: MELNYK 1,211 → 7,257.
  - Relative, male list: NGUYỄN 720 → 3,730 (+418.06%), SHEVCHENKO 808 → 4,076 (+404.46%).
  - Relative, female list: KOVALENKO 507 → 4,269 (+742.01%), SHEVCHENKO 620 → 5,217 (+741.45%).

Spelling classes, share of the list's entries (%), June 2019 / January 2020 / January 2026:

| Class | Male list | Female list | Distinct forms 2019 → 2026 (M; F) |
|---|---|---|---|
| -SKI/-SKA | 27.4673 / 27.3273 / 25.0921 | 27.9327 / 27.8734 / 26.1564 | 36,195 → 37,896; 43,200 → 53,013 |
| -CKI/-CKA | 4.5006 / 4.4774 / 4.0962 | 4.5573 / 4.5436 / 4.1515 | 6,547 → 6,510; 7,257 → 7,394 |
| -AK | 8.1297 / 8.1059 / 7.6405 | 8.1004 / 8.0860 / 7.6249 | 10,091 → 12,485; 9,741 → 12,351 |
| -EK | 6.0510 / 6.0243 / 5.5186 | 6.0107 / 5.9960 / 5.4679 | 6,890 → 7,192; 7,065 → 7,301 |
| -UK | 1.6652 / 1.7145 / 2.3505 | 1.5776 / 1.6105 / 2.4083 | 8,360 → 13,536; 7,485 → 13,655 |
| -ENKO | 0.2523 / 0.3052 / 0.9817 | 0.1925 / 0.2313 / 1.2063 | 3,368 → 7,395; 2,867 → 8,271 |
| SPACE_SEPARATED | 0.1022 / 0.1012 / 0.2134 | 0.1007 / 0.1002 / 0.1520 | 5,860 → 14,558; 5,907 → 10,554 |
| OTHER | 44.4988 / 44.6791 / 47.4492 | 43.9147 / 44.0102 / 45.8815 | 173,414 → 282,722; 171,796 → 263,543 |

**Rules & caveats**

- **Proposed labels.** Counts and the string rule: **VERIFIED**. Shares: **LIKELY**. Causes: **INSUFFICIENT_DATA**.
- Classes are spelling patterns only. Never "Ukrainian/Polish/German/Vietnamese endings or surnames", and no origin, nationality or migration story.
- The register includes foreigners living in Poland, and the files say nothing about who holds which surname or why counts changed.
- The risers list is dominated by a few spelling patterns. A ranked "fastest-growing surnames" list would communicate an origin story by juxtaposition even with neutral words, so it is **not recommended editorially**. A surname's own trend on its own page is fine.
- The fallers are safe, but never call them "dying out".

**Presentation idea.** A slope chart of class shares (2020 → 2026) with two panels, male and female list. The caption states "spelling pattern of the written surname; causes not recorded".

**Interest rating: 3.** The numbers are strong, but the most striking part (the risers) carries the highest framing risk. The safe content is the fallers and the -SKI share.

---

## A4. Diversity and concentration

**What the user sees**

- EN: "The male list of the PESEL register of living persons (20 Jan 2026) contains 408,182 distinct surname forms, 47.3% more than in June 2019 (277,108). Its entries grew by only 6.74%. The female list has 420,082 forms (+41.2%) and +6.47% entries."
- PL: „W wykazie nazwisk męskich rejestru PESEL osób żyjących (stan na 20.01.2026) jest 408 182 różnych form nazwisk, o 47,3% więcej niż w czerwcu 2019 r. (277 108). Liczba wpisów wzrosła w tym czasie tylko o 6,74%.”
- EN: "Half of all entries in the male list of the PESEL register of living persons (20 Jan 2026) belong to its 4,210 most common forms (female list: 4,191)."
- PL: „Połowę wszystkich wpisów w wykazie nazwisk męskich rejestru PESEL osób żyjących (stan na 20.01.2026) obejmuje 4 210 najczęstszych form nazwisk, a w wykazie żeńskim 4 191.”
- EN: "106,813 forms in the male list of the PESEL register of living persons (20 Jan 2026) have exactly 2 entries, the smallest number the register publishes (26.2% of its forms)."

**Where it's used.** Editorial ("how many surnames does the register list?"). Premium report (concentration curve). Surname page (a "your surname is among the N forms covering half of all entries" badge, only once shares are unblocked).

**Data & method.**
- Source is `concentration_by_year.csv`.
- Distinct forms = file rows, each with ≥2 entries. Placeholders are included: 2 rows in the 2026 male list, 1 in the female list.
- Top-N share uses the list's own entries.
- N50/N80/N90 = the smallest number of most frequent forms whose entries reach 50/80/90% of the list.
- Tail = forms with 2–4 entries. The chart-ready curve is `concentration_curve_2026.csv`.

**Real results**

| List, date | Forms | Top 10 % | Top 100 % | Top 1,000 % | N50 | N80 | Forms with exactly 2 entries (% of forms) | Forms ≥20 | Forms ≥1,000 | Median entries/form |
|---|---|---|---|---|---|---|---|---|---|---|
| Male 2019-06-30 | 277,108 | 2.758 | 11.721 | 33.481 | 3,211 | 22,140 | 63,163 (22.8) | 77,576 | 3,007 | 6 |
| Male 2020-01-22 | 283,221 | 2.744 | 11.663 | 33.321 | 3,259 | 22,567 | 64,670 (22.8) | 78,227 | 3,002 | 6 |
| Male 2026-01-20 | 408,182 | 2.510 | 10.680 | 30.641 | 4,210 | 31,024 | 106,813 (26.2) | 91,398 | 3,034 | 5 |
| Female 2019-06-30 | 297,456 | 2.767 | 11.751 | 33.477 | 3,223 | 22,420 | 78,959 (26.5) | 78,279 | 3,065 | 5 |
| Female 2020-01-22 | 299,612 | 2.758 | 11.717 | 33.386 | 3,251 | 22,672 | 79,093 (26.4) | 78,675 | 3,048 | 5 |
| Female 2026-01-20 | 420,082 | 2.516 | 10.713 | 30.667 | 4,191 | 30,731 | 118,775 (28.3) | 91,410 | 3,102 | 5 |

Other figures:
- **Growth of distinct forms.** Male list +44.1% for 2020 → 2026 and +3.3% for 2025 → 2026. Female list +40.2% and +2.2%.
- **Long tail, 2026.** 193,614 male-list forms (47.43% of forms) have 2–4 entries, and they hold 2.391% of entries. The female list has 207,557 such forms (49.41%, 2.490% of entries).
- **Curve, male list 2026.** The top 1 form holds 0.464% of entries, the top 5,000 hold 52.538%, the top 50,000 hold 86.122% and the top 100,000 hold 92.928%.

**Rules & caveats**

- **Proposed labels.** Counts: **VERIFIED**. Shares and N50: **LIKELY**. Why the tail grew: **INSUFFICIENT_DATA**.
- A form is "published" only at ≥2 entries. A new form can be a new registration or one that went from 1 to 2 entries; the data cannot tell which.
- Spelling variants count separately, e.g. MÜLLER / MŰLLER / MULLER / MUELLER (DQ-08) and WIŚNIEWSKI / WISNIEWSKI. So "distinct forms" is not "distinct surnames".
- Never "Poland has 408,182 surnames".

**Presentation idea.** A Lorenz-style cumulative curve, with one line per list for 2019 and 2026 on a log-x axis. A "half of all entries" marker at N50.

**Interest rating: 4.** The headline "+47% forms vs +7% entries" is surprising and fully sourced. It needs the one-line caveat about spelling variants.

---

## A5. Entering and leaving the published list

**What the user sees**

- EN: "140,332 surname forms in the male list of the PESEL register of living persons (20 Jan 2026) were not in the June 2019 list, which means they had fewer than 2 entries or were absent then. 9,255 forms from June 2019 are no longer published (fewer than 2 entries or absent now). None of them had 20 or more entries in 2019; the largest had 10."
- PL: „W wykazie nazwisk męskich rejestru PESEL osób żyjących (stan na 20.01.2026) jest 140 332 form nazwisk, których nie było w wykazie z czerwca 2019 r. (wtedy mniej niż 2 wpisy albo brak). 9 255 form z 2019 r. nie jest już publikowanych (obecnie mniej niż 2 wpisy albo brak). Żadna z nich nie miała w 2019 r. 20 lub więcej wpisów; największa miała 10.”
- EN, surname page (template): "First published in the male list: <date of the first snapshot listing the form>". This is a list-presence badge, never "new surname".

**Where it's used.** Editorial ("no surname with 20+ entries left the published lists since 2019"). Surname page (first-published badge). Premium report.

**Data & method.**
- Exact string comparison per list, with placeholders excluded (`entry_exit_summary.csv`, `entry_exit_examples.csv`).
- The publisher artefact "True" (for PRAWDA, 2020–2022) is mapped back to PRAWDA for this comparison only.
- "Leaving" = published at the earlier date and not published at the later one.

**Real results**

| Period | List | Entering: forms (entries; % of later list) | Entering forms ≥20; largest | Leaving: forms (entries; % of earlier list) | Leaving forms ≥20; largest |
|---|---|---|---|---|---|
| 2019-06 → 2026-01 | Male | 140,332 (507,420; 2.394) | 877; 205 | 9,255 (20,095; 0.101) | 0; 10 |
| 2019-06 → 2026-01 | Female | 137,579 (534,131; 2.477) | 1,403; 472 | 14,949 (32,536; 0.161) | 0; 16 |
| 2020-01 → 2026-01 | Male | 129,523 (434,313; 2.049) | 416; 205 | 4,560 (9,612; 0.048) | 0; 6 |
| 2020-01 → 2026-01 | Female | 129,202 (468,707; 2.174) | 759; 472 | 8,730 (18,361; 0.091) | 0; 6 |
| 2025-01 → 2026-01 | Male | 14,222 (30,708; 0.145) | 2; 32 | 1,167 (2,426; 0.011) | 0; 4 |
| 2025-01 → 2026-01 | Female | 11,361 (24,524; 0.114) | 0; 15 | 2,290 (4,704; 0.022) | 0; 5 |
| 2019-06 → 2020-01 | Male | 11,929 (26,387; 0.133) | 0; 9 | 5,815 (12,680; 0.064) | 0; 7 |

The 7-month step 2019 → 2020 has more leavers than the 12-month step 2025 → 2026 (5,815 vs 1,167 in the male list). This is the 2019 discontinuity (DQ-10); prefer 2020 as the base.

The largest entering forms with ≥20 entries (2019 → 2026) are in `entry_exit_examples.csv`. Male list: ROSTÁS 205, KORZHEVYCH 153. Female list: LINGURAR 472, HOHA 168.

**Rules & caveats**

- **Proposed labels.** The set difference: **VERIFIED**. "Newly published": **LIKELY**. Why: **INSUFFICIENT_DATA**. A leaver can be a respelling, a correction or a count falling to 1.
- **Never "extinct", "disappeared", "died out" or "zero".** The wording is always "fewer than 2 entries or absent". Many leavers are still published in the including-deceased list:
  - of the 14,949 female-list forms that left between June 2019 and January 2026, 5,362 appear in the female including-deceased list of 20 Jan 2026;
  - 5,001 of 8,730 for January 2020 → 2026;
  - 982 of 2,290 for 2025 → 2026 (`notes_derived_numbers.csv`).

  There is no male 2026 including-deceased file for the same check.
- Use aggregate numbers editorially, not lists of entering forms, for the same juxtaposition reason as A3. A list of newly published forms invites origin readings that the data cannot support.

**Presentation idea.** A two-bar "in/out" chart per list and period. The headline tile reads "0 forms with 20+ entries left the published list" with the largest leaver's count.

**Interest rating: 4.** "Nothing with 20+ entries left" is a reassuring, very defensible fact. It is a good antidote to "dying surname" myths.

---

## A6. Gender asymmetry between the two lists

**Status.** The ratios below compare the two partitions. **TASK-004 U-1 / AC-17 forbids comparing them in the product data model.** A6 ratios are therefore research only; shipping them needs a project-owner decision or ADR. Showing the two numbers side by side, without a ratio or "more women than men" wording, stays within the rules.

**What the user sees** (compliant versions)

- EN: "KOZIOŁ: 11,991 entries in the male list and 11,573 in the female list (PESEL register of living persons, 20 Jan 2026)." (No ratio. The files do not say why the lists differ.)
- EN, language trivia: "5,871 surname forms spelled -SKI, -CKI or -DZKI appear in the female list of the PESEL register of living persons, with 43,131 entries, e.g. KOWALSKI with 535 (20 Jan 2026)."
- PL: „W wykazie nazwisk żeńskich rejestru PESEL osób żyjących (stan na 20.01.2026) figuruje 5 871 form zakończonych na -SKI, -CKI lub -DZKI (43 131 wpisów), np. KOWALSKI — 535 wpisów.”
- EN: "In the female list of the PESEL register of living persons, KONIECZNA has 11,693 entries and KONIECZNY 2,503 (20 Jan 2026)."

**Where it's used.** Surname page (both numbers). Editorial language trivia (masculine-looking forms in the female list and vice versa). Premium report (only if U-1 is revisited).

**Data & method.**
- `GENDER-V1` = F-list entries of the female form ÷ M-list entries of the male form, same date (`gender_national_by_year.csv`, `gender_ratio_outliers_2026.csv`).
- Unit types:
  - ski_pair: `PAIR-V1` -SKI/-CKI/-DZKI keys, excluding collision keys;
  - invariant: the same form in both lists;
  - multi_part: forms with a hyphen or space.
- Ratio statistics use units with ≥1,000 entries and both sides published.
- Masculine-looking forms in the female list, and the reverse, are in `crossform_by_year.csv`.
- Patterns v1 does not pair are in `pairing_gaps_2026.csv`.
- The -Y vs -A forms inside the female list (231 adjectival pairs, confirmed as adjectives in SGJP, both forms ≥20) are in `adjectival_forms_female_list.csv`.

**Real results** *(internal ratios)*

| Date | Male list entries | Female list entries | F/M | -SKI-type M / -SKA-type F entries (F/M) | Invariant F/M | Multi-part F/M |
|---|---|---|---|---|---|---|
| 2019-06-30 | 19,859,783 | 20,249,319 | 1.0196 | 6,337,986 / 6,541,946 (1.0322) | 1.0091 | 1.6481 |
| 2026-01-20 | 21,197,537 | 21,560,302 | 1.0171 | 6,176,322 / 6,483,912 (1.0498) | 0.9990 | 1.3563 |

- **-SKI/-SKA units with ≥1,000 entries (2026).** 1,796 units, median F/M 1.0257. 1,403 have more female-list entries, and 1,745 are within ±10%.
  - Extremes: WALEWSKI 1,115 / WALEWSKA 1,292 (1.159) and NISKI 560 / NISKA 493 (0.880).
- **Consonant-final invariant units.** 3,152 units, median 1.0143, 2,006 with F > M, 2,924 within ±10%.
- **Showcase F/M, 2019 → 2026.**

  | Surname | F/M 2019 | F/M 2026 |
  |---|---|---|
  | NOWAK | 1.0194 | 1.0137 |
  | KOWALSKI/-A | 1.0179 | 1.0108 |
  | WIŚNIEWSKI/-A | 1.0230 | 1.0207 |
  | KACZMAREK | 1.0159 | 1.0141 |
  | SZCZEPAŃSKI/-A | 1.0295 | 1.0219 |
  | GRZEGORCZYK | 1.0451 | 1.0402 |
  | CZEKIERDA | 1.0311 | 0.9770 |
  | MAZUR | 1.0044 | 1.0182 |
  | KRASKA | 1.0269 | 1.0200 |
  | KOZIOŁ | 0.9821 | 0.9651 |

- **Cross-forms.**
  - Female-list -SKI/-CKI/-DZKI forms grew from 4,542 forms / 29,521 entries (2019) to 5,871 / 43,131 (2026). The largest in 2026 is KOWALSKI with 535.
  - Male-list -SKA/-CKA/-DZKA forms went from 510 / 44,411 (2019) to 563 / 43,793 (2026), mostly invariant surnames: KRASKA 2,446, KLUSKA 2,335.
- **Adjectival -Y vs -A inside the female list.**
  - -Y forms (e.g. KONIECZNY): 52,569 → 53,463 entries (+1.70%).
  - -A forms (e.g. KONIECZNA): 105,437 → 100,903 (−4.30%).
  - Share of deceased-person records (female list, 2026): 16.94% for -Y and 31.29% for -A.
- **Pairing gaps (2026, candidate pairs).**
  - Adjectival -Y/-A: 1,609 pairs, e.g. KONIECZNY 13,849 M / KONIECZNA 11,693 F.
  - -OV/-OVA: 15,981 pairs, e.g. IVANOV 3,856 / IVANOVA 4,603.
  - -YI/-A: 2,029 pairs.
  - -IN/-INA: 6,183 pairs, ambiguous.
  - Non-SKI -I/-A: 1,085 pairs.

**Rules & caveats**

- **Proposed labels.** Counts: **VERIFIED**. Ratios: **LIKELY** (derived) and **blocked by U-1**. Causes: **INSUFFICIENT_DATA**. The -Y/-A reading "usage is shifting toward the -Y form for women" is **UNCONFIRMED**.
- Say "male list / female list". The publisher does not state whether the split is by the bearer's sex or by the form (U-1).
- No marriage, migration or mortality explanations.
- The invariant outlier lists are dominated by pairing gaps and are never publishable. Example: BIAŁA has 2 male-list vs 2,374 female-list entries because its male partner is BIAŁY.
- Consonant-final outliers mostly reflect differences the files do not explain. **Never publish ranked "most male/most female surname" lists.**

**Presentation idea.** Two bars on the surname card, on the same scale, with no ratio label. Editorial trivia card: "-SKI in the female list: 5,871 forms".

**Interest rating: 3.** The cross-form trivia is fun and safe. The ratio analysis is blocked by U-1 and can only be framed as "the files differ; reasons unknown".

---

## A7. Hyphenated (double-barrelled) surnames

**What the user sees**

- EN: "Hyphenated surnames: 28,420 distinct forms with 75,518 entries in the female list, and 10,604 forms with 34,346 entries in the male list (PESEL register of living persons, 20 Jan 2026). Since January 2020 their entries grew by 21.01% (female list) and 18.29% (male list)."
- PL: „Nazwiska dwuczłonowe (z łącznikiem): w wykazie nazwisk żeńskich 28 420 form i 75 518 wpisów, w wykazie męskim 10 604 formy i 34 346 wpisów (rejestr PESEL osób żyjących, stan na 20.01.2026).”
- EN, surname page: "NOWAK is part of 1,185 hyphenated forms in the female list (3,451 entries) and 102 in the male list (249 entries) of the PESEL register of living persons (20 Jan 2026)."
- PL: „NOWAK występuje jako człon 1 185 nazwisk dwuczłonowych w wykazie żeńskim (3 451 wpisów) i 102 w wykazie męskim (249 wpisów) rejestru PESEL osób żyjących (stan na 20.01.2026).”

**Where it's used.** Surname page (component counts). Editorial (trend; the most common hyphenated forms). Premium report.

**Data & method.**
- A hyphenated form is any form containing "-", placeholders excluded (`hyphenated_by_year.csv`).
- Components are matched through the `PAIR-V1` key of each part (`hyphenated_top_2026.csv` and the showcase A7 rows).
- **Trends start in January 2020.** Between June 2019 and January 2020, 2,922 of 10,961 male-list hyphenated forms (6,243 entries) and 4,480 of 26,432 female-list forms (9,819 entries) stopped being published (DQ-10). Almost all had 2–3 entries.

**Real results**

| Date | Male list: forms / entries / share % | Female list: forms / entries / share % |
|---|---|---|
| 2019-06-30 (discontinuous) | 10,961 / 35,173 / 0.1771 | 26,432 / 71,176 / 0.3515 |
| 2020-01-22 | 8,279 / 29,035 / 0.1461 | 22,735 / 62,404 / 0.3086 |
| 2021-02-01/02 | 8,640 / 29,851 / 0.1494 | 23,541 / 64,269 / 0.3172 |
| 2023-01-30 | 9,472 / 31,788 / 0.1528 | 25,708 / 69,251 / 0.3241 |
| 2024-01-19 | 9,836 / 32,623 / 0.1555 | 26,529 / 71,198 / 0.3315 |
| 2025-01-22 | 10,210 / 33,472 / 0.1587 | 27,407 / 73,215 / 0.3400 |
| 2026-01-20 | 10,604 / 34,346 / 0.1620 | 28,420 / 75,518 / 0.3503 |

- **Change 2020 → 2026.** Male list: forms +28.08%, entries +18.29%. Female list: forms +25.01%, entries +21.01%. The female-list share is 2.16× the male-list share in 2026.
- **Three or more parts (2026).** 19 forms in the male list, 34 in the female list. Forms with ≥20 entries: 113 (M) and 117 (F).
- **Most common hyphenated forms (2026):**
  - Male list: ŻMUDA-TRZEBIATOWSKI 224, CZESZEJKO-SOCHACKI 203, WNUK-LIPIŃSKI 181, WANTOCH-REKOWSKI 149, DOWNAR-ZAPOLSKI 108.
  - Female list: ŻMUDA-TRZEBIATOWSKA 228, CZESZEJKO-SOCHACKA 216, WNUK-LIPIŃSKA 189, WANTOCH-REKOWSKA 160, JANTA-LIPIŃSKA 121.
- **Showcase components, 2026 (forms / entries):**

  | Surname | Male list | Female list |
  |---|---|---|
  | NOWAK | 102 / 249 | 1,185 / 3,451 |
  | KOWALSKI | 66 / 157 | 594 / 1,524 |
  | WIŚNIEWSKI | 24 / 57 | 327 / 772 |
  | MAZUR | 22 / 53 | 279 / 692 |
  | KACZMAREK | 17 / 39 | 168 / 394 |
  | KOZIOŁ | 7 / 15 | 69 / 162 |
  | SZCZEPAŃSKI | 5 / 11 | 53 / 118 |
  | GRZEGORCZYK | 2 / 6 | 7 / 15 |
  | CZEKIERDA | 0 | 0 |
  | KRASKA | 0 | 0 |

**Rules & caveats**

- **Proposed labels.** Counts: **VERIFIED**. Trend from 2020: **LIKELY**. Causes (marriage or otherwise): **INSUFFICIENT_DATA**.
- **No nobility, coat-of-arms or "old family" claims about double-barrelled names** (rule 6), including the most common forms listed above. No regional or group label for any of them either (rule 5).
- A-B and B-A are counted as different forms. Space-separated forms (e.g. "EL FASSI") are a separate class.

**Presentation idea.** A line chart of the share per list from 2020, with 2019 greyed as "different compilation". On the surname page: "appears in N hyphenated forms (M | F)".

**Interest rating: 3.** The data is solid and the component count is a nice per-surname extra, but the national story is modest once 2019 is excluded.

---

## A8. Living vs including-deceased ("ageing index")

**What the user sees**

- EN: "Of the NOWAK entries in the male list of the PESEL register including deceased persons (22 Jan 2025), 33.06% are records of deceased persons (48,813 of 147,672). In the female list the figure is 30.04% (43,085 of 143,404)."
- PL: „Wśród wpisów NOWAK w wykazie nazwisk męskich rejestru PESEL obejmującym także osoby zmarłe (stan na 22.01.2025) 33,06% dotyczy osób zmarłych (48 813 ze 147 672); w wykazie żeńskim 30,04% (43 085 ze 143 404).”
- EN, editorial: "Among surnames with at least 1,000 entries in the PESEL register including deceased persons, the highest share of deceased-person records is CZARNA in the female list (41.90%, 20 Jan 2026) and UJMA in the male list (40.95%, 22 Jan 2025)."

User-facing label: "share of records of deceased persons". The internal name "ageing index" should not be shown.

**Where it's used.** Surname page (a "records of deceased persons" line per list). Premium report (history per list). Editorial, carefully (highest shares only; never the lowest, see caveats).

**Data & method.**
- `AGE-V1` uses the same form, same list and same date, from dataset 568 against dataset 1681 (`deceased_national.csv`, `deceased_index_extremes.csv`, and the showcase A8 rows).
- Dates with both files: 2024-01-19 and 2025-01-22 (M, F), and 2026-01-20 (**female only**; there is no male 2026 including-deceased file).
- Extremes and medians use forms with ≥1,000 entries including deceased.

**Real results**

| Date, list | Living | Incl. deceased | Difference (% of incl.) | Forms only in the incl. list (entries) | Median index, forms ≥1,000 |
|---|---|---|---|---|---|
| 2024-01-19 male | 20,976,785 | 28,704,799 | 7,728,014 (26.922) | 19,233 (49,386) | 28.52% (4,265 forms) |
| 2024-01-19 female | 21,479,386 | 28,230,772 | 6,751,386 (23.915) | 23,514 (58,001) | 25.33% (4,174) |
| 2025-01-22 male | 21,096,170 | 29,045,826 | 7,949,656 (27.369) | 19,822 (51,204) | 29.19% (4,300) |
| 2025-01-22 female | 21,535,515 | 28,490,327 | 6,954,812 (24.411) | 24,265 (60,068) | 25.97% (4,205) |
| 2026-01-20 female | 21,560,302 | 28,715,275 | 7,154,973 (24.917) | 25,061 (62,301) | 26.63% (4,235) |

Showcase, share of deceased-person records (%, per list):

| Surname | Male 2024 | Male 2025 | Female 2024 | Female 2025 | Female 2026 | 2025 records of deceased: M (of incl.) / F (of incl.) |
|---|---|---|---|---|---|---|
| NOWAK | 32.43 | 33.06 | 29.39 | 30.04 | 30.66 | 48,813 (147,672) / 43,085 (143,404) |
| KOWALSKI / KOWALSKA | 29.28 | 29.97 | 26.16 | 26.93 | 27.63 | 28,620 (95,511) / 24,957 (92,680) |
| WIŚNIEWSKI / WIŚNIEWSKA | 28.25 | 28.96 | 24.92 | 25.57 | 26.21 | 21,759 (75,139) / 18,694 (73,114) |
| KACZMAREK | 28.79 | 29.49 | 25.64 | 26.39 | 27.08 | 12,517 (42,451) / 10,915 (41,358) |
| SZCZEPAŃSKI / SZCZEPAŃSKA | 28.14 | 28.78 | 24.94 | 25.68 | 26.31 | 6,677 (23,198) / 5,825 (22,682) |
| GRZEGORCZYK | 28.89 | 29.69 | 24.70 | 25.36 | 26.06 | 2,178 (7,337) / 1,823 (7,188) |
| CZEKIERDA | 29.75 | 30.70 | 30.57 | 31.01 | 32.48 | 97 (316) / 98 (316) |
| MAZUR | 26.85 | 27.36 | 23.28 | 23.80 | 24.37 | 13,031 (47,626) / 11,017 (46,286) |
| KRASKA | 27.85 | 28.60 | 24.32 | 25.09 | 25.68 | 982 (3,434) / 842 (3,356) |
| KOZIOŁ | 28.02 | 28.72 | 26.06 | 26.75 | 27.43 | 4,848 (16,879) / 4,251 (15,891) |

- **Highest shares (forms ≥1,000):**
  - Female list 2026: CZARNA 41.90% (1,661 incl. / 965 living), FLAK 38.98%, BURA 38.23%.
  - Male list 2025: UJMA 40.95% (1,160 / 685), FLAK 40.85% (3,951 / 2,337), DAŁEK 38.17%.
- **Consistency checks.**
  - No form has more living than including-deceased entries at the same date: 0 negative differences in every file pair.
  - The 2025 female living list has 2 values absent from the including-deceased list: BRAK NAZWISKA 161 and 5A5 2.
  - The recorded-deceased difference *fell* for:
    - 105 male-list forms, 107 entries (2024 → 2025);
    - 68 female-list forms, 68 entries (2024 → 2025);
    - 68 female-list forms, 70 entries (2025 → 2026).

    That should not happen if the difference only accumulates deaths, so it flags corrections or renames of records (`deceased_consistency_checks.csv`).
  - Nationally the difference grew by 221,642 (male list) and 203,426 (female list) from 2024 to 2025, and by 200,161 (female list) from 2025 to 2026.
- **Forms found only in the including-deceased list are mostly spelling variants.**
  - Of the forms with ≥10 entries that have fewer than 2 living entries or are absent, 21 of 27 (male list 2025) and 24 of 33 (female list 2026) are diacritic variants of a larger living-list form.
  - The largest is WOŻNIAK with Ż: 72 entries in the 2025 male including-deceased list, fewer than 2 or absent in the living list. Compare WOŹNIAK.

**Rules & caveats**

- **Proposed labels.** Counts and differences: **VERIFIED**. The index: **LIKELY** (derived). How far back the including-deceased register reaches is **not documented** in these files. Causes: **INSUFFICIENT_DATA**.
- Say "share of records of deceased persons", never "older surname", "ageing family" or "dying out".
- **Do not publish lowest-index lists.** Forms with 0.00% (e.g. TKACH, female list 2026: 1,470 incl. / 1,470 living) are forms with no deceased records, i.e. recently registered. Such a list reads as an origin list.
- The -Y/-A contrast in A6 (16.94% vs 31.29%) is a real pattern, but its interpretation is **UNCONFIRMED**.
- The regional family's 568woj 2017 file is a different universe, so do not mix it in.

**Presentation idea.** On the surname card, a thin stacked bar per list (living | records of deceased) with the date. Editorial: "the surnames with the highest share of records of deceased persons" (≥1,000 entries, per list, top 5).

**Interest rating: 4.** It is novel and per-list clean, but it needs careful naming and an honest "register time depth unknown" caveat.

---

## A9. Surnames that are ordinary Polish words

**What the user sees**

- EN: "WRÓBEL is also an ordinary Polish word (wróbel, 'sparrow'): 24,717 entries in the male list and 24,385 in the female list (PESEL register of living persons, 20 Jan 2026)."
- PL: „WRÓBEL to także zwykłe słowo (wróbel): 24 717 wpisów w wykazie nazwisk męskich i 24 385 w wykazie żeńskim (rejestr PESEL osób żyjących, stan na 20.01.2026).”
- EN: "Every month and every day of the week is also a surname. PIĄTEK ('Friday') has 11,003 entries in the male list and 10,970 in the female list; PAŹDZIERNIK ('October') has 31 and 20 (PESEL register of living persons, 20 Jan 2026)."
- PL: „Każdy miesiąc i każdy dzień tygodnia jest też nazwiskiem: PIĄTEK ma 11 003 wpisy w wykazie nazwisk męskich i 10 970 wpisów w wykazie żeńskim, a PAŹDZIERNIK — 31 i 20 (rejestr PESEL osób żyjących, stan na 20.01.2026).”
- EN: "54 of the 100 most common forms in the male list of the PESEL register of living persons (20 Jan 2026) are also words in the sjp.pl word list: 22 nouns (e.g. ZAJĄC 'hare', WILK 'wolf', LIS 'fox', MRÓZ 'frost') and 31 adjectives, 30 of them -SKI/-CKI/-DZKI forms such as kowalski."

**Where it's used.** Editorial and social (theme cards: birds, animals, trades, food, weather, calendar). Surname page ("also a word", citing the dictionary).

**Data & method.**
- `LEX-V1`: the surname's masculine/base form in lowercase must equal a lowercase base form in sjp.pl `odm.txt`. Part of speech comes from SGJP common-word lemmas.
- Top 100 and top 1,000 are computed **per list** (`words_summary_by_list_2026.csv`); female-list forms are matched through their `PAIR-V1` key.
- The top-1,000 table (`words_top1000_2026.csv`) uses an internal paired ordering but carries both list counts and ranks.
- Themes and English glosses are **analyst-assigned (EDITORIAL)** in `words_editorial_examples.csv`, and a Polish editor must check them.
- 25 matches in the paired top 1,000 are excluded from editorial use: ethnonyms and demonyms (e.g. MAZUR, POLAK, NIEMIEC), rank or office titles (e.g. DZIEDZIC, MARSZAŁEK, BISKUP, BARON) and possible slurs. They are listed in the CSV.
- NOWAK is not a match: sjp.pl has no lowercase base form "nowak", although SGJP has a common noun *nowak*. Do not claim either way.

**Real results**

| List (2026) | Top-N forms | Word matches | Nouns | Adjectives | Other | Share of the top-N's entries |
|---|---|---|---|---|---|---|
| Male | 100 | 54 | 22 (19 after sensitive exclusions) | 31 | 1 | 53.28% |
| Male | 1,000 | 456 | 293 | 139 | 24 | 48.86% |
| Female | 100 | 54 | 22 (19 after exclusions) | 31 | 1 | 53.07% |
| Female | 1,000 | 444 | 285 | 135 | 24 | 47.73% |

Editorial themes (male list / female list entries, rank in each list):

| Theme | Examples |
|---|---|
| Birds | WRÓBEL 24,717 / 24,385 (25; 27); DUDEK 22,654 / 22,591 (31; 35); SIKORA 21,643 / 21,754 (38; 39); KANIA 12,463 / 12,508; SOWA 10,215 / 10,187; SŁOWIK 6,015 / 6,118 |
| Other animals | ZAJĄC 26,873 / 26,509 (21; 24); BARAN 20,918 / 20,208; WILK 17,374 / 17,218; LIS 16,310 / 16,466; KOT 10,812 / 10,902; BOBER 4,459 / 4,441 |
| Trades | KOŁODZIEJ 14,881 / 15,225; KOWAL 9,192 / 9,170; RYBAK 8,263 / 8,574; BEDNARZ 7,777 / 7,753; KRAWIEC 6,285 / 6,217 |
| Plants and food | CHMIEL 7,360 / 7,535; ŚLIWA 7,113 / 7,018; ŻUREK 6,573 / 6,503; GRUSZKA 6,271 / 6,332; KAPUSTA 4,004 / 3,832; CEBULA 4,451 / 4,333 |
| Weather, landscape | MRÓZ 13,589 / 13,339; GÓRA 6,745 / 6,866; KAŁUŻA 4,375 / 4,403; ROSA 3,871 / 4,018; CHMURA 3,826 / 3,862 |
| Calendar (all 19 present in both lists) | PIĄTEK 11,003 / 10,970; MAJ 9,081 / 9,246; KWIECIEŃ 7,357 / 7,416; MARZEC 7,109 / 7,169; SOBOTA 3,223 / 3,227; GRUDZIEŃ 3,182 / 3,328; CZWARTEK 69 / 69; PAŹDZIERNIK 31 / 20 |

On showcase pages:
- The word flag is Y for KOWALSKI (adjective), WIŚNIEWSKI (adjective), MAZUR, KRASKA and KOZIOŁ. It is N for NOWAK, KACZMAREK, SZCZEPAŃSKI, GRZEGORCZYK and CZEKIERDA.
- **MAZUR's match is an excluded demonym, so the "also a word" line must be suppressed on its page.**

**Rules & caveats**

- **Proposed labels.** The dictionary match: **VERIFIED** ("the sjp.pl list contains the word X"). Glosses and themes: **EDITORIAL**. Etymology, i.e. "the family name comes from the bird": **INSUFFICIENT_DATA**. Never imply it.
- Editorial lists use `ELIG-V1`; all examples above clear it in both lists.
- Suggested additions to the exclusion list: KRÓL ('king', a title word) and WÓJCIK (a derivative of *wójt*, a village-head office); have an editor check both.
- Many -SKI adjective matches are place-derived adjectives. Present them as "also an adjective in the dictionary", not as meaning.

**Presentation idea.** Theme carousels with an illustration per word, the two list counts under each, and a "lexical match, not etymology" footnote. The calendar grid (12 months + 7 days) works as a social card.

**Interest rating: 5.** It is the most shareable family of facts, and safe with the lexical framing and exclusion list.

---

## A10. Letters and sounds trivia (≥20 entries, per list)

**What the user sees**

- EN: "The longest single-word surname in the Polish alphabet with at least 20 entries in one of the lists is CZERLUNCZAKIEWICZ, 17 letters: 17 entries in the male list and 24 in the female list (PESEL register of living persons, 20 Jan 2026)."
- EN: "ŻÓŁĆ is written entirely in Polish diacritic letters: 51 entries in the male list and 71 in the female list (PESEL register of living persons, 20 Jan 2026)."
- PL: „ŻÓŁĆ zapisuje się wyłącznie literami ze znakami diakrytycznymi: 51 wpisów w wykazie nazwisk męskich i 71 w wykazie żeńskim (rejestr PESEL osób żyjących, stan na 20.01.2026).”
- EN: "K is the most common first letter: 14.37% of male-list entries and 14.38% of female-list entries (PESEL register of living persons, 20 Jan 2026). But more distinct forms start with S. No published surname starts with Ą, Ę or Ń."
- PL: „Najwięcej wpisów zaczyna się na literę K: 14,37% w wykazie nazwisk męskich i 14,38% w żeńskim (rejestr PESEL osób żyjących, stan na 20.01.2026). Żadne publikowane nazwisko nie zaczyna się od Ą, Ę ani Ń.”
- EN: "The letter V, which is not in the Polish alphabet, appears in forms holding 3.70% of male-list entries of the PESEL register of living persons in January 2026, against 0.82% in June 2019. In the female list the figures are 3.69% and 0.64%."

**Where it's used.** Editorial and social (quiz cards). Surname page (letters and diacritics badges; first-letter context).

**Data & method.**
- Eligibility is `ELIG-V1`: 103,330 `PAIR-V1` units in 2026, of which 92,440 are single-word forms in the Polish alphabet.
- Letters are characters. Polish diacritics = Ą Ć Ę Ł Ń Ó Ś Ź Ż.
- A consonant run counts letters outside AĄEĘIOÓUY, so a digraph such as SZ counts as two.
- Ties are broken by the male-list count, then the female-list count; never by a sum.
- Q/V/X frequency lists are built separately per list.
- Outputs: `letters_trivia_2026.csv`, `first_letter_2026.csv`, `rare_letters_by_year.csv`.

**Real results** (2026-01-20, male list / female list entries)

- **Longest in the Polish alphabet.**
  - CZERLUNCZAKIEWICZ, 17 letters (17 / 24).
  - 16 letters: PRZEWIĘŹLIKOWSKI / -SKA (128 / 126), SZACHOGŁUCHOWICZ (64 / 72), OCHENDUSZKIEWICZ (50 / 44).
- **Most distinct Polish diacritic letters (4):**
  - ŻOŁĄDŹ (515 / 486);
  - ŻÓŁTAŃSKI / -SKA (326 / 327);
  - ŻÓŁCIŃSKI / -SKA (187 / 176);
  - ŻÓŁKOŚ (118 / 119);
  - ŻOŁĘDŹ (63 / 59);
  - ŻÓŁĆ (51 / 71).
- **Only diacritic letters:** ŻÓŁĆ is the only eligible form. Next by share are ŻÓŁW (31 / 42) and KŁÓŚ (23 / 22), both at 0.75.
- **Consonant runs of 6 letters.** JĘDRSZCZYK (141 / 158), CHRZCZON (65 / 55), CHRZCZONOWSKI / -SKA (49 / 41).
- **Palindromes.** 81 eligible. SAS (1,747 / 1,765), OTTO (995 / 1,092), SUS (808 / 788), KUK (563 / 555), and KAJAK, 'kayak', with 301 in each list.
- **First letter.**
  - K: 14.368% of male-list and 14.384% of female-list entries, but only 11.260% / 11.498% of forms.
  - S: 11.923% / 11.970% of entries and 12.125% / 12.355% of forms.
  - No published form starts with Ą, Ę or Ń in either list.
  - Ó starts 9 male-list forms (32 entries) and 8 female-list forms (23 entries), none with ≥20 entries, so they give no editorial examples.
- **Letters outside the Polish alphabet (share of list entries, June 2019 → January 2026):**

  | Letter | Male list | Female list |
  |---|---|---|
  | V | 0.8189% → 3.6992% | 0.6427% → 3.6892% |
  | Q | 0.0103% → 0.0245% | 0.0105% → 0.0167% |
  | X | 0.0128% → 0.0191% | 0.0145% → 0.0189% |

- **Showcase.**

  | Surname | Letters | Polish diacritics |
  |---|---|---|
  | NOWAK | 5 | none |
  | KOWALSKI | 8 | none |
  | WIŚNIEWSKI | 10 | Ś |
  | KACZMAREK | 9 | none |
  | SZCZEPAŃSKI | 11 | Ń |
  | GRZEGORCZYK | 11 | none |
  | CZEKIERDA | 9 | none |
  | MAZUR | 5 | none |
  | KRASKA | 6 | none |
  | KOZIOŁ | 6 | Ł |

**Rules & caveats**

- **Proposed labels.** String properties and counts: **VERIFIED**. "Longest"/"most": **LIKELY**, because they depend on the ≥20 rule; longer forms with fewer entries exist.
- The Q/V/X trend is a spelling fact only. No origin labels, and causes are **INSUFFICIENT_DATA**.
- "No surname starts with Ą" means no *published* form (≥2 entries). Suppressed singletons cannot be checked.
- Glosses ('kayak') are analyst glosses to be verified.

**Presentation idea.** Quiz cards ("Which letter starts the most entries? K, but S starts the most distinct forms"). A diacritic-heatmap of the surname on its page.

**Interest rating: 4.** It is playful and robust, and pairs well with A9. The V trend needs strict neutral framing.

---

## A11. Declension showcase (SGJP)

**What the user sees**

- EN: "KOZIOŁ declines two ways: the genitive can be *Kozioła* or *Kozła*, and SGJP accepts both. For a woman, Kozioł does not decline."
- PL: „Pan Kozioł, ale bez pana Kozioła albo Kozła — słownik SGJP podaje obie formy. Pani Kozioł — nazwisko się nie odmienia.”
- PL: „Bez pana Kowalskiego, bez pani Kowalskiej; państwo Kowalscy.”
- EN: "The dictionary also lists the married-name form *Nowakowa*. The female list of the PESEL register of living persons (20 Jan 2026) has fewer than 2 entries or none written NOWAKOWA, against 99,738 for NOWAK."
- PL: „Słownik zna formę Nowakowa, ale w wykazie nazwisk żeńskich rejestru PESEL osób żyjących (stan na 20.01.2026) zapis NOWAKOWA ma mniej niż 2 wpisy albo nie występuje — przy 99 738 wpisach NOWAK.”

**Where it's used.** Surname page (a declension box: "how to write it in a letter"). Editorial language tips. Premium report.

**Data & method.**
- `DECL-V1` reads the surname-qualified lemmas in SGJP. Forms come from the morphosyntactic tag: m1 lemma for a man, f lemma for a woman.
- A variant slot = ≥2 forms for one case and number, vocative ignored.
- **Depreciative (`depr`) plural forms are excluded and never written.** `sgjp_declension.csv` now carries only a yes/no flag; 983 of the internal top-1,000 masculine lemmas have one.
- Coverage (internal paired top 1,000):
  - 986 have an SGJP surname lemma;
  - all 353 -SKI/-CKI/-DZKI units have the feminine lemma;
  - 57 have two forms in some slot, mostly the plural nominative;
  - **8 have two accepted genitive singular forms.**

**Real results**

| Surname (M / F list, 2026) | Genitive (man) | Family plural | Woman: genitive / declines? |
|---|---|---|---|
| NOWAK | Nowaka | Nowakowie | Nowak / no |
| KOWALSKI / KOWALSKA | Kowalskiego | Kowalscy | Kowalskiej / yes (adjectival) |
| WIŚNIEWSKI / WIŚNIEWSKA | Wiśniewskiego | Wiśniewscy | Wiśniewskiej / yes |
| KACZMAREK | Kaczmarka | Kaczmarkowie | Kaczmarek / no |
| SZCZEPAŃSKI / SZCZEPAŃSKA | Szczepańskiego | Szczepańscy | Szczepańskiej / yes |
| GRZEGORCZYK | Grzegorczyka | Grzegorczykowie | Grzegorczyk / no |
| CZEKIERDA | Czekierdy | Czekierdowie | Czekierdy / yes |
| MAZUR | Mazura | Mazurowie | Mazur / no |
| KRASKA | Kraski | Kraskowie | Kraski / yes |
| KOZIOŁ | Kozioła / Kozła | Koziołowie / Kozłowie | Kozioł / no |

**Two accepted genitives** (male / female list entries, 2026):

| Surname | Genitives | Male list | Female list |
|---|---|---|---|
| STĘPIEŃ | Stępienia / Stępnia | 22,508 | 22,773 |
| KOZIOŁ | Kozioła / Kozła | 11,991 | 11,573 |
| GAWEŁ | Gaweła / Gawła | 4,725 | 4,581 |
| BOBER | Bobera / Bobra | 4,459 | 4,441 |
| MAJCHER | Majchera / Majchra | 4,231 | 4,284 |
| GOŁĄB | Gołąba / Gołębia | 4,261 | 4,090 |
| ORZEŁ | Orzeła / Orła | 2,747 | 2,703 |
| STENCEL | Stencela / Stencla | 2,541 | 2,576 |

**Married-name forms in the 2026 female list.**

| Form | Female-list entries |
|---|---|
| NOWAKOWA | fewer than 2 or absent |
| GRZEGORCZYKOWA | fewer than 2 or absent |
| KACZMARKOWA | fewer than 2 or absent |
| MAZUROWA | 2 |
| KOWALOWA | 13 |

None of the 53 SGJP surname lemmas qualified as married-name or patronymic (odmężowskie/odojcowskie) is published in the 2026 female list (run log).

**Rules & caveats**

- **Proposed labels.** "SGJP lists form X": **VERIFIED**. Which variant a given family uses: **INSUFFICIENT_DATA**, so show both.
- **Never show `depr` forms.**
- Where SGJP has no lemma (14 of the internal top 1,000), show "no dictionary entry"; never generate forms.
- Credit SGJP (BSD-2) in the box.

**Presentation idea.** A compact case table (M | F columns) with an "either form is correct" chip on variant slots, plus a "Dear Mr/Ms …" letter-writing helper.

**Interest rating: 4.** It is genuinely useful, a frequent real question, and fully dictionary-backed.

---

## Data-quality findings

Detail is in `data_quality_findings.csv` and `deceased_consistency_checks.csv`.

1. **DQ-01. The female 2022 file duplicates 2021.** `1681_F_2022-01-27_r38772.csv` is byte-identical to `1681_F_2021-02-02_r35279.csv` (SHA-256 `9af26480ed30…`). No female 2022 snapshot exists.
2. **DQ-10. The June 2019 extract is discontinuous with January 2020.** In 7 months:
   - 2,922 male-list and 4,480 female-list hyphenated forms stopped being published (6,243 and 9,819 entries). Of these, 2,874 (M) and 4,404 (F) had only 2–3 entries.
   - Only 240 (M) and 783 (F) hyphenated forms appeared in the other direction.
   - Forms with a space next to the hyphen: 8 (M) and 14 (F) in 2019, 0 in 2020.
   - Consequence: start hyphen, tail and entry/exit trends in January 2020.
3. **DQ-02. Placeholder values are published as surnames, and vary by year.**

   | List | BRAK DANYCH | BRAK NAZWISKA | Other placeholders |
   |---|---|---|---|
   | Male 2019 | 847 | 326 | "." 23 |
   | Male 2020 | 1,095 | 327 | none |
   | Male 2022 | 2,427 | 326 | none |
   | Female 2019 | 216 | 118 | "." 8, "-" 2 |
   | Female 2020 | 335 | 117 | none |
   | Female 2025 | none | 161 | none |

   NN and XXX appear every year (e.g. 2026: NN 8 and XXX 4 in the male list, NN 3 in the female list). They are kept in raw sums and excluded from every list, class (after the fix) and example.
4. **DQ-03. "True" replaces PRAWDA.** The male files 2020–2022 and female files 2020–2021 contain "True" (282–291 entries) and no PRAWDA. PRAWDA is the Polish spreadsheet keyword for TRUE, so this is a publisher conversion artefact. It is mapped back only for A5.
5. **DQ-04/05/06/07. Oddities in values.**
   - A digit inside a value: 5A5 (female 2019, 2025).
   - Single-letter values: A, B, O, Q.
   - A trailing space in "SCHIED " in every female file; it is stripped, with no collision.
   - Standalone Unicode combining marks, e.g. MA̋KELA̋ and SCHA̋FER, kept verbatim.
6. **DQ-08. Spelling variants are separate forms** (2026, male / female list):

   | Form | Male list | Female list |
   |---|---|---|
   | MÜLLER | 1,462 | 1,874 |
   | MŰLLER | 382 | 479 |
   | MULLER | 50 | 66 |
   | MUELLER | 440 | 486 |

   Diacritic-less spellings of common surnames also exist, e.g. WISNIEWSKI 101 vs WIŚNIEWSKI 53,380 (male list, 2025).
7. **DQ-09/09b. -SKA forms in the male list.** There are 632 such forms (43,991 entries); 225 have ≥20 entries and are flagged as `PAIR-V1` collisions (129,102 unit entries).
8. **Including-deceased vs living consistency.**
   - No negative differences.
   - Two 2025 female living values are missing from the including-deceased list: BRAK NAZWISKA 161 and 5A5 2.
   - Recorded-deceased differences fell for 105 / 68 / 68 forms (107 / 68 / 70 entries) across the three date pairs.
   - The including-deceased-only forms with ≥10 entries are mostly diacritic variants (M 2025: 21 of 27; F 2026: 24 of 33), which suggests legacy spellings in older records. That interpretation is UNCONFIRMED.
9. **Missing files.** There is no male 2026 including-deceased file. The 2021 male and female dates differ by one day. The 2019 reference date is June.

## What didn't work

- **`PAIR-V1` is too narrow for adjectival and -OV/-OVA-type paired endings.**
  - It leaves unpaired: -Y/-A (1,609 candidate pairs), -OV/-OVA (15,981), -YI/-A (2,029), -IN/-INA (6,183, ambiguous) and non-SKI -I/-A (1,085).
  - Male-list spellings such as SIKORSKYI (234) pair with SIKORSKA only through the -SKI key.
  - A v2 needs dictionary support (SGJP adjectives) and cannot be a suffix rule.
  - Until then, show per-list forms and avoid paired claims.
- **F/M outlier lists.** For invariant forms they are pairing gaps (BIAŁA 2 vs 2,374). For consonant-final forms they reflect unexplained differences between the lists. Both are unusable editorially, and ratios are blocked by U-1 anyway.
- **June 2019 as a baseline for rare or hyphenated forms** (DQ-10). It is kept for common surnames and for the June-2019 comparisons asked for, with a flag.
- **The female 2022 point** does not exist (DQ-01), and **the male 2026 ageing index** cannot be computed (no file).
- **Diacritic-stripped spelling as an "older record" signal.** In 3,925 same-list pairs (2025), the stripped spelling had the higher index in only 1,719. The aggregate is 26.63% (stripped) vs 27.85% (diacritic), and it is dominated by stripped forms that are separate real surnames (`diacritic_variants_2025.csv`). What *did* show the legacy-spelling effect was the set of forms found only in the including-deceased lists (finding 8).
- **Married-name forms (odmężowskie/odojcowskie).** SGJP has 53 lemmas; none is published in the 2026 female list, so there is no usable "old-style married names" story beyond the NOWAKOWA contrast.
- **Paired ≥20 eligibility** admitted forms that have fewer than 20 entries in each list separately. It was replaced by `ELIG-V1`, which reduced eligible units from 136,968 to 103,330 and palindromes from 114 to 81.
- **Editorial lists of fastest risers, newly published forms and lowest ageing index.** The numbers are correct, but the lists are dominated by particular spelling patterns and would read as origin stories. Use them only on the individual surname page.
- **No population denominator exists in these sources.** 1-in-X and shares are per list entries and blocked by D-006. Also, NOWAK's word status differs between sjp.pl (no lowercase base form) and SGJP (a common noun *nowak*), so no word claim is made for NOWAK.
