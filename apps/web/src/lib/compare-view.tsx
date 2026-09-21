import type { SurnameResultResponse } from "@name-atlas/contracts";
import { comparePopulation, compareRarity, rarerOf } from "./compare.js";
import type { NotComparable } from "./compare.js";
import { formatDate, formatInteger, htmlLang, partitionLabel, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { SearchForm } from "./search-form.js";
import { surnamePath } from "./slug.js";

/**
 * The comparison page (TASK-025, directive §24–§25).
 *
 * Two surnames side by side, and a figure compared **only** where scope, date
 * and denominator agree. Where they do not, the page says so and shows both
 * numbers without ranking them — which is the honest outcome, not a failure.
 *
 * The disclaimer is fixed and always rendered: a surname comparison says nothing
 * about ancestry, ethnicity or family relation, and the page must not let the
 * side-by-side layout imply otherwise.
 *
 * `noindex`: the metadata is set by the route. Comparison is a product feature,
 * and indexing surname pairs would be the programmatic explosion
 * `docs/canonical/21` §2.1 and the directive's §53 both rule out.
 */

export interface ComparisonSide {
  readonly slug: string;
  readonly display: string | null;
  readonly response: SurnameResultResponse | null;
}

function reasonWords(reason: NotComparable, lang: Lang): string {
  const words: Record<NotComparable, { pl: string; en: string }> = {
    DIFFERENT_PARTITION: {
      pl: "Te liczby pochodzą z różnych zbiorów i nie są bezpośrednio porównywalne.",
      en: "These figures come from different datasets and are not directly comparable.",
    },
    DIFFERENT_SNAPSHOT_DATE: {
      pl: "Te liczby dotyczą różnych dat i nie są bezpośrednio porównywalne.",
      en: "These figures are for different dates and are not directly comparable.",
    },
    DIFFERENT_DENOMINATOR: {
      pl: "Te wartości „1 na X” mają różne mianowniki i nie są bezpośrednio porównywalne.",
      en: "These 1-in-X figures have different denominators and are not directly comparable.",
    },
    MISSING_ON_ONE_SIDE: {
      pl: "Tej wartości nie ma dla jednego z nazwisk, więc nie ma czego porównywać.",
      en: "One of the surnames has no such figure, so there is nothing to compare.",
    },
  };
  return words[reason][lang];
}

function groupWords(group: string | null, lang: Lang): string {
  return partitionLabel(group, lang) ?? (lang === "pl" ? "zbiór" : "dataset");
}

/**
 * What an unresolved side may show for itself.
 *
 * The slug comes straight from the query string, so it is attacker-chosen.
 * React escapes it — there is no injection — but an unbounded string would
 * still render an enormous heading, so it is bounded here. Nothing else on the
 * page echoes a parameter.
 */
function displayFor(side: ComparisonSide): string {
  if (side.display !== null) return side.display;
  const slug = side.slug.trim();
  if (slug === "") return "—";
  return slug.length > 40 ? `${slug.slice(0, 40)}…` : slug;
}

export function ComparisonView({
  a,
  b,
  lang,
}: {
  a: ComparisonSide;
  b: ComparisonSide;
  lang: Lang;
}) {
  const t = UI[lang];
  const bothResolved = a.response !== null && b.response !== null;
  const populationPairs = bothResolved ? comparePopulation(a.response!, b.response!) : [];
  const rarityPairs = bothResolved ? compareRarity(a.response!, b.response!) : [];

  return (
    <>
      <main lang={htmlLang(lang)}>
        <div className="masthead">
          <h1>
            <a href={lang === "en" ? "/?lang=en" : "/"}>{t.title}</a>
          </h1>
        </div>
        <h2 className="surname compare-heading">
          {displayFor(a)}
          <span className="versus">{t.compareVersus}</span>
          {displayFor(b)}
        </h2>

        {/* Before any figure. The layout is the thing that could mislead, so the
            sentence that refuses the inference comes first. */}
        <p className="warning">{t.compareDisclaimer}</p>

        {!bothResolved ? (
          <section>
            <h3>{t.unresolvedHeading}</h3>
            <p className="absent">
              {[a, b]
                .filter((side) => side.response === null)
                .map((side) => displayFor(side))
                .join(", ")}
              {" — "}
              {t.slugUnknownBody}
            </p>
          </section>
        ) : (
          <>
            <section id="today-count">
              <h3>{t.sectionPopulation}</h3>
              {populationPairs.length === 0 ? (
                <p className="absent">{t.compareNothingToCompare}</p>
              ) : (
                populationPairs.map((pair, index) => (
                  <div className="compare-row" key={`${String(pair.group)}-${String(index)}`}>
                    <p className="compare-group">{groupWords(pair.group, lang)}</p>
                    {pair.comparable ? (
                      <>
                        <div
                          className="table-scroll"
                          tabIndex={0}
                          role="region"
                          aria-label={t.searchLabel}
                        >
                          <table>
                            <thead>
                              <tr>
                                <th scope="col">{t.searchLabel}</th>
                                <th scope="col">{t.countColumn}</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <th scope="row">{a.display}</th>
                                <td>
                                  {pair.a.value.value === null
                                    ? "—"
                                    : formatInteger(pair.a.value.value, lang)}
                                </td>
                              </tr>
                              <tr>
                                <th scope="row">{b.display}</th>
                                <td>
                                  {pair.b.value.value === null
                                    ? "—"
                                    : formatInteger(pair.b.value.value, lang)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <p className="note">
                          {t.snapshotLabel}: {formatDate(pair.a.snapshot_date, lang)}
                        </p>
                      </>
                    ) : (
                      <p className="absent">{reasonWords(pair.reason, lang)}</p>
                    )}
                  </div>
                ))
              )}
            </section>

            <section id="rarity">
              <h3>{t.sectionRarity}</h3>
              {rarityPairs.length === 0 ? (
                <p className="absent">{t.compareNothingToCompare}</p>
              ) : (
                rarityPairs.map((pair, index) => (
                  <div className="compare-row" key={`${String(pair.group)}-${String(index)}`}>
                    <p className="compare-group">{groupWords(pair.group, lang)}</p>
                    {pair.comparable ? (
                      <>
                        <div
                          className="table-scroll"
                          tabIndex={0}
                          role="region"
                          aria-label={t.searchLabel}
                        >
                          <table>
                            <thead>
                              <tr>
                                <th scope="col">{t.searchLabel}</th>
                                <th scope="col">{t.compareOneIn}</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <th scope="row">{a.display}</th>
                                <td>{formatInteger(pair.a.primary.value, lang)}</td>
                              </tr>
                              <tr>
                                <th scope="row">{b.display}</th>
                                <td>{formatInteger(pair.b.primary.value, lang)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <p className="note">{t.limitationRounded}</p>
                        <p className="note">
                          {(() => {
                            const rarer = rarerOf(pair);
                            if (rarer === null) return t.compareEqualRarity;
                            if (rarer === "TOO_CLOSE") return t.compareTooClose;
                            const name = rarer === "a" ? a.display : b.display;
                            return lang === "pl"
                              ? `${name ?? ""} jest rzadsze w tym zbiorze.`
                              : `${name ?? ""} is rarer in this dataset.`;
                          })()}
                        </p>
                      </>
                    ) : (
                      <p className="absent">{reasonWords(pair.reason, lang)}</p>
                    )}
                  </div>
                ))
              )}
            </section>
          </>
        )}

        <p className="again">
          {[a, b].map((side) => {
            const path = side.display === null ? null : surnamePath(side.display, lang);
            return path === null ? null : (
              <a key={side.slug} href={path}>
                {side.display}
              </a>
            );
          })}
        </p>
        <SearchForm lang={lang} query="" />
      </main>
      <footer lang={htmlLang(lang)}>{t.footer}</footer>
    </>
  );
}
