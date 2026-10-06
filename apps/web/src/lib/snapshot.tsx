import type { CSSProperties, ReactNode } from "react";
import type {
  DistributionEntry,
  PlaceStat,
  RarityEntry,
  SurnameResultResponse,
} from "@name-atlas/contracts";
import {
  formatDate,
  formatInteger,
  formatPercent,
  partitionLabel,
  pluralPl,
  UI,
} from "./messages.js";
import type { Lang } from "./messages.js";
import { surnameEm } from "./surname-fit.js";
import { NextStep } from "./next-step.js";
import { SNAPSHOT_ANCHOR } from "./sections.js";
import { answerSentence } from "./surname-seo.js";
import type { Step } from "./next-step.js";

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
  next = null,
  notice = null,
  lang,
}: {
  response: SurnameResultResponse & { status: "RESOLVED" };
  /** The journey's first step, linked at the foot of the first screen (TASK-053). */
  next?: Step | null;
  /** A line under the answer: the other spelling (TASK-131). */
  notice?: ReactNode;
  lang: Lang;
}) {
  const t = UI[lang];
  const surname = response.surname?.display_name ?? "";
  const population = response.population;
  const rarity = response.rarity;
  const distribution = response.distribution;
  const line = tallyLine(response, lang);
  const answer = answerSentence(response, surname, lang);

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

  const rarityEntries = rarity?.state === "READY" ? rarity.entries : [];
  const observations = population?.state === "READY" ? population.observations : [];
  const listOf = (group: string | null): string | null => partitionLabel(group, lang);
  const columns = observations.map((o) => listOf(o.comparability_group));
  const hasColumn = (label: string | null): boolean => label !== null && columns.includes(label);

  const oneIn = (entry: RarityEntry): string => {
    const x = formatInteger(entry.primary.value, lang);
    return lang === "pl" ? `około 1 na ${x}` : `about 1 in ${x}`;
  };
  // The date travels with the share: no count or share without it
  // (ARCHITECTURE.md §10 invariant 5).
  const regionText = ({ entry, top }: { entry: DistributionEntry; top: PlaceStat }): string =>
    `${top.display_name} (${formatPercent(top.share_of_covered, lang)}, ${formatDate(entry.snapshot_date, lang)})`;

  return (
    <header className="snapshot" id={SNAPSHOT_ANCHOR}>
      {/* The page's one heading (TASK-123, `docs/canonical/21` §63): the
          eyebrow and the surname read as "Nazwisko NOWAK". The surname keeps
          its measured width, for the stylesheet to fit it to one line
          (`surname-fit.ts`). */}
      <h1 className="snapshot-title">
        <span className="eyebrow">{t.searchLabel}</span>{" "}
        <span
          className="surname"
          style={{ "--surname-em": surnameEm(surname).toFixed(3) } as CSSProperties}
        >
          {surname}
        </span>
      </h1>
      {/* The answer first (§64): the counts with their date, as text. */}
      {answer !== null ? <p className="snapshot-answer">{answer}</p> : null}
      {line !== null ? <p className="tally">{line}</p> : null}
      {notice}

      {/* One column per register list: its count, its 1 in X and its strongest
          voivodeship, matched to the column by the list each claim belongs to,
          never by position. The columns stand side by side and are never
          added up; the lists' 1-in-X figures are never joined on one line,
          because each is computed within its own list's universe and the two
          universes are different sizes (review 2026-09-21). */}
      {population?.state === "READY" ? (
        <div className="hero" role="group" aria-label={t.sectionPopulation}>
          {observations.map((o, index) => {
            const label = listOf(o.comparability_group);
            const entry =
              label === null
                ? undefined
                : rarityEntries.find((e) => listOf(e.comparability_group) === label);
            const region =
              label === null
                ? undefined
                : strongest.find((r) => listOf(r.entry.comparability_group) === label);
            return (
              <div className="hero-figure" key={`${o.comparability_group ?? "g"}-${String(index)}`}>
                {label === null ? null : <p className="hero-list">{label}</p>}
                <p className="hero-count">
                  <span className="hero-number">
                    {o.value.value === null ? "—" : formatInteger(o.value.value, lang)}
                  </span>
                  <span className="hero-label">
                    {`${t.heroInRegister} · ${formatDate(o.snapshot_date, lang)}`}
                  </span>
                </p>
                {entry === undefined ? null : (
                  <p className="hero-line hero-rarity">{oneIn(entry)}</p>
                )}
                {region === undefined ? null : (
                  <p className="hero-line hero-where">
                    {t.heroStrongestRegion}: {regionText(region)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="absent">
          {population?.state === "RIGHTS_BLOCKED"
            ? t.heroRightsBlocked
            : population?.reason_code === "NOT_DERIVED_YET"
              ? t.heroNotDerived
              : t.heroNoCount}
        </p>
      )}

      {/* A figure whose list has no column above — an unrecognised list, or a
          rarity figure without its count — still gets its own line. */}
      {rarityEntries
        .filter((e) => !hasColumn(listOf(e.comparability_group)))
        .map((e, index) => {
          const sex = listOf(e.comparability_group);
          return (
            <p className="hero-line" key={`r-${e.comparability_group ?? "g"}-${String(index)}`}>
              {sex === null ? oneIn(e) : `${oneIn(e)} · ${sex}`}
            </p>
          );
        })}
      {strongest
        .filter((r) => !hasColumn(listOf(r.entry.comparability_group)))
        .map((r, index) => {
          const sex = listOf(r.entry.comparability_group);
          return (
            <p
              className="hero-line"
              key={`w-${r.entry.comparability_group ?? "g"}-${String(index)}`}
            >
              {t.heroStrongestRegion}: {regionText(r)}
              {sex === null ? "" : ` — ${sex}`}
            </p>
          );
        })}
      {rarityEntries.length > 1 ? <p className="note hero-note">{t.rarityNotComparable}</p> : null}
      <NextStep next={next} />
    </header>
  );
}
