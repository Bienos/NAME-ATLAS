# Diaspora and history: "your surname abroad" and "your surname 100 years ago" (fact lab: diaspora/history family)

This is a research prototype. It tests which "abroad" and "100 years ago" facts the open data can honestly support for a Polish surname. It is not product code.

- **Abroad:** US Census surname files for 2000 and 2020.
- **100 years ago:** the German First World War casualty lists, 1914–1919.
- **Today:** the PESEL register of living persons, 20 Jan 2026.

Every number below was printed by the scripts in `scripts/diaspora_history/`, run on the files listed here. Nothing was estimated or filled in from memory. The session was resumed after a container restart. The finished US outputs were re-run first and came out byte-identical. Three issues were then fixed; see items 1–3 of "Data-quality findings". Finally the whole pipeline was re-run from the repo copies of the scripts with `run_all.py`; see the "Rerun order" paragraph for the check.

## Files, versions, licences, methods

| Role | File | Version / reference date | Licence | SHA-256 (first 12) |
|---|---|---|---|---|
| PESEL living persons, national, male file | `1681_M_2026-01-20_r1148808.csv` | 2026-01-20 | CC0 1.0 (dataset level) | `ce4238feda85` |
| same, female file | `1681_F_2026-01-20_r1148811.csv` | 2026-01-20 | CC0 1.0 | `c508680d084d` |
| PESEL living persons by voivodeship of **permanent registered residence**, M / F | `1681woj_M_2026-01-20_r1148786.csv`, `1681woj_F_2026-01-20_r1148790.csv` | 2026-01-20 | CC0 1.0 | `0eb31d19955f`, `cd0c100e9205` |
| US Census 2020, frequently occurring last names | `Names2020_LastNames_RaceHispanic.xlsx` (156,621 named rows + "ALL OTHER NAMES") | released 2026-04-14 (data guide) | no licence stated in the file. US federal statistical product, so verify its terms before product use | `2e773c7edd93` |
| US Census 2000 surnames | `names2000/app_c.csv` (151,671 rows) | Census 2000 | as above | `4a0f33877587` |
| German WWI casualty lists (Verein für Computergenealogie) | `Verlustlisten_1WK_Deutschland.parquet` (8,551,758 entries) | data status 2025-10-14 (documentation) | CC0 (documentation p. 4; Zenodo DOI 10.5281/zenodo.18330751) | `c50b494faf9e` |
| Documentation of the lists (4 pages, H. Hartenthaler) | `Verlustlisten_Erster_Weltkrieg.pdf` | created 2026-01-21 | CC0 (same record) | `0a99b1c6d9d1` |
| PRNG localities (GUGiK), used for the voivodeship of a point | `PRNG_MIEJSCOWOSCI_XLSX.xlsx` | export 2026-09-28 | CC BY 4.0, **credit GUGiK** | `7e543d51d170` |
| Country polygons (Natural Earth 1:10m admin-0, world-atlas 2.0.2 TopoJSON, 255 geometries) | `countries-10m.json` | world-atlas 2.0.2 | Natural Earth data is public domain | `3bc6f1d367a9` |

The race and Hispanic-origin columns of both US files were never loaded (`usecols` A:E or 4 named columns). The GOV gazetteer (genealogy.net) was **not** queried. Only the locator that is embedded in the GOV-Id strings of the WWI file was decoded.

**Counting units.** These differ by dataset and must stay separate in every sentence.

- **PESEL:** "entries in the PESEL register of living persons (as of 20 Jan 2026)". One entry = one person is not verified (open decision D-006). Cells with a single entry are suppressed, so a missing surname or cell means "fewer than 2 entries or absent", never zero.
- **US Census:** people with that surname string in the census. The 2020 counts are noise-protected: the file lists named rows down to a count of 92. A surname that is missing is "not listed (<100 or absent)", never zero.
- **WWI lists:** **list entries, not people.** The lists also printed corrections and follow-up notices (documentation, "Inhalt der Listen"), so one soldier can appear several times.

**Female and male files.** They are never summed in user-facing text. The US/Poland ratio uses a paired PESEL total internally, because the US file has one form per surname string. Every example sentence gives the male-file and female-file figures separately and names the ratio's denominator.

**Method tags.** Each is defined in the script headers.

- `fold-v1`: uppercase, then fold the nine Polish letters.
- `pair-v1.1`: -SKI↔-SKA etc., with the noun-type tie-break used by the regional fact lab.
- `usmatch-v1`: fold-v1 key matched to the US name.
- `usvariant-v1`: similar spellings in the US.
- `wwiname-v1`: cleaning of WWI surnames.
- `wwimatch-v1`: WWI surname = fold of a 2026 male-file surname.
- `wwivariant-v1`: similar spellings in the lists.
- `loc-v1`: locating the list place.
- `persist-v1`: persistence test.
- `card-v1`: showcase cards.

**Rerun order.** `run_all.py` runs:

1. `c1_c2_us.py`
2. `c3_us_similar.py`
3. `c4_wwi_coverage_match.py`
4. `c5a_gov_ids.py`
5. `c5b_entry_locations.py`
6. `c5c_location_summary.py`
7. `c6_persistence.py`
8. `c7_showcase_wwi.py`
9. `z_notes_numbers.py`, which prints the derived numbers quoted in these notes.

`prng_cache.py` builds the PRNG point cache once. A final `run_all.py` pass (8–9 minutes) from the repo copies reproduced every CSV in `data/diaspora_history/` byte for byte; see the end of "Data-quality findings" for the check. All data paths are absolute. Intermediates stay in the scratchpad, for example the row-aligned `wwi_entry_loc.parquet` and `wwi_keys.parquet`, which never go into the repo. The repo gets only CSVs of 200 KB or less, and none of them has a person-level row.

**Voivodeship denominators.** Voivodeship shares are shares of the entries that *have* a published voivodeship cell. Example: of the 98,387 male-file NOWAK entries, 86,969 are in published voivodeship cells.

**Showcase surnames.** The brief's seven: NOWAK, KOWALSKI/KOWALSKA, WIŚNIEWSKI/WIŚNIEWSKA, KACZMAREK, SZCZEPAŃSKI/SZCZEPAŃSKA, GRZEGORCZYK and CZEKIERDA. Three extras were picked by data rules, re-derived and asserted in `c7_showcase_wwi.py`:

- **LEWANDOWSKI:** the form with the most located WWI entries among forms whose top voivodeship is Kujawsko-Pomorskie both then and now. The brief's set had no Kujawy/Pomerania example.
- **KREFT:** the largest persistence excess (own overlap minus chance) among the 144 forms with ≥ 200 located WWI entries and ≥ 1,000 male-file entries in the region set.
- **WRÓBEL:** the form with the most located WWI entries among forms whose top voivodeship is Śląskie/Opolskie both then and now. It is an Upper Silesia example and shows that region's location gap.

---

## C1. US census counts for surname forms in today's Polish register

