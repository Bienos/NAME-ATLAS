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
 * assessment word, source kind, scope and date, inline evidence — and the page
 * opens with a `Snapshot`. Sections carry `docs/canonical/21` §34's stable ids.
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
  PopulationSection,
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
import type { MapRegion } from "./voivodeship-map.js";
import { mapClass, mapScale } from "./voivodeship-map-scale.js";

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
        const evidence: ClaimEvidence = {
          citation: observation.citation,
          scope: observation.source_population_scope,
          underlying_date: observation.snapshot_date,
          confidence: observation.confidence,
          limitations: [
            t.limitationSuppressed,
            // The partition ambiguity TASK-004 §14 U-1 records, localised. The
            // stored `coverage_notes` says it too, but in this project's own
            // English prose — not a publisher quotation — so rendering it
            // verbatim would put untranslated internal text on a Polish page.
            // It stays internal, where the admin inspector shows it.
            ...(observation.comparability_group === null ? [] : [t.limitationPartition]),
            ...(several ? [t.limitationNotSummed] : []),
          ],
          contradictions: [],
        };
        return (
          <Claim
            key={`${observation.comparability_group ?? "group"}-${String(index)}`}
            statement={populationSentence(observation, surname, lang)}
            evidence={evidence}
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
        const denominator = formatInteger(entry.denominator, lang);
        const evidence: ClaimEvidence = {
          citation: entry.citation,
          scope:
            lang === "pl"
              ? `Mianownik: ${denominator} osób ujętych w rejestrze PESEL — suma opublikowanych liczb w tym zbiorze, nie ludność Polski.`
              : `Denominator: ${denominator} people counted in the PESEL register — the sum of the published counts in this dataset, not Poland's population.`,
          underlying_date: entry.snapshot_date,
          confidence: entry.confidence,
          limitations: [t.limitationRounded, t.limitationSuppressed],
          contradictions: [],
        };
        return (
          <Claim
            key={`${entry.comparability_group ?? "group"}-${String(index)}`}
            statement={raritySentence(entry, surname, lang)}
            evidence={evidence}
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

/** A band edge as whole or half percentage points: "4%", "2,5%". */
function bandEdge(fraction: number, lang: Lang): string {
  const pct = Math.round(fraction * 1000) / 10;
  const text = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
  return `${lang === "pl" ? text.replace(".", ",") : text}%`;
}

/**
 * The entry's regions as map input, or null when any region lacks a TERC code:
 * such a region could not be placed, and leaving it off would draw it as "not
 * listed", which the data contradicts. The table is then the whole view.
 */
function mapInput(
  entry: DistributionEntry,
  lang: Lang,
): { regions: MapRegion[]; bandLabels: string[] } | null {
  if (entry.regions.some((r) => r.terc_code === null)) return null;
  const scale = mapScale(entry.regions.map((r) => r.share_of_covered));
  return {
    regions: entry.regions.map((r) => ({
      terc_code: r.terc_code as string,
      display_name: r.display_name,
      count_text: formatInteger(r.count, lang),
      share_text: formatPercent(r.share_of_covered, lang),
      band: mapClass(scale, r.share_of_covered),
    })),
    bandLabels: scale.bounds.map(
      (lo) => `${bandEdge(lo, lang)}–${bandEdge(lo + scale.step, lang)}`,
    ),
  };
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
  const map = mapInput(entry, lang);
  const evidence: ClaimEvidence = {
    citation: entry.citation,
    scope: entry.coverage_basis,
    underlying_date: entry.snapshot_date,
    confidence: entry.confidence,
    limitations: [t.limitationRegistered, t.coveredNote, ...(warning === null ? [] : [warning])],
    contradictions: [],
  };
  return (
    <Claim
      statement={leading}
      lead={warning === null ? null : <p className="warning">{warning}</p>}
      evidence={evidence}
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

/** A work as a citation, so a meaning claim's evidence panel has the same rows as every other. */
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
  };
}

/**
 * The meaning section (TASK-022, ADR-0008; restructured by TASK-023).
 *
 * The gap is rendered as a sentence, not as an absence. Nothing here composes
 * a gloss: every string either comes from the claim verbatim or from the `UI`
 * table. On a conflict every reading is shown and each one's evidence lists
 * the others as contradictions.
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
        const others = section.interpretations.filter((_, i) => i !== index);
        const evidence: ClaimEvidence = {
          citation: workCitation(interpretation),
          scope: `${interpretation.work.author_or_publisher}, ${interpretation.work.title} (${String(interpretation.work.year)})`,
          underlying_date: String(interpretation.work.year),
          confidence: {
            status: section.confidence ?? "INSUFFICIENT_DATA",
            methodology_code: section.methodology_code ?? "—",
          },
          limitations: [t.limitationInterpretation],
          contradictions: conflicting
            ? others.map(
                (o) => `${o.work.author_or_publisher} (${String(o.work.year)}): ${o.literal_gloss}`,
              )
            : [],
        };
        return (
          <Claim
            key={`${interpretation.work.title}-${String(index)}`}
            statement={interpretation.literal_gloss}
            evidence={evidence}
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

/** Every distinct citation on the page, once (`#sources`). */
function Sources({ response, lang }: { response: SurnameResultResponse; lang: Lang }) {
  const t = UI[lang];
  const seen = new Map<string, CitationDto>();
  for (const o of response.population?.observations ?? []) seen.set(o.citation.id, o.citation);
  for (const e of response.rarity?.entries ?? []) seen.set(e.citation.id, e.citation);
  for (const e of response.distribution?.entries ?? []) seen.set(e.citation.id, e.citation);
  for (const i of response.meaning?.interpretations ?? []) {
    const c = workCitation(i);
    seen.set(c.id, c);
  }
  if (seen.size === 0) return null;
  return (
    <section id="sources">
      <h3>{t.sectionSourcesAll}</h3>
      <ul className="sources">
        {[...seen.values()].map((c) => (
          <li key={c.id}>
            <span className="source-kind">{sourceKindWord(c.source_type, lang)}</span>{" "}
            {c.publisher === null ? c.title : `${c.publisher} — ${c.title}`}
            {c.publication_date === null ? "" : ` · ${formatDate(c.publication_date, lang)}`}
            {c.terms === null ? "" : ` · ${c.terms}`}
            {c.url === null ? null : (
              <>
                {" · "}
                <a href={c.url} rel="noopener noreferrer">
                  {t.evidenceRecordLink}
                </a>
              </>
            )}
          </li>
        ))}
      </ul>
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
