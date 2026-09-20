# ADR-0005 — `canonical_key_v2` folds with Unicode **simple** case folding

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** project owner (chose Option A on D-013) + the implementing session
- **Depends on:** TASK-003 (the resolver this changes), ADR-0001 (confidence and rights are separate)
- **Deviates from:** `docs/canonical/13` §5.5 and §57.2, which specify Unicode **full** case folding for the caseless key
- **Resolves:** `docs/DECISIONS_NEEDED.md` D-013 · unblocks the full official import, `tasks/009-current-rank-truth-chain.md`'s passing path, and `RARITY_CONTEXT`
- **Does not change:** the Polish diacritic fold table (§6.1), NFC as the display and comparison basis (§5.2–§5.3), separator mapping (§5.4), or the mixed-script policy (§5.6)

## Context

`docs/canonical/13` §5.5 specifies Unicode **full** case folding for the caseless identity key, and TASK-003 implemented it exactly. Full folding is the mapping designed for caseless comparison, and it expands where it must: `ß` and `ẞ` both fold to the two characters `ss`.

The first attempt to import the full official PESEL resources failed:

```text
[import] FAILED (DUPLICATE_CANONICAL_KEY): two rows share canonical key "weiss": "WEISS" and "WEIẞ"
```

Measured over both resources at `data_date` 2026-01-20, with the real `canonicalKey` export rather than a reimplementation:

| | Male `1148808` | Female `1148811` |
|---|---:|---:|
| Distinct source surnames | 408,182 | 420,082 |
| Distinct `canonical_key_v1` keys | 408,130 | 419,963 |
| Colliding keys | **52** | **119** |

**171 collisions, every one of them the sharp S.** No collision arises from a diacritic, a separator, a script or whitespace: across 828,264 real surnames the rest of the identity model separates every pair. `WEISS`/`WEIẞ`, `GROSS`/`GROẞ`, `STRAUSS`/`STRAUẞ`, `HESS`/`HEẞ`, `VOSS`/`VOẞ`, `MEISSNER`/`MEIẞNER`, `BERGSTRÄSSER`/`BERGSTRÄẞER` are all listed separately by the publisher, with separate counts.

Merging them is not available. `ARCHITECTURE.md` §10 invariant 8 makes orthography identity-bearing — `Łuczak` and `Luczak` are never merged automatically — and the same reasoning governs `GROẞ` and `GROSS`. Relaxing the importer's `DUPLICATE_CANONICAL_KEY` failure is not available either: failing closed is what surfaced this at all, and skipping the rows would silently drop 171 real surnames and their counts.

So the register could not be ingested, and everything downstream of a complete universe — `CURRENT_RANK`'s passing path, `RARITY_CONTEXT`, any production surface — was blocked on a single Unicode mapping.

## Decision

**The canonical identity key folds with Unicode *simple* case folding.** The pipeline is otherwise unchanged:

```text
NFC → simple case fold → separator mapping → trim → collapse repeated spaces
```

The key version becomes `canonical_key_v2` (and with it `NORMALIZATION_VERSION`); `RESOLUTION_METHOD_VERSION` becomes `exact_resolver_v2`, since normalisation is part of the method a stored resolution replays.

Simple folding is one code point in, one code point out. `ẞ` folds to `ß`, never to `ss`, so `GROẞ` and `GROSS` are two surnames and `GROẞ`, `Groß` and `groß` remain one.

`packages/resolver/src/normalize.ts` implements it as per-code-point `toLowerCase()` with two corrections:

1. **Expansions are discarded.** `toLowerCase()` is a full lowercase mapping, so it can turn one code point into several — U+0130 `İ` becomes `i` + U+0307. Simple folding has no expansions, so the code point stands, which is also what Unicode does with U+0130: it has no simple-fold entry at all.
2. **Twenty-two letterform variants are folded explicitly**, because they are already lowercase and so `toLowerCase()` leaves them alone where folding does not: final sigma `ς`→`σ`, long s `ſ`→`s`, the Greek symbol letters, the micro sign, ypogegrammeni, nine Cyrillic historic letterforms, and `ẛ`. Without them the key would not be caseless — lowercasing a word-final capital sigma gives `ς`, so `ΣΟΦΟΣ` and `Σοφος` would take different keys.

