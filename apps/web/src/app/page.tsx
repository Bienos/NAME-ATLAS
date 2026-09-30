import Link from "next/link";
import { CountBars } from "../components/count-bars";
import { RundownOutline } from "../components/rundown-outline";
import { SearchForm } from "../components/search-form";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import { formatCount, formatIsoDate } from "../lib/format";
import { NATIONAL_OVERVIEW } from "../generated/national-overview";
import type { ListRole } from "../lib/national-overview";
import styles from "./page.module.css";

/**
 * The landing page (tasks/WEB-000-landing-page.md). Search first; below it,
 * the national picture, rendered from the generated `NationalOverview`
 * presentation object. Every figure on this page comes from that object —
 * none is typed into the copy — and every count sits beside its list and
 * reference date.
 */

const LIST_NAMES: Readonly<Record<ListRole, { readonly en: string; readonly pl: string }>> = {
  national_male: { en: "Male list", pl: "Nazwiska męskie" },
  national_female: { en: "Female list", pl: "Nazwiska żeńskie" },
};

/** Example inputs only — links into search, not claims about the surnames. */
const EXAMPLES = ["Nowak", "Wójcik", "Mazur"] as const;

const POLISH_LETTERS = ["Ą", "Ć", "Ę", "Ł", "Ń", "Ó", "Ś", "Ź", "Ż"] as const;

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.icon}>
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v5M10 6.2v.1" />
    </svg>
  );
}

