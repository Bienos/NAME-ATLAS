# Contract — Surname result read

- **Status:** Accepted
- **Accepted by:** TASK-006 (`tasks/006-surname-result-read-api.md`), 2026-09-19; extended by TASK-014 (`rarity`, 1.1), TASK-012 (`distribution`, 1.2) and TASK-016 (`suggestions`, 1.3), all 2026-09-20; TASK-022 (`meaning`, 1.4) and TASK-023 (`retrieved_at`, `methodology_code`, 1.5), both 2026-09-21; ADR-0012 (`source_page_url`, 1.6), 2026-09-24; TASK-054 (`archive`, 1.8), 2026-10-01; TASK-051 / ADR-0020 (`change`, 1.9; 1.7 on its own branch), 2026-10-01; TASK-055 / ADR-0025 (`neighbours`, `other_form`, 1.10), 2026-10-01; TASK-090 / ADR-0025 §2.7 (`localities`, 1.11), 2026-10-01; TASK-073 / ADR-0030 (`bearers`, 1.12), 2026-10-03; TASK-131 (`other_spelling`, 1.13), 2026-10-05
- **Schema version:** `1.13` · **API version:** `v1`
- **Runtime schema:** `packages/contracts/src/surname-result.ts`
- **Canonical semantics:** `docs/canonical/16` — this document records what was accepted and implemented, and does not restate it.

## Endpoint

```http
GET /api/v1/surname-results?surname=<raw>[&surface=INTERNAL|FREE|PAID|SEO]
```

`surface` defaults to `FREE`.

`docs/canonical/16` §7's P0 inventory lists a search resource (`POST /api/v1/surname-searches`) and a full profile resource (`GET /api/v1/surnames/{surname_id}/profile`). This endpoint is narrower than either: one fact, read by surname string, with no search semantics and no chapter framework. It is expected to fold into the profile resource when that lands. Until then it has its own path so the contract stays honest about what it returns.

## Status codes

| Code | When |
|---|---|
| `200` | Any expected outcome, including `UNRESOLVED` and `AMBIGUOUS`. `docs/canonical/16` §79: expected misses are successful responses, not errors. |
| `400` | The request shape is wrong (`INVALID_REQUEST`), or the surname failed validation (`INVALID_SURNAME_INPUT`). |
| `503` | The lookup itself failed (`SERVICE_UNAVAILABLE`). Retryable. |
| `500` | Unexpected failure (`INTERNAL_ERROR`). |

Errors use the `docs/canonical/16` §78 envelope and carry a `request_id`. No stack trace, SQL text, file path or exception string ever reaches a client.

## Response