### What the user sees
> **EN:** "In the 2020 US census, 18,297 people had the surname NOWAK (2000: 18,515). In Poland's PESEL register of living persons (20 Jan 2026) there are 98,387 male-register and 99,738 female-register entries NOWAK. For every 100 of those Polish entries (both registers together), the 2020 US census lists 9.2 people named NOWAK."
>
> **PL:** „W spisie powszechnym USA z 2020 r. nazwisko NOWAK nosiło 18 297 osób (w 2000 r. 18 515). W rejestrze PESEL osób żyjących (stan na 20.01.2026) jest 98 387 wpisów NOWAK w rejestrze mężczyzn i 99 738 w rejestrze kobiet. Na każde 100 takich wpisów (oba rejestry razem) przypada w spisie USA 9,2 osoby o nazwisku NOWAK."

> **EN:** "KOWALSKI: 16,721 people in the 2020 US census (2000: 18,134, −7.8%). Poland: 66,589 male-register entries KOWALSKI and 67,308 female-register entries KOWALSKA. The US file lists the female spelling KOWALSKA separately: 269 people in 2020, 135 in 2000."
>
> **PL:** „KOWALSKI: 16 721 osób w spisie USA z 2020 r. (2000: 18 134, −7,8%). W Polsce: 66 589 wpisów KOWALSKI w rejestrze mężczyzn i 67 308 wpisów KOWALSKA w rejestrze kobiet. Amerykański spis podaje osobno formę KOWALSKA: 269 osób w 2020 r., 135 w 2000 r."

> **CZEKIERDA:** "The US census surname files do not list CZEKIERDA (fewer than about 100 people with this spelling, or none; this is not zero). Poland: 217 male-register and 212 female-register entries."

### Where it's used
- The surname page module "Your surname abroad" (premium scope in PRODUCT §6 lists "diaspora evidence").
- A free one-line teaser if product wants it.
- The sources and methodology appendix.

### Data & method
- The US files strip diacritics, so each PESEL form is folded with `fold-v1`. All Polish spellings with the same folded key are pooled. The dominant spelling and its share are reported.
- A group is flagged `fold_ambiguous` when the dominant spelling has less than 95% of the group.
- The Polish total (the ratio denominator) is paired with `pair-v1.1`: male form + female -SKA/-CKA/-DZKA partner, or the identical form.
- Scope: folded forms with ≥ 1,000 paired PESEL entries (`us_vs_pl_top.csv`, top 1,300 US-listed forms; the full 6,514-row table stays in the scratchpad).
- The per-100k US change adjusts for population growth. The implied denominators are 298,898,231 (2020) and 269,795,918 (2000), a ratio of 1.108.

### Real results
- **Scope:** 6,514 folded forms have ≥ 1,000 PESEL entries. Of these, 4,467 (68.6%) are listed in the US 2020 file, 4,492 (69.0%) in the 2000 file, and 4,387 in both.
- **Fold ambiguity:** 2,245 scope groups have more than one Polish spelling, and 605 of them are fold-ambiguous. Examples:
  - ZALESKI 4,285 vs ZAŁĘSKI 4,174 (US 2020: 3,133 ZALESKI, which cannot be split);
  - DRÓŻDŻ 6,620 vs DROŻDŻ 5,681.

  See `us_fold_ambiguity.csv`.
- **Showcase** (`showcase_us.csv`):

| Surname | PESEL M | PESEL F (partner) | US 2020 | US 2000 | change | per-100k change | US 2020 per 100 PESEL (M+F) |
|---|---|---|---|---|---|---|---|
| NOWAK | 98,387 | 99,738 | 18,297 (rank 1,929) | 18,515 | −1.2% | −10.8% | 9.2 |
| KOWALSKI / KOWALSKA | 66,589 | 67,308 | 16,721 | 18,134 | −7.8% | −16.8% | 12.5 |
| WIŚNIEWSKI / -A (folded; incl. WISNIEWSKI) | 53,184 | 54,263 | 11,873 | 12,760 | −7.0% | −16.0% | 11.1 |
| LEWANDOWSKI / -A | 44,466 | 46,268 | 11,068 | 11,822 | −6.4% | −15.5% | 12.2 |
| KACZMAREK | 29,820 | 30,240 | 3,806 | 3,937 | −3.3% | −12.8% | 6.3 |
| WRÓBEL (folded) | 24,871 | 24,565 | 4,044 | 4,246 | −4.8% | −13.8% | 8.2 |
| SZCZEPAŃSKI / -A (folded) | 16,458 | 16,813 | 2,012 | 2,011 | 0.0% | −10.2% | 6.0 |
| GRZEGORCZYK | 5,128 | 5,334 | 393 | 320 | +22.8% | +9.6% | 3.8 |
| KREFT | 2,430 | 2,379 | 1,246 | 1,073 | +16.1% | +4.2% | 25.9 |
| CZEKIERDA | 217 | 212 | not listed | not listed | — | — | — |

- **Poland's top 20 in the US** (`us_top20_pl.csv`). All 20 fell in raw count between 2000 and 2020, ranging from −9.2% (GRABOWSKI) to −1.2% (NOWAK). US 2020 ranks run from NOWAK 1,929 to DĄBROWSKI 11,903. DĄBROWSKI has only 3.0 US people per 100 PESEL entries; see C2 for why.
- **Spelling class** (count change for names listed in both years):
  - The 1,336 adjectival -SKI/-CKI/-DZKI forms fell from 924,652 to 880,897 people (−4.73%).
  - The 3,051 other forms rose by 14.64%. That class is dominated by international names that also occur in PESEL; see C2.
- **Female forms in the US file.** 21 female -SKA/-CKA/-DZKA strings of in-scope adjectival keys are listed in 2020. Three of them (LASKA, LESKA, LUCKA) are noun-type male surnames in PESEL, so they are not female forms. Of the other 18, examples are:

| Female form | US 2020 | US 2000 |
|---|---|---|
| KAMINSKA | 483 | 263 |
| KOWALSKA | 269 | 135 |
| GRABOWSKA | 239 | 137 |
| DABROWSKA | 236 | 113 |
| ZIELINSKA | 216 | 124 |
| WISNIEWSKA | 175 | 109 |
| SZYMANSKA | 179 | not listed |
| ZAWADZKA | 114 | not listed |

Why they grew: INSUFFICIENT_DATA.

### Rules & caveats
- A US bearer is **not** thereby of Polish descent. The fact is only "people in the US census with this spelling". Never infer ancestry or ethnicity.
- The US has one string per surname: KOWALSKI counts men and women. The Polish comparator is two registers, shown separately. The ratio's denominator must be named every time: "per 100 PESEL entries, male and female registers together".
- 2020 counts are noise-infused. Small counts (100–300) and small changes are not meaningful. The 2000 and 2020 universes differ.
- Folding merges ZALESKI and ZAŁĘSKI. For fold-ambiguous groups, show the US number once, against the pooled Polish spellings, and say so.
- No 2010 file: census.gov blocked the download.
- Causes of any change are INSUFFICIENT_DATA.

### Presentation idea
Two tiles side by side:

- "USA, census 2020: 18,297 people · 2000: 18,515", with a tiny 2000→2020 slope.
- "Poland, PESEL 20 Jan 2026: men's register 98,387 · women's register 99,738".

Under them, one line: "9.2 people in the US census per 100 Polish register entries (men + women)". A "not listed (<100)" state replaces the US tile when the name is missing.

