# Contract — Surname result read

- **Status:** Accepted
- **Accepted by:** TASK-006 (`tasks/006-surname-result-read-api.md`), 2026-09-19; extended by TASK-014 (`rarity`, 1.1) and TASK-012 (`distribution`, 1.2), both 2026-09-20
- **Schema version:** `1.2` · **API version:** `v1`
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
  "schema_version": "1.1",
  "status": "RESOLVED",          // | "UNRESOLVED" | "AMBIGUOUS"
  "surname": {                    // null unless RESOLVED
    "id": "<uuid>",
    "display_name": "NOWAK",
    "script": "Latn"
  },
  "population": {                 // null unless RESOLVED
    "state": "READY",             // | "UNAVAILABLE" | "RIGHTS_BLOCKED"
    "reason_code": null,
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
                      "url": "…", "attribution": null, "terms": "CC0 1.0" }
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
11. **`regions` is never empty and never zero-filled.** A voivodeship the publisher did not list for a surname has no entry at all (`docs/canonical/16` §28's prohibition on fabricated empty map features; `ARCHITECTURE.md` §10 invariant 4).

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

## Recorded deviations

- **`unit` is a two-member enum, and PESEL now emits `PEOPLE`.** `docs/canonical/16` §26 fixes the unit as the single literal `"PEOPLE"`. **ADR-0004** (`docs/adr/0004-population-value-unit.md`) widened it to `"PEOPLE" | "SURNAME_OCCURRENCES"` while TASK-004 §14 U-4 was open. On 2026-09-20 the project owner decided U-4 on the field's definition — the counted field is *nazwisko aktualne*, of which every living person in PESEL has exactly one, so an occurrence among living persons is one person — and PESEL-derived values emit `"PEOPLE"` since then (ADR-0004, amendment of 2026-09-20). `"SURNAME_OCCURRENCES"` stays in the enum for a source whose counted field is not one-per-person. Not a breaking change: the enum is unchanged, only the emitted value.
- **Accepted rendering of a `PEOPLE` value with `scope_label_code = PESEL_CURRENT_SURNAME`** (decided by the project owner, 2026-09-20). A frontend renders the count *with its scope*, never bare, and never as an estimate — the number is an exact count of records with a defined universe:
  - EN: `{count} people were registered with the surname {surname} ({sex}) in the PESEL register on {date}.` — e.g. *98,387 people were registered with the surname Nowak (male) in the PESEL register on 20 January 2026.*
  - PL: `{count} osób było zarejestrowanych z nazwiskiem {surname} ({sex}) w rejestrze PESEL na dzień {date}.` — e.g. *98 387 osób było zarejestrowanych z nazwiskiem Nowak (mężczyźni) w rejestrze PESEL na dzień 20 stycznia 2026 r.* Polish uses a space as the thousands separator, `mężczyźni` / `kobiety` for `{sex}`, and the genitive month form in the date.
  - `{date}` is the observation's `snapshot_date` (the PESEL reference date, `2026-01-20`), never the portal timestamp and never the retrieval time. `{sex}` comes from the observation's comparability group. The two sexes are two sentences; they are never summed.
- **`docs/canonical/16` §28 references `PlaceStatDTO` but never defines its fields.** §28 specifies the geography chapter in terms of a `PlaceStatDTO` and a `MapLayerDTO` without giving either a field list anywhere in the document. TASK-012 therefore defines `PlaceStatDTO` here, as the smallest shape the chapter needs: `{place_id, terc_code, display_name, count, share_of_covered}`. `MapLayerDTO` is **not** defined and not emitted: no place in the schema carries a centroid (TASK-011 left `places.centroid` null because the TERC register has no geometry), and §28 explicitly forbids returning fabricated empty map features. A later task that acquires real geometry may add it; doing so is additive.
- **`canonical_slug` / `canonical_path` are omitted** from the identity object that `docs/canonical/16` §21 defines. No slug exists in the schema, slug transliteration for Polish surnames is a real decision that must not be confused with the identity-bearing diacritics of `ARCHITECTURE.md` §10 invariant 8, and this slice ships no browser route or SEO surface to consume them. Adding them later is additive (TASK-006 §15 U-2).

## Compatibility

Breaking this contract requires a `schema_version` bump and a stated compatibility window (`docs/contracts/README.md`). Additive fields and new enum members are not breaking.

**1.1 → 1.2 (2026-09-20, TASK-012).** Adds the `distribution` section, required and nullable, present exactly when `status` is `RESOLVED` — the same rule `population` and `rarity` follow. A consumer written against 1.1 is unaffected; a *producer* must now supply it, which is why the version moved. The section is `UNAVAILABLE` with `reason_code = NO_COMPLETE_REGIONAL_UNIVERSE` until a complete regional resource version is ingested, and its entries carry `coverage_state` so a surface never has to decide for itself whether a figure may be presented as a distribution.

**1.0 → 1.1 (2026-09-20, TASK-014).** Adds the `rarity` section, required and nullable, present exactly when `status` is `RESOLVED` — the same rule `population` follows. A consumer written against 1.0 is unaffected (it ignores the field); a *producer* must now supply it, which is why the version moved rather than the field being slipped in silently. `unit` also begins emitting `PEOPLE` in 1.1; the enum is unchanged, so that part is not breaking.

## Not covered

Search, autocomplete, resolution confirmation, the full profile resource and its remaining chapters, SSE, polling, ETag/conditional GET, rate limiting, entitlements, map geometry and `MapLayerDTO`, powiat or finer geography, and every fact other than `CURRENT_POPULATION`, `RARITY_CONTEXT` and `CURRENT_DISTRIBUTION`. Caching is currently `no-store`; a real policy (`docs/canonical/16` §84, §87) belongs to whichever task first needs it.