```jsonc
{
  "schema_version": "1.11",
  "status": "RESOLVED",          // | "UNRESOLVED" | "AMBIGUOUS"
  "surname": {                    // null unless RESOLVED
    "id": "<uuid>",
    "display_name": "NOWAK",
    "script": "Latn"
  },
  "population": {                 // null unless RESOLVED
    "state": "READY",             // | "UNAVAILABLE" | "RIGHTS_BLOCKED"
    "reason_code": null,          // with no claim: "NOT_DERIVED_YET" when the register publishes a count
                                  // not yet derived, else "NO_APPLICABLE_EVIDENCE" (also on rarity, distribution)
    "surface": { "surface": "FREE", "decision": "ALLOWED", "reason_code": "RIGHTS_PERMIT_FREE_SURFACE" },
    "observations": [
      {
        "value": {
          "status": "KNOWN",
          "value": 98387,
          "unit": "PEOPLE",
          "scope_label_code": "PESEL_CURRENT_SURNAME"
        },
        "snapshot_date": "2026-01-20",
        "country_code": "PL",
        "source_population_scope": "Wykaz nazwisk męskich osób żyjących…",
        "coverage_notes": "…",
        "comparability_group": "pesel_2026_national_male",
        "confidence": { "status": "VERIFIED", "methodology_code": "…@confidence@1" },
        "citation": { "id": "…", "title": "…", "publisher": "…", "publication_date": "2026-01-20",
                      "source_type": "OFFICIAL_DATASET", "locator": "resource:1148808",
                      "url": "…", "attribution": null, "terms": "CC0 1.0", "retrieved_at": "2026-09-18T17:40:00Z",
                      "source_page_url": "https://dane.gov.pl/pl/dataset/1681,…" }
      }
    ]
  },
  "rarity": {                     // null unless RESOLVED; added in 1.1
    "state": "READY",             // | "UNAVAILABLE" | "RIGHTS_BLOCKED"
    "reason_code": null,          // "NO_COMPLETE_UNIVERSE" when a count exists but no complete universe does
    "surface": { "surface": "FREE", "decision": "ALLOWED", "reason_code": "RIGHTS_PERMIT_FREE_SURFACE" },
    "entries": [
      {
        "primary": { "metric": "ONE_IN_X", "value": 215 },
        "supporting": [{ "metric": "RANK", "value": 1 }],
        "methodology_code": "PESEL_PUBLISHED_UNIVERSE_SUM_V1",
        "universe_label_code": "PESEL_PUBLISHED_UNIVERSE",
        "numerator": 98387,
        "denominator": 21197537,
        "share": 0.004641435,
        "scope_label_code": "PESEL_CURRENT_SURNAME",
        "snapshot_date": "2026-01-20",
        "country_code": "PL",
        "comparability_group": "pesel_2026_national_male",
        "confidence": { "status": "VERIFIED", "methodology_code": "derived_statistic_rule@derived_confidence@1" },
        "citation": { "…": "as above", "terms": "CC0 1.0" }
      }
    ]
  },
  "distribution": {                // null unless RESOLVED; added in 1.2
    "state": "READY",              // | "UNAVAILABLE" | "RIGHTS_BLOCKED"
    "reason_code": null,           // "NO_COMPLETE_REGIONAL_UNIVERSE" when no regional version is complete
    "surface": { "surface": "FREE", "decision": "ALLOWED", "reason_code": "RIGHTS_PERMIT_FREE_SURFACE" },
    "entries": [
      {
        "coverage_state": "READY", // | "LOW_COVERAGE" | "COVERAGE_UNKNOWN"
        "regions": [               // PlaceStatDTO[], descending by count
          { "place_id": "…", "terc_code": "30", "display_name": "WIELKOPOLSKIE",
            "count": 16077, "share_of_covered": 0.184858973 }
        ],
        "covered_count": 86969,
        "national_count": 98387,
        "coverage_ratio": 0.883948083,
        "coverage_basis": "covered_count / national_count, where …",
        "low_coverage_threshold": 0.5,
        "universe_label_code": "PESEL_REGISTERED_VOIVODESHIP_COVERED_SET",
        "scope_label_code": "PESEL_CURRENT_SURNAME",
        "snapshot_date": "2026-01-20",
        "country_code": "PL",
        "comparability_group": "pesel_2026_regional_male",
        "confidence": { "status": "VERIFIED", "methodology_code": "derived_statistic_rule@derived_confidence@1" },
        "citation": { "…": "as above", "terms": "CC0 1.0" }
      }
    ]
  },
  "suggestions": null,          // non-null only when status is not RESOLVED; added in 1.3
  "meaning": {                  // added in 1.4; present exactly when RESOLVED
    "state": "NO_SOURCED_MEANING",   // AVAILABLE | NO_SOURCED_MEANING | RIGHTS_BLOCKED | UNAVAILABLE
    "interpretations": [],           // non-empty exactly when state is AVAILABLE
    "confidence": null,              // LIKELY | POSSIBLE | CONFLICTING | INSUFFICIENT_DATA; never VERIFIED
    "methodology_code": null,        // added in 1.5; present exactly when AVAILABLE
    "reason_code": "NO_ADMISSIBLE_ONOMASTIC_SOURCE",
    "surface": { "surface": "FREE", "decision": "BLOCKED", "reason_code": "COMMERCIAL_USE_UNRESOLVED" }
  },
  "archive": {                  // added in 1.8; present exactly when RESOLVED
    "state": "READY",                // READY | NOT_SEARCHED | RIGHTS_BLOCKED | UNAVAILABLE
    "query": "\"NOWAK\"",            // as sent, quotes included; null unless READY
    "searched_on": "2026-10-01",     // null unless READY
    "catalogue_records": 8237,       // catalogue records matching the word, every licence
    "catalogue_by_category": [{ "label": "Czasopisma", "count": 894 }],
    "pages": 160571,                 // pages of works not under copyright containing the word
    "pages_by_period": [{ "from_year": null, "to_year": 1799, "count": 20 }],
    "pages_by_place": [{ "label": "Warszawa", "count": 61608 }],
    "examples": [                    // at most 3, public-domain works only
      { "title": "Rocznik Kolejowy …", "date": "1931-01-01", "page_number": 795,
        "excerpt": "… Nowak Walenty …",   // at most 300 characters
        "url": "https://polona.pl/item-view/a7ed43f7-…?page=794" }
    ],
    "confidence": { "status": "VERIFIED", "methodology_code": "archive_search_scope@archive_scope@1" },
    "citation": { "title": "Polona", "publisher": "Biblioteka Narodowa", "attribution": "Polona, Biblioteka Narodowa",
                  "source_page_url": "https://polona.pl/", "…": "as above" },
    "reason_code": null,             // ARCHIVE_NOT_SEARCHED when NOT_SEARCHED; non-null exactly when not READY
    "surface": { "surface": "FREE", "decision": "ALLOWED", "reason_code": "RIGHTS_PERMIT_FREE_SURFACE" }
  },
  "bearers": {                  // added in 1.12; present exactly when RESOLVED
    "state": "READY",                // READY | NOT_SEARCHED | RIGHTS_BLOCKED | UNAVAILABLE
    "searched_on": "2026-10-03",     // null unless READY
    "total": 59,                     // people named exactly this surname with a Wikipedia article
    "with_death_date": 37,           // of those, how many Wikidata gives a date of death
    "people": [                      // 3 on FREE and SEO, up to 20 on PAID and INTERNAL
      { "wikidata_id": "Q896660", "name": "Stanisław Zaremba",
        "description_pl": "polski matematyk, profesor UJ", "description_en": null,   // at most 200 characters
        "born": 1863, "died": 1942,  // years only; a null died is not "living"
        "article_url": "https://pl.wikipedia.org/wiki/…", "wikidata_url": "https://www.wikidata.org/wiki/Q896660" }
    ],
    "more": 58,                      // total − people listed on this surface
    "confidence": { "status": "VERIFIED", "methodology_code": "wikidata_query_scope@wikidata_scope@1" },
    "citation": { "title": "Wikidata", "publisher": null, "terms": "CC0",
                  "url": "https://query.wikidata.org/#…", "…": "as above" },
    "reason_code": null,             // BEARERS_NOT_SEARCHED when NOT_SEARCHED; non-null exactly when not READY
    "surface": { "surface": "FREE", "decision": "ALLOWED", "reason_code": "RIGHTS_PERMIT_FREE_SURFACE" }
  }
}
```

An `AVAILABLE` meaning carries one entry per work, unmerged and unranked:

```jsonc
"meaning": {
  "state": "AVAILABLE",
  "interpretations": [
    {
      "root_form": "…",              // null where the work proposes none; never inferred
      "root_language": "…",
      "literal_gloss": "…",          // the work's own gloss, verbatim
      "formation_type": "PATRONYMIC", // …|TOPONYMIC|OCCUPATIONAL|DESCRIPTIVE|OTHER|UNKNOWN
      "work": { "title": "…", "author_or_publisher": "…", "year": 1927 },
      "locator": "p. 44, col. 2"     // required: a citation a reader cannot check is not one
    }
  ],
  "confidence": "CONFLICTING",       // two works, differing roots — both retained above
  "methodology_code": "onomastic_agreement_rule@onomastic_confidence@1",
  "reason_code": null,
  "surface": { "surface": "FREE", "decision": "ALLOWED", "reason_code": "RIGHTS_PERMIT_FREE_SURFACE" }
}
```

