# ADR-0005 — `canonical_key_v2` folds with Unicode **simple** case folding

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** project owner (chose Option A on D-013) + the two D-013 resolution sessions
- **Supersedes:** the case step of `canonical_key_v1`, accepted with TASK-003
- **Deviates from:** `docs/canonical/13` §5.5 and §57.2, which name Unicode **full** case folding as the case step
- **Resolves:** `docs/DECISIONS_NEEDED.md` D-013 · unblocks the full-resource import, `tasks/009-current-rank-truth-chain.md`'s passing path, and `RARITY_CONTEXT`
- **Does not change:** the Polish diacritic fold table (§6.1), NFC as the display and comparison basis (§5.2–§5.3), separator mapping (§5.4), or the mixed-script policy (§5.6)
- **Related, still open:** D-004 (regional adoption), D-007 (publisher licence)

## Context

`canonical_key_v1` applied Unicode **full** case folding, exactly as `docs/canonical/13` §5.5 specifies. Full folding is defined to expand certain letters into several characters: `ẞ` (U+1E9E LATIN CAPITAL LETTER SHARP S) folds to `ss`, and `ﬁ` folds to `fi`.

The expansion is not a rounding error. It makes two different registered surnames produce one identity key:

| Surname | Surname | Shared `canonical_key_v1` |
|---|---|---|
| `WEIẞ` | `WEISS` | `weiss` |
| `GROẞ` | `GROSS` | `gross` |
| `GAUẞ` | `GAUSS` | `gauss` |
| `FUẞ` | `FUSS` | `fuss` |
| `BERGSTRÄẞER` | `BERGSTRÄSSER` | `bergsträsser` |

Measured over both full official PESEL resources at `data_date` 2026-01-20, with the real `canonicalKey` export rather than a reimplementation:

| | Male `1148808` | Female `1148811` |
|---|---:|---:|
| Distinct source surnames | 408,182 | 420,082 |
| Distinct `canonical_key_v1` keys | 408,130 | 419,963 |
| Colliding keys | **52** | **119** |

**171 collisions, every one of them the sharp S.** No collision arises from a diacritic, a separator, a script or whitespace: across 828,264 real surnames the rest of the identity model separates every pair.

The consequence was not a wrong answer but no answer at all. The importer fails closed on a duplicate canonical key and writes nothing:

```text
[import] FAILED (DUPLICATE_CANONICAL_KEY): two rows share canonical key "weiss": "WEISS" and "WEIẞ"
```

So the register could not be ingested, and everything downstream of a complete universe — `CURRENT_RANK`'s passing path, `RARITY_CONTEXT`, any production surface — was blocked on a single Unicode mapping.

Merging the pairs was never an option. `ARCHITECTURE.md` §10 invariant 8 makes orthography identity-bearing and forbids merging `Łuczak` with `Luczak` automatically; the same principle governs `GROẞ` and `GROSS`. The publisher lists them separately, with separate counts, and a key that fuses them destroys 171 real surnames. Relaxing the importer's refusal was not an option either: failing closed is what surfaced this at all.

## Decision

**The case step of the canonical identity key becomes Unicode *simple* case folding, applied per code point.** The key version becomes `canonical_key_v2`.

```text
canonical_key_v2 = NFC → simple case fold → separator mapping → trim → collapse spaces
```

Only the case step changes. The order of the steps, the NFC at both ends and the separator tables are unchanged, so every key containing no code point the two folds treat differently is byte-identical between v1 and v2. On a database holding only Polish surnames, no key changes at all.

Simple folding is one code point in, one code point out. `ẞ` folds to `ß`, never to `ss`, so `GROẞ` and `GROSS` are two surnames and `GROẞ`, `Groß` and `groß` remain one.

`packages/resolver/src/normalize.ts` implements it as per-code-point `toLowerCase()` with two corrections:

1. **Expansions are discarded.** `toLowerCase()` is a full lowercase mapping, so it can turn one code point into several — U+0130 `İ` becomes `i` + U+0307. Simple folding has no expansions, so the code point stands, which is also what Unicode does with U+0130: it has no simple-fold entry at all.
2. **Twenty-two letterform variants are folded explicitly**, because they are already lowercase and so `toLowerCase()` leaves them alone where folding does not: final sigma `ς`→`σ`, long s `ſ`→`s`, the Greek symbol letters, the micro sign, ypogegrammeni, nine Cyrillic historic letterforms, and `ẛ`. Applying the fold per code point removes the *context* sensitivity of `String.prototype.toLowerCase` — per code point, `Σ` is always `σ` — but that alone does not make the key caseless, because a surname written in ordinary Greek case carries `ς` in final position. Without the table, `ΣΟΦΟΣ` and `Σοφος` would take different keys.

