/**
 * The result view (TASK-017; restructured by TASK-023).
 *
 * Separated from the pages so it can be rendered in a test with
 * `renderToStaticMarkup`, no Next runtime and no database. That is what lets the
 * page's honesty rules be asserted against **rendered output** rather than
 * against intent: that two partitions never appear as a total, that a coverage
 * warning precedes its figures, that a rights-blocked section carries no value,
 * and that no score or percentage of confidence is anywhere on the page.
 *
 * Since TASK-023 every figure is rendered through one `Claim` unit — statement,
 * assessment word, source kind, scope and date — and the page opens with a
 * `Snapshot`. The evidence behind the claims is one section at the foot of the
 * page (ADR-0012). Sections carry `docs/canonical/21` §34's stable ids.
 *
 * Pure in the sense that matters: given a validated response it returns markup,
 * and it derives no fact. The pages keep the request, the database and the
 * contract validation. No script is rendered here; the one client island lives
 * on the canonical page, outside this view.
 */
import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import type {
  CitationDto,
  DistributionEntry,
  MeaningSection,
  PopulationObservation,
  PopulationSection,
  RarityEntry,
  RaritySection,
  SurnameResultResponse,
  SuggestionsSection,
} from "@name-atlas/contracts";
import { Claim } from "./claim.js";
import type { ClaimEvidence } from "./claim.js";
import {
  coverageWarning,
  distributionSentence,
  explanationText,
  formatDate,
  formationWord,
  formatInteger,
  formatPercent,
  partitionLabel,
  populationSentence,
  rankSentence,
  raritySentence,
  reasonText,
  rightsBlockedText,
  sourceKindWord,
  UI,
} from "./messages.js";
import type { Intent, Lang } from "./messages.js";
import { SOURCES_ANCHOR, anchorOf, sectionOf, sectionOrder } from "./sections.js";
import type { SectionKey } from "./sections.js";
import { Snapshot } from "./snapshot.js";
import { VoivodeshipMap } from "./voivodeship-map.js";
import { mapInputs } from "./voivodeship-map-input.js";
import { RarityScale } from "./rarity-scale.js";

export function href(surname: string, lang: Lang): string {
  const params = new URLSearchParams({ surname });
  if (lang === "en") params.set("lang", "en");
  return `/?${params.toString()}`;
}

/**
 * One chapter: the question it answers and how to read the answer in the rail,
 * the figures beside it (Visual System §7 "8/4 main insight + annotation"; on a
 * wide chapter the rail sits above a full-width body, as the map needs).
 * Numbered in the order the page shows them, which an intent may change.
 */
function Chapter({
  chapter,
  number,
  lang,
  wide = false,
  empty = false,
  children,
}: {
  /** Which chapter: its anchor, question and reading note come from the registry. */
  chapter: SectionKey;
  number: number;
  lang: Lang;
  wide?: boolean;
  /** No figures to read: the absence is stated, compactly, and there is nothing to explain. */
  empty?: boolean;
  children: ReactNode;
}) {
  const t = UI[lang];
  const { anchor, title, lede } = sectionOf(chapter);
  const className = empty ? "chapter chapter-empty" : wide ? "chapter chapter-wide" : "chapter";
  return (
    <section id={anchor} className={className}>
      <div className="chapter-rail">
        <p className="chapter-number">{String(number).padStart(2, "0")}</p>
        <h3>{t[title]}</h3>
        {empty ? null : <p className="chapter-lede">{t[lede]}</p>}
      </div>
      <div className="chapter-body">{children}</div>
    </section>
  );
}

function Absent({ state, reason, lang }: { state: string; reason: string | null; lang: Lang }) {
  const t = UI[lang];
  return (
    <p className="absent">
      {state === "RIGHTS_BLOCKED"
        ? rightsBlockedText(lang)
        : (reasonText(reason, lang) ?? t.noFigures)}
    </p>
  );
}

