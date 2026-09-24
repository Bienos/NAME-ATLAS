import type { PeselRegisterEntry, PeselRegisterReading } from "@name-atlas/sources/pesel";
import { formatCount, formatIsoDate, isoDay } from "../lib/format";
import { LIST_COPY, sourceRef } from "../lib/pesel-copy";
import { ResultThread } from "./ResultThread";
import { Uncharted } from "./Uncharted";
import styles from "./Findings.module.css";

/**
 * What the register records for a resolved surname — visual system §39
 * screen 02 ("one discovery, one composition"), §12 (a large editorial
 * number, never a KPI card), §17 (S01 source references), §2 principle 07
 * (uncertainty designed, not hidden).
 *
 * Every figure is the published `Liczba`, unchanged, with its list, scope and
 * date beside it (ARCHITECTURE.md §10 invariant 5). It is called
 * "occurrences", never "people" (D-006). The two lists are shown apart and
 * never added up or set against each other, because the publisher does not
 * say what divides them. A list that does not include the surname says so —
 * it is not a zero (invariant 4). No rank, share or rarity is computed.
 */

interface RegisterFindingsProps {
  readonly registerForm: string;
  readonly register: PeselRegisterReading;
}

export function RegisterFindings({ registerForm, register }: RegisterFindingsProps) {
  const { entries, source } = register;
  const listed = entries.filter((entry) => entry.status === "LISTED");
  const dates = [...new Set(entries.map((entry) => entry.dataDate))];

  return (
    <>
      <ResultThread
        state={listed.length > 0 ? "found" : "missing"}
        start={<>As listed: {registerForm}</>}
        tick={dates.length === 1 ? dates[0] : undefined}
        end={listed.length > 0 ? "PESEL register" : "Not listed"}
      />
      <div className={styles.findings}>
        <div className={styles.grid}>
          <div className={styles.figures}>
            {entries.map((entry, index) =>
              entry.status === "LISTED" ? (
                <ListedFigure
                  key={entry.role}
                  entry={entry}
                  registerForm={registerForm}
                  reference={sourceRef(index)}
                />
              ) : (
                <AbsentFigure key={entry.role} entry={entry} reference={sourceRef(index)} />
              ),
            )}
            <section className={styles.caveats} aria-labelledby="caveats-title">
              <h2 id="caveats-title" className={styles.sectionLabel}>
                What this number is &mdash; and isn&rsquo;t
              </h2>
              <dl className={styles.caveatList}>
                <div>
                  <dt>Occurrences, not a headcount.</dt>
                  <dd>
                    The register counts how many times a surname occurs among the current surnames
                    of living persons. Its publisher doesn&rsquo;t state that one occurrence is one
                    person, so we don&rsquo;t present this as a number of people.
                  </dd>
                </div>
                {entries.length > 1 ? (
                  <div>
                    <dt>Two lists, kept apart.</dt>
                    <dd>
                      The publisher doesn&rsquo;t say whether its two lists divide people by sex or
                      surnames by grammatical form, so their figures are never added together or
                      compared.
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>National only.</dt>
                  <dd>
                    These lists cover Poland as a whole. They say nothing about where in Poland a
                    surname is found.
                  </dd>
                </div>
              </dl>
            </section>
          </div>
          <aside className={styles.rail} aria-labelledby="sources-title">
            <h2 id="sources-title" className={styles.sectionLabel}>
              Sources
            </h2>
            {entries.map((entry, index) => (
              <SourceCard
                key={entry.role}
                entry={entry}
                reference={sourceRef(index)}
                source={source}
              />
            ))}
          </aside>
        </div>
        <Uncharted />
      </div>
    </>
  );
}

function ListedFigure({
  entry,
  registerForm,
  reference,
}: {
  entry: Extract<PeselRegisterEntry, { status: "LISTED" }>;
  registerForm: string;
  reference: string;
}) {
  const list = LIST_COPY[entry.role];
  const count = formatCount(entry.count);
  return (
    <article className={styles.figure}>
      <p className={styles.count}>
        <data value={entry.count}>
          <span className="visually-hidden">{count}</span>
          {/* Resolves once, within §23's 250–500 ms; the full number is always in the DOM above. */}
          <span className={styles.digits} aria-hidden="true">
            {Array.from(count, (character, index) => (
              <span key={index} style={{ animationDelay: `${index * 20}ms` }}>
                {character}
              </span>
            ))}
          </span>
        </data>
      </p>
      <p className={styles.caption}>
        occurrences of <span className={styles.form}>{registerForm}</span> in the list{" "}
        <cite lang="pl">{list.title}</cite> (&ldquo;{list.gloss}&rdquo;) &mdash; current surnames of
        living persons in Poland.
      </p>
      <p className={styles.meta}>
        <span>PESEL register</span>
        <span aria-hidden="true">·</span>
        <span>as of {formatIsoDate(entry.dataDate)}</span>
        <a className={styles.ref} href={`#${reference.toLowerCase()}`}>
          <span className="visually-hidden">Source </span>
          {reference}
        </a>
      </p>
    </article>
  );
}

function AbsentFigure({
  entry,
  reference,
}: {
  entry: Extract<PeselRegisterEntry, { status: "BELOW_PUBLICATION_THRESHOLD_OR_ABSENT" }>;
  reference: string;
}) {
  const list = LIST_COPY[entry.role];
  return (
    <article className={styles.absent}>
      <span className={styles.noDataMark} aria-hidden="true" />
      <div>
        <p className={styles.absentTitle}>
          Not in the list <cite lang="pl">{list.title}</cite> (&ldquo;{list.gloss}&rdquo;).
        </p>
        <p className={styles.absentBody}>
          The publisher leaves out any surname that occurs only once in a list, so this
          doesn&rsquo;t mean zero.
        </p>
        <p className={styles.meta}>
          <span>PESEL register</span>
          <span aria-hidden="true">·</span>
          <span>as of {formatIsoDate(entry.dataDate)}</span>
          <a className={styles.ref} href={`#${reference.toLowerCase()}`}>
            <span className="visually-hidden">Source </span>
            {reference}
          </a>
        </p>
      </div>
    </article>
  );
}

function SourceCard({
  entry,
  reference,
  source,
}: {
  entry: PeselRegisterEntry;
  reference: string;
  source: PeselRegisterReading["source"];
}) {
  return (
    <article id={reference.toLowerCase()} className={styles.sourceCard} tabIndex={-1}>
      <p className={styles.sourceRef}>
        <span>{reference}</span>
        <span className={styles.sourceId}>dane.gov.pl · resource {entry.resourceId}</span>
      </p>
      <h3 className={styles.sourceTitle} lang="pl">
        <KeepLastWordTogether text={entry.resourceTitle} />
      </h3>
      <p className={styles.sourcePublisher}>
        <span lang="pl">{source.name}</span>
        {source.publisher ? <> &mdash; {source.publisher}</> : null}
      </p>
      <dl className={styles.sourceFacts}>
        <div>
          <dt>Data as of</dt>
          <dd>
            <time dateTime={entry.dataDate}>{formatIsoDate(entry.dataDate)}</time>
          </dd>
        </div>
        <div>
          <dt>Retrieved</dt>
          <dd>
            <time dateTime={isoDay(entry.retrievedAt)}>
              {formatIsoDate(isoDay(entry.retrievedAt))}
            </time>
          </dd>
        </div>
      </dl>
      <details className={styles.sourceWording}>
        <summary>The publisher&rsquo;s own description</summary>
        <q lang="pl">{entry.resourceDescription}</q>
      </details>
      {source.referenceUrl ? (
        <a className={styles.sourceLink} href={source.referenceUrl} rel="noopener noreferrer">
          View the dataset on dane.gov.pl
          <span aria-hidden="true"> ↗</span>
        </a>
      ) : null}
    </article>
  );
}

/**
 * Renders `text` unchanged, but lets the browser break only before its last
 * word — so "stan na 2026-01-20" never splits at the date's hyphens.
 */
function KeepLastWordTogether({ text }: { text: string }) {
  const index = text.lastIndexOf(" ");
  if (index === -1) {
    return <span className={styles.nowrap}>{text}</span>;
  }
  return (
    <>
      {text.slice(0, index + 1)}
      <span className={styles.nowrap}>{text.slice(index + 1)}</span>
    </>
  );
}