A resolved surname on two or more stored editions of a list carries its change over time (1.9), one entry per list, the men's first:

```jsonc
"change": {
  "state": "READY",              // | "UNAVAILABLE" (reason_code NO_CHANGE_DERIVED) | "RIGHTS_BLOCKED"
  "reason_code": null,
  "surface": { "surface": "FREE", "decision": "ALLOWED", "reason_code": "RIGHTS_PERMIT_FREE_SURFACE" },
  "entries": [
    {
      "list": "MALE",            // | "FEMALE"; two entries, never added
      "points": [                // ascending by date; every stored edition of the list
        { "status": "KNOWN", "data_date": "2019-06-30", "note_code": "UNIVERSE_DESCRIPTION_DIFFERS",
          "source_url": "https://api.dane.gov.pl/…", "count": 101473, "list_total": 19859783,
          "one_in_x": 196, "share": 0.005109 },
        { "status": "NOT_ON_LIST", "data_date": "2020-01-22", "note_code": null, "source_url": "https://…" }
        // a NOT_ON_LIST point has no count field at all, and the schema is strict about it
      ],
      "gaps": [ { "data_date": "2022-01-27", "reason_code": "PUBLISHER_DUPLICATE" } ],
      "summary": {
        "known_points": 7,
        "first": { "data_date": "2019-06-30", "count": 101473, "list_total": 19859783 },
        "last":  { "data_date": "2025-01-22", "count": 98859,  "list_total": 21096170 },
        "count_change_percent": -2.6,   // signed, per cent, one decimal, half away from zero
        "list_change_percent": 6.2      // the whole list's total over the same two editions
      },
      "methodology_code": "distribution_shift@1",
      "scope_label_code": "PESEL_CURRENT_SURNAME",
      "country_code": "PL",
      "confidence": { "status": "VERIFIED", "methodology_code": "derived_statistic_rule@derived_confidence@1" },
      "citation": { "…": "as above; the locator names every edition read" }
    }
  ]
}
```

A resolved surname also carries its neighbours on each list it is ranked on, and its other grammatical form when it has one (1.10). Both are read from the active `CURRENT_RANK` claims and follow the rarity section: they are `READY` exactly when rarity is, on rarity's surface.

```jsonc
"neighbours": {
  "state": "READY",              // | "UNAVAILABLE" | "RIGHTS_BLOCKED", as rarity is
  "reason_code": null,
  "surface": { "surface": "FREE", "decision": "ALLOWED", "reason_code": "RIGHTS_PERMIT_FREE_SURFACE" },
  "lists": [
    {
      "comparability_group": "pesel_2026_national_male",
      "snapshot_date": "2026-01-20",
      "entries": [               // rank order; the surname once, up to two places either side
        { "surname": { "id": "…", "display_name": "NOWAK", "script": "Latn" }, "rank": 1, "count": 98387, "is_self": false },
        { "surname": { "id": "…", "display_name": "KOWALSKI", "script": "Latn" }, "rank": 2, "count": 66589, "is_self": true },
        { "surname": { "id": "…", "display_name": "WIŚNIEWSKI", "script": "Latn" }, "rank": 3, "count": 53079, "is_self": false }
      ]
    }
  ]
},
"other_form": {                  // null unless the -ski/-cki/-dzki rule pairs it and the form is ranked
  "surname": { "id": "…", "display_name": "KOWALSKA", "script": "Latn" },
  "rule_code": "ADJECTIVAL_SKI_CKI_DZKI",
  "comparability_group": "pesel_2026_national_female",
  "snapshot_date": "2026-01-20",
  "rank": 2,
  "count": 67308,
  "surface": { "surface": "FREE", "decision": "ALLOWED", "reason_code": "RIGHTS_PERMIT_FREE_SURFACE" }
}
```

A resolved surname also carries its other spelling (1.13): a surname whose canonical key folds to the same key under the Polish diacritic fold (`docs/canonical/13` §6.1, retrieval only) and that has at least five times as many people on its larger list as this surname has on its own larger list. On WISNIEWSKI (105 men, 95 women on 2026-01-20) it is WIŚNIEWSKI:

```jsonc
"other_spelling": {               // null unless RESOLVED, rarity is READY and such a surname exists
  "surname": { "id": "…", "display_name": "WIŚNIEWSKI", "script": "Latn" },
  "rule_code": "POLISH_DIACRITIC_FOLD",
  "comparability_group": "pesel_2026_national_male", // its larger list
  "snapshot_date": "2026-01-20",
  "count": 53079,
  "surface": { "surface": "FREE", "decision": "ALLOWED", "reason_code": "RIGHTS_PERMIT_FREE_SURFACE" }
}
```

A resolved surname also carries the localities in the TERYT register whose official name is the surname (1.11), on TERYT's own rights, with the register's reference date. A lookup, not a claim: a shared name is a coincidence in the register, and no field says, and no surface may say, that the surname began in or is connected with any of these places. `READY` with no place is an answer; `NOT_LOADED` says the database holds no SIMC file.