/** Which register list a column belongs to, above its figures. Nothing when the group is unknown. */
function ListLabel({ group, lang }: { group: string | null; lang: Lang }) {
  const label = partitionLabel(group, lang);
  return label === null ? null : <p className="list-label">{label}</p>;
}

function Population({
  section,
  surname,
  number,
  lang,
}: {
  section: PopulationSection;
  surname: string;
  number: number;
  lang: Lang;
}) {
  const t = UI[lang];
  const several = section.observations.length > 1;
  return (
    <Chapter chapter="count" number={number} lang={lang} empty={section.state !== "READY"}>
      {section.state !== "READY" ? (
        <Absent state={section.state} reason={section.reason_code} lang={lang} />
      ) : (
        <>
          {/* One column per register list, side by side and never added up. */}
          <div className="lists">
            {section.observations.map((observation, index) => (
              <div
                className="list"
                key={`${observation.comparability_group ?? "group"}-${String(index)}`}
              >
                <ListLabel group={observation.comparability_group} lang={lang} />
                <Claim
                  statement={populationSentence(observation, surname, lang)}
                  evidence={populationEvidence(observation, several, lang)}
                  country_code={observation.country_code}
                  lang={lang}
                />
              </div>
            ))}
          </div>
          {several ? <p className="note">{t.notSummed}</p> : null}
        </>
      )}
    </Chapter>
  );
}

function Rarity({
  section,
  surname,
  number,
  lang,
}: {
  section: RaritySection;
  surname: string;
  number: number;
  lang: Lang;
}) {
  const t = UI[lang];
  return (
    <Chapter chapter="rarity" number={number} lang={lang} empty={section.state !== "READY"}>
      {section.state !== "READY" ? (
        <Absent state={section.state} reason={section.reason_code} lang={lang} />
      ) : (
        <div className="lists">
          {section.entries.map((entry, index) => {
            const rank = entry.supporting.find((metric) => metric.metric === "RANK");
            const rankText = rankSentence(entry, surname, lang);
            const oneIn = entry.primary.metric === "ONE_IN_X" ? entry.primary.value : null;
            const x = oneIn === null ? null : formatInteger(oneIn, lang);
            const figure =
              x === null ? null : lang === "pl" ? `około 1 na ${x}` : `about 1 in ${x}`;
            return (
              <div
                className="list"
                key={`${entry.comparability_group ?? "group"}-${String(index)}`}
              >
                <ListLabel group={entry.comparability_group} lang={lang} />
                {oneIn === null || figure === null ? null : (
                  <>
                    <p className="figure">{figure}</p>
                    <RarityScale oneIn={oneIn} figure={figure} lang={lang} />
                  </>
                )}
                {rank === undefined ? null : (
                  <p className="rank">
                    <span className="rank-number">#{formatInteger(rank.value, lang)}</span>{" "}
                    <span className="rank-caption">{t.rankCaption}</span>
                  </p>
                )}
                <Claim
                  statement={raritySentence(entry, surname, lang)}
                  evidence={rarityEvidence(entry, lang)}
                  country_code={entry.country_code}
                  lang={lang}
                >
                  {rankText !== null ? <p className="claim-more">{rankText}</p> : null}
                </Claim>
              </div>
            );
          })}
        </div>
      )}
    </Chapter>
  );
}

/**
 * One regional entry. The coverage warning is rendered **before** any figure,
 * which is the order a reader must take them in and why it is the claim's
 * lead rather than a footnote (TASK-012 §3).
 *
 * The map and a ranked list share the row (Visual System §12: "Primary: map.
 * Secondary: ranked textual list. Never require map alone"). Each row's bar is
 * its share against the entry's largest, and takes that region's map shade, so
 * the list reads as the map's key; the exact share and count sit beside it.
 */
