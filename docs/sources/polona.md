# Polona — TASK-031 source record

The verification record for Polona (Biblioteka Cyfrowa Polona, operated by Biblioteka Narodowa), written by the TASK-031 spike on **2026-09-29**. It answers every item of `tasks/031-polona-source-spike.md` §8 from observation, or marks it `UNRESOLVED` with the reason.

- **Fixtures:** `fixtures/polona/`: 10 search responses, 125 object records and 1 OCR page, all real, each with its request, retrieval time and SHA-256 in `source-manifest.json`.
- **Parser:** `packages/sources/src/polona/`: pure and fail-closed, exported from `@name-atlas/sources`.
- **Nothing is ingested.** There is no table, no `Source` or `RightsProfile` row, no connector and no claim. Those belong to the connector task, which is not written (task §10).

## At a glance

| §8 item | Answer |
|---|---|
| 1. Access paths | Search (simple and full text): Polona **documents** these as an "otwarte API". Object metadata and OCR download: observed endpoints of the site's own app. IIIF Image API: observed. **IIIF Presentation manifest: UNRESOLVED**, because every request timed out or was refused (§1). |
| 2. Authentication | None for any endpoint used. |
| 3. Rate limits / paging | No rate limiting observed. Paging is `page`/`pageSize` (simple) and `/{page}/{size}` (full text). |
| 4. Automated access | The terms do not address it. **`automated_access` = `UNKNOWN`**; the consequence is recorded (§4). New decision **D-021**. |
| 5. `robots.txt` | None served: `/robots.txt` returns the app's HTML shell, byte-identical to `/`. |
| 6. Query set | `NOWAK`, `KOWALSKI`, `WIŚNIEWSKI`, `ABADŻIJEW`, `WILK`, run 11:12:56–11:13:17 UTC. |
| 7. Matches per query | Metadata search matches catalogue fields and locates an object. Full-text search matches OCR and locates a page, with snippets. Totals in §7. |
| 8. Inflection | Morphological: case forms, the feminine form (`KOWALSKI` → `Kowalska`), stem alternation (`WILK` → `wilcy`) and diacritic folding (`Wiśniewski`/`Wisniewski`). |
| 9. Hand classification | 90 hits: 72 surname, 18 not a surname, 0 cannot tell. This is a sample, not a precision figure. |
| 10. Rights fields | A licence per object (four names exist; three observed on objects), `copyrightProtected`, and a free-text statement (many variants). §10. |
| 11. Mapping | §11 table. `ALLOWED` only for the public-domain licence. Metadata is `UNKNOWN` everywhere. |
| 12. `rights.ts` | Public-domain object evaluated: every asset opens on every surface with attribution. Two misfits → D-021, decided by ADR-0014 on 2026-09-29 (§12). |
| 13. OCR | Per page, ALTO v2 (ABBYY Recognition Server 4.0), pixel word boxes, **no confidence**. |
| 14. Dedupe ids | Object UUID, catalogue record number, call number, old-system id, page content id (§14). |
| 15. Paper trace | `WIŚNIEWSKI` → casualty-list page → word box → the three canonical records (§15). |
| 16. Fixtures | Committed per task §6. Four full-text hits withheld as whole hits (§16). |
| 17. Parser | Passes on all 136 committed files and refuses each drift category (§17). |
| 18. Out of scope | Nothing out of scope in the diff except one test-only file, recorded (§18). |

## How this record was made

- **Environment.** The project's cloud environment reached `polona.pl` on 2026-09-29: the task's preflight `curl -sS -o /dev/null -w '%{http_code}' https://polona.pl` returned `200`. That contrasts with the `403` of 2026-09-23 the task file records.
- **No browser.** Chromium, driven by Playwright through the environment's proxy, failed with `ERR_CERT_AUTHORITY_INVALID`. TLS verification was not disabled to get past it. Everything below was observed with `curl 8.5.0` (default User-Agent) or read in the site's own JavaScript. No Polona page was rendered.
- **Requests, all from one client, one at a time:**
  - the home page and `/robots.txt`;
  - `env.js`, plus the app's JavaScript, 116 files fetched once each, as a browser loading the app would;
  - 6 CMS pages;
  - the 10 searches (1.5 s apart);
  - 152 requests for object records (1.2 s apart). That is the 125 committed; 21 from an earlier run that used the digital-object endpoint for every object, 16 of which answered `404` (§1); 4 from a first run whose script crashed on an empty response; and 2 single checks;
  - 16 exploratory probes (§1).

  In all, 184 requests to the API and CMS.
- **No 429 and no error** that suggested throttling at any point.
- **What is kept.** Only `fixtures/polona/` is committed. Terms, FAQ and API pages are quoted below with the URL and time read, not committed.

## 1. Access paths

The app reads its gateway from `https://polona.pl/env.js` (read 11:04:07 UTC): `RCBN_GATEWAY_ADDRESS="https://polona.pl/api"`, `RCBN_KEYCLOAK_URL="https://polona.pl/auth"`. Services sit under the gateway as `/api/<service>`.

| Purpose | Request | Source of the pattern | Observed |
|---|---|---|---|
| Metadata search | `POST https://polona.pl/api/search-service/search/simple?query=Q&page=0&pageSize=10&sort=RELEVANCE`, body `{}` | Polona's Search API page | 5 × `200 application/json` |
| Full-text (OCR) search | `POST https://polona.pl/api/search-service/fulltext/polona/fulltext/0/10?sort=RELEVANCE&query=Q`, body `{"filters": {"keywordFilters": {"copyright": ["false"]}, "temporalFilters": null}}`, which the API page gives as "stosowana w aplikacji webowej" (the body the web app uses) | Search API page | 5 × `200 application/json` |
| Filters, advanced search | `GET …/search-service/search/filters`, `POST …/search/advanced`, `GET …/search/advanced-form` | Search API page | not called |
| Digital-object details | `GET https://polona.pl/api/library-object-query/digital-objects/{objectId}/details` | the app's JavaScript (`chunk-BBL5L3AG.js`) | 50 × `200` |
| Digital-object record | `GET …/library-object-query/digital-objects/{objectId}/front-office-details` | same | 50 × `200` |
| Virtual-object record | `GET …/library-object-query/virtual-objects/{objectId}/front-office-details` | same | 25 × `200` |
| OCR page | `GET https://polona.pl/api/download/digital-content/{resourceId}`, `{resourceId}` from a full-text hit's `resourceUrl` | the hit itself | `200 application/xml`, 58,535 B, `content-disposition` filename `BN_2015242_1006_alto.xml` |
| IIIF Image API | `GET https://polona.pl/iiif/3/{imageId}/info.json`, `{imageId}` from `titlePage.info` on object details | the object record | `200 application/ld+json;…profile="http://iiif.io/api/image/3/context.json"`: `ImageService3`, `level2`, 2316 × 3396 |
| IIIF Presentation manifest | `GET https://polona.pl/api/search-service/search/iiif/{objectId}/manifest.json` | the app's JavaScript (`GetIiifManifestPath="/search/iiif/{objectId}/manifest.json"`) | **UNRESOLVED** (below) |