```jsonc
"localities": {
  "state": "READY",              // | "NOT_LOADED" | "RIGHTS_BLOCKED"
  "reference_date": "2026-01-01", // the register's STAN_NA; null unless READY
  "places": [                    // whole localities only, at most 20: cities, villages, the rest;
    {                            // then by voivodeship, powiat, gmina, name
      "place": { "id": "…", "name": "Jemna", "kind": "VILLAGE", "teryt_simc": "0855434" },
      "gmina": "Stoszowice",
      "powiat": "ząbkowicki",
      "voivodeship": "DOLNOŚLĄSKIE"
    }
  ],
  "total": 1,                    // how many match, listed or not; null unless READY
  "confidence": { "status": "VERIFIED", "methodology_code": "official_name_exact_key@locality_match@1" },
  "citation": { "id": "…", "title": "TERYT", "publisher": "GUS", "publication_date": "2026-01-01",
                "source_type": "OFFICIAL_DATASET", "locator": "TERYT SIMC, wersja urzędowa, STAN_NA 2026-01-01",
                "source_page_url": "https://api.stat.gov.pl/Home/TerytApi?lang=en", "…": "as above" },
  "reason_code": null,           // TERYT_NOT_LOADED when NOT_LOADED; non-null exactly when not READY
  "surface": { "surface": "FREE", "decision": "ALLOWED", "reason_code": "RIGHTS_PERMIT_FREE_SURFACE" }
}
```

For an input that did not resolve, the fact sections are null and `suggestions` carries the answer:

```jsonc
{
  "schema_version": "1.11",
  "status": "UNRESOLVED",
  "surname": null,
  "population": null,
  "rarity": null,
  "distribution": null,
  "suggestions": {
    "state": "READY",                    // | "UNAVAILABLE"
    "outcome": "MULTIPLE_CANDIDATES",    // | "SUGGESTION_REQUIRED"; null unless READY
    "decision_mode": "USER_CONFIRM",     // never "AUTO"; null unless READY
    "reason_code": null,                 // INPUT_TOO_SHORT | NO_CANDIDATE_ABOVE_THRESHOLD |
                                         // MIXED_SCRIPT_REVIEW | MULTIPLE_EXACT_MATCHES |
                                         // SUGGESTIONS_UNAVAILABLE
    "suggestions": [
      { "surname": { "id": "…", "display_name": "CICHOWSKI", "script": "Latn" },
        "match_type": "FUZZY_CANDIDATE",
        "explanation_codes": ["ADJACENT_TRANSPOSITION", "EDIT_DISTANCE_1"] }
    ]
  }
}
```

## Rules this contract enforces

These are schema constraints, not conventions — a violating payload fails validation.

