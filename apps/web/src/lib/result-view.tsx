/**
 * The result view (TASK-017).
 *
 * Separated from `page.tsx` so it can be rendered in a test with
 * `renderToStaticMarkup`, no Next runtime and no database. That is what lets the
 * page's honesty rules be asserted against **rendered output** rather than
 * against intent: that two partitions never appear as a total, that a coverage
 * warning precedes its figures, that a rights-blocked section carries no value,
 * and that no score or percentage of confidence is anywhere on the page.
 *
 * Pure in the sense that matters: given a validated response it returns markup,
 * and it derives no fact. `page.tsx` keeps the request, the database and the
 * contract validation.
 */
import type {
  CitationDto,
  DistributionEntry,
  MeaningSection,
  PopulationSection,
  RaritySection,
  SurnameResultResponse,
  SuggestionsSection,
} from "@name-atlas/contracts";
import {
  coverageWarning,
  distributionSentence,
  explanationText,
  formatDate,
  formatInteger,
  formatPercent,
  populationSentence,
  rankSentence,
  raritySentence,
  reasonText,
  rightsBlockedText,
  UI,
} from "./messages.js";
import type { Lang } from "./messages.js";

export function href(surname: string, lang: Lang): string {
  const params = new URLSearchParams({ surname });
  if (lang === "en") params.set("lang", "en");
  return `/?${params.toString()}`;
}

function Provenance({ citation, lang }: { citation: CitationDto; lang: Lang }) {
  const t = UI[lang];
  return (
    <ul className="provenance">
      <li>
        {t.publisherLabel}: {citation.publisher ?? "—"} — {citation.title}
      </li>
      {citation.publication_date !== null ? (
        <li>
          {t.snapshotLabel}: {formatDate(citation.publication_date, lang)}
        </li>
      ) : null}
      {citation.terms !== null ? (
        <li>
          {t.licenceLabel}: {citation.terms}
        </li>
      ) : null}
    </ul>
  );
}

/** Confidence as its status word only: no number, no bar, no percentage (§35). */
function Confidence({ status, lang }: { status: string; lang: Lang }) {
  return (
    <p className="note">
      {UI[lang].confidenceLabel}: {status}
    </p>
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
      <section>
        <h3>{t.sectionPopulation}</h3>
        <p className="absent">
          {section.state === "RIGHTS_BLOCKED"
            ? rightsBlockedText(lang)
            : (reasonText(section.reason_code, lang) ?? t.noFigures)}
        </p>
      </section>
    );
  }
  return (
    <section>
      <h3>{t.sectionPopulation}</h3>
      {section.observations.map((observation, index) => (
        <div
          className="fact"
          key={`${observation.comparability_group ?? "group"}-${String(index)}`}
        >
          <p>{populationSentence(observation, surname, lang)}</p>
          <p className="note">
            {t.scopeLabel}: {observation.source_population_scope}
          </p>
          <Confidence status={observation.confidence.status} lang={lang} />
          <Provenance citation={observation.citation} lang={lang} />
        </div>
      ))}
      {section.observations.length > 1 ? <p className="note">{t.notSummed}</p> : null}
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
      <section>
        <h3>{t.sectionRarity}</h3>
        <p className="absent">
          {section.state === "RIGHTS_BLOCKED"
            ? rightsBlockedText(lang)
            : (reasonText(section.reason_code, lang) ?? t.noFigures)}
        </p>
      </section>
    );
  }
  return (
    <section>
      <h3>{t.sectionRarity}</h3>
      {section.entries.map((entry, index) => {
        const rank = rankSentence(entry, surname, lang);
        return (
          <div className="fact" key={`${entry.comparability_group ?? "group"}-${String(index)}`}>
            <p>{raritySentence(entry, surname, lang)}</p>
            {rank !== null ? <p>{rank}</p> : null}
            <Confidence status={entry.confidence.status} lang={lang} />
            <Provenance citation={entry.citation} lang={lang} />
          </div>
        );
      })}
    </section>
  );
}

/**
 * One regional entry. The coverage warning is rendered **before** any figure,
 * which is the order a reader must take them in and why it is a separate call
 * rather than a footnote (TASK-012 §3).
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
  const leading = distributionSentence(entry, 0, surname, lang);
  return (
    <div className="fact">
      {warning !== null ? <p className="warning">{warning}</p> : null}
      {leading !== null ? <p>{leading}</p> : null}
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
      <Confidence status={entry.confidence.status} lang={lang} />
      <Provenance citation={entry.citation} lang={lang} />
    </div>
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
      <section>
        <h3>{t.sectionDistribution}</h3>
        <p className="absent">
          {section.state === "RIGHTS_BLOCKED"
            ? rightsBlockedText(lang)
            : (reasonText(section.reason_code, lang) ?? t.noFigures)}
        </p>
      </section>
    );
  }
  return (
    <section>
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

/**
 * The meaning section (TASK-022, ADR-0008).
 *
 * The gap is rendered as a sentence, not as an absence. `NO_SOURCED_MEANING` is
 * the expected state for every surname until an onomastic source is imported,
 * and saying so plainly is the whole point of ADR-0008 §3 — the alternative is
 * an empty heading a reader reads as "we know nothing about this name", or
 * worse, a guess.
 *
 * Nothing here composes a gloss. Every string rendered either comes from the
 * claim verbatim or from the `UI` table; there is no template that could turn
 * a root and a language into a sentence the source did not write.
 */
/** A bibliographic reference: author, title (year), locator. */
function reference(interpretation: MeaningSection["interpretations"][number]): string {
  const { author_or_publisher, title, year } = interpretation.work;
  return `${author_or_publisher}, ${title} (${String(year)}), ${interpretation.locator}`;
}

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
      <section>
        <h3>{t.sectionMeaning}</h3>
        <p className="absent">{body}</p>
      </section>
    );
  }

  return (
    <section>
      <h3>{t.sectionMeaning}</h3>
      {/* Before the readings, not after: a reader must know these are
          interpretations before they read one as a fact. */}
      <p className="caveat">{t.meaningInterpretationNote}</p>
      {section.confidence === "CONFLICTING" ? (
        <p className="caveat">{t.meaningConflictNote}</p>
      ) : null}
      {section.interpretations.map((interpretation, index) => (
        <div className="fact" key={`${interpretation.work.title}-${String(index)}`}>
          {/* The work's own gloss, verbatim. */}
          <p className="gloss">{interpretation.literal_gloss}</p>
          <dl>
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
            <dd>{interpretation.formation_type}</dd>
            <dt>{t.meaningWorkLabel}</dt>
            {/* Composed in one expression: JSX would put a space before each
                comma and inside the parentheses. */}
            <dd>{reference(interpretation)}</dd>
            <dt>{t.confidenceLabel}</dt>
            <dd>{section.confidence}</dd>
          </dl>
        </div>
      ))}
    </section>
  );
}

export function Result({ response, lang }: { response: SurnameResultResponse; lang: Lang }) {
  const t = UI[lang];

  if (response.status === "RESOLVED" && response.surname !== null) {
    const surname = response.surname.display_name;
    return (
      <>
        <h2 className="surname">{surname}</h2>
        {response.population !== null ? (
          <Population section={response.population} surname={surname} lang={lang} />
        ) : null}
        {response.rarity !== null ? (
          <Rarity section={response.rarity} surname={surname} lang={lang} />
        ) : null}
        <Distribution response={response} surname={surname} lang={lang} />
        {response.meaning !== null ? <Meaning section={response.meaning} lang={lang} /> : null}
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