### Interest rating: 4/5

### Proposed confidence
- "The US file lists N people with spelling X": VERIFIED.
- The US/Poland ratio for a fold-unambiguous form: LIKELY. For a fold-ambiguous group: POSSIBLE.
- Reasons for change: INSUFFICIENT_DATA.

---

## C2. Diaspora editorial lists

### What the user sees
> **EN:** "Among -SKI/-CKI/-DZKI spellings with at least 1,000 people in the US census and 1,000 entries in PESEL, DOMBROWSKI is the most over-represented in the US relative to Poland: 6,176 people in 2020 against 2,476 PESEL entries (male and female registers together), i.e. 249.4 per 100. The standard Polish spelling DĄBROWSKI (DABROWSKI in the US file) has only 3.0 US people per 100 Polish entries: 2,515 people vs 84,979 entries."
>
> **PL:** „Wśród nazwisk na -SKI/-CKI/-DZKI mających co najmniej 1000 osób w spisie USA i 1000 wpisów w PESEL, pisownia DOMBROWSKI jest najbardziej nadreprezentowana w USA względem Polski: 6 176 osób w 2020 r. wobec 2 476 wpisów w PESEL (rejestry mężczyzn i kobiet razem), czyli 249,4 na 100. Standardowa pisownia DĄBROWSKI (w spisie USA: DABROWSKI) ma tylko 3,0 osoby w USA na 100 wpisów w Polsce (2 515 osób wobec 84 979 wpisów)."

> **EN:** "Among the 169 -SKI/-CKI/-DZKI surnames with at least 1,000 people in both US censuses, not one kept pace with US population growth from 2000 to 2020. The best, PIASECKI, grew by 8.6% in count (1,951 → 2,119) but still lost 1.5% of its population share."

### Where it's used
Editorial "did you know" lists and the diaspora section of premium reports. These are never used as a ranking of families.

### Data & method
`us_editorial_lists.csv`:

- **Minimums:** ≥ 1,000 PESEL entries and ≥ 1,000 US people in each US year used. Fold-ambiguous groups are excluded.
- **Lists:** highest and lowest US/Poland ratio, and biggest growth and decline 2000→2020. Each list is given for all forms and for adjectival -SKI/-CKI/-DZKI forms.
- **Top 20:** `us_top20_pl.csv` gives the US ranks of Poland's top 20.

### Real results
- **Adjectival forms, highest US 2020 per 100 PESEL:** DOMBROWSKI 249.4, PIETROWSKI 50.6, SOBIESKI 49.8, DEMBOWSKI 46.5, GAPIŃSKI 38.2, LEMAŃSKI 33.0.
- **Lowest:** DĄBROWSKI 3.0, ZAWADZKI 3.5, LESZCZYŃSKI 5.0, DOMAŃSKI 5.2, DOBROWOLSKI 6.0, SZCZEPAŃSKI 6.0. The all-forms lowest is STĘPIEŃ at 2.4 (1,087 US people vs 45,336 entries).
- **Adjectival growth:**
  - PIASECKI +8.6%, GLIŃSKI +4.2%, GAWROŃSKI +4.0%.
  - Of the 169 eligible adjectival forms, 23 grew in raw count. All 169 lost population share; the maximum per-100k change is −1.5%.
  - For comparison, 84.3% of the 440 eligible other forms lost share.
- **Adjectival decline:** ŁAPIŃSKI −18.4% (2,303 → 1,879), BUDZIŃSKI −17.6%, BILSKI −16.2%, BAGIŃSKI −15.0%, ŻUKOWSKI −14.9%.
- **The all-forms lists are unusable as "Polish surnames abroad".**
  - The highest-ratio list is topped by SMITH (1,280 PESEL entries; 2,369,644 US people), THOMAS, MARTIN, LEE, PATEL and MILLER.
  - The growth list is topped by HOSSAIN (+329.7%), ZHANG, SHARMA, ISLAM and LI.
  - These are international forms that also appear in the Polish register. The file is kept for transparency, but only a spelling-class filter (like the adjectival one) produces a sensible editorial list.

### Rules & caveats
- ≥ 1,000 in each dataset (well above the ≥ 20 rule, because of the US noise).
- Never frame a list as "most Polish families in the US". It is "surname forms that also appear in today's Polish register".
- The spelling-class filter describes spelling only, not origin.
- Causes are INSUFFICIENT_DATA.

### Presentation idea
A short ranked list with a single bar per name (US people per 100 PESEL entries, M+F). A footnote shows the thresholds and "spelling only, not ancestry".

### Interest rating: 3/5

### Proposed confidence
Rankings: LIKELY (a derived ratio with explicit thresholds). The DOMBROWSKI/DĄBROWSKI contrast as a spelling fact: LIKELY. Any story about why: INSUFFICIENT_DATA.

---

## C3. Similar spellings in the US (not evidence of relation)

### What the user sees
> **EN:** "Similar spellings in the 2020 US census (similar spelling only, not evidence of relation): NOVAK 33,606 people, 1.84× NOWAK. NOWACK 1,020, NOWIK 337."
>
> **PL:** „Podobne pisownie w spisie USA z 2020 r. (tylko podobieństwo zapisu, nie dowód pokrewieństwa): NOVAK 33 606 osób, czyli 1,84 raza więcej niż NOWAK. NOWACK 1 020, NOWIK 337."

### Where it's used
An expandable "similar spellings" drawer inside the US tile. Premium only, if at all.

### Data & method
`usvariant-v1` (`us_similar_spellings.csv`) lists every US 2000/2020 name that is:

- Levenshtein distance 1 from the folded key over A–Z;
- the key with -SKI/-CKI/-DZKI changed to -SKY or -SKE;
- the key with every W changed to V (alone or combined with the suffix rule);
- the female -SKA form.

Each variant also shows whether the same string exists in the 2026 PESEL files (M and F separately).

### Real results (2020; 2000 in brackets)

| Showcase surname | Similar spellings |
|---|---|
| NOWAK | NOVAK 33,606 (35,282); NOWACK 1,020; NOWIK 337; NOWALK 242; NOAK 213; NOWARK 105 |
| KOWALSKI | KOWALSKY 1,246 (1,535, −18.8%); KOWALESKI 1,027; KOVALSKY 547 (364, +50.3%); KOVALSKI 367; KOWALSKE 311; KOWALSKA 269 (135, +99.3%). KAWALSKI is listed only in 2000 (100). |
| WIŚNIEWSKI | WISNEWSKI 720; WISNIESKI 606; WISNIOWSKI 252; WASNIEWSKI 250; WISNIEWSKA 175 |
| KACZMAREK | KATZMAREK 122; KACZMARK 101 |
| SZCZEPAŃSKI | SCZEPANSKI 267 |
| GRZEGORCZYK | GREGORCZYK 121 |
| LEWANDOWSKI | LEVANDOWSKI 857; LEWANDOSKI 515 |
| WRÓBEL | ROBEL 875; WRUBEL 822; WROBBEL 217; WRABEL 168; VROBEL 161 |
| KREFT | KRAFT 20,829 (distance 1) |
| CZEKIERDA | none |