1. **`value` is present exactly when `status` is `KNOWN`**, and null otherwise. A suppressed or absent value is never `{"value": 0}` (`docs/canonical/16` §26; `ARCHITECTURE.md` §10 invariant 4).
2. **`observations` are present exactly when `state` is `READY`.** A `RIGHTS_BLOCKED` section carries no values at all — they are omitted from the payload rather than sent and marked hidden (`docs/canonical/16` §55).
3. **`surname` and `population` are present exactly when `status` is `RESOLVED`.** An unresolved query cannot carry another surname's identity or facts.
4. **Every observation carries `snapshot_date` and `country_code`.** A count is never returned without its dataset scope and date (`ARCHITECTURE.md` §10 invariant 5).
5. **No total.** A surname in both PESEL resources returns two observations in different `comparability_group` values. `docs/canonical/11` §6.1 makes that the gate on quantitative comparison, and this contract exposes no summed field.
6. **Confidence carries status and method only.** The assessment's `rationale` is internal (`docs/canonical/11` §10.3) and has no field to travel in. No probability is transmitted (`docs/canonical/16` §35).
7. **Confidence and rights are independent.** The same surname on two surfaces returns identical `confidence` and different `surface` decisions (`ARCHITECTURE.md` §10 invariant 2).
8. **A distribution's `covered_count` equals the sum of its `regions[].count`.** The denominator of every share is the sum of its own numerators, and a payload where it is not fails validation rather than reaching a surface.
9. **No field expresses a share of the national count.** Added in 1.2. The 16 voivodeships hold 78.3% (male) and 80.2% (female) of the national totals and the shortfall is biased by surname size, so such a share would misstate exactly the surnames it describes worst (TASK-012 §2). `coverage_ratio` is the only figure relating the two, and `coverage_basis` says in words what it is.
10. **`coverage_state` is present and agrees with the entry's own `coverage_ratio` and `low_coverage_threshold`.** `COVERAGE_UNKNOWN` exactly when the ratio is null; `READY` exactly when the ratio meets the threshold. A consumer never has to recompute whether a figure may be called a distribution.
11. **A suggestion carries no similarity, distance or score.** Added in 1.3. `docs/canonical/16` §35 keeps internal scores off the wire and `docs/canonical/13` §24 calls these diagnostic retrieval features, "not historical confidence". A suggestion is an identity, a match type and localisable explanation codes; a number would invite a surface to render "91% match", which is a claim this project does not make.
12. **A suggestion can never be expressed as auto-applied.** `decision_mode` is the literal `USER_CONFIRM` whenever suggestions are present, so a payload claiming `AUTO` fails validation (`docs/canonical/13` §32.2: "Do not silently replace input"; §33.4 forbids auto-resolving a fuzzy relation at any score).
13. **`outcome` and the number of candidates must agree.** `SUGGESTION_REQUIRED` carries exactly one; `MULTIPLE_CANDIDATES` carries more. A mismatch fails validation rather than reaching a surface.
15. **Every citation carries three dates, and they are three different things.** Added in 1.5. `publication_date` is when the publisher published; the observation's own `snapshot_date` is what the data describes; `retrieved_at` is when Name Atlas fetched the record. None is ever inferred from another, and the page labels all three separately (directive §37; `docs/canonical/11` §9.2 keeps `retrieved_at` distinct from `source_modified_at`).
16. **A meaning is never generated, and its absence is stated.** Added in 1.4. `state = NO_SOURCED_MEANING` with a reason code is the answer for every surname no admissible onomastic work covers, and it is not an omitted field or an empty list (ADR-0008 §2, §3). No field can carry an inferred root: `root_form` is null where the work proposed none.
17. **A meaning can never be `VERIFIED`.** Added in 1.4. `docs/canonical/11` §8 types `SURNAME_MEANING` as an `INTERPRETATION`, and the enum simply has no such member — an interpretation of a name's origin is not a measurement (ADR-0008 §5).
18. **Competing interpretations are both present, and `confidence` is `CONFLICTING`.** Added in 1.4. The contract has no field for a preferred reading, a rank or a weight, so a producer cannot express "this one wins"; onomastic disagreement travels as disagreement.
19. **A meaning's `surface` is evaluated against its own source's rights.** Added in 1.4. A scholarly work and the PESEL register carry different rights profiles, so `meaning.surface` and `population.surface` can legitimately differ in the same response, and `RIGHTS_BLOCKED` carries no interpretation text at all.
20. **An archive count is a count of word matches, never of people.** Added in 1.8. `pages` and `catalogue_records` are what Polona's search returned for the quoted word, in any inflected form, within the searched scope (ADR-0024 §2.5). No field names people, ancestors or mentions of a family, and the page states the caveat beside the figure.
21. **`NOT_SEARCHED` is not zero.** Added in 1.8. A surname not yet searched carries no query, date, count or source; a `READY` section with zero matches is an answer. A section that is not `READY` carries no figure and no example.
22. **An example is quoted only from a public-domain work.** Added in 1.8. At most three, each excerpt at most 300 characters, each linked to the page in Polona's viewer; a hit whose rights do not classify as public domain is counted and never quoted (ADR-0024 §2.7).
14. **`regions` is never empty and never zero-filled.** A voivodeship the publisher did not list for a surname has no entry at all (`docs/canonical/16` §28's prohibition on fabricated empty map features; `ARCHITECTURE.md` §10 invariant 4).
20. **A change is over one list, and two lists are two entries.** Added in 1.7. `change.entries[].list` is `MALE` or `FEMALE`, each over its own list's editions; nothing sums them (ADR-0020 §2.1).
21. **A `NOT_ON_LIST` point has no count, and a known point has a real one.** Added in 1.7. A surname an edition does not list is below the publisher's floor of 2 or not listed, never zero; the point schema is strict, so a payload putting `count: 0` on it fails validation. A known point's `count`, `list_total` and `one_in_x` are positive integers and its `count` never exceeds its own `list_total`.
22. **One in X and the share follow the point's own count and list total.** Added in 1.7. `one_in_x` is `list_total / count` rounded half up and `share` is `count / list_total` to nine places, re-checked on every point, so a point whose figure does not follow its inputs fails validation. The total is that edition's own (ADR-0020 §2.3), never the current list's.
23. **A change has at least two known points, in date order, and its summary describes them.** Added in 1.7. `points` are strictly ascending by date with at least two `KNOWN`; `summary.known_points`, `first` and `last` equal the known points' own count and first and last values; each change's sign agrees with its own first and last values (a change of 0.0 means they differ by less than 0.05% of the start). One edition is a count, not a change.
24. **A gap is reported only between the first and the last known point.** Added in 1.7. The publisher's resource that repeats an earlier edition (the women's 2022 file) is a gap, never a point and never a count.
25. **A neighbour list holds the surname exactly once, in rank order.** Added in 1.10. At most five entries, exactly one `is_self`, ranks never falling and counts never rising down the list. A tie at the surname's own place is not listed. Where more surnames share a neighbouring place than fit, which of them are listed is fixed by the surname id, not ranked (ADR-0025 §2.4).
26. **Neighbours are `READY` exactly when they hold a list.** Added in 1.10. Not `READY` carries no list and a reason; `READY` carries no reason. The section is present exactly when `status` is `RESOLVED`.
27. **The other form is a form, by one fixed rule, and never the surname itself.** Added in 1.10. `rule_code` is the literal `ADJECTIVAL_SKI_CKI_DZKI`: -ski, -cki and -dzki pair with -ska, -cka and -dzka on the other list, and no other ending is paired. No field states a relation between the people who bear the two forms (ADR-0025 §2.5).
28. **The other form is present only on a resolved surname.** Added in 1.10. It is null on every other status, and null where the rule does not pair the ending or the paired form has no rank on the other list.
29. **A locality is listed by exact name, and never as the surname's origin.** Added in 1.11. A place is listed when its official name's canonical key is the surname's (`official_name_exact_key`), and only a whole locality is (a part of a locality is not). No field relates the surname to the place beyond the name; `docs/sources/INVENTORY.md` §4 ("a surname appearing in a place is not evidence that it originated there") binds every surface.
30. **A READY localities section carries its date, total, confidence and citation.** Added in 1.11. `reference_date` is the register's own `STAN_NA`, `total` counts every match whether listed or not and is never below the list's length, and `reason_code` is null exactly when READY. `READY` with no place is an answer: the register lists no locality of that name.
31. **A locality is listed once, and at most 20 are.** Added in 1.11. The list is in a fixed order (cities, villages, the rest; then voivodeship, powiat, gmina, name), so two reads of one state agree; `total` says what the list leaves out.
32. **The localities section is present exactly when the surname resolved.** Added in 1.11. On every other status it is null, like the other sections.
33. **A bearer shares the surname, nothing more.** Added in 1.12. `people` are those whose own name in Wikidata ends with exactly the surname and who have a Wikipedia article (ADR-0030 §2.1). No field relates them to each other or to the reader, and the page says so beside them. A null `died` means Wikidata states no date of death, not that the person is alive. Where Wikidata states a death before the birth, both years are null (TASK-085); the person still counts in `with_death_date`.
34. **`people` and `more` add up to `total`.** Added in 1.12. How many are listed depends on the surface (ADR-0030 §2.7); the count does not. `NOT_SEARCHED` carries no count, date or person, and a `READY` section with a total of zero is an answer.
35. **The other spelling is another register entry, never the surname itself and never a relation.** Added in 1.13. `rule_code` is the literal `POLISH_DIACRITIC_FOLD`: the two canonical keys are equal once ą ć ę ł ń ó ś ź ż become a c e l n o s z z. Spaces and hyphens are not folded, so ŻMUDA-TRZEBIATOWSKI is not ZMUDA TRZEBIATOWSKI's other spelling. No field states that the two are one name or that their bearers are related, and no field says the reader misspelled.
36. **The other spelling is present only where it is much more common.** Added in 1.13. Its largest count on one list, read from its active rank claim, is at least five times this surname's largest count on one list (`OTHER_SPELLING_RATIO` in `@name-atlas/resolver`, the same rule that orders suggest-as-you-type; TASK-131). The two lists are never added up. It is null on every status but `RESOLVED`, null where this surname has no rank (it is read with the neighbours, on rarity's rights), and null where no such surname exists. Script-confusable, merged and inactive surnames are never given.

