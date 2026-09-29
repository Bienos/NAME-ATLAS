import type { CSSProperties } from "react";
import type { PlaceStat, SurnameResultResponse } from "@name-atlas/contracts";
import {
  assessmentWord,
  formatDate,
  formatInteger,
  formatPercent,
  partitionLabel,
  pluralPl,
  UI,
} from "./messages.js";
import type { Lang } from "./messages.js";
import { surnameEm } from "./surname-fit.js";

/**
 * The surname snapshot (TASK-023, directive §16): the first useful fact above
 * the fold on a phone, before any section.
 *
 * Structural rules, each asserted against markup in `result-view.test.ts`:
 *
 * - the count is shown **per partition** and the two are never summed;
 * - `1 in X` appears only when the rarity section is `READY`;
 * - the strongest voivodeship appears only when a distribution entry has
 *   `coverage_state = READY`, and is named as *registered residence*;
 * - the tally counts **statements** by their stored assessment, not independent
 *   facts: a rarity figure is arithmetic over the count above it, and calling
 *   the two separate facts would overstate what the evidence holds. It computes
 *   nothing.
 *
 * A surname with no count still gets a snapshot — with the absence stated —
 * because a low-data surname is not an error (§29).
 */

/** How many claims the payload carries per assessment. Presentation counting only. */
export function tally(response: SurnameResultResponse): Record<string, number> {
  const counts: Record<string, number> = {};
  const add = (status: string): void => {
    counts[status] = (counts[status] ?? 0) + 1;
  };
  for (const o of response.population?.observations ?? []) add(o.confidence.status);
  for (const e of response.rarity?.entries ?? []) add(e.confidence.status);
  for (const e of response.distribution?.entries ?? []) add(e.confidence.status);
  if (response.meaning?.state === "AVAILABLE" && response.meaning.confidence !== null) {
    add(response.meaning.confidence);
  }
  return counts;
}

function tallyLine(response: SurnameResultResponse, lang: Lang): string | null {
  const counts = tally(response);
  const parts: string[] = [];
  const verified = counts["VERIFIED"] ?? 0;
  const likely = counts["LIKELY"] ?? 0;
  const possible = counts["POSSIBLE"] ?? 0;
  const conflicting = counts["CONFLICTING"] ?? 0;
  if (lang === "pl") {
    if (verified > 0) {
      parts.push(
        `${formatInteger(verified, lang)} ${pluralPl(verified, "zweryfikowane stwierdzenie", "zweryfikowane stwierdzenia", "zweryfikowanych stwierdzeń")}`,
      );
    }
    if (likely > 0) {
      parts.push(
        `${formatInteger(likely, lang)} ${pluralPl(likely, "prawdopodobne ustalenie", "prawdopodobne ustalenia", "prawdopodobnych ustaleń")}`,
      );
    }
    if (possible > 0) {
      parts.push(
        `${formatInteger(possible, lang)} ${pluralPl(possible, "możliwe ustalenie", "możliwe ustalenia", "możliwych ustaleń")}`,
      );
    }
    if (conflicting > 0) parts.push("sprzeczne odczytania");
  } else {
    if (verified > 0)
      parts.push(
        `${formatInteger(verified, lang)} verified ${verified === 1 ? "statement" : "statements"}`,
      );
    if (likely > 0)
      parts.push(`${formatInteger(likely, lang)} likely ${likely === 1 ? "finding" : "findings"}`);
    if (possible > 0)
      parts.push(
        `${formatInteger(possible, lang)} possible ${possible === 1 ? "finding" : "findings"}`,
      );
    if (conflicting > 0) parts.push("sources disagree");
  }
  return parts.length === 0 ? null : parts.join(" · ");
}

