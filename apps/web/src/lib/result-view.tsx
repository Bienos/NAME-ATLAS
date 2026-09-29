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
import type { ReactNode } from "react";
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
  assessmentWord,
  coverageWarning,
  distributionSentence,
  explanationText,
  formatDate,
  formationWord,
  formatInteger,
  formatPercent,
  populationSentence,
  rankSentence,
  raritySentence,
  reasonText,
  rightsBlockedText,
  sourceKindWord,
  UI,
} from "./messages.js";
import type { Intent, Lang } from "./messages.js";
import { Snapshot } from "./snapshot.js";
import { VoivodeshipMap } from "./voivodeship-map.js";
import { mapInputs } from "./voivodeship-map-input.js";

export function href(surname: string, lang: Lang): string {
  const params = new URLSearchParams({ surname });
  if (lang === "en") params.set("lang", "en");
  return `/?${params.toString()}`;
}

function Absent({
  heading,
  id,
  state,
  reason,
  lang,
}: {
  heading: string;
  id: string;
  state: string;
  reason: string | null;
  lang: Lang;
}) {
  const t = UI[lang];
  return (
    <section id={id}>
      <h3>{heading}</h3>
      <p className="absent">
        {state === "RIGHTS_BLOCKED"
          ? rightsBlockedText(lang)
          : (reasonText(reason, lang) ?? t.noFigures)}
      </p>
    </section>
  );
}

function Population({
  section,
  surname,
  lang,
}: {
  section: PopulationSection;
  surname: string;
  lang: Lang;
}) {
  const t = UI[lang];
  if (section.state !== "READY") {
    return (
      <Absent
        heading={t.sectionPopulation}
        id="today-count"
        state={section.state}
        reason={section.reason_code}
        lang={lang}
      />
    );
  }
  const several = section.observations.length > 1;
  return (
    <section id="today-count">
      <h3>{t.sectionPopulation}</h3>
      {section.observations.map((observation, index) => {
        return (
          <Claim
            key={`${observation.comparability_group ?? "group"}-${String(index)}`}
            statement={populationSentence(observation, surname, lang)}
            evidence={populationEvidence(observation, several, lang)}
            country_code={observation.country_code}
            lang={lang}
          />
        );
      })}
      {several ? <p className="note">{t.notSummed}</p> : null}
    </section>
  );
}

function Rarity({
  section,
  surname,
  lang,
}: {
  section: RaritySection;
  surname: string;
  lang: Lang;
}) {
  const t = UI[lang];
  if (section.state !== "READY") {
    return (
      <Absent
        heading={t.sectionRarity}
        id="rarity"
        state={section.state}
        reason={section.reason_code}
        lang={lang}
      />
    );
  }
  return (
    <section id="rarity">
      <h3>{t.sectionRarity}</h3>
      {section.entries.map((entry, index) => {
        const rank = rankSentence(entry, surname, lang);
        return (
          <Claim
            key={`${entry.comparability_group ?? "group"}-${String(index)}`}
            statement={raritySentence(entry, surname, lang)}
            evidence={rarityEvidence(entry, lang)}
            country_code={entry.country_code}
            lang={lang}
          >
            {rank !== null ? <p>{rank}</p> : null}
          </Claim>
        );
      })}
    </section>
  );
}

