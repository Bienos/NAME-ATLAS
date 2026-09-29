# Regional signatures and place-name links (fact lab: regional family)

Research prototype. It shows which regional "did you know?" facts, maps and stories the official data can honestly support. It is not product code. Every number below was produced by the scripts in `scripts/regional/` on the files listed here. Nothing was estimated or filled in from memory.

## Files, versions, methods

| Role | File (dane.gov.pl resource) | Reference date | SHA-256 (first 12) |
|---|---|---|---|
| Living persons by voivodeship of **permanent registered residence** (M) | `1681woj_M_2026-01-20_r1148786.csv` | 2026-01-20 | `0eb31d19955f` |
| same (F) | `1681woj_F_2026-01-20_r1148790.csv` | 2026-01-20 | `cd0c100e9205` |
| same, previous snapshot (M/F) | `1681woj_M_2025-02-24_r65049.csv`, `1681woj_F_2025-02-24_r65090.csv` | 2025-02-24 | `4e258a328cf7`, `9322fc8c72e6` |
| Living persons, national (M/F) | `1681_M_2026-01-20_r1148808.csv`, `1681_F_2026-01-20_r1148811.csv` | 2026-01-20 | `ce4238feda85`, `c508680d084d` |
| INCLUDING deceased, by voivodeship + TERYT (M/F), different universe | `568woj_M_2017-12-31_r8162.csv`, `568woj_F_2017-12-31_r8155.csv` | 2017-12-31 | `6a1f9ef7d066`, `ffffffd35914` |
| Official register of geographic names (PRNG), localities; credit **GUGiK**, CC BY 4.0 | `PRNG_MIEJSCOWOSCI_XLSX.xlsx` (export of 2026-09-28) | 2026-09-28 | `7e543d51d170` |

PESEL files are CC0 1.0 at dataset level. PRNG is CC BY 4.0, so any surface that shows PRNG-derived place data must credit GUGiK.

**Counting unit.** "Entries" means occurrences (`Liczba`) in the PESEL register. The project has not verified that one entry equals one person (D-006 is open), so no sentence below says "people". Every rate is per 10,000 *entries*. Cells with a single entry are suppressed at source, so a missing cell means "fewer than 2 entries or absent". It never means zero.

**Voivodeship** always means the voivodeship of permanent registered residence (`województwo zameldowania na pobyt stały`). That is a registration record. It is not origin, birthplace, ancestral home or historical distribution.

**Method tags used below.** Each is defined in the script headers.

- `pair-v1.1`: gender pairing (see next paragraph).
- `REGIONAL-v1`: n, share, per-10k, LQ and D.
- `TIE-v1`: near-tie flags.
- `SUFFIX-v1`: spelling classes.
- `RECON-v1`: national-vs-voivodeship reconciliation.
- `STAB-v1`: stability.
- `PLACE-v1`: PRNG adjective match.
- `SIGNAL-v1`: permutation test.

**Gender pairing `pair-v1.1`.** The brief's v1 pairing rules are applied, plus one tie-break needed because two of those rules overlap:

- The rules: -SKI pairs with -SKA, -CKI with -CKA, -DZKI with -DZKA; identical forms pair with themselves; everything else stays unpaired.
- The overlap: 632 male forms end in -SKA/-CKA/-DZKA (43,991 national M entries), e.g. KRASKA, KLUSKA, GĄSKA, TRZASKA. These are noun-type surnames.
- The tie-break: a female X-SKA is paired with the identical male X-SKA when the 2026 national M file has more X-SKA than X-SKI entries. This covers 495 forms (41,690 F entries); otherwise X-SKA pairs with X-SKI.
- What stays unpaired: 137 mixed forms, e.g. SUSKA (1,063 M entries vs 2,799 M SUSKI) and KUBACKA (266 M vs 4,586 M KUBACKI). Also 6,134 female forms spelled -SKI/-CKI/-DZKI (43,758 national F entries; e.g. F "KOWALSKI" 535).

**Rerun order.** All scripts use absolute paths from `common.py`, write CSVs to `data/regional/` and write intermediates only to the scratchpad. The order is `prng_cache.py`, then `b0_profile.py`, `b1_b3_regional.py`, `b4_suffix.py`, `b5_reconcile.py`, `b6_stability.py`, `b7_places.py`, `b8_signal.py` and `b9_showcase_places.py`. A full run takes about 2.5 minutes. I reran the repo copy of `b4_suffix.py` from `/tmp`, and its output was byte-identical.

**Denominators** (`voivodeship_totals_2026.csv`). In 2026-01-20, the voivodeship files list 33,886,474 entries (16,590,111 M and 17,296,363 F). They range from Mazowieckie with 4,875,080 (14.39%) down to Opolskie with 836,695 (2.47%). This table is register-scoped, not surname-scoped, so it must not be modelled as a `DistributionSnapshot`.

---

## B1. Per-surname regional card (2026)

**What the user sees**

- EN: "NOWAK: 198,125 entries in the PESEL register of living persons (20 Jan 2026). Most entries are registered (permanent residence) in Wielkopolskie: 32,280, or 18.3% of the entries that have a voivodeship. That is 102.2 per 10,000 entries there, 2.0× the national rate. The lowest rate is in Podlaskie (772 entries, 0.14×)."
- PL: „NOWAK: 198 125 wpisów w rejestrze PESEL osób żyjących (stan na 20.01.2026). Najwięcej wpisów z zameldowaniem na pobyt stały przypada na województwo wielkopolskie: 32 280 (18,3% wpisów przypisanych do województw), czyli 102,2 na 10 000 wpisów, 2,0 razy więcej niż średnio w kraju.”
- Near-tie wording (rule `TIE-v1`): "KOWALSKI/KOWALSKA is most over-represented in Kujawsko-Pomorskie and Łódzkie (each about 1.6× the national rate)." Never name a single winner when the top two are indistinguishable.

**Where it's used.** Surname page (core card). Premium report (full 16-row table).

**Data & method (`REGIONAL-v1`, `pair-v1.1`).**

- n_sv is the paired M+F entries of surname s in voivodeship v.
- N_s = Σ n_sv; T_v is all entries listed for v in the same files; q_v = T_v/T.
- share = n_sv/N_s; per10k = 10⁴·n_sv/T_v.
- **LQ = (n_sv/N_s)/(T_v/T)**, which equals the per-10k rate in v divided by the national per-10k rate.
- `TIE-v1` is a robustness heuristic, not sampling inference, because the register is an enumeration:
  - for counts, top vs second counts as a tie if |a−b| ≤ 2√(a+b);
  - for LQ, it is a conditional binomial z-test of the two highest-LQ voivodeships, with |z| < 2 counting as a tie.
- Output files: `showcase_regional.csv` (16 rows per surname, blanks plus `cell_note` for suppressed cells) and `showcase_regional_summary.csv`.

**Real results.** National entries come from the 1681 national files. Everything else comes from the 1681woj files. All data are 2026-01-20.

