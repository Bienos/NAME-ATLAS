# 2026-10-06 — TASK-135: the blog's twelfth post, surnames from place names

**Task:** `tasks/135-blog-post-toponymic-surnames.md`. **Requested by:** the project owner, "Do the blog post" (2026-10-06). **Plan:** `docs/SEO_CONTENT_PLAN.md` §4 piece 7. **Number:** 135: first taken as 134, which #163 merged into `main` while this task was in progress. Built on `main` @ `5103371`, then moved onto `9a78026`.

## What changed

- `apps/web/src/content/blog/nazwiska-odmiejscowe.pl.md` and `.en.md` (new): "Nazwiska odmiejscowe: kiedy nazwisko naprawdę pochodzi od miejsca?" / "Polish surnames from place names: when does a surname really come from a place?", dated 2026-10-06. Sections: what a surname from a place name is; its forms (-ski/-cki/-dzki, -ak, from peoples and regions); when a -ski surname is not from a place (Lewandowski, Jakubowski); one surname, many places; what it says about a family; how to check, and what Name Atlas shows; six FAQ entries; sources. Links to `koncowki-nazwisk`, `czy-to-samo-nazwisko-to-rodzina`, `jak-szukac-przodkow`, `skad-wziely-sie-nazwiska-w-polsce` and `mapa-nazwiska-a-mapa-rodziny`. No register figure.
- `apps/web/scripts/build-blog-images.ts`: the scene `odmiejscowe` (seed 134): clusters of lights on the dusk ground and thin threads from one bright point to several of them, none picked out; no map, text or face. `apps/web/public/images/blog/nazwiska-odmiejscowe.webp` (new, 1600 × 840, 12,856 bytes) and its row in that folder's `README.md`.
- `docs/SEO_CONTENT_PLAN.md` §4 piece 7: live. `STATUS.md`: the blog line, the "Search and editorial content" line, "Last rewritten". `tasks/135-blog-post-toponymic-surnames.md` (new).

No change to code outside the image script, to tests, routes or any other post.

## Claims and where they were read (2026-10-06)

IJP PAN, *Internetowy słownik nazwisk w Polsce* (version 2.0), nazwiska.ijppan.pl:

- "O słowniku": surnames from place names are "głównie uważane za tak charakterystyczne dla polszczyzny nazwiska z sufiksem -ski"; identically sounding surnames arose at different times with different motivations. The labels *odmiejscowe* and *odetniczne* are the entries' own.
- DĄBROWSKI: from Dąbrowa, "ok. 100 miejscowości w całej Polsce", or Dąbrówka, "ok. 90 miejscowości".
- WIŚNIEWSKI: Wiśniewa; Wiszniowa, today Wiśniowa; Wiśniewo (three places listed); Wiśniów; Wisznia Sądowa and Wisznia Bieńkowa, "dziś na Ukrainie".
- KOWALEWSKI: Kowalewo (several places in different voivodeships), Kowalewice, Kowalewskie; or Kowal-ewski from Kowale.
- KRAKOWSKI: from Kraków, or Krakow, "n. m. na Łużycach, dziś nieistniejąca".
- KRAKOWIAK: from the common noun *krakowiak*, "nazwa rośliny, pelargonia", or from Kraków.
- JAKUBOWSKI: from Jakubowice, Jakubowo, Jakubów, "liczne w Polsce", or Jakub-owski from the first name Jakub, "z suf. -owski w funkcji strukturalnej lub patronimicznej".
- LEWANDOWSKI: from the personal name Lewanda, Lawenda (: *lawenda*, the plant), "z suf. -owski w funkcji strukturalnej".
- LITWIN: odetniczne, "mężczyzna rodem z Litwy". ŚLĘZAK: from *Ślązak*, old *Szlązak*, *Ślęzak*, "z Śląska rodowity". MAZUR: from the common noun *mazur*, or from the ethnic name, "człowiek pochodzący z północnego Mazowsza", "przybysz z Mazowsza albo z Małopolski".
- The suffix -ski "wskazywał pierwotnie na pochodzenie z danej miejscowości lub jej posiadanie" (KOWALEWSKI, JAKUBOWSKI, KRAKOWSKI, WIŚNIEWSKI).

