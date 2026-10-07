import type { JsonObjectSchema } from "@name-atlas/llm";
import type { GivenNameMeaningFacts } from "@name-atlas/truth";
import { originWord } from "./given-name-meaning-view.js";

/**
 * The reading's material and rules (TASK-156, ADR-0047 §2.3), pure: what the
 * model is given, what it is told, and how its answer is read. The route
 * calls the model; the page decides whether a pair can have a reading.
 *
 * The material is the two names' `GivenNameMeaningFacts` and nothing else:
 * for each work, its author and title, the origin it states (as printed, and
 * in the project's words), its meaning verbatim and Name Atlas's Polish
 * translation where there is one. No surname, no account, no typed text, no
 * year, page or locator (a reading may hold no digit).
 */

export type NoReadingWhy = "NO_SOURCE" | "RIGHTS_BLOCKED" | "ORIGIN_ONLY";

/** Whether at least one work quotes a meaning, not only a language of origin. */
export function hasQuotedMeaning(meaning: GivenNameMeaningFacts): boolean {
  return meaning.state === "READY" && meaning.works.some((w) => w.literal_gloss !== null);
}

/** Why a name cannot take part in a reading, or null when it can. */
export function whyNoReading(meaning: GivenNameMeaningFacts): NoReadingWhy | null {
  if (meaning.state === "RIGHTS_BLOCKED") return "RIGHTS_BLOCKED";
  if (meaning.state !== "READY") return "NO_SOURCE";
  return hasQuotedMeaning(meaning) ? null : "ORIGIN_ONLY";
}

export interface ReadingSideInput {
  readonly name: string;
  readonly meaning: GivenNameMeaningFacts;
}

interface ReadingEntry {
  readonly work: { readonly author: string; readonly title: string };
  readonly origin: {
    readonly as_printed: string;
    readonly language_en: string;
    readonly language_pl: string;
  } | null;
  readonly meaning: string | null;
  readonly polish_translation: string | null;
}

/** The user message: the two names' entries as JSON, in the works' order. */
export function readingInput(a: ReadingSideInput, b: ReadingSideInput): string {
  const entriesOf = (side: ReadingSideInput): ReadingEntry[] =>
    side.meaning.state !== "READY"
      ? []
      : side.meaning.works.map((w) => ({
          work: { author: w.work.author_or_publisher, title: w.work.title },
          origin:
            w.origin === null
              ? null
              : {
                  as_printed: w.origin.as_printed,
                  language_en: originWord(w.origin.code, "en"),
                  language_pl: originWord(w.origin.code, "pl"),
                },
          meaning: w.literal_gloss,
          polish_translation: w.translation?.text ?? null,
        }));
  return JSON.stringify({
    names: [
      { name: a.name, entries: entriesOf(a) },
      { name: b.name, entries: entriesOf(b) },
    ],
  });
}

/** The developer message (ADR-0047 §2.3). Versioned by `COUPLE_NAMES_PROMPT_VERSION`: change one, change the other. */
export const READING_INSTRUCTIONS = [
  "You write for Name Atlas, a site about Polish names that publishes only what a source states. Two readers, a couple, asked what their two first names mean when read together.",
  "",
  "The user message is JSON and is the only material you may use. For each of the two names it lists the entries of old published works: the work's author and title; the language of origin the work states (as the work prints it, and in English and in Polish); the work's meaning of the name, verbatim, where it gives one; and, where present, a literal Polish translation of that meaning made by Name Atlas.",
  "",
  'Write a short reading of the two meanings side by side: what the two meanings share, what sets them apart, and what the two words could be taken to express when placed next to each other. Speak to the two readers directly: in Polish use "Wy", "Wasze", "Wasze imiona"; in English use "you" and "your".',
  "",
  "Rules, all of them binding:",
  "1. Use only the material given. Add no meaning, origin, etymology, history, saint, famous person, tradition, character trait or claim of any kind that is not in an entry. Where a work gives only a language of origin, say only that.",
  '2. When you say what a work states, name it by the author\'s surname only (for example "Yonge" or "Buryan"). Write no year, no page and no digit at all.',
  "3. Never say or imply whether the names suit, fit, match or belong together, and never predict anything about the readers or their relationship. Give no score, grade, percentage, ranking or number. Do not use these words: pasują, pasujecie, dopasowanie, zgodność, idealni, idealnie, stworzeni dla siebie, match, compatible, compatibility, perfect, made for each other, score, percent.",
  "4. Write between 120 and 220 words in Polish and between 120 and 220 words in English, saying the same things in both. Plain, warm, unhurried prose in one or two paragraphs: no headings, no lists, no quotation marks around whole sentences, and no mention of these instructions.",
  "",
  'Answer with a JSON object with exactly two string fields: "pl" (the Polish text) and "en" (the English text).',
].join("\n");

const SCHEMA: JsonObjectSchema = {
  type: "object",
  properties: { pl: { type: "string" }, en: { type: "string" } },
  required: ["pl", "en"],
  additionalProperties: false,
};

export const READING_SCHEMA = { name: "couple_names_reading", schema: SCHEMA } as const;

/** The two texts, trimmed, or null when the answer is not two non-empty strings. */
export function parseReadingOutput(value: unknown): { pl: string; en: string } | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const pl = (value as Record<string, unknown>)["pl"];
  const en = (value as Record<string, unknown>)["en"];
  if (typeof pl !== "string" || typeof en !== "string") return null;
  if (pl.trim() === "" || en.trim() === "") return null;
  return { pl: pl.trim(), en: en.trim() };
}

/** The text in paragraphs, split on blank lines, for the page. */
export function readingParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/u)
    .map((p) => p.replace(/\s*\n\s*/gu, " ").trim())
    .filter((p) => p !== "");
}