| Surname | National entries (M+F) | In voiv. files | Top voiv. by count (share) | Top voiv. by LQ (LQ; per 10k vs national) | Near-tie? | Lowest reported LQ | D |
|---|---|---|---|---|---|---|---|
| NOWAK | 198,125 | 176,354 | Wielkopolskie 32,280 (18.3%) | Wielkopolskie (1.96; 102.2 vs 52.0) | no | Podlaskie 0.14 (772) | 0.195 |
| KOWALSKI/KOWALSKA | 133,897 | 121,166 | Mazowieckie 24,250 (20.0%) | Kujawsko-Pomorskie (1.63) ≈ Łódzkie (1.61) | **LQ tie** (z=0.92) | Podlaskie 0.25 (934) | 0.161 |
| WIŚNIEWSKI/WIŚNIEWSKA | 107,256 | 96,771 | Mazowieckie 20,612 (21.3%) | Kujawsko-Pomorskie (3.10; 88.4 vs 28.6) | no | Podkarpackie 0.25 (1,379) | 0.251 |
| KACZMAREK | 60,060 | 54,600 | Wielkopolskie 22,301 (40.8%) | Wielkopolskie (4.38; 70.6 vs 16.1) | no | Lubelskie 0.08 (247) | 0.437 |
| SZCZEPAŃSKI/SZCZEPAŃSKA | 33,197 | 30,352 | Mazowieckie 5,829 (19.2%) | Warmińsko-Mazurskie (1.76; 1,957 entries) | no | Małopolskie 0.47 (1,301) | 0.153 |
| GRZEGORCZYK | 10,462 | 9,610 | Lubelskie 1,596 (16.6%) ≈ Mazowieckie 1,510 | Lubelskie (2.96; 8.4 vs 2.8) | count tie only | Podkarpackie 0.26 (146) | 0.211 |
| CZEKIERDA | 429 (217 M + 212 F) | 392 | Lubelskie 97 ≈ Podkarpackie 94 | Lubelskie (4.40) ≈ Podkarpackie (4.13) | **both ties** (z=0.44) | Wielkopolskie 0.14 (5) | 0.465 |
| BARTKOWIAK (demo) | 11,542 | 10,612 | Wielkopolskie 7,347 (69.2%) | Wielkopolskie (7.43; 23.3 vs 3.1) | no | Podkarpackie 0.07 (45) | 0.637 |
| FORMELA (demo) | 3,960 | 3,574 | Pomorskie 3,283 (91.9%) | Pomorskie (15.14) | no | Podlaskie 0.02 (2) | 0.858 |
| BAGIŃSKI/BAGIŃSKA (demo) | 11,069 | 9,915 | Podlaskie 1,896 (19.1%) ≈ Dolnośląskie 1,794 | Podlaskie (6.15; 18.0 vs 2.9) | count tie only | Podkarpackie 0.09 (50) | 0.350 |

Suppressed cells:

- CZEKIERDA has `<2 or absent` in Podlaskie and Warmińsko-Mazurskie. Its Świętokrzyskie value (3) is a lower bound, because the F cell is `<2 or absent`.
- FORMELA has `<2 or absent` in Lubelskie, Lubuskie, Opolskie and Podkarpackie.

LQ by voivodeship (from `showcase_regional.csv`; `<2/abs` = fewer than 2 entries or absent):

| voivodeship | NOWAK | KOWALSKI | WIŚNIEWSKI | KACZMAREK | SZCZEPAŃSKI | GRZEGORCZYK | CZEKIERDA | BARTKOWIAK | FORMELA | BAGIŃSKI |
|---|---|---|---|---|---|---|---|---|---|---|
| Dolnośląskie | 0.871 | 0.922 | 0.731 | 0.936 | 1.134 | 0.755 | 0.901 | 0.79 | 0.034 | 2.459 |
| Kujawsko-Pomorskie | 0.935 | 1.633 | 3.097 | 1.262 | 1.501 | 0.374 | 0.242 | 0.694 | 0.291 | 0.762 |
| Lubelskie | 0.473 | 0.885 | 0.617 | 0.081 | 0.505 | 2.955 | 4.404 | 0.106 | <2/abs | 0.226 |
| Lubuskie | 1.055 | 0.82 | 0.841 | 1.976 | 0.879 | 0.964 | 0.698 | 2.485 | <2/abs | 1.099 |
| Łódzkie | 1.143 | 1.613 | 0.904 | 2.25 | 1.303 | 1.327 | 0.363 | 0.146 | 0.022 | 0.402 |
| Małopolskie | 1.39 | 0.589 | 0.266 | 0.132 | 0.465 | 0.525 | 0.72 | 0.108 | 0.027 | 0.322 |
| Mazowieckie | 0.589 | 1.391 | 1.481 | 0.403 | 1.335 | 1.092 | 0.514 | 0.086 | 0.091 | 0.776 |
| Opolskie | 1.05 | 0.675 | 0.447 | 0.629 | 0.907 | 0.502 | 1.136 | 0.221 | <2/abs | 0.964 |
| Podkarpackie | 0.857 | 0.436 | 0.245 | 0.115 | 0.972 | 0.262 | 4.131 | 0.073 | <2/abs | 0.087 |
| Podlaskie | 0.141 | 0.248 | 0.917 | 0.105 | 0.49 | 1.101 | <2/abs | 0.109 | 0.018 | 6.15 |
| Pomorskie | 0.52 | 0.855 | 1.194 | 0.632 | 1.318 | 0.629 | 0.336 | 0.446 | 15.135 | 1.04 |
| Śląskie | 1.306 | 0.711 | 0.457 | 0.522 | 0.569 | 0.845 | 0.47 | 0.282 | 0.093 | 0.689 |
| Świętokrzyskie | 1.7 | 1.45 | 0.701 | 0.275 | 0.874 | 2.638 | 0.235 | 0.139 | 0.086 | 0.155 |
| Warmińsko-Mazurskie | 0.347 | 1.284 | 1.955 | 0.28 | 1.763 | 1.022 | <2/abs | 0.201 | 0.275 | 2.408 |
| Wielkopolskie | 1.963 | 1.051 | 1.112 | 4.381 | 0.996 | 0.785 | 0.137 | 7.425 | 0.066 | 0.521 |
| Zachodniopomorskie | 0.872 | 1.057 | 1.324 | 1.101 | 1.062 | 1.24 | 3.102 | 0.656 | 0.387 | 1.618 |

**Rules & caveats**

- **Proposed status:**
  - The count in a voivodeship is **VERIFIED** ("the file lists N entries").
  - Derived shares, rates, LQ and "most concentrated in" are **LIKELY**. They are exact arithmetic, but they depend on method choices: `pair-v1.1`, denominators of *listed* entries (cells ≥2), and the D-006 unit. Store the method and version with each value.
  - Causes of any pattern are **INSUFFICIENT_DATA**.
- Always say "entries … registered (permanent residence) in". Never "live in", "come from", "home region" or "people".
- About 1 in 10 of a common surname's national entries has no voivodeship in the breakdown (NOWAK 11.0%; see B5). Show the "not attributed" share on the card.
- When one sex cell is suppressed, the paired value is a lower bound. Render blanks as "<2 or absent", never 0, and never compute an LQ for a blank cell.
- The per-10k rates are "per 10,000 entries listed in the voivodeship file". They are not population rates until D-006 and D-001 are resolved.
- For rare surnames, show counts rather than LQ when n_sv < 20. CZEKIERDA's 4.40 rests on 97 entries.

**Presentation idea.** A choropleth of LQ (diverging palette centred on 1.0) plus a ranked bar list of counts. Use hatching for `<2 or absent` cells. Show a single "×N" badge only when `TIE-v1` says there is no tie.

**Interest rating: 5.** This is the core surname-page feature, and every showcase surname gets a clear, sourced regional card.

---

## B2. Voivodeship signature surnames (map)

**What the user sees**

- EN: "In Kujawsko-Pomorskie the most common surname among entries with permanent registered residence is not NOWAK but LEWANDOWSKI/LEWANDOWSKA (19,479 entries, PESEL register of living persons, 20 Jan 2026)."
- PL: „W województwie kujawsko-pomorskim najczęstszym nazwiskiem wśród wpisów z zameldowaniem na pobyt stały nie jest NOWAK, lecz LEWANDOWSKI/LEWANDOWSKA (19 479 wpisów; rejestr PESEL osób żyjących, 20.01.2026).”
- EN: "Among Wielkopolskie's 100 most common surnames, the most over-represented is BARTKOWIAK: 7.4× the national rate, and 69.2% of all BARTKOWIAK entries with a voivodeship are registered there."

