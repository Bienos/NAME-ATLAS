# `sources/given-name-meanings/` — first-name origins and meanings from public-domain works

What two public-domain works state about the first names on the PESEL lists (TASK-147,
ADR-0045, D-046). Each file cites its work as `sources/onomastics/` does (ADR-0008 §4) and
holds one entry per name: the name as the lists spell it, the work's printed form, the
language of origin as a code and in the work's own words, the work's meaning where it gives
one, the page and the work's sentence or line verbatim. Nothing in them is invented: the
tests read these files as they are.

| File | Work | Entries | Basis |
|---|---|---:|---|
| `buryan-1933.json` | ks. Józef Buryan, *Skąd pochodzi twoje imię i nazwisko…*, Warszawa 1933, chapter A "Imiona", printed pp. 4–6 | 112 | Public domain: author died 1950 (art. 36) |
| `yonge-1884.json` | Charlotte M. Yonge, *History of Christian Names*, new edition, revised, London 1884, the Glossary's lines marked *Pol.* | 86 | Public domain: author died 1901 (art. 36) |

How the entries were made:

- **Buryan:** transcribed from the page images of the Zielonogórska Biblioteka Cyfrowa scan
  (PDF pp. 6–8), the copy `sources/onomastics/buryan-1933.json` cites. A name is listed when
  chapter A names its language of origin and the name is on the 2026-01-20 lists; 1933
  spelling maps to today's (*Marja* to MARIA, *Jakób* to JAKUB). Eighteen Old Polish names
  the chapter gives are on neither list and are left out. A meaning is given only where the
  chapter states one.
- **Yonge:** read from Project Gutenberg eBook #70419. A Glossary line counts when it is marked
  *Pol.* and its form, written with Polish letters and without diacritics, is a name on the
  list of the same sex; where several names fit, the one more people have. The root language
  becomes the origin code (*Gr.* `grc`, *Heb.* `he`, *Aram.* `arc`, *Lat.* `la`, *Teu.*
  `gem`, *Slav.* `sla`). The meaning is in English. D-046 §2 allows a literal Polish
  translation beside it, which is Name Atlas's and is marked `"by": "Name Atlas"`; for a
  woman's name it takes the feminine form.

Import with `pnpm import:given-name-meanings --file sources/given-name-meanings/buryan-1933.json
--file sources/given-name-meanings/yonge-1884.json`, then derive with
`pnpm truth:derive-given-name-meanings`. A changed file imports as a new version and the
earlier one becomes `UPDATED`; deriving again replaces a name's claim whose works changed.