- **Virtual objects.** A metadata hit's `objectType` attribute is `DIGITAL_OBJECT` or `VIRTUAL_OBJECT`. A virtual object is a segment of a digital object: the records show an article's title with its journal issue as parent, and the record names the parent (`parentDigitalObject.id`).
  - A virtual object's id sent to the `digital-objects` paths answers `404` with `"code":"DIGITAL_OBJECT_NOT_FOUND"`. That was observed for 8 virtual objects (16 requests, 11:26:25–11:26:58 UTC) before the endpoint was corrected.
  - Every full-text hit was a `DIGITAL_OBJECT`.
- **IIIF Presentation manifest, UNRESOLVED.** Polona's FAQ says it publishes manifests ("W Polonie udostępniamy manifesty IIIF"). The path above never returned one:
  - object `2bacac7f-…`: no response for more than 180 s (from 11:14:45), then a 45 s timeout (11:16:26);
  - object `54bb4cdc-…`: a 60 s timeout (11:17:32), then a 30 s timeout with `Accept: application/json` (11:18:44);
  - with a `contextId` in place of the object id: `403` `{"status":403,"error":"Forbidden",…}` (11:16:24).

  Without a manifest, the IIIF image id of any page other than the title page is not known (§15).
- **Other probes:**
  - `GET …/library-object-query/licenses/all`: `401`.
  - `GET …/search-service/fulltext/polona/{objectId}/{contentId}/tags`: `400`.
  - `GET …/library-object-query/digital-content/manifest-url/{contentId}`: `500` "Required request parameter 'digitalObjectId' … is not present". With `?digitalObjectId=` it answers `403` with an empty body.
- **Canonical object URLs** (from the app's routing code, `chunk-SC5DT4KH.js`; not loaded in a browser):
  - `https://polona.pl/preview/{objectId}`
  - `https://polona.pl/item-view/{objectId}?page=…`

  Old Polona URLs (`/item/<slug>,<oldId>/<page>`) are redirected through `…/digital-objects/new-id/{oldId}`.

## 2. Authentication

**None.** No cookie, token or key was sent with any request in §1, and every search, object-record, OCR and IIIF image request to the right endpoint succeeded. Keycloak (`/auth`) serves user accounts. The one endpoint that asked for credentials was `licenses/all` (`401`), which nothing here needs.

The FAQ agrees: "Z podstawowych funkcji Polony (przeglądanie zbiorów, wyszukiwanie i pobieranie zawartości) można korzystać bez rejestracji" ("Polona's basic functions (browsing the collections, searching and downloading content) can be used without registering").

## 3. Rate limits and paging

- **Rate limits: not observed.** 184 API and CMS requests, never more than one at a time and paced as in "How this record was made". None was answered `429`; the only failures were the IIIF manifest timeouts and the probes' `4xx`/`5xx` answers listed in §1.
  - No rate-limit or `Retry-After` header on the 7 responses whose headers were saved (home page, `robots.txt`, `env.js`, four CMS pages).
  - Headers of search and object responses were not saved.
  - No published rate limit exists in the terms, the Search API page, the FAQ or the manual.
- **Paging** is as the Search API page documents, observed on page 0 only:
  - simple search: `page` and `pageSize` query parameters; full-text search: `/{page}/{size}` path segments;
  - every response carries `totalElements`, `number`, `size`, `numberOfElements`, `totalPages`, `first` and `last`;
  - `totalPages` was the ceiling of `totalElements / size` in all 10 responses;
  - the zero-hit response has `totalPages: 0`, `first: true` and **`last: false`**, and its simple search returns `"hits": null`, not `[]`.

## 4. Terms governing automated access

**Read.** All four CMS pages below were read on 2026-09-29.

| Page | Human URL, as Polona links it | Read from | Time (UTC) |
|---|---|---|---|
| Terms, "Regulamin e-usługi Biblioteka Cyfrowa Polona" | `https://polona.pl/static/polona/polona-regulamin` | `https://polona.pl/api/cms-polona/type/POLONA/languages/pl/static-pages/id-or-slug/polona-regulamin` | 11:11:43 |
| Search API page | `https://polona.pl/static/polona/search-api` | `https://polona.pl/api/cms-polona/type/POLONA/languages/pl/static-pages/id-or-slug/search-api` | 11:11:44 |
| FAQ | — | `https://polona.pl/api/cms-polona/static-pages/id-or-slug/polona-faq` | 11:39:12 |
| User manual | — | `https://polona.pl/api/cms-polona/static-pages/id-or-slug/instrukcja-polona` | 11:39:14 |

**The terms do not address automated querying, rate limits or caching.** The whole text was read. It never mentions robots, scripts, crawling or scraping, request volume, caching, or the API. Its only uses of *automat…* concern automatic account creation and logout, and the automatic collection of account data.

The clauses closest to the question, verbatim:

> § 4 Obowiązki użytkownika BCP 1. Poprzez Rejestrację w BCP Użytkownik zobowiązuje się do: … c) używania udostępnionych usług i narzędzi w sposób zgodny z ich przeznaczeniem; d) niestosowania technik lub urządzeń mogących zakłócić pracę RCBN; e) niepodejmowania innych działań niezgodnych z przeznaczeniem BCP; f) przestrzegania przepisów Prawa Autorskiego;

