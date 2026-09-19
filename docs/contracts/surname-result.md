# Contract — Surname result read

- **Status:** Accepted
- **Accepted by:** TASK-006 (`tasks/006-surname-result-read-api.md`), 2026-09-19
- **Schema version:** `1.0` · **API version:** `v1`
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
  "schema_version": "1.0",
  "status": "RESOLVED",          // | "UNRESOLVED" | "AMBIGUOUS"
  "surname": {                    // null unless RESOLVED
    "id": "<uuid>",
    "display_name": "NOWAK",
    "script": "Latn"
  },
  "population": {                 // null unless RESOLVED
    "state": "READY",             // | "UNAVAILABLE" | "RIGHTS_BLOCKED"
    "reason_code": null,
    "surface": { "surface": "FREE", "decision": "CONDITIONAL", "reason_code": "…" },
    "observations": [
      {
        "value": {
          "status": "KNOWN",
          "value": 98387,
          "unit": "SURNAME_OCCURRENCES",
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

## Recorded deviations

- **`unit` admits `SURNAME_OCCURRENCES`.** `docs/canonical/16` §26 fixes the unit as the single literal `"PEOPLE"`. **ADR-0004** (`docs/adr/0004-population-value-unit.md`) widens it, because the PESEL publisher describes *"liczba wystąpień"* and never states that one occurrence is one living person (TASK-004 §14 U-4, still open). `"PEOPLE"` remains in the enum, unused, as the value PESEL moves to if the publisher confirms it.
- **`canonical_slug` / `canonical_path` are omitted** from the identity object that `docs/canonical/16` §21 defines. No slug exists in the schema, slug transliteration for Polish surnames is a real decision that must not be confused with the identity-bearing diacritics of `ARCHITECTURE.md` §10 invariant 8, and this slice ships no browser route or SEO surface to consume them. Adding them later is additive (TASK-006 §15 U-2).

## Compatibility

Breaking this contract requires a `schema_version` bump and a stated compatibility window (`docs/contracts/README.md`). Additive fields and new enum members are not breaking.

## Not covered

Search, autocomplete, resolution confirmation, the full profile resource and its chapters, SSE, polling, ETag/conditional GET, rate limiting, entitlements, and every fact other than `CURRENT_POPULATION`. Caching is currently `no-store`; a real policy (`docs/canonical/16` §84, §87) belongs to whichever task first needs it.
