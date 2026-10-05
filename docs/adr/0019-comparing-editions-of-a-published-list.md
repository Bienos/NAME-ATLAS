# ADR-0019 — editions of the same published PESEL list may be compared over time, within one declared series

- **Status:** Proposed. It is accepted when the project owner merges TASK-044's pull request.
- **Date:** 2026-09-30
- **Deciders:** the project owner asked for the landing's last panel, "Zmiany w czasie", to show a real trend from 2019 to 2026 instead of its "one edition" placeholder (2026-09-30).
- **Relates to:** ADR-0015 §4 ("comparing two artefacts is a separate decision"), ADR-0018, TASK-025 (comparisons refuse different dates), TASK-040 U-2
- **Amends:**
  - ADR-0015 §4, for list-scope figures of the editions of §2.1;
  - ADR-0018 §2.5 (named surnames are text, not links), because production's search now answers for every surname.
- **Amended by:** TASK-106, 2026-10-04, in §2.2 and §3 (§5 below): the landing reads each list's 2019-06-30 edition before its series, as a surname's change over time does since ADR-0020.
- **Code:** `packages/sources/src/registry.ts`, `packages/contracts/src/list-facts.ts` (`list_facts@3`; `list_facts@4` since TASK-106), `packages/truth/src/list-facts/`, `docs/contracts/list-facts.md`

## 1. Context

- **One dataset, many editions.** dane.gov.pl publishes dataset 1681 about once a year, as a male and a female national list. Editions exist dated 2019-06-30, 2020-01-22, 2021-02-01/02, 2022-01-27, 2023-01-30, 2024-01-19, 2025-01-22 and 2026-01-20.
- **Only 2026 was registered.** Only the 2026 files are in the source registry, SHA-pinned, so every figure on the site describes one date.
- **What was found when all the files were read on 2026-09-30:**
  - Every edition uses the same publication floor: the smallest count is 2.
  - From 2020-01-22 on, every edition describes the same universe: "Wykaz nazwisk … osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL".
  - The 2019-06-30 editions say only "lista nazwisk … w rejestrze PESEL". Their universe is not stated to be the same.
  - The female list dated 2022-01-27 (resource 38772) is byte-identical to the one dated 2021-02-02 (resource 35279): same SHA-256, 311 240 rows. It cannot be a 2022 measurement.

## 2. Decision

1. **A series is the editions of one list whose published universe description is the same.**
   - The registry gives each national descriptor a `series` key.
   - `pesel_living_current_surname_national_male` holds the male editions 2020-01-22 to 2026-01-20: seven editions.
   - `pesel_living_current_surname_national_female` holds the female editions 2020-01-22, 2021-02-02, 2023-01-30, 2024-01-19, 2025-01-22 and 2026-01-20: six editions.
   - Every edition is SHA-pinned and gated like the 2026 files: registry checksum and size, completeness gate, confidence rule, FREE surface.
2. **What is left out, and why, is stated.**
   - The 2019-06-30 editions are not in a series: their universe description differs.
   - The female 2022-01-27 resource is refused as a publisher duplicate of another date. The series shows a gap there, never a value.
   - The page says both.
3. **List-scope figures may be compared across the editions of one series.** These are:
   - the surnames and the people on each edition;
   - between the first and the last edition, their change, and the surnames on one edition but not the other;
   - the first-edition counts of the last edition's `TOP_3`;
   - whether the ten most common surnames and their order are the same.

   The male and the female series are never added together.
4. **No causes.** The page states what changed, never why: no births, deaths, marriages, migration or nationality. A surname absent from one edition is "not on the list", never zero: it may be below the floor.
5. **No surname is named for its growth.** The surnames that grew most between 2020 and 2026 are, in the data, largely surnames a reader would link to one nationality. Naming them would frame nationality (TASK-040 U-2, ADR-0018 §2.4). Growth is shown only as counts.
6. **Named surnames link to their search answer.** Production's search answers for every surname since TASK-042's database cutover. This was checked on 2026-09-30 for each name the plates print.

## 3. Why not the alternatives

- **Including 2019.** Its universe is not stated to be living persons with their current surname. A change from 2019 could be a change of definition.
- **Keeping the female 2022 file.** It would show "no change" for a year where the data says nothing.
- **Naming the fastest-growing surnames.** See §2.5.
- **Trends per surname on the surname page.** That is a larger change to the claim chain and to TASK-025's refusal. This ADR covers the list-scope panel only.

## 4. Consequences

- The registry gains eleven national descriptors plus one refused resource. `fetch-pesel` can download them, and the list-facts generator reads them.
- A new edition extends a series once its universe description matches. A changed description starts a new series.

## 5. Amendment: the 2019 editions on the landing (TASK-106, 2026-10-04)

- **What changed.** The project owner ruled on 2026-09-30 that the 2019-06-30 lists describe living persons with their current surname (TASK-045 §2, R-1). ADR-0020 §2.2 put them in a surname's change over time on that ruling and left the landing's Plate VII at 2020–2026 until this ADR was amended. The site then gave two first years for one list. On 2026-10-04 the owner asked for this fix ("do the 2019 fix").
- **The rule now.** Plate VII reads, per list, the editions a surname's change reads (`PESEL_TREND_EDITIONS`): the list's 2019-06-30 edition, then its series of §2.1. The 2019 edition stays in no series, since its published description still differs. In `list_facts@4` its `series` is null and its `universe_note_code` is `UNIVERSE_DESCRIPTION_DIFFERS`. Only the first edition may be in no series, and only with that note. It passes the same gates as every edition and has the same publication floor (2). `change` compares it with the 2026 edition.
- **What §2.2 and §3 now say.** The 2019 editions are no longer left out of the landing. The page says instead that their files describe their contents in fewer words and that the site reads them as the same list, in the words the surname page uses. The female 2022 gap, §2.3–§2.6, and the rule that the two lists are never added are unchanged.
- **Do not revisit unless** the publisher states that the 2019 lists have a different universe. Then both the landing and a surname's change drop 2019 together, as ADR-0020 says.