**Where it's used.** Editorial/social (map of the 16 voivodeships). Voivodeship landing pages.

**Data & method.**

- (a) The most common paired key per voivodeship.
- (b) The highest LQ among surnames with at least X paired entries in the voivodeship files, tested at X = 100, 200, 500, 1,000, 2,000 and 5,000.
- (c) "Local favourite": the highest LQ among the voivodeship's own 100 most common surnames, also tested with top-50 and top-200.
- (d) The top-5 LQ list at ≥1,000 entries.
- Output files: `voivodeship_signatures.csv`, `voivodeship_signature_sensitivity.csv`, `voivodeship_overrepresented_top5.csv`.

**Real results** (2026-01-20)

- **Most common surname.** NOWAK leads in 10 of 16 voivodeships. The male-only and female-only rankings give the same top surname in all 16. The 2025-02-24 file gives the same top surname in all 16.
- **Narrow margins.** Podkarpackie has NOWAK 8,773 vs MAZUR 8,637 (+136; 2025: +164). Łódzkie has NOWAK 12,742 vs KOWALSKI/KOWALSKA 12,350 (+392).
- **Single max-LQ "signature" is not robust:**
  - The #1 surname is the same at thresholds 100 and 500 in 0/16 voivodeships, at 200 vs 500 in 1/16, and at 1,000 vs 500 in 2/16.
  - Top-10 lists overlap by only 0.2–1.7 names out of 10 between thresholds.
  - Between 2025-02-24 and 2026-01-20 the ≥500 signature changed in 4/16 voivodeships (e.g. Mazowieckie: KONOWROCKI/KONOWROCKA → ROSŁONIEC).
- **Local favourite (top-100)** was identical in 2025 and 2026 (16/16). It does depend on the top-K choice: K=50 vs 100 agrees in 3/16 voivodeships, and K=100 vs 200 in 4/16.
- **Top-5 at ≥1,000** overlaps 4.69/5 between 2025 and 2026. It is the most robust list.

