# Contract — list facts (statistics about one whole published list)

- **Status:** Accepted with ADR-0015 (TASK-040, merged in #32 on 2026-09-30).
- **Schema:** `packages/contracts/src/list-facts.ts` (`listFactsArtefactSchema`, `LIST_FACTS_SCHEMA_VERSION = "list_facts@1"`).
- **Producer:** `packages/truth/bin/build-list-facts.ts` (`pnpm truth:list-facts`), which runs the pure pipeline `computeListFacts` / `buildListFactsArtefact` in `packages/truth/src/list-facts/build.ts` (pipeline version `list_facts_pipeline@1`, `LIST_FACTS_METHOD_VERSION` in `packages/truth/src/version.ts`) and writes the generated module `packages/truth/src/generated/list-facts.ts` (`LIST_FACTS_DATA`).
- **Consumer:** the landing page (`apps/web`), server-side, through `listFacts()` from `@name-atlas/truth` (`packages/truth/src/list-facts/artefact.ts`). It parses the module against the schema once, memoises it and throws if it does not parse; the page then renders without the atlas section.
- **Canonical basis:** ADR-0015 (the data path: list-scope statistics derived offline into a committed, SHA-pinned artefact), TASK-040 (scope). The statistics themselves are not specified in the canonical corpus; `docs/canonical/14` §30 (a derived statistic is a FACT about a deterministic calculation) is the confidence rule the artefact applies, and `docs/canonical/12` §6.3–§6.4 the surface rule.

## What a list fact is, and is not

- **About one list.** Its subject is one resource version of one national PESEL file: the male list (`1148808`) or the female list (`1148811`), reference date 2026-01-20. Each figure describes the **published list**: living persons, current surname (`nazwisko aktualne`), surnames with at least 2 bearers (the publisher omits surnames with one bearer), in the PESEL register at the reference date. It is never a figure about "Poles" or "Poland".
- **Never both lists.** The male and female lists are two universes (TASK-004 §14 U-1). The artefact holds them under separate keys, each computed on its own. No field is a sum, union, merge or comparison across the two; a sum *within* one list (its people) is allowed.
- **Never a named surname.** No surname string crosses this boundary. "The list's most common surname" is an unnamed set (`TOP_1`); a named surname's count, rank or map is a surname claim and stays in the claim chain.
- **Not regional.** Voivodeship figures are out of scope. Absence and suppression are not zero.

## Shape

```json
{
  "schema_version": "list_facts@1",
  "generated_by": "packages/truth/bin/build-list-facts.ts",
  "pipeline_version": "list_facts_pipeline@1",
  "snapshot_date": "2026-01-20",
  "birthday_reference": { "n_half": 23, "p_at_n_half": 0.507297234 },
  "lists": {
    "male":   { "partition": "national_male",   "source": {…}, "assessment": {…}, "summary": {…}, "collision": {…}, "crowd": {…} },
    "female": { "partition": "national_female", "source": {…}, "assessment": {…}, "summary": {…}, "collision": {…}, "crowd": {…} }
  }
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

Unknown fields are stripped, never passed on.

### Top level

| Field | Meaning |
|---|---|
| `schema_version` | `list_facts@1`. |
| `generated_by` | The generator, repository-relative. |
| `pipeline_version` | The version of the pipeline that wrote the artefact (`list_facts_pipeline@1`): the gate, confidence and rights checks and the three methods. Not the schema's version. |
| `snapshot_date` | The register's reference date (`data_date`) both lists share. |
| `birthday_reference` | A **model constant, not PESEL data**: with 365 equally likely days, the smallest n at which two of n people share a day with chance at least one half (23), and that chance, computed in exact rational arithmetic (0.507297234). |

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

## Rules

1. **Two lists, never merged.** Each list is computed from its own bytes. Nothing in the artefact, and nothing a consumer derives from it, adds, unions or compares the two lists into one number.
2. **No surname strings.** The only strings are the fixed fields above (versions, ids, hashes, dates, the source URL, enum values). The pipeline drops the surname column straight after parsing.
3. **Values are stored rounded to nine decimals, never to display precision.** Shares, probabilities and expectations are rounded with `Number(x.toFixed(9))` (as `shareOf`), `birthday_reference.p_at_n_half` by exact rational rounding half up. Counts are exact integers. Every decision against one half (`n_half` of the curve and of each reach set) is taken on the unrounded value; only the stored value is rounded. Display rounding (for example two decimals near one half, so 49.72% and 50.56% are not both "50%") is presentation and happens in the page.
4. **Scope travels with every figure.** A page shows each figure with its list, its reference date and the published-list scope above.
5. **Valid only for its SHA-pinned resources.** The artefact describes exactly the bytes named in `source.sha256`. A new resource version needs a new artefact; comparing two artefacts is a trend, and trends are out of scope.
6. **Nothing is computed by the consumer.** The page formats stored values and lays them out; positions and scales are presentation geometry, never a new figure.
7. **One set of model parameters.** Both lists are computed with the same parameters (crowd size, curve range, example rooms, crowd sizes, thresholds, quantiles), and the schema refuses an artefact where they differ. A consumer may therefore state a parameter once for both lists, but it still states each figure with its own list.

## Regenerating

```sh
pnpm fetch:pesel        # the official files, byte-exact, into data/ (git-ignored)
pnpm truth:list-facts   # refuses, writing nothing, unless every check above passes
```

The generator is deterministic: a second run over the same bytes writes a byte-identical file, formatted with the repository's Prettier configuration through Prettier's API. `@name-atlas/truth` declares `prettier` as a devDependency at the root's exact version, and the generated file's header records the version used. CI has no copy of the CSVs, so it cannot regenerate; it checks that the committed module parses, that its lineage equals the registry, that it is internally consistent, and that derivation over the `fixtures/pesel` excerpts is refused at the completeness gate (`packages/truth/src/list-facts/*.test.ts`).

## Compatibility

Adding a field or a new entry to an array (another threshold, quantile or crowd size, in its ascending place and in both lists) is a minor change; consumers must ignore what they do not know and look array entries up by their key (`at_least`, `q`, `n`, `set`), never by position. They may rely on the ascending order the schema enforces (for example to draw the curve) but not on an entry's index. Removing or renaming a field, changing a definition above, or adding a figure that spans both lists is a breaking change and needs a new `schema_version` — and, for a changed definition, a new method version in `packages/truth/src/version.ts`.