KREFT → KRAFT is a common unrelated name, which shows why a distance-1 match must never be presented as related.

### Rules & caveats
- "Similar spelling, not evidence of relation" must be on the label.
- NOVAK is also the usual spelling of that name in other languages. That is the reason it must not be linked to NOWAK.
- Never merge variant counts into the surname's US count.
- The same string can exist in PESEL too: NOVAK has 787 male and 894 female entries. That is shown, not interpreted.

### Presentation idea
A collapsed list, "Spellings that look similar in the US census", with a neutral icon and the disclaimer line first.

### Interest rating: 3/5 (fun, but easy to misread)

### Proposed confidence
Each count: VERIFIED. Any relationship: UNCONFIRMED (never asserted).

---

## C4. German WWI casualty lists (1914–1919): coverage and surname matching

### What the user sees
> **EN:** "In the German casualty lists of 1914–1919 (8,551,758 list entries; an entry is not a person, because the lists also print corrections and follow-ups), 4,999 entries carry the surname NOWAK."
>
> **PL:** „W niemieckich listach strat z lat 1914–1919 (8 551 758 wpisów; wpis to nie osoba, bo listy drukowały też sprostowania i uzupełnienia) nazwisko NOWAK pojawia się w 4 999 wpisach."

### Where it's used
- The "100 years ago" historical dimension on the surname page. PRODUCT §3 promises one genuine historical dimension where evidence supports it.
- The premium "historical occurrences and places" section.

### Data & method
**What the lists are, per the documentation PDF.** They are official Prussian-government notices of 1914–1919 on the losses of the whole German imperial forces:

- the armies of Prussia, Bavaria, Württemberg and Saxony;
- the Imperial Navy;
- the colonial Schutztruppe.

They were printed as supplements ("Ausgaben") to the Armee-Verordnungsblatt. They cover dead, missing, wounded, captured and released soldiers, plus many later corrections. Volunteers indexed them between Nov 2011 and Aug 2014, and the data status is 14 Oct 2025.

**What "Ort" means.** The documentation lists the person-level information for each period of the lists. Every period includes **Geburtsort (place of birth)**. Before 7 Dec 1916 the entries were grouped by unit. Later they were alphabetical, with a birth date. From 25 Aug 1917 the birth date has no year. So "Ort" here is **the place of birth printed with the entry**. This was not checked against the printed pages. Qualifiers after a comma ("Kr." = Kreis etc.) name the district or region.

**Coverage** (`wwi_coverage.csv`):

- **Lists:** Preußen 6,614,853 entries (77.35%), Bayern 9.70%, Sachsen 7.10%, Württemberg 3.95%, Marine 1.22%, special lists 0.58%, Schutztruppen 0.09%.
- **Issue dates:** 1914-09-11 to 1919-10-14. By year: 1914 10.31%, 1915 23.57%, 1916 19.93%, 1917 17.83%, 1918 21.83%, 1919 6.29%; no date 0.23%.
- **Place fields:**
  - Ort present: 8,320,651 entries (97.30%).
  - A comma qualifier: 62.76%.
  - GOV-Id present: 7,697,428 (90.01%).
  - 1,196,235 distinct Ort strings and 153,594 distinct GOV-Ids.
- **Status**, as a dataset-level aggregate only and never per surname or person: verwundet 53.07%, tot 20.98%, vermisst 15.17%, gefangen 8.14%, zurückgekehrt 2.53%. Causes are not in the data: INSUFFICIENT_DATA.

**Surname cleaning `wwiname-v1`:**

- Kept: single-token surnames, 8,507,779 entries (99.49%). Trailing roman numerals (unit numbering like "Müller II") and title tails are dropped first.
- Excluded:
  - multi-token or complex forms: 29,833;
  - nobiliary particle tails (", von", ", de"): 13,758. These are excluded, so no nobility claims are possible;
  - illegible "{}" or "{korr.}" corrections: 295;
  - empty: 93.
- Polish letters are essentially absent from the transcribed surnames: 21 entries in 20 distinct strings. Folding is therefore required.

**Matching `wwimatch-v1`.** The cleaned, folded surname must equal the fold of a surname in the **2026 male file**. Male, because the lists are soldiers' entries. All PESEL spellings with the same fold are pooled. No other normalisation is applied, so German spellings are **not** merged (see below).

### Real results
- **Match rates:**
  - 5,466,754 entries match (63.93% of all entries, 64.26% of kept entries).
  - By today's male-file size of the form: ≥ 1,000 entries 9.53%, 100–999 18.14%, 20–99 15.39%, 2–19 21.20%.
  - 552,985 entries (6.50%) match only a female-file form.
  - 2,488,040 (29.24%) are not matched. That means "not in the 2026 file with ≥ 2 entries, or spelled differently", not "no bearers".
  - 1.59% of matched entries fall in fold-ambiguous keys.
- **Distinct forms:** 56,601 of 462,284 distinct cleaned forms match. 18,817 of those have ≥ 20 list entries, and 8,388 have ≥ 20 entries in both datasets (`wwi_surname_match.csv`, top 1,500).
- **A match says nothing about origin.** The most frequent matched forms are MÜLLER (89,627 list entries; 1,462 male-file entries today), SCHMIDT, MEYER, SCHNEIDER and SCHULZ.
- **Among forms with ≥ 10,000 male-file entries:** NOWAK 4,999 list entries, KOWALSKI 2,465, LEWANDOWSKI 2,312, KACZMAREK 2,297, KAMIŃSKI 2,152, JANKOWSKI 1,860, ZIELIŃSKI 1,635, GRABOWSKI 1,550, WIECZOREK 1,506, MICHALSKI 1,376.
- **Coverage bias** (`wwi_top20_pl.csv`). Poland's top 20 by 2026 male file:
  - KACZMAREK has 7.7 list entries per 100 male-file entries today.
  - WÓJCIK has 35 list entries (0.1 per 100), and DĄBROWSKI has 110 (0.3 per 100).
  - The lists cover the German Empire, so they mostly see the Prussian partition. A low count can mean "the name was concentrated elsewhere in 1914" or "the name was spelled differently" (next point). It never means "no bearers".
- **Spellings in the lists** (`wwi_similar_spellings.csv`; similar spelling, not merged, not evidence of relation):

| Today's spelling (list entries) | German spelling in the lists (list entries) | Male-file entries today, German spelling |
|---|---|---|
| DĄBROWSKI 110 | DOMBROWSKI 1,489 | 1,211 |
| NOWAK 4,999 | NOWACK 2,173 | 19 |
| WIŚNIEWSKI 965 | WISCHNEWSKI 814 | 11 |
| SZYMAŃSKI 1,074 | SCHIMANSKI 478 | 8 |
| KACZMAREK 2,297 | KACZMARECK 207; KATSCHMAREK 39 | — |

### Rules & caveats
- Always say "list entries". Never "soldiers", "people" or "casualties" as a count of persons.
- Never show status (tot, vermisst…) per surname or per person. Never show first names, units or birth dates. No person-level rows exist in any output.
- A match is "a surname form that also appears in today's Polish register". It is not ethnicity or nationality, and not the same family.
- Spelling variants are shown as similar spellings only. A user named DĄBROWSKI must be told that the lists mostly spell the form DOMBROWSKI.

