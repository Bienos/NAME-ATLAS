# Contract — given-name list facts (statistics about each whole published first-name list)

- **Status:** `given_name_list_facts@1`, proposed with ADR-0051 (TASK-178). Accepted when TASK-178's pull request is merged.
- **Schema:** `packages/contracts/src/given-name-list-facts.ts` (`givenNameListFactsArtefactSchema`, `GIVEN_NAME_LIST_FACTS_SCHEMA_VERSION = "given_name_list_facts@1"`).
- **Producer:** `packages/truth/bin/build-given-name-list-facts.ts` (`pnpm truth:given-name-list-facts`), which runs the pure pipeline `buildGivenNameListFactsArtefact` in `packages/truth/src/given-name-list-facts/build.ts` (`GIVEN_NAME_LIST_FACTS_METHOD_VERSION = "given_name_list_facts_pipeline@1"`) over the thirteen resources of `BIRTH_NAMES_RESOURCES` (`packages/sources/src/given-names/births-registry.ts`) and writes `packages/truth/src/generated/given-name-list-facts.ts` (`GIVEN_NAME_LIST_FACTS_DATA`).
- **Consumer:** the Atlas page (`apps/web`, `/pl/atlas`, `/en/atlas`), server-side, through `givenNameListFacts()` from `@name-atlas/truth`. It parses the module against the schema once, memoises it and throws if it does not parse; the page then renders without Part II.
- **Canonical basis:** ADR-0051 (the data path), ADR-0015 (the artefact pattern), ADR-0018 (named selections), ADR-0042 (the lists, their threshold, never summed), ADR-0043 §4 (a share is of the children on the published list).

## What a first-name list fact is, and is not

- **About one list.** Its subject is one published list of dataset 219: the first names given to the children of one sex born in one year, as the publisher partitions them, with the publisher's threshold (5 up to 2012, 2 from 2013). A name given fewer times than the threshold is not on the list: absence is never zero, and `children` is the children on the published list, never all births.
- **Never summed.** The boys' and the girls' lists, and the lists of different years, are two or more universes. No field adds across them. `change`, `number_one` and `always_top10` compare the lists' sets and sequences of names; they add nothing.
- **A named first name only by a list-scope rule.** `TOP_1` of each year, `TOP_10` of the first and the last year, and the names in every year's `TOP_10`, each chosen over its whole list with ties broken by code-point order of the published string, and each stored only when its count is at least `NAMED_GIVEN_NAME_FLOOR` = 100 on its list.
- **Not regional, not half-yearly, not second names.**

## Shape

```json
{
  "schema_version": "given_name_list_facts@1",
  "generated_by": "packages/truth/bin/build-given-name-list-facts.ts",
  "pipeline_version": "given_name_list_facts_pipeline@1",
  "dataset_id": 219,
  "source_page_url": "https://dane.gov.pl/pl/dataset/219,imiona-nadawane-dzieciom-w-polsce",
  "resources": [{ "resource_id": "21457", "sha256": "…", "byte_size": 440085, "row_count": 24461, "people_sum": 8064304, "years": [2000, …, 2019], "sexes": ["MALE", "FEMALE"] }, …],
  "assessment": { "completeness": "COMPLETE", "confidence_status": "VERIFIED", "confidence_method": "…", "confidence_version": "…", "free_surface": "ALLOWED" },
  "first_year": 2000,
  "last_year": 2025,
  "sexes": {
    "male":   { "sex": "MALE",   "years": [ { … one block per year … } ], "change": {…}, "number_one": [ … ], "always_top10": [ … ], "top_first": [ … ], "top_last": [ … ] },
    "female": { "sex": "FEMALE", … the same sections … }
  }
}
```

One year's block:

```json
{ "birth_year": 2025, "resource_id": "1159536", "publication_threshold": 2,
  "names": 965, "children": 126404, "min_count": 2, "max_count": 5772,
  "top": { "published": "NIKODEM", "count": 5772, "share": 0.045662 },
  "top10_share": 0.353…, "half_names": 18,
  "top_letter": { "letter": "M", "share": 0.131… },
  "ends_a_share": 0.005… }
```

`change` is `{ first_year, last_year, on_last_not_first, on_first_not_last, on_both }` (counts of names by exact spelling). `number_one` is `[{ published, from_year, to_year, years }]` in year order, each a run of consecutive years with the same most common name. `always_top10` is the sorted published strings in every year's ten most common. `top_first` and `top_last` are the ten most common names of the first and the last year, `{ published, count }`, in selection order.

The schema refuses:

- a `years` array that is not every year from `first_year` to `last_year` once, in ascending order, or a year whose `resource_id` is not one of `resources`;
- a `publication_threshold` other than 5 for a year up to 2012 or 2 from 2013, a `min_count` below it, or a `max_count` below `min_count`;
- a `top.count` other than `max_count`, a `top.share` that is not `count / children` (to 10⁻⁹), a `top10_share` below `top.share` or above 1, a `half_names` below 1 or above `names`, an `ends_a_share` or `top_letter.share` outside [0, 1];
- a named first name (`top`, `top_first[]`, `top_last[]`) with a count below `NAMED_GIVEN_NAME_FLOOR`, or `top_first`/`top_last` out of selection order (count descending, ties by code-point order), longer than ten, or not led by the year's `max_count`;
- `number_one` runs that are not contiguous from `first_year` to `last_year`, or whose first run's name is not the first year's `top`;
- a `change` whose `on_both + on_last_not_first` is not the last year's `names` or whose `on_both + on_first_not_last` is not the first year's;
- a resource listed twice, a (year, sex) covered by two resources, or `sexes.male.sex` other than `MALE` (and likewise for female).

CI cannot regenerate the module (it has no files); `packages/truth/src/given-name-list-facts/artefact.test.ts` checks that the committed module parses, that every resource's lineage equals `births-registry.ts`, and the consistency above.