## Accepted rendering of a rarity entry

Decided with U-6 (2026-09-20). `ONE_IN_X` is a **rounded** figure, so "about" is correct here and
only here; the population count is exact and never says "about". What X is a share of is the
*published universe* — the sum of one resource's published counts — and the label says so:

- EN: `About 1 in {x} people counted in the PESEL register ({sex}) bore the surname {surname} on {date}.`
  — e.g. *About 1 in 215 people counted in the PESEL register (male) bore the surname Nowak on 20 January 2026.*
- PL: `Około 1 na {x} osób ujętych w rejestrze PESEL ({sex}) nosiło nazwisko {surname} na dzień {date}.`
  — e.g. *Około 1 na 215 osób ujętych w rejestrze PESEL (mężczyźni) nosiło nazwisko Nowak na dzień 20 stycznia 2026 r.*
- **Never** "of Poles", "in Poland", or any unqualified population: the denominator excludes
  single-bearer surnames and includes registered emigrants, so it is not a national population.
- The two sexes are two entries and two sentences. Nothing sums them; no combined figure exists in
  the payload.

## Accepted rendering of a distribution entry

Decided with TASK-012 §4 item 7 (2026-09-20). Every sentence names what the figure is a share of,
and a below-threshold entry says so **before** any figure:

- EN, `READY`: `Among the {covered} people with the surname {surname} ({sex}) who had a registered
  voivodeship on {date}, {share}% were registered in {region}.`
  — e.g. *Among the 86,969 people with the surname Nowak (male) who had a registered voivodeship on
  20 January 2026, 18.5% were registered in Wielkopolskie.*
- PL, `READY`: `Wśród {covered} osób o nazwisku {surname} ({sex}) mających zameldowanie na pobyt
  stały w dniu {date}, {share}% było zameldowanych w województwie {region}.`
- `LOW_COVERAGE` and `COVERAGE_UNKNOWN` prepend, before any figure:
  EN `Only {coverage}% of bearers had a registered voivodeship, so this is not the surname's
  distribution.` / PL `Tylko {coverage}% nosicieli miało zameldowanie na pobyt stały, więc nie jest
  to rozkład nazwiska.` For `COVERAGE_UNKNOWN` the coverage is not stated as a number, because it is
  not known; the sentence says so instead.
- **Never** "lives in", "comes from", "originates in", "is found in", or an unqualified
  "in {region}". The counted fact is *permanent registered residence* (D-004, binding), which is not
  where a person lives and is not where a surname comes from.
- The two sexes are two entries and two sentences. Nothing sums them.

## Accepted rendering of a change entry

Decided with TASK-051 (2026-09-30, ADR-0020 §2.5). It says what changed between the first and the last known edition and what the whole list did over the same two, with each change signed; it never says why, and uses no word of popularity, decline or fashion:

- EN: `The number of people with the surname {surname} ({sex}) in the PESEL register changed from {a} on {date} to {b} on {date}: {change}. The whole list changed by {list} between those editions.` — e.g. *… changed from 101,473 on 30 June 2019 to 98,859 on 22 January 2025: −2.6%. The whole list changed by +6.2% between those editions.*
- PL: `Liczba osób o nazwisku {surname} ({sex}) w rejestrze PESEL zmieniła się z {a} na dzień {date} na {b} na dzień {date}: {change}. Cała lista zmieniła się między tymi edycjami o {list}.`
- Equal counts say so (*was the same*), not "changed by 0".
- Changes carry their sign, a true minus and one decimal. The table below the sentence has one row per edition with its count and its share of that edition's list ("1 in X"), a row saying *not on the list — not zero* for an absent edition, a row in place of a publisher's duplicate saying it repeats the previous edition, and a note that the 2019 files describe their contents in fewer words and are read as the same list.
- The chapter is shown only for a `READY` section; `UNAVAILABLE` is not a chapter.

## Accepted rendering of a localities section

Decided with TASK-090 (2026-10-01, ADR-0025 §2.7: localities "under a line saying it is not where the surname comes from"). The statement names the register, the count and the date; the warning line comes before the list; and the list gives each locality's kind and its gmina, powiat and voivodeship as the register writes them:

- EN: `The TERYT register lists {n} {locality|localities} named {surname} (as of {date}).` then *A shared name in the register. It does not say where the surname began, or that the surname and these places are connected.*
- PL: `Rejestr TERYT wymienia {n} {miejscowość|miejscowości} o nazwie {surname} (stan na {date}).` then *Zbieżność nazw w rejestrze. Nie mówi ona, skąd wzięło się nazwisko, ani że ma ono związek z tymi miejscami.*
- **Never** "comes from", "originates", "pochodzi", "lives in" or "mieszka": the page's forbidden words hold for this chapter as for the distribution.
- The chapter and the card are shown only for a `READY` section with at least one place; no place is not a chapter.

