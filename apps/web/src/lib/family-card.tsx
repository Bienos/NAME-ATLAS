import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { CitationDto, ConfidenceDto, SurnameResultResponse } from "@name-atlas/contracts";
import { Claim } from "./claim.js";
import type { ClaimEvidence } from "./claim.js";
import {
  coverageWarning,
  distributionSentence,
  populationSentence,
  raritySentence,
  reasonText,
  rightsBlockedText,
  UI,
} from "./messages.js";
import type { Lang } from "./messages.js";
import { href, Result } from "./result-view.js";
import type { Card, Entry, Label } from "./family-state.js";

/**
 * One card of the family surnames view (TASK-040): the free result of one
 * surname, in compact form. No hooks and no script, so it renders to markup in
 * a test like the rest of the result view.
 *
 * **It derives nothing and it sees one card.** Its props hold a single card and
 * nothing about any other, so no value can be computed across surnames — no
 * sum, no combined rarity, no "which is rarer", no overlap (AC-10).
 *
 * Every figure goes through the page's own `Claim` unit and its own accepted
 * sentence, so a count carries its scope, date, source and assessment exactly
 * as `/pl/nazwisko/{slug}` shows it (AC-09). Compact means the counted facts
 * only: the maps, tables, meaning and sources section stay on the full page,
 * which the card links to (U-5).
 *
 * An unresolved or ambiguous answer renders the result view's own `Result`,
 * which is exactly the single-surname page's clarification state.
 */

/**
 * `noindex, nofollow`, like the comparison page: a tool page, never a search
 * landing (AC-13).
 *
 * `no-referrer`, because the browser otherwise sends this page's address as the
 * `Referer` of every lookup, and that one header would mark the request as a
 * family-view lookup and let an access log group a visitor's surnames as
 * family (AC-04, §9 item 2). Found by driving the built page in Chromium; a
 * `fetch` spy cannot see it, because the browser adds the header itself.
 */
