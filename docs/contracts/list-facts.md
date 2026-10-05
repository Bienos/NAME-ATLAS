# Contract — list facts (statistics about one whole published list)

- **Status:** `list_facts@1` accepted with ADR-0015 (TASK-040, merged in #32 on 2026-09-30). `list_facts@2` (TASK-043) accepted with ADR-0018 (merged in #37 on 2026-09-30). `list_facts@3` (TASK-044) accepted with ADR-0019. `list_facts@4` (TASK-106, ADR-0019 §5) is accepted when TASK-106's pull request is merged.
- **Schema:** `packages/contracts/src/list-facts.ts` (`listFactsArtefactSchema`, `LIST_FACTS_SCHEMA_VERSION = "list_facts@4"`).
- **Producer:** `packages/truth/bin/build-list-facts.ts` (`pnpm truth:list-facts`), which runs the pure pipeline `computeListFacts` / `buildListFactsArtefact` in `packages/truth/src/list-facts/build.ts` (pipeline version `list_facts_pipeline@4`, `LIST_FACTS_METHOD_VERSION` in `packages/truth/src/version.ts`) over each national list's 2019-06-30 edition and every edition of its series (`PESEL_TREND_EDITIONS` in `packages/sources/src/registry.ts`) and writes the generated module `packages/truth/src/generated/list-facts.ts` (`LIST_FACTS_DATA`).
- **Consumer:** the landing page (`apps/web`), server-side, through `listFacts()` from `@name-atlas/truth` (`packages/truth/src/list-facts/artefact.ts`). It parses the module against the schema once, memoises it and throws if it does not parse; the page then renders without the atlas section.
- **Canonical basis:** ADR-0015 (the data path: list-scope statistics derived offline into a committed, SHA-pinned artefact), ADR-0018 (named selections and the one comparison of the two lists), ADR-0019 (editions of one list compared within one declared series), TASK-040, TASK-043 and TASK-044 (scope). The statistics themselves are not specified in the canonical corpus; `docs/canonical/14` §30 (a derived statistic is a FACT about a deterministic calculation) is the confidence rule the artefact applies, and `docs/canonical/12` §6.3–§6.4 the surface rule.

## What a list fact is, and is not

- **About one list.** Its subject is one resource version of one national PESEL file: the male list (`1148808`) or the female list (`1148811`), reference date 2026-01-20. Each figure describes the **published list**: living persons, current surname (`nazwisko aktualne`), surnames with at least 2 bearers (the publisher omits surnames with one bearer), in the PESEL register at the reference date. It is never a figure about "Poles" or "Poland".
- **Its earlier editions, within one series.** Since `list_facts@3` (ADR-0019), `editions` and `change` set the list beside the earlier editions of the same list: the editions of its **series**, those whose published universe description is the same (from 2020-01-22). They compare list-scope figures over time and state what changed, never why: no births, deaths, marriages, migration or nationality. The male and female series are two series and are never added together. A publisher duplicate is refused and shown as a gap with its reason, never as a value. *(Amends ADR-0015 §4 and "Valid only for its SHA-pinned resources" below.)*
- **Never both lists summed.** The male and female lists are two universes (TASK-004 §14 U-1). The artefact holds them under separate keys, each computed on its own. No field is a sum, union or merge across the two; a sum *within* one list (its people) is allowed. The one comparison is `overlap` (ADR-0018 §2.3): how many surnames are on the male list only, on both lists and on the female list only, compared by `canonical_key_v2`. It counts surnames, never people, and no field adds the people of the two lists. *(Amended by ADR-0018; `list_facts@1` allowed no comparison.)*
- **A named surname only by a list-scope rule.** A surname string crosses this boundary only as one of ADR-0018's named selections (`TOP_3`, `HYPHENATED_TOP`, `ON_BOTH_TOP`, `ONE_LIST_TOP`), each chosen in the generator by a fixed rule over the whole list, ties broken by key in code-point order, and each stored only when its count is at least `NAMED_SURNAME_FLOOR` = 20 on its list. It carries its key, its source string as published and its count, and it is text, not a link. Any other surname's count, rank or map is a surname claim and stays in the claim chain; the reach sets (`TOP_1`, `TOP_10`, `TOP_100`) stay unnamed. *(Amended by ADR-0018; `list_facts@1` carried no surname string.)*
- **Not regional.** Voivodeship figures are out of scope. Absence and suppression are not zero.

## Shape

```json
{
  "schema_version": "list_facts@3",
  "generated_by": "packages/truth/bin/build-list-facts.ts",
  "pipeline_version": "list_facts_pipeline@3",
  "snapshot_date": "2026-01-20",
  "birthday_reference": { "n_half": 23, "p_at_n_half": 0.507297234 },
  "lists": {
    "male":   { "partition": "national_male",   "source": {…}, "assessment": {…}, "summary": {…}, "collision": {…}, "crowd": {…},
                "dots": {…}, "concentration": {…}, "bands": {…}, "endings": {…}, "initials": {…}, "hyphenated": {…}, "named_top": {…},
                "editions": {…}, "change": {…} },
    "female": { "partition": "national_female", … the same sections … }
  },
  "overlap": { "method_version": "list_overlap@1", "male_only": …, "both": …, "female_only": …, "on_both_top": {…}, "one_list_top": { "male": {…}, "female": {…} } }
}
```

The schema refuses:

- `lists.male` whose `partition` is not `national_male` (and likewise for female), and any partition other than the two;
- a list whose `source.snapshot_date` differs from the artefact's;
- the same resource under both keys: the two lists' `external_record_id` must differ, and so must their `sha256`;
- two lists computed with different model parameters. Both must have the same `crowd.crowd_size`, the same curve n values, the same number of example rooms (`first_pair_at` length), the same `expected_distinct` n values, the same threshold `at_least` values and the same quantile `q` values (surname and person). So a figure of one list is never read with a parameter of the other;
- an array out of order: `curve` and `expected_distinct` must be ascending in `n`, `thresholds` ascending by `at_least`, `surname_quantiles` and `person_quantiles` ascending by `q`, each with no duplicates;
- a `reach_half` that does not hold `TOP_1`, `TOP_10` and `TOP_100` exactly once each;
- a `crowd` whose `expected_distinct` has no entry for its own `crowd_size`, so the crowd the page describes always has its figure.

Since `list_facts@2` it also refuses:

- `dots` out of ascending order by `count` or with a count twice, or whose surnames do not add up to `summary.surnames` or whose count × surnames do not add up to `summary.people`;
- `bands` that are not contiguous and ascending with only the last one open-ended, with no band starting at 10, with a band whose people cannot come from its surnames (outside `from × surnames … to × surnames`), that do not add up to the list's surnames and people, or whose `under_10` is not the surnames of the bands below 10;
- `concentration` levels out of ascending order by `q`, without q = 0.5, falling in surnames or people as q rises, carrying less than their share q of the list's people (`people × 1000 < q‰ × N`), or a `beyond_half` other than `summary.surnames` less the q = 0.5 set's surnames;
- `endings` that are not the partition's fixed set in its order, where one ending is a suffix of another, whose surnames or people exceed the list's, or whose `share_of_people` is not its people over the list's (to 10⁻⁹);
- `initials` that do not hold each of the 35 letters once in the fixed order, an entry that is neither `{letter, surnames, people}` with positive figures nor exactly `{letter, absent: true}`, a `top` that is absent or does not have the most people, a `rarest_polish` that is absent, not a letter of the Polish alphabet or does not have the fewest people among the Polish letters present, or letters and `outside` that do not add up to the list's surnames and people;
- a `hyphenated.top` whose key holds no hyphen, or figures that do not fit within the list;
- `named_top.items` with more than three entries, out of selection order (count descending, ties by key in code-point order), or not led by the list's `max_count`;
- any named selection (`named_top.items[]`, `hyphenated.top`, `overlap.on_both_top` on either list, `overlap.one_list_top.*`) with a count below `NAMED_SURNAME_FLOOR` (20);
- an `overlap` whose `male_only + both` is not the male list's surnames or whose `female_only + both` is not the female list's, a selection from a part that holds no surname, or a selection's count above its own list's `max_count`;
- two lists with different `concentration` q values or different band edges (added to the model parameters above). The endings differ by design: each list must carry its own partition's fixed set.

Since `list_facts@3` it also refuses (TASK-044 AC-02):

- `editions.items` out of ascending order of `data_date`, with a date twice, or with fewer than two editions;
- editions of different series in one list: every `editions.items[].series` must be the list's `editions.series`, with a null `universe_note_code`, except that the first may be null with `UNIVERSE_DESCRIPTION_DIFFERS` (since `list_facts@4`); and the two lists in one series (`lists.male.editions.series` must differ from `lists.female.editions.series`);
- two editions sharing a SHA-256 (a publisher duplicate is a gap, never an edition), a resource that is both an edition and a gap or twice either, or an edition whose `surnames` differ from its `row_count`;
- a gap without a `reason`, with a reason other than `PUBLISHER_DUPLICATE`, out of date order, on a date with an edition, or whose `duplicate_of` is not an edition of the list;
- a last edition that is not the list itself: its `resource_id`, `sha256`, `row_count` and `data_date` must equal the list's `source` (`external_record_id`, `sha256`, `row_count`, `snapshot_date`), and its `surnames`, `people` and `min_count` the list's `summary`;
- a `change` whose dates, `surnames_first/last` or `people_first/last` are not the first and last editions', whose `first_data_date` is not before its `last_data_date`, or whose `surnames_delta` or `people_delta` is not the last figure less the first;
- one-edition-only figures that do not fit within their edition, or that disagree on the surnames on both editions (`surnames_last − on_last_not_first.surnames` must equal `surnames_first − on_first_not_last.surnames`);
- a `top3_first_counts` that does not follow `named_top.items` key by key and in order, or with a count of zero (a surname not on the first edition is `null`).

Unknown fields are stripped, never passed on, except in an `initials.letters[]` entry, which is strict: an absent letter can carry no figure and a present letter no `absent` flag.

### Top level

| Field | Meaning |
|---|---|
| `schema_version` | `list_facts@3`. |
| `generated_by` | The generator, repository-relative. |
| `pipeline_version` | The version of the pipeline that wrote the artefact (`list_facts_pipeline@3`): the gate, confidence and rights checks, applied to every edition of each series, and the methods below. Not the schema's version. |
| `snapshot_date` | The register's reference date (`data_date`) both lists share. |
| `birthday_reference` | A **model constant, not PESEL data**: with 365 equally likely days, the smallest n at which two of n people share a day with chance at least one half (23), and that chance, computed in exact rational arithmetic (0.507297234). |
| `overlap` | The two lists' sets of surnames compared (below). |

### `source` — lineage, pinned to the registry

| Field | Meaning |
|---|---|
| `dataset_id` | dane.gov.pl dataset `1681`. |
| `external_record_id` | The resource id: `1148808` (male) or `1148811` (female). |
| `sha256` | SHA-256 of the exact bytes the facts were computed from; equals the registry's `official_sha256`. |
| `row_count` | Data rows parsed; equals the registry's `official_row_count` (408,182 / 420,082). |
| `snapshot_date` | The resource's `data_date`. |
| `source_page_url` | The source's dataset page on dane.gov.pl (`PESEL_SOURCE.homepage_or_reference_url`, the same page for both lists), the link ADR-0012 shows. |

### `assessment` — decided when the artefact was built

| Field | Value | How |
|---|---|---|
| `completeness` | `COMPLETE` | `assessUniverseCompleteness`: checksum **and** row count equal the registry's. |
| `confidence_status` | `VERIFIED` | `assessDerivedStatistic` (reproducible, inputs complete, bytes verified against the registry, no competing claim). |
| `confidence_method`, `confidence_version` | `derived_statistic_rule`, `derived_confidence@1` | The derived-statistic rule's identifiers. |
| `free_surface` | `ALLOWED` | `evaluateSurface(PESEL_RIGHTS_PROFILE, "FREE")`. Rights never change confidence, and neither reads the other. |

Anything else is refused by the generator and by the schema.

### `summary` — `list_summary@1`

N is the list's people (the sum of its counts), R its surnames (rows). Every boundary is decided in exact integer arithmetic; a quantile q is compared as thousandths (`part × 1000 ≥ q‰ × whole`).

| Field | Definition |
|---|---|
| `people` | N = Σ counts, within the list. |
| `surnames` | R = data rows. |
| `max_count`, `min_count` | Largest and smallest count (the largest belongs to the list's most common surname, unnamed; the smallest is 2, since surnames with one bearer are omitted). |
| `median_count_per_surname` | The ⌈R/2⌉-th smallest count (the lower median when R is even). |
| `median_count_per_person` | The largest c such that the people on surnames with count ≥ c are at least N/2 (the upper weighted median): at least half the people carry a surname with at least this many bearers. |
| `thresholds[]` | For `at_least` ∈ {2, 10, 20, 100, 1000, 10000, 50000}, ascending: `surnames` with count ≥ `at_least`, and the `people` on them. |
| `surname_quantiles[]` | For q ∈ {0.5, 0.9, 0.99, 0.999}, ascending: the smallest count c with (surnames with count ≤ c) / R ≥ q. |
| `person_quantiles[]` | For the same q: the smallest count c with (people on surnames with count ≤ c) / N ≥ q. |

### `collision` — `list_collision@1`

Model `RANDOM_PEOPLE_WITHOUT_REPLACEMENT`: n different people drawn at random, without replacement, from the people counted on this one list. The model is stated wherever a probability is shown.

| Field | Definition |
|---|---|
| `curve[]` | `{n, p}` for n = 2 … 300, ascending: P(at least two of n share a surname) = 1 − e_n(c_1, …, c_R) / C(N, n), with e_n the elementary symmetric polynomial of the counts. Computed over the histogram (a count c held by k surnames contributes (1 + c x)^k exactly) in the scaled form a_j = e_j · j! / N^j, which stays in [0, 1] and adds only non-negative terms; then e_n / C(N, n) = a_n / Π_{i<n}(1 − i/N). |
| `n_half` | The smallest n whose **unrounded** P(n) is ≥ 0.5. The decision is taken before rounding, so a chance just below one half that would round to 0.5 does not count. |
| `p_at_n_half`, `p_before_n_half` | The curve's stored (rounded) p at `n_half` and at `n_half − 1`. So the stored p at `n_half` is ≥ 0.5 and the stored p before it is ≤ 0.5 (it reads 0.5 only if the unrounded chance lies in [0.4999999995, 0.5)). If `n_half` were 2, `p_before_n_half` would be P(1) = 0. |
| `pair_one_in` | 1 / P(2), rounded half up, with P(2) = Σ c(c − 1) / (N(N − 1)), in exact integer arithmetic: two random people from the list share a surname about 1 time in this many. |
| `example_rooms` | **An illustration, not a figure.** mulberry32 seeded with `seed` (20260120 male, 20260121 female); 64 rooms drawn in turn from one generator stream. In each room people are drawn one at a time, uniformly without replacement (a person index in [0, N) by rejection sampling, so exactly uniform; a repeated person is drawn again; the index maps to its row by binary search over cumulative counts in file order). `first_pair_at[r]` is the 1-based seat at which room r's first shared surname appears; `showcase_pair` is the first room's two seats. |

### `crowd` — `list_crowd@1`

Same model. Ratios of binomials C(N − c, n) / C(N, n) = Π_{j<c}(1 − n/(N − j)):

- **The two expectations** (`expected_distinct`, `share_without_namesake`) take ln ratio for every c = 1 … the list's largest count from one running sum of `log1p(−n/(N − j))` terms per n (Neumaier-compensated; no log-gamma), and add their terms over the histogram with a compensated sum. They are good to a few units in the last place, so the ninth stored decimal is the exact value correctly rounded unless that value lies within a few units in the last place of a rounding boundary. `packages/truth/src/list-facts/crowd.test.ts` checks both against exact rational arithmetic.
- **The chance to meet a set** (`reach_half`) uses Π_{i<m}(1 − o/(N − i)) with m = min(c, n), o = max(c, n): a compensated `log1p` sum up to 2,048 factors, beyond that a difference of log-gamma values (Stirling series to z^−13, double precision for z ≥ 10), written so that no large terms cancel. The committed artefact never reaches the log-gamma path.

`1 − ratio` is taken as `−expm1(ln ratio)`.

| Field | Definition |
|---|---|
| `expected_distinct[]` | For n ∈ {100, 1000, 10000, 100000, 1000000}, ascending: the expected number of different surnames among n people, Σ_i [1 − C(N − c_i, n) / C(N, n)]. Never more than n or R, and rising in n. |
| `crowd_size` | 1000: the crowd the next two fields describe. |
| `share_without_namesake` | Expected share of the crowd whose surname nobody else in it carries: Σ_i (c_i / N) · C(N − c_i, n − 1) / C(N − 1, n − 1) at n = `crowd_size`. |
| `reach_half[]` | For `TOP_1`, `TOP_10`, `TOP_100`, each exactly once (the list's 1, 10, 100 most common surnames, unnamed: the first k rows by count descending, file order breaking ties; a tie at the boundary cannot change any figure, because tied rows carry the same count): `share_of_people` = C_S / N, with C_S the people on the set; `n_half` = the smallest n whose unrounded chance 1 − C(N − C_S, n) / C(N, n) is ≥ 0.5; `p_at_n_half` = that chance, rounded. |
| `example` | **An illustration, not a figure.** Seed = the list's room seed + 1000 (20261120 male, 20261121 female); `n` = 1000 people drawn as in the rooms; `distinct` surnames among them; `without_namesake` people whose surname appears once; `group_sizes` the sizes of the groups of two or more sharing a surname, largest first. `distinct = without_namesake + len(group_sizes)` and `n = without_namesake + Σ group_sizes`. |

### Keys, selections and the floor (`list_facts@2`)

- **Key.** Each row's `canonical_key_v2` (`canonicalKey` in `@name-atlas/resolver`: NFC, Unicode simple case folding, dash and apostrophe variants mapped to `-` and `'`, spaces trimmed and collapsed, NFC). Identity is the exact key, never a Polish fold: `ŁUCZAK` and `LUCZAK` are two surnames. The pipeline refuses a list on which two rows share a key.
- **Published string.** The surname exactly as the source file spells it (`ŻMUDA-TRZEBIATOWSKA`), stored beside the key in every named selection.
- **Selection order.** Count descending, ties by key in code-point order (not UTF-16 order, not the Polish alphabet).
- **A named surname** is `{ key, published, count }` with `count ≥ NAMED_SURNAME_FLOOR` (20, `packages/contracts`). A rule's selection below the floor is stored as `null` (or left out of `named_top.items`); the generator never moves on to a further surname to find one above it.

### `dots` — `list_dots@1`

| Field | Definition |
|---|---|
| `histogram[]` | `{count, surnames}` for every distinct count on the list, ascending: `surnames` surnames have exactly `count` bearers. The surnames add up to `summary.surnames` and count × surnames to `summary.people`. Plate I draws one dot per surname from it; positions and sizes are presentation geometry. |

### `concentration` — `list_concentration@1`

| Field | Definition |
|---|---|
| `levels[]` | For q ∈ {0.1, 0.5, 0.9}, ascending: `surnames` = the smallest k such that the list's k most common surnames carry at least a share q of its people, decided in integers (`people_k × 1000 ≥ q‰ × N`), and `people` = those k surnames' people. A tie at the boundary cannot change k, since tied surnames carry the same count. |
| `beyond_half` | `summary.surnames` less the q = 0.5 level's surnames: the surnames outside the set that carries half the people. |

### `bands` — `list_bands@1`

| Field | Definition |
|---|---|
| `ranges[]` | `{from, to, surnames, people}` for the bands 2, 3–9, 10–99, 100–999, 1000–9999 and 10 000+ bearers (`to` inclusive, `null` for no upper bound): the surnames whose count is in the band and their people. The bands add up to the list's surnames and people. |
| `under_10` | The surnames with fewer than 10 bearers: the 2 and 3–9 bands' surnames, stored so that no page adds them. |

### `endings` — `list_endings@1`

| Field | Definition |
|---|---|
| `entries[]` | For each ending of the partition's fixed set, in order — male list `ski ak ek cki ik czyk uk ewicz owicz`, female list `ska ak ek cka ik czyk uk ewicz owicz` (`LIST_ENDINGS`) — the `surnames` whose key ends with it, their `people`, and `share_of_people` = people / N. An ending is written without its dash and matched on the key's last letters, so it counts a spelling, never an origin; the set is disjoint, so no surname counts twice. |

### `initials` — `list_initials@1`

| Field | Definition |
|---|---|
| `letters[]` | For each of `LIST_INITIAL_LETTERS` in order — the 32 letters of the Polish alphabet (A Ą B C Ć D E Ę F G H I J K L Ł M N Ń O Ó P R S Ś T U W Y Z Ź Ż), then Q, V and X — either `{letter, surnames, people}` (positive) for the surnames whose key's first letter is that letter in lower case, or `{letter, absent: true}` when no surname starts with it. The first letter is the key's first code point with any combining marks after it. An absent letter is never a count of zero. |
| `top` | The letter with the most people (a tie goes to the earlier letter). |
| `rarest_polish` | The letter of the Polish alphabet with the fewest people among the Polish letters present (a tie goes to the earlier letter). Q, V and X are not candidates. |
| `outside` | `{surnames, people}` whose first letter is none of the 35 (for example `Á`, `Ç`, `Ö`, `İ`). With the letters present it adds up to the list. |

### `hyphenated` — `list_hyphenated@1`

| Field | Definition |
|---|---|
| `surnames`, `people` | The surnames whose key holds a hyphen (any dash variant maps to `-`; a space is not a hyphen), and their people. |
| `top` | ADR-0018 `HYPHENATED_TOP`: the first of them in selection order, as a named surname, or `null` below the floor. |

### `named_top` — `list_named_top@1`

| Field | Definition |
|---|---|
| `items[]` | ADR-0018 `TOP_3`: the list's three most common surnames in selection order, those at or above the floor (so up to three). The first one's count is `summary.max_count`. |

### `editions` — `list_editions@2` (`list_facts@4`)

The editions of the list's series (ADR-0019 §2.1), preceded by the list's 2019-06-30 edition (ADR-0019 §5, TASK-106). Each one is read from its own SHA-pinned file, the 2019 one with its own header (`nazwisko,liczba`), and passed through the same gates as the list itself: registry size and SHA-256, the completeness gate, the confidence rule and the FREE surface. The male series is `pesel_living_current_surname_national_male` (seven editions, 2020-01-22 to 2026-01-20), the female `pesel_living_current_surname_national_female` (six editions: no 2022 edition). The 2019-06-30 editions are in neither: their universe description differs. They are read as the same list on the project owner's ruling (ADR-0020 §2.2), and so carry `series: null` and `universe_note_code: "UNIVERSE_DESCRIPTION_DIFFERS"`.

| Field | Definition |
|---|---|
| `series` | The list's one series (the registry's `series`). |
| `items[]` | Each edition, ascending by `data_date`, the last one being the list itself: `series` (null only for the first, the 2019 edition), `universe_note_code` (`UNIVERSE_DESCRIPTION_DIFFERS` exactly when `series` is null, else null: a consumer says that edition is described in fewer words), `resource_id`, `data_date` (the reference date the publisher states, never a portal timestamp), `sha256` and `row_count` (equal to the registry's), `surnames` (its rows), `people` (the sum of its counts, within that edition) and `min_count` (its smallest count: its publication floor). |
| `gaps[]` | Each resource of the series the registry refused, ascending by `data_date`: `{data_date, resource_id, reason, duplicate_of}`. The one reason is `PUBLISHER_DUPLICATE`: the resource's bytes are exactly those of the edition `duplicate_of` (the female resource `38772`, dated 2022-01-27, repeats `35279`, dated 2021-02-02). A gap carries no figure: the page shows it as a gap with its reason, never as a value. |

### `change` — `list_change@1` (`list_facts@3`; its first edition is the 2019 one since `list_facts@4`)

The list's first edition against its last (the first and last of `editions.items`), surnames compared by `canonical_key_v2`, exactly. A surname on one edition only is not on the other edition's list, never zero people: it may be below the floor there. Integers only; every difference is stored so that no page subtracts.

| Field | Definition |
|---|---|
| `first_data_date`, `last_data_date` | The first and the last edition's `data_date`. |
| `surnames_first`, `surnames_last`, `surnames_delta` | The two editions' surnames, and the last less the first. |
| `people_first`, `people_last`, `people_delta` | The two editions' people, and the last less the first. |
| `on_last_not_first` | `{surnames, people}`: the keys on the last edition and not on the first, and their people on the last edition. |
| `on_first_not_last` | `{surnames, people_on_first}`: the keys on the first edition and not on the last, and their people on the first edition. |
| `top3_first_counts[]` | For each of the list's `named_top.items` (ADR-0018 `TOP_3` of the last edition), in its order: `{key, count_first}`, its count on the first edition, or `null` when it is not on the first edition. It names no further surname; the page reads the published string and the last count from `named_top`. |
| `top10_unchanged` | Whether the ten first keys in selection order (count descending, ties by key in code-point order) are the same, in the same order, on both editions. |

No surname is selected for its change: the artefact holds no ranking of growth or decline, and no surname is named for its growth (ADR-0019 §2.5).

### `overlap` — `list_overlap@1` (artefact level)

| Field | Definition |
|---|---|
| `male_only`, `both`, `female_only` | The keys on the male list only, on both lists, and on the female list only. `male_only + both` = the male list's surnames and `female_only + both` = the female list's. Counts of surnames, never of people. |
| `on_both_top` | ADR-0018 `ON_BOTH_TOP`: the male list's first surname in selection order whose key is also on the female list, as `{key, male: {published, count}, female: {published, count}}`, each count on its own list; `null` unless both counts are at or above the floor. |
| `one_list_top` | ADR-0018 `ONE_LIST_TOP`: `{male, female}`, each list's first surname in selection order whose key is not on the other list, as a named surname, or `null` below the floor. |

## Rules

1. **Two lists, never merged.** Each list is computed from its own bytes. Nothing in the artefact, and nothing a consumer derives from it, adds or unions the two lists into one number. The only comparison is `overlap`, which the generator computes and which counts surnames, never people.
2. **Surname strings only as named selections.** The only strings are the fixed fields above (versions, ids, hashes, dates, the source URL, enum values, endings and letters) and ADR-0018's named selections (`key` and `published`), each at or above the floor. The pipeline keeps each row's key and source string only for the methods that need the spelling and for those selections; no other method sees a surname.
3. **Values are stored rounded to nine decimals, never to display precision.** Shares, probabilities and expectations are rounded with `Number(x.toFixed(9))` (as `shareOf`), `birthday_reference.p_at_n_half` by exact rational rounding half up. Counts are exact integers. Every decision against one half (`n_half` of the curve and of each reach set) is taken on the unrounded value; only the stored value is rounded. Display rounding (for example two decimals near one half, so 49.72% and 50.56% are not both "50%") is presentation and happens in the page.
4. **Scope travels with every figure.** A page shows each figure with its list, its reference date and the published-list scope above.
5. **Valid only for its SHA-pinned resources.** The artefact describes exactly the bytes named in `source.sha256` and in `editions.items[].sha256`. A new resource version needs a new artefact. Comparing two artefacts is still out of scope; the one trend is `editions` and `change`, computed in one artefact over the editions of one series (ADR-0019 §2.3).
6. **Nothing is computed by the consumer.** The page formats stored values and lays them out; positions and scales are presentation geometry, never a new figure.
7. **One set of model parameters.** Both lists are computed with the same parameters (crowd size, curve range, example rooms, crowd sizes, thresholds, quantiles, concentration q values, band edges), and the schema refuses an artefact where they differ. A consumer may therefore state a parameter once for both lists, but it still states each figure with its own list. The endings are the exception by design: each list has its partition's fixed set (`-ski`/`-cki` on the male list, `-ska`/`-cka` on the female list).
8. **Every combined figure is stored.** Where a sentence needs a figure made from others (`under_10`, `beyond_half`, a share), the generator stores it; the page adds, subtracts and divides nothing.
9. **A named surname links only to its search answer.** A consumer shows `published` as text or, since `list_facts@3`, as a link to the search `/?surname=<published>` (ADR-0019 §2.6, amending ADR-0018 §2.5), and never frames it with origin, region or nationality (ADR-0018 §2.4).
10. **Editions are compared only within one series, and never with a cause.** A consumer shows the figures of `editions` and `change` per list, never adds the two lists' editions, shows a gap as a gap with its reason, and states what changed, never why (ADR-0019 §2.3–§2.4).

## Regenerating

```sh
pnpm fetch:pesel --series   # every edition a trend reads (2019 and the two series), byte-exact, into data/ (git-ignored)
pnpm truth:list-facts       # refuses, writing nothing, unless every check above passes for every edition
```

The generator is deterministic: a second run over the same bytes writes a byte-identical file, formatted with the repository's Prettier configuration through Prettier's API. `@name-atlas/truth` declares `prettier` as a devDependency at the root's exact version, and the generated file's header records the version used. CI has no copy of the CSVs, so it cannot regenerate; it checks that the committed module parses, that its lineage equals the registry, that it is internally consistent, and that derivation over the `fixtures/pesel` excerpts is refused at the completeness gate (`packages/truth/src/list-facts/*.test.ts`).

## Version history

| Version | Pipeline | Change |
|---|---|---|
| `list_facts@1` | `list_facts_pipeline@1` | TASK-040, ADR-0015: `source`, `assessment`, `summary`, `collision`, `crowd` per list and `birthday_reference`. No surname string, no comparison of the two lists. |
| `list_facts@2` | `list_facts_pipeline@2` | TASK-043, ADR-0018: every `list_facts@1` section and definition unchanged. Adds per list `dots` (`list_dots@1`), `concentration` (`list_concentration@1`), `bands` (`list_bands@1`), `endings` (`list_endings@1`), `initials` (`list_initials@1`), `hyphenated` (`list_hyphenated@1`) and `named_top` (`list_named_top@1`), and at artefact level `overlap` (`list_overlap@1`). Amends "Never both lists" (the surname-set comparison) and "Never a named surname" (the named selections at or above the floor of 20). A breaking change: `overlap` is a figure spanning both lists, and the named selections put surname strings in the artefact. |
| `list_facts@3` | `list_facts_pipeline@3` | TASK-044, ADR-0019: every `list_facts@2` section, definition and value unchanged. The pipeline reads every edition of each list's series through the same gates and refuses a publisher duplicate. Adds per list `editions` (`list_editions@1`) and `change` (`list_change@1`). Amends rule 5 (a trend within one series, in one artefact) and rule 9 (a named surname may link to its search answer). A breaking change: the list now spans several resources, and `editions` and `change` are required. |
| `list_facts@4` | `list_facts_pipeline@4` | TASK-106, ADR-0019 §5: every `list_facts@3` section and definition unchanged. The pipeline reads each list's 2019-06-30 edition first, with its own header, through the same gates. `editions` becomes `list_editions@2`: an edition gains `universe_note_code`, and the first edition's `series` may be null, only with `UNIVERSE_DESCRIPTION_DIFFERS`. `change` now runs from 2019-06-30 to 2026-01-20. A breaking change: `series` is nullable and a field is required. |

## Compatibility

Adding a field or a new entry to an array (another threshold, quantile or crowd size, in its ascending place and in both lists) is a minor change; consumers must ignore what they do not know and look array entries up by their key (`at_least`, `q`, `n`, `set`), never by position. They may rely on the ascending order the schema enforces (for example to draw the curve) but not on an entry's index. Removing or renaming a field, changing a definition above, or adding a figure that spans both lists is a breaking change and needs a new `schema_version` — and, for a changed definition, a new method version in `packages/truth/src/version.ts`.
