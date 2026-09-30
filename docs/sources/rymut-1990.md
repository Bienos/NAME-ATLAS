# Rymut, "Słownik nazwisk współcześnie w Polsce używanych" — availability and rights check

Checked 2026-09-29/30 (UTC). Evidence manifest (URL, fetch time, SHA-256 of every page relied on):
`docs/sources/acquisition/2026-09-30/evidence/rymut.MANIFEST.tsv`.

**Status: not acquired. No licence permits commercial reuse or automated download. Needs written permission
from IJP PAN.** No scans or data were downloaded.

## The work

From Biblioteka Narodowa MARC records (`data.bn.org.pl` API):

- "Słownik nazwisk współcześnie w Polsce używanych", ed. Kazimierz Rymut; Polska Akademia Nauk, Instytut
  Języka Polskiego; Kraków. 10 volumes: T.1–2 1992, T.3–7 1993, T.8–10 1994. Set ISBN 83-85579-25-7.
  About 600–690 pages per volume.
- MARC note: "Oprac. na podstawie mater. Rządowego Centrum Informacyjnego PESEL."
- Coverage, from IJP PAN's journal (Onomastica 62, 2018): "dane liczbowe z 1990 r. na podstawie bazy PESEL,
  odnoszące się do frekwencji całkowitej każdego z ówcześnie funkcjonujących 405 670 nazwisk w Polsce oraz
  liczby jego użytkowników w 49 województwach". IJP PAN's own surname site calls these "nieaktualne już dane
  frekwencyjne z 1990 r."
- Kazimierz Rymut: 18 December 1935 – 14 November 2006 (Polish Wikipedia).
- Not verified: the exact 1990 extraction date and the "94% of the population" figure (found only in a
  secondary source, JRI-Poland).

Not the same work, and not covered here: "Nazwiska Polaków" (Ossolineum 1991); "Nazwiska Polaków. Słownik
historyczno-etymologiczny" (1999–2001); and the 2005 CD "Słownik nazwisk używanych w Polsce na początku XXI
wieku" (GenPol CD nr 001), which is built from PESEL data of September 2002 and is a different dataset. The
CD publisher's domain now shows "Domain For Sale"; whether the CD can still be bought is not verified.

## Where it is, and on what terms

| Location | What is there | Terms (verbatim) | Commercial reuse | Automated access |
|---|---|---|---|---|
| RCIN, `rcin.org.pl/dlibra/publication/33731` (IJP PAN links here) | Full DjVu scans of all 10 volumes, free to view | 9 of 10 volumes: "Prawa zastrzeżone - dostęp nieograniczony"; "Zasób chroniony prawem autorskim. Korzystanie dozwolone w zakresie określonym przez przepisy o dozwolonym użytku." Regulations: "Obiekty znajdujące się w zasobach RCIN są chronione prawem autorskim." | No licence granted. Only statutory permitted use (dozwolony użytek). | robots.txt: `Disallow: /Content/*/download*` and `Disallow: /Content/*/zip*`; an intermittent anti-bot page. |
| RCIN, T.3 (edition 24807) | Scan | The same record says both "Prawa zastrzeżone - dostęp nieograniczony" and "Zasób wyłączony spod ochrony prawa autorskiego…". Contradicts the other nine volumes; treat as a metadata error. | Do not rely on it | as above |
| Polona (Biblioteka Narodowa), T.3 and T.4 | Scans, reading rooms only | "Publikacja chroniona prawem autorskim - reprodukcja cyfrowa dostępna w czytelniach BN i na terminalach Academiki" | No | No |
| Internet Archive, `sowniknazwiskwsp0000rymu` | One volume, borrow-only (`access-restricted-item: true`) | No licence | No | not verified |
| HathiTrust | v.1, v.4, v.6 | "Limited (search-only)", rights code `ic` | No | not verified |
| Google Books | Metadata only | "No preview available" | — | — |
| IJP PAN bookshop | No listing found now | — | — | — |
| `nazwiska.ijppan.pl` (IJP PAN's official online surname database) | **Not this data**: it uses 2014 PESEL data and only cites this dictionary | Terms silent | — | — |

Third parties republishing the 1990 counts (their data was not collected): `herby.com.pl` (Ośrodek
Dokumentacji Wychodźstwa Polskiego) shows the 1990 counts by 49 voivodeships and thanks "prof. K. Rymutowi
oraz dr K. Skowronek za udostępnienie danych". It has no terms page. The terms of that arrangement are
unknown; it is evidence that IJP PAN has shared the data before, not a licence to Name Atlas.

## Rights holder and permission route

- Publisher: Instytut Języka Polskiego PAN. No RCIN record fills in a rights-owner field; whether the editor's
  heirs hold any rights is not verified.
- Contact, from `ijppan.pl/kontakt/`: Al. Mickiewicza 31, 31-120 Kraków; `ijp@ijppan.pl`; +48 12 632 56 92.
  RCIN administrator: `rcin.org.pl@gmail.com`.
- No published licensing form. IJP PAN's public-information bulletin could not be reached, so any formal
  re-use procedure there is not verified.
- The spec already lists IJP PAN as **PARTNER ONLY** ("commercial bulk rights not established",
  `docs/canonical/12` blocked/partner table). This finding fits that classification.
- The contact email is rendered through CSS on the page; the decoded value was checked against the saved page.

## Constraints on any future use

- Whether bare 1990 counts are themselves protected (copyright in the compilation, the sui generis database
  right, the PESEL origin of the data) is a legal question. It was not answered here and needs Polish counsel.
- The data is 1990 counts over the 49 voivodeships of 1975–1998. At most it can support an "older regional
  distribution" layer. D-004 forbids distributing a current national total across regions using old
  proportions.

## Process note

The research agent requested one NUKAT catalogue search URL in the same command as NUKAT's robots.txt, before
reading it. That URL is disallowed by robots.txt. It returned an anti-bot page, which was discarded. Nothing
else from NUKAT was fetched.