The table was derived from the runtime's own folding data, not transcribed by hand: unicode.org is network-egress-blocked in this environment, so CaseFolding.txt could not be read. ECMAScript specifies that a `u`-mode case-insensitive `RegExp` canonicalises with simple case folding, which makes `/^X$/iu` an oracle for "do these two code points share a simple-fold class". `normalize.property.test.ts` re-derives the relation from that oracle across **every** code point and asserts both directions: the fold never joins two code points Unicode folds apart, and never separates two it folds together. Both hold, exhaustively.

## Why

- **It is the only option that makes the register ingestible while keeping distinct surnames distinct.** Re-measured after the change: `canonical_key_v2` produces 408,182 and 420,082 distinct keys — **zero collisions**, one key per source surname, across both resources.
- **The canonical text's own rationale points here.** §57.2 chose the full fold over an ASCII-folded key because "ASCII folding causes identity collisions". Full folding turns out to cause exactly that class of collision, on real data, for the same reason: it destroys a letter distinction the source relies on. This decision keeps §57.2's intent and corrects its mechanism.
- **The cost lands on the tier built to absorb it.** Someone typing `GROSS` will not reach `GROẞ` by exact match. That is correct for an identity tier — §5.2's key answers "is this the same name", not "what might the user have meant" — and `docs/canonical/13` T2 onward is where a `ß`≡`ss` orthographic equivalence belongs, alongside the Polish diacritic fold that already works this way.
- **It removes a compatibility mapping that never belonged in identity.** Full folding also merges `ﬁ` with `fi`, which is an NFKC-style compatibility decision smuggled into a key that §5.1 deliberately keeps at NFC. Simple folding leaves it where the canonical text put it: in search support.
- **It is contained and testable against a known list.** One normalisation step, one version bump, one re-key. The 171 affected surnames are all one linguistic pattern, so the change is verified against real strings rather than a guess.

## Consequences

- **`docs/canonical/13` §5.5 and §57.2 are not implemented verbatim.** A reader comparing code to canon will find the difference; this ADR is the reason. `normalize.ts` carries a pointer here.
- **Persisted keys must be recomputed.** `pnpm --filter @name-atlas/sources run rekey-keys` (also `pnpm db:rekey-keys`) recomputes `surnames.canonical_key` and `name_forms.search_key` from the display forms already stored, stamps the new version, and refuses to write anything if two rows would collide. It is not a migration: `packages/db` does not depend on the resolver, and reimplementing the fold in SQL is the duplication TASK-004 AC-10 forbids.
- **A stale row is dangerous precisely because it looks healthy.** `v1` and `v2` keys are identical for every surname without a multi-character folding, so an un-re-keyed database resolves correctly until it meets one of the 171. The re-key recomputes rather than pattern-matches for that reason.
- **Stored resolutions from before this change replay under `exact_resolver_v1`.** They are not rewritten; the version constant is what makes the difference visible.
- **`ß`≡`ss` becomes a retrieval requirement.** Whichever task builds the fuzzy tiers owes German orthographic equivalence as an explicit, versioned rule, the way §6.1 handles Polish diacritics. It is now absent from the exact tier by design rather than present by accident.
- **The Polish fold table is untouched.** `pl_diacritic_fold_v1` still names the same nine mappings; only the key it composes over changed.

## Do not revisit unless

- A source appears whose own identity model treats `ß` and `ss` as one surname — then that is a source-level rule in the connector, not a change to the global key; or
- `docs/canonical/13` §5.5 is itself revised, at which point this ADR should be reconciled with it rather than silently kept.

A preference for matching the canonical text's stated mechanism exactly, at the cost of 171 real surnames and an uningestible register, is **not** a reason to revisit this.
