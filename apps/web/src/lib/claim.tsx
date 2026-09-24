import type { ReactNode } from "react";
import type { CitationDto, ConfidenceDto } from "@name-atlas/contracts";
import { assessmentWord, formatDate, sourceKindWord } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * The one claim unit (TASK-023, directive §12–§15; evidence moved by ADR-0012).
 *
 * Every figure on the page is rendered through this: a statement, the
 * assessment as a **word**, the kind of source, and the scope and date.
 *
 * Confidence, source kind, scope and date are four different things and are
 * kept apart on purpose (§15): a 2014 regional dataset may be VERIFIED,
 * OFFICIAL and OLD at once, and collapsing those into one badge would hide
 * whichever one the reader needed.
 *
 * A claim no longer carries its own evidence panel. The project owner moved
 * the evidence to the foot of the page (ADR-0012, 2026-09-24): each source
 * once, linked to the website the data was taken from, and the notes a reader
 * needs to read the figures right. `ClaimEvidence.notes` is what each claim
 * contributes to those notes.
 *
 * Nothing here derives a fact. Every string is either a validated payload
 * field or a word from the `UI` table.
 */

export interface ClaimEvidence {
  readonly citation: CitationDto;
  /** The dataset's own reference date — never a portal or retrieval time. */
  readonly underlying_date: string;
  readonly confidence: ConfidenceDto;
  /**
   * What a reader must know to read the figure right: the dataset's own scope
   * where it helps, its limitations, and any disagreement between sources.
   * Shown once per page, at its foot (ADR-0012), not beside each claim.
   */
  readonly notes: readonly string[];
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
  /** Rendered after the statement and its meta line: a table, a note. */
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
    </article>
  );
}