(By registering, the user undertakes to use the services and tools as intended, not to use techniques or devices that could disrupt the repository's work, and to respect copyright law. These obligations bind **registered** users; nothing here registered.)

> § 3 … 8. Materiały biblioteczne, dostępne w zbiorach online mogą zawierać treści, które, w razie ich publicznego przekazywania przez osoby korzystające z tych zbiorów, mogą stanowić popełnienie przez te osoby przestępstw określonych w art. 133, 196, 256 lub 257 Kodeksu karnego albo w art. 55a ustawy z dnia 18 grudnia 1998 r. o Instytucie Pamięci Narodowej – Komisji Ścigania Zbrodni przeciwko Narodowi Polskiemu (Dz.U. z 2021 r. poz. 177), wskutek czego treści te mogą być wykorzystywane wyłącznie na użytek prywatny, z uwzględnieniem przewidzianej w art. 256 § 3 Kodeksu karnego możliwości przekazywania nośników treści w celu rozpowszechnienia w ramach działalności artystycznej, edukacyjnej lub naukowej.

(Some collection material may be usable for private use only, because passing it on publicly could be an offence under the named articles. This concerns content, not access.)

**What Polona does publish** about programmatic use:

- the Search API page opens: "W poniższym dokumencie dostępne są wskazówki do korzystania z interfejsu programistycznego (API) wyszukiwarki Polony." ("This document gives guidance on using the programming interface (API) of Polona's search engine.")
- the user manual says: "Osoby biegłe w używaniu interfejsów programistycznych mogą zapoznać się z instrukcją korzystania z otwartego API na którym oparta jest wyszukiwarka: https://polona.pl/static/polona/search-api" ("People fluent in programming interfaces can read the instructions for the open API the search engine is built on").

Neither page states a licence for the results, a rate, or anything about caching. The object-metadata, IIIF and download endpoints a connector would also need are documented nowhere; they are the app's own requests.

**`automated_access` = `UNKNOWN`.**

- The terms do not address automated access.
- The search API is presented as open for programmatic use, but without terms.
- The other endpoints are not presented at all.

ADR-0007 §1 treats `UNKNOWN` as `PROHIBITED` on every public surface, and that consequence applies. `local_cache` (`docs/canonical/11` §9.4) is `UNKNOWN` for the same reason. See D-021 for:

- what the owner must decide;
- the fact that `connectorExecutable()` does not refuse `UNKNOWN` (§12).

## 5. `robots.txt`

`GET https://polona.pl/robots.txt` at 2026-09-29T11:03:56Z answered `200`, `content-type: text/html; charset=utf-8`, 15,968 bytes, SHA-256 `3838ee1f89238ed57db67f73af726768a38fab7407f75a5a0faf77e433475606`, `etag: W/"3e60-p2UEkWugGoIZ+rSNpcrDAP9nUCE"`.

`GET https://polona.pl/` at 11:54:10Z returned the **same bytes** (same SHA-256 and etag). **No `robots.txt` is served.** The path falls through to the app's `index.html`. Polona therefore states nothing about crawlers.

## 6. The query set

The set was fixed in `capture_queries.py` before any search was run:

| # | Query | Chosen as | Run (UTC) |
|---|---|---|---|
| 1 | `NOWAK` | common | 11:12:56 metadata, 11:12:58 full text |
| 2 | `KOWALSKI` | common | 11:13:01, 11:13:03 |
| 3 | `WIŚNIEWSKI` | common, with a diacritic | 11:13:06, 11:13:08 |
| 4 | `ABADŻIJEW` | rare, with a diacritic; from `fixtures/pesel/regional-male-2026-01-20.csv` | 11:13:11, 11:13:13 |
| 5 | `WILK` | also an ordinary word ("wolf") | 11:13:15, 11:13:17 |

The exact URLs are in `fixtures/polona/source-manifest.json`. Queries were sent upper-case, as PESEL spells them, and percent-encoded as UTF-8.

## 7. What each query matched

| Query | Metadata total | Full-text total | Metadata: matched fields in the 10 hits | Full text: where the match is |
|---|---:|---:|---|---|
| NOWAK | 11,945 | 193,793 | title 10, keywords 10, creator 3 | OCR only (no hit's title contains it) |
| KOWALSKI | 71,630 | 334,046 | title 10, keywords 7, creator 2, contributor 1 | OCR only |
| WIŚNIEWSKI | 4,428 | 89,930 | title 10, keywords 8, creator 1, contributor 1 | OCR only |
| ABADŻIJEW | **0** (`"hits": null`) | 16 | — | OCR only |
| WILK | 2,493 | 262,643 | title 10, keywords 9, call number 1, contributor 1, imprint 1 | OCR only |

- **Matched fields.** Neither search says which field matched. A metadata hit carries no highlight, so the field counts above are where a form of the query appears in each hit's fields. The Search API page says simple search covers "tytuł, tytuł dodatkowy, autor, autor korporatywny, współautor, współautor korporatywny, data, słowa kluczowe, sygnatura, miejsce wydania, wydawca, kraj".
- **Locator.** A metadata hit locates an **object** only (`objectId`). A full-text hit locates a **page**:
  - `contentId`;
  - `pageNumber`, a digit string;
  - `resourceUrl` → the page's ALTO file.
- **Snippet.** Full-text hits carry 1 to 5 `highlights` each, OCR text with every match in `<em>…</em>`. Metadata hits carry none.
- **Ranking.** Full-text relevance favours pages dense with the word. For the three common surnames every one of the 30 hits is an index or list page:
  - bibliographic name indexes;
  - railway staff lists;
  - a 1919–1920 casualty list;
  - a German wanted-persons list.

## 8. Inflection and false matches

**Full-text highlight forms**, over all 50 full-text hits as served:

| Query | Forms highlighted, with counts |
|---|---|
| NOWAK | `Nowak` 226 |
| KOWALSKI | `Kowalska` 135, `Kowalski` 86 |
| WIŚNIEWSKI | `Wiśniewski` 117, `Wisniewski` 24 |
| ABADŻIJEW | `Abadżijew` 6, `ABADŻIJEW` 3, `Abadzijew` 1 |
| WILK | `wilk` 56, `WILK` 31, `Wilk` 27, `wilka` 22, `wilku` 18, `wilkom` 4, `wilcy` 4, `Wilka` 2, `wilkowi` 2, `Wilku` 1, `wilkiem` 1, `Wilkowi` 1 |

**Metadata forms**, in the matched fields:

| Query | Forms |
|---|---|
| NOWAK | `Nowak`, `Nowaka`, `Nowakiem`, `Nowaku`, and `Nowak-Zawadzka` |
| KOWALSKI | `Kowalski`, `Kowalska`, `Kowalskiego`, `Kowalskim`, `Kowalskiej`, and the adjective `kowalskie` |
| WIŚNIEWSKI | `Wiśniewski`, `Wiśniewska`, `Wiśniewskim` |
| WILK | `Wilk`, `wilk`, `wilka`, `Wilka`, `wilkach`, `Wilki` |

**What this establishes** (observed, not documented by Polona beyond the API page's remark on exact search):

- **A nominative query returns inflected forms**, including a stem alternation no prefix match explains: `WILK` → `wilcy`. The search is morphological.
- **The masculine query returns the feminine surname.** `KOWALSKI` → `Kowalska`, the majority of its full-text highlights.
- **Diacritics are folded.** `WIŚNIEWSKI` → `Wisniewski`; `ABADŻIJEW` → `Abadzijew`. Case is folded too.
- **It returns ordinary words.**
  - `KOWALSKI` matches the adjective `kowalskie`, in Wagner's "Pieśni kowalskie".
  - `WILK` matches the animal, proverbs, a place (`Wilki`) and a sports club (K.S. "Wilk").
- **Exact search.** The Search API page states that a quoted query switches inflection off: "W wynikach wyszukiwania dokładnego zostaną pominięte wystąpienia wprowadzonych słów w innych formach gramatycznych." This was not run.

## 9. Hand classification

Every captured hit, classified by reading its title, fields and snippets. This is **a sample of 90 hits, not a precision figure**: the hits are Polona's top 10 by relevance for each query, not a random draw.

| Query | Metadata: surname / not / cannot tell | Full text: surname / not / cannot tell |
|---|---|---|
| NOWAK | 10 / 0 / 0 | 10 / 0 / 0 |
| KOWALSKI | 9 / 1 / 0 | 10 / 0 / 0 |
| WIŚNIEWSKI | 10 / 0 / 0 | 10 / 0 / 0 |
| ABADŻIJEW | — (0 hits) | 10 / 0 / 0 |
| WILK | 3 / 7 / 0 | 0 / 10 / 0 |
| **Total** | **32 / 8 / 0** | **40 / 10 / 0** |

**Notes on the judgements:**

- **Surname in a compound or a firm name.**
  - `Nowak-Zawadzka` is a double-barrelled surname; counted as surname.
  - "Kostecki Wiśniewski" is a firm name formed from two surnames; counted as surname.
  - `Wiśniewski-Snerg` combines a real surname and a pen name; counted as surname.
- **KOWALSKI "not":** Wagner's *Siegfried*, "Pieśni kowalskie", where the word is the adjective "smith's".
- **WILK.**
  - Metadata "not": the animal (5), the place `Wilki` in Lithuania (1), and the sports club K.S. "Wilk" (1).
  - Metadata "surname": Mariusz Wilk, Urszula Wilk and Paulina Wilk.
  - Full text: all ten are proverbs or school readers about wolves.
- **Withheld hits.** Four full-text hits are withheld from the fixtures (§16). Their classification (ABADŻIJEW: 1 surname; WILK: 3 not) was made from their snippets, which are not committed.

## 10. Rights-bearing fields

Every rights-bearing field observed, with its exact values. The "Values observed" column is over the 90 hits and 125 object records.

| Where | Field | Values observed |
|---|---|---|
| search hit | `attributes.licenseName.stringValue` | `Domena Publiczna`, `Zawartość chroniona - brak licencji`, `Zawartość chroniona - licencja ograniczona` |
| search hit | `attributes.copyrightProtected.boolValue` | `false` with public domain and the limited licence, `true` with "brak licencji" |
| search hit | `expandedFields.rights.values` (always exactly one value) | `PUBLIC_DOMAIN`, `PROTECTED_READING_ROOMS`, `PUBLISHER_CONSENT_NON_COMMERCIAL` (only on withheld hits), `OPAQUE_B12259E5` (the statements list below) |
| search hit | `attributes.hasOcrAlto.boolValue` (metadata hits only) | `true` 4, `false` 36 |
| object details | `license.id` / `baseName` / `baseUrl` / `translations[en].name` / `downloadable` / `active` / `pdnPublicationSuited` | `18b9d0e1-9bc5-46de-a879-99ad28bf7142` / `Domena Publiczna` / `https://creativecommons.org/publicdomain/mark/1.0/` / `Public Domain Mark 1.0` / `true` / `true` / `true` |
| | | `3a99f116-91e7-48e7-88f8-bdffbd746a54` / `Zawartość chroniona - brak licencji` / `http://www.europeana.eu/rights/rr-r/` / `Rights Reserved - Restricted Access` / `false` / `true` / `true` |
| | | `c94dc431-97bc-418f-aa2d-57c7ebffda1f` / `Zawartość chroniona - licencja ograniczona` / `https://www.europeana.eu/pl/rights/rr-r` / `Rights Reserved - Limited Access` / `false` / `true` / `true` |
| object details | `copyrightProtected`, `copyrightHints`, `shared`, `deleted` | as with the licence; `[]` on all 50; `true` on all 50; `false` on all 50 |
| object records | `license.{id, baseName, downloadable}`, `copyrightProtected`, `metadata.rights`, `shared` | the same licences; `metadata.rights` is a statement or **`null`**, for all three licences |
| virtual-object record | `parentDigitalObjectShared`, `publicSharingPriority` | `true` on all 25; `false` on all 25 |
| search facets | `aggregations.license`, `.copyright`, `.rights` | four licence names: the three above and **`Zawartość chroniona - licencja otwarta`**, which is on no captured object. `rights` shows 47 distinct statements across the 10 responses (below). |

**The statements, byte for byte** (keys as in `POLONA_RIGHTS_STATEMENTS`):

- `PUBLIC_DOMAIN`: "Domena Publiczna. Wolno zwielokrotniać, zmieniać i rozpowszechniać oraz wykonywać utwór, nawet w celach komercyjnych, bez konieczności pytania o zgodę. Wykorzystując utwór należy pamiętać o poszanowaniu autorskich praw osobistych Twórcy."
- `PROTECTED_READING_ROOMS`: "Publikacja chroniona prawem autorskim - reprodukcja cyfrowa dostępna w czytelniach BN i na terminalach Academiki"
- `PUBLISHER_CONSENT_NON_COMMERCIAL`: "Publikacja udostępniona za zgodą wydawcy. Całość ani żadna z jej części nie może być przetwarzana ani wykorzystywana w celach komercyjnych"
- `PUBLISHER_CONSENT`: "Publikacja udostępniona za zgodą wydawcy." It appears only in `metadata.rights` of object `e2ff2984-…`, whose search hit carries `OPAQUE_B12259E5`.
- `OPAQUE_B12259E5`: "b12259e5-5746-4e66-bb96-9b2f542c8339". It appears on two metadata hits in place of text, and Polona does not say what it identifies.

**The vocabulary is larger than what the 90 hits carry.** The `rights` facet, capped at 25 values per response, shows 47 distinct statements:

- 19 Creative Commons licences under their Polish names ("Uznanie Autorstwa 3.0 Polska" and so on);
- 12 other consent or agreement wordings ("za zgodą autora", "za zgodą spadkobierców autora", "na podstawie Licencji Biblioteki Jag…", and others);
- 6 "protected" variants;
- 9 further opaque UUIDs;
- the public-domain text.

Three of the 47 are the statements above: the public-domain text, `PROTECTED_READING_ROOMS` and `PUBLISHER_CONSENT_NON_COMMERCIAL`. The other 44 are on no captured object. The parser refuses them, and they have no mapping.

## 11. Mapping to ADR-0007

**What Polona states the values mean.** Polona's FAQ answer "Co oznaczają informacje wyświetlane w polu „Prawa”?" (read 11:39:12 UTC) defines three categories, verbatim:

> a) Domena Publiczna. Wolno zwielokrotniać, zmieniać i rozpowszechniać oraz wykonywać utwór, nawet w celach komercyjnych, bez konieczności pytania o zgodę. Domena publiczna obejmuje całą wiedzę i informacje – w tym książki, zdjęcia i utwory audiowizualne – które nie są już chronione prawem autorskim i mogą być wykorzystywane bez ograniczeń. Należy jednak pamiętać, żeby wykorzystując te utwory zawsze wskazywać imię i nazwisko autora oraz tytuł dzieła (o ile te informacje są dostępne).
>
> b) Publikacja chroniona prawem autorskim – reprodukcja cyfrowa dostępna w czytelniach BN. Ta informacja oznacza, że ze względu na trwającą ochronę prawnoautorską, wersję cyfrową utworu można zobaczyć jedynie w czytelniach Biblioteki Narodowej, na specjalnie wyznaczonych stanowiskach komputerowych, lub za pośrednictwem Cyfrowej Wypożyczalni Publikacji Naukowych ACADEMICA na terminalach w Bibliotece Narodowej lub w innych bibliotekach w Polsce.
>
> c) Publikacja udostępniona za zgodą autora / spadkobierców autora / wydawcy. Całość ani żadna z jej części nie może być przetwarzana ani wykorzystywana w celach komercyjnych. Oznacza to, że utwór jest nadal chroniony prawem autorskim, a Biblioteka Narodowa zawarła stosowną umowę z dysponentami autorskich praw majątkowych, która pozwoliła na udostępnienie go w Polonie. Publikacje opatrzone taką informacją nie mogą być wykorzystywane w celach komercyjnych bez uzyskania odrębnej zgody od osób uprawnionych. Ze względu na ochronę prawnoautorską, dla tych materiałów została wyłączona możliwość pobierania plików (z wyjątkiem metadanych).

