# First-name meanings — which sources D-043 allows, and what they cover

Searched and measured on 2026-10-06 for the full-name report (TASK-124, ADR-0041), whose first-name chapter shows no meaning yet. D-043 allows a meaning only from a dictionary whose publisher gives **free** permission for short quotations with attribution, or from a work in the **public domain** (in Poland, 70 years after the author's death; art. 36). It rules out Wiktionary and any paid licence, and nothing may be guessed or written by the project. Nothing here is imported or shown. **D-046** asks the owner which path to take.

## 1. Result in one paragraph

No public-domain Polish dictionary of first names was found. Three public-domain works cover part of the lists:

- **Buryan 1933** gives the language of origin of about 120 names, and a meaning for a few.
- **Brückner 1927** has its own entries for some names, with a meaning for some of them.
- **Yonge 1884** gives a meaning, in English, for about 100 Polish forms.

Together they reach 48% of the people on the men's list and 34% on the women's, mostly as an origin. Common modern names have nothing in any of them: Krzysztof, Łukasz, Marek, Mariusz, Dariusz, Joanna, Aleksandra, Krystyna, Monika, Natalia, Julia, Teresa, Karolina and Danuta. Full coverage needs a modern dictionary, and so the free-permission route.

## 2. Public-domain candidates

| Work | Author died | What it gives for a first name | Text | Basis |
|---|---|---|---|---|
| ks. Józef Buryan, *Skąd pochodzi twoje imię i nazwisko…*, Warszawa 1933, chapter A "Imiona" (printed pp. 3–5) | 1950 | The language of origin, by group: Hebrew (Adam, Marja, Józef, Jan, Michał, Anna, Elżbieta, Ewa, Zuzanna, Magdalena, Marta, Jakób, Tadeusz, Maciej, Tomasz, Bartłomiej, Rafał, Gabrjel…), Greek, Latin, Germanic, Lithuanian (Olgierd), and Slavic two-stem names explained by their parts (-sław, -mir; *rać* "wojna", *bor* "walka"). A meaning for a few: Józef "tyle co Crescens", Feliks "Szczęsny", Laurencjusz "laur = Wawrzyn", Jadwiga "obie części oznaczają wojnę", Antoni "znaczenie nie ustalone". | Zielonogórska Biblioteka Cyfrowa edition 82526, SHA-256 `91d69b0e…c43c`, the copy `sources/onomastics/buryan-1933.json` already cites. The text layer is good, and 1933 spelling (Marja, Jakób) maps to today's (Maria, Jakub). | Public domain; already cleared for the surname chapters (`docs/sources/bruckner-buryan-package.md`, `sources/onomastics/README.md`). |
| Aleksander Brückner, *Słownik etymologiczny języka polskiego*, Kraków 1927 | 1939 | Entries for some names, mostly on the Polish form's history and diminutives, sometimes with a meaning. Read in the OCR: "Jadwiga, z niem. Hedwig (oba pnie … znaczą 'wojnę')"; "Małgorzata z Margaretha … greckie margarites, 'perła'"; "Andrzej (imię), lepiej spolszczony Jędrzej … z Andreas"; "Katarzyna, zdrobniałe Kasia…". Many other names (Piotr, Tomasz, Michał, Marcin, Stanisław, Wojciech) appear only in its index, which points to the entries where they are mentioned. | Internet Archive item `slownik_etymologiczny_jezyka_polskiego`, full-text file SHA-256 `1e94c893…f5f8` (2,959,031 bytes). The two-column OCR is badly scrambled, so entries would have to be transcribed from page images. Wielkopolska Biblioteka Cyfrowa holds a scan marked "domena publiczna". | Public domain (`docs/sources/bruckner-buryan-package.md`). |
| Charlotte M. Yonge, *History of Christian Names*, new edition, London 1884 | 1901 | An index with one line per form, for example "_Malgorzata_, _f._ _Pol._ Gr. pearl, 121": the form, sex, language, root language, meaning in English, and page. 150 Polish index lines parse this way. Some are 19th-century English renderings (AGNIZKA, ANDREZEJ), and 97 match a listed first name exactly. | Project Gutenberg eBook #70419 (released 2023-03-30), proofread by Distributed Proofreaders; plain text SHA-256 `20f0b2b1…c5aa`. | Public domain. The meaning is in English: showing it in the Polish report needs a translation, which D-043 may count as "written by the project" (D-046 §2). |
| Zygmunt Gloger, *Encyklopedia staropolska ilustrowana* (1900–1903), vol. II, entry "Imiona staro-polskie" | 1910 | A long entry, about 15,000 words, listing Old Polish names with their earliest documented dates. It explains roots (*lud*, *mił*, *mir*, *sław*, *mysł*), not each name's meaning. Not measured name by name. | Polish Wikisource transcription. The transcription's page carries CC BY-SA; the text itself is public domain. | Public domain. |

Not public domain, though often cited:
- Witold Taszycki, *Najdawniejsze polskie imiona osobowe* (1926): the author died in 1979.
- Jan Stanisław Bystroń, *Księga imion w Polsce używanych* (1938): the author died in 1964.

## 3. Coverage on the 2026-01-20 lists

The method:
- **The lists:** every first name stored from resources 1159669 and 1159670 (TASK-078, full files), forms held for review left out, ranked by count. Shares are of the people on each list.
- **Buryan:** a name counts when it appears as a word in chapter A, after mapping 1933 spelling (*-rj-* to *-ri-*, *Jakób* to *Jakub*).
- **Brückner:** a name counts when a line of the full text starts with the name and a comma or "(imię)". That catches some common words that are also listed names (BABA, DOM), so these figures are upper bounds.
- **Yonge:** a name counts when its form without diacritics equals a Polish index form of the same sex.

| | Men: top 20 | Men: top 100 | Men: people | Women: top 20 | Women: top 100 | Women: people |
|---|---:|---:|---:|---:|---:|---:|
| Buryan, origin | 12 | 30 | 35.3% | 9 | 14 | 24.7% |
| Brückner, own entry (upper bound) | 5 | 9 | 15.9% | 1 | 3 | 4.0% |
| Yonge, meaning in English | 7 | 22 | 25.7% | 3 | 7 | 10.0% |
| Brückner or Yonge (a meaning) | 10 | 25 | 32.8% | 4 | 9 | 13.1% |
| Any of the three | 15 | 42 | 48.1% | 11 | 21 | 33.5% |

These top-20 names have nothing in any of the three works:
- **Men:** Krzysztof, Łukasz, Marek, Mariusz, Dariusz.
- **Women:** Joanna, Aleksandra, Krystyna, Monika, Natalia, Julia, Teresa, Karolina, Danuta.

## 4. The free-permission route

Modern Polish first-name dictionaries cover every common name. Each is in copyright, so it is usable only if its publisher grants free permission (D-043). These were confirmed to exist:
- Jan Grzenia, *Nasze imiona* (Świat Książki, 2002), and *Nasze imiona. 200 najczęściej nadawanych imion polskich w XX wieku* (Nomen Omen, Katowice, 2010);
- Józef Bubak, *Księga naszych imion* (Ossolineum, 1993);
- Henryk Fros and Franciszek Sowa, *Twoje imię. Przewodnik onomastyczno-hagiograficzny* (Wydawnictwo Apostolstwa Modlitwy, Kraków, 1982);
- IJP PAN, *Słownik etymologiczno-motywacyjny staropolskich nazw osobowych* (1995–2002), on RCIN marked "Copyright-protected", usable "within the limits of statutory user freedoms" only.

Asking a publisher is the owner's act: it is outward-facing, and a permission must be in the owner's name.

## 5. Not verified

- Brückner's entries were read in the OCR only, not against page images, and his coverage figures are upper bounds.
- Gloger's entry was not measured name by name.
- No publisher was contacted.
