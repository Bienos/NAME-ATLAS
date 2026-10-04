/**
 * The deck of cards over the surname page (TASK-055, ADR-0025).
 *
 * Each card is one answer the page already gives, drawn from the same
 * validated response with the same formatters: the deck derives nothing, and
 * a section that is not ready has no card. Faces are rendered here, on the
 * server, and handed to the client deck (`deck-client.tsx`), which only lays
 * them out, moves between them and closes. Each face carries its source and
 * date at its foot.
 */
import type { CSSProperties, ReactNode } from "react";
import type {
  ArchiveSection,
  BearersSection,
  ChangeEntry,
  CitationDto,
  DistributionEntry,
  LocalitiesSection,
  NeighbourList,
  OtherForm,
  SurnameResultResponse,
} from "@name-atlas/contracts";
import {
  archiveCategoryLabel,
  archivePeriodLabel,
  bearerYears,
  changeListLabel,
  coverageWarning,
  formatDate,
  formatInteger,
  formatPercent,
  formatPercentChange,
  localitiesMore,
  localitiesNoun,
  localityAdminLine,
  localityKindLabel,
  otherFormSentence,
  partitionLabel,
  reasonText,
  UI,
} from "./messages.js";
import type { Lang } from "./messages.js";
import { RarityScale } from "./rarity-scale.js";
import { VoivodeshipMap } from "./voivodeship-map.js";
import { mapInputs } from "./voivodeship-map-input.js";
import { ShareButton } from "./share-button.js";
import { comparePagePath, offerPath } from "./site-links.js";
import { inDeckOrder, oneInOf, rankOf } from "./deck-order.js";
import { SHARE_CARDS, shareCardFor, shareFacts, studioPath } from "./share-facts.js";
import type { ShareCardKey } from "./share-facts.js";

export interface DeckCard {
  /** Stable across renders: what the card answers. */
  readonly key: string;
  /** Its name in the list of cards. */
  readonly title: string;
  /** A card printed on paper rather than the dusk. */
  readonly paper?: boolean;
  readonly face: ReactNode;
  /** The share studio for this card's image (TASK-056, TASK-093); null when there is none to share. */
  readonly share: string | null;
}

/** A card as its builder makes it, before its share address is known. */
type CardFace = Omit<DeckCard, "share">;

export interface DeckLinks {
  /** This page's canonical path. */
  readonly path: string;
  /** The absolute address to share, or null when there is none to give. */
  readonly shareUrl: string | null;
}

/* ------------------------------------------------------------------------ */

function Face({
  eyebrow,
  aside,
  heading,
  source,
  children,
}: {
  eyebrow: string;
  aside?: string | null;
  heading?: ReactNode;
  source: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <p className="dk-eyebrow">
        <span>{eyebrow}</span>
        {aside ? <span>{aside}</span> : null}
      </p>
      {heading === undefined ? null : <h2 className="dk-heading">{heading}</h2>}
      <div className="dk-body">{children}</div>
      <p className="dk-source">{source}</p>
    </>
  );
}

/** "Rejestr PESEL · Ministerstwo Cyfryzacji · 20 stycznia 2026 r." from a claim's citation. */
function Source({ citation, date, lang }: { citation: CitationDto; date: string; lang: Lang }) {
  return (
    <>
      {citation.publisher ?? citation.title} · <b>{formatDate(date, lang)}</b>
    </>
  );
}

function oneInText(x: number, lang: Lang): string {
  const n = formatInteger(x, lang);
  return lang === "pl" ? `1 na ${n}` : `1 in ${n}`;
}

/* ------------------------------------------------------------------------ */