In English:

- (a) the work may be reproduced, changed and distributed, even commercially, without asking; the author's name and the title must always be given.
- (b) because of copyright, the digital version can be seen **only** in BN reading rooms or on ACADEMICA terminals.
- (c) BN's agreement with the rights holders allows the work to be made available **in Polona**; commercial use needs separate consent; file download is disabled "except metadata".

**The table.** `rights.test.ts` holds this table equal to `POLONA_RIGHTS_MAPPING`, row for row:

<!-- polona-rights-mapping:start -->
| Licence (`baseName`) | Statement | `metadata_rights` | `transcription_rights` | `image_rights` | `commercial_use` | `redistribution` | `attribution_required` |
|---|---|---|---|---|---|---|---|
| `Domena Publiczna` | any observed | UNKNOWN | ALLOWED | ALLOWED | ALLOWED | ALLOWED | yes |
| `Zawartość chroniona - brak licencji` | any observed | UNKNOWN | PROHIBITED | PROHIBITED | UNKNOWN | UNKNOWN | no — not stated |
| `Zawartość chroniona - licencja ograniczona` | `PUBLISHER_CONSENT_NON_COMMERCIAL` | UNKNOWN | UNKNOWN | UNKNOWN | PROHIBITED | UNKNOWN | no — not stated |
| `Zawartość chroniona - licencja ograniczona` | `PUBLISHER_CONSENT` | UNKNOWN | UNKNOWN | UNKNOWN | PROHIBITED | UNKNOWN | no — not stated |
| `Zawartość chroniona - licencja ograniczona` | `OPAQUE_B12259E5` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | no — not stated |
| `Zawartość chroniona - licencja ograniczona` | none | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | no — not stated |
<!-- polona-rights-mapping:end -->

