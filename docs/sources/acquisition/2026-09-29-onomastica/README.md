# Acquisition record — 2026-09-29, *Onomastica* (TASK-032)

The evidence underneath `docs/sources/onomastica.md`: what the TASK-032 spike retrieved on 2026-09-29, and how. **No article bytes are stored here.** Every PDF, every HTML page and all text extracted from them stayed in the session's scratch space. They are listed below and in `SHA256SUMS.txt` by digest, so a later session can re-verify a re-download without the bytes being in the repository.

## What is kept here

| Path | What it is |
|---|---|
| `inventory.csv` | One row per item per channel: channel, item key, volume, issue, year, pages, section or type, title, authors, DOI, OAI identifier, the channel's ids, file URL, retrieval time, HTTP status, content type, bytes, SHA-256, printed-statement code (`onomastica.md` §6), licence link targets, metadata rights, cross-channel key and notes. |
| `SHA256SUMS.txt` | Every byte retrieved. Paths under `metadata/` are committed. Paths under `retrieved/` are the scratch layout and **not** committed; the tables below and `inventory.csv` give each one's URL. |
| `metadata/` | Verbatim responses, excluded from formatting by `.prettierignore`: OAI-PMH from the journal's site (`ojs-*`) and from journals.pan.pl (`jpan-*`); the three hosts' `robots.txt`; the DOAJ journal search by both ISSNs; and one Crossref work record per volume. They include the publishers' own abstracts, as served in `dc:description`. |

## Retrieval

- **Client and pacing:** Python `urllib` through the session's HTTPS proxy, with the user agent `name-atlas-source-spike/0.1 (TASK-032; sequential research requests)`. Requests were sequential per host. The pause was 1.5 s on the journal's site; 8 s for OAI on journals.pan.pl and RCIN; and 4 s, then 2.5 s, for journals.pan.pl's `/Content/` files.
- **Browser-verification page:** journals.pan.pl and RCIN often answered with "High Load - Verifying Browser", a JavaScript proof-of-work page. Such a response was never treated as data, and nothing tried to solve it. The client backed off (20 s to 480 s) and tried later.
- **`robots.txt`:** read first on each host. No disallowed path was requested.
- **Hosts**, from the request log. Every request, retry and redirect was logged. A browser-verification response counts once per attempt.

| Host | Log entries | First–last (UTC) | Outcomes |
|---|---:|---|---|
| `onomastica.ijppan.pl` | 807 | 13:27:56–15:21:24 | 200: 805; retried (504): 1; 404: 1 |
| `journals.pan.pl` | 368 | 13:27:58–16:46:56 | 200: 150; 302 to a plain-HTTP URL, not followed: 132; browser-verification page: 43; connection reset by peer, retried after 15 s: 43 |
| `onomastica.ijp.pan.pl` | 1 | 13:29:08–13:29:08 | 200: 1 |
| `creativecommons.org` | 5 | 13:41:51–13:42:32 | 200: 5 |
| `raw.githubusercontent.com` | 1 | 13:57:32–13:57:32 | 200: 1 |
| `rcin.org.pl` | 21 | 13:59:36–16:06:38 | browser-verification page: 19; 200: 2 |
| `doi.org` | 26 | 14:01:13–14:02:10 | 302: 26 |
| `doaj.org` | 3 | 15:19:57–15:20:30 | 200: 3 |
| `api.crossref.org` | 13 | 15:19:58–15:20:21 | 200: 13 |

  The first RCIN `Identify` response was a verification page labelled `text/xml`, logged as `200` before the check was corrected to read the body.
- **Interruption:** the session's container restarted at about 14:25 UTC. The journals.pan.pl OAI harvest had then done 13 of its 15 pages (260 of 298 records, 13:36–14:25). When it resumed at 15:02 the saved resumption token was refused with `badResumptionToken`. A fresh `ListIdentifiers` returned two pages, at 16:36 and 16:43 (100 identifiers, all already harvested). Every other OAI request from 15:18 to 16:46 UTC received the verification page, so **38 of the 298 records are not harvested**. `/Content/` requests never received it, and all 260 known items were requested (15:38–16:36 UTC).

## Pages read and not stored

The quotations in `onomastica.md` §8 come from these. HTML is not stored, following the 2026-09-28 precedent for publisher pages; the SHA-256 identifies the exact bytes quoted.