### Presentation idea
One number tile: "4,999 entries in the 1914–1919 German casualty lists". Beside it, a grey caption: "entries ≠ people · the lists cover the German Empire of 1914". A small "also spelled…" chip opens the similar-spellings list.

### Interest rating: 4/5

### Proposed confidence
- "The lists contain N entries with this cleaned spelling": VERIFIED, with the cleaning rule stated.
- Linking that spelling to today's register form: LIKELY for fold-unambiguous forms, POSSIBLE for fold-ambiguous forms.
- Any link to specific families: not claimed.

---

## C5. Locating the list places in today's Poland (loc-v1)

### What the user sees
Nothing on its own. It feeds C6 and C7. The methodology page says: "We could place 83.1% of all list entries in a present-day country, and 1,295,436 entries (15.1%) in a specific voivodeship of today's Poland."

### Where it's used
The methodology appendix, the maps behind C7 and the persistence test.

### Data & method
Routes, in priority order (`c5a`, `c5b`):

1. **point:** the GOV-Id ends in a 6-character Maidenhead locator. The subsquare is 5′ of longitude × 2.5′ of latitude, roughly 6 × 5 km in Poland. Its centre and four corners are tested against Natural Earth country polygons. A subsquare touching two countries is not used. Inside Poland, the voivodeship comes from the nearest PRNG locality, all within 6.75 km. Subsquares whose corners fall in two voivodeships are flagged.
2. **text:** the exact Ort string occurs at least 5 times among point-located entries, with ≥ 95% agreement on country and ≥ 90% on voivodeship.
3. **district:** the text after the last comma, minus "Kr."/"Kreis"/"A.-H." etc. Same agreement rules, with ≥ 20 supporting entries.
4. **postcode:** GOV-Ids built from German postal codes (`_W####`/`_O####`), which means today's Germany.
5. **none.**

The documentation's abbreviations (Kr. = Kreis, A.-H. = Amtshauptmannschaft, B.-A. = Bezirksamt, O.-A. = Oberamt, O. S. = Oberschlesien…) were used for the district keys.

### Real results (`wwi_location_coverage.csv`, `wwi_location_validation.csv`)

**Routes:**

| Route | Share of entries | Entries |
|---|---|---|
| point | 45.61% | |
| district | 22.36% | |
| postcode | 9.89% | |
| text | 5.21% | |
| not located | 16.92% | 1,447,250 |

The unlocated entries break down into: district unresolved 13.50%, no Ort 2.70%, border-straddling subsquare 0.72%.

**Today's country (share of located):**

| Country | Share of located |
|---|---|
| Germany | 77.82% |
| Poland | 18.23% |
| France | 1.53% |
| Russia | 1.29% |
| Denmark | 0.25% |
| Czechia | 0.21% |
| Austria | 0.19% |
| Lithuania | 0.12% |

**Today's voivodeship:**

| Voivodeship | Located entries | Share of Poland-located |
|---|---|---|
| Dolnośląskie | 258,714 | 19.97% |
| Wielkopolskie | 243,352 | 18.79% |
| Warmińsko-mazurskie | 154,079 | |
| Pomorskie | 153,834 | |
| Zachodniopomorskie | 150,649 | |
| Kujawsko-pomorskie | 137,720 | |
| Lubuskie | 77,909 | |
| Opolskie | 57,827 | |
| Śląskie | 56,200 | |
| The other seven together | 5,152 | 0.40% |

58,488 point entries (4.51% of Poland-located) sit in subsquares that straddle a voivodeship border. They keep the nearest-locality voivodeship.

**Validation:**

- **V1, internal out of sample.** Gazetteers were learned on one half of the GOV-Ids and tested on the other.
  - District route: country agreement 98.42–99.00%, voivodeship agreement 97.56–97.84%. 1.86–2.99% of entries sent to Poland were not in Poland.
  - Text route, this split (pessimistic): it resolves only 0.13–0.14% of test entries, at 92.52–96.32% country and 79.76–86.84% voivodeship agreement.
  - Text route, a random entry split (optimistic): 99.99% on both.
- **V3, external check.** 111 unambiguous Prussian district (Kreis) names were each assigned the voivodeship of the district seat today. This mapping is historical-geography knowledge, not a data source. It covers 750,083 entries.
  - 82.65% of these entries were located, and 99.16% of the located were placed in today's Poland.
  - **96.91% of Poland-located entries were in the expected voivodeship** (point route 95.46%).
  - By expected voivodeship: Wielkopolskie 99.24%, Dolnośląskie 98.70%, Śląskie 99.57%, Pomorskie 97.30%, Opolskie 97.54%, Warmińsko-mazurskie 96.41%, Kujawsko-pomorskie 94.83%, Zachodniopomorskie 94.64%, Lubuskie 90.73%.
  - Old districts that cross today's borders pull agreement down: for example, 55.7% of located "…, Meseritz" entries fall in the expected voivodeship, and 66.9% for "…, Mogilno".
- **V4, plausibility.** 5,152 entries (0.40% of Poland-located) fall in voivodeships that lay outside the German Empire in 1914. These can be genuine births outside Germany or errors (see Data-quality findings).
- **Coverage gap: Upper Silesia.** Of the entries with a listed Silesian district qualifier, only 44.11% (Śląskie list) and 56.21% (Opolskie list) were located. Elsewhere the figure is 76.67–100%.
- **Ruhr area.** 178,244 of 3,900,304 point entries (4.57%) lie in the Ruhr-area box (51.35–51.70°N, 6.60–7.80°E). For the 114 matched forms with ≥ 200 point entries and ≥ 2,000 male-file entries, the median share is 2.5% and the maximum is 6.4% (KREFT). There is no strong Ruhr signal in these birthplaces.

### Rules & caveats
- Always say "the place of birth printed in the list lies in today's X". Never say "came from", "lived in" or "was Polish/German".
- Today's borders are used throughout. The lists predate them.
- Upper Silesia is systematically under-located. Every Śląskie/Opolskie share is a lower bound.
- PRNG must be credited to GUGiK wherever a voivodeship derived from it is shown.

### Presentation idea
The methodology page gets a tiny Sankey diagram: all entries → located / not located → Poland (by voivodeship) / Germany / other. It carries the V3 figure: "96.9% of Poland-placed entries land in the expected voivodeship".

### Interest rating: 2/5 (methodology, but it makes C6/C7 credible)

### Proposed confidence
- Point and district routes outside Upper Silesia: LIKELY.
- The text route and any Upper Silesian location: POSSIBLE.
- A single Ort string is never shown as a claim about a person.

---

## C6. Persistence test: are surnames still where they were 100 years ago?