export const FAMILY_METADATA: Metadata = {
  title: "Name Atlas",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** The two routes. Neither carries a surname, in its path or in a query. */
export const FAMILY_PATH: Record<Lang, string> = {
  pl: "/pl/nazwiska-rodzinne",
  en: "/en/family-surnames",
};

const LABEL_KEY = {
  SELF: "familyLabelSelf",
  FATHER: "familyLabelFather",
  MOTHER: "familyLabelMother",
  OTHER: "familyLabelOther",
} as const satisfies Record<Label, keyof (typeof UI)["pl"]>;

export function labelWord(label: Label, lang: Lang): string {
  return UI[lang][LABEL_KEY[label]];
}

/**
 * The input as the visitor typed it, for a card with no resolved name. React
 * escapes it; the bound only stops a pasted essay from becoming a heading.
 */
function typed(surname: string): string {
  const text = surname.trim();
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

function entryText(entry: Entry, lang: Lang): string {
  return entry.label === null
    ? typed(entry.surname)
    : `${typed(entry.surname)} (${labelWord(entry.label, lang)})`;
}

/** What the claim shows: its source, the dataset's own date and the assessment. */
function evidence(
  citation: CitationDto,
  snapshotDate: string,
  confidence: ConfidenceDto,
): ClaimEvidence {
  return { citation, underlying_date: snapshotDate, confidence, notes: [] };
}

/** The result view's words for a section that is not READY. Never a zero. */
function absent(state: string, reason: string | null, lang: Lang): string {
  return state === "RIGHTS_BLOCKED"
    ? rightsBlockedText(lang)
    : (reasonText(reason, lang) ?? UI[lang].noFigures);
}

function Fact({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="family-fact">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

function Facts({
  response,
  lang,
}: {
  response: SurnameResultResponse & { status: "RESOLVED" };
  lang: Lang;
}) {
  const t = UI[lang];
  const surname = response.surname?.display_name ?? "";
  const { population, rarity, distribution } = response;
  return (
    <>
      {population === null ? null : (
        <Fact title={t.sectionPopulation}>
          {population.state !== "READY" ? (
            <p className="absent">{absent(population.state, population.reason_code, lang)}</p>
          ) : (
            <>
              {population.observations.map((o, index) => (
                <Claim
                  key={`${o.comparability_group ?? "group"}-${String(index)}`}
                  statement={populationSentence(o, surname, lang)}
                  evidence={evidence(o.citation, o.snapshot_date, o.confidence)}
                  country_code={o.country_code}
                  lang={lang}
                />
              ))}
              {population.observations.length > 1 ? <p className="note">{t.notSummed}</p> : null}
            </>
          )}
        </Fact>
      )}
      {rarity === null ? null : (
        <Fact title={t.sectionRarity}>
          {rarity.state !== "READY" ? (
            <p className="absent">{absent(rarity.state, rarity.reason_code, lang)}</p>
          ) : (
            <>
              {rarity.entries.map((entry, index) => (
                <Claim
                  key={`${entry.comparability_group ?? "group"}-${String(index)}`}
                  statement={raritySentence(entry, surname, lang)}
                  evidence={evidence(entry.citation, entry.snapshot_date, entry.confidence)}
                  country_code={entry.country_code}
                  lang={lang}
                />
              ))}
              {rarity.entries.length > 1 ? <p className="note">{t.rarityNotComparable}</p> : null}
            </>
          )}
        </Fact>
      )}
      {distribution === null ? null : (
        <Fact title={t.sectionDistribution}>
          {distribution.state !== "READY" ? (
            <p className="absent">{absent(distribution.state, distribution.reason_code, lang)}</p>
          ) : (
            distribution.entries.map((entry, index) => {
              const statement = distributionSentence(entry, 0, surname, lang);
              if (statement === null) return null;
              const warning = coverageWarning(entry, lang);
              return (
                <Claim
                  key={`${entry.comparability_group ?? "group"}-${String(index)}`}
                  statement={statement}
                  // Before the figure it qualifies, as on the full page (TASK-012 §3).
                  lead={warning === null ? null : <p className="warning">{warning}</p>}
                  evidence={evidence(entry.citation, entry.snapshot_date, entry.confidence)}
                  country_code={entry.country_code}
                  lang={lang}
                />
              );
            })
          )}
        </Fact>
      )}
    </>
  );
}

function Body({
  state,
  lang,
  onRetry,
}: {
  state: Card["state"];
  lang: Lang;
  onRetry: (() => void) | undefined;
}) {
  const t = UI[lang];
  const retry =
    onRetry === undefined ? null : (
      <button type="button" className="family-retry" onClick={onRetry}>
        {t.familyRetry}
      </button>
    );
  switch (state.kind) {
    case "LOADING":
      return (
        <p className="note" role="status">
          {t.familyLoading}
        </p>
      );
    case "INVALID":
      return (
        <>
          <p className="family-state">{t.invalidHeading}</p>
          <p className="absent">{t.invalidBody}</p>
        </>
      );
    case "RATE_LIMITED":
      return (
        <>
          <p className="absent">{t.familyRateLimited}</p>
          {retry}
        </>
      );
    case "ERROR":
      // A failure is ours, never "no such surname".
      return (
        <>
          <p className="family-state">{t.unavailableHeading}</p>
          <p className="absent">{t.unavailableBody}</p>
          {state.retryable ? retry : null}
        </>
      );
    case "RESULT": {
      const { response } = state;
      if (response.status !== "RESOLVED" || response.surname === null) {
        return <Result response={response} lang={lang} />;
      }
      return (
        <>
          <Facts response={{ ...response, status: "RESOLVED" }} lang={lang} />
          <p className="again">
            <a href={href(response.surname.display_name, lang)}>{t.familyFullPage}</a>
          </p>
        </>
      );
    }
    default: {
      const unreachable: never = state;
      throw new Error(`unhandled card state: ${JSON.stringify(unreachable)}`);
    }
  }
}

export function FamilyCard({
  card,
  lang,
  onRetry,
}: {
  card: Card;
  lang: Lang;
  onRetry?: () => void;
}) {
  const t = UI[lang];
  const { state } = card;
  const resolved =
    state.kind === "RESULT" && state.response.status === "RESOLVED" ? state.response.surname : null;
  const first = card.entries[0];
  return (
    <article className="family-card">
      <h3 className="family-card-name">
        {resolved !== null
          ? resolved.display_name
          : first === undefined
            ? "—"
            : typed(first.surname)}
      </h3>
      <p className="family-card-inputs">
        {t.familyEntered}: {card.entries.map((entry) => entryText(entry, lang)).join(", ")}
      </p>
      <Body state={state} lang={lang} onRetry={onRetry} />
    </article>
  );
}
