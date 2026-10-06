# 2026-10-06 — Brückner 1927's first-name entries, read from the page images (TASK-150)

The owner asked "yes build the Brückner entries" (`tasks/150-bruckner-given-names.md`; D-046 §3, ADR-0045). Built on `main` @ `3d12f1a`. Nothing is imported or derived on production.

## What changed

- **`sources/given-name-meanings/bruckner-1927.json`** (new):
  - 33 listed first names from 23 passages of Aleksander Brückner, *Słownik etymologiczny języka polskiego* (Kraków 1927).
  - Each entry was read from the page image of Internet Archive item `slownik_etymologiczny_jezyka_polskiego`. The locator names the printed page, the column and the scan's leaf.
  - The quotation is verbatim, with "[…]" for text left out; italics are not kept.
  - The work is public domain: the author died in 1939 (art. 36), and WBC marks its scan "domena publiczna". It is cited as Buryan's and Yonge's files are, `LEGAL_REVIEW_REQUIRED`.
- **`sources/given-name-meanings/README.md`:** how the Brückner entries were chosen.
- **`ops/vm/given-names.sh`:** imports and gates on the third file.
- **`packages/sources/src/given-names/meanings.test.ts`:** parses the third file (33 entries).
- **Docs:** this record, the task file, ADR-0045's consequences, `STATUS.md`, `docs/CODEMAP.md`.

No code changed: the format, import, derivation and report are TASK-147's.

## How the entries were found and read

**Finding the passages.** These were located through the OCR, but no text was taken from it:
- the work's index (printed pp. 691–803, leaves 716–828) for capitalised listed names, through `hocr_searchtext` and `hocr_pageindex`;
- headwords that start a line in the hOCR;
- a search of the whole text for 1927 spellings (*Marja*, *Jakób*).

Each passage was then cropped from the page image (`archive.org/download/…/page/n{leaf}.jpg`, 1,600–1,720 px wide) and read.

**Kept (33 names):**
- **Origin stated:** PIOTR, PAWEŁ (*z łac.*); KATARZYNA, MIKOŁAJ, MAŁGORZATA ("greckie margarites, ‘perła’"), HELENA, JACEK, JACENTY, HIACYNT (*z grec.*); JAN (*z hebraj.*); MICHAŁ ("imię hebrajskie"); JADWIGA ("z niem. Hedwig (oba pnie: hadu- i wig-, znaczą ‘wojnę’)"); OLGA, OLEG (*niem. Helga*, *Helgi*); LESZEK (*leść*, "pożyczka z goc."); WACŁAW (*\*Więce-sław*).
- **Slavic, *prasłowo*:** BOLESŁAW, WOJCIECH, LUBOMIR, BORYSŁAW; BARTOSZ, BARTEK (from *bartodziej*, "z Bartłomiejem pomieszano, najniesłuszniej"); ZBIGNIEW, GNIEWOMIR, GNIEWOSZ, JAROGNIEW (*gniew*); ZIEMOWIT, SIEMOWIT (*\*siemia*, ‘rodzina’).
- **A meaning, no origin:** JAROSŁAW, ŚWIĘTOSŁAW ("‘silną (wielką) sławę mający’"), STANISŁAW (*stan-* among the "wojownicze" names), DOBIESŁAW (*dob’*, ‘dobry’), MIESZKO (*Mieszka*, ‘niedźwiedź’).

**Read and left out:**
- **No origin or meaning given:** ANDRZEJ ("z Andreas", no language), TOMASZ ("Od Tomasz: Tomek"), JAKUB, MARCIN, JÓZEF, FRANCISZEK, MARIA (*Marja*), BERNARD, BENEDYKT, BONIFACY, IDZI, IGOR, KATARZYNA's main entry (p. 222; the addendum on p. 677 is kept).
- **Only the form's route through a neighbouring language:** JERZY ("z czes. Jirzí"), JANUSZ ("z czes. wedle niem."), KAROL ("wedle łaciny"), WŁADYSŁAW ("tak samo obce, łacińskie i węgierskie"), FABIAN (*Pabian*), BAZYLI ("u Rusi wedle wymowy nowogrec.").
- **A common word, not the name:** DANIEL, FILIP, BLANKA, NARCYZ, LEW, IZA, NADZIEJA, SŁAWA, DOROTA (*dorka*), ELŻBIETA.

Several first image reads failed to display ("media removed"). Every entry above was read again from its image before it was written, including the ones whose first read failed (JADWIGA, PIOTR, MAŁGORZATA, PAWEŁ, KATARZYNA, MIKOŁAJ, MICHAŁ, JAN) and the left-out ANDRZEJ, TOMASZ, JAKUB and FRANCISZEK.

## Verification (commands run, results as returned)

Run on the working tree, PostgreSQL 16.14. Unit tests used a new empty database, as on GitHub.

| Command | Result |
|---|---|
| `pnpm format:check`, `check:ids`, `check:vm` | exit 0 |
| `pnpm test` | exit 0, 2,467 tests |
| `pnpm test:integration` | INTEGRATION_RESULT |

`check:ids` was run again after renumbering from TASK-149 to TASK-150 (#178 took 149): exit 0.

**On the full first-name lists** (`gn_full`, the local database with the 2026-01-20 lists and TASK-147's two files already imported and derived):
- **Import:** `pnpm import:given-name-meanings --file sources/given-name-meanings/bruckner-1927.json` gave `IMPORTED`, 33 entries.
- **First derivation:** `pnpm truth:derive-given-name-meanings` returned 181 names:
  - 33 derived, 20 of them superseding a claim; 148 kept; 0 retracted; `not_on_lists` empty;
  - 139 POSSIBLE, 37 LIKELY, 5 CONFLICTING.
- **Second derivation:** 0 derived, 181 kept.
- **Per name:**
  - MAŁGORZATA: LIKELY, Greek in all three works.
  - JADWIGA: LIKELY, Germanic in all three.
  - PAWEŁ: LIKELY, Latin in all three.
  - PIOTR: CONFLICTING, Greek (Yonge, Buryan) and Latin (Brückner).
  - BARTEK: CONFLICTING, Hebrew (Yonge) and Slavic (Brückner).
  - LESZEK: CONFLICTING, Greek (Yonge) and Germanic (Brückner).
- **Report:** `pnpm report:build -- --surname NOWAK --given-name PIOTR` exited 0, version 2. The meaning is `READY` with 3 works: Yonge `grc`, Brückner `la`, Buryan `grc`. Section summary `VERIFIED` 4, `CONFLICTING` 1.

On that database `pnpm db:migrate` reports an error, because it holds TASK-147's migration and not `main`'s 0043. The import, derivation and report build need no schema change.

## Not verified

- The file is not imported on the VM, and `given-names.sh` has not run with it.
- Each passage was read once, by this session; the quotations have no second reader.
- Names the index lists in lower case, or under a headword that is not the name, may be missed. The search covered only listed names with at least 100 people, plus those met in the passages read.