export default function HomePage() {
  const overview = NATIONAL_OVERVIEW;
  const { dataset, heroSpecimen, spellingSpecimens, trend } = overview;
  const { male, female } = overview.lists;
  const lists = [male, female];
  const asOf = formatIsoDate(overview.referenceDate);
  const posted = formatIsoDate(overview.postedDate);
  const scaleMax = Math.max(...lists.flatMap((list) => list.highestCounts.map((row) => row.count)));

  return (
    <>
      <SiteHeader />
      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Polish surnames, on the record</p>
              <h1 id="hero-title" className={styles.heroTitle}>
                What’s in your surname?
              </h1>
              <p className={styles.heroLede}>
                Type it in to open its rundown: how common it is today, where it may come from, and
                what history remembers. Every line shows its source and date. Where the records are
                silent, we say so.
              </p>
              <SearchForm id="hero-surname" />
              <p className={styles.examples}>
                <span>Try</span>
                {EXAMPLES.map((example) => (
                  <Link key={example} href={`/search?surname=${encodeURIComponent(example)}`}>
                    {example}
                  </Link>
                ))}
              </p>
            </div>

            <figure className={styles.specimen}>
              <div className={styles.specimenCard}>
                <p className={styles.specimenKicker}>From the register</p>
                <p className={styles.specimenName}>{heroSpecimen.surname}</p>
                <dl className={styles.specimenCounts}>
                  {lists.map((list) => (
                    <div key={list.role}>
                      <dt>
                        {LIST_NAMES[list.role].en}
                        <span lang="pl">{LIST_NAMES[list.role].pl}</span>
                      </dt>
                      <dd>
                        {formatCount(
                          list.role === "national_male" ? heroSpecimen.male : heroSpecimen.female,
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className={styles.specimenSource}>
                  PESEL register · published count · as of {asOf}
                </p>
              </div>
              <figcaption className={styles.specimenCaption}>
                One surname, two lists. Every number on Name Atlas carries its source and date like
                this.
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="picture" className={styles.section} aria-labelledby="picture-title">
          <div className={styles.container}>
            <header className={styles.sectionHead}>
              <p className={styles.eyebrow}>Surnames in Poland today</p>
              <h2 id="picture-title" className={styles.sectionTitle}>
                The register, in four numbers
              </h2>
              <p className={styles.sectionLede}>
                Poland’s PESEL register publishes the current surnames of living people once a year,
                as two lists. This is what the latest edition holds.
              </p>
            </header>

            <ul className={styles.tiles}>
              {lists.map((list) => (
                <li key={list.role} className={styles.tile}>
                  <p className={styles.tileValue}>{formatCount(list.surnamesListed)}</p>
                  <p className={styles.tileLabel}>
                    surnames on the {LIST_NAMES[list.role].en.toLowerCase()}
                  </p>
                  <p className={styles.tileNote}>
                    <span lang="pl">{LIST_NAMES[list.role].pl}</span> · as of{" "}
                    <span className={styles.nowrap}>{asOf}</span>
                  </p>
                </li>
              ))}
              <li className={styles.tile}>
                <p className={styles.tileValue}>{formatCount(overview.smallestPublishedCount)}</p>
                <p className={styles.tileLabel}>smallest count published</p>
                <p className={styles.tileNote}>
                  Surnames that occur only once are withheld, so a missing surname is not a zero.
                </p>
              </li>
              <li className={styles.tile}>
                <p className={`${styles.tileValue} ${styles.tileValueDate}`}>{asOf}</p>
                <p className={styles.tileLabel}>reference date of this edition</p>
                <p className={styles.tileNote}>
                  Published {dataset.updateFrequency}. Posted on{" "}
                  <span className={styles.nowrap}>{posted}</span>.
                </p>
              </li>
            </ul>

            <aside className={styles.callout} aria-labelledby="no-total-title">
              <h3 id="no-total-title" className={styles.calloutTitle}>
                Why there’s no grand total
              </h3>
              <p>
                The two lists overlap. {heroSpecimen.surname} appears on both:{" "}
                {formatCount(heroSpecimen.male)} on the male list and{" "}
                {formatCount(heroSpecimen.female)} on the female list. The publisher doesn’t say
                exactly how surnames are split between the lists, and adding them together would
                count shared surnames twice. So we don’t.
              </p>
            </aside>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="frequent-title">
          <div className={styles.container}>
            <header className={styles.sectionHead}>
              <p className={styles.eyebrow}>Most frequent</p>
              <h2 id="frequent-title" className={styles.sectionTitle}>
                The {male.highestCounts.length} highest counts on each list
              </h2>
              <p className={styles.sectionLede}>
                In the register’s own order, exactly as published. Both charts share one scale, so
                bars compare across the lists.
              </p>
            </header>

            <div className={styles.charts}>
              {lists.map((list) => (
                <article key={list.role} className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>
                    {LIST_NAMES[list.role].en}
                    <span lang="pl">{LIST_NAMES[list.role].pl}</span>
                  </h3>
                  <CountBars rows={list.highestCounts} scaleMax={scaleMax} />
                </article>
              ))}
            </div>
            <p className={styles.caption}>
              Published counts (the register’s <span lang="pl">“Liczba”</span>), as of {asOf}. The
              register doesn’t state that one count is one person, so we don’t call them people yet.
            </p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="trends-title">
          <div className={styles.container}>
            <div className={styles.trendCard}>
              <div className={styles.trendCopy}>
                <p className={styles.eyebrow}>Trends</p>
                <h2 id="trends-title" className={styles.sectionTitle}>
                  Change over time takes two editions. We hold one.
                </h2>
                <p className={styles.sectionLede}>
                  The register is republished {dataset.updateFrequency}. When the next edition is
                  verified and loaded, this is where you’ll see which surnames are rising and which
                  are thinning out: measured, not guessed.
                </p>
                <p className={styles.status}>
                  <InfoIcon />
                  Not enough data yet
                </p>
              </div>
              <ol className={styles.timeline} aria-label="Editions of the register">
                {trend.editionsHeld.map((edition) => (
                  <li key={edition} className={styles.edition} data-held="true">
                    <span className={styles.editionDot} aria-hidden="true" />
                    <strong>{formatIsoDate(edition)}</strong>
                    <span>Current edition · held</span>
                  </li>
                ))}
                <li className={styles.edition} data-held="false">
                  <span className={styles.editionDot} aria-hidden="true" />
                  <strong>Next edition</strong>
                  <span>Not yet held</span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="spelling-title">
          <div className={`${styles.container} ${styles.spellingGrid}`}>
            <div>
              <header className={styles.sectionHead}>
                <p className={styles.eyebrow}>Spelling</p>
                <h2 id="spelling-title" className={styles.sectionTitle}>
                  Every letter counts
                </h2>
                <p className={styles.sectionLede}>
                  We keep every surname exactly as the register writes it. Łuczak and Luczak are two
                  different surnames, and we never merge them behind your back. The same holds for
                  letters from outside the Polish alphabet.
                </p>
              </header>
              <ul className={styles.spellings}>
                {spellingSpecimens.map((specimen) => (
                  <li key={specimen.surname} className={styles.spelling}>
                    <span className={styles.spellingName}>{specimen.surname}</span>
                    <span className={styles.spellingCounts}>
                      {formatCount(specimen.male)} on the male list · {formatCount(specimen.female)}{" "}
                      on the female list
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.letters}>
              <p className="visually-hidden">The nine Polish letters beyond A to Z:</p>
              <ul className={styles.letterGrid}>
                {POLISH_LETTERS.map((letter) => (
                  <li key={letter} lang="pl">
                    {letter}
                  </li>
                ))}
              </ul>
              <p className={styles.lettersCaption}>Nine letters beyond A–Z, all kept.</p>
            </div>
          </div>
        </section>

        <section id="rundown" className={styles.section} aria-labelledby="rundown-title">
          <div className={`${styles.container} ${styles.rundownGrid}`}>
            <header className={styles.sectionHead}>
              <p className={styles.eyebrow}>How it works</p>
              <h2 id="rundown-title" className={styles.sectionTitle}>
                What opens when you search
              </h2>
              <p className={styles.sectionLede}>
                A rundown in five short chapters. Each line carries a confidence label and its
                sources. Where the evidence runs out, the rundown says so and gets shorter rather
                than filling the gap.
              </p>
              <div className={styles.cta}>
                <SearchForm id="rundown-surname" size="compact" />
              </div>
            </header>
            <RundownOutline />
          </div>
        </section>

        <section id="source" className={styles.section} aria-labelledby="source-title">
          <div className={styles.container}>
            <div className={styles.sourceCard}>
              <header className={styles.sectionHead}>
                <p className={styles.eyebrow}>About the data</p>
                <h2 id="source-title" className={styles.sectionTitle}>
                  Where the numbers come from
                </h2>
              </header>
              <dl className={styles.sourceList}>
                <div>
                  <dt>Dataset</dt>
                  <dd lang="pl">{dataset.title}</dd>
                </div>
                <div>
                  <dt>Publisher</dt>
                  <dd lang="pl">{dataset.publisher}</dd>
                </div>
                <div>
                  <dt>Lists</dt>
                  <dd lang="pl">
                    {male.resourceTitle}
                    <br />
                    {female.resourceTitle}
                  </dd>
                </div>
                <div>
                  <dt>Reference date</dt>
                  <dd>{asOf}</dd>
                </div>
                <div>
                  <dt>Posted</dt>
                  <dd>{posted}</dd>
                </div>
                <div>
                  <dt>Scope</dt>
                  <dd>
                    Living people, {dataset.geography}. Surnames that occur only once are withheld.
                  </dd>
                </div>
                <div>
                  <dt>Counts</dt>
                  <dd>
                    Shown exactly as published. The publisher doesn’t state that one count is one
                    person.
                  </dd>
                </div>
                <div>
                  <dt>Licence</dt>
                  <dd>{dataset.licence} (stated for the dataset)</dd>
                </div>
              </dl>
              <p className={styles.sourceLink}>
                <a href={dataset.url} rel="noopener noreferrer" target="_blank">
                  View dataset {dataset.id} on dane.gov.pl
                  <span aria-hidden="true"> ↗</span>
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