export function Snapshot({
  response,
  lang,
}: {
  response: SurnameResultResponse & { status: "RESOLVED" };
  lang: Lang;
}) {
  const t = UI[lang];
  const surname = response.surname?.display_name ?? "";
  const population = response.population;
  const rarity = response.rarity;
  const distribution = response.distribution;
  const line = tallyLine(response, lang);

  const readyGeo =
    distribution?.state === "READY"
      ? distribution.entries.filter((e) => e.coverage_state === "READY")
      : [];

  /**
   * The strongest voivodeship, only where there **is** one.
   *
   * `regions` is ordered by count descending, but a tie is broken by whatever
   * the sort did — so naming `regions[0]` when the top two are equal would
   * present a sort artefact as a fact. A tie yields nothing here; the section's
   * own table shows both, which is the honest place for it. (Caught by review
   * 2026-09-21 against a fixture whose top two regions are tied.)
   */
  const strongest = readyGeo
    .map((entry) => ({ entry, top: entry.regions[0], second: entry.regions[1] }))
    .filter((r) => r.top !== undefined && (r.second === undefined || r.second.count < r.top.count))
    .map((r) => ({ entry: r.entry, top: r.top as PlaceStat }));

  return (
    <header className="snapshot" id="today">
      <p className="eyebrow">{t.searchLabel}</p>
      {/* Its measured width, for the stylesheet to fit it to one line (`surname-fit.ts`). */}
      <h2
        className="surname"
        style={{ "--surname-em": surnameEm(surname).toFixed(3) } as CSSProperties}
      >
        {surname}
      </h2>

      {population?.state === "READY" ? (
        <div className="hero" role="group" aria-label={t.sectionPopulation}>
          {population.observations.map((o, index) => (
            <div className="hero-figure" key={`${o.comparability_group ?? "g"}-${String(index)}`}>
              <span className="hero-number">
                {o.value.value === null ? "—" : formatInteger(o.value.value, lang)}
              </span>
              <span className="hero-label">
                {t.heroPeople}
                {partitionLabel(o.comparability_group, lang) === null
                  ? ""
                  : ` · ${partitionLabel(o.comparability_group, lang)!}`}
                {` · ${formatDate(o.snapshot_date, lang)}`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="absent">
          {population?.state === "RIGHTS_BLOCKED" ? t.heroRightsBlocked : t.heroNoCount}
        </p>
      )}

      {/* One line per entry, never joined with a separator.
          Each `1 in X` is computed within its **own** resource version's
          published universe, and the two partitions' universes are different
          sizes — so setting them side by side would invite exactly the
          cross-denominator comparison `compare.ts` refuses to make. They are
          stacked, and a second one says in words that they are not comparable.
          (Caught by review 2026-09-21.) */}
      {rarity?.state === "READY"
        ? rarity.entries.map((e, index) => {
            const sex = partitionLabel(e.comparability_group, lang);
            const x = formatInteger(e.primary.value, lang);
            const core = lang === "pl" ? `około 1 na ${x}` : `about 1 in ${x}`;
            return (
              <p className="hero-line" key={`${e.comparability_group ?? "g"}-${String(index)}`}>
                {sex === null ? core : `${core} · ${sex}`}
              </p>
            );
          })
        : null}
      {rarity?.state === "READY" && rarity.entries.length > 1 ? (
        <p className="tally">{t.rarityNotComparable}</p>
      ) : null}

      {strongest.length > 0 ? (
        <p className="hero-line">
          {t.heroStrongestRegion}:{" "}
          {strongest
            .map(({ entry, top }) => {
              const sex = partitionLabel(entry.comparability_group, lang);
              // The date travels with the figure: no count or share without it
              // (ARCHITECTURE.md §10 invariant 5).
              const core = `${top.display_name} (${formatPercent(top.share_of_covered, lang)}, ${formatDate(entry.snapshot_date, lang)})`;
              return sex === null ? core : `${core} — ${sex}`;
            })
            .join(" · ")}
        </p>
      ) : null}

      {line !== null ? <p className="tally">{line}</p> : null}
    </header>
  );
}

/** Exported for the sources section, so both count the same way. */
export { assessmentWord };