function hello(response: SurnameResultResponse, surname: string, lang: Lang): CardFace {
  const t = UI[lang];
  const population = response.population;
  const ready = population?.state === "READY" ? population.observations : [];
  const first = ready[0];
  return {
    key: "hello",
    title: t.deckHello,
    face: (
      <Face
        eyebrow={t.deckHelloEyebrow}
        aside={first === undefined ? null : formatDate(first.snapshot_date, lang)}
        source={
          first === undefined ? (
            "Name Atlas"
          ) : (
            <Source citation={first.citation} date={first.snapshot_date} lang={lang} />
          )
        }
      >
        <p
          className="dk-big dk-name"
          style={{ "--len": String(Math.max(4, [...surname].length)) } as CSSProperties}
        >
          {surname}
        </p>
        {ready.length === 0 ? (
          <p className="dk-note">
            {population === null
              ? t.noFigures
              : population.state === "RIGHTS_BLOCKED"
                ? t.noFigures
                : (reasonText(population.reason_code, lang) ?? t.noFigures)}
          </p>
        ) : (
          <>
            <div className="dk-pair">
              {ready.map((o, i) => (
                <div key={`${o.comparability_group ?? "g"}-${String(i)}`}>
                  <p className="dk-k">{partitionLabel(o.comparability_group, lang) ?? ""}</p>
                  <p className="dk-v">
                    {o.value.value === null ? "—" : formatInteger(o.value.value, lang)}
                    <small>{t.deckPeopleInRegister}</small>
                  </p>
                </div>
              ))}
            </div>
            {ready.length > 1 ? <p className="dk-note">{t.notSummed}</p> : null}
          </>
        )}
      </Face>
    ),
  };
}

/** One lit dot among X: drawn while X is small enough to count by eye. */
const DOTS_UP_TO = 400;

function Dots({ x, label }: { x: number; label: string }) {
  const columns = Math.ceil(Math.sqrt(x));
  // Not the first dot: one among many reads as one among many, not as first place.
  const lit = Math.floor(x * 0.62);
  return (
    <div
      className="dk-dots"
      role="img"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${String(columns)}, 1fr)` } as CSSProperties}
    >
      {Array.from({ length: x }, (_, i) => (
        <i key={i} className={i === lit ? "on" : undefined} />
      ))}
    </div>
  );
}

function rarity(response: SurnameResultResponse, lang: Lang): CardFace | null {
  const t = UI[lang];
  const section = response.rarity;
  if (section?.state !== "READY") return null;
  const entries = section.entries.filter((e) => oneInOf(e) !== null);
  const [lead, ...rest] = entries;
  if (lead === undefined) return null;
  const x = oneInOf(lead) as number;
  const figure =
    lang === "pl" ? `około 1 na ${formatInteger(x, lang)}` : `about 1 in ${formatInteger(x, lang)}`;
  const rank = rankOf(lead);
  return {
    key: "rarity",
    title: t.deckRarity,
    face: (
      <Face
        eyebrow={t.deckRarity}
        aside={partitionLabel(lead.comparability_group, lang)}
        heading={t.deckRarityHeading}
        source={<Source citation={lead.citation} date={lead.snapshot_date} lang={lang} />}
      >
        <p className="dk-big">{oneInText(x, lang)}</p>
        {x <= DOTS_UP_TO ? (
          <Dots x={x} label={figure} />
        ) : (
          <RarityScale oneIn={x} figure={figure} lang={lang} />
        )}
        {rank === null ? null : (
          <p className="dk-say">
            <b>#{formatInteger(rank, lang)}</b> {t.rankCaption}
          </p>
        )}
        {rest.map((e) => {
          const r = rankOf(e);
          return (
            <p className="dk-note" key={e.comparability_group ?? "other"}>
              {partitionLabel(e.comparability_group, lang)}: {oneInText(oneInOf(e) as number, lang)}
              {r === null ? "" : ` · #${formatInteger(r, lang)}`}
            </p>
          );
        })}
      </Face>
    ),
  };
}

function Ladder({ list, lang }: { list: NeighbourList; lang: Lang }) {
  return (
    <ol className="dk-ladder">
      {list.entries.map((e) => (
        <li
          key={e.surname.id}
          className={e.is_self ? "me" : undefined}
          aria-current={e.is_self ? "true" : undefined}
        >
          <span className="dk-r">#{formatInteger(e.rank, lang)}</span>
          <span className="dk-n">{e.surname.display_name}</span>
          <span className="dk-c">{formatInteger(e.count, lang)}</span>
        </li>
      ))}
    </ol>
  );
}

