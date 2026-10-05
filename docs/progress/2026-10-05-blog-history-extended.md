# 2026-10-05 — TASK-113: the history post gains the facts it was missing

Scope authority: `tasks/113-blog-history-extended.md`.

## What changed

- `apps/web/src/content/blog/skad-wziely-sie-nazwiska-w-polsce.pl.md` and `.en.md`. The existing text, title, description, date and image are unchanged. Added:
  - "Mieszczanie i chłopi" / "Townspeople and peasants": a paragraph on women's -owa, -ina, -ówna and -anka; the genealogist's note now names those forms.
  - "Rozbiory i akta stanu cywilnego" / "The partitions and civil registration": a paragraph on the Trent registers, and a list of the three Jewish surname laws.
  - "Nazwisko w prawie" / "Surnames in law": the 1945 decree before the 1956 act.
  - "PESEL": the central database from 1 July 1985.
  - One FAQ entry on -owa and -ówna in old registers (six in all).
  - Eight sources (17 in all).
- `STATUS.md`: the post's description on the blog line; the editorial line, which still named piece 5 as next (pieces 5 and 6 are live), now names piece 7; "Last rewritten".

## Claims and sources (opened and quoted on 2026-10-04; the PDFs were checked with `pdftotext`)

| Claim | Source |
|---|---|
| Trent, November 1563, registers; Polish diocesan synods until the end of the 1570s; the synod of Piotrków extended the duty to the Commonwealth (no year: sources disagree, 1607 in one) | Stachowska-Krzyżankowska 2015: "wprowadził dopiero sobór trydencki w listopadzie 1563 r."; "Synod piotrkowski, który rozciągnął obowiązek … na całą Rzeczpospolitą" |
| Among Jews, inheriting a surname was not common until the end of the 18th century | Dacewicz 2014, p. 286: "w tej grupie etnicznej do końca XVIII w. zwyczaj dziedziczenia nazwiska nie był powszechny" |
| Austria 1787, Joseph II's patents | Koper 2023: "obowiązywało od 1787 roku … patentów przez cesarza Józefa II" |
| Within two years | Gulczyński 2005: "w 1787 r. zobowiązano Żydów do przyjęcia w okresie dwóch lat stałego nazwiska" |
| 17 April 1797, South and New East Prussia | Gulczyński 2005: "Statut generalny dla Żydów w Prusach Południowych i Prusach Nowowschodnich z 17 kwietnia 1797. W § 12 zobowiązano Żydów do przybrania nazwisk" |
| Kingdom of Poland, March 1821, six months, unchanged | Kirszrot 1917, pp. 223–224 ("marca 1821 r. … w przeciągu sześciu miesięcy … swoje imię i nazwisko … nadal nieodmiennie używać"; the day is unreadable in the scan) |
| -owa, -ina, -ówna, -anka in Pisarzowa's 19th-century registers; wife or daughter; -owa and -ina falling out of use in dialects | M. Kowalska 2013 ("formanty (sufiksy): -anka/-onka, -owna, -owa, -ina, -ka"; "Mogła oznaczać zarówno żonę, jak i córkę"; "mogą tworzyć zarówno nazwy żon, jak i córek"; "We współczesnych dialektach dysfunkcyjne są m.in. sufiksy -owa i -ina/-yna") |
| Decree of 10 November 1945 on changing and establishing first names and surnames, Dz.U. 1945 nr 56 poz. 310 | api.sejm.gov.pl ELI record DU/1945/310; `https://eli.gov.pl/eli/DU/1945/310/ogl` answered 200 on 2026-10-05 |
| Central PESEL database, 1 July 1985 | COI, "Jak SRP rozwinął się przez 10 lat?" (August 2025): "1 lipca 1985 roku wdrożono do eksploatacji centralną bazę danych CBD PESEL" |

## Verification (run in this session, on `main` @ `71810db`)

- `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test`, `pnpm build`: all exit 0; `blog: 22 posts checked, 22 with a feature image`.
- `next start` over the build: both versions answer 200 and contain the new facts. Each source file has six FAQ entries and 17 sources (16 when the pages were served; Dacewicz was added after, and the blog check and format were rerun). All 44 internal links in the two pages answered 200.

## Not verified

- CI on GitHub (Actions starts no jobs since 2026-10-04 evening).
