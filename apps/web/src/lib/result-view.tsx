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
  ArchiveSection,
  Bearer,
  BearersSection,
  ChangeEntry,
  ChangeSection,
  CitationDto,
  DistributionEntry,
  LocalitiesSection,
  MeaningSection,
  NeighbourList,
  NeighboursSection,
  OtherForm,
  OtherSpelling,
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
  archiveCategoryLabel,
  archivePeriodLabel,
  archiveSentence,
  bearerYears,
  bearersSentence,
  assessmentWord,
  changeGapNote,
  changeListLabel,
  changeSentence,
  coverageWarning,
  distributionSentence,
  explanationText,
  formatDate,
  formationWord,
  formatInteger,
  formatPercent,
  localitiesMore,
  localitiesSentence,
  localityAdminLine,
  localityKindLabel,
  otherFormSentence,
  otherSpellingParts,
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
import { NextStep } from "./next-step.js";
import type { Step } from "./next-step.js";
import { VoivodeshipMap } from "./voivodeship-map.js";
import { mapInputs } from "./voivodeship-map-input.js";
import { RarityScale } from "./rarity-scale.js";
import { contactPath } from "./site-footer.js";
import { offerPath } from "./site-links.js";

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
  next,
  lang,
  wide = false,
  empty = false,
  anchor = null,
  children,
}: {
  /** Which chapter: its anchor, question and reading note come from the registry. */
  chapter: SectionKey;
  number: number;
  /** The step after this one, linked at the chapter's foot. */
  next: Step | null;
  lang: Lang;
  wide?: boolean;
  /** No figures to read: the absence is stated, compactly, and there is nothing to explain. */
  empty?: boolean;
  /** An id in place of the registry's, where a page shows the chapter twice (TASK-100). */
  anchor?: string | null;
  children: ReactNode;
}) {
  const t = UI[lang];
  const { anchor: registered, title, lede } = sectionOf(chapter);
  const className = empty ? "chapter chapter-empty" : wide ? "chapter chapter-wide" : "chapter";
  return (
    <section id={anchor ?? registered} className={className}>
      <div className="chapter-rail">
        <p className="chapter-number">{String(number).padStart(2, "0")}</p>
        <h3>{t[title]}</h3>
        {empty ? null : <p className="chapter-lede">{t[lede]}</p>}
      </div>
      <div className="chapter-body">{children}</div>
      <NextStep next={next} />
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
  next,
  lang,
  anchor = null,
}: {
  section: PopulationSection;
  surname: string;
  number: number;
  next: Step | null;
  lang: Lang;
  /** The chapter's id, where a page shows it twice (TASK-100). */
  anchor?: string | null;
}) {
  const t = UI[lang];
  const several = section.observations.length > 1;
  return (
    <Chapter
      anchor={anchor}
      chapter="count"
      number={number}
      next={next}
      lang={lang}
      empty={section.state !== "READY"}
    >
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

/**
 * The surnames two places either side on one list (TASK-055, ADR-0025): read
 * from the rank claims, in rank order, the surname itself marked. A tie at its
 * own place is not listed, and the note says that tied counts share a place.
 */
function Neighbours({ list, lang }: { list: NeighbourList; lang: Lang }) {
  const t = UI[lang];
  return (
    <figure className="neighbours">
      <figcaption>{t.neighboursHeading}</figcaption>
      <ol>
        {list.entries.map((entry) => {
          const name = entry.surname.display_name;
          return (
            <li
              key={entry.surname.id}
              className={entry.is_self ? "is-self" : undefined}
              aria-current={entry.is_self ? "true" : undefined}
            >
              <span className="nb-rank">#{formatInteger(entry.rank, lang)}</span>
              {entry.is_self ? (
                <span className="nb-name">
                  {name} <span className="nb-self">{t.neighboursSelf}</span>
                </span>
              ) : (
                <a className="nb-name" href={href(name, lang)}>
                  {name}
                </a>
              )}
              <span className="nb-count">{formatInteger(entry.count, lang)}</span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

/** KOWALSKI's KOWALSKA: a form on the other list, never a relation (ADR-0025 §2.5). */
function OtherFormNote({ other, lang }: { other: OtherForm; lang: Lang }) {
  const t = UI[lang];
  return (
    <div className="other-form">
      <p className="list-label">{t.otherFormHeading}</p>
      <p className="other-form-line">
        <a href={href(other.surname.display_name, lang)}>{other.surname.display_name}</a>
        {otherFormSentence(other, lang).slice(other.surname.display_name.length)}
      </p>
      <p className="note">{t.otherFormNote}</p>
    </div>
  );
}

/**
 * WIŚNIEWSKI on WISNIEWSKI's page (TASK-125): a question with a link, under the
 * answer, for a reader who may have typed without diacritics. A plain line;
 * the two are separate register entries and it says nothing about kinship.
 */
function OtherSpellingLine({ other, lang }: { other: OtherSpelling; lang: Lang }) {
  const { lead, name, rest } = otherSpellingParts(other, lang);
  return (
    <p className="other-spelling">
      {lead}
      <a href={href(name, lang)}>{name}</a>
      {rest}
    </p>
  );
}

function Rarity({
  section,
  neighbours,
  otherForm,
  surname,
  number,
  next,
  lang,
}: {
  section: RaritySection;
  neighbours: NeighboursSection | null;
  otherForm: OtherForm | null;
  surname: string;
  number: number;
  next: Step | null;
  lang: Lang;
}) {
  const t = UI[lang];
  const listsOfNeighbours = neighbours?.state === "READY" ? neighbours.lists : [];
  return (
    <Chapter
      chapter="rarity"
      number={number}
      next={next}
      lang={lang}
      empty={section.state !== "READY"}
    >
      {section.state !== "READY" ? (
        <Absent state={section.state} reason={section.reason_code} lang={lang} />
      ) : (
        <>
          <div className="lists">
            {section.entries.map((entry, index) => {
              const near = listsOfNeighbours.find(
                (list) => list.comparability_group === entry.comparability_group,
              );
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
                  {near === undefined ? null : <Neighbours list={near} lang={lang} />}
                </div>
              );
            })}
          </div>
          {listsOfNeighbours.length > 0 ? <p className="note">{t.neighboursNote}</p> : null}
          {otherForm === null ? null : <OtherFormNote other={otherForm} lang={lang} />}
        </>
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
  next,
  lang,
  anchor = null,
}: {
  section: NonNullable<SurnameResultResponse["distribution"]>;
  surname: string;
  number: number;
  next: Step | null;
  lang: Lang;
  /** The chapter's id, where a page shows it twice (TASK-100). */
  anchor?: string | null;
}) {
  return (
    <Chapter
      anchor={anchor}
      chapter="map"
      number={number}
      next={next}
      lang={lang}
      wide
      empty={section.state !== "READY"}
    >
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

/**
 * The change-over-time table: one row per edition in date order, the surname's
 * share of that edition's list beside its count, and a row in place of any
 * resource that is not an edition. The bar is the point's own share against the
 * largest of the entry's, as the voivodeship bars are: a scale, not a derived
 * fact. A surname a list does not name is a row that says so, never a zero.
 */
function ChangeTable({ entry, lang }: { entry: ChangeEntry; lang: Lang }) {
  const t = UI[lang];
  const shares = entry.points.flatMap((point) => (point.status === "KNOWN" ? [point.share] : []));
  const largest = Math.max(...shares);
  const rows = [
    ...entry.points.map((point) => ({ date: point.data_date, point, gap: null })),
    ...entry.gaps.map((gap) => ({ date: gap.data_date, point: null, gap })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={t.changeTableLabel}>
      <table className="rank-bars change-table">
        <thead>
          <tr>
            <th scope="col">{t.changeEditionColumn}</th>
            <th scope="col">{t.changeShareColumn}</th>
            <th scope="col">{t.changeCountColumn}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ date, point, gap }) =>
            gap !== null || point === null ? (
              <tr key={`gap-${date}`} className="change-gap">
                <th scope="row">{formatDate(date, lang)}</th>
                <td colSpan={2}>{changeGapNote(date, lang)}</td>
              </tr>
            ) : point.status === "KNOWN" ? (
              <tr key={point.data_date}>
                <th scope="row">
                  {formatDate(point.data_date, lang)}
                  {point.note_code === null ? null : <sup aria-label={t.changeNoteMark}>*</sup>}
                </th>
                <td className="rb-share">
                  <span className="rb-track">
                    <span
                      className="rb-fill"
                      style={
                        { "--w": `${((point.share / largest) * 100).toFixed(1)}%` } as CSSProperties
                      }
                    />
                  </span>
                  <span className="rb-value">
                    {t.compareOneIn} {formatInteger(point.one_in_x, lang)}
                  </span>
                </td>
                <td className="rb-count">{formatInteger(point.count, lang)}</td>
              </tr>
            ) : (
              <tr key={point.data_date} className="change-absent">
                <th scope="row">
                  {formatDate(point.data_date, lang)}
                  {point.note_code === null ? null : <sup aria-label={t.changeNoteMark}>*</sup>}
                </th>
                <td colSpan={2}>{t.changeNotOnList}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The change chapter (TASK-051, ADR-0020): per list, the sentence, then the
 * table, then the notes a reader needs next to it. Not shown where there is no
 * claim, which is most surnames until they are on two editions of a list: an
 * absence is not a chapter.
 */
function Change({
  section,
  surname,
  number,
  next,
  lang,
  anchor = null,
}: {
  section: ChangeSection;
  surname: string;
  number: number;
  next: Step | null;
  lang: Lang;
  /** The chapter's id, where a page shows it twice (TASK-100). */
  anchor?: string | null;
}) {
  const t = UI[lang];
  return (
    <Chapter
      anchor={anchor}
      chapter="change"
      number={number}
      next={next}
      lang={lang}
      empty={section.state !== "READY"}
    >
      {section.state !== "READY" ? (
        <Absent state={section.state} reason={section.reason_code} lang={lang} />
      ) : (
        <div className="lists lists-change">
          {section.entries.map((entry) => {
            const flagged = entry.points.some((point) => point.note_code !== null);
            return (
              <div className="list" key={entry.list}>
                <p className="list-label">{changeListLabel(entry.list, lang)}</p>
                <Claim
                  statement={changeSentence(entry, surname, lang)}
                  evidence={changeEvidence(entry, lang)}
                  country_code={entry.country_code}
                  lang={lang}
                >
                  <ChangeTable entry={entry} lang={lang} />
                  {flagged ? <p className="note">* {t.change2019Note}</p> : null}
                </Claim>
              </div>
            );
          })}
        </div>
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
  next,
  lang,
  anchor = null,
}: {
  section: MeaningSection;
  number: number;
  next: Step | null;
  lang: Lang;
  /** The chapter's id, where a page shows it twice (TASK-100). */
  anchor?: string | null;
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
      <Chapter anchor={anchor} chapter="meaning" number={number} next={next} lang={lang}>
        <p className="absent">{body}</p>
      </Chapter>
    );
  }
  const conflicting = section.confidence === "CONFLICTING";
  return (
    <Chapter anchor={anchor} chapter="meaning" number={number} next={next} lang={lang}>
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

/**
 * What Polona's search returns for the surname (TASK-054, ADR-0024): how many
 * pages and records carry the word, when and where those pages were printed,
 * and a few public-domain pages quoted. The caveat sits with the figure, so a
 * reader meets it before reading a count as people.
 */
function Archive({
  section,
  surname,
  number,
  next,
  lang,
}: {
  section: ArchiveSection;
  surname: string;
  number: number;
  next: Step | null;
  lang: Lang;
}) {
  const t = UI[lang];
  const statement = archiveSentence(section, surname, lang);
  if (section.state !== "READY" || statement === null) {
    const body =
      section.state === "NOT_SEARCHED"
        ? t.archiveNotSearched
        : section.state === "RIGHTS_BLOCKED"
          ? t.archiveBlocked
          : t.archiveUnavailable;
    return (
      <Chapter chapter="archive" number={number} next={next} lang={lang} empty>
        <p className="absent">{body}</p>
      </Chapter>
    );
  }
  const largest = Math.max(1, ...section.pages_by_period.map((p) => p.count));
  return (
    <Chapter chapter="archive" number={number} next={next} lang={lang}>
      <Claim
        statement={statement}
        evidence={archiveEvidence(section, lang)}
        country_code="PL"
        lang={lang}
      >
        <p className="note archive-caveat">{t.archiveWordCaveat}</p>
      </Claim>
      {section.pages_by_period.length > 0 ? (
        <figure className="archive-periods">
          <figcaption>{t.archiveByPeriod}</figcaption>
          <ol>
            {section.pages_by_period.map((p) => (
              <li key={`${String(p.from_year)}-${String(p.to_year)}`}>
                <span className="archive-period">{archivePeriodLabel(p, lang)}</span>
                <span
                  className="archive-bar"
                  style={{ "--share": String(p.count / largest) } as CSSProperties}
                />
                <span className="archive-count">{formatInteger(p.count, lang)}</span>
              </li>
            ))}
          </ol>
        </figure>
      ) : null}
      {section.catalogue_by_category.length > 0 ? (
        <div className="archive-places archive-categories">
          <p className="archive-heading">{t.archiveByCategory}</p>
          <ul>
            {section.catalogue_by_category.slice(0, 6).map((category) => (
              <li key={category.label}>
                <span>{archiveCategoryLabel(category.label, lang)}</span>
                <span className="archive-count">{formatInteger(category.count, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {section.pages_by_place.length > 0 ? (
        <div className="archive-places">
          <p className="archive-heading">{t.archiveByPlace}</p>
          <ul>
            {section.pages_by_place.slice(0, 6).map((place) => (
              <li key={place.label}>
                <span>{place.label}</span>
                <span className="archive-count">{formatInteger(place.count, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {section.examples.length > 0 ? (
        <div className="archive-examples">
          <p className="archive-heading">{t.archiveExamples}</p>
          {section.examples.map((example) => {
            const year = archiveYear(example.date);
            return (
              <figure key={example.url} className="archive-example">
                <blockquote cite={example.url}>
                  <p>„{example.excerpt}”</p>
                </blockquote>
                <figcaption>
                  <span className="archive-title">{example.title}</span>
                  <span className="archive-where">
                    {year === null ? "" : `${year} · `}
                    {t.archivePage} {String(example.page_number)} ·{" "}
                    {section.citation?.attribution ?? "Polona"}
                  </span>
                  <a href={example.url} rel="noopener noreferrer">
                    {t.archiveOpen}
                  </a>
                </figcaption>
              </figure>
            );
          })}
        </div>
      ) : null}
    </Chapter>
  );
}

function Bearers({
  section,
  surname,
  number,
  next,
  lang,
  anchor = null,
}: {
  section: BearersSection;
  surname: string;
  number: number;
  next: Step | null;
  lang: Lang;
  /** The chapter's id, where a page shows it twice (TASK-100). */
  anchor?: string | null;
}) {
  const t = UI[lang];
  const statement = bearersSentence(section, surname, lang);
  if (section.state !== "READY" || statement === null) {
    const body =
      section.state === "NOT_SEARCHED"
        ? t.bearersNotSearched
        : section.state === "RIGHTS_BLOCKED"
          ? t.bearersBlocked
          : t.bearersUnavailable;
    return (
      <Chapter anchor={anchor} chapter="bearers" number={number} next={next} lang={lang} empty>
        <p className="absent">{body}</p>
      </Chapter>
    );
  }
  return (
    <Chapter anchor={anchor} chapter="bearers" number={number} next={next} lang={lang}>
      <Claim
        statement={statement}
        evidence={bearersEvidence(section, lang)}
        country_code="GLOBAL"
        lang={lang}
      >
        <p className="note bearers-caveat">{t.bearersCaveat}</p>
      </Claim>
      {section.people.length > 0 ? (
        <ol className="bearers-list">
          {section.people.map((person) => (
            <BearerItem key={person.wikidata_id} person={person} lang={lang} />
          ))}
        </ol>
      ) : null}
      {section.more !== null && section.more > 0 ? (
        <p className="note">
          <a href={offerPath(lang)}>
            {t.bearersMore.replace("{n}", formatInteger(section.more, lang))}
          </a>
        </p>
      ) : null}
      {section.people.length > 0 ? (
        <p className="note bearers-removal">
          <a href={contactPath(lang)}>{t.bearersRemoval}</a>
        </p>
      ) : null}
    </Chapter>
  );
}

/** One person: name, years, Wikidata's one-line description, and where to read more. */
export function BearerItem({ person, lang }: { person: Bearer; lang: Lang }) {
  const t = UI[lang];
  const years = bearerYears(person, lang);
  const description =
    lang === "pl"
      ? (person.description_pl ?? person.description_en)
      : (person.description_en ?? person.description_pl);
  return (
    <li className="bearer">
      <span className="bearer-name">{person.name}</span>
      {years === null ? null : <span className="bearer-years">{years}</span>}
      {description === null ? null : <span className="bearer-what">{description}</span>}
      <span className="bearer-links">
        {person.article_url === null ? null : (
          <a href={person.article_url} target="_blank" rel="noopener noreferrer">
            {t.bearersArticle}
          </a>
        )}
        <a href={person.wikidata_url} target="_blank" rel="noopener noreferrer">
          Wikidata
        </a>
      </span>
    </li>
  );
}

function bearersEvidence(section: BearersSection, lang: Lang): ClaimEvidence {
  return {
    // `bearersSentence` is only rendered for READY, where both are present.
    citation: section.citation as CitationDto,
    underlying_date: section.searched_on ?? "",
    confidence: section.confidence ?? { status: "INSUFFICIENT_DATA", methodology_code: "—" },
    notes: [UI[lang].limitationBearersFamily],
  };
}

/** The year in a catalogue date as it was stated ("1931-01-01", "[ca 1890]"); null when there is none. */
function archiveYear(date: string | null): string | null {
  return /\b(1[0-9]{3}|20[0-9]{2})\b/u.exec(date ?? "")?.[1] ?? null;
}

/**
 * The localities whose official name is the surname (TASK-090, ADR-0025
 * §2.7): the statement, then the warning line, then the list as the register
 * writes it. The caller renders the chapter only when at least one matches.
 */
function Localities({
  section,
  surname,
  number,
  next,
  lang,
  anchor = null,
}: {
  section: LocalitiesSection;
  surname: string;
  number: number;
  next: Step | null;
  lang: Lang;
  /** The chapter's id, where a page shows it twice (TASK-100). */
  anchor?: string | null;
}) {
  const t = UI[lang];
  const statement = localitiesSentence(section, surname, lang);
  if (statement === null) return null;
  const more = (section.total ?? 0) - section.places.length;
  return (
    <Chapter anchor={anchor} chapter="places" number={number} next={next} lang={lang}>
      <Claim
        statement={statement}
        evidence={localitiesEvidence(section, lang)}
        country_code="PL"
        lang={lang}
      >
        <p className="note places-note">{t.placesNote}</p>
      </Claim>
      <ul className="places">
        {section.places.map((entry) => (
          <li key={entry.place.id}>
            <span className="place-name">{entry.place.name}</span>
            <span className="place-kind">{localityKindLabel(entry.place.kind, lang)}</span>
            <span className="place-admin">{localityAdminLine(entry, lang)}</span>
          </li>
        ))}
      </ul>
      {more > 0 ? <p className="note">{localitiesMore(more, lang)}</p> : null}
    </Chapter>
  );
}

function localitiesEvidence(section: LocalitiesSection, lang: Lang): ClaimEvidence {
  const t = UI[lang];
  return {
    // `localitiesSentence` is only rendered for READY, where both are present.
    citation: section.citation as CitationDto,
    underlying_date: section.reference_date ?? "",
    confidence: section.confidence ?? { status: "INSUFFICIENT_DATA", methodology_code: "—" },
    notes: [t.placesNote, t.placesWhole],
  };
}

function archiveEvidence(section: ArchiveSection, lang: Lang): ClaimEvidence {
  return {
    // `archiveSentence` is only rendered for READY, where both are present.
    citation: section.citation as CitationDto,
    underlying_date: section.searched_on ?? "",
    confidence: section.confidence ?? { status: "INSUFFICIENT_DATA", methodology_code: "—" },
    notes: [UI[lang].limitationArchiveWord],
  };
}

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

function changeEvidence(entry: ChangeEntry, lang: Lang): ClaimEvidence {
  const t = UI[lang];
  return {
    citation: entry.citation,
    underlying_date: entry.summary.last.data_date,
    confidence: entry.confidence,
    notes: [t.changeListNote, t.limitationRounded, t.limitationSuppressed],
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
    ...(response.change?.entries ?? []).map((e) => changeEvidence(e, lang)),
    ...(meaning === null
      ? []
      : meaning.interpretations.map((i) => meaningEvidence(meaning, i, lang))),
    ...(response.archive?.state === "READY" ? [archiveEvidence(response.archive, lang)] : []),
    ...(response.localities?.state === "READY" && response.localities.places.length > 0
      ? [localitiesEvidence(response.localities, lang)]
      : []),
    ...(response.bearers?.state === "READY" ? [bearersEvidence(response.bearers, lang)] : []),
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
function Sources({
  evidence,
  next,
  lang,
}: {
  evidence: readonly ClaimEvidence[];
  next: Step | null;
  lang: Lang;
}) {
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
      <NextStep next={next} />
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
  after = null,
}: {
  response: SurnameResultResponse;
  lang: Lang;
  intent?: Intent;
  /** The step the page adds after the sources, if any (the surname page's summary). */
  after?: Step | null;
}) {
  const t = UI[lang];

  if (response.status === "RESOLVED" && response.surname !== null) {
    const surname = response.surname.display_name;
    const { population, rarity, distribution, change, meaning, archive, bearers } = response;
    const { neighbours, other_form: otherForm, localities } = response;
    const chapters: Record<SectionKey, ((number: number, next: Step | null) => ReactNode) | null> =
      {
        count:
          population === null
            ? null
            : (n, next) => (
                <Population
                  section={population}
                  surname={surname}
                  number={n}
                  next={next}
                  lang={lang}
                />
              ),
        rarity:
          rarity === null
            ? null
            : (n, next) => (
                <Rarity
                  section={rarity}
                  neighbours={neighbours}
                  otherForm={otherForm}
                  surname={surname}
                  number={n}
                  next={next}
                  lang={lang}
                />
              ),
        map:
          distribution === null
            ? null
            : (n, next) => (
                <Distribution
                  section={distribution}
                  surname={surname}
                  number={n}
                  next={next}
                  lang={lang}
                />
              ),
        // Hidden, not stated, when there is no claim: most surnames have none until
        // they are on two editions of a list, and a chapter saying so would be noise.
        change:
          change === null || change.state === "UNAVAILABLE"
            ? null
            : (n, next) => (
                <Change section={change} surname={surname} number={n} next={next} lang={lang} />
              ),
        meaning:
          meaning === null
            ? null
            : (n, next) => <Meaning section={meaning} number={n} next={next} lang={lang} />,
        archive:
          archive === null
            ? null
            : (n, next) => (
                <Archive section={archive} surname={surname} number={n} next={next} lang={lang} />
              ),
        // Shown only when a locality matches: no locality is not a chapter (TASK-090).
        places:
          localities === null || localities.state !== "READY" || localities.places.length === 0
            ? null
            : (n, next) => (
                <Localities
                  section={localities}
                  surname={surname}
                  number={n}
                  next={next}
                  lang={lang}
                />
              ),
        bearers:
          bearers === null
            ? null
            : (n, next) => (
                <Bearers section={bearers} surname={surname} number={n} next={next} lang={lang} />
              ),
      };
    const order = sectionOrder(intent).filter((key) => chapters[key] !== null);
    const evidence = pageEvidence(response, lang);
    const hasSources = evidence.length > 0;
    // The journey's steps in page order (TASK-053): each chapter, the sources,
    // then whatever the page adds. Each screen links to the one after it.
    const steps: Step[] = [
      ...order.map((key) => ({ href: `#${anchorOf(key)}`, label: t[sectionOf(key).title] })),
      ...(hasSources ? [{ href: `#${SOURCES_ANCHOR}`, label: t.chapterSourcesQuestion }] : []),
      ...(after === null ? [] : [after]),
    ];
    const nextAfter = (index: number): Step | null => steps[index + 1] ?? null;
    return (
      <div className="result">
        <Snapshot
          response={{ ...response, status: "RESOLVED" }}
          next={steps[0] ?? null}
          notice={
            response.other_spelling === null ? null : (
              <OtherSpellingLine other={response.other_spelling} lang={lang} />
            )
          }
          lang={lang}
        />
        <ChapterNav order={order} sources={hasSources} lang={lang} />
        {order.map((key, index) => (
          <Fragment key={key}>{chapters[key]?.(index + 1, nextAfter(index))}</Fragment>
        ))}
        <Sources
          evidence={evidence}
          next={hasSources ? nextAfter(order.length) : null}
          lang={lang}
        />
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

export { assessmentWord };

/** The surname page's own chapters, for the couple report's two sides (TASK-100). */
export { Bearers, Change, Distribution, Localities, Meaning, Population };