### What the user sees
> **EN:** "Surnames keep their regional pattern. We compared 1,294 surname forms. Each one's 1914–1919 casualty-list places of birth (in today's voivodeships) were set against the 2026 male register (voivodeship of permanent registered residence). The average similarity between a surname's own two patterns is 0.57. For a randomly paired surname it is 0.38. None of 1,000 random shuffles reached 0.57. Within the nine voivodeships the lists cover, half of the surnames (50.8%) have the same top voivodeship then and now; with random pairing, only 19.5% would."
>
> **PL:** „Nazwiska zachowują swój regionalny układ. Porównaliśmy 1 294 nazwiska. Dla każdego zestawiliśmy miejsca urodzenia z niemieckich list strat z lat 1914–1919 (w dzisiejszych województwach) z rejestrem mężczyzn PESEL z 2026 r. (województwo zameldowania na pobyt stały). Średnie podobieństwo obu układów tego samego nazwiska wynosi 0,57, a przy losowym dobraniu nazwisk 0,38. Żadne z 1000 losowań nie osiągnęło wartości 0,57. W dziewięciu województwach objętych listami u połowy nazwisk (50,8%) województwo z największą liczbą wpisów jest to samo wtedy i dziś; przy losowym parowaniu byłoby tak w 19,5% przypadków."

Per surname (EN): "Within the nine voivodeships the lists cover, 81.7% of located 1914–1919 KACZMAREK entries give a place of birth in today's Wielkopolskie. In 2026, 53.9% of male-register KACZMAREK entries and 53.0% of female-register KACZMAREK entries in the same nine voivodeships have Wielkopolskie as their voivodeship of permanent registered residence. KACZMAREK's 2026 pattern matches its own 1914–1919 pattern better than 92% of other surnames' 2026 patterns do."

PL: „W dziewięciu województwach objętych listami 81,7% wpisów KACZMAREK z lat 1914–1919 z ustalonym miejscem urodzenia wskazuje dzisiejsze województwo wielkopolskie. W 2026 r. w tych samych dziewięciu województwach wielkopolskie jest województwem zameldowania na pobyt stały dla 53,9% wpisów KACZMAREK w rejestrze mężczyzn i 53,0% w rejestrze kobiet. Dzisiejszy układ nazwiska KACZMAREK pasuje do jego układu sprzed stu lat lepiej niż układy 92% innych nazwisk."

Region level (EN): "Of the 100 most frequent surname forms among the 1914–1919 entries placed in today's Wielkopolskie, 67 are still among the 100 most frequent in Wielkopolskie's 2026 male register. In today's Dolnośląskie, Lubuskie and Zachodniopomorskie the figure is 0."

PL: „Spośród 100 najczęstszych nazwisk we wpisach z lat 1914–1919 z miejscem urodzenia w dzisiejszym województwie wielkopolskim 67 wciąż należy do 100 najczęstszych nazwisk w rejestrze mężczyzn tego województwa w 2026 r. W dolnośląskim, lubuskim i zachodniopomorskim: 0."

### Where it's used
- An editorial "did you know" item.
- The "then vs now" block on surname pages whose form passes the thresholds.
- The premium "surname-level geographic change over time".

### Data & method
**`persist-v1`** (`c6_persistence.py`).

**WWI side.** Matched entries (`wwimatch-v1`) located in today's Poland with a voivodeship (`loc-v1`).

**2026 side.** The male voivodeship file, 2026-01-20, spellings pooled by fold. Suppressed cells (<2) are handled explicitly: 0 in the primary run, 1 in a sensitivity run. They are never silently turned into zeros by a pivot.

**Region set R9, as supported by the data.** These are the voivodeships with ≥ 10,000 located entries. The data show a clean gap between 1,969 entries (Łódzkie) and 56,200 (Śląskie). R9 = Dolnośląskie, Kujawsko-pomorskie, Lubuskie, Opolskie, Pomorskie, Śląskie, Warmińsko-mazurskie, Wielkopolskie and Zachodniopomorskie. These are the formerly (largely) Prussian voivodeships.

**Surnames.** Included are forms with ≥ 50 located list entries and ≥ 100 male-file entries in R9.

**Similarity.** Overlap = Σ min(p_i, q_i) of the two share vectors over R9. The Bhattacharyya coefficient is a second measure.

**Baseline.** The 2026 vectors are shuffled across the same surnames 1,000 times with a fixed seed.

### Real results (`persistence_summary.csv`, `persistence_by_surname.csv`, `persistence_voivodeships.csv`)

**Primary run:**

- **Sample:** 1,294 surname forms, 372,607 list entries and 2,485,218 male-file entries. 901 of 11,646 cells are suppressed.
- **Overlap:** observed mean **0.5715** vs shuffled baseline **0.3811** (95% range 0.3735–0.3897). **0 of 1,000 permutations** reached the observed mean, so the one-sided p is ≤ 0.001.
- **Bhattacharyya coefficient:** 0.8025 vs 0.6347.
- **Own vs other surnames:** 87.5% of forms are more similar to their own 2026 pattern than to the average other surname's. The mean own-percentile is 0.775.
- **Same top voivodeship then and now:** 50.8% vs 19.5% at baseline (97.5th percentile 21.3%).

**Robustness.** Every variant points the same way:

| Variant | Forms | Observed | Baseline (95% range) | Own > chance |
|---|---|---|---|---|
| Missing cells = 1 | 1,294 | 0.5725 | 0.3829 (0.3754–0.3915) | 87.6% |
| Paired M+F 2026 | 1,647 | 0.5510 | 0.3692 (0.3622–0.3761) | 86.2% |
| Thresholds 20/20 | 4,371 | 0.5367 | 0.3057 (0.3009–0.3107) | 86.2% |
| Thresholds 200/500 | 182 | 0.6011 | 0.4487 (0.4309–0.4681) | 86.8% |
| R9 without the under-located Śląskie and Opolskie | 1,044 | 0.6151 | 0.4510 (0.4419–0.4603) | 86.0% |
| **R_core** (6 voivodeships) | 1,146 | 0.6857 | 0.4311 (0.4220–0.4396) | 92.9% |

Every variant has p ≤ 0.001.

**Region-level continuity.** Shared forms among the 100 most frequent (list entries vs 2026 male file), with the top-500 figure in brackets:

| Voivodeship | Top-100 overlap (top-500) |
|---|---|
| Wielkopolskie | 67 (251) |
| Kujawsko-pomorskie | 39 (178) |
| Opolskie | 17 (97) |
| Śląskie | 17 (92) |
| Pomorskie | 15 (114) |
| Warmińsko-mazurskie | 13 (63) |
| Dolnośląskie | **0** (2) |
| Lubuskie | **0** (4) |
| Zachodniopomorskie | **0** (0) |

The gap between 0 and 13 defines **R_core**: the six voivodeships with an overlap of 10 or more.

**Per surname** (own overlap / chance / own-percentile):

| Surname | Own overlap | Chance | Own-percentile |
|---|---|---|---|
| KREFT | 0.910 | 0.231 | 0.978 |
| KACZMAREK | 0.708 | 0.371 | 0.923 |
| LEWANDOWSKI | 0.707 | 0.372 | 0.987 |
| WRÓBEL | 0.736 | 0.545 | 0.954 |
| NOWAK | 0.667 | 0.513 | 0.764 |
| KOWALSKI | 0.631 | 0.503 | 0.756 |
| WIŚNIEWSKI | 0.610 | 0.417 | 0.898 |
| SZCZEPAŃSKI | 0.536 | 0.441 | 0.672 |