**Why each value is what it is:**

- **`metadata_rights` is `UNKNOWN` for every licence.** Polona states no licence for its catalogue records anywhere read: the terms, the Search API page, the FAQ, the manual, or any object record. Category (c)'s "z wyjątkiem metadanych" concerns downloading, not reuse.
- **Public domain.**
  - Transcription and image are `ALLOWED`, from (a)'s own words, with the licence's Public Domain Mark URL. OCR text is the work's text, and (a) allows reproducing the work.
  - Commercial use and redistribution are `ALLOWED` for the same reason ("nawet w celach komercyjnych", "rozpowszechniać").
  - Attribution is required: "zawsze wskazywać imię i nazwisko autora oraz tytuł dzieła".
  - This applies with or without a statement on the record. 13 of the 40 public-domain object records carry `metadata.rights: null`, and the licence entity and its URL are the same.
- **No licence ("brak licencji").** Transcription and image are `PROHIBITED`. Polona says the digital version may be seen only in its reading rooms, names the licence "Rights Reserved - Restricted Access", and uses Europeana's `rr-r` statement. Commercial use and redistribution are not separately stated, so they are `UNKNOWN`.
- **Limited licence.**
  - Commercial use is `PROHIBITED` wherever the record carries a category-(c) statement, full or first sentence only.
  - Transcription and image are `UNKNOWN`. Polona forbids **commercial** processing and use, and disables download, but does not say what non-commercial reuse, if any, is permitted. It is not the obvious reading's `PROHIBITED` either.
  - With an opaque or absent statement, nothing beyond "Rights Reserved - Limited Access" is stated, so everything is `UNKNOWN`.
