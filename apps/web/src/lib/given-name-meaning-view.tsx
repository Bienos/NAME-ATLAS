import type { ReactNode } from "react";
import type { CitationDto } from "@name-atlas/contracts";
import type { GivenNameMeaningFacts } from "@name-atlas/truth";
import { assessmentWord } from "./messages.js";
import type { Lang } from "./messages.js";
import { Table } from "./report-table.js";

/**
 * A first name's origin and meaning, as each admissible work states it
 * (TASK-147, ADR-0045 §5; shared since TASK-156): one row per work with its
 * page, the origin it states in the project's word for the language with the
 * work's words beside it, the meaning verbatim, and on the Polish page Name
 * Atlas's literal translation of an English meaning, marked as ours. Then the
 * assessment, and the note on the translation.
 *
 * Rendered by the full-name report, the baby-names page and the couple page
 * from the same `GivenNameMeaningFacts`; it derives nothing. `note` lets the
 * report put a footnote number after a work; the pages list the citations
 * themselves.
 */

type Words = Readonly<Record<string, { readonly pl: string; readonly en: string }>>;

/** The language of origin a work states, by the code its file gives (TASK-147). */
export const ORIGINS: Words = {
  he: { pl: "hebrajskie", en: "Hebrew" },
  arc: { pl: "aramejskie", en: "Aramaic" },
  grc: { pl: "greckie", en: "Greek" },
  la: { pl: "łacińskie", en: "Latin" },
  gem: { pl: "germańskie", en: "Germanic" },
  sla: { pl: "słowiańskie", en: "Slavic" },
  lt: { pl: "litewskie", en: "Lithuanian" },
};

/** The project's word for an origin code, or the code itself when unknown. */
export function originWord(code: string, lang: Lang): string {
  return ORIGINS[code]?.[lang] ?? code;
}

export const GIVEN_NAME_MEANING_TEXT = {
  pl: {
    heading: "Pochodzenie i znaczenie",
    work: "Dzieło",
    origin: "Pochodzenie",
    meaning: "Znaczenie",
    quotation: "Słowa dzieła",
    assessment: "Ocena",
    quote: (text: string) => `„${text}”`,
    translatedBy: "przekład Name Atlas",
    translationNote:
      "Objaśnienia po angielsku przytaczamy dosłownie. Przekład na polski jest nasz (Name Atlas), dosłowny, i nie pochodzi z dzieła.",
    none: "Znaczenie imienia: żadne dzieło, które wolno nam cytować (z domeny publicznej albo za bezpłatną zgodą wydawcy), nie objaśnia tego imienia.",
    blocked: "Prawa źródła nie pozwalają tego pokazać.",
  },
  en: {
    heading: "Origin and meaning",
    work: "Work",
    origin: "Origin",
    meaning: "Meaning",
    quotation: "The work's words",
    assessment: "Assessment",
    quote: (text: string) => `“${text}”`,
    translatedBy: "translated by Name Atlas",
    translationNote: "",
    none: "The name's meaning: no work we may quote (in the public domain, or with its publisher's free permission) explains this name.",
    blocked: "The source's rights do not allow this to be shown.",
  },
} as const;

/** The works' citations, each once. */
export function meaningCitations(meaning: GivenNameMeaningFacts): CitationDto[] {
  if (meaning.state !== "READY") return [];
  const seen = new Set<string>();
  return meaning.works.flatMap((w) => {
    if (seen.has(w.citation.id)) return [];
    seen.add(w.citation.id);
    return [w.citation];
  });
}

export function GivenNameMeaningBlock({
  meaning,
  lang,
  note,
}: {
  meaning: GivenNameMeaningFacts;
  lang: Lang;
  /** A footnote mark for a work's citation, where the page numbers its sources. */
  note?: (citationId: string) => ReactNode;
}) {
  const t = GIVEN_NAME_MEANING_TEXT[lang];
  if (meaning.state === "RIGHTS_BLOCKED") return <p>{t.blocked}</p>;
  if (meaning.state !== "READY") return <p className="report-caveat">{t.none}</p>;
  const translated = lang === "pl" && meaning.works.some((w) => w.translation !== null);
  return (
    <>
      <Table
        head={[t.work, t.origin, t.meaning, t.quotation]}
        rows={meaning.works.map((w) => [
          <>
            {`${w.work.author_or_publisher}, ${w.work.title} (${w.work.year}), ${w.locator}`}
            {note === undefined ? null : note(w.citation.id)}
          </>,
          w.origin === null
            ? "—"
            : `${originWord(w.origin.code, lang)} (${t.quote(w.origin.as_printed)})`,
          w.literal_gloss === null ? (
            "—"
          ) : lang === "pl" && w.translation !== null ? (
            <>
              {t.quote(w.literal_gloss)}
              <br />
              {t.translatedBy}: {t.quote(w.translation.text)}
            </>
          ) : (
            t.quote(w.literal_gloss)
          ),
          t.quote(w.quotation),
        ])}
      />
      <p className="report-assessment">
        {t.assessment}: {assessmentWord(meaning.confidence.status, lang)}
      </p>
      {translated ? <p className="report-caveat">{t.translationNote}</p> : null}
    </>
  );
}
