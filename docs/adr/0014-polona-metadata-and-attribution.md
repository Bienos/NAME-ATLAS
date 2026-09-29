# ADR-0014 — metadata of unknown rights may be cited, and a Polona attribution names the author and the work

- **Status:** Accepted
- **Date:** 2026-09-29
- **Deciders:** project owner, answering D-021 items 2 and 3 on 2026-09-29 ("Keep §4: citations allowed"; "Author + title + source")
- **Resolves:** `docs/DECISIONS_NEEDED.md` D-021 items 2 and 3. Items 1 (automated access) and 4 (the source default) stay open.
- **Amends:** ADR-0007 §1, which now applies to the transcription and image assets only, and ADR-0007 §5, which gains a composition rule for Polona objects
- **Code:** none. `packages/truth/src/rights.ts` already behaves as §1 below says, and `packages/truth/src/polona-rights.test.ts` pins it. §2 is implemented by the Polona connector task, which is not written.

## Context

TASK-031 (`docs/sources/polona.md` §11–§12) evaluated real Polona objects through ADR-0007's code and found two places where Polona's values and ADR-0007 do not fit.

1. **Metadata whose rights are unknown.**
   - Polona states no licence for its catalogue records, so every Polona object carries `metadata_rights = UNKNOWN`.
   - ADR-0007 §1 says an `UNKNOWN` permission is refused on every public surface "on every dimension".
   - ADR-0007 §4 has the metadata row reproduce `evaluateSurface`, which refuses metadata only when `metadata_rights` is `PROHIBITED`. Its public gates are commercial use and redistribution.
   - For a public-domain Polona object the code therefore opens the metadata row on `FREE`, `PAID` and `SEO`. §1's sentence says it should not.
   - Polona is the first source for which the two sentences disagree in practice. PESEL's `metadata_rights` is `ALLOWED`.
2. **The attribution.**
   - Polona's FAQ sets the rule for public-domain works: "Należy jednak pamiętać, żeby wykorzystując te utwory zawsze wskazywać imię i nazwisko autora oraz tytuł dzieła (o ile te informacje są dostępne)" (always give the author's name and the work's title, where they are known).
   - Polona supplies no attribution text. ADR-0007 §5 then derives "owner — rights URL", which for the traced object is "Biblioteka Narodowa — https://creativecommons.org/publicdomain/mark/1.0/". That names neither the author nor the work.

## Decision

### 1. Metadata follows the metadata row; §1's refusal is for text and scans

ADR-0007 §1's rule, that an `UNKNOWN` permission is refused on a public surface exactly as if it were `PROHIBITED`, applies to the **transcription** and **image** assets.

The **metadata** asset is governed by ADR-0007 §4 alone. The metadata row reproduces `evaluateSurface`:

- it refuses metadata when `metadata_rights` is `PROHIBITED`, or when the rights review is `BLOCKED` (on `PAID` and `SEO`, also when it has `EXPIRED`);
- `commercial_use` and `redistribution` keep gating the `PAID` and `SEO` surfaces as they already do;
- a required attribution that cannot be built still blocks (ADR-0007 §5).

The consequence: a work's catalogue record, meaning its title, author, date and holding institution, may be shown and cited on a public surface when those gates allow it, even where the catalogue's own licence is not stated. The work's **text and scan** are still refused unless their own permission is `ALLOWED`.

This is what the code already does, so nothing changes for PESEL or for any claim already published. Nothing here changes how automated access or commercial use are treated; they keep `docs/canonical/12` §6.4's gates, and Polona's automated access is D-021 item 1.

### 2. A Polona attribution names the author and the work, then the source

For a Polona object whose attribution is required, the connector stores a per-object `attribution_text` composed from the object's own catalogue record, in this order:

1. the creator, when Polona's record names one;
2. the title, when the record states one;
3. "Polona, Biblioteka Narodowa".

Rules for the composition:

- Values are used exactly as Polona serves them, never translated or paraphrased.
- A missing creator or title is omitted, not guessed. Polona's own rule applies only "o ile te informacje są dostępne".
- The text is stored on the object's own rights layer. ADR-0007 §5 then displays it verbatim, as it displays any stored `attribution_text`. §5's derived "owner — rights URL" line remains the fallback for sources that state no attribution rule of their own.

Example, for the traced object (`8f7cf574-…`), whose record names no creator: "Lista strat wojska polskiego : polegli i zmarli w wojnach 1918-1920. — Polona, Biblioteka Narodowa". The exact punctuation between the parts is the connector task's to fix.

## Consequences

- **D-021 narrows to items 1 and 4.** Whether a connector may query Polona automatically and cache what it retrieves, and what the Polona source default is under ADR-0007 §6, are still the owner's to decide. The connector task stays blocked on them.
- **The connector task inherits §2** as an acceptance criterion: every surfaced Polona object carries its composed attribution.
- **ADR-0007's evaluation keeps its shape.** Only the scope of one sentence and the source of one attribution text change.