Ewa Wolnicz-Pawłowska, *Prace Językoznawcze* 1 (1999), the PDF on bazhum.muzhp.pl, text extracted with `pdftotext`:

- p. 131: "Nawój cornes [comes] de Morawica" becoming "Nawój Morawica albo Nawój Morawicki"; the group "mówiące o pochodzeniu z danej wsi lub posiadaniu danego majątku (wsi), są to tzw. nazwiska odmiejscowe i etniczne, np. Baranowski ‘z Baranowa’, Węgrzyn, Niemiec, Szot, Grek", and the other groups.
- p. 132: from the second half of the fifteenth century the nobility used mainly surnames "odmiejscowych (od posiadanych włości, wsi czy miast, np. Zamojscy, Koniecpolscy, Tarnowscy)"; in the sixteenth century the -ski model was copied; the *Liber chamorum* quotation "najwięcej od imion sobie przezwiska chłopscy synowie biorą" with Jakubowskich, Piotrowskich; "Ćwikliński nazwał się Jędrzej Ćwikły, chłopa syn w Czechowie w sendomirskiej ziemi [...] brat jego Czechowskim nazwał się" (pp. 132-133).
- p. 133: "Autor wymienia ponad 2500 takich przykładów"; "liczne nazwiska współczesne na -ski, dla których nie sposób znaleźć motywacji odmiejscowej"; "nazwisk modelowych czy wzorcowych".
- p. 134: Lewandowski is among the -ski surnames not recorded in the SSNO; "da się znaleźć nazwy miejscowe, które mogłyby motywować te nazwiska", but they may be "struktury wzorcowe".

Ewa Nowak-Pasterska, *Poznańskie Studia Polonistyczne. Seria Językoznawcza* 21(1), 2014, the PDF from pressto.amu.edu.pl:

- p. 190: surnames from place names are the second-largest group (34%) of the Polish surnames studied; Lewandowski is among the examples, with footnote 9 on its "niejednoznacznej etymologii" (citing K. Skowronek, *Onomastica* 45, 2000, which was not read).
- p. 191: they occur "trzykrotnie częściej w wieku XVIII (135 form) aniżeli w wieku XVII (45 form)".

Name Atlas, `apps/web/src/lib/messages.ts` on `main` @ `5103371`: the meaning chapter ("Znaczenie podajemy tylko wtedy, gdy stoi za nim opracowanie naukowe. Nie zgadujemy.", `meaningNoSource`); the localities chapter's title "Które miejscowości tak się nazywają?" / "Which localities have this name?", its lede (TERYT, the same name as the surname) and `placesNote` (a shared name, not an origin). The map's "zameldowane" wording follows `mapa-nazwiska-a-mapa-rodziny`.

## Verification

Run on 2026-10-06 in this container, after the last edit:

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids` — exit 0.
- `pnpm test` — exit 0; the web suite 952 tests on `5103371`, and 956 after moving onto `main` @ `9a78026` (where `pnpm check:ids`, `typecheck`, `lint`, `format:check` and the blog check were run again, all clean).
- `pnpm build` — exit 0 on `5103371`; `blog: 24 posts checked, 24 with a feature image`. Not rebuilt after the move; the two commits it brought in (#159, #163) touch no blog file.
- `pnpm exec tsx apps/web/scripts/build-blog-images.ts`, twice: the eleven earlier images byte-identical to `main` (SHA-256 compared), the new one identical on the second run (`9675f9d6…ddf8`).
- `SITE_ORIGIN=https://name-atlas.pl next start -p 3100` and `curl`: both posts 200 with their title, canonical address, `og:image` and the `pl`/`en` alternates; each has its FAQ and sources sections and one search form; all 14 source links render; every `/{lang}/blog/…` link on each page answers 200; both indexes list 12 posts; the image answers 200 as `image/webp`.


## Not verified

- K. Skowronek's article on Lewandowski (*Onomastica* 45, 2000) was not read; the post cites only Nowak-Pasterska's note that the etymology is unclear.
- Z. Kaleta's *Odmiejscowe nazwy osobowe* (1997), which the dictionary cites as NOdm, was not read; nothing in the post rests on it.
- The post in production: not deployed from this branch.