function neighbours(response: SurnameResultResponse, lang: Lang): CardFace | null {
  const t = UI[lang];
  const section = response.neighbours;
  if (section?.state !== "READY" || section.lists.length === 0) return null;
  const [first] = section.lists;
  if (first === undefined) return null;
  const several = section.lists.length > 1;
  return {
    key: "neighbours",
    title: t.deckNeighbours,
    face: (
      <Face
        eyebrow={t.neighboursHeading}
        aside={several ? null : partitionLabel(first.comparability_group, lang)}
        heading={t.deckNeighboursHeading}
        source={
          <>
            PESEL · <b>{formatDate(first.snapshot_date, lang)}</b>
          </>
        }
      >
        {/* Two lists side by side would not fit a phone. A pair of radio
            buttons picks one, with no script of its own. */}
        {several ? (
          <div className="dk-tabs">
            {section.lists.map((list, i) => (
              <input
                key={list.comparability_group}
                type="radio"
                name="dk-neighbours"
                id={`dk-nb-${String(i)}`}
                defaultChecked={i === 0}
                className={`dk-tab-input dk-tab-${String(i)}`}
              />
            ))}
            <div className="dk-tab-labels" role="presentation">
              {section.lists.map((list, i) => (
                <label key={list.comparability_group} htmlFor={`dk-nb-${String(i)}`}>
                  {partitionLabel(list.comparability_group, lang) ?? list.comparability_group}
                </label>
              ))}
            </div>
            {section.lists.map((list, i) => (
              <div key={list.comparability_group} className={`dk-tab-panel dk-panel-${String(i)}`}>
                <Ladder list={list} lang={lang} />
              </div>
            ))}
          </div>
        ) : (
          <Ladder list={first} lang={lang} />
        )}
        <p className="dk-note">{t.neighboursNote}</p>
      </Face>
    ),
  };
}

function where(response: SurnameResultResponse, lang: Lang): CardFace | null {
  const t = UI[lang];
  const section = response.distribution;
  if (section?.state !== "READY") return null;
  const entry: DistributionEntry | undefined = section.entries[0];
  if (entry === undefined) return null;
  const top = [...entry.regions].sort((a, b) => b.share_of_covered - a.share_of_covered)[0];
  const input = mapInputs([entry], lang);
  const warning = coverageWarning(entry, lang);
  return {
    key: "where",
    title: t.deckWhere,
    face: (
      <Face
        eyebrow={t.deckWhere}
        aside={partitionLabel(entry.comparability_group, lang)}
        heading={t.deckWhereHeading}
        source={<Source citation={entry.citation} date={entry.snapshot_date} lang={lang} />}
      >
        {/* The warning before any figure, as on the page (TASK-012 §3). */}
        {warning === null ? null : <p className="dk-warning">{warning}</p>}
        {top === undefined ? null : (
          <p className="dk-say">
            {t.deckWhereTop}: <b>{top.display_name}</b>, {formatPercent(top.share_of_covered, lang)}
          </p>
        )}
        {input === null ? null : (
          <div className="dk-map">
            <VoivodeshipMap
              regions={input.maps[0] ?? []}
              labels={{
                title: t.mapTitle,
                legendTitle: t.mapLegend,
                bandLabels: input.bandLabels,
                notListed: t.mapNotListed,
                hint: t.mapHint,
              }}
            />
          </div>
        )}
        <p className="dk-note">{t.coveredNote}</p>
      </Face>
    ),
  };
}

