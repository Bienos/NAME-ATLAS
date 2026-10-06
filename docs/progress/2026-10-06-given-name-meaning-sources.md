# 2026-10-06 — The search for first-name meaning sources (D-043's follow-up)

The owner asked to "start the first-name meaning source search", after TASK-124 left the full-name report's first-name chapter without a meaning. D-043 allows meanings only from a publisher's free permission or the public domain. Built on `main` @ `581d90e`. Documents only; nothing is imported or shown.

## What changed

- `docs/sources/given-name-meanings.md` (new): the candidates, their rights basis, their coverage of the 2026-01-20 lists, and the modern dictionaries that need permission.
- `docs/DECISIONS_NEEDED.md`: D-046, with four questions and a recommendation.
- `docs/CODEMAP.md`: one row. `STATUS.md`: the full-name report line and "Last rewritten".

## What was done (commands and results)

**Texts retrieved** (in the session scratchpad, not committed):

| Work | Copy | Result |
|---|---|---|
| Buryan 1933 | `https://www.zbc.uz.zgora.pl/Content/82526/download/` | 17,117,073 bytes, SHA-256 `91d69b0e…c43c`, equal to the checksum in `docs/sources/bruckner-buryan-package.md`. `pdftotext` of PDF pages 1–10: chapter A "Imiona" on printed pp. 3–5, before "B. NAZWISKA". |
| Brückner 1927 | Internet Archive `slownik_etymologiczny_jezyka_polskiego`, full-text file | 2,959,031 bytes, SHA-256 `1e94c893…f5f8`; item licence URL CC0 1.0, date 1927. |
| Yonge 1884 | `https://www.gutenberg.org/cache/epub/70419/pg70419.txt` | 1,986,520 bytes, SHA-256 `20f0b2b1…c5aa`; "Release date: March 30, 2023 [eBook #70419]". 150 index lines parse as "form, sex, _Pol._, root language and meaning, page". |
| Gloger, "Imiona staro-polskie" | Polish Wikisource page `Encyklopedia_staropolska/Imiona_staro-polskie` | Read through a fetch: Old Polish names with dates and roots, few meanings. Not measured. |

**Coverage** was measured against `gn_full`, the database holding the full 2026-01-20 first-name files and their TASK-122 claims. The rows were the 74,791 stored counts whose name is not held for review. The figures are in `docs/sources/given-name-meanings.md` §3:
- any of the three works: men 48.1% and women 33.5% of people;
- a meaning (Brückner or Yonge): men 32.8% and women 13.1%.

Brückner's figures are upper bounds: the automatic head-of-line match also catches common words that are listed names (BABA, DOM).

**Web searches** found:
- that Bystroń 1938 and Taszycki 1926 are still in copyright. The 1938 *Księga imion w Polsce używanych* (Rój, Warszawa) is J. S. Bystroń's, who died on 18 November 1964, not the linguist Jan Bystroń (died 1902). Taszycki died on 8 August 1979.
- that the IJP PAN *Słownik etymologiczno-motywacyjny* on RCIN is "Copyright-protected";
- the existence and publishers of Grzenia's *Nasze imiona* (2002; 2010 edition of the 200 most-given names), Bubak's *Księga naszych imion* (Ossolineum, 1993) and Fros and Sowa's *Twoje imię* (1982).

A first guess at a "Słownik etymologiczny imion" by Maria Malec was not confirmed and is not listed.

`pnpm format:check`: exit 0. `pnpm check:ids`: exit 0, "every task, ADR, migration and decision number is used once".

## Not verified

- Brückner's entries against page images, and Gloger name by name.
- No publisher was contacted, and no permission exists.