function DistributionFact({
  entry,
  surname,
  lang,
}: {
  entry: DistributionEntry;
  surname: string;
  lang: Lang;
}) {
  const t = UI[lang];
  const warning = coverageWarning(entry, lang);
  const leading = distributionSentence(entry, 0, surname, lang) ?? "";
  const input = mapInputs([entry], lang);
  const map =
    input === null ? null : { regions: input.maps[0] ?? [], bandLabels: input.bandLabels };
  const largest = Math.max(...entry.regions.map((region) => region.share_of_covered));
  return (
    <div className="where-entry">
      <ListLabel group={entry.comparability_group} lang={lang} />
      <Claim
        statement={leading}
        lead={warning === null ? null : <p className="warning">{warning}</p>}
        evidence={distributionEvidence(entry, lang)}
        country_code={entry.country_code}
        lang={lang}
      >
        <div className={map === null ? "where-grid where-grid-table" : "where-grid"}>
          {map === null ? null : (
            <VoivodeshipMap
              regions={map.regions}
              labels={{
                title: t.mapTitle,
                legendTitle: t.mapLegend,
                bandLabels: map.bandLabels,
                notListed: t.mapNotListed,
                hint: t.mapHint,
              }}
            />
          )}
          {/* Its own scroll container, so a table can never widen the document.
              Verified at a true 320px viewport: the names wrap inside the first
              column and nothing overflows. `tabindex` and `role="region"` make
              the area reachable from the keyboard when it does scroll. */}
          <div className="table-scroll" tabIndex={0} role="region" aria-label={t.regionsHeading}>
            <table className="rank-bars">
              <caption>{t.coveredNote}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.regionColumn}</th>
                  <th scope="col">{t.shareColumn}</th>
                  <th scope="col">{t.countColumn}</th>
                </tr>
              </thead>
              <tbody>
                {entry.regions.map((region, index) => {
                  const band = map?.regions[index]?.band;
                  const width = largest > 0 ? (region.share_of_covered / largest) * 100 : 0;
                  return (
                    <tr key={region.place_id}>
                      <th scope="row">{region.display_name}</th>
                      <td className="rb-share">
                        <span className="rb-track">
                          <span
                            className="rb-fill"
                            data-band={band === undefined ? undefined : String(band)}
                            style={{ "--w": `${width.toFixed(1)}%` } as CSSProperties}
                          />
                        </span>
                        <span className="rb-value">
                          {formatPercent(region.share_of_covered, lang)}
                        </span>
                      </td>
                      <td className="rb-count">{formatInteger(region.count, lang)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Claim>
    </div>
  );
}

function Distribution({
  section,
  surname,
  number,
  lang,
}: {
  section: NonNullable<SurnameResultResponse["distribution"]>;
  surname: string;
  number: number;
  lang: Lang;
}) {
  return (
    <Chapter chapter="map" number={number} lang={lang} wide empty={section.state !== "READY"}>
      {section.state !== "READY" ? (
        <Absent state={section.state} reason={section.reason_code} lang={lang} />
      ) : (
        section.entries.map((entry, index) => (
          <DistributionFact
            key={`${entry.comparability_group ?? "group"}-${String(index)}`}
            entry={entry}
            surname={surname}
            lang={lang}
          />
        ))
      )}
    </Chapter>
  );
}

/** A work as a citation, so a meaning claim is cited at the foot of the page like every other. */
function workCitation(interpretation: MeaningSection["interpretations"][number]): CitationDto {
  const { author_or_publisher, title, year } = interpretation.work;
  return {
    id: `${author_or_publisher}|${title}|${String(year)}`,
    title,
    publisher: author_or_publisher,
    // Year precision, preserved as the year (canonical/16 §40: "source precision preserved").
    publication_date: String(year),
    source_type: "DICTIONARY",
    locator: interpretation.locator,
    url: null,
    attribution: null,
    terms: null,
    retrieved_at: null,
    source_page_url: null,
  };
}

/**
 * The meaning section (TASK-022, ADR-0008; restructured by TASK-023).
 *
 * The gap is rendered as a sentence, not as an absence. Nothing here composes
 * a gloss: every string either comes from the claim verbatim or from the `UI`
 * table. On a conflict every reading is shown, and the notes at the foot of the
 * page list the readings that disagree (ADR-0012).
 */
function Meaning({
  section,
  number,
  lang,
}: {
  section: MeaningSection;
  number: number;
  lang: Lang;
}) {
  const t = UI[lang];
  if (section.state !== "AVAILABLE") {
    const body =
      section.state === "NO_SOURCED_MEANING"
        ? t.meaningNoSource
        : section.state === "RIGHTS_BLOCKED"
          ? t.meaningBlocked
          : t.meaningUnavailable;
    return (
      <Chapter chapter="meaning" number={number} lang={lang}>
        <p className="absent">{body}</p>
      </Chapter>
    );
  }
  const conflicting = section.confidence === "CONFLICTING";
  return (
    <Chapter chapter="meaning" number={number} lang={lang}>
      {/* Before the readings, not after: a reader must know these are
          interpretations before they read one as a fact. */}
      <p className="caveat">{t.meaningInterpretationNote}</p>
      {conflicting ? <p className="caveat">{t.meaningConflictNote}</p> : null}
      {section.interpretations.map((interpretation, index) => {
        return (
          <Claim
            key={`${interpretation.work.title}-${String(index)}`}
            statement={interpretation.literal_gloss}
            evidence={meaningEvidence(section, interpretation, lang)}
            country_code="PL"
            lang={lang}
          >
            <dl className="meaning-facts">
              {interpretation.root_form === null ? null : (
                <>
                  <dt>{t.meaningRootLabel}</dt>
                  <dd>{interpretation.root_form}</dd>
                </>
              )}
              {interpretation.root_language === null ? null : (
                <>
                  <dt>{t.meaningLanguageLabel}</dt>
                  <dd>{interpretation.root_language}</dd>
                </>
              )}
              <dt>{t.meaningFormationLabel}</dt>
              <dd>{formationWord(interpretation.formation_type, lang)}</dd>
            </dl>
          </Claim>
        );
      })}
    </Chapter>
  );
}

/*
 * The evidence behind each kind of claim. The claim uses it for its assessment,
 * source kind and date; the foot of the page uses it for its source and notes.
 * One builder per kind, so the two can never disagree.
 */

function populationEvidence(
  observation: PopulationObservation,
  several: boolean,
  lang: Lang,
): ClaimEvidence {
  const t = UI[lang];
  return {
    citation: observation.citation,
    underlying_date: observation.snapshot_date,
    confidence: observation.confidence,
    notes: [
      // The publisher's own wording of what the dataset covers.
      observation.source_population_scope,
      t.limitationSuppressed,
      // The partition ambiguity TASK-004 §14 U-1 records, localised. The
      // stored `coverage_notes` says it too, but in this project's own
      // English prose — not a publisher quotation — so rendering it
      // verbatim would put untranslated internal text on a Polish page.
      // It stays internal, where the admin inspector shows it.
      ...(observation.comparability_group === null ? [] : [t.limitationPartition]),
      ...(several ? [t.limitationNotSummed] : []),
    ],
  };
}

function rarityEvidence(entry: RarityEntry, lang: Lang): ClaimEvidence {
  const t = UI[lang];
  const denominator = formatInteger(entry.denominator, lang);
  return {
    citation: entry.citation,
    underlying_date: entry.snapshot_date,
    confidence: entry.confidence,
    notes: [
      lang === "pl"
        ? `Mianownik: ${denominator} osób ujętych w rejestrze PESEL — suma opublikowanych liczb w tym zbiorze, nie ludność Polski.`
        : `Denominator: ${denominator} people counted in the PESEL register — the sum of the published counts in this dataset, not Poland's population.`,
      t.limitationRounded,
      t.limitationSuppressed,
    ],
  };
}

/**
 * `coverage_basis` is not one of the notes: it is this project's own English
 * methodology prose (`DISTRIBUTION_COVERAGE_BASIS`), and the localised notes
 * below already say what a reader needs from it.
 */
function distributionEvidence(entry: DistributionEntry, lang: Lang): ClaimEvidence {
  const t = UI[lang];
  const warning = coverageWarning(entry, lang);
  return {
    citation: entry.citation,
    underlying_date: entry.snapshot_date,
    confidence: entry.confidence,
    notes: [t.limitationRegistered, t.coveredNote, ...(warning === null ? [] : [warning])],
  };
}

function meaningEvidence(
  section: MeaningSection,
  interpretation: MeaningSection["interpretations"][number],
  lang: Lang,
): ClaimEvidence {
  const t = UI[lang];
  const others = section.interpretations.filter((o) => o !== interpretation);
  return {
    citation: workCitation(interpretation),
    underlying_date: String(interpretation.work.year),
    confidence: {
      status: section.confidence ?? "INSUFFICIENT_DATA",
      methodology_code: section.methodology_code ?? "—",
    },
    notes: [
      t.limitationInterpretation,
      ...(section.confidence === "CONFLICTING"
        ? others.map(
            (o) => `${o.work.author_or_publisher} (${String(o.work.year)}): ${o.literal_gloss}`,
          )
        : []),
    ],
  };
}

/** The evidence of every claim the page renders, in the page's default order. */
function pageEvidence(response: SurnameResultResponse, lang: Lang): ClaimEvidence[] {
  const observations = response.population?.observations ?? [];
  const meaning = response.meaning;
  return [
    ...observations.map((o) => populationEvidence(o, observations.length > 1, lang)),
    ...(response.rarity?.entries ?? []).map((e) => rarityEvidence(e, lang)),
    ...(response.distribution?.entries ?? []).map((e) => distributionEvidence(e, lang)),
    ...(meaning === null
      ? []
      : meaning.interpretations.map((i) => meaningEvidence(meaning, i, lang))),
  ];
}

/** A website named by its host, which is where the reader will land. */
function siteName(url: string, fallback: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return fallback;
  }
}

/**
 * The evidence behind every claim on the page, once, at its foot (`#sources`,
 * ADR-0012). Each source is listed once and linked to the website the data was
 * taken from (`source_page_url`), never to the file we retrieved. A source with
 * no public page — a printed work — is cited by its locator instead (page and
 * entry), which is where a reader finds it. The notes the claims carry follow,
 * each once, one disclosure away, as they were inside the per-claim panels.
 */
function Sources({ evidence, lang }: { evidence: readonly ClaimEvidence[]; lang: Lang }) {
  const t = UI[lang];
  if (evidence.length === 0) return null;
  // One line per source as a reader sees it: the same page, title, publisher,
  // date, licence and attribution are one source, however many claims cite it.
  // Without a page, each locator is its own line: two entries in one book are
  // two places to look.
  const sources = new Map<string, CitationDto>();
  for (const { citation: c } of evidence) {
    const key = JSON.stringify([
      c.source_page_url ?? [c.id, c.locator],
      c.title,
      c.publisher,
      c.publication_date,
      c.terms,
      c.attribution,
    ]);
    if (!sources.has(key)) sources.set(key, c);
  }
  const notes = [...new Set(evidence.flatMap((e) => e.notes))];
  return (
    <section id={SOURCES_ANCHOR} className="sources-section">
      <h3>{t.sectionSourcesAll}</h3>
      <ul className="sources">
        {[...sources].map(([key, c]) => (
          <li key={key}>
            <span className="source-kind">{sourceKindWord(c.source_type, lang)}</span>{" "}
            {c.publisher === null ? c.title : `${c.publisher} — ${c.title}`}
            {c.publication_date === null ? "" : ` · ${formatDate(c.publication_date, lang)}`}
            {c.source_page_url === null && c.locator !== null ? ` · ${c.locator}` : ""}
            {c.terms === null ? "" : ` · ${c.terms}`}
            {c.attribution === null ? "" : ` · ${c.attribution}`}
            {c.source_page_url === null ? null : (
              <>
                {" · "}
                <a href={c.source_page_url} rel="noopener noreferrer">
                  {siteName(c.source_page_url, t.sourceSiteLink)}
                </a>
              </>
            )}
          </li>
        ))}
      </ul>
      {notes.length === 0 ? null : (
        <details className="notes">
          <summary>{t.notesSummary}</summary>
          <ul>
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/**
 * Suggestions as a question, never as a correction. The user's input stays in
 * the search box above, and each candidate is a link they choose to follow
 * (`docs/canonical/13` §32.2: "Do not silently replace input").
 */
function Suggestions({ section, lang }: { section: SuggestionsSection; lang: Lang }) {
  const t = UI[lang];
  if (section.state !== "READY") {
    const reason = reasonText(section.reason_code, lang);
    return reason === null ? null : <p className="absent">{reason}</p>;
  }
  return (
    <>
      <p>{t.suggestionsQuestion}</p>
      <ul className="suggestions">
        {section.suggestions.map((suggestion) => {
          // Localised, and a code with no words is omitted rather than shown raw.
          const why = explanationText(suggestion.explanation_codes, lang);
          return (
            <li key={suggestion.surname.id}>
              <a href={href(suggestion.surname.display_name, lang)}>
                {suggestion.surname.display_name}
                {why === null ? null : <span className="codes">{why}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** The page's chapters as links, numbered as they appear. Anchors only; no script. */
function ChapterNav({
  order,
  sources,
  lang,
}: {
  order: readonly SectionKey[];
  sources: boolean;
  lang: Lang;
}) {
  const t = UI[lang];
  return (
    <nav className="chapter-nav" aria-label={t.navLabel}>
      <ol>
        {order.map((key, index) => (
          <li key={key}>
            <a href={`#${anchorOf(key)}`}>
              <span className="chapter-nav-number">{String(index + 1).padStart(2, "0")}</span>
              {t[sectionOf(key).nav]}
            </a>
          </li>
        ))}
        {sources ? (
          <li>
            <a href={`#${SOURCES_ANCHOR}`}>{t.navSources}</a>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}

export function Result({
  response,
  lang,
  intent = "default",
}: {
  response: SurnameResultResponse;
  lang: Lang;
  intent?: Intent;
}) {
  const t = UI[lang];

  if (response.status === "RESOLVED" && response.surname !== null) {
    const surname = response.surname.display_name;
    const { population, rarity, distribution, meaning } = response;
    const chapters: Record<SectionKey, ((number: number) => ReactNode) | null> = {
      count:
        population === null
          ? null
          : (n) => <Population section={population} surname={surname} number={n} lang={lang} />,
      rarity:
        rarity === null
          ? null
          : (n) => <Rarity section={rarity} surname={surname} number={n} lang={lang} />,
      map:
        distribution === null
          ? null
          : (n) => <Distribution section={distribution} surname={surname} number={n} lang={lang} />,
      meaning:
        meaning === null ? null : (n) => <Meaning section={meaning} number={n} lang={lang} />,
    };
    const order = sectionOrder(intent).filter((key) => chapters[key] !== null);
    const evidence = pageEvidence(response, lang);
    return (
      <div className="result">
        <Snapshot response={{ ...response, status: "RESOLVED" }} lang={lang} />
        <ChapterNav order={order} sources={evidence.length > 0} lang={lang} />
        {order.map((key, index) => (
          <Fragment key={key}>{chapters[key]?.(index + 1)}</Fragment>
        ))}
        <Sources evidence={evidence} lang={lang} />
      </div>
    );
  }

  return (
    <section>
      <h3>{response.status === "AMBIGUOUS" ? t.ambiguousHeading : t.unresolvedHeading}</h3>
      {response.suggestions !== null ? (
        <Suggestions section={response.suggestions} lang={lang} />
      ) : null}
    </section>
  );
}