/** The known counts as a line, first and last labelled. A drawing of the table's rows, no more. */
function ChangeLine({ entry, lang }: { entry: ChangeEntry; lang: Lang }) {
  const known = entry.points.flatMap((p) => (p.status === "KNOWN" ? [p] : []));
  const first = known[0];
  const last = known.at(-1);
  if (first === undefined || last === undefined || known.length < 2) return null;
  const t0 = Date.parse(first.data_date);
  const t1 = Date.parse(last.data_date);
  const counts = known.map((p) => p.count);
  const lo = Math.min(...counts);
  const hi = Math.max(...counts);
  const pad = (hi - lo) * 0.25 || hi * 0.02;
  const W = 320;
  const H = 150;
  const x = (d: string) => 12 + ((Date.parse(d) - t0) / (t1 - t0 || 1)) * (W - 24);
  const y = (c: number) => 18 + (1 - (c - (lo - pad)) / (hi + pad - (lo - pad))) * (H - 46);
  const d = known
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.data_date).toFixed(1)},${y(p.count).toFixed(1)}`)
    .join("");
  const label = known
    .map((p) => `${formatDate(p.data_date, lang)}: ${formatInteger(p.count, lang)}`)
    .join("; ");
  return (
    <svg
      className="dk-chart"
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      role="img"
      aria-label={label}
    >
      <path className="dk-line" d={d} pathLength={1} />
      {known.map((p) => (
        <circle
          key={p.data_date}
          className="dk-pt"
          cx={x(p.data_date).toFixed(1)}
          cy={y(p.count).toFixed(1)}
          r="3.5"
        />
      ))}
      <text x={x(first.data_date)} y={H - 6}>
        {first.data_date.slice(0, 4)}
      </text>
      <text x={x(last.data_date)} y={H - 6} textAnchor="end">
        {last.data_date.slice(0, 4)}
      </text>
      <text className="dk-lab" x={x(first.data_date)} y={y(first.count) - 10}>
        {formatInteger(first.count, lang)}
      </text>
      <text
        className="dk-lab"
        x={x(last.data_date)}
        y={last.count < first.count ? y(last.count) + 20 : y(last.count) - 10}
        textAnchor="end"
      >
        {formatInteger(last.count, lang)}
      </text>
    </svg>
  );
}

function change(response: SurnameResultResponse, lang: Lang): CardFace | null {
  const t = UI[lang];
  const section = response.change;
  if (section?.state !== "READY") return null;
  const [lead, ...rest] = section.entries;
  if (lead === undefined) return null;
  const listLabel = (e: ChangeEntry) => changeListLabel(e.list, lang);
  return {
    key: "change",
    title: t.deckChange,
    face: (
      <Face
        eyebrow={t.deckChange}
        aside={listLabel(lead)}
        heading={t.chapterChangeTitle}
        source={
          <>
            {lead.citation.publisher ?? lead.citation.title} ·{" "}
            <b>
              {formatDate(lead.summary.first.data_date, lang)} –{" "}
              {formatDate(lead.summary.last.data_date, lang)}
            </b>
          </>
        }
      >
        <ChangeLine entry={lead} lang={lang} />
        <div className="dk-delta">
          <p>
            <b>{formatPercentChange(lead.summary.count_change_percent, lang)}</b>
            {t.deckChangeSurname}
          </p>
          <p>
            <b>{formatPercentChange(lead.summary.list_change_percent, lang)}</b>
            {t.deckChangeList}
          </p>
        </div>
        {rest.map((e) => (
          <p className="dk-note" key={e.list}>
            {listLabel(e)}: {formatPercentChange(e.summary.count_change_percent, lang)} (
            {t.deckChangeList} {formatPercentChange(e.summary.list_change_percent, lang)})
          </p>
        ))}
        <p className="dk-note">{t.deckChangeWhy}</p>
      </Face>
    ),
  };
}

function otherForm(response: SurnameResultResponse, surname: string, lang: Lang): CardFace | null {
  const t = UI[lang];
  const other: OtherForm | null = response.other_form;
  if (other === null) return null;
  const name = other.surname.display_name;
  const compare = `${comparePagePath(lang)}?${new URLSearchParams({ qa: surname, qb: name }).toString()}`;
  return {
    key: "other",
    title: t.deckOther,
    face: (
      <Face
        eyebrow={t.otherFormHeading}
        aside={partitionLabel(other.comparability_group, lang)}
        heading={
          <>
            {t.deckOtherHeading} <span className="dk-accent">{name}</span>.
          </>
        }
        source={
          <>
            PESEL · <b>{formatDate(other.snapshot_date, lang)}</b>
          </>
        }
      >
        <p className="dk-big">
          {formatInteger(other.count, lang)}
          <small> {partitionLabel(other.comparability_group, lang)}</small>
        </p>
        <p className="dk-say">{otherFormSentence(other, lang)}</p>
        <p className="dk-note">{t.otherFormNote}</p>
        <p className="dk-actions">
          <a href={compare}>
            {t.deckCompareForms} <span aria-hidden="true">→</span>
          </a>
        </p>
      </Face>
    ),
  };
}

function meaning(response: SurnameResultResponse, lang: Lang): CardFace | null {
  const t = UI[lang];
  const section = response.meaning;
  if (section?.state !== "AVAILABLE") return null;
  const [lead] = section.interpretations;
  if (lead === undefined) return null;
  return {
    key: "meaning",
    title: t.deckMeaning,
    face: (
      <Face
        eyebrow={t.deckMeaning}
        aside={t.deckInterpretation}
        heading={t.chapterMeaningTitle}
        source={
          <>
            {lead.work.author_or_publisher}, <i>{lead.work.title}</i>,{" "}
            <b>{String(lead.work.year)}</b>, {lead.locator}
          </>
        }
      >
        <p className="dk-note">{t.meaningInterpretationNote}</p>
        {section.confidence === "CONFLICTING" ? (
          <p className="dk-note">{t.meaningConflictNote}</p>
        ) : null}
        <blockquote className="dk-quote">
          <p>„{lead.literal_gloss}”</p>
        </blockquote>
      </Face>
    ),
  };
}

function archiveYear(date: string | null): string | null {
  return /\b(1[0-9]{3}|20[0-9]{2})\b/u.exec(date ?? "")?.[1] ?? null;
}

function print(archive: ArchiveSection, lang: Lang): CardFace | null {
  const t = UI[lang];
  if (archive.state !== "READY" || archive.pages === null || archive.pages === 0) return null;
  if (archive.searched_on === null) return null;
  const largest = Math.max(1, ...archive.pages_by_period.map((p) => p.count));
  const example = archive.examples[0];
  const year = example === undefined ? null : archiveYear(example.date);
  return {
    key: "print",
    title: t.deckPrint,
    paper: true,
    face: (
      <Face
        eyebrow={t.deckPrint}
        aside="Polona"
        source={
          <>
            {archive.citation?.attribution ?? "Polona"} ·{" "}
            <b>{formatDate(archive.searched_on, lang)}</b>
          </>
        }
      >
        <p className="dk-big">
          {formatInteger(archive.pages, lang)}
          <small> {t.deckPrintPages}</small>
        </p>
        {archive.pages_by_period.length > 0 ? (
          <ol className="dk-periods">
            {archive.pages_by_period.map((p) => (
              <li key={`${String(p.from_year)}-${String(p.to_year)}`}>
                <span>{archivePeriodLabel(p, lang)}</span>
                <i style={{ "--share": String(p.count / largest) } as CSSProperties} />
                <span>{formatInteger(p.count, lang)}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {example === undefined ? null : (
          <figure className="dk-example">
            <blockquote className="dk-quote" cite={example.url}>
              <p>„{example.excerpt}”</p>
            </blockquote>
            <figcaption className="dk-note">
              {example.title}
              {year === null ? "" : `, ${year}`}, {t.archivePage} {String(example.page_number)} ·{" "}
              <a href={example.url} rel="noopener noreferrer">
                {t.archiveOpen}
              </a>
            </figcaption>
          </figure>
        )}
        <p className="dk-note">{t.archiveWordCaveat}</p>
      </Face>
    ),
  };
}

function catalogue(archive: ArchiveSection, lang: Lang): CardFace | null {
  const t = UI[lang];
  if (archive.state !== "READY" || archive.catalogue_records === null) return null;
  if (archive.searched_on === null) return null;
  const kinds = archive.catalogue_by_category.filter((c) => c.count > 0).slice(0, 6);
  if (kinds.length === 0) return null;
  return {
    key: "catalogue",
    title: t.deckCatalogue,
    face: (
      <Face
        eyebrow={t.archiveByCategory}
        aside="Polona"
        heading={t.deckCatalogueHeading}
        source={
          <>
            {archive.citation?.attribution ?? "Polona"} ·{" "}
            {formatInteger(archive.catalogue_records, lang)} {t.deckCatalogueTotal} ·{" "}
            <b>{formatDate(archive.searched_on, lang)}</b>
          </>
        }
      >
        <ul className="dk-kinds">
          {kinds.map((c) => (
            <li key={c.label}>
              <b>{formatInteger(c.count, lang)}</b>
              <span>{archiveCategoryLabel(c.label, lang)}</span>
            </li>
          ))}
        </ul>
        <p className="dk-note">{t.archiveWordCaveat}</p>
      </Face>
    ),
  };
}

/** How many localities the card names; the total says what it leaves out. */
const PLACES_ON_CARD = 5;

/** TERYT's localities with the surname's name (TASK-090), the warning line on the card itself. */
function places(response: SurnameResultResponse, lang: Lang): CardFace | null {
  const t = UI[lang];
  const section: LocalitiesSection | null = response.localities;
  if (section?.state !== "READY" || section.places.length === 0) return null;
  if (section.total === null || section.reference_date === null || section.citation === null) {
    return null;
  }
  const shown = section.places.slice(0, PLACES_ON_CARD);
  const more = section.total - shown.length;
  return {
    key: "places",
    title: t.deckPlaces,
    face: (
      <Face
        eyebrow={t.deckPlaces}
        aside="TERYT"
        heading={t.deckPlacesHeading}
        source={
          <>
            {section.citation.publisher ?? section.citation.title} ·{" "}
            <b>{formatDate(section.reference_date, lang)}</b>
          </>
        }
      >
        <p className="dk-big">
          {formatInteger(section.total, lang)}
          <small> {localitiesNoun(section.total, lang)}</small>
        </p>
        <ul className="dk-places">
          {shown.map((entry) => (
            <li key={entry.place.id}>
              <b>{entry.place.name}</b>
              <span>
                {localityKindLabel(entry.place.kind, lang)} · {localityAdminLine(entry, lang)}
              </span>
            </li>
          ))}
        </ul>
        {more > 0 ? <p className="dk-note">{localitiesMore(more, lang)}</p> : null}
        <p className="dk-note">{t.placesNote}</p>
      </Face>
    ),
  };
}

function bearers(section: BearersSection, lang: Lang): CardFace | null {
  const t = UI[lang];
  if (section.state !== "READY" || section.total === null || section.total === 0) return null;
  if (section.searched_on === null || section.people.length === 0) return null;
  return {
    key: "bearers",
    title: t.deckBearers,
    face: (
      <Face
        eyebrow={t.deckBearers}
        aside="Wikidata"
        heading={t.chapterBearersTitle}
        source={
          <>
            Wikidata · {formatInteger(section.total, lang)} ·{" "}
            <b>{formatDate(section.searched_on, lang)}</b>
          </>
        }
      >
        <ol className="dk-bearers">
          {section.people.map((person) => {
            const years = bearerYears(person, lang);
            const what =
              lang === "pl"
                ? (person.description_pl ?? person.description_en)
                : (person.description_en ?? person.description_pl);
            return (
              <li key={person.wikidata_id}>
                <b>{person.name}</b>
                {years === null ? null : <span>{years}</span>}
                {what === null ? null : <small>{what}</small>}
              </li>
            );
          })}
        </ol>
        <p className="dk-note">{t.bearersCaveat}</p>
      </Face>
    ),
  };
}

function end(
  response: SurnameResultResponse,
  surname: string,
  links: DeckLinks,
  studio: string | null,
  lang: Lang,
): CardFace {
  const t = UI[lang];
  const cells: { k: string; v: string }[] = [];
  if (response.population?.state === "READY") {
    for (const o of response.population.observations) {
      if (o.value.value === null) continue;
      cells.push({
        k: `${t.navCount} · ${partitionLabel(o.comparability_group, lang) ?? ""}`,
        v: formatInteger(o.value.value, lang),
      });
    }
  }
  if (response.rarity?.state === "READY") {
    const lead = response.rarity.entries[0];
    const x = lead === undefined ? null : oneInOf(lead);
    const rank = lead === undefined ? null : rankOf(lead);
    if (x !== null && lead !== undefined) {
      cells.push({
        k: `${t.deckRarity} · ${partitionLabel(lead.comparability_group, lang) ?? ""}`,
        v: oneInText(x, lang),
      });
    }
    if (rank !== null && lead !== undefined) {
      cells.push({
        k: `${t.rankCaption} · ${partitionLabel(lead.comparability_group, lang) ?? ""}`,
        v: `#${formatInteger(rank, lang)}`,
      });
    }
  }
  if (response.archive?.state === "READY" && response.archive.pages !== null) {
    cells.push({ k: `Polona · ${t.deckPrint}`, v: formatInteger(response.archive.pages, lang) });
  }
  const compare = `${comparePagePath(lang)}?${new URLSearchParams({ qa: surname }).toString()}`;
  return {
    key: "end",
    title: t.deckEnd,
    face: (
      <Face
        eyebrow={t.deckEnd}
        aside={surname}
        heading={
          <>
            {surname} {t.deckEndHeading}
          </>
        }
        source="Name Atlas"
      >
        {cells.length > 0 ? (
          <dl className="dk-recap">
            {cells.slice(0, 4).map((c) => (
              <div key={c.k}>
                <dt>{c.k}</dt>
                <dd>{c.v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {studio === null ? (
          <div className="dk-actions">
            {links.shareUrl === null ? null : (
              <ShareButton url={links.shareUrl} title={`${surname} — ${t.title}`} lang={lang} />
            )}
            <a href={links.path} data-deck-close="">
              {t.deckFullPage} <span aria-hidden="true">↓</span>
            </a>
            <a href={compare}>
              {t.compareFromHere} <span aria-hidden="true">→</span>
            </a>
            <a href="#surname" data-deck-close="">
              {t.searchAnother} <span aria-hidden="true">→</span>
            </a>
            <a href={offerPath(lang)}>
              {t.deckOffer} <span aria-hidden="true">→</span>
            </a>
          </div>
        ) : (
          // The deck ends here (TASK-093, ADR-0034 §2.1): one way on, to the
          // share studio; the rest of the old card's ways moved there.
          <div className="dk-actions">
            <a className="dk-finish" href={studio}>
              {t.deckFinish} <span aria-hidden="true">→</span>
            </a>
            <a href={links.path} data-deck-close="">
              {t.deckFullPage} <span aria-hidden="true">↓</span>
            </a>
            <a href="#surname" data-deck-close="">
              {t.searchAnother} <span aria-hidden="true">→</span>
            </a>
          </div>
        )}
      </Face>
    ),
  };
}

/**
 * The cards for a resolved surname, in ADR-0025 §2.3's order: the surname,
 * rarity, neighbours, where, change, the other form, meaning, old print,
 * Polona's catalogue, the localities with the same name (TASK-090), the known
 * people with the surname (TASK-073) and the summary. Each card leads with the
 * surname's main list. Empty for anything that did not resolve.
 */
export function deckCards(given: SurnameResultResponse, lang: Lang, links: DeckLinks): DeckCard[] {
  if (given.status !== "RESOLVED" || given.surname === null) return [];
  const surname = given.surname.display_name;
  const response = inDeckOrder(given);
  const archive = response.archive;
  const cards = [
    hello(response, surname, lang),
    rarity(response, lang),
    neighbours(response, lang),
    where(response, lang),
    change(response, lang),
    otherForm(response, surname, lang),
    meaning(response, lang),
    archive === null ? null : print(archive, lang),
    archive === null ? null : catalogue(archive, lang),
    places(response, lang),
    response.bearers === null ? null : bearers(response.bearers, lang),
    end(response, surname, links, deckFinish(given, lang, links.path), lang),
  ];
  // Each card shares its own image, or the summary where it has none (TASK-056),
  // through the share studio, which holds the download gate (TASK-093 follow-up).
  const shareOf = (key: string): string | null => {
    const own = shareCardFor(key);
    if (shareFacts(given, own, lang) !== null) return studioPath(links.path, lang, own);
    return shareFacts(given, "summary", lang) === null
      ? null
      : studioPath(links.path, lang, "summary");
  };
  return cards
    .filter((card): card is CardFace => card !== null)
    .map((card) => ({ ...card, share: shareOf(card.key) }));
}

/**
 * The cards the share studio offers for a surname (TASK-093): those with an
 * image, the summary first. Empty when there is none, and then the deck keeps
 * its old ending.
 */
export function studioCards(given: SurnameResultResponse, lang: Lang): ShareCardKey[] {
  const ordered: ShareCardKey[] = ["summary", ...SHARE_CARDS.filter((card) => card !== "summary")];
  return ordered.filter((card) => shareFacts(given, card, lang) !== null);
}

/** Where the deck's end leads (TASK-093, ADR-0034 §2.1), or null when the studio has no card. */
export function deckFinish(
  given: SurnameResultResponse,
  lang: Lang,
  pagePath: string,
): string | null {
  const first = studioCards(given, lang)[0];
  return first === undefined ? null : studioPath(pagePath, lang, first);
}