The table was derived from the runtime's own folding data, not transcribed by hand: unicode.org is network-egress-blocked in this environment, so CaseFolding.txt could not be read. ECMAScript specifies that a `u`-mode case-insensitive `RegExp` canonicalises with simple case folding, which makes `/^X$/iu` an oracle for "do these two code points share a simple-fold class". `normalize.property.test.ts` re-derives the relation from that oracle across **every** code point and asserts both directions: the fold never joins two code points Unicode folds apart, and never separates two it folds together. Both hold, exhaustively.

Three consequences are accepted deliberately:

1. **`GROSS` no longer reaches `GROẞ` by exact match.** This is correct for an identity tier — §5.2's key answers "is this the same name", not "what might the user have meant" — and it moves the burden onto the retrieval tiers, `docs/canonical/13` T2 onward, which is the tier designed to carry it.
2. **`RESOLUTION_METHOD_VERSION` bumps to `exact_resolver_v2`.** Normalisation is part of the method, so a resolution stored under v1 was produced by different rules and must not claim replayability under these.
3. **`fullCaseFold` stays exported and tested.** It is what produced the v1 keys that migration `0006_canonical_key_v2` rewrites, and the regression test uses it to prove the defect was real rather than theoretical.

## Why

- **It is the only option that makes the register ingestible while keeping distinct surnames distinct.** Re-measured after the change with the real export: `canonical_key_v2` produces 408,182 and 420,082 distinct keys — **zero collisions**, one key per source surname, across both resources.
- **The canonical text's own rationale points here.** §57.2 chose the full fold over an ASCII-folded key because "ASCII folding causes identity collisions". Full folding turns out to cause exactly that class of collision, on real data, for the same reason: it destroys a letter distinction the source relies on. This keeps §57.2's intent and corrects its mechanism.
- **It removes a compatibility mapping that never belonged in identity.** Full folding also merges `ﬁ` with `fi`, which is an NFKC-style compatibility decision smuggled into a key that §5.1 deliberately keeps at NFC. Simple folding leaves it where the canonical text put it: in search support.
- **It is contained and testable against a known list.** One normalisation step, one version bump, one re-key. The 171 affected surnames are all one linguistic pattern, so the change is verified against real strings rather than a guess.

## Alternatives rejected

**Adjudicate each collision by hand.** No code change, faithful to the canonical text, and not viable: the full resource stays uningestible until 171 surnames are resolved individually, and every annual refresh adds more. This is what happens if nothing is decided, not a decision.

**Disambiguate the key with a suffix.** Preserves distinctness while keeping the fold, at the cost of a canonical key that is no longer a pure function of the surname text. Rejected because `docs/canonical/11` §20.1's deduplication story depends on the key being derivable from the name alone.

## Consequences

- `docs/canonical/13` §5.5 and §57.2 are **not** implemented verbatim. A reader comparing the code to the canonical text will find this difference; this ADR is the reason, and `normalize.ts` carries a pointer here.
- **Migration `0006_canonical_key_v2` rewrites `surnames.canonical_key` and `name_forms.search_key` from the stored display text**, and stamps both version columns. It carries its own frozen copy of the pipeline rather than importing the resolver, because a migration must mean the same thing when replayed after v3 exists; `migrator.test.ts` pins that the copy agrees with the live function today.
- **Recomputing is not optional, and pattern-matching would not do.** A v1 key cannot be inverted — `gross` could have come from `GROSS` or from `GROẞ` — and a stale row is dangerous precisely because it looks healthy: v1 and v2 keys are identical for every surname without an affected code point, so an un-migrated database resolves correctly until it meets one of the 171.
- The migration computes and collision-checks every new key before writing one row, and aborts naming both display forms if two collide. v2 is expected to be strictly finer than v1, but expected is not checked.
- `down()` recomputes v1 keys and will therefore refuse on any database that has ingested a sharp-s pair. That refusal is correct: v1 cannot represent that data.
- **Stored resolutions from before this change replay under `exact_resolver_v1`.** They are not rewritten; the version constant is what makes the difference visible.
- **`ß`≡`ss` becomes a retrieval requirement.** Whichever task builds the fuzzy tiers owes German orthographic equivalence as an explicit, versioned rule, the way §6.1 handles Polish diacritics. It is now absent from the exact tier by design rather than present by accident.
- **The Polish fold table is untouched.** `pl_diacritic_fold_v1` still names the same nine mappings; only the key it composes over changed.

## Do not revisit unless

- A surname pair is found that simple folding merges and full folding separates, which would mean the refinement claim is wrong; or
- A source appears whose own identity model treats `ß` and `ss` as one surname — then that is a source-level rule in the connector, not a change to the global key; or
- `docs/canonical/13` §5.5 is itself revised, at which point this ADR should be reconciled with it rather than silently kept.

A preference for matching the canonical text's named algorithm exactly, at the cost of 171 real surnames and an uningestible production resource, is **not** a reason to revisit this.
