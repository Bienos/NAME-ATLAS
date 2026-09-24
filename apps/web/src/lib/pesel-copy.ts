import type { PeselResourceRole } from "@name-atlas/sources/pesel";

/**
 * How the results page names each PESEL list. `title` is the publisher's own
 * resource title up to its date suffix (the full title is quoted verbatim in
 * the source card); `gloss` is a literal English rendering that keeps the
 * publisher's ambiguity — whether the lists divide people by sex or surnames
 * by grammatical form is not stated (`peselCoverageNotes`), and "male
 * surnames" does not decide it either.
 */
export const LIST_COPY: Readonly<Record<PeselResourceRole, { title: string; gloss: string }>> = {
  national_male: { title: "Nazwiska męskie", gloss: "male surnames" },
  national_female: { title: "Nazwiska żeńskie", gloss: "female surnames" },
};

/** `S01`, `S02` … — the source reference language of §17, in IBM Plex Mono. */
export function sourceRef(index: number): string {
  return `S${String(index + 1).padStart(2, "0")}`;
}
