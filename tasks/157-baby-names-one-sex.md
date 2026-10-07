# TASK-157 — The baby-names page shows only the sexes a name is on

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-baby-names-one-sex.md`).
- **Requested by:** the project owner, 2026-10-07, in a Claude Code session, looking at ZOFIA on the live page: "dlaczego jak jest zofia to pokazuje chłopaków proszę odróżnić imię męskie od żeńskich i nie dawaj opisów takich" ("why does Zofia show the boys; please tell male names from female ones and don't give such descriptions").
- **Decision:** none new. D-044 (lists never mixed, an absence is below the cut-off and never 0) and ADR-0042 stand; nothing in them requires a sex the name is not on to be shown.
- **Numbers:** TASK 157. `main` holds TASK-154 (#186, `461f024`). Open #185 and #187 are both titled TASK-154. At 08:22 UTC a sibling session's message gave 155 to #185, 156 to #187, 157 to this change and 158 to its own child session, so this change moved from 155 to 157 before its pull request. No ADR, no migration, no D- number.
- **Model guidance:** implementation session.

## 1. Goal

A girls' name shows the girls and a boys' name the boys. ZOFIA's page no longer has a "Chłopcy" tab, a boys' section with "W 2025 r. nadano je mniej niż 2 razy…" and the register's "Nie mamy liczby…" line, the two-lists note, or, in the paid view, "Nie ma go na żadnej liście chłopców od 2000 r.".

## 2. Facts (2026-10-07)

1. Since TASK-141 the single-name page renders both sexes for every name found: tabs, a section per sex, the paid history per sex (`apps/web/src/lib/baby-names-page.tsx`).
2. The committed official files have stray records: IGOR is on the girls' 2020 list (2 girls; 2 982 boys) and on no 2025 girls' list. No name is on both 2025 lists. So "on any list of that sex" alone would still show a girls' section for IGOR.
3. The reader (`assembleBirthNameFacts`) holds every count claim of the name on every stored list, whether or not the history is asked for.

## 3. In scope

1. **Truth:** `BirthSexFigures.on_any_list`: true when a count claim stands for the name on at least one stored list of that sex, any year. False is never read as 0.
2. **The page:** the sexes shown are those with a count on their latest list. When neither has one, the page shows the sexes whose lists hold the name in some year. A name on no birth list shows the sexes the register lists it for, or both when it lists neither. The focus is chosen among the shown sexes, so `?sex=boys` on ZOFIA shows the girls. With one sex shown, the page has no tabs and no two-lists note ("Chłopcy i dziewczynki są na osobnych listach…"), and the section takes the full width from 900 px.
3. **Tests:** truth, page (ZOFIA, a stray earlier record, a name on both latest lists, a name on neither), integration on the committed fixtures (ZOFIA, IGOR, KASANDRA).

## 4. Out of scope

The share sheet and cards (they already refuse a sex without figures); the list page; any copy change; removing the register note ("Liczby z roku to dzieci urodzone…") or other notes shown for the name's own sex; a share threshold for minor-sex records on the latest list.

## 5. Not decided

Whether "nie dawaj opisów takich" also means the notes kept on every page (the register note, the trend's basis). This change removes the descriptions about a sex the name is not on.

## 6. Acceptance criteria

- **AC-1:** ZOFIA, free and paid, in both languages: no boys' section, tab, cut-off line, men's register figure, two-lists note or "on no boys' list" line.
- **AC-2:** a name on both latest lists shows both sexes, the tabs and the two-lists note; a name on neither shows the sexes whose lists hold it, each with its cut-off line, never 0.
- **AC-3:** nothing is summed across sexes; nothing reads 0 where data is absent.

## 7. Verification

`pnpm format:check`, `check:ids`, `typecheck`, `lint`, `test`, `test:integration` (where a local database can be built), `build`.
