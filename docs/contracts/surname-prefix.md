# Contract — surname prefix suggestions (suggest-as-you-type)

- **Status:** Accepted, implemented 2026-09-23.
- **Schema:** `packages/contracts/src/surname-prefix.ts` (`surnamePrefixResponseSchema`, `SURNAME_PREFIX_SCHEMA_VERSION = "1.0"`).
- **Route:** `apps/web/src/app/api/v1/surname-prefix/route.ts`. **Service:** `prefixSuggestions` in `@name-atlas/resolver`; addresses from `currentSlugsFor` in `@name-atlas/seo`.
- **Canonical basis:** `docs/canonical/16` §78–§79 (error envelope; expected outcomes are 200), §35 (no score crosses the boundary); `docs/canonical/13` §6.1 (the Polish diacritic fold is for retrieval, never identity). Autocomplete is not specified in the canonical corpus; `docs/contracts/surname-result.md` listed it as out of scope, and this document is where it is accepted.

## Request

`GET /api/v1/surname-prefix?q=<typed>[&lang=pl|en]`

| Parameter | Required | Meaning |
|---|---|---|
| `q` | yes | What the reader has typed so far. |
| `lang` | no | `en` for `/en/surname/…` addresses; anything else is `pl`. |

## Response — always 200 for an answerable request

```json
{
  "schema_version": "1.0",
  "status": "SUGGESTIONS",
  "items": [
    { "display_name": "WIŚNIEWSKA", "path": "/pl/nazwisko/wi%C5%9Bniewska" },
    { "display_name": "WIŚNIEWSKI", "path": "/pl/nazwisko/wi%C5%9Bniewski" }
  ]
}
```

| `status` | When | `items` |
|---|---|---|
| `SUGGESTIONS` | Two or more characters after trimming, valid input | 0 to 8 surnames, best first |
| `TOO_SHORT` | Fewer than two characters | always empty; nothing is looked up |
| `INVALID_INPUT` | Input fails `validateSurnameInput` (e.g. mixed script) | always empty |

`path` is the surname's **current** page in the requested language, or `null` when it has none; a client then links to the ordinary search (`/?surname=<display_name>`).

## What a suggestion is, and is not

- **A link, never a resolution.** Nothing is filled in or chosen for the reader; the page it opens resolves exactly or not at all.
- **No figure crosses this boundary.** No count, rank, share, score or similarity — only a name and an address. The schema strips any other field.
- **Matching:** the input's Polish-diacritic fold is a prefix of the surname's folded canonical key, so `wisn` finds WIŚNIEWSKI. The fold is retrieval only (`docs/canonical/13` §6.1).
- **Order:** surnames whose key starts with the input *as typed*, diacritics included, first; then by the larger of the surname's national counts — used only to order, never returned, and the two national resources never summed; then alphabetically.
- **Never offered:** surnames flagged `script_confusable_flag`, merged or inactive surnames.

## Errors — the `docs/canonical/16` §78 envelope

| Status | `error.code` | When |
|---|---|---|
| 400 | `INVALID_REQUEST` | `q` is missing |
| 500 | `INTERNAL_ERROR` | any failure past validation; `retryable: true` |

## Operational

- **Caching:** `cache-control: public, max-age=300` — the answer depends only on the register and the query string.
- **Rate limit:** its own bucket, 120 requests a minute per client (`apps/web/src/middleware.ts`), so typing cannot starve the other API routes.
- **Logging:** what was typed is never logged (`docs/canonical/19` §85) — only a length band, the status and the item count.
- **Cost:** linear in the number of surnames the prefix matches (4.4 µs a match measured on 408,182 surnames). The client waits 200 ms after the last keystroke and cancels superseded requests.

## Compatibility

Adding a field to an item or a new `status` value is a minor change; clients must ignore what they do not know. Removing or renaming a field, or returning a figure, is a breaking change and needs a new `schema_version`.
