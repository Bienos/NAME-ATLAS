# 2026-10-04 — D-025 answered in full: the owner's tier set

Branch `claude/tier-answers`, on `origin/main` @ `71a0a70`.

## Changed

- `docs/DECISIONS_NEEDED.md`, D-025: the owner's answer "dna yes in 800 tier" recorded. §2 is answered: the 800 zł "genealogist research" tier replaces the 499 zł "Genealogia z DNA" tier, with DNA analysis in it, still "coming soon". §3 noted as half answered by D-034 (the tree is free with an account). Still open: which tier holds famous bearers and connecting trees, and §4 (one payment or recurring, who takes the 800 zł).
- `docs/DECISIONS_NEEDED.md`, D-025 §3: the owner's answer recorded: famous bearers free, connecting trees free, and a paid tier needed for matches beyond second cousins and for adding more people. Which paid tier, and the free tree's people limit, not yet set. D-034's note on free-tree limits points to it.
- `docs/DECISIONS_NEEDED.md`, D-025 §4: "once": every tier is a one-time payment for now. Who takes the 800 zł is still open.
- `docs/DECISIONS_NEEDED.md`, D-025: four answers through a multiple-choice prompt: free tree with a cap; the cap is 5 people; any paid tier unlocks more people and matches beyond second cousins; the 800 zł is paid to Name Atlas. D-025 marked answered, with the confirmed tier table. D-034's limits note updated.
- `STATUS.md`: the "Last rewritten" line and the D-025 line under the owner's decisions.

## Verified

- `pnpm check:ids`: passed ("every task, ADR, migration and decision number is used once")

## Not verified

- No code changed; lint, typecheck and tests were not run. The offer page is unchanged.
