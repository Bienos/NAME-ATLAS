# TASK-150 — Brückner 1927's first-name entries, transcribed from the page images

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-bruckner-given-names.md`). The file is not imported on the VM.
- **Number:** 150. `main` holds TASK-148, ADR-0046 and migration 0044. The open pull request #178 holds TASK-149, opened while this was being built under that number.
- **Requested by:** the project owner, 2026-10-06: "yes build the Brückner entries".
- **Decision:** D-046 §3: Brückner's first-name entries are transcribed from the page images and quoted verbatim, never taken from the OCR. Format and chain: ADR-0045.
- **Model guidance:** implementation session; most of the work is reading page images.

## 1. Goal

A third public-domain work in `sources/given-name-meanings/`: what Aleksander Brückner's *Słownik etymologiczny języka polskiego* (Kraków 1927) says about the first names on the 2026-01-20 lists. Each entry is read from the page image and quoted with its page and column. TASK-147's import, derivation and report then carry it. No code change is needed unless the work names a language outside ADR-0045's codes.

## 2. Facts (2026-10-06)

- **The copy:** Internet Archive item `slownik_etymologiczny_jezyka_polskiego`, the same copy as the owner's package (`docs/sources/bruckner-buryan-package.md`):
  - the item's licence URL is CC0 1.0;
  - 834 leaves, with page images at 1,600–1,720 × 2,400–2,660 px;
  - `page_numbers.json` maps each leaf to its printed page.
- **The work:** Wielkopolska Biblioteka Cyfrowa marks its scan of the same edition "domena publiczna", and gives Brückner's dates as 1856–1939. Under art. 36 the work is public domain from 2010-01-01.
- **The index:** the work's index ("Indeks", printed pp. 691–803) names the pages where a name is discussed. Brückner rarely gives a first name its own headword; most are discussed under a related word or in the appendix ("Dodatek", pp. 675–690).

## 3. In scope

- **Finding the names:** the listed first names (Polish letters, at least 100 people) the index points to, or that start a line as a headword in the OCR. The OCR only locates a passage; nothing is taken from it.
- **Transcription:** each passage is read from the page image. A name is kept when Brückner states where it comes from or what it means. Some entries are left out: one that only lists the name, gives diminutives or tells its later history, as the parser requires; and one that traces only the form through a neighbouring language (Jerzy "z czes. Jirzí", Karol "wedle łaciny"), since that is the form's route, not an origin.
- **Entry fields:** each entry follows ADR-0045's format:
  - **printed form:** as printed (1927 spelling);
  - **origin:** the earliest language Brückner names for the name, coded by family (*łac.* `la`, *grec.* `grc`, *niem.* `gem`, *czes.*/*rus.*/*cerk.* `sla`, *hebr.* `he`, *lit.* `lt`). His words go into `as_printed`. A language outside these families gets a new code, added to the parser and the page's words.
  - **meaning:** his words, verbatim;
  - **locator:** the printed page and column, with the scan's leaf;
  - **quotation:** the passage verbatim. "[…]" marks text left out. Italics are not kept.
- **`sources/given-name-meanings/bruckner-1927.json`**, and its `README.md` line.
- **`ops/vm/given-names.sh`** also imports the file and gates on its record.
- **Docs:** this file, the progress record, `STATUS.md`, `docs/CODEMAP.md`, and ADR-0045's consequences.

## 4. Out of scope

- Any name Brückner does not explain; any meaning not in his words; Gloger; Grzenia.
- The OCR as a source of text.
- Running the VM step.

## 5. Acceptance criteria

- **AC-1:** the file parses. Every entry's quotation was read from the page image named in its locator.
- **AC-2:** MAŁGORZATA has three works, each stating Greek origin, and is LIKELY. JADWIGA's Brückner meaning is "oba pnie: hadu- i wig-, znaczą ‘wojnę’". PIOTR has Latin (Brückner) beside Greek (Buryan), and is CONFLICTING.
- **AC-3:** importing and deriving on the full lists supersedes the claims of the names Brückner adds to. A second derivation writes nothing.

## 6. Verification

`pnpm format:check`, `check:ids`, `check:vm`, `test`, `test:integration`. Then, on the full first-name lists, the file is imported, every meaning is derived, and a full-name report is built.
