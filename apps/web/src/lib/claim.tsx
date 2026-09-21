import type { ReactNode } from "react";
import type { CitationDto, ConfidenceDto } from "@name-atlas/contracts";
import { assessmentWord, formatDate, sourceKindWord, UI } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * The one claim unit (TASK-023, directive §12–§15).
 *
 * Every figure on the page is rendered through this: a statement, the
 * assessment as a **word**, the kind of source, the scope and date, and the
 * evidence behind it — inline, one disclosure away, never only in a sources
 * list at the bottom.
 *
 * Confidence, source kind, scope and date are four different things and are
 * kept apart on purpose (§15): a 2014 regional dataset may be VERIFIED,
 * OFFICIAL and OLD at once, and collapsing those into one badge would hide
 * whichever one the reader needed.
 *
 * The evidence panel is a native `<details>`. It needs no script, is operated
 * from the keyboard with Enter or Space, exposes its state to assistive
 * technology, and returns focus to its own `<summary>` on close. That is the
 * whole accessibility contract of the directive's §13, met by the platform.
 *
 * Nothing here derives a fact. Every string is either a validated payload
 * field or a word from the `UI` table.
 */

export interface ClaimEvidence {
  readonly citation: CitationDto;
  /** The publisher's verbatim universe wording, or the coverage basis. */
  readonly scope: string;
  /** The dataset's own reference date — never a portal or retrieval time. */
  readonly underlying_date: string;
  readonly confidence: ConfidenceDto;
  /** Things the reader must know to read the figure right. */
  readonly limitations: readonly string[];
  /** Disagreements between sources, where any exist. */
  readonly contradictions: readonly string[];
}

export interface ClaimProps {
  readonly id?: string;
  readonly statement: string;
  readonly evidence: ClaimEvidence;
  readonly country_code: string;
  readonly lang: Lang;
  /**
   * Rendered **before** the statement. The distribution's coverage warning goes
   * here, because a reader must meet the caveat before the figure it qualifies
   * (TASK-012 §3) — a prop rather than a child so the order cannot be got wrong
   * at a call site.
   */
  readonly lead?: ReactNode;
  /** Rendered between the statement and the evidence: a table, a note. */
  readonly children?: ReactNode;
}

function countryWord(code: string, lang: Lang): string {
  if (code === "PL") return lang === "pl" ? "Polska" : "Poland";
  return code;
}

/** `Polska · Ministerstwo Cyfryzacji · 20 stycznia 2026 r.` */
export function scopeLine(evidence: ClaimEvidence, countryCode: string, lang: Lang): string {
  const provider = evidence.citation.publisher ?? evidence.citation.title;
  return `${countryWord(countryCode, lang)} · ${provider} · ${formatDate(evidence.underlying_date, lang)}`;
}

/** The date part of an ISO timestamp, or the value unchanged when it is not one. */
function datePart(iso: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/u.exec(iso);
  return match ? match[1]! : iso;
}

export function EvidencePanel({
  statement,
  evidence,
  lang,
}: {
  statement: string;
  evidence: ClaimEvidence;
  lang: Lang;
}) {
  const t = UI[lang];
  const c = evidence.citation;
  return (
    <details className="evidence">
      <summary>{t.viewEvidence}</summary>
      <dl className="evidence-list">
        <dt>{t.evidenceSourceTitle}</dt>
        <dd>{c.title}</dd>
        <dt>{t.evidenceProvider}</dt>
        <dd>{c.publisher ?? "—"}</dd>
        <dt>{t.evidenceSourceType}</dt>
        <dd>{sourceKindWord(c.source_type, lang)}</dd>
        <dt>{t.evidenceDataset}</dt>
        <dd>{evidence.scope}</dd>
        <dt>{t.evidenceUnderlyingDate}</dt>
        <dd>{formatDate(evidence.underlying_date, lang)}</dd>
        <dt>{t.evidencePublicationDate}</dt>
        <dd>{c.publication_date === null ? "—" : formatDate(c.publication_date, lang)}</dd>
        <dt>{t.evidenceRetrieved}</dt>
        <dd>{c.retrieved_at === null ? "—" : formatDate(datePart(c.retrieved_at), lang)}</dd>
        <dt>{t.evidenceLocator}</dt>
        <dd>
          {c.locator ?? "—"}
          {c.url === null ? null : (
            <>
              {" · "}
              <a href={c.url} rel="noopener noreferrer">
                {t.evidenceRecordLink}
              </a>
            </>
          )}
        </dd>
        <dt>{t.evidenceMethod}</dt>
        <dd>
          <code>{evidence.confidence.methodology_code}</code>
        </dd>
        <dt>{t.evidenceSupportedClaim}</dt>
        <dd>{statement}</dd>
        <dt>{t.confidenceLabel}</dt>
        <dd data-assessment={evidence.confidence.status}>
          {assessmentWord(evidence.confidence.status, lang)}
        </dd>
        <dt>{t.evidenceLimitations}</dt>
        <dd>
          {evidence.limitations.length === 0 ? (
            t.evidenceNoneRecorded
          ) : (
            <ul>
              {evidence.limitations.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </dd>
        <dt>{t.evidenceContradictions}</dt>
        <dd>
          {evidence.contradictions.length === 0 ? (
            t.evidenceNoneRecorded
          ) : (
            <ul>
              {evidence.contradictions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </dd>
        {c.terms === null ? null : (
          <>
            <dt>{t.licenceLabel}</dt>
            <dd>{c.terms}</dd>
          </>
        )}
        {c.attribution === null ? null : (
          <>
            <dt>{t.evidenceAttribution}</dt>
            <dd>{c.attribution}</dd>
          </>
        )}
      </dl>
    </details>
  );
}

export function Claim({ id, statement, evidence, country_code, lang, lead, children }: ClaimProps) {
  const status = evidence.confidence.status;
  return (
    <article className="claim" id={id}>
      {lead}
      <p className="claim-statement">{statement}</p>
      <p className="claim-meta">
        {/* Never colour alone: the word is the signal, the class only tints it. */}
        {/* The reader sees the word; the canonical status stays in the markup
            as `data-assessment` so it is machine-readable and testable without
            a number ever being shown (docs/canonical/16 §35). */}
        <span className={`assessment assessment-${status.toLowerCase()}`} data-assessment={status}>
          {assessmentWord(status, lang)}
        </span>
        <span className="claim-kind">{sourceKindWord(evidence.citation.source_type, lang)}</span>
        <span className="claim-scope">{scopeLine(evidence, country_code, lang)}</span>
      </p>
      {children}
      <EvidencePanel statement={statement} evidence={evidence} lang={lang} />
    </article>
  );
}