- **`licencja otwarta`, and every facet-only statement.** No captured object carries one, so its meaning was never read. **The parser refuses it**; it has no row.

## 12. Evaluated through `rights.ts`

`packages/truth/src/polona-rights.test.ts` feeds real object records through the parser and the table into ADR-0007's `completeRights` and `evaluateRightsMatrix`, with the holding institution (`instance.name`) as `source_owner`, and asserts all twelve decisions.

- **Public-domain trace object `8f7cf574-…`.**
  - Every asset (metadata, transcription, image) opens on every surface: `ALLOWED` internally, and `ALLOWED_WITH_ATTRIBUTION` on `FREE`, `PAID` and `SEO`.
  - The traced OCR line is excerptable on `FREE`: `excerptTranscription("Wiśniewski — Wiśniewski", …)` → `EXCERPT`.
- **"Brak licencji" object `4c68543c-…`.**
  - Metadata: `LOCATOR_ONLY` on `FREE`; `BLOCKED` on `PAID` and `SEO` (`COMMERCIAL_USE_UNRESOLVED`).
  - Transcription and image: `BLOCKED` everywhere, including `INTERNAL`, except the image on `FREE`, which is `LOCATOR_ONLY`.
- **Limited-licence object `e2ff2984-…`.**
  - Transcription: `ALLOWED` internally, `BLOCKED` publicly (`TRANSCRIPTION_RIGHTS_UNKNOWN`).
  - Image: `LOCATOR_ONLY` on `FREE`.
  - Metadata: as for the "brak licencji" object.

**Two places where Polona's values and ADR-0007 do not fit**, recorded as D-021 and not resolved in code (task §5):

1. **Metadata under `UNKNOWN` opens public surfaces.**
   - For the public-domain object `metadata_rights` is `UNKNOWN`, yet the metadata row is `ALLOWED_WITH_ATTRIBUTION` on `FREE`, `PAID` and `SEO`.
   - The row reproduces `evaluateSurface` (ADR-0007 §4), which refuses metadata only on `PROHIBITED`.
   - ADR-0007 §1 says `UNKNOWN` is refused on public surfaces "on every dimension". Polona is the first source whose metadata licence is unknown, so this is the first time the two sentences disagree in practice.
2. **The attribution is not the one Polona asks for.**
   - ADR-0007 §5 derives "Biblioteka Narodowa — https://creativecommons.org/publicdomain/mark/1.0/" when no `attribution_text` is stored.
   - Polona asks for the author's name and the work's title, and supplies no text to store.

**Update 2026-09-29: both decided by ADR-0014.**
- Metadata follows the metadata row (ADR-0007 §4), and §1's refusal of `UNKNOWN` covers text and scans only. The first item is therefore the intended behaviour.
- A Polona attribution is composed per object: the creator, the title, then "Polona, Biblioteka Narodowa". The connector task implements it.

**Two consequences the test also pins:**

- **Per-object rights need a permissive source default.** ADR-0007 §6 lets a child layer only tighten, so under a source default of `UNKNOWN` even the public-domain object stays `UNKNOWN`. Polona states rights per object and states no source-wide default.
- **`connectorExecutable()` is `true` with `automated_access = UNKNOWN`.** The §6.4 gate refuses only `PROHIBITED`.

## 13. OCR

- **Availability.**
  - Per object, `hasOcrAlto` on metadata hits: 4 of 40 `true`.
  - Per page, full-text search, which only covers objects with a text layer.
  - The FAQ says OCR is not produced for old prints, manuscripts or maps, and that texts can also be downloaded as PDF, EPUB or TXT. Those downloads were not fetched.
- **Granularity: one file per page.** `GET /api/download/digital-content/{resourceId}` → `BN_2015242_1006_alto.xml`, where `2015242` is the object's call number `2.015.242 A`.
- **Format: ALTO v2** (`http://www.loc.gov/standards/alto/ns-v2#`), UTF-8 with a byte-order mark, CRLF line endings.
  - `MeasurementUnit` `pixel`.
  - `OCRProcessing`: ABBYY Recognition Server 4.0, `processingDateTime` 2018-12-15.
- **Coordinates: yes.** `HPOS`, `VPOS`, `WIDTH` and `HEIGHT` on every block, line and word (`String`).
  - The page's print space is 3012 × 4053.
  - 166 lines, 437 words, 271 spaces (`SP`).
  - No hyphenation (`HYP`) element on this page.
- **Confidence: none.** No `WC` or `CC` attribute on any word, so `ocr_confidence` (`docs/canonical/11` §8.2) cannot be filled from Polona's OCR.
- **Layout.** The traced page is a four-column casualty list. ABBYY placed each column in its own block, so an entry's surname, first name and place are in different blocks. They meet only by `VPOS`:
  - "Wiśniewski" at 540;
  - "Bolesław*, szer. 6. p. p. leg." at 540;
  - "zm. ch. 4.VIII.1919, Jabłonna," at 541.

  Snippets follow block order, not reading order. Snippets also show OCR splits such as "W iśniewski".