GRZEGORCZYK (21 located entries) is below the threshold.

The strongest Wielkopolska signatures are -AK forms. For each, the share of located list entries in Wielkopolskie is shown against the share of the 2026 male file in R9:

| Surname | Then (list entries, located) | Now (2026 male file, R9) |
|---|---|---|
| BARTKOWIAK | 94.5% | 72.9% |
| JANKOWIAK | 93.6% | 70.7% |
| RATAJCZAK | 91.8% | 69.2% |
| STACHOWIAK | 91.9% | 68.2% |

### Rules & caveats
- This is a statement about **surname forms in aggregate**. It says nothing about any family's continuity or migration (PRODUCT non-goal 4).
- The two sides measure different things:
  - The list side is a printed birthplace for men who served.
  - The register side is the voivodeship of permanent registered residence of living entries.
  - Neither is "origin".
- R9 only: the lists hardly cover the Russian and Austrian partitions.
- Śląskie and Opolskie are under-located. The variant without them gives the same result.
- The male file is primary because the list entries are soldiers. The paired variant is given. User-facing sentences give the male and female figures separately, e.g. KACZMAREK 53.9% vs 53.0%.
- **Cause: INSUFFICIENT_DATA.** The zero overlap in three voivodeships is a data fact. Any historical explanation needs its own cited source.

### Presentation idea
A "then vs now" pair of small maps, or bars, restricted to the nine covered voivodeships, with the same colour scale and a hatched mask on the seven voivodeships the lists do not cover. Add one badge: "keeps its region: more similar than 92% of surnames". This is not animated (PRODUCT non-goal 10).

### Interest rating: 4/5 (5/5 as an editorial story)

### Proposed confidence
- The aggregate persistence result: LIKELY. It is strong and robust to six variants, but rests on cross-dataset matching.
- A per-surname persistence badge: POSSIBLE, and only with ≥ 200 located entries. Otherwise UNCONFIRMED.
- Causes: INSUFFICIENT_DATA.

---

## C7. Historical showcase cards

### What the user sees
The sentences are generated by code from the CSV (`showcase_wwi_summary.csv`, columns `card_sentence_en`/`card_sentence_pl`). Voivodeship shares for 2026 are among entries with a published voivodeship.

> **KACZMAREK. EN:** "In the German casualty lists of 1914-1919, 2,297 entries carry the surname KACZMAREK. For 57.5% of all these entries, the place of birth printed in the list lies in today's Wielkopolskie voivodeship (79.7% of entries could be placed at all). In 2026, 41.2% of male-register entries KACZMAREK and 40.5% of female-register entries KACZMAREK with a voivodeship of permanent registered residence are in Wielkopolskie."
>
> **PL:** „W niemieckich listach strat z lat 1914-1919 nazwisko KACZMAREK pojawia się w 2 297 wpisach; w 57,5% z nich podane miejsce urodzenia leży dziś w województwie wielkopolskim. W 2026 r. w tym województwie zameldowanych na pobyt stały jest 41,2% wpisów KACZMAREK w rejestrze mężczyzn i 40,5% wpisów KACZMAREK w rejestrze kobiet (spośród wpisów z województwem)."

> **LEWANDOWSKI. EN:** "…2,312 entries carry the surname LEWANDOWSKI. For 49.0% of all these entries, the place of birth printed in the list lies in today's Kujawsko-pomorskie voivodeship (83.7% could be placed). In 2026, 24.0% of male-register entries LEWANDOWSKI and 23.8% of female-register entries LEWANDOWSKA … are in Kujawsko-pomorskie."
>
> **PL:** „…nazwisko LEWANDOWSKI pojawia się w 2 312 wpisach; w 49,0% z nich podane miejsce urodzenia leży dziś w województwie kujawsko-pomorskim. W 2026 r. … 24,0% wpisów LEWANDOWSKI w rejestrze mężczyzn i 23,8% wpisów LEWANDOWSKA w rejestrze kobiet."

> **KREFT. EN:** "…609 entries carry the surname KREFT. For 51.4% the place of birth lies in today's Pomorskie (87.7% could be placed; of the located entries, 36.9% lie in today's Germany). In 2026, 85.7% of male-register and 84.5% of female-register KREFT entries are in Pomorskie."

### Card table (`showcase_wwi_summary.csv`)

"Located" is the share of all entries that could be placed.

| Surname | List entries | Located | In today's PL (of located) | In today's DE (of located) | Top voivodeship then | Share then (of all / of PL-located) | 2026 M / F share there (national) |
|---|---|---|---|---|---|---|---|
| NOWAK | 4,999 | 62.7% | 88.6% | 9.8% | Wielkopolskie | 32.0% / 57.6% | 18.5% / 18.1% |
| KOWALSKI / KOWALSKA | 2,465 | 75.4% | 86.3% | 11.6% | Wielkopolskie | 24.5% / 37.6% | 9.8% / 9.8% |
| WIŚNIEWSKI / -A | 965 | 84.7% | 94.4% | 4.4% | Kujawsko-pomorskie | 40.1% / 50.2% | 16.5% / 16.3% |
| KACZMAREK | 2,297 | 79.7% | 89.0% | 9.8% | Wielkopolskie | 57.5% / 81.0% | 41.2% / 40.5% |
| SZCZEPAŃSKI / -A | 267 | 85.0% | 87.7% | 11.5% | Wielkopolskie | 28.1% / 37.7% | 9.4% / 9.2% |
| GRZEGORCZYK | 43 | 62.8% | 77.8% | 18.5% | Wielkopolskie (17 entries) | 39.5% / 81.0% | 7.4% / 7.2% |
| CZEKIERDA | 0 | — | — | — | — | — | — |
| LEWANDOWSKI / -A | 2,312 | 83.7% | 90.8% | 7.8% | Kujawsko-pomorskie | 49.0% / 64.4% | 24.0% / 23.8% |
| KREFT | 609 | 87.7% | 62.2% | 36.9% | Pomorskie | 51.4% / 94.3% | 85.7% / 84.5% |
| WRÓBEL | 1,221 | 58.1% | 87.0% | 10.1% | Śląskie | 13.7% / 27.0% | 16.8% / 17.3% |

Notes on individual cards:

- **Prussia:** 97.0–100% of each card's entries come from the Prussian list.
- **CZEKIERDA:** no entry with this spelling in the transcribed lists. This is not evidence of zero bearers in 1914–1919. Show "not found in the lists".
- **GRZEGORCZYK:** 43 entries is enough for a count and a top region, but too few for the persistence test. Its 2026 top voivodeship is **Lubelskie** (16.8% of male-file entries), which lay outside the German Empire in 1914. This is the clearest example of why a card must say what the lists cover.
- **WRÓBEL:** its second most frequent printed place, Tarnowitz (15 entries), could not be located (see C5). Its Śląskie share is a lower bound.

**Top printed places** (`showcase_wwi_places.csv`; only places with ≥ 5 entries, as printed, in German):