## Accepted rendering of the other spelling

Decided with TASK-131 (2026-10-05). One line under the answer, in the page's first screen, as a question with the other surname as a link; then its count with its list and date. It asks, and never says the reader misspelled or that the two surnames are related:

- PL: `Szukasz {surname}? {count} {osoba|osoby|osób} ({sex}) w rejestrze PESEL na dzień {date}.` — e.g. *Szukasz WIŚNIEWSKI? 53 079 osób (mężczyźni) w rejestrze PESEL na dzień 20 stycznia 2026 r.*
- EN: `Looking for {surname}? {count} {person|people} ({sex}) in the PESEL register on {date}.` — e.g. *Looking for WIŚNIEWSKI? 53,079 people (male) in the PESEL register on 20 January 2026.*
- No line where the section is null.

## Recorded deviations

- **`unit` is a two-member enum, and PESEL now emits `PEOPLE`.** `docs/canonical/16` §26 fixes the unit as the single literal `"PEOPLE"`. **ADR-0004** (`docs/adr/0004-population-value-unit.md`) widened it to `"PEOPLE" | "SURNAME_OCCURRENCES"` while TASK-004 §14 U-4 was open. On 2026-09-20 the project owner decided U-4 on the field's definition — the counted field is *nazwisko aktualne*, of which every living person in PESEL has exactly one, so an occurrence among living persons is one person — and PESEL-derived values emit `"PEOPLE"` since then (ADR-0004, amendment of 2026-09-20). `"SURNAME_OCCURRENCES"` stays in the enum for a source whose counted field is not one-per-person. Not a breaking change: the enum is unchanged, only the emitted value.
- **Accepted rendering of a `PEOPLE` value with `scope_label_code = PESEL_CURRENT_SURNAME`** (decided by the project owner, 2026-09-20). A frontend renders the count *with its scope*, never bare, and never as an estimate — the number is an exact count of records with a defined universe:
  - EN: `{count} people were registered with the surname {surname} ({sex}) in the PESEL register on {date}.` — e.g. *98,387 people were registered with the surname Nowak (male) in the PESEL register on 20 January 2026.*
  - PL: `{count} osób było zarejestrowanych z nazwiskiem {surname} ({sex}) w rejestrze PESEL na dzień {date}.` — e.g. *98 387 osób było zarejestrowanych z nazwiskiem Nowak (mężczyźni) w rejestrze PESEL na dzień 20 stycznia 2026 r.* Polish uses a space as the thousands separator, `mężczyźni` / `kobiety` for `{sex}`, and the genitive month form in the date.
  - `{date}` is the observation's `snapshot_date` (the PESEL reference date, `2026-01-20`), never the portal timestamp and never the retrieval time. `{sex}` comes from the observation's comparability group. The two sexes are two sentences; they are never summed.
- **The suggestions section carries no `surface` decision, deliberately.** Every fact section (`population`, `rarity`, `distribution`) carries one; the `surname` identity object never has. A suggestion is a canonical surname string and its id — identity, not a fact — so it follows the identity precedent rather than the fact one. Gating it would be the inconsistency, not leaving it ungated. Recorded here so the next reader does not have to re-derive it; if a source is ever ingested whose rights restrict even naming its surnames, this decision is the one to revisit.
- **The top-level `status` enum does not gain `SUGGESTION_REQUIRED`.** `docs/canonical/13` §32.2 names that outcome for a typo and §32.5 keeps `UNRESOLVED` "with spelling suggestion if any" for an unknown surname. Telling those apart means asserting that an input *is* a typo, and TASK-015 measured first-place accuracy at roughly four in five — not enough to make that claim at the top level. The distinction §32.2 draws is carried inside the section instead, where the resolver computes it.
- **`docs/canonical/16` §28 references `PlaceStatDTO` but never defines its fields.** §28 specifies the geography chapter in terms of a `PlaceStatDTO` and a `MapLayerDTO` without giving either a field list anywhere in the document. TASK-012 therefore defines `PlaceStatDTO` here, as the smallest shape the chapter needs: `{place_id, terc_code, display_name, count, share_of_covered}`. `MapLayerDTO` is **not** defined and not emitted: no place in the schema carries a centroid (TASK-011 left `places.centroid` null because the TERC register has no geometry), and §28 explicitly forbids returning fabricated empty map features. A later task that acquires real geometry may add it; doing so is additive.
- **`canonical_slug` / `canonical_path` are omitted** from the identity object that `docs/canonical/16` §21 defines. No slug exists in the schema, slug transliteration for Polish surnames is a real decision that must not be confused with the identity-bearing diacritics of `ARCHITECTURE.md` §10 invariant 8, and this slice ships no browser route or SEO surface to consume them. Adding them later is additive (TASK-006 §15 U-2).

## Compatibility

Breaking this contract requires a `schema_version` bump and a stated compatibility window (`docs/contracts/README.md`). Additive fields and new enum members are not breaking.