- **Snippets and the page.** Full-text `highlights` are cut from the same text. The first snippet of the traced hit begins with the page's running head, "Wiśniewski — Wiśniewski", at `HPOS` 1494, `VPOS` 395.

## 14. Deduplication identifiers

| Identifier | Where | Example |
|---|---|---|
| Object UUID | `objectId` (hits), `uuid` (details) | `8f7cf574-b074-4313-b274-ca53e9459587` |
| Context id | `contextId` = `objectName` (details, all 50) | `d413b99c-113f-4dc3-84b2-5ba5e0c0a43c` |
| Parent object | `parentDigitalObject.id` (virtual objects) | `9b8939bf-d2fe-4b89-9127-386130fb519f` |
| Old-system id | `attributes.idInOldSystem` (38 of 40 metadata hits) | `62001131`; mapped to the new UUID by `…/digital-objects/new-id/{oldId}` (app code) |
| Catalogue record number | `expandedFields.recordNo` (37 of 40 metadata hits) | `b0000005177893` |
| Call number (sygnatura) | `expandedFields.callNumber` (13 of 40 metadata hits; all 46 committed full-text hits) | `2.015.242 A` |
| Holding institution | `attributes.instanceName`, `instance.{id,name}` | `10715`, `Biblioteka Narodowa` |
| Serial grouping | `identifications[]` (`identificationTypeName` `Prasa`, 26 of 50 records) | "Przewodnik Bibliograficzny : …" |
| Page | `contentId`; `resourceUrl` → `resourceId` | `f8be2733-…`; `8802e7b5-…` |
| Canonical object URL | app routes (§1) | `https://polona.pl/preview/{objectId}` |

**Duplicates occur inside Polona:**

- NOWAK metadata hits 4 and 6 are two digital objects of one book ("Wyobrażone, nieminione…"), both carrying call number `3.628.867`;
- WILK metadata hits 2 and 4 are two objects titled "Instynkt : o wilkach w polskich lasach", with different record numbers;
- WIŚNIEWSKI full-text hits 0, 5, 6 and 8 are four monthly issues (1943) of a German wanted-persons list, repeating the same entry ("Wiśniewski Jan, geb. 20.7.19 Grodzisk Maz.");
- WILK full-text hits 0, 1, 5 and 6 as served (0–3 in the committed, trimmed file) are four editions (1929–1933) of one school reader, each matching the same passage on page 113.

The same text therefore reaches search as several objects. Deduplication needs more than `objectId`. Matching against Europeana or FBC (`docs/canonical/12` §16.7) was not examined (task §5).

## 15. Paper trace: one public-domain hit, end to end

**The chain:**

1. Query `WIŚNIEWSKI`, full-text search, 2026-09-29T11:13:08Z (`search/fulltext-3-wisniewski.json`, hit 1).
2. Object `8f7cf574-b074-4313-b274-ca53e9459587`: "Lista strat wojska polskiego : polegli i zmarli w wojnach 1918-1920", Warszawa : Wojskowe Biuro Historyczne, 1934. Its rights are `Domena Publiczna` with the public-domain statement, `copyrightProtected: false`.
3. Page `contentId` `f8be2733-9661-43ac-b7a2-01acbe08747b`, served as `pageNumber` `"1005"`, which downloads as file `…_1006_alto.xml`. So the number is probably zero-based, but that rests on one observation.
4. ALTO `8802e7b5-bf41-4ed1-bf44-1eee464fbb0a`, retrieved 11:20:30Z, SHA-256 `1c4c8bfe2009bb82fe85b019efd1c20c3f48192343d28695bb1f34437d6bb5e9`.
5. The matched text is entry 43370. The surname is `<String CONTENT="Wiśniewski" HEIGHT="35" WIDTH="257" VPOS="540" HPOS="1009"/>`, and the aligned columns read "43370." | "Wiśniewski" | "Bolesław*, szer. 6. p. p. leg." | "zm. ch. 4.VIII.1919, Jabłonna,".

**`SourceRecord`** (`docs/canonical/11` §9.2), for the page:

| Field | Value from this trace | Filled? |
|---|---|---|
| `source_id` | the Polona `Source` | **no**: none exists (task §5) |
| `external_record_id` | `f8be2733-9661-43ac-b7a2-01acbe08747b` (the page's `contentId`) | yes |
| `external_parent_id` | `8f7cf574-b074-4313-b274-ca53e9459587` | yes |
| `record_type` | `PAGE` | yes |
| `source_url` | `https://polona.pl/item-view/8f7cf574-…` (app route; the page parameter's meaning is unverified) | partly |
| `raw_payload` | the hit as served, plus the two object records | yes |
| `raw_text_ref` | reference to the stored ALTO | yes, if storage is allowed (`local_cache` is `UNKNOWN`, D-021) |
| `content_hash` | `1c4c8bfe…` (ALTO bytes) | yes |
| `retrieved_at` | 2026-09-29T11:20:30Z (ALTO); 11:13:08Z (hit) | yes |
| `source_modified_at` | no modification date is served (details carry `creationDate` 2018-08-30 and `version` 0) | **no** |
| `rights_profile_id` | an object-level profile from the §11 row for public domain | **no**: no profile exists |
| `record_status` | `ACTIVE` (`shared: true`, `deleted: false`) | yes |
| `supersedes_source_record_id` | null | yes |

**`DigitalAsset`** (§9.3):

| Field | OCR text asset | Scan of the page |
|---|---|---|
| `source_record_id` | the page record | the page record |
| `asset_type` | `OCR_TEXT` | `IIIF_CANVAS` / `IMAGE` |
| `external_url` | `https://polona.pl/api/download/digital-content/8802e7b5-bf41-4ed1-bf44-1eee464fbb0a` | **no**: the page's image id comes from the IIIF manifest, which is UNRESOLVED; only the title page's `info.json` is known |
| `storage_key` | **no**: only where caching is permitted, and `local_cache` is `UNKNOWN` | no (scans are never fetched: task §5) |
| `mime_type` | `application/xml` | **no** |
| `checksum` | `1c4c8bfe…` | **no** |
| `rights_profile_id` | **no**: no profile exists | **no** |
| `created_at` | system time | system time |

**`HistoricalOccurrence`** (§8.2):

| Field | Value from this trace | Filled? |
|---|---|---|
| `surname_id`, `name_form_id` | resolve the observed form `Wiśniewski` with `@name-atlas/resolver` (exact match) | **no**: not run in this spike (no database). `WIŚNIEWSKI` is in the PESEL fixture (`fixtures/pesel/national-male-2026-01-20.csv`, count 53,079). |
| `source_record_id` | the page record | yes |
| `raw_matched_text` | `Wiśniewski` | yes |
| `match_offset_or_locator` | `polona:8f7cf574-…/f8be2733-…`, ALTO `8802e7b5-…`, `String` box `HPOS=1009 VPOS=540 WIDTH=257 HEIGHT=35` (pixels) | yes |
| `extraction_method` | `OCR` | yes |
| `ocr_confidence` | null: Polona's ALTO carries none | **no** (stated as absent) |
| `verification_status` | `MACHINE_CANDIDATE` (`docs/canonical/12` §16.5) | yes |
| `raw_place_text` | `Jabłonna`, only by aligning columns on `VPOS` (§13), an interpretation step | partly |
| `place_id` | null: nothing here supports a place mapping | yes (null) |
| `temporal_*` | `4.VIII.1919` (the entry's date, same alignment caveat); not 1934, which is the publication date | partly |
| `dedupe_key` | `contentId` + word box + `Wiśniewski` + entry number `43370` | yes |
| `created_by_run_id` | a research run | **no**: runs are out of scope |

The same page's running head, "Wiśniewski — Wiśniewski" at `VPOS` 395, is also a match. It is a heading, not an occurrence. A connector that emitted every match would count it.

## 16. Fixtures

`fixtures/polona/`, with `source-manifest.json` listing every file's path, SHA-256, size, retrieval time, exact request (method, URL, headers, body) and response status:

- `search/{simple,fulltext}-{1..5}-{query}.json`: the ten search responses, each with at most 10 hits. The ABADŻIJEW metadata response has zero hits and is committed.
- `objects/digital-objects/{id}.details.json` and `.front-office-details.json` (50 + 50), and `objects/virtual-objects/{id}.front-office-details.json` (25). These are the records for **every** object any captured hit points to, withheld hits included, because their metadata carries no OCR and shows why they were withheld.
- `ocr/8802e7b5-bf41-4ed1-bf44-1eee464fbb0a.alto.xml`: the traced page. It is public domain, so task §6 allows its text.

**Withheld.** Four full-text hits carry OCR snippets of objects under the limited licence, which does not state transcription rights: ABADŻIJEW hit 2, and WILK hits 2, 3 and 4.

- They were removed **whole**, by excising each hit's exact bytes and one separating comma. Every other byte is as served, including `numberOfElements`.
- The assembling script proved it: the trimmed document re-parses to the served one minus those hits.
- The manifest records, per withheld hit, the locator (`objectId`, `contentId`, `pageNumber`, `resourceUrl`), the SHA-256 of its OCR text, the SHA-256 of its bytes, and the served file's own SHA-256.

**Nothing forbidden is committed:**

- no scan, PDF or image;
- no OCR text of any object that is not public domain;
- no synthesised byte.

`fixtures/polona/search/`, `objects/` and `ocr/` are excluded from Prettier so they stay as served.

## 17. The parser

`packages/sources/src/polona/` exports:

- `parsePolonaSimpleSearch` and `parsePolonaFulltextSearch`;
- `parsePolonaDigitalObjectDetails`, `parsePolonaDigitalObjectFrontOfficeDetails` and `parsePolonaVirtualObjectFrontOfficeDetails`;
- `parsePolonaAltoPage`;
- the rights vocabulary and mapping (`classifyPolonaRights`, `polonaRightsLayer`, `POLONA_RIGHTS_MAPPING`).

It is pure: no database, no network. Every function takes the served text and returns typed values or throws `PolonaShapeError` with a reason and a path.

**What counts as drift:**

- a missing field;
- an extra field;
- a changed type;
- a value outside the observed set;
- an unknown licence;
- an unknown statement;
- a licence/statement/flag combination never observed;
- a hit count that does not add up;
- for ALTO, any construct, element or attribute the observed page does not use (a `WC` attribute included).

**Tests:**

- `fixtures.test.ts`: every committed file matches its digest and parses.
- `drift.test.ts`: one or more mutated copies of a real fixture for each of the eleven drift reasons.
- `rights.test.ts`: the vocabulary, the mapping, and its equality with §11's table.

Results are in `docs/progress/2026-09-29-polona-source-spike.md`.

## 18. Out of scope

Nothing from task §5 is in the diff: no migration or table, no `Source` or `RightsProfile` row, no connector, worker or queue use, no evidence or claim, no API, UI or consumer text, no scan, no Europeana or FBC, no generated inflections, no LLM, and no change to ADR-0007.

**One recorded deviation from task §9's check** (`git diff --stat main... -- … packages/truth/src …`, "expect no changes"): `packages/truth/src/polona-rights.test.ts` is new.

- It is the test task §8 item 12 requires ("evaluated through `packages/truth/src/rights.ts` in a test").
- It can only live in `packages/truth`, because `truth` depends on `@name-atlas/sources` and the reverse import would be a cycle.
- It is a test file; no source file in `packages/truth/src` changed.

## What this confirms or corrects in `docs/canonical/12` §16

**Confirmed:**

- rights differ per object and must be read per object (§16.4);
- OCR hits are machine candidates with a page locator (§16.5);
- ordinary words and OCR splits are real false-positive sources (§16.6);
- Polona UUIDs, bibliographic ids and canonical URLs exist for deduplication (§16.7).

**Corrected or sharpened:**

- **Two search modes.** Search is two modes with different locators: metadata locates an object, full text locates a page.
- **Two object kinds.** Search hits can be *virtual* objects that live inside a digital object, and they need a different endpoint.
- **No provider confidence.** Polona's OCR has none (§16.5 anticipated "if available").
- **IIIF.** Manifests are not currently retrievable (§3.5 lists Polona as a IIIF source). Only the IIIF Image API was observed working.
- **Source default.** Rights are stated with no source-wide default, which interacts with ADR-0007 §6 (D-021).