| Surname | Top printed places (entries) |
|---|---|
| NOWAK | Posen 48, Königshütte 46 (not located), Breslau 38, Berlin 25, Ratibor 24 (not located) |
| KOWALSKI | Berlin 43, Danzig 28, Posen 17, Graudenz 15, "Gromaden, Wirsitz" 14 |
| KACZMAREK | Posen 42, Berlin 31, Kosten 11, "Neuendorf, Obornik" 10, Glogau 9 |
| LEWANDOWSKI | Thorn 37, Hohensalza 36, Berlin 26, Bromberg 25, Posen 16 |
| KREFT | Danzig 8, "Kriefkohl, Dirschau" 7, "Bardüttingdorf, Herford" 7 (today's Germany), Stolp 6 |

`showcase_wwi.csv` holds the full per-region breakdown: 16 voivodeships and all countries, with the male and female 2026 files in separate columns. List cells with 1–4 entries are suppressed there; 85 cells show "1–4 entries (suppressed)".

### Where it's used
The "100 years ago" card on the surname page, which is the free historical dimension for surnames with enough entries. The premium report expands it with the per-voivodeship table, printed places and similar spellings.

### Rules & caveats
- A full card needs ≥ 20 list entries. Below that, show the count only. At 0, show "not found in the transcribed lists".
- Printed places are shown only with ≥ 5 entries. Region cells with 1–4 entries are suppressed.
- Always show the three disclaimers:
  - entries ≠ people;
  - the lists cover the German Empire of 1914;
  - place = place of birth as printed, placed in today's borders.
- Never show status per surname. Never show first names or units.
- The 2026 figures are voivodeship of permanent registered residence, from separate male and female registers. They are never summed and never called origin.
- For DĄBROWSKI-type names, show the German spelling chip (C4).

### Presentation idea
- A card with the number of entries.
- A two-column mini bar chart, "place of birth in the lists (1914–1919)" vs "registered residence today (men / women)", for the top 3 voivodeships.
- A collapsible list of printed places.
- A footer with the three disclaimers and the sources: VfCG (CC0), PESEL (CC0), and PRNG with the GUGiK credit.

### Interest rating: 5/5

### Proposed confidence
- The entry count for the spelling: VERIFIED.
- The share in today's voivodeship: LIKELY (loc-v1 validated). In Upper Silesia: POSSIBLE.
- The then-vs-now comparison: POSSIBLE.
- Why the surname stayed or moved: INSUFFICIENT_DATA.

---

## Data-quality findings

1. **Pairing tie-break missing in the resumed US work (fixed).** The first version paired every female X-SKA with X-SKI, including noun-type forms such as KRASKA, GĄSKA and LASKA.
   - This touched 495 forms and 41,690 female entries nationally, and 27 in-scope US keys. For example, LASKA had only male entries, while LASKI was inflated.
   - The fix adopts `pair-v1.1`, the regional fact lab's tie-break. No editorial-list entry changed.
2. **Female-form lookup missed -DZKI (fixed).** For ZAWADZKI the script looked up ZAWADZKI instead of ZAWADZKA. The corrected count of listed female forms is 21, or 18 after excluding noun-type forms.
3. **pandas turns real US surnames into missing values (fixed).** With default NA parsing, the 2020 file loses the surnames NA (20,876 people) and NULL (6,737). The loader now keeps them, and the named rows are 156,621. No Polish-scope output changed. The 2000 loader already kept NULL (7,072) and NAN (450).
4. **The US 2020 counts are noise-infused.** Named rows go down to 92 people, and there is no 2010 file (blocked).
5. **The all-forms US lists are dominated by international forms that also occur in PESEL** (SMITH 1,280 entries, PATEL, NGUYEN, ZHANG). Filter by spelling class for any "Polish surnames abroad" list.
6. **WWI surnames are transcribed without Polish diacritics** (21 entries in 20 strings), and often in German spelling: DOMBROWSKI 1,489 entries vs DĄBROWSKI 110, NOWACK 2,173, WISCHNEWSKI 814, SCHIMANSKI 478. Exact matching under-counts Polish forms. The variants are listed but never merged.
7. **The WWI Status column has trailing-space variants and one merged value:** "vermisst " 122, "verwundet " 54, "tot " 10, and "vermisstobject_188905" 1. The Liste column has 3,813 distinct values, of which 314 entries could not be parsed into a contingent.
8. **Homonym mis-link in GOV-Ids.** All 574 entries with the plain place "Rybnik" were placed in today's Łódzkie.
   - 571 of them carry GOV-Id `RYBNIKJO91GL`. Its subsquare (51.458–51.500°N, 18.500–18.583°E) contains the village Rybnik in Łódzkie (sieradzki county; PRNG 51.4725°N, 18.5817°E), not the town Rybnik in Śląskie (50.093°N).
   - The text route copied the error to 3 more entries.
   - Separately, 171 entries were placed in Kazakhstan, 169 of them via GOV-Id `NEUHERLO50AB`.
9. **Upper Silesian towns are largely unlocated.** They carry opaque GOV object IDs and too few Maidenhead-linked twins.

| Plain place string | Entries | Located |
|---|---|---|
| Königshütte | 5,352 | 0.0% |
| Ratibor | 3,132 | 0.0% |
| Beuthen | 3,015 | 0.2% |
| Tarnowitz | 1,400 | 0.1% |
| Zabrze | 784 | 0.3% |
| Myslowitz | 401 | 0.2% |
| Kattowitz | 3,046 | 100% |
| Gleiwitz | 3,859 | 100% |
| Hindenburg | 3,179 | 100% |

   Unlocated entries with opaque IDs total 717,196, spread over 22,397 IDs. The top 1,000 IDs cover 58.6% of them, which is 29.0% of all unlocated entries.
10. **PESEL voivodeship files cover fewer entries than the national files.** For example, NOWAK has 86,969 of 98,387 male entries in published voivodeship cells. All voivodeship shares are therefore "of entries with a voivodeship".

## What didn't work

- **First R_core rule.** The rule was "≥ 50% of located entries carry a form with ≥ 100 male-file entries". Only Wielkopolskie qualified (54.9%), which is a degenerate one-region set with overlap 1.0 by construction. It was replaced by the top-100 overlap rule, where the data show a clean 0 vs ≥ 13 gap.
- **Validating the text route by GOV-Id halves.** Identical strings nearly always share a GOV-Id, so the split tests only 0.13–0.14% of entries. It is reported as the pessimistic bound, next to the optimistic entry-split bound. Neither is a clean accuracy estimate for that route.
- **Ruhr story.** Birthplaces in a Ruhr-area box are rare for register-common forms: 2.94% of point entries for forms with ≥ 1,000 male-file entries, vs 4.57% for all point entries. The lists' birthplaces do not show a Ruhr cluster. That would need residence data, which the lists lack.
- **Share of located entries by register-size class** (`wwi_geography_by_register_size.csv`). Only 33.3% of located entries with forms of ≥ 1,000 male-file entries are in today's Poland, because the class includes MÜLLER-type forms. This is not a usable "Polish forms" indicator, and it is kept only as a diagnostic.
- **Not attempted:**
  - resolving the opaque GOV-Ids through the GOV database (licence and access not checked; this is the obvious next step for Upper Silesia);
  - merging German spellings into Polish forms (it would need a validated transliteration model);
  - the 2010 US file (download blocked).