**1.10 → 1.11 (2026-10-01, TASK-090, ADR-0025 §2.7).** Adds `localities` (required, nullable, present exactly when `status` is `RESOLVED`). A consumer written against 1.10 is unaffected; a producer must now supply it. It is a lookup in the TERYT register TASK-039 loads, through the indexes migrations 0010 and 0023 made, so no new derivation, claim or migration comes with it; its state and surface come from `pl_teryt`'s stored rights profile, as the archive's do from Polona's.
**1.11 → 1.12 (2026-10-03, TASK-073, ADR-0030).** Adds the `bearers` section, required and nullable, present exactly when `status` is `RESOLVED`. A consumer written against 1.11 is unaffected; a producer must now supply it. 1.11 is `localities` (TASK-090, #70 and #77), not on `main` when this was written; whichever lands second carries both.

**1.12 → 1.13 (2026-10-05, TASK-131).** Adds `other_spelling` (required, nullable, null unless `RESOLVED`). A consumer written against 1.12 is unaffected; a producer must now supply it. It is read from rank claims that already exist, over migration 0020's trigram index on the folded key, so no new derivation, claim or migration comes with it. It does not go into `suggestions`, which 1.3 keeps for a query that did not resolve. A report version frozen under 1.12 no longer parses as the current schema, and the report preview says so, as after every earlier version.

**1.9 → 1.10 (2026-10-01, TASK-055, ADR-0025).** Adds `neighbours` (required, nullable, present exactly when `status` is `RESOLVED`) and `other_form` (required, nullable, null unless `RESOLVED`). A consumer written against 1.9 is unaffected; a producer must now supply both. Both are read from rank claims that already exist, so no new derivation comes with them; migration 0026 adds an index so that the neighbours of a rare surname, whose place is shared by tens of thousands, are read without a sort.

**1.8 → 1.9 (2026-10-01, TASK-051, ADR-0020).** Adds the `change` section, required and nullable, present exactly when `status` is `RESOLVED` — the same rule the other fact sections follow. A consumer written against 1.8 is unaffected; a producer must now supply it. The section is `UNAVAILABLE` with `reason_code = NO_CHANGE_DERIVED` for a surname with no claim. That code does not say why: a surname on one edition only and a surname the batch has not reached look the same to the request path, which derives nothing. It was numbered 1.7 on TASK-051's own branch; TASK-054 reached `main` first as 1.8, so 1.9 is the first version on `main` carrying both.

**1.6 → 1.8 (2026-10-01, TASK-054, ADR-0024).** Adds the `archive` section, required and nullable, present exactly when `status` is `RESOLVED`, as every fact section is. A consumer written against 1.6 is unaffected; a producer must now supply it. 1.7 is reserved by TASK-051 (#43), which has not merged; whichever lands second takes the next number above both.

**1.5 → 1.6 (2026-09-24, ADR-0012).** One additive field, required and nullable. `citation.source_page_url` carries the source registry's `homepage_or_reference_url`: the public page of the source a record was taken from, which for PESEL is the dataset's page on dane.gov.pl. `url` is unchanged and stays the exact resource retrieved, which for a dataset is a file download. The page links a reader to `source_page_url`, because the surname page now points at the source's own website instead of showing a per-claim evidence panel (ADR-0012). A consumer written against 1.5 is unaffected; a producer must now supply it.

**1.4 → 1.5 (2026-09-21, TASK-023).** Two additive fields, both required and nullable. `citation.retrieved_at` carries the citation row's `accessed_at`, which the database has held since TASK-005 and the wire never exposed; the page's evidence panel shows it beside the publication and dataset dates, because a reader checking a figure needs to know when we fetched it. `meaning.methodology_code` carries `assessment_method@assessment_version` for the onomastic agreement rule, so a meaning's assessment is as traceable as a population claim's; it is present exactly when the state is `AVAILABLE`. A consumer written against 1.4 is unaffected; a producer must now supply both.

**1.3 → 1.4 (2026-09-21, TASK-022).** Adds the `meaning` section, required and nullable, present exactly when `status` is `RESOLVED` — the same rule `population`, `rarity` and `distribution` follow. A consumer written against 1.3 is unaffected; a producer must now supply it. The section is `NO_SOURCED_MEANING` for every surname until an onomastic source is imported, which ADR-0008 §3 makes the correct launch state rather than a defect.

**1.2 → 1.3 (2026-09-20, TASK-016).** Adds the `suggestions` section, required and nullable, present exactly when `status` is **not** `RESOLVED` — the mirror of the fact sections' rule. A consumer written against 1.2 is unaffected; a producer must now supply it. The section is how TASK-015's retrieval becomes reachable from outside the repository, and it is the first section whose presence rule is the inverse of `population`'s.

**1.1 → 1.2 (2026-09-20, TASK-012).** Adds the `distribution` section, required and nullable, present exactly when `status` is `RESOLVED` — the same rule `population` and `rarity` follow. A consumer written against 1.1 is unaffected; a *producer* must now supply it, which is why the version moved. The section is `UNAVAILABLE` with `reason_code = NO_COMPLETE_REGIONAL_UNIVERSE` until a complete regional resource version is ingested, and its entries carry `coverage_state` so a surface never has to decide for itself whether a figure may be presented as a distribution.

**1.0 → 1.1 (2026-09-20, TASK-014).** Adds the `rarity` section, required and nullable, present exactly when `status` is `RESOLVED` — the same rule `population` follows. A consumer written against 1.0 is unaffected (it ignores the field); a *producer* must now supply it, which is why the version moved rather than the field being slipped in silently. `unit` also begins emitting `PEOPLE` in 1.1; the enum is unchanged, so that part is not breaking.

## Not covered

Autocomplete and prefix search (now their own contract, `surname-prefix.md`), a caller-settable similarity threshold, confirming a suggestion as a resolution, the full profile resource and its remaining chapters, SSE, polling, ETag/conditional GET, rate limiting, entitlements, map geometry and `MapLayerDTO`, powiat or finer geography, a change over time of the regional distribution (2025 to 2026), and every fact other than `CURRENT_POPULATION`, `RARITY_CONTEXT`, `CURRENT_DISTRIBUTION`, `SURNAME_MEANING`, `SURNAME_DISTRIBUTION_SHIFT`, `ARCHIVE_AVAILABILITY` and `NOTABLE_BEARERS`. `LINGUISTIC_ORIGIN`, `GEOGRAPHIC_ORIGIN`, `SURNAME_FORMATION_TYPE` and `ROOT_INTERPRETATION` are separate canonical claim types and are not in this contract. Caching is currently `no-store`; a real policy (`docs/canonical/16` §84, §87) belongs to whichever task first needs it.
