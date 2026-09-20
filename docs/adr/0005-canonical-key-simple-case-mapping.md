# ADR-0005 — `canonical_key_v2` uses simple case mapping, not full case folding

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** project owner + D-013 resolution session
- **Supersedes:** the case step of `canonical_key_v1`, accepted with TASK-003
- **Deviates from:** `docs/canonical/13` §5.5, which names Unicode full case folding as the case step
- **Resolves:** `docs/DECISIONS_NEEDED.md` D-013 · unblocks the full-resource import, `CURRENT_RANK`'s passing path and `RARITY_CONTEXT`
- **Related, still open:** D-004 (regional adoption), D-007 (publisher licence)

## Context

`canonical_key_v1` applied Unicode **full** case folding. Full folding is defined to expand certain letters into several characters: `ẞ` (U+1E9E LATIN CAPITAL LETTER SHARP S) folds to `ss`, `ﬁ` folds to `fi`, final sigma folds to sigma.

The expansion is not a rounding error. It makes two different registered surnames produce one identity key:

| Surname | Surname | Shared `canonical_key_v1` |
|---|---|---|
| `WEIẞ` | `WEISS` | `weiss` |
| `GROẞ` | `GROSS` | `gross` |
| `GAUẞ` | `GAUSS` | `gauss` |
| `FUẞ` | `FUSS` | `fuss` |
| `BERGSTRÄẞER` | `BERGSTRÄSSER` | `bergsträsser` |

D-013 measured this over both full official PESEL resources: **171 colliding keys** in total, 52 male and 119 female, against 828,264 distinct source surnames. Every collision has this one cause. None arises from a diacritic, from whitespace or from a script issue, so the identity model is otherwise sound at production scale.

The consequence was not a wrong answer but no answer at all. The importer fails closed on a duplicate canonical key and writes nothing, so the production resource could not be ingested, and with it `CURRENT_RANK`'s passing path and `RARITY_CONTEXT` were blocked.

Merging the pairs was never an option. `ARCHITECTURE.md` §10 invariant 8 makes Polish diacritics identity-bearing and forbids merging `Łuczak` with `Luczak` automatically. The same principle governs `GROẞ` and `GROSS`: the publisher lists them separately, with separate counts, and a key that fuses them destroys 171 real surnames.

## Decision

The case step of the canonical identity key becomes Unicode **simple** case mapping, applied per code point. The key version becomes `canonical_key_v2`.

```text
canonical_key_v2 = NFC → simple case mapping → separator mapping → trim → collapse spaces
```

Only the case step changes. The order of the steps, the NFC at both ends and the separator tables are all unchanged, so every key containing no expanding code point is byte-identical between v1 and v2. On a database holding only Polish surnames, no key changes at all.

Three consequences are accepted deliberately:

1. **`GROSS` no longer reaches `GROẞ` by exact match.** This is correct for an identity tier. A spelling variant is the business of the retrieval tiers, `docs/canonical/13` T2 onward, and this moves the burden onto the tier designed to carry it.
2. **`RESOLUTION_METHOD_VERSION` bumps to `exact_resolver_v2`.** Normalisation is part of the method, so a resolution stored under v1 was produced by different rules and must not claim replayability under these.
3. **The fold is applied per code point, never to the whole string.** `String.prototype.toLowerCase` is context-sensitive — Greek `Σ` becomes final `ς` at the end of a word — and a key that depends on a letter's neighbours is not a deterministic function of the letter.

`fullCaseFold` stays exported and tested. It is what produced the v1 keys that migration `0006_canonical_key_v2` rewrites, and the regression test uses it to prove the defect was real rather than theoretical.

## Alternatives rejected

**Adjudicate each collision by hand.** No code change, faithful to the canonical text, and not viable: the full resource stays uningestible until 171 surnames are resolved individually, and every annual refresh adds more. This is what happens if nothing is decided, not a decision.

**Disambiguate the key with a suffix.** Preserves distinctness while keeping the fold, at the cost of a canonical key that is no longer a pure function of the surname text. Rejected because `docs/canonical/11` §20.1's deduplication story depends on the key being derivable from the name alone.

## Consequences

- `docs/canonical/13` §5.5 is **not** implemented verbatim. A reader comparing the code to the canonical text will find this difference; this ADR is the reason, and `normalize.ts` carries a pointer here.
- Migration `0006_canonical_key_v2` rewrites `surnames.canonical_key` and `name_forms.search_key` from the stored display text, and stamps both version columns. It carries its own frozen copy of the pipeline rather than importing the resolver, because a migration must mean the same thing when replayed after v3 exists.
- The migration computes and collision-checks every new key before writing one row, and aborts naming both display forms if two collide. v2 is expected to be strictly finer than v1, but expected is not checked.
- `down()` recomputes v1 keys and will therefore refuse on any database that has ingested a sharp-s pair. That refusal is correct: v1 cannot represent that data.
- The full official resource becomes ingestible. Whether it ingests cleanly is a separate, unrun verification — the source files are not present in the environment this ADR was written in.

## Do not revisit unless

- A surname pair is found that simple mapping merges and full folding separates, which would mean the refinement claim is wrong; or
- `docs/canonical/13` §5.5 is itself revised, at which point this ADR should be reconciled with it rather than silently kept.

A preference for matching the canonical text's named algorithm exactly, at the cost of 171 real surnames and an uningestible production resource, is **not** a reason to revisit this.