| What | URL | First retrieved (UTC) | Status | Bytes | SHA-256 |
|---|---|---|---|---:|---|
| Home | `https://onomastica.ijppan.pl/index.php/ONOM` | 13:32:05 | 200 | 44186 | `547e4425cba1a5f948f4e26c901958436df52b8d6fcf57b4bf5a1ef038ea72ac` |
| About | `https://onomastica.ijppan.pl/index.php/ONOM/about` | 13:32:07 | 200 | 16689 | `87706001f3d81f45aacf8c19f7bd2493b4d657e16006e9708190028efd001821` |
| Essential facts | `https://onomastica.ijppan.pl/index.php/ONOM/essential-facts` | 15:20:44 | 200 | 18898 | `36b5551e63977f48163a616b28141a8124519961503f5d4f7638a6c7d559cbae` |
| Aims & Scope | `https://onomastica.ijppan.pl/index.php/ONOM/aims-scope` | 15:21:24 | 200 | 15209 | `ae11c18c94a759bdcd4851ce889faaf48dd115e038d99dd9b4e3259c07579144` |
| Guidelines | `https://onomastica.ijppan.pl/index.php/ONOM/guidelines` | 14:14:23 | 200 | 22398 | `5dd113ef0b2b76c90745405fa47926b3b338684b61be14507ecfd3a4b78f7362` |
| Submissions | `https://onomastica.ijppan.pl/index.php/ONOM/about/submissions` | 13:32:10 | 200 | 18734 | `e8faa2f630d740a39a9b123a11bbb3af1fe971433c4fc1dbb8aef6081f2f48ae` |
| Ethics and Procedures | `https://onomastica.ijppan.pl/index.php/ONOM/ethics` | 14:14:21 | 200 | 30991 | `8079ca013ecb9a4a524eb4d2f48862ced2cd3d123db72f98d59469209a15514f` |
| Announcements | `https://onomastica.ijppan.pl/index.php/ONOM/announcement` | 14:14:25 | 200 | 14734 | `aec0b25b9a056e94745876e17a207b000dbe067080e0e81813126735870ea874` |
| Archive | `https://onomastica.ijppan.pl/index.php/ONOM/issue/archive` | 13:32:12 | 200 | 21920 | `107287fd06aa4cb299bd7ec088ff786874733313fdc6a5f29d751877a6d51163` |
| Contact | `https://onomastica.ijppan.pl/index.php/ONOM/about/contact` | 14:14:27 | 200 | 14341 | `11349b52f249883e7617e77b65aadd549d6d9bed007d9f58d07545039f5a57b5` |
| Editorial Team | `https://onomastica.ijppan.pl/index.php/ONOM/about/editorialTeam` | 14:14:29 | 200 | 15825 | `4210a01844c71f7d957940a5c7d13aaa8cb6c61edd92dbac6326df142f96280b` |
| Agreement template (PDF) | `https://onomastica.ijppan.pl/public/journals/1/Onomastica_Proprietary_copyrigths_template.pdf` | 14:20:23 | 200 | 120854 | `8dca2311aab8d53856111cc7da8097753202fe1d0443dee756251bf4ae93c29a` |
| Agreement statement (.docx), linked from Essential facts | `https://onomastica.ijppan.pl/public/journals/1/Onomastica_Proprietary_copyrights_statement.docx` | 15:21:22 | 404 | 283 | `0bcb2fc452e584f0c3ba9a357a3a34b6859acf05a56dab8cbeec85b0be3eff41` |
| CC BY-ND 4.0 legal code | `https://creativecommons.org/licenses/by-nd/4.0/legalcode.en` | 13:41:51 | 200 | 48929 | `b94cd815ae99f870d0c1ae9169685082177083b5a8ef7615a4f7718720b8aa23` |
| CC BY-NC-ND 4.0 legal code | `https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode.en` | 13:41:53 | 200 | 50111 | `dc1f0f8170be10426ef5dbb251f76bd33165b7dac81978e6bf21d0da6d852b8a` |
| CC BY-ND 3.0 legal code | `https://creativecommons.org/licenses/by-nd/3.0/legalcode` | 13:42:02 | 200 | 48813 | `3e9f20884cbb3dce39a3aff96a83a62f452a3ddb96c061ecd9d1daa62035123d` |
| CC BY-ND 3.0 Poland legal code | `https://creativecommons.org/licenses/by-nd/3.0/pl/legalcode` | 13:42:32 | 200 | 44517 | `76a01292f6468bc66aad39e9812d310da5d44dd923308a52ae28b7bc25d7249b` |
| CC `by-nd/4.0/pl/` | `https://creativecommons.org/licenses/by-nd/4.0/pl/` | 13:42:21 | 200, redirected to `https://creativecommons.org/licenses/by-nd/4.0/deed.pl` | 36388 | `20940b492c5486fb0e18b1b72c964316b08c075861d30cf336f716106ec02ed5` |
| OJS 3.1.2-3 Dublin Core plugin source | `https://raw.githubusercontent.com/pkp/ojs/ojs-3_1_2-3/plugins/generic/dublinCoreMeta/DublinCoreMetaPlugin.inc.php` | 13:57:32 | 200 | 8253 | `47e612e1da9a791cd7c74e3a267a6fd84a2d5ec6c97277ee79b881e2f77ce3a9` |

The 373 article pages (`/ONOM/article/view/<article>`) and 13 issue pages (`/ONOM/issue/view/<issue>`) are in `SHA256SUMS.txt` under `retrieved/ojs/articles/` and `retrieved/ojs/issues/`. `/ONOM/user/setLocale/pl_PL?source=…` returned the English pages, byte-identical to the English fetches (`onomastica.md` §8).

## Files retrieved and not stored