/**
 * One regional entry. The coverage warning is rendered **before** any figure,
 * which is the order a reader must take them in and why it is the claim's
 * lead rather than a footnote (TASK-012 §3).
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
  return (
    <Claim
      statement={leading}
      lead={warning === null ? null : <p className="warning">{warning}</p>}
      evidence={distributionEvidence(entry, lang)}
      country_code={entry.country_code}
      lang={lang}
    >
      {/* Its own scroll container, so a table can never widen the document.
          Sixteen rows of voivodeship names — `ZACHODNIOPOMORSKIE`,
          `WARMIŃSKO-MAZURSKIE` — beside two numeric columns is the widest
          thing on the page. Verified at a true 320px viewport: the names wrap
          inside the first column and nothing overflows, so this container does
          not scroll today; it is what keeps a longer name from clipping the
          page instead of scrolling its own table. `tabindex` and
          `role="region"` are what make a scrollable area reachable from the
          keyboard when it does scroll. */}
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
      <div className="table-scroll" tabIndex={0} role="region" aria-label={t.regionsHeading}>
        <table>
          <caption>{t.coveredNote}</caption>
          <thead>
            <tr>
              <th scope="col">{t.regionColumn}</th>
              <th scope="col">{t.countColumn}</th>
              <th scope="col">{t.shareColumn}</th>
            </tr>
          </thead>
          <tbody>
            {entry.regions.map((region) => (
              <tr key={region.place_id}>
                <th scope="row">{region.display_name}</th>
                <td>{formatInteger(region.count, lang)}</td>
                <td>{formatPercent(region.share_of_covered, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Claim>
  );
}

function Distribution({
  response,
  surname,
  lang,
}: {
  response: SurnameResultResponse;
  surname: string;
  lang: Lang;
}) {
  const t = UI[lang];
  const section = response.distribution;
  if (section === null) return null;
  if (section.state !== "READY") {
    return (
      <Absent
        heading={t.sectionDistribution}
        id="where"
        state={section.state}
        reason={section.reason_code}
        lang={lang}
      />
    );
  }
  return (
    <section id="where">
      <h3>{t.sectionDistribution}</h3>
      {section.entries.map((entry, index) => (
        <DistributionFact
          key={`${entry.comparability_group ?? "group"}-${String(index)}`}
          entry={entry}
          surname={surname}
          lang={lang}
        />
      ))}
    </section>
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
function Meaning({ section, lang }: { section: MeaningSection; lang: Lang }) {
  const t = UI[lang];
  if (section.state !== "AVAILABLE") {
    const body =
      section.state === "NO_SOURCED_MEANING"
        ? t.meaningNoSource
        : section.state === "RIGHTS_BLOCKED"
          ? t.meaningBlocked
          : t.meaningUnavailable;
    return (
      <section id="meaning">
        <h3>{t.sectionMeaning}</h3>
        <p className="absent">{body}</p>
      </section>
    );
  }
  const conflicting = section.confidence === "CONFLICTING";
  return (
    <section id="meaning">
      <h3>{t.sectionMeaning}</h3>
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
    </section>
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
function Sources({ response, lang }: { response: SurnameResultResponse; lang: Lang }) {
  const t = UI[lang];
  const evidence = pageEvidence(response, lang);
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
    <section id="sources">
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

type SectionKey = "count" | "rarity" | "map" | "meaning";

/** Default order per directive §17; an intent moves one section first. Presentation only. */
export function sectionOrder(intent: Intent): readonly SectionKey[] {
  const base: SectionKey[] = ["count", "rarity", "map", "meaning"];
  if (intent === "default") return base;
  const first: SectionKey = intent === "rarity" ? "rarity" : intent === "map" ? "map" : "meaning";
  return [first, ...base.filter((k) => k !== first)];
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
    const sections: Record<SectionKey, ReactNode> = {
      count:
        response.population !== null ? (
          <Population section={response.population} surname={surname} lang={lang} />
        ) : null,
      rarity:
        response.rarity !== null ? (
          <Rarity section={response.rarity} surname={surname} lang={lang} />
        ) : null,
      map: <Distribution response={response} surname={surname} lang={lang} />,
      meaning:
        response.meaning !== null ? <Meaning section={response.meaning} lang={lang} /> : null,
    };
    return (
      <>
        <Snapshot response={{ ...response, status: "RESOLVED" }} lang={lang} />
        {sectionOrder(intent).map((key) => (
          <div key={key}>{sections[key]}</div>
        ))}
        <Sources response={response} lang={lang} />
      </>
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
