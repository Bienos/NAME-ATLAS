# 2026-10-05 — the owner's answers on the full-name report (D-043)

## Changed

- `docs/DECISIONS_NEEDED.md`: D-043, resolved. The owner's six answers: paid; the smallest tier, "smaller research", 28,99 zł; meanings only from a dictionary publisher's free permission or the public domain; no Wiktionary; no paid licence; every name on the list.
- `docs/adr/0037-five-tiers.md`: the 28,99 zł row adds the full-name report "once it is built"; §2 says the offer page names it only once it exists.
- `docs/adr/0032-given-names.md`: its Deciders line points to D-043.
- `PRODUCT.md` §6: the 28,99 zł tier names the full-name report.
- `STATUS.md`: the full-name report line, and "Last rewritten".

No code, page or claim changes. The offer page is unchanged.

## Verification

- `pnpm format:check`, `pnpm check:ids`, `pnpm test`: exit 0, on `main` @ `cbc3e2d` with this change.

## Not decided

- Whether the 89,99, 199 and 800 zł tiers include the report.
- D-033 (an exact first name and surname count) stays open.
