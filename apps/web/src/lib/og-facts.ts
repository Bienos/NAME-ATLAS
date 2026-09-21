import type { SurnameResultResponse } from "@name-atlas/contracts";
import { formatDate, formatInteger, partitionLabel } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * What a share image may say (TASK-024; `docs/canonical/16` §120).
 *
 * Pure, and the whole vocabulary of the card: a surname, a count per partition,
 * `1 in X` only when the rarity section is READY, and the dataset date. A
 * rights-blocked, suppressed or unresolved surname yields a card that says
 * so and carries no number. Nothing here is a template that could write a
 * fact the payload does not carry.
 */
export interface OgFacts {
  readonly eyebrow: string;
  readonly surname: string;
  readonly lines: readonly string[];
  readonly caveat: string | null;
  readonly footer: string;
}

export function ogFacts(response: SurnameResultResponse | null, lang: Lang): OgFacts {
  const eyebrow = lang === "pl" ? "NAZWISKO" : "SURNAME";
  if (response === null || response.status !== "RESOLVED" || response.surname === null) {
    return {
      eyebrow,
      surname: "—",
      lines: [lang === "pl" ? "Nie znaleziono takiego nazwiska" : "No such surname was found"],
      caveat: null,
      footer: "",
    };
  }
  const surname = response.surname.display_name;
  const lines: string[] = [];
  let caveat: string | null = null;
  let footer = "";

  const population = response.population;
  if (population?.state === "READY") {
    const shown = population.observations.filter((o) => o.value.value !== null);
    // A count is never shown without its date (ARCHITECTURE.md §10 invariant 5).
    // Where every observation shares one, the footer carries it once; where they
    // differ — which the contract permits — each line carries its own, because a
    // single footer date would be wrong for at least one of them.
    const dates = new Set(shown.map((o) => o.snapshot_date));
    const oneDate = dates.size === 1;
    for (const o of shown) {
      const sex = partitionLabel(o.comparability_group, lang);
      const count = formatInteger(o.value.value ?? 0, lang);
      const date = oneDate ? "" : ` · ${formatDate(o.snapshot_date, lang)}`;
      lines.push(
        lang === "pl"
          ? `${count} osób${sex ? ` · ${sex}` : ""}${date}`
          : `${count} people${sex ? ` · ${sex}` : ""}${date}`,
      );
    }
    if (oneDate && shown[0]) footer = `PESEL · ${formatDate(shown[0].snapshot_date, lang)}`;
    else if (shown.length > 0) footer = "PESEL";
  } else if (population?.state === "RIGHTS_BLOCKED") {
    caveat = lang === "pl" ? "Liczby niedostępne z powodu licencji" : "Figures withheld by licence";
  } else {
    caveat =
      lang === "pl"
        ? "Zbiór nie podaje liczby dla tego nazwiska"
        : "The dataset publishes no count for this surname";
  }

  const rarity = response.rarity;
  if (rarity?.state === "READY") {
    // A `1 in X` means nothing without the universe it was computed in, and a
    // 1200×630 card has no room to name two of them. Where the entries share a
    // denominator the figures are commensurable and both are shown; where they
    // do not — the usual case, since each PESEL partition is its own published
    // universe — the card carries none, and the page carries all of them with
    // their universes. Better a card that says less than one that invites a
    // comparison the data does not support (caught by review 2026-09-21).
    const denominators = new Set(rarity.entries.map((e) => e.denominator));
    if (denominators.size === 1) {
      for (const e of rarity.entries) {
        const sex = partitionLabel(e.comparability_group, lang);
        const x = formatInteger(e.primary.value, lang);
        lines.push(
          lang === "pl"
            ? `około 1 na ${x}${sex ? ` · ${sex}` : ""}`
            : `about 1 in ${x}${sex ? ` · ${sex}` : ""}`,
        );
      }
    }
  }

  return { eyebrow, surname, lines, caveat, footer };
}