| voivodeship | most common (entries) | margin vs 2nd | local favourite, top-100 (LQ; rank; share of surname here) | #1 LQ, ≥1000 entries (LQ; here/all) |
|---|---|---|---|---|
| Dolnośląskie | NOWAK (11,305) | +3,082 vs KOWALSKI/KOWALSKA | KURIATA (8.3; #70; 61.1%) | KURIATA (8.3; 1,915/3,134) |
| Kujawsko-Pomorskie | LEWANDOWSKI/LEWANDOWSKA (19,479) | +3,656 vs WIŚNIEWSKI/WIŚNIEWSKA | RUMIŃSKI/RUMIŃSKA (8.13; #76; 42.9%) | GACKOWSKI/GACKOWSKA (11.4; 1,144/1,900) |
| Lubelskie | WÓJCIK (11,173) | +3,057 vs MAZUREK | MITURA (10.16; #47; 57.1%) | SULOWSKI/SULOWSKA (11.71; 1,093/1,661) |
| Lubuskie | NOWAK (4,764) | +2,003 vs KACZMAREK | WALKOWIAK (2.82; #96; 7.2%) | NAJDEK (12.73; 437/1,341) |
| Łódzkie | NOWAK (12,742) | +392 vs KOWALSKI/KOWALSKA | OLCZYK (6.83; #68; 43.1%) | DAŁEK (10.46; 804/1,216) |
| Małopolskie | NOWAK (22,584) | +9,685 vs WÓJCIK | PORĘBA (6.11; #86; 56.3%) | STASZEL (9.32; 864/1,007) |
| Mazowieckie | KOWALSKI/KOWALSKA (24,250) | +3,513 vs KOWALCZYK | GAŁĄZKA (3.19; #94; 45.9%) | WIELĄDEK (5.79; 860/1,033) |
| Opolskie | NOWAK (4,573) | +2,412 vs WIECZOREK | KAMPA (22.5; #72; 55.6%) | KAMPA (22.5; 620/1,116) |
| Podkarpackie | NOWAK (8,773) | +136 vs MAZUR | PELCZAR (11.42; #98; 66.3%) | POCIASK (13.85; 1,263/1,571) |
| Podlaskie | DĄBROWSKI/DĄBROWSKA (6,441) | +1,647 vs KOZŁOWSKI/KOZŁOWSKA | ŁUPIŃSKI/ŁUPIŃSKA (20.75; #52; 64.5%) | GRYGORUK (25.17; 947/1,210) |
| Pomorskie | WIŚNIEWSKI/WIŚNIEWSKA (7,015) | +586 vs LEWANDOWSKI/LEWANDOWSKA | KWIDZIŃSKI/KWIDZIŃSKA (15.46; #39; 93.9%) | DAMPS (15.69; 973/1,022) |
| Śląskie | NOWAK (26,229) | +16,422 vs KOWALSKI/KOWALSKA | CIEŚLAR (7.68; #83; 87.4%) | MARCOL (8.32; 963/1,017) |
| Świętokrzyskie | NOWAK (9,746) | +2,796 vs WÓJCIK | CEDRO (18.07; #75; 58.8%) | POCHEĆ (20.69; 951/1,414) |
| Warmińsko-Mazurskie | WIŚNIEWSKI/WIŚNIEWSKA (6,920) | +1,232 vs KOWALSKI/KOWALSKA | BAŁDYGA (9.41; #63; 34.4%) | LICZNERSKI/LICZNERSKA (14.47; 570/1,077) |
| Wielkopolskie | NOWAK (32,280) | +9,979 vs KACZMAREK | BARTKOWIAK (7.43; #24; 69.2%) | ROZMIAREK (8.92; 875/1,052) |
| Zachodniopomorskie | NOWAK (6,448) | +1,075 vs WIŚNIEWSKI/WIŚNIEWSKA | LISOWSKI/LISOWSKA (1.78; #100; 7.5%) | BODNAR (5.88; 486/1,970) |

**Rules & caveats**

- **Proposed status:** the most-common counts are VERIFIED. "Signature" and "local favourite" are LIKELY and method-defined, so always print the rule, e.g. "most over-represented among the region's 100 most common surnames (REGIONAL-v1)".
- Never present one max-LQ surname as *the* signature without the threshold. That pick is unstable.
- Lists can surface surnames shared by prominent living people (TUSK is Pomorskie's #1 at ≥500; STOCH and KUBICA appear in lists). Speak about surnames only, never individuals, and review social posts editorially.

**Presentation idea.** A 16-tile map with the most-common surname per tile, where a toggle switches to "local favourite". Tap a tile for the top-5 list with LQ bars. Grey out margins below `TIE-v1`.

**Interest rating: 4.** The most-common map is strong and stable. A single "signature" per region needs its rule printed.

### B2b (extra). How distinctive is each voivodeship's surname mix?

**What the user sees**

- EN: "Podlaskie has the most distinctive surname mix in Poland, and Dolnośląskie the least. Dolnośląskie's entries are closest to the pattern of the rest of the country (PESEL, permanent registered residence, 20 Jan 2026)."

**Where it's used.** Editorial map. Premium "your region" report.

**Data & method** (`voivodeship_distinctiveness.csv`).

- D_v = ½ Σ_s |n_sv/T_v − n_s,rest/T_rest|, computed over surnames with ≥1,000 (or ≥100) paired entries, where "rest" is Poland minus v.
- Also counted: surnames (≥1,000 entries) with ≥50% of their entries in v, and surnames with LQ ≥ 3 in v.

**Real results.**

- D_v at ≥1,000 runs from Podlaskie 0.592, Podkarpackie 0.482, Małopolskie 0.447 and Świętokrzyskie 0.406 down to Lubuskie 0.210, Zachodniopomorskie 0.165 and Dolnośląskie 0.143. The top 4 and bottom 3 ranks are identical at the ≥100 threshold.
- Surnames with ≥50% of their entries in one voivodeship: Małopolskie 150, Śląskie 145, Mazowieckie 126, Pomorskie 97, Wielkopolskie 68, Podkarpackie 60, Lubelskie 26, Podlaskie 18, Łódzkie 5, Świętokrzyskie 5, Dolnośląskie 3, Kujawsko-Pomorskie 2, Opolskie 1, Warmińsko-Mazurskie 1, Lubuskie 0, Zachodniopomorskie 0.
- Surnames with LQ ≥ 3 range from Podkarpackie 627 to Dolnośląskie 30.

**Rules & caveats.** The index is LIKELY and method-tagged. **Why** the western and northern voivodeships are least distinctive is **INSUFFICIENT_DATA** in these files. A historical explanation needs a cited source before any editorial use.

**Presentation idea.** A single-hue choropleth of D_v.

**Interest rating: 4.** It is a clean, surprising map that ties together B3 and B8.

---

## B3. Most concentrated vs most evenly spread surnames

**What the user sees**

- EN: "91.9% of FORMELA entries with a voivodeship are registered (permanent residence) in Pomorskie: 3,283 of 3,574 (PESEL, 20 Jan 2026)."
- PL: „91,9% wpisów FORMELA przypisanych do województw ma zameldowanie na pobyt stały w województwie pomorskim (3283 z 3574).”
- EN: "LIS is Poland's most evenly spread common surname (≥10,000 entries). Its share in each voivodeship almost mirrors the register: 14.3% of LIS entries are in Mazowieckie, vs 14.4% of all entries."

**Where it's used.** Editorial/social ("most regional surnames" lists). Surname page badge ("very concentrated" or "spread nationwide").

**Data & method.**

- Main index: **D = ½ Σ_v |p_v − q_v|**, with p_v = n_sv/N_s and q_v = T_v/T. D=0 means the same spread as the whole register.
- Also reported: top-share and HHI (Σp²; the register itself has HHI 0.0796).
- Lists at N ≥ 1,000, 5,000 and 10,000 paired entries in the voivodeship files.
- Output: `concentration_lists.csv`.

**Real results**

- N ≥ 1,000: 5,464 surnames, median D 0.375. 707 of them (12.9%) have ≥50% of their entries in one voivodeship, 71 have ≥80%, and 24 have ≥90%.
- N ≥ 5,000: 860 surnames. 23 (2.7%) have ≥50% in one voivodeship, and none has ≥80%.
- Size bias: median D is 0.763 for 20–99 entries, 0.586 for 100–999, 0.384 for 1,000–9,999, and 0.235 for ≥10,000. Small surnames look concentrated partly because they are small, so editorial lists need thresholds of ≥1,000.
- Most concentrated at ≥1,000: all top 15 are in Pomorskie. They are DAMPS (95.2% of 1,022), WALKUSZ (94.9%), KLINKOSZ (94.8%), HINCA (94.5%), KWIDZIŃSKI/KWIDZIŃSKA (93.9% of 2,619), MIOTK (93.4% of 2,618), and so on down to FORMELLA. FORMELA is 10th (91.9%).
- Most concentrated at ≥5,000: BARTKOWIAK (D 0.637; 69.2% Wielkopolskie), WOJTKOWIAK, NAPIERAŁA, RATAJCZAK (15,711; 66.1%) and JANKOWIAK. 14 of the top 15 are in Wielkopolskie. The exception is KUBICA (67.8% Śląskie).
- Largest surnames with ≥50% of entries in one voivodeship: RATAJCZAK 15,711, STACHOWIAK 12,330, SKRZYPCZAK 11,480 and MIKOŁAJCZAK 10,778 (all Wielkopolskie).
- Most even at ≥10,000: LIS (D 0.074), WILCZYŃSKI (0.111), SZYDŁOWSKI (0.113), KUROWSKI (0.117) and BIERNACKI (0.120).
- Showcase evenness ranks among the 341 surnames with ≥10,000 entries: SZCZEPAŃSKI is 30th most even, KOWALSKI 43rd, NOWAK 100th, WIŚNIEWSKI 206th and KACZMAREK 330th. BARTKOWIAK is 341st, the least even.

**Rules & caveats.**

- **Proposed status:** LIKELY (derived).
- Every list carries its threshold and method.
- Never label a concentrated surname by ethnicity or regional identity. It is geography of registrations only.
- A concentrated surname is not "from" that region.

**Presentation idea.** A "Most regional surnames" carousel with one card per surname: a mini-map plus "N% of entries in X". A spectrum bar from "spread nationwide" to "highly regional" places the looked-up surname by D.

**Interest rating: 4.** FORMELA, BARTKOWIAK and LIS make instantly shareable contrasts.

---

## B4. Spelling-pattern geography (suffix classes)

**What the user sees**

- EN: "Nearly half (48.3%) of entries registered (permanent residence) in Kujawsko-Pomorskie are -ski/-ska surnames. In Podkarpackie it is 13.7% (PESEL register of living persons, 20 Jan 2026)."
- PL: „Prawie połowa (48,3%) wpisów z zameldowaniem na pobyt stały w województwie kujawsko-pomorskim to nazwiska na -ski/-ska; w podkarpackim tylko 13,7%.”
- PL: „Nazwiska na -uk/-czuk to 7,3% wpisów w podlaskim i 6,4% w lubelskim, wobec 0,4% w małopolskim.”
- PL: „Nazwiska na -ak (bez -czak) to 12,8% wpisów w wielkopolskim, prawie dwa razy więcej niż średnio (6,6%).”

**Where it's used.** Editorial/social (maps). Surname page ("your ending is most common in…"). Premium report.

**Data & method (`SUFFIX-v1`).**

- Each file row is classified by the spelling of the registered form. The first matching rule wins, in this order: compound (hyphen or space) → -DZKI/-DZKA → -CKI/-CKA → -SKI/-SKA → -CZYK/-CZAK → -UK (incl. -CZUK) → -ICZ (incl. -OWICZ/-EWICZ) → -AK (excl. -CZAK) → -EK → -EC → -IK/-YK (excl. -CZYK) → -KO → other.
- Classes are counted in entries. The share is taken of all entries listed for the voivodeship.
- Output: `suffix_by_voivodeship.csv` (long format, with LQ and rank).

**Real results** (share % of entries; 2026-01-20)

| voivodeship | SKI | CKI | DZKI | AK | CZYK/CZAK | EK | EC | IK/YK | UK | ICZ | KO | compound | other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dolnośląskie | 26.3 | 5.2 | 0.3 | 6.6 | 4.5 | 5.4 | 1.0 | 3.5 | 1.5 | 5.3 | 1.5 | 0.2 | 38.6 |
| Kujawsko-Pomorskie | **48.3** | **6.4** | 0.2 | 5.7 | 3.5 | 3.6 | 0.4 | 1.9 | 0.4 | 4.0 | 0.5 | 0.2 | 24.8 |
| Lubelskie | 21.5 | 4.0 | 0.3 | 7.0 | 3.7 | 7.0 | 1.4 | 4.0 | **6.4** | 3.5 | 1.6 | 0.2 | 39.5 |
| Lubuskie | 29.0 | 5.5 | 0.3 | 8.0 | 5.2 | 5.0 | 0.9 | 3.0 | 1.6 | 6.3 | 1.6 | 0.2 | 33.3 |
| Łódzkie | 31.0 | 4.8 | 0.3 | 9.4 | **9.3** | 6.7 | 0.6 | 3.6 | 0.4 | 3.4 | 0.4 | 0.2 | 29.9 |
| Małopolskie | 14.6 | 2.7 | 0.2 | 6.2 | 4.7 | **9.1** | 1.7 | 5.1 | 0.4 | 2.6 | 1.1 | 0.4 | 51.3 |
| Mazowieckie | 38.8 | 5.9 | 0.5 | 6.1 | 4.8 | 5.7 | 0.6 | 2.9 | 1.7 | 3.9 | 0.8 | 0.4 | 27.7 |
| Opolskie | 18.4 | 3.9 | 0.2 | 5.1 | 4.0 | 7.4 | 1.2 | 4.3 | 1.2 | 3.3 | 1.3 | 0.1 | 49.5 |
| Podkarpackie | 13.7 | 3.0 | 0.2 | 5.8 | 2.5 | 7.5 | **1.9** | 3.9 | 0.6 | 3.0 | 1.5 | 0.1 | 56.1 |
| Podlaskie | 43.4 | 6.2 | **0.7** | 2.0 | 2.1 | 1.5 | 0.4 | 2.0 | **7.3** | **9.2** | **4.6** | 0.1 | 20.5 |
| Pomorskie | 36.1 | 5.1 | 0.2 | 3.8 | 3.3 | 3.8 | 0.5 | 2.4 | 1.1 | 4.1 | 1.0 | **0.6** | 38.0 |
| Śląskie | 17.4 | 3.1 | 0.2 | 5.1 | 5.1 | 8.8 | 1.3 | **5.4** | 0.7 | 2.2 | 1.1 | 0.2 | 49.4 |
| Świętokrzyskie | 23.7 | 4.0 | 0.3 | 5.6 | 5.3 | 7.1 | 1.8 | 4.4 | 0.5 | 2.9 | 0.5 | 0.1 | 43.9 |
| Warmińsko-Mazurskie | 41.0 | 5.7 | 0.4 | 3.8 | 3.5 | 3.8 | 0.6 | 2.5 | 1.7 | 7.4 | 2.0 | 0.2 | 27.4 |
| Wielkopolskie | 29.5 | 5.2 | 0.2 | **12.8** | 7.9 | 5.8 | 0.4 | 2.6 | 0.4 | 3.6 | 0.5 | 0.2 | 31.0 |
| Zachodniopomorskie | 31.8 | 5.4 | 0.3 | 6.8 | 5.0 | 4.8 | 0.8 | 3.1 | 1.7 | 6.0 | 1.7 | 0.3 | 32.4 |
| ALL (voiv files) | 28.4 | 4.7 | 0.3 | 6.6 | 4.9 | 6.2 | 1.0 | 3.5 | 1.5 | 4.0 | 1.2 | 0.3 | 37.5 |

**Literature claims tested against 2026 data (morphology only).**

- **-AK:** highest in Wielkopolskie (LQ 1.95), then Łódzkie (1.43). **Confirmed.**
- **-UK/-CZUK:** Podlaskie (LQ 4.92) and Lubelskie (4.31), vs 0.28–0.29 in Kujawsko-Pomorskie, Małopolskie, Łódzkie and Wielkopolskie. The max/min share ratio is 17.6. **Confirmed**, and it is the most regional class.
- Other classes:
  - -ICZ: highest in Podlaskie (2.31) and Warmińsko-Mazurskie (1.86); above average in Lubuskie (1.57), Zachodniopomorskie (1.52) and Dolnośląskie (1.32); lowest in Śląskie (0.56).
  - -KO: Podlaskie (4.00).
  - -EK: Małopolskie (1.46) and Śląskie (1.43), lowest in Podlaskie (0.24).
  - -EC: Podkarpackie (2.01) and Świętokrzyskie (1.85).
  - -CZYK/-CZAK: Łódzkie (1.89) and Wielkopolskie (1.62).
  - -IK/-YK: Śląskie (1.53).
  - -SKI/-SKA: Kujawsko-Pomorskie (1.70) and Podlaskie (1.52).
  - -DZKI: Podlaskie (2.32).
- **Stability:** 2025-02-24 vs 2026-01-20 shares moved by at most 0.065 pp in any voivodeship/class.

**Rules & caveats.**

- **Proposed status:** class shares are LIKELY (derived; `SUFFIX-v1` is a spelling rule and needs no morphological analysis).
- Classes are spelling patterns only. Never map them to ethnicity, nationality, religion or regional identity.
- Causes are **INSUFFICIENT_DATA**.
- The -KO and -UK classes are much larger in the national file than in the voivodeship files: -KO 2.44% vs 1.16%, -UK 2.38% vs 1.48%. B5 shows most -KO/-UK entries have no voivodeship in the breakdown. So B4 describes registered-residence entries only.
- Noun surnames spelled -SKA (e.g. KRASKA) fall into -SKI/-SKA by spelling. This is about 0.2% of entries.

**Presentation idea.** Small multiples: one choropleth per class, 13 in total or the 8 most regional, with a shared "×national" diverging scale. The surname page highlights the user's class.

**Interest rating: 5.** It confirms the onomastic textbook patterns with fresh official data, and it is highly mappable.

---

## B5. Reconciliation: national vs voivodeship files (2026-01-20)

**What the user sees**

- EN: "At least 12.75% of entries in the PESEL register of living persons (5,451,158 of 42,757,839; 20 Jan 2026) are not attributed to any voivodeship in the permanent-residence breakdown."
- PL: „Co najmniej 12,75% wpisów w rejestrze PESEL osób żyjących (5 451 158 z 42 757 839; 20.01.2026) nie jest przypisanych do żadnego województwa w zestawieniu według zameldowania na pobyt stały.”
- Surname card: "Of NOWAK's 198,125 entries, 176,354 (89.0%) appear in the voivodeship breakdown."

**Where it's used.** Surname page (a mandatory caveat line). Methodology page. Editorial is possible but secondary.

**Data & method (`RECON-v1`).**

- Per form and sex: gap = national count − Σ voivodeship cells.
- The gap mixes two things the files don't separate: (a) entries with no voivodeship in the breakdown, and (b) suppressed single-entry cells (at most 1 per missing cell).
- Bounds: unattributed_s ∈ [max(0, gap_s − missing_cells_s), gap_s].
- Output files: `reconciliation_2026.csv`, `reconciliation_by_suffix_2026.csv`, `reconciliation_showcase_2026.csv`.

**Real results.**

| | national entries | in voivodeship files | gap | gap % | unattributed (lower bound) | max suppressed singletons |
|---|---|---|---|---|---|---|
| M | 21,197,537 | 16,590,111 | 4,607,426 | 21.74% | 2,851,750 (13.45%) | 1,755,676 |
| F | 21,560,302 | 17,296,363 | 4,263,939 | 19.78% | 2,599,408 (12.06%) | 1,664,531 |
| M+F | 42,757,839 | 33,886,474 | 8,871,365 | 20.75% | 5,451,158 (12.75%) | 3,420,207 |

**Consistency checks.** All three passed:

- 0 forms in the voivodeship files are missing from the national file.
- 0 forms have a voivodeship sum above the national count.
- 433,047 national forms (2,922,656 entries) appear in no voivodeship cell.

**By size:**

- ≥10,000 national entries: gap 9.6%, all of it unattributed. These surnames have no suppressed cells.
- Forms with ≥1,000 entries: median gap 9.25% (p10 6.95%, p90 14.29%).
- 2–19 entries: gap 62.1%, but the lower bound is only 0.3%. That gap is mostly suppression.

**Showcase gap:**

| Surname | National | In voiv files | Gap % | Unattributed lower bound |
|---|---|---|---|---|
| NOWAK | 198,125 | 176,354 | 11.0% | 21,771 |
| KOWALSKI | 133,897 | 121,166 | 9.5% | 12,731 |
| WIŚNIEWSKI | 107,256 | 96,771 | 9.8% | 10,485 |
| KACZMAREK | 60,060 | 54,600 | 9.1% | 5,460 |
| SZCZEPAŃSKI | 33,197 | 30,352 | 8.6% | 2,845 |
| GRZEGORCZYK | 10,462 | 9,610 | 8.1% | 852 |
| CZEKIERDA | 429 | 392 | 8.6% | 32 |

**By spelling class** (gap %): -KO 62.4%, compound 53.8%, -UK 50.9%, other 27.3%, -IK/-YK 20.7%, and 9.5–13.9% for every other class. Among forms with ≥1,000 entries, the median -KO form has **98.5%** of its entries outside the breakdown.

- 206 forms with ≥1,000 entries (367,848 entries) are >80% unattributed. By class, 82 are "other", 76 -KO, 37 -UK, 9 -IK/-YK and 2 -SKI/-SKA. Largest examples: MELNYK (F 7,257 national entries, of which 239 are in voivodeship cells), KOVALCHUK and SHEVCHENKO.
- Forms (≥20 entries) that are >80% unattributed account for 2,685,002 of the 8,871,365 gap.

**Rules & caveats.**

- **Proposed status:** the gap counts are VERIFIED (arithmetic on two files with the same reference date). The lower bound is LIKELY because it relies on the bounds method. The **cause** is **INSUFFICIENT_DATA**: the files do not say why an entry lacks a voivodeship, so do not speculate (e.g. about emigration, citizenship or temporary registration) on any surface.
- Never infer a nationality from the spelling patterns above.
- **Product rule proposal:** show "N% of entries are not in the voivodeship breakdown" on every regional card. Suppress or heavily caveat the regional card when that share exceeds 50%. For MELNYK, the map would describe only ~3% of entries.

**Presentation idea.** A thin stacked bar under each map: "in breakdown / not attributed / possibly suppressed".

**Interest rating: 3.** It is essential as a caveat and a methodological strength; as a stand-alone story it is modest.

---

## B6. Stability over time

**What the user sees.** Mostly this is internal QA. Possible user line: "The regional pattern of KACZMAREK is stable: 40.8% of entries are in Wielkopolskie in both Feb 2025 and Jan 2026."

**Where it's used.** Methodology page and QA. A premium report could carry a "stable since 2017" note, only with the caveat below.

**Data & method (`STAB-v1`).**

- Per paired surname: the share vector p_v, the max |Δp_v| in pp, and D_ab = ½Σ|Δp|.
- Comparisons: 2025-02-24 vs 2026-01-20 (same universe), and 2017-12-31 (INCLUDING deceased, a different universe) vs 2026 (living). The second comparison is of shares only.
- Output files: `stability_regional.csv`, `stability_voivodeship_totals.csv`.

**Real results.**

- **2025-02-24 → 2026-01-20, surnames ≥1,000 in both (5,458):**
  - The top voivodeship by count is unchanged for 5,423 (99.4%), and by LQ for 99.0%.
  - The max share change has median 0.25 pp, p90 0.47 pp and max 1.20 pp.
  - All 35 flips are `TIE-v1` near-ties in *both* snapshots; the top two are always within 0.67 pp of the surname's entries. Example: BANASIAK, Łódzkie 20.89% vs Mazowieckie 20.85%.
- **2025-02-24 → 2026-01-20, surnames ≥100 in both (39,451):** 99.0% unchanged; the max share change has median 0.61 pp.
- **2017 (incl. deceased) vs 2026 (living), 2026 top-100 surnames:**
  - The top voivodeship is unchanged for 96/100, and by LQ for 98/100.
  - The max share change has median 0.57 pp and max 1.21 pp.
  - Flips: DUDEK, KOŁODZIEJ and JANIK went from Śląskie to Małopolskie; WŁODARCZYK went from Łódzkie to Mazowieckie.
- **2017 vs 2026, all surnames ≥1,000 (5,442):** 96.2% unchanged; max share change median 1.08 pp, max 4.93 pp.
- **Register composition shift (share of all listed entries, 2017 → 2026):** Śląskie 11.81% → 11.39%, Małopolskie 8.67% → 9.21%, Mazowieckie 13.98% → 14.39%. The universes differ, so this is not population change.
- **Showcase, share in top voivodeship (2017 → 2025 → 2026):**
  - NOWAK, Wielkopolskie: 18.05 → 18.27 → 18.30%.
  - KACZMAREK, Wielkopolskie: 40.30 → 40.78 → 40.84%.
  - CZEKIERDA's top flips from Podkarpackie (2017) to Lubelskie (2026). This is its known near-tie.

**Rules & caveats.**

- **Proposed status:** LIKELY (derived).
- The 2017 file includes deceased persons, so never present the 2017→2026 change as migration or population change. Causes are INSUFFICIENT_DATA.
- The ~11-month window supports "stable", not "trend".

**Presentation idea.** None user-facing beyond a "stable" badge. Use the results for QA thresholds: `TIE-v1` flags flip-prone cases.

**Interest rating: 2.** It is reassuring, but nothing striking appears.

---

## B7. Official place-name candidates for -SKI/-CKI/-DZKI surnames (PRNG)

**What the user sees**

- EN: "Official place names with the adjective 'bagiński': 1. Bagińskie (village, Podlaskie, kolneński county; 53.49472 N, 22.12750 E). Source: PRNG, GUGiK. This is a possible link only; these data do not show where the surname came from."
- EN: "26 official localities in 13 voivodeships have the adjective form 'kowalski', including the town of Kowal (Kujawsko-Pomorskie)."

**Where it's used.** Surname page ("places sharing your surname's form", as a map of pins). Premium report (the full list with coordinates).

**Data & method (`PLACE-v1`).**

- PRNG field format: `przymiotnik` holds one lowercase adjective per row, with no separators, spaces or uppercase. 1,124 adjectives are hyphenated compounds (e.g. `adamowo-górski`), and 1 has a stray trailing quote (`jankowsko-skarbowski"` for Jankowo-Skarbowo), which was stripped.
- **Adjectives exist only for `rodzaj obiektu` = wieś (43,638 rows) and miasto (1,026 rows), plus 1 część wsi.** All 44,665 rows are `status nazwy` = urzędowa (official). So the "settlement types" restriction is built into the data: villages and towns with official names. Hamlets, parts of villages and colonies have no adjective in PRNG, and none was invented for them.
- There are 22,391 distinct adjectives. 15,992 belong to one locality only, and 400 are shared by more than 10 localities (`wolski`: 393).
- Surname universe: male forms ending -SKI/-CKI/-DZKI in the 2026 national M file, weighted by paired national entries.
- Match rule: exact lowercase equality with the adjective.
- Coordinates: WGS84 DMS converted to decimal (0 parse failures).
- Output files: `place_candidates_coverage.csv`, `place_candidates_distribution.csv`, `showcase_place_candidates.csv` (with lat/lon and the surname's LQ in each place's voivodeship).

**Real results.**

| min paired national entries | surnames | match ≥1 official adjective | % distinct | % of entries | match a town |
|---|---|---|---|---|---|
| ≥2 | 48,212 | 6,335 | 13.1% | 66.3% | 569 |
| ≥20 | 26,047 | 5,361 | 20.6% | 67.2% | 504 |
| ≥100 | 11,804 | 3,860 | 32.7% | 70.4% | 409 |
| ≥1,000 | 1,879 | 1,287 | 68.5% | 83.2% | 180 |

- **By ending (≥20):** -DZKI 38.7% of surnames (82.5% of entries), -CKI 28.2% (68.7%), -SKI 19.0% (66.8%).
- **Number of candidate places** (matched surnames ≥20, n=5,361): 1 place 47.8%, 2 places 19.7%, 3 places 10.1%, 4–5 places 9.7%, 6–10 places 7.1%, 11–20 places 3.3%, >20 places 2.2%. For 56.1% of matched surnames, all candidates lie in one voivodeship.
- **Showcase:**
  - KOWALSKI: 26 places in 13 voivodeships, one of them a town (Kowal). The surname's LQ in those voivodeships runs from Kujawsko-Pomorskie 1.63 to Podlaskie 0.25.
  - WIŚNIEWSKI: 15 places in 6 voivodeships, 7 of them in Mazowieckie. Its top LQ is Kujawsko-Pomorskie (3.10), where there is 1 candidate (Wiśniewa).
  - SZCZEPAŃSKI: 2 places. Szczepany, Podlaskie has LQ 0.49 (462 entries). Szczepany, Łódzkie has LQ 1.30 (2,499 entries).
  - NOWAK, KACZMAREK, GRZEGORCZYK and CZEKIERDA are not -SKI/-CKI/-DZKI forms, so this fact does not apply.
- **No match despite size:** LEWANDOWSKI (90,734 entries), PRZYBYLSKI, ADAMSKI, DOMAŃSKI. Absence of a match is not evidence of anything.
- **Cautionary single-candidate matches** (spelling coincidences are possible):
  - GŁOWACKI ↔ "Kolonia Głowa" (Łódzkie).
  - STEFAŃSKI ↔ Stefania (Wielkopolskie).
  - CHOJNACKI ↔ Chojnata (Łódzkie).

**Rules & caveats.**

- **Proposed status:** "PRNG lists place X with adjective Y" is VERIFIED. "The surname may be linked to X" is **POSSIBLE at most**, per surname.
- Never say "comes from", "originated in" or "family seat". No coat-of-arms or nobility claims.
- The naming direction cannot be determined from these data: a place may be named after a family, or both may share a root.
- PRNG lists only today's localities inside today's Poland. Historical, renamed and vanished places, and places outside current borders, are invisible.
- Credit GUGiK (CC BY 4.0).

**Presentation idea.** A map of candidate places as pins over the surname's LQ choropleth. The card says "N official places share this adjective form". Above 10 places, show "common place-name form" instead of pins.

**Interest rating: 4.** It is engaging and very visual, with 67% of -ski/-cki/-dzki entries covered, provided the POSSIBLE framing is never dropped.

---

## B8. Signal test: are bearers still over-represented near the candidate place (voivodeship level)?

**What the user sees** (only when the per-surname check passes; see rules)

- EN: "An official village, Bagińskie (Podlaskie), has the adjective 'bagiński'. Entries for BAGIŃSKI/BAGIŃSKA in the PESEL register of living persons are most over-represented in Podlaskie: 6.1× the national rate, permanent registered residence, 20 Jan 2026. This is a possible link, not an established origin."
- PL: „Urzędowa nazwa wsi Bagińskie (woj. podlaskie) ma przymiotnik »bagiński«. Wpisy BAGIŃSKI/BAGIŃSKA w rejestrze PESEL osób żyjących są najsilniej nadreprezentowane w województwie podlaskim (6,1 raza więcej niż średnio w kraju; zameldowanie na pobyt stały, 20.01.2026). To możliwy trop, a nie ustalone pochodzenie nazwiska.”

**Where it's used.** It validates the B7 feature. It also serves as an editorial "how we test our claims" piece and a premium-report line.

**Data & method (`SIGNAL-v1`).**

- Test set (MAIN): paired -SKI/-CKI/-DZKI keys with ≥100 entries in the 2026 voivodeship files, whose adjective matches 1–3 PRNG localities, all in one voivodeship V_c.
- Outcome: V_c = argmax LQ (also argmax count, and V_c within the top-3 by LQ).
- Baseline: shuffle V_c across the test surnames, 10,000 permutations, seed 20260929. The p-value floor is 1/10,001, so p=0.0001 means none of the 10,000 permutations reached the observed value.
- Suppressed cells enter these internal statistics as 0; they are never displayed. At ≥100 entries a single hidden entry gives at most LQ 0.41, so "LQ < 1" classifications are unaffected. Medians may be very slightly low.
- Why a permutation test: the register is an enumeration, not a sample. The test asks whether the place's voivodeship and the surname's peak voivodeship coincide more often than they would if the place labels were matched to surnames at random.
- Output files: `signal_test_results.csv`, `signal_test_by_voivodeship.csv`.

**Real results**

| variant | surnames | entries | top-LQ = V_c: observed | permutation mean (97.5th pct) | p | lift | top-count = V_c obs/exp | V_c in top-3 LQ obs/exp | median LQ in V_c obs/perm |
|---|---|---|---|---|---|---|---|---|---|
| **MAIN** 1–3 places, one voiv., ≥100 | 1,823 | 1,624,609 | **27.2%** | 7.9% (9.2%) | 0.0001 | 3.43 | 30.7% / 11.1% | 48.1% / 22.1% | 1.42 / 0.48 |
| exactly 1 place, ≥100 | 1,552 | 1,289,312 | 25.4% | 7.6% | 0.0001 | 3.33 | 28.4% / 10.3% | 45.9% / 21.4% | 1.31 / 0.47 |
| 1–3 places, ≥20 | 2,874 | 1,677,490 | 24.4% | 7.5% | 0.0001 | 3.26 | 27.7% / 10.0% | 44.3% / 21.5% | 1.13 / 0.27 |
| 1–3 places, ≥500 | 683 | 1,351,268 | 28.1% | 8.9% | 0.0001 | 3.16 | 33.1% / 14.5% | 50.1% / 25.0% | 1.47 / 0.72 |
| 1–3 places, ≥1,000 | 349 | 1,115,864 | 25.8% | 9.2% | 0.0001 | 2.81 | 32.7% / 16.4% | 49.6% / 27.4% | 1.34 / 0.85 |
| villages only (MAIN) | 1,719 | 1,549,006 | 26.7% | 8.1% | 0.0001 | 3.31 | 30.7% / 11.3% | 47.8% / 22.4% | 1.41 / 0.49 |
| MAIN, V_c in the 4 lowest-distinctiveness voivodeships (Dolnośląskie, Zachodniopomorskie, Lubuskie, Opolskie; own permutation) | 196 | 149,707 | **3.1%** | 3.3% (5.6%) | 0.66 | 0.93 | 3.1% / 3.0% | 28.1% / 23.0% | 0.87 / 0.79 |
| MAIN, V_c in the other 12 (own permutation) | 1,627 | 1,474,902 | **30.1%** | 8.7% (10.1%) | 0.0001 | 3.44 | 34.0% / 12.4% | 50.5% / 22.7% | 1.59 / 0.45 |

By candidate voivodeship (MAIN), as "observed top-LQ match vs permutation expectation, n":

- Strong: Podlaskie 54.3% vs 12.6% (151), Kujawsko-Pomorskie 43.3% vs 13.7% (120), Małopolskie 31.5% vs 4.4% (92), Lubelskie 30.8% vs 5.8% (107), Świętokrzyskie 30.4% vs 6.8% (79), Mazowieckie 27.4% vs 11.0% (372), Pomorskie 27.2% vs 5.2% (92), Wielkopolskie 26.5% vs 8.6% (211), Łódzkie 26.3% vs 8.4% (133), Podkarpackie 26.3% vs 3.9% (95).
- Weaker: Warmińsko-Mazurskie 15.7% vs 6.8% (134), Śląskie 12.2% vs 1.8% (41).
- None: Opolskie 7.4% vs 2.3% (27), Dolnośląskie 3.0% vs 2.3% (66), Zachodniopomorskie 2.7% vs 1.8% (74), Lubuskie 0.0% vs 4.6% (29).

**Interpretation (honest).**

- **In aggregate there is a real signal.** Across 1,823 surnames, the candidate place's voivodeship is the surname's most over-represented voivodeship 3.4× as often as chance (27.2% vs 7.9%, p ≤ 0.0001). The signal holds at every threshold and variant.
- **Per surname it is weak.** 72.8% of MAIN surnames do *not* peak in the candidate voivodeship. For 41.5% of them, bearers are *under*-represented there (LQ < 1), and only 41.7% have LQ ≥ 2 there.
- **The signal is absent** where candidate places lie in the four voivodeships with the least distinctive surname mixes (B2b). The cause is INSUFFICIENT_DATA.
- **What this does not show:** it says nothing about direction (place → surname or surname → place). A voivodeship is also coarse: ŁUPIŃSKI's only candidate, Łupiny, lies in Mazowieckie (LQ 1.15), while 64.5% of ŁUPIŃSKI entries are in neighbouring Podlaskie.

**Rules & caveats.**

- **Proposed status:** the population-level test result is LIKELY (a reproducible statistic). Any **individual** surname link stays **POSSIBLE at most**, even when it matches.
- **Product rule proposal:** show the "bearers are still concentrated in that region" sentence only when all of the following hold for that surname:
  - it has 1–3 candidates, all in one voivodeship;
  - that voivodeship is its top-LQ voivodeship, with no `TIE-v1` LQ tie;
  - LQ there is ≥ 2;
  - n_sv there is ≥ 20.
- Otherwise show only the neutral "places sharing this adjective form" list (B7).
- Never generalise ("-ski surnames come from villages").

**Presentation idea.** A pin for the candidate place plus a highlighted voivodeship. A "possible link" badge with a tap-through: "How we test this: 27% of similar surnames peak in the candidate's region vs 8% by chance."

**Interest rating: 5.** It turns a tempting but risky feature into a tested, bounded one, and the regional exception is itself a story (with the cause left open).

---

## B9. Demo surnames with striking regional signatures

1. **BARTKOWIAK.**
   - 11,542 national entries; 10,612 in the voivodeship files; 7,347 (69.2%) registered in Wielkopolskie (LQ 7.43, 23.3 per 10k vs 3.1 nationally). Its lowest LQ is Podkarpackie (0.07; 45 entries).
   - It is the most concentrated surname with ≥5,000 entries (D 0.637), Wielkopolskie's "local favourite" at K = 50, 100 and 200, and in both 2025 and 2026.
   - It is the poster child for the -AK map (B4).
2. **FORMELA.**
   - 3,960 national entries; 3,283 of 3,574 voivodeship-file entries (91.9%) are in Pomorskie (LQ 15.14). 4 voivodeships are `<2 or absent`.
   - It is the 10th most concentrated surname with ≥1,000 entries, and all 15 of the most concentrated are in Pomorskie.
   - It is the most extreme easy-to-map case. Describe it by geography only.
3. **BAGIŃSKI/BAGIŃSKA.**
   - 11,069 national entries; 9,915 in the voivodeship files.
   - Podlaskie has 1,896 entries (19.1%) and LQ 6.15 (18.0 per 10k vs 2.9). By count it is a near-tie with Dolnośląskie (1,794), but by LQ it clearly leads (z = 28.8).
   - Its single official candidate place, Bagińskie (village, Podlaskie), lies in the same voivodeship, so it passes the proposed B8 display rule. POSSIBLE only.

Files: `showcase_regional.csv` and `showcase_regional_summary.csv` (all showcase and demo surnames), `showcase_place_candidates.csv` (BAGIŃSKI, KOWALSKI, WIŚNIEWSKI, SZCZEPAŃSKI, ŁUPIŃSKI, plus 15 signal-test matches and 5 misses, with coordinates).

**Interest rating: 5.**

---

## Data-quality findings

1. **One in five national entries is not in the voivodeship breakdown** (2026-01-20). The gap is 8,871,365 entries (20.75%). At least 5,451,158 (12.75%) cannot be explained by suppressed singleton cells.
   - The files are otherwise consistent: no form in the voivodeship files is missing nationally, and no voivodeship sum exceeds the national count.
   - Over time, the national files grew by 126,154 entries (2025-01-22 → 2026-01-20), while the voivodeship files shrank by 246,047 (−0.72%; 2025-02-24 → 2026-01-20). The reference dates differ by about one month in 2025, so this is indicative only. Cause: INSUFFICIENT_DATA.
2. **Coverage differs sharply by spelling pattern.**
   - Forms ending -KO and -UK, and forms with non-Polish letter sequences, are mostly absent from the permanent-residence breakdown. The median -KO form with ≥1,000 entries has 98.5% outside it, and 206 forms with ≥1,000 entries are >80% outside.
   - Regional cards for such forms would describe a small minority of entries. Cause: INSUFFICIENT_DATA; never infer nationality.
3. **Suppression makes paired cells lower bounds** when one sex cell is `<2 or absent` (e.g. CZEKIERDA, Świętokrzyskie). Pandas `pivot_table(aggfunc="sum")` silently turns an all-missing cell into 0. The scripts use `pivot` to keep blanks, and any production code must do the same.
4. **Pairing ambiguities.**
   - 632 male forms end in -SKA/-CKA/-DZKA (43,991 entries). 495 are noun homographs and are resolved by the tie-break; 137 mixed forms remain.
   - 6,134 female forms end in -SKI/-CKI/-DZKI (43,758 entries) and are kept unpaired.
5. **PRNG.**
   - Adjectives exist for only 44,665 of 124,247 locality rows (villages and towns).
   - One adjective has a stray quote (`jankowsko-skarbowski"`).
   - 4 adjectives do not end in -ski/-cki/-dzki: `bobrownickopolny`, `czecho-zabłotny`, `łobezki`, `obozowy`.
   - Coordinates parsed cleanly: lat 49.025–54.831, lon 14.145–24.130.
6. **The 568woj 2017 files** include deceased persons and have a different header (`Województwo,TERYT,Nazwisko,Liczba wystąpień`). Their TERYT codes map one-to-one to the 16 voivodeships and were used for the map joins. Raw listed totals are 35,003,905 entries (2017) vs 33,886,474 (2026-01-20). The B6 matrices, which exclude the unpaired cross-gender forms, hold 34,991,515 vs 33,871,055.
7. **Compound forms include spaces as well as hyphens.** There are 4,730 distinct spaced forms (20,486 voivodeship-file entries, e.g. `NGUYEN VAN`, `SIEMKO VEL SIEMCZUK`) and 20,972 hyphenated forms (66,746 entries).

## What didn't work

- **A single "signature surname" per voivodeship by max LQ.** It is threshold-driven (0–2/16 agreement across thresholds) and changed in 4/16 voivodeships within 11 months. It was replaced by the top-5 list at ≥1,000 (4.69/5 stable) and by the rule-stated "local favourite" (16/16 stable year on year, but K-dependent).
- **"Most concentrated" lists without a size floor.** Median D falls from 0.763 (20–99 entries) to 0.235 (≥10,000), so small surnames look concentrated by construction. Lists need ≥1,000.
- **Place-name matching beyond villages and towns.** PRNG gives no adjective for hamlets, parts of villages, colonies or settlements. Generating adjectives ourselves would be fabrication, so this was not done.
- **Using the place match as evidence of origin.** Only 27.2% of well-defined cases peak in the candidate voivodeship, 41.5% are under-represented there, and the signal is absent in 4 voivodeships. Some single-candidate matches are plainly coincidental spellings (GŁOWACKI ↔ Kolonia Głowa). The voivodeship level is too coarse near borders (ŁUPIŃSKI ↔ Łupiny).
- **Unmatched large surnames** (LEWANDOWSKI, 90,734 entries) cannot be interpreted. PRNG covers only current, official, in-Poland localities.
- **2017 vs 2026 as a "change" story.** The 2017 file includes deceased persons, so only share stability can be reported. Nothing striking appeared: 96–98% of top-100 surnames have the same top voivodeship.
- **Causes of any regional pattern** (e.g. why the west has weak signatures and no place-name signal) are INSUFFICIENT_DATA in these files.
