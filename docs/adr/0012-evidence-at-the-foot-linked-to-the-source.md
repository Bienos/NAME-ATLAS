# ADR-0012 — evidence at the foot of the surname page, linked to the source's own website

- **Status:** Accepted 2026-09-24.
- **Decided by:** the project owner, 2026-09-24: remove "Zobacz dowody", put the evidence at the
  bottom or out of the way, and point it only at the website the data was taken from.
- **Supersedes in part:** TASK-023 §2 item 2 (an inline `<details>` evidence panel per claim) and its
  AC-2; the rule in `apps/web/src/lib/claim.tsx` that evidence is "inline, one disclosure away, never
  only in a sources list at the bottom", which TASK-023 took from directive §12–§15.
- **Relates to:** TASK-023 §2 item 7 (the `#sources` section); `docs/contracts/surname-result.md`
  1.6.

## 1. Context

Since TASK-023 every claim on the surname page carried a "Zobacz dowody" / "View evidence"
disclosure: source title, provider, source type, dataset scope, data date, publication date,
retrieved date, record identifier and link, method code, the supported claim, the assessment,
limitations, contradictions, licence and attribution. For NOWAK that was six panels that look alike,
a "Zobacz dowody" link under the snapshot, and a sources list at the foot with six lines that look
alike, because each claim has its own citation row.

Every "otwórz źródło" link pointed at `citation.url`. For PESEL that is the CSV download on
api.dane.gov.pl, so following it downloads a data file instead of opening the page the data comes
from. The page a reader wants — the dataset's page on dane.gov.pl — was in the source registry
(`sources.homepage_or_reference_url`) and never reached the page.

## 2. Decision

1. **No evidence panel per claim.** A claim is its statement, the assessment word, the source kind,
   and the scope and date line. The snapshot's "Zobacz dowody" link is removed.
2. **One section at the foot, `#sources`.** Each source is listed once as a reader sees it: the same
   page, title, publisher, date, licence and attribution are one line, however many claims cite it.
   The line links to the source's own website, `citation.source_page_url`, shown as its host name
   (`dane.gov.pl`). `citation.url`, the exact resource retrieved, is linked nowhere on the page. A
   source with no public page, such as a printed work, is cited by its locator instead.
3. **The notes stay, once each, one disclosure away.** What the panels told a reader is collected
   from every claim into one "Jak czytać te liczby" / "How to read these figures" disclosure under
   the sources: the dataset's own scope wording, suppression, rounding, the registered-residence
   basis, the partition caveat, the rarity denominator and any disagreeing reading. Inside the
   panels they were one disclosure away; they still are.
4. **Off the public page:** the method code, a web source's record identifier and the retrieval
   date. They stay in the API payload and in the admin inspector, which answers "where did this
   number come from?" in full.
5. **Contract 1.6** adds `citation.source_page_url`, required and nullable, from the source
   registry. The change is additive.

## 3. What does not change

- Every figure is still inside a claim that shows its assessment word, source kind and date
  (TASK-023 AC-1).
- A caveat a reader must meet before a figure, the regional coverage warning, is still rendered
  before it (TASK-012 §3).
- No confidence number or percentage appears anywhere (AC-9).
- An attribution that a rights profile requires is still rendered verbatim, now in the sources line.

## 4. Consequences

- Provenance has one place on the page, and its link opens the source's website.
- A reader no longer sees the method code or the retrieval date on the public page.
- `ClaimEvidence` (`claim.tsx`) carries `notes` in place of `scope`, `limitations` and
  `contradictions`. One builder per kind of claim in `result-view.tsx` feeds both the claim and the
  foot of the page, so the two cannot disagree.
- A future source must have `homepage_or_reference_url` set in the registry to be linked.
