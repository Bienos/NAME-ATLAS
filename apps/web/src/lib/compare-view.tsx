import { slugFor } from "@name-atlas/seo";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { compareDistribution, comparePopulation, compareRarity, rarerOf } from "./compare.js";
import type { NotComparable } from "./compare.js";
import {
  Chapter,
  DistributionMaps,
  FigureBars,
  FullNamesCard,
  NamePlates,
  OddsFigures,
} from "./compare-figures.js";
import { COMPARE_EXAMPLES, COMPARE_TEXT } from "./compare-text.js";
import { formatDate, formatInteger, partitionLabel, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { ReportLink } from "./report-link.js";
import { anchorOf } from "./sections.js";
import { SiteShell } from "./site-shell.js";
import { comparisonPath } from "./compare-request.js";

/**
 * The comparison page (TASK-025, directive §24–§25; redesigned by TASK-155).
 *
 * Two surnames side by side, and a figure compared **only** where scope, date
 * and denominator agree. Where they do not, the page says so and draws nothing
 * for that partition — which is the honest outcome, not a failure.
 *
 * The page reads as one spread: the two names as plates with the mark between
 * them, the disclaimer, then numbered chapters. A count is drawn as two bars on
 * one scale; a rarity as two "1 in X" figures (a bar would draw the rarer
 * surname as the longer one); the regions as two maps on one scale.
 *
 * The disclaimer is fixed and always rendered before any figure: a surname
 * comparison says nothing about ancestry, ethnicity or family relation, and the
 * page must not let the side-by-side layout imply otherwise.
 *
 * `noindex`: the metadata is set by the route. Comparison is a product feature,
 * and indexing surname pairs would be the programmatic explosion
 * `docs/canonical/21` §2.1 and the directive's §53 both rule out.
 */

/** The picker's address and words, for a page other than the comparison. */
export interface PickerCopy {
  readonly action: string;
  readonly otherPath: string;
  readonly heading: string;
  readonly intro: string;
  readonly submit: string;
}

export interface ComparisonSide {
  readonly slug: string;
  readonly display: string | null;
  readonly response: SurnameResultResponse | null;
  /** The surname's stored address in the page's language, when it has one. */
  readonly path: string | null;
}

export function reasonWords(reason: NotComparable, lang: Lang): string {
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

export function groupWords(group: string | null, lang: Lang): string {
  return partitionLabel(group, lang) ?? (lang === "pl" ? "zbiór" : "dataset");
}

/**
 * The same comparison in the other language, for the masthead's switch.
 *
 * It carries the slugs exactly as the reader gave them, so the other page
 * resolves them the same way; they are URL-encoded because they come straight
 * from the query string.
 */
export function comparePath(a: string, b: string, lang: Lang): string {
  return comparisonPath(a, b, lang);
}

/**
 * What an unresolved side may show for itself.
 *
 * The slug comes straight from the query string, so it is attacker-chosen.
 * React escapes it — there is no injection — but an unbounded string would
 * still render an enormous heading, so it is bounded here. Nothing else on the
 * page echoes a parameter as text; the language switch carries both slugs
 * only URL-encoded, behind a fixed path (`comparePath`).
 */
export function displayFor(side: ComparisonSide): string {
  if (side.display !== null) return side.display;
  const slug = side.slug.trim();
  if (slug === "") return "—";
  return slug.length > 40 ? `${slug.slice(0, 40)}…` : slug;
}

export function ComparisonView({
  a,
  b,
  lang,
  origin = null,
  fullNamesHref = null,
}: {
  a: ComparisonSide;
  b: ComparisonSide;
  lang: Lang;
  /** `SITE_ORIGIN`, for the report link's absolute address; else the path alone. */
  origin?: string | null;
  /** The full-name comparison's address, only while that page exists (D-049). */
  fullNamesHref?: string | null;
}) {
  const t = UI[lang];
  const c = COMPARE_TEXT[lang];
  const bothResolved = a.response !== null && b.response !== null;
  const populationPairs = bothResolved ? comparePopulation(a.response!, b.response!) : [];
  const rarityPairs = bothResolved ? compareRarity(a.response!, b.response!) : [];
  const distributionPairs = bothResolved ? compareDistribution(a.response!, b.response!) : [];
  const names = [displayFor(a), displayFor(b)];

  return (
    // `compare` widens the canvas on desktop so the two sides sit side by side.
    <SiteShell
      lang={lang}
      otherPath={comparePath(a.slug, b.slug, lang === "pl" ? "en" : "pl")}
      world={{ mode: "quiet" }}
      current="compare"
      search={{ query: "" }}
      mainClassName="compare cmp atlas-v1"
    >
      <header className="cmp-head">
        <p className="cmp-eyebrow">{c.eyebrow}</p>
        <NamePlates
          names={names.map((name, i) => ({ key: String(i), lines: [name] }))}
          lang={lang}
        />
      </header>

      {/* Before any figure. The layout is the thing that could mislead, so the
            sentence that refuses the inference comes first. */}
      <p className="warning cmp-disclaimer">{t.compareDisclaimer}</p>

      {!bothResolved ? (
        <section className="cmp-chapter">
          <h2>{t.unresolvedHeading}</h2>
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
          <Chapter id={anchorOf("count")} n={1} title={t.sectionPopulation} lang={lang}>
            {populationPairs.length === 0 ? (
              <p className="absent">{t.compareNothingToCompare}</p>
            ) : (
              <div className="cmp-panels">
                {populationPairs.map((pair, index) => (
                  <div
                    className="compare-row cmp-panel"
                    key={`${String(pair.group)}-${String(index)}`}
                  >
                    <p className="compare-group">{groupWords(pair.group, lang)}</p>
                    {pair.comparable ? (
                      <>
                        <FigureBars
                          label={`${t.sectionPopulation}: ${groupWords(pair.group, lang)}`}
                          rows={[pair.a, pair.b].map((obs, i) => ({
                            key: String(i),
                            side: i,
                            name: names[i] ?? "",
                            value: obs.value.value,
                            text:
                              obs.value.value === null ? "—" : formatInteger(obs.value.value, lang),
                          }))}
                        />
                        <p className="note">
                          {t.snapshotLabel}: {formatDate(pair.a.snapshot_date, lang)}
                        </p>
                      </>
                    ) : (
                      <p className="absent">{reasonWords(pair.reason, lang)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Chapter>

          <Chapter id={anchorOf("rarity")} n={2} title={t.sectionRarity} lang={lang}>
            {rarityPairs.length === 0 ? (
              <p className="absent">{t.compareNothingToCompare}</p>
            ) : (
              <div className="cmp-panels">
                {rarityPairs.map((pair, index) => (
                  <div
                    className="compare-row cmp-panel"
                    key={`${String(pair.group)}-${String(index)}`}
                  >
                    <p className="compare-group">{groupWords(pair.group, lang)}</p>
                    {pair.comparable ? (
                      <>
                        <OddsFigures
                          lang={lang}
                          rows={[pair.a, pair.b].map((entry, i) => ({
                            key: String(i),
                            side: i,
                            name: names[i] ?? "",
                            value: formatInteger(entry.primary.value, lang),
                          }))}
                        />
                        <p className="cmp-verdict">
                          {(() => {
                            const rarer = rarerOf(pair);
                            if (rarer === null) return t.compareEqualRarity;
                            if (rarer === "TOO_CLOSE") return t.compareTooClose;
                            return c.rarerVerdict(rarer === "a" ? names[0]! : names[1]!);
                          })()}
                        </p>
                        <p className="note">{t.limitationRounded}</p>
                      </>
                    ) : (
                      <p className="absent">{reasonWords(pair.reason, lang)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Chapter>

          <Chapter id={anchorOf("map")} n={3} title={t.sectionDistribution} lang={lang}>
            {distributionPairs.length === 0 ? (
              <p className="absent">{t.compareNothingToCompare}</p>
            ) : (
              distributionPairs.map((pair, index) => (
                <div className="compare-row" key={`${String(pair.group)}-${String(index)}`}>
                  <p className="compare-group">{groupWords(pair.group, lang)}</p>
                  {pair.comparable ? (
                    <DistributionMaps
                      sides={[
                        { name: a.display ?? "", side: 0, entry: pair.a },
                        { name: b.display ?? "", side: 1, entry: pair.b },
                      ]}
                      lang={lang}
                    />
                  ) : (
                    <p className="absent">{reasonWords(pair.reason, lang)}</p>
                  )}
                </div>
              ))
            )}
          </Chapter>
        </>
      )}

      <p className="again cmp-pages">
        <span className="cmp-pages-label">{c.pages}</span>
        {[a, b].map((side) =>
          side.path === null || side.display === null ? null : (
            <a key={side.slug} href={side.path}>
              {side.display}
            </a>
          ),
        )}
      </p>

      <div className="cmp-next">
        <section className="cmp-again" aria-labelledby="cmp-again-title">
          <h2 id="cmp-again-title">{c.again}</h2>
          <p className="note">{c.againLede}</p>
          <PickerForm lang={lang} first="" second="" error={false} compact />
        </section>
        {fullNamesHref === null ? null : <FullNamesCard href={fullNamesHref} lang={lang} />}
      </div>

      <ReportLink
        surnames={[a.display, b.display].filter((d): d is string => d !== null)}
        pageUrl={`${origin ?? ""}${comparePath(a.slug, b.slug, lang)}`}
        lang={lang}
      />
    </SiteShell>
  );
}

/**
 * The two fields with the mark between them, and a `GET` to the comparison,
 * which turns what was typed into addresses (`compare-request.ts`). `compact`
 * is the second comparison at the foot of a result: its own field ids, so the
 * page never holds two elements with one id.
 */
function PickerForm({
  lang,
  first,
  second,
  error,
  copy = null,
  compact = false,
}: {
  lang: Lang;
  first: string;
  second: string;
  error: boolean;
  copy?: PickerCopy | null;
  compact?: boolean;
}) {
  const t = UI[lang];
  const c = COMPARE_TEXT[lang];
  const action = copy?.action ?? (lang === "pl" ? "/pl/porownaj" : "/en/compare");
  const ids = compact ? (["qa-again", "qb-again"] as const) : (["qa", "qb"] as const);
  return (
    <form
      className={compact ? "cmp-duel cmp-duel-compact" : "cmp-duel"}
      action={action}
      method="get"
    >
      <div className="cmp-field" data-side={0}>
        <label htmlFor={ids[0]}>{t.compareFirstLabel}</label>
        <input
          id={ids[0]}
          name="qa"
          type="text"
          defaultValue={first.slice(0, 80)}
          placeholder={t.searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="words"
        />
      </div>
      <span className="cmp-vs" aria-hidden="true">
        {c.versus}
      </span>
      <div className="cmp-field" data-side={1}>
        <label htmlFor={ids[1]}>{t.compareSecondLabel}</label>
        <input
          id={ids[1]}
          name="qb"
          type="text"
          defaultValue={second.slice(0, 80)}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="words"
        />
      </div>
      {error ? (
        <p className="compare-error" role="alert">
          {t.compareNeedsTwo}
        </p>
      ) : null}
      <button type="submit">{copy?.submit ?? t.compareAction}</button>
    </form>
  );
}

/**
 * The comparison's picker (TASK-052, redesigned by TASK-155): the header's
 * "Porównaj" opens it. Two plain fields, typed as the surnames are written,
 * with the mark between them. The disclaimer stands above the fields, as it
 * stands above every comparison. Below: pairs to try, what is compared, and,
 * while it exists, the full-name comparison (D-049). The couple report
 * (TASK-100) uses it with its own address and words, and none of the extras.
 */
export function ComparePicker({
  lang,
  first,
  second,
  error,
  copy = null,
  fullNamesHref = null,
}: {
  lang: Lang;
  first: string;
  second: string;
  error: boolean;
  /** Another page's address and words in place of the comparison's. */
  copy?: PickerCopy | null;
  /** The full-name comparison's address, only while that page exists (D-049). */
  fullNamesHref?: string | null;
}) {
  const t = UI[lang];
  const c = COMPARE_TEXT[lang];
  return (
    <SiteShell
      lang={lang}
      otherPath={copy?.otherPath ?? (lang === "pl" ? "/en/compare" : "/pl/porownaj")}
      world={{ mode: "quiet" }}
      current={copy === null ? "compare" : null}
      mainClassName="compare compare-pick cmp cmp-pick atlas-v1"
    >
      <header className="cmp-intro">
        {copy === null ? <p className="cmp-eyebrow">{c.eyebrow}</p> : null}
        <h1 className="page-title">{copy?.heading ?? t.compareHeading}</h1>
        <p className="page-lede">{copy?.intro ?? t.compareIntro}</p>
      </header>
      <p className="warning cmp-disclaimer">{t.compareDisclaimer}</p>
      <PickerForm lang={lang} first={first} second={second} error={error} copy={copy} />
      {copy === null ? (
        <>
          <nav className="cmp-try" aria-label={c.tryHeading}>
            <span className="cmp-try-label">{c.tryHeading}</span>
            {COMPARE_EXAMPLES.map(([x, y]) => {
              const sx = slugFor(x);
              const sy = slugFor(y);
              if (sx === null || sy === null) return null;
              return (
                <a key={`${x}-${y}`} href={comparisonPath(sx, sy, lang)}>
                  {x} <span className="cmp-try-vs">{c.versus}</span> {y}
                </a>
              );
            })}
          </nav>
          <section className="cmp-gives" aria-labelledby="cmp-gives-title">
            <h2 id="cmp-gives-title">{c.givesHeading}</h2>
            <ol>
              {c.gives.map((item, i) => (
                <li key={item.title}>
                  <span className="cmp-chapter-no" aria-hidden="true">
                    {c.chapter(i + 1)}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ol>
          </section>
          {fullNamesHref === null ? null : <FullNamesCard href={fullNamesHref} lang={lang} />}
        </>
      ) : null}
    </SiteShell>
  );
}