- **371 article PDFs from the journal's site:** 13:56:08–14:14:10 UTC, HTTP 200, `application/pdf`. Each one's URL, time, size and SHA-256 are in `inventory.csv`.
- **12 whole-issue PDFs from the journal's site.** With the 371 article PDFs, the 383 files total 289,452,502 bytes.

| Vol. | URL | Retrieved (UTC) | Bytes | Pages | SHA-256 |
|---|---|---|---:|---:|---|
| 60 (2016) | `https://onomastica.ijppan.pl/index.php/ONOM/issue/download/8/4` | 14:13:44 | 9937523 | 464 | `87e94c106802a49ed8048cf8137905f170215004de653809ff69bee3492f93c0` |
| 61/1 (2017) | `https://onomastica.ijppan.pl/index.php/ONOM/issue/download/6/5` | 14:13:34 | 5340152 | 327 | `53f3de80c355a735230a003ec8e7802d6d30c2deb2ab01ee76f710b0bea390f0` |
| 61/2 (2017) | `https://onomastica.ijppan.pl/index.php/ONOM/issue/download/7/6` | 14:13:38 | 7797115 | 476 | `34b29ff19297017600119c91c606ac0af0ee39870edf567ad491fedae05a2a04` |
| 62 (2018) | `https://onomastica.ijppan.pl/index.php/ONOM/issue/download/3/7` | 14:13:31 | 6137136 | 372 | `2015286c692469393ff3b8d7b394c498599a83b955a16d7701ca124df8dc8089` |
| 63 (2019) | `https://onomastica.ijppan.pl/index.php/ONOM/issue/download/2/1` | 14:13:27 | 6897077 | 362 | `ae04cf28da2d6ac514a96ef88cd7478a8b65340570c56b667602ed9ba8b36b37` |
| 64 (2020) | `https://onomastica.ijppan.pl/index.php/ONOM/issue/download/10/9` | 14:13:47 | 3441085 | 282 | `c74b2b31d14212d45663bbd402a8aaae01baf9d9556cd6830ac3963a371aea07` |
| 65/1 (2021) | `https://onomastica.ijppan.pl/index.php/ONOM/issue/download/11/12` | 14:13:50 | 5234352 | 352 | `fc9857c98bf724732c98551d27f97af903d0a259b23f591d626332a9bfe8ec7b` |
| 65/2 (2021) | `https://onomastica.ijppan.pl/index.php/ONOM/issue/download/12/13` | 14:13:53 | 5231771 | 340 | `ac636aad9d4b2f2070d166cfb86421d4d38f82d78dcd3fe65a80b02ad02986cf` |
| 66 (2022) | `https://onomastica.ijppan.pl/index.php/ONOM/issue/download/13/18` | 14:13:57 | 6873201 | 388 | `d173aaabcaebef3ce96753f940d28b643ed651bd351f0e69794dba5792d3d514` |
| 67 (2023) | `https://onomastica.ijppan.pl/index.php/ONOM/issue/download/14/24` | 14:14:00 | 6397099 | 436 | `8fea4c251e22292617cc28ea4336fd9771ff77f3881e9427ce88ddd4c45c6ab3` |
| 68 (2024) | `https://onomastica.ijppan.pl/index.php/ONOM/issue/download/15/25` | 14:14:05 | 6981137 | 400 | `028baa7a0297de8c34e174171bf87cb4c4697c8aa1b7c616e5fa8411652bbf62` |
| 69 (2025) | `https://onomastica.ijppan.pl/index.php/ONOM/issue/download/17/26` | 14:14:10 | 18053295 | 466 | `418fcbfa8d842b31c111eaaf33ad7d512e794fd07e39e10c290e5d9c5a806bb3` |

- **journals.pan.pl:** 128 PDFs (70,789,697 bytes), served by `/Content/<edition>` through a 302 to `/Content/<edition>/PDF/…`. Each one's URL, time, size and SHA-256 are in `inventory.csv`.
  - The other 132 items' `/Content/` chains end at plain-HTTP whole-volume PDFs. Those URLs are in `inventory.csv` and were not requested.
  - The bodies of the 302 responses were not kept.

## Also resolved

- **DOIs:** one per volume, vols 59–69 (13 DOIs), each requested at `https://doi.org/<doi>` and recorded without following. Nothing is stored. All answered 302 to an OJS article page (`onomastica.md` §1).
- **Crossref:** the same 13 DOIs at `https://api.crossref.org/works/<doi>`, stored under `metadata/`. No record has a `license` field.

## Verification

These checks ran in this session on 2026-09-29, before the scratch bytes were discarded:

- The 51 committed files: `cd docs/sources/acquisition/2026-09-29-onomastica && grep '  metadata/' SHA256SUMS.txt | sha256sum -c --quiet`. Exit 0, no mismatch.
- The 920 files not committed: the same command for the `  retrieved/` lines, run from the scratch copy laid out under those names. Exit 0, no mismatch.

To re-verify a re-download, save each file under its `retrieved/…` name and run the same command. `inventory.csv` and the tables above give each file's URL.
