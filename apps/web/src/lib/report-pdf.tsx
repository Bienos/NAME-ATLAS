import { join } from "node:path";
import type { ReactNode } from "react";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { CitationDto, SurnameResultResponse } from "@name-atlas/contracts";
import type { BirthSexFigures, GivenNameReportFacts } from "@name-atlas/truth";
import { TOKENS, TYPE_FAMILIES } from "./design-tokens.js";
import { GIVEN_NAME_MEANING_TEXT, originWord } from "./given-name-meaning-view.js";
import {
  assessmentWord,
  changeListLabel,
  formatDate,
  formatInteger,
  formatPercent,
  formatPercentChange,
  formatShare,
  formationWord,
} from "./messages.js";
import type { Lang } from "./messages.js";
import {
  AVAILABILITY,
  COPY,
  DIMENSIONS,
  GIVEN_GAPS,
  REASONS,
  SECTION_TITLES,
  SOURCELESS,
  STATES,
  contentsCount,
  listName,
  locatorWords,
  reportNumbers,
  word,
} from "./report-view.js";
import type { ReportPreview } from "./report-view.js";

/**
 * The full report as a PDF (TASK-172): A4 pages in the design of the owner's
 * mockups — a dusk cover, "in short" with the contents, then the chapters with
 * a numbered note at each fact and the bibliography at the end, a running head
 * and the page numbers.
 *
 * It renders a `ReportPreview`, the same validated view the report preview
 * page renders, with the same words (`report-view.tsx`): it derives nothing,
 * and "in short" only restates figures the chapters hold, each with its
 * chapter. With `sample`, every page is marked as an invented example.
 */

const FONT_DIR = join(process.cwd(), "assets", "fonts");
let fontsRegistered = false;

/** The brand fonts, from the same files as the share cards (`og-card.tsx`). */
function registerFonts(): void {
  if (fontsRegistered) return;
  fontsRegistered = true;
  Font.register({
    family: TYPE_FAMILIES.display,
    src: join(FONT_DIR, "Fraunces-Medium.ttf"),
    fontWeight: 500,
  });
  Font.register({
    family: TYPE_FAMILIES.ui,
    fonts: [
      { src: join(FONT_DIR, "InstrumentSans-Regular.ttf"), fontWeight: 400 },
      { src: join(FONT_DIR, "InstrumentSans-SemiBold.ttf"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: TYPE_FAMILIES.data,
    src: join(FONT_DIR, "IBMPlexMono-Medium.ttf"),
    fontWeight: 500,
  });
  // English hyphenation would break Polish words in the wrong places.
  Font.registerHyphenationCallback((w) => [w]);
}

const INK = TOKENS["paper-ink"];
const SOFT = TOKENS["paper-ink-soft"];
const MUTED = TOKENS["paper-ink-muted"];
const ACCENT = TOKENS["paper-accent"];
const PAPER = TOKENS.paper;
const RULE = TOKENS["paper-line"];
const DUSK = TOKENS["dusk-surface"];
const AMBER = TOKENS["dusk-amber"];
const DUSK_INK = TOKENS["dusk-ink"];
const DUSK_SOFT = TOKENS["dusk-ink-soft"];

const S = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    color: INK,
    fontFamily: TYPE_FAMILIES.ui,
    fontSize: 10,
    lineHeight: 1.45,
    paddingTop: 62,
    paddingBottom: 58,
    paddingHorizontal: 56,
  },
  head: {
    position: "absolute",
    top: 26,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    fontFamily: TYPE_FAMILIES.data,
    fontSize: 7.5,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: MUTED,
  },
  foot: {
    position: "absolute",
    bottom: 26,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 0.6,
    borderTopColor: RULE,
    fontFamily: TYPE_FAMILIES.data,
    fontSize: 7.5,
    color: MUTED,
  },
  eyebrow: {
    fontFamily: TYPE_FAMILIES.data,
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: ACCENT,
  },
  h1: { fontFamily: TYPE_FAMILIES.display, fontSize: 30, lineHeight: 1.1, marginTop: 4 },
  h2: { fontFamily: TYPE_FAMILIES.display, fontSize: 22, lineHeight: 1.15, marginTop: 4 },
  h3: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: SOFT,
    marginTop: 14,
    marginBottom: 6,
  },
  h4: { fontSize: 10, fontWeight: 600, marginTop: 10, marginBottom: 4 },
  p: { marginBottom: 6 },
  caveat: { fontSize: 9, color: SOFT, marginTop: 4, marginBottom: 6 },
  note: { fontSize: 6.5, color: ACCENT },
  chapter: { marginBottom: 18 },
  table: { marginTop: 4, marginBottom: 6, borderTopWidth: 0.8, borderTopColor: INK },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    paddingVertical: 3.5,
  },
  th: {
    fontFamily: TYPE_FAMILIES.data,
    fontSize: 7,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: MUTED,
  },
  cell: { paddingRight: 6 },
  big: { fontFamily: TYPE_FAMILIES.display, fontSize: 26, lineHeight: 1.05 },
  bib: { flexDirection: "row", marginBottom: 5, fontSize: 9 },
  bibNum: { width: 22, fontFamily: TYPE_FAMILIES.data, color: ACCENT },
  bar: { height: 5, backgroundColor: ACCENT, opacity: 0.85, marginTop: 2 },
});

/** The report's own words for the PDF; the rest are the preview's (`COPY`). */
const TEXT = {
  pl: {
    full: "Raport imienia i nazwiska",
    surname: "Raport nazwiska",
    head: (name: string) => `${name} · raport`,
    lede: (n: number) =>
      `${n} rozdziałów, przypis przy każdym fakcie. Każda liczba pochodzi ze źródła, które podajemy; brak danych mówimy wprost.`,
    stateOn: (date: string) => `Stan danych na ${date}`,
    // A reader's copy (TASK-173) is composed when asked and never stored: version 0.
    version: (v: number, date: string) =>
      v === 0 ? `Stan danych ${date}` : `Wersja ${v} · stan danych ${date}`,
    page: (n: number, of: number) => `${n} / ${of}`,
    inShort: "W skrócie.",
    chapterRef: (n: number) => `rozdz. ${n}`,
    chapter: (n: number) => `Rozdział ${n}`,
    contents: "Spis treści",
    givenCount: (list: string) => `osób ma to imię jako pierwsze (${list})`,
    givenRank: (rank: string, of: string) => `${rank}. miejsce wśród ${of} imion na tej liście`,
    births: (sex: "MALE" | "FEMALE", year: number) =>
      sex === "MALE"
        ? `chłopców dostało to imię w ${year} r.`
        : `dziewczynek dostało to imię w ${year} r.`,
    meaning: (n: number, origins: string) =>
      `${n === 1 ? "Jedno dzieło objaśnia" : `${n} dzieła objaśniają`} imię; pochodzenie: ${origins}.`,
    surnameCount: (list: string) => `osób nosi to nazwisko (${list})`,
    unknownPair: "Nie wiadomo",
    unknownPairLine: (name: string) =>
      `ile osób nazywa się ${name}. Żadne źródło nie łączy imion z nazwiskami.`,
    sampleBand: "PRZYKŁAD · imię, nazwisko i wszystkie dane są zmyślone",
    sampleMark: "PRZYKŁAD",
    sampleNote:
      "To przykład układu raportu. Imię, nazwisko, liczby, cytaty i źródła są zmyślone; nie dotyczą nikogo.",
    sampleStamp: "Przykładowy raport",
    years: (first: number, last: number) => `${first}–${last}`,
  },
  en: {
    full: "First name and surname report",
    surname: "Surname report",
    head: (name: string) => `${name} · report`,
    lede: (n: number) =>
      `${n} chapters, a note at every fact. Every figure comes from a source we name; where there is no data, we say so.`,
    stateOn: (date: string) => `Data as of ${date}`,
    version: (v: number, date: string) =>
      v === 0 ? `Data as of ${date}` : `Version ${v} · data as of ${date}`,
    page: (n: number, of: number) => `${n} / ${of}`,
    inShort: "In short.",
    chapterRef: (n: number) => `ch. ${n}`,
    chapter: (n: number) => `Chapter ${n}`,
    contents: "Contents",
    givenCount: (list: string) => `people have this as their first name (${list})`,
    givenRank: (rank: string, of: string) => `rank ${rank} among ${of} names on this list`,
    births: (sex: "MALE" | "FEMALE", year: number) =>
      sex === "MALE"
        ? `boys were given this name in ${year}.`
        : `girls were given this name in ${year}.`,
    meaning: (n: number, origins: string) =>
      `${n === 1 ? "One work explains" : `${n} works explain`} the name; origin: ${origins}.`,
    surnameCount: (list: string) => `people have this surname (${list})`,
    unknownPair: "Not known",
    unknownPairLine: (name: string) =>
      `how many people are called ${name}. No source links first names to surnames.`,
    sampleBand: "SAMPLE · the names and all the data are invented",
    sampleMark: "SAMPLE",
    sampleNote:
      "This is a sample of the report's layout. The names, figures, quotations and sources are invented; they are about no one.",
    sampleStamp: "Sample report",
    years: (first: number, last: number) => `${first}–${last}`,
  },
} as const;

type Numbers = ReadonlyMap<string, number>;

/** A note mark into the bibliography; nothing when the citation is not in it. */
function Note({ id, numbers }: { id: string; numbers: Numbers }) {
  const n = numbers.get(id);
  return n === undefined ? null : <Text style={S.note}> {n}</Text>;
}

/** A table cell: words, or a bar its share of the column long. */
type Cell = ReactNode | { readonly bar: number };
const isBar = (c: Cell): c is { readonly bar: number } =>
  c !== null && typeof c === "object" && "bar" in c;

/** A table: a header row and rows of cells, each column its share of the width. */
function Table({
  head,
  rows,
  widths,
}: {
  head: readonly string[];
  rows: readonly (readonly Cell[])[];
  widths: readonly number[];
}) {
  const width = (i: number) => ({ width: `${String(widths[i] ?? 20)}%` });
  return (
    <View style={S.table}>
      <View style={S.row} wrap={false}>
        {head.map((h, i) => (
          <Text key={i} style={[S.th, S.cell, width(i)]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((cells, r) => (
        <View key={r} style={S.row} wrap={false}>
          {cells.map((c, i) =>
            isBar(c) ? (
              <View key={i} style={[S.cell, width(i), { justifyContent: "center" }]}>
                <View
                  style={[S.bar, { marginTop: 0, width: `${String(Math.round(c.bar * 100))}%` }]}
                />
              </View>
            ) : (
              <Text key={i} style={[S.cell, width(i)]}>
                {c}
              </Text>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

/** The first name's chapter: its lists, its years as a name given to children, its origin. */
function GivenNameChapter({
  facts,
  lang,
  numbers,
}: {
  facts: GivenNameReportFacts;
  lang: Lang;
  numbers: Numbers;
}) {
  const t = COPY[lang];
  const m = GIVEN_NAME_MEANING_TEXT[lang];
  return (
    <>
      {facts.state === "READY" ? (
        <>
          <Table
            head={[t.list, t.people, t.rank, t.asOf]}
            widths={[34, 20, 26, 20]}
            rows={facts.lists.map((l) => [
              listName(l.comparability_group, lang),
              <>
                {formatInteger(l.count.count, lang)}
                <Note id={l.count.citation.id} numbers={numbers} />
              </>,
              l.rank === null ? (
                t.noRank
              ) : (
                <>
                  {t.rankOf(
                    formatInteger(l.rank.rank, lang),
                    formatInteger(l.rank.universe_size, lang),
                  )}
                </>
              ),
              formatDate(l.snapshot_date, lang),
            ])}
          />
          <Text style={S.caveat}>{t.listsApart}</Text>
        </>
      ) : (
        <Text style={S.p}>{word(STATES, facts.state, lang)}</Text>
      )}
      {facts.births === null ? null : (
        <>
          <Text style={S.h3}>{t.births}</Text>
          {facts.births.state === "RIGHTS_BLOCKED" ? (
            <Text style={S.p}>{word(STATES, "RIGHTS_BLOCKED", lang)}</Text>
          ) : facts.births.state !== "READY" ? (
            <Text style={S.caveat}>{word(GIVEN_GAPS, "BIRTHS", lang)}</Text>
          ) : (
            <>
              <Text style={S.caveat}>{t.birthsIntro}</Text>
              {facts.births.sexes.map((s) => (
                <BirthYears key={s.sex} figures={s} lang={lang} numbers={numbers} />
              ))}
            </>
          )}
        </>
      )}
      <Text style={S.h3}>{m.heading}</Text>
      {facts.meaning.state === "RIGHTS_BLOCKED" ? (
        <Text style={S.p}>{m.blocked}</Text>
      ) : facts.meaning.state !== "READY" ? (
        <Text style={S.caveat}>{m.none}</Text>
      ) : (
        <>
          {facts.meaning.works.map((w) => (
            <View
              key={`${w.citation.id}-${w.locator}`}
              wrap={false}
              style={{ borderTopWidth: 0.5, borderTopColor: RULE, paddingVertical: 6 }}
            >
              <Text style={{ fontFamily: TYPE_FAMILIES.data, fontSize: 8, color: MUTED }}>
                {`${w.work.author_or_publisher}, ${w.work.title} (${w.work.year}), ${w.locator}`}
                <Note id={w.citation.id} numbers={numbers} />
              </Text>
              <Text>
                {[
                  w.origin === null
                    ? ""
                    : `${originWord(w.origin.code, lang)} (${m.quote(w.origin.as_printed)})`,
                  w.origin !== null && w.literal_gloss !== null ? " · " : "",
                  w.literal_gloss === null ? "" : m.quote(w.literal_gloss),
                  lang === "pl" && w.translation !== null
                    ? `, ${m.translatedBy}: ${m.quote(w.translation.text)}`
                    : "",
                ].join("")}
              </Text>
              <Text style={{ fontSize: 9, color: SOFT, marginTop: 2 }}>{m.quote(w.quotation)}</Text>
            </View>
          ))}
          <Text style={S.caveat}>
            {m.assessment}: {assessmentWord(facts.meaning.confidence.status, lang)}
          </Text>
          {lang === "pl" && facts.meaning.works.some((w) => w.translation !== null) ? (
            <Text style={S.caveat}>{m.translationNote}</Text>
          ) : null}
        </>
      )}
    </>
  );
}

/** One sex's years as a first name given to children: never 0, never summed with the other sex. */
function BirthYears({
  figures,
  lang,
  numbers,
}: {
  figures: BirthSexFigures;
  lang: Lang;
  numbers: Numbers;
}) {
  const t = COPY[lang];
  const years = figures.history ?? (figures.latest === null ? [] : [figures.latest]);
  const listed = years.filter((y) => y.list !== null);
  const [first] = listed;
  const last = listed[listed.length - 1];
  if (first === undefined || last === undefined) return null;
  const label = t.sexes[figures.sex];
  if (years.every((y) => y.count === null)) {
    return (
      <Text style={S.p}>
        {t.neverOnList(label, String(first.birth_year), String(last.birth_year))}
      </Text>
    );
  }
  const counts = years.flatMap((y) => (y.count === null ? [] : [y.count.count]));
  const peak = Math.max(...counts);
  const trend = figures.trend;
  return (
    <>
      <Text style={S.h4}>{label}</Text>
      <Table
        head={[t.year, t.children, "", t.rank]}
        widths={[11, 43, 22, 24]}
        rows={years.map((y) => [
          String(y.birth_year),
          y.list === null ? (
            t.noList
          ) : y.count === null ? (
            t.belowCutoff(formatInteger(y.list.publication_threshold, lang))
          ) : (
            <>
              {formatInteger(y.count.count, lang)}
              <Note id={y.count.citation.id} numbers={numbers} />
            </>
          ),
          // A bar to scale with the peak year, drawn only where there is a count.
          y.count === null ? "" : { bar: y.count.count / peak },
          y.rank === null
            ? "—"
            : t.rankOf(formatInteger(y.rank.rank, lang), formatInteger(y.rank.universe_size, lang)),
        ])}
      />
      {trend === null ? null : (
        <>
          <Text style={S.p}>
            {t.trend(
              t.directions[trend.direction],
              String(trend.earlier_year),
              trend.earlier_share_per_million === null
                ? t.belowCutoffShort
                : formatPercent(trend.earlier_share_per_million / 1_000_000, lang),
              String(trend.latest_year),
              trend.latest_share_per_million === null
                ? "—"
                : formatPercent(trend.latest_share_per_million / 1_000_000, lang),
            )}
          </Text>
          <Text style={S.caveat}>
            {t.trendBasis(
              lang === "pl"
                ? String(trend.change_percent).replace(".", ",")
                : String(trend.change_percent),
            )}
          </Text>
        </>
      )}
    </>
  );
}

function Origin({ r, lang }: { r: SurnameResultResponse; lang: Lang }) {
  const t = COPY[lang];
  const m = r.meaning;
  if (m === null || m.state !== "AVAILABLE") {
    return <Text style={S.p}>{word(STATES, m?.state ?? "UNAVAILABLE", lang)}</Text>;
  }
  return (
    <>
      <Table
        head={[t.root, t.language, t.gloss, t.formation, t.work]}
        widths={[15, 12, 33, 14, 26]}
        rows={m.interpretations.map((i) => [
          i.root_form ?? "—",
          i.root_language ?? "—",
          i.literal_gloss,
          formationWord(i.formation_type, lang),
          `${i.work.author_or_publisher}, ${i.work.title} (${i.work.year}), ${i.locator}`,
        ])}
      />
      {m.confidence !== null ? (
        <Text style={S.caveat}>
          {t.assessment}: {assessmentWord(m.confidence, lang)}
        </Text>
      ) : null}
    </>
  );
}

function Distribution({
  r,
  lang,
  numbers,
}: {
  r: SurnameResultResponse;
  lang: Lang;
  numbers: Numbers;
}) {
  const t = COPY[lang];
  const pop = r.population;
  const rarity = r.rarity;
  const distribution = r.distribution;
  return (
    <>
      {pop?.state === "READY" ? (
        <Table
          head={[t.list, t.people, t.asOf]}
          widths={[45, 30, 25]}
          rows={pop.observations.map((o) => [
            listName(o.comparability_group, lang),
            <>
              {o.value.status === "KNOWN" && o.value.value !== null
                ? formatInteger(o.value.value, lang)
                : t.suppressed}
              <Note id={o.citation.id} numbers={numbers} />
            </>,
            formatDate(o.snapshot_date, lang),
          ])}
        />
      ) : (
        <Text style={S.p}>{word(STATES, pop?.state ?? "UNAVAILABLE", lang)}</Text>
      )}
      {rarity?.state === "READY" ? (
        <Table
          head={[t.list, t.oneIn, t.rank]}
          widths={[45, 30, 25]}
          rows={rarity.entries.map((e) => {
            const rank = e.supporting.find((s) => s.metric === "RANK");
            return [
              listName(e.comparability_group, lang),
              <>
                {e.primary.metric === "ONE_IN_X" ? formatInteger(e.primary.value, lang) : "—"}
                <Note id={e.citation.id} numbers={numbers} />
              </>,
              rank === undefined ? "—" : formatInteger(rank.value, lang),
            ];
          })}
        />
      ) : null}
      {distribution?.state === "READY"
        ? distribution.entries.map((e, i) => {
            const leaders = [...e.regions].sort((a, b) => b.count - a.count).slice(0, 5);
            const top = leaders[0]?.share_of_covered ?? 1;
            return (
              <View key={i} wrap={false} style={{ marginTop: 8 }}>
                <Text style={S.h4}>
                  {t.leaders} · {listName(e.comparability_group, lang)}
                  <Note id={e.citation.id} numbers={numbers} />
                </Text>
                {leaders.map((p) => (
                  <View key={p.display_name} style={{ marginBottom: 4 }}>
                    <Text>
                      {p.display_name}: {formatShare(p.share_of_covered, lang)} (
                      {formatInteger(p.count, lang)})
                    </Text>
                    <View
                      style={[
                        S.bar,
                        // The largest region's bar takes three quarters of the line.
                        { width: `${String(Math.round((p.share_of_covered / top) * 75))}%` },
                      ]}
                    />
                  </View>
                ))}
                {e.coverage_state !== "READY" ? (
                  <Text style={S.caveat}>{t.lowCoverage}</Text>
                ) : null}
              </View>
            );
          })
        : null}
    </>
  );
}

function Timeline({
  r,
  lang,
  numbers,
}: {
  r: SurnameResultResponse;
  lang: Lang;
  numbers: Numbers;
}) {
  const t = COPY[lang];
  const change = r.change;
  if (change?.state !== "READY") {
    return <Text style={S.p}>{word(STATES, change?.state ?? "UNAVAILABLE", lang)}</Text>;
  }
  return (
    <Table
      head={[t.list, t.from, t.to, t.change]}
      widths={[28, 27, 27, 18]}
      rows={change.entries.map((e) => [
        <>
          {changeListLabel(e.list, lang)}
          <Note id={e.citation.id} numbers={numbers} />
        </>,
        `${formatDate(e.summary.first.data_date, lang)}: ${formatInteger(e.summary.first.count, lang)}`,
        `${formatDate(e.summary.last.data_date, lang)}: ${formatInteger(e.summary.last.count, lang)}`,
        formatPercentChange(e.summary.count_change_percent, lang),
      ])}
    />
  );
}

function Archives({
  r,
  lang,
  numbers,
}: {
  r: SurnameResultResponse;
  lang: Lang;
  numbers: Numbers;
}) {
  const t = COPY[lang];
  const a = r.archive;
  if (a?.state !== "READY" || a.query === null || a.searched_on === null) {
    return <Text style={S.p}>{word(STATES, a?.state ?? "UNAVAILABLE", lang)}</Text>;
  }
  return (
    <>
      <Text style={S.p}>
        {t.archive(
          a.query,
          formatDate(a.searched_on, lang),
          formatInteger(a.catalogue_records ?? 0, lang),
          formatInteger(a.pages ?? 0, lang),
        )}
        {a.citation !== null ? <Note id={a.citation.id} numbers={numbers} /> : null}
      </Text>
      <Text style={S.caveat}>{t.archiveCaveat}</Text>
    </>
  );
}

function Bibliography({
  ids,
  citations,
  lang,
}: {
  ids: readonly string[];
  citations: ReadonlyMap<string, CitationDto>;
  lang: Lang;
}) {
  const t = COPY[lang];
  return (
    <View>
      {ids.map((id, i) => {
        const c = citations.get(id);
        if (c === undefined) return null;
        return (
          <View key={id} style={S.bib} wrap={false}>
            <Text style={S.bibNum}>{i + 1}</Text>
            <Text style={{ flex: 1 }}>
              {/* One string: a line broken between two runs gets a stray hyphen. */}
              {[
                c.title,
                c.publisher !== null ? ` — ${c.publisher}` : "",
                c.locator !== null ? `, ${locatorWords(c.locator, lang)}` : "",
                c.publication_date !== null ? `, ${c.publication_date}` : "",
                c.retrieved_at !== null ? ` (${t.retrieved} ${c.retrieved_at.slice(0, 10)})` : "",
                c.terms !== null ? `. ${c.terms}` : "",
                (c.source_page_url ?? c.url) !== null
                  ? `. ${c.source_page_url ?? c.url ?? ""}`
                  : "",
              ].join("")}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Limitations({ p, lang }: { p: ReportPreview; lang: Lang }) {
  const t = COPY[lang];
  const item = (key: string, text: string) => (
    <Text key={key} style={{ marginBottom: 4 }}>
      · {text}
    </Text>
  );
  return (
    <>
      <Text style={S.h3}>{t.gaps}</Text>
      {p.gaps.length === 0
        ? item("none", t.noGaps)
        : p.gaps.map((g) =>
            item(
              g.dimension,
              `${word(DIMENSIONS, g.dimension, lang)}: ${word(AVAILABILITY, g.availability, lang)}`,
            ),
          )}
      {p.givenName !== null ? (
        <>
          <Text style={S.h3}>{t.givenGaps}</Text>
          {p.givenGaps.map((g) =>
            item(
              `${g.topic}-${g.comparability_group ?? ""}`,
              g.topic === "RANK"
                ? t.rankGap(listName(g.comparability_group, lang))
                : g.topic === "MEANING" && g.reason_code === "RIGHTS_BLOCKED"
                  ? t.meaningBlocked
                  : g.topic === "BIRTHS" && g.reason_code === "RIGHTS_BLOCKED"
                    ? t.birthsBlocked
                    : word(GIVEN_GAPS, g.topic, lang),
            ),
          )}
        </>
      ) : null}
      {p.eligibility.reason_codes.length > 0 ? (
        <>
          <Text style={S.h3}>{p.givenName === null ? t.whyNot : t.surnameNotOffered}</Text>
          {p.eligibility.reason_codes.map((code) => item(code, word(REASONS, code, lang)))}
        </>
      ) : null}
    </>
  );
}

function chapterBody(
  type: string,
  p: ReportPreview,
  lang: Lang,
  numbers: Numbers,
  citations: ReadonlyMap<string, CitationDto>,
): ReactNode {
  const t = COPY[lang];
  const r = p.response;
  if (type === "LIMITATIONS") return <Limitations p={p} lang={lang} />;
  if (type in SOURCELESS) {
    return <Text style={S.p}>{t.sourceless(word(SOURCELESS, type, lang))}</Text>;
  }
  if (type === "GIVEN_NAME") {
    return p.givenName === null ? null : (
      <GivenNameChapter facts={p.givenName} lang={lang} numbers={numbers} />
    );
  }
  if (r === null) return <Text style={S.p}>{t.stale}</Text>;
  switch (type) {
    case "ORIGIN":
      return <Origin r={r} lang={lang} />;
    case "DISTRIBUTION":
      return <Distribution r={r} lang={lang} numbers={numbers} />;
    case "TIMELINE":
      return <Timeline r={r} lang={lang} numbers={numbers} />;
    case "ARCHIVES":
      return <Archives r={r} lang={lang} numbers={numbers} />;
    case "SOURCES": {
      const ids = p.sections.find((s) => s.type === "SOURCES")?.citationIds ?? [];
      return <Bibliography ids={ids} citations={citations} lang={lang} />;
    }
    default:
      return null;
  }
}

/** "In short": figures the chapters hold, each with its chapter; nothing new. */
function InShort({ p, lang }: { p: ReportPreview; lang: Lang }) {
  const x = TEXT[lang];
  const chapterOf = (type: string) => p.sections.findIndex((s) => s.type === type) + 1;
  const cards: { key: string; figure: string; line: string; chapter: number }[] = [];
  const given = p.givenName;
  if (given !== null) {
    const list = given.state === "READY" ? given.lists[0] : undefined;
    if (list !== undefined) {
      cards.push({
        key: "given",
        figure: formatInteger(list.count.count, lang),
        line:
          x.givenCount(listName(list.comparability_group, lang)) +
          (list.rank === null
            ? "."
            : `; ${x.givenRank(formatInteger(list.rank.rank, lang), formatInteger(list.rank.universe_size, lang))}.`),
        chapter: chapterOf("GIVEN_NAME"),
      });
    }
    if (given.births?.state === "READY") {
      for (const s of given.births.sexes) {
        const latest = s.latest;
        if (latest === null || latest.count === null) continue;
        cards.push({
          key: `births-${s.sex}`,
          figure: formatInteger(latest.count.count, lang),
          // The sentence ends itself: the Polish one ends in "r." (TASK-173).
          line: x.births(s.sex, latest.birth_year),
          chapter: chapterOf("GIVEN_NAME"),
        });
      }
    }
    if (given.meaning.state === "READY") {
      const origins = [
        ...new Set(
          given.meaning.works.flatMap((w) =>
            w.origin === null ? [] : [originWord(w.origin.code, lang)],
          ),
        ),
      ];
      if (origins.length > 0) {
        cards.push({
          key: "meaning",
          figure: String(given.meaning.works.length),
          line: x.meaning(given.meaning.works.length, origins.join(", ")),
          chapter: chapterOf("GIVEN_NAME"),
        });
      }
    }
  }
  if (p.response?.population?.state === "READY") {
    for (const o of p.response.population.observations) {
      if (o.value.status !== "KNOWN" || o.value.value === null) continue;
      cards.push({
        key: `surname-${o.comparability_group}`,
        figure: formatInteger(o.value.value, lang),
        line: `${x.surnameCount(listName(o.comparability_group, lang))}.`,
        chapter: chapterOf("DISTRIBUTION"),
      });
    }
  }
  const pairGap = p.givenGaps.some((g) => g.topic === "FULL_NAME_COUNT");
  if (pairGap) {
    cards.push({
      key: "pair",
      figure: x.unknownPair,
      line: x.unknownPairLine(p.displayName),
      chapter: chapterOf("LIMITATIONS"),
    });
  }
  return (
    <View>
      <Text style={S.h1}>{x.inShort}</Text>
      <View style={{ marginTop: 12 }}>
        {cards.map((c) => (
          <View
            key={c.key}
            wrap={false}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              borderTopWidth: 0.6,
              borderTopColor: RULE,
              paddingVertical: 8,
            }}
          >
            <Text style={[S.big, { width: 150, fontSize: c.figure.length > 9 ? 18 : 24 }]}>
              {c.figure}
            </Text>
            <Text style={{ flex: 1, paddingTop: 4 }}>{c.line}</Text>
            <Text style={[S.th, { width: 52, textAlign: "right", paddingTop: 6 }]}>
              {x.chapterRef(c.chapter)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Contents({ p, lang }: { p: ReportPreview; lang: Lang }) {
  const x = TEXT[lang];
  return (
    <View style={{ marginTop: 22 }} wrap={false}>
      <Text style={S.h3}>{x.contents}</Text>
      {p.sections.map((s, i) => (
        <View
          key={s.type}
          style={{
            flexDirection: "row",
            borderBottomWidth: 0.5,
            borderBottomColor: RULE,
            paddingVertical: 4,
          }}
        >
          <Text style={{ width: 26, fontFamily: TYPE_FAMILIES.data, color: ACCENT }}>
            {String(i + 1).padStart(2, "0")}
          </Text>
          <Text style={{ flex: 1 }}>{word(SECTION_TITLES, s.type, lang)}</Text>
          <Text style={[S.th, { paddingTop: 1 }]}>{contentsCount(s, lang)}</Text>
        </View>
      ))}
    </View>
  );
}

/** The marks an invented sample carries on every page. */
function SampleMarks({ lang, dark }: { lang: Lang; dark: boolean }) {
  const x = TEXT[lang];
  return (
    <>
      <Text
        fixed
        style={{
          position: "absolute",
          top: 330,
          left: -40,
          right: -40,
          textAlign: "center",
          fontFamily: TYPE_FAMILIES.display,
          fontSize: 120,
          color: dark ? AMBER : ACCENT,
          opacity: 0.09,
          transform: "rotate(-32deg)",
        }}
      >
        {x.sampleMark}
      </Text>
      <Text
        fixed
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingVertical: 5,
          textAlign: "center",
          backgroundColor: dark ? AMBER : ACCENT,
          color: dark ? DUSK : PAPER,
          fontFamily: TYPE_FAMILIES.data,
          fontSize: 7.5,
          letterSpacing: 1,
        }}
      >
        {x.sampleBand}
      </Text>
    </>
  );
}

function Cover({
  p,
  lang,
  sample,
  stamp,
}: {
  p: ReportPreview;
  lang: Lang;
  sample: boolean;
  stamp: string | null;
}) {
  const x = TEXT[lang];
  const date = formatDate(p.generatedOn, lang);
  const given = p.givenName?.given_name.display_name ?? null;
  const surname = given === null ? p.displayName : p.displayName.slice(given.length + 1);
  return (
    <Page
      size="A4"
      style={{
        backgroundColor: DUSK,
        color: DUSK_INK,
        fontFamily: TYPE_FAMILIES.ui,
        padding: 56,
        paddingTop: 70,
      }}
    >
      {sample ? <SampleMarks lang={lang} dark /> : null}
      <Text
        style={{
          fontFamily: TYPE_FAMILIES.data,
          fontSize: 9,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: AMBER,
        }}
      >
        Name Atlas
      </Text>
      <View style={{ marginTop: 150 }}>
        <Text
          style={{
            fontFamily: TYPE_FAMILIES.data,
            fontSize: 9,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: AMBER,
          }}
        >
          {given === null ? x.surname : x.full}
        </Text>
        {given === null ? null : (
          <Text style={{ fontFamily: TYPE_FAMILIES.display, fontSize: 46, marginTop: 14 }}>
            {given}
          </Text>
        )}
        <Text style={{ fontFamily: TYPE_FAMILIES.display, fontSize: 46, lineHeight: 1.05 }}>
          {surname}
        </Text>
        <Text
          style={{ fontSize: 12, lineHeight: 1.5, color: DUSK_SOFT, marginTop: 18, maxWidth: 380 }}
        >
          {x.lede(p.sections.length)}
        </Text>
      </View>
      <View style={{ position: "absolute", left: 56, right: 56, bottom: 56 }}>
        {sample ? (
          <Text style={{ fontSize: 10, color: AMBER, marginBottom: 10, maxWidth: 400 }}>
            {x.sampleNote}
          </Text>
        ) : null}
        {stamp !== null ? (
          <Text style={{ fontSize: 10, color: DUSK_SOFT, marginBottom: 6 }}>{stamp}</Text>
        ) : null}
        <Text
          style={{
            fontFamily: TYPE_FAMILIES.data,
            fontSize: 8,
            color: DUSK_SOFT,
            borderTopWidth: 0.6,
            borderTopColor: TOKENS["dusk-line-control"],
            paddingTop: 8,
          }}
        >
          {x.version(p.version, date)}
        </Text>
      </View>
    </Page>
  );
}

export interface ReportPdfOptions {
  /** An invented sample: every page is marked so (`report-sample.ts`). */
  readonly sample?: boolean;
  /** A line on the cover about who the copy is for, or null. */
  readonly stamp?: string | null;
}

/** The whole document. */
export function ReportPdfDocument({
  preview,
  lang,
  sample = false,
  stamp = null,
}: { preview: ReportPreview; lang: Lang } & ReportPdfOptions) {
  registerFonts();
  const x = TEXT[lang];
  const { citations, numbers } = reportNumbers(preview);
  const date = formatDate(preview.generatedOn, lang);
  const head = (
    <View fixed style={[S.head, sample ? { top: 30 } : {}]}>
      <Text>{x.head(preview.displayName)}</Text>
      <Text>Name Atlas</Text>
    </View>
  );
  const foot = (
    <View fixed style={S.foot}>
      <Text>{x.version(preview.version, date)}</Text>
      <Text render={({ pageNumber, totalPages }) => x.page(pageNumber, totalPages)} />
    </View>
  );
  return (
    <Document
      title={`${preview.displayName} · Name Atlas${sample ? ` · ${x.sampleMark}` : ""}`}
      author="Name Atlas"
      creator="Name Atlas"
      producer="Name Atlas"
      language={lang}
    >
      <Cover p={preview} lang={lang} sample={sample} stamp={stamp} />
      <Page size="A4" style={S.page}>
        {sample ? <SampleMarks lang={lang} dark={false} /> : null}
        {head}
        <InShort p={preview} lang={lang} />
        <Contents p={preview} lang={lang} />
        {foot}
      </Page>
      <Page size="A4" style={S.page}>
        {sample ? <SampleMarks lang={lang} dark={false} /> : null}
        {head}
        {preview.sections.map((s, i) => (
          <View key={s.type} style={S.chapter} break={i > 0 && s.type === "DISTRIBUTION"}>
            {/* The chapter's number and title stay together, and with its first lines. */}
            <View wrap={false} minPresenceAhead={60}>
              <Text style={S.eyebrow}>{x.chapter(i + 1)}</Text>
              <Text style={S.h2}>{word(SECTION_TITLES, s.type, lang)}</Text>
            </View>
            {chapterBody(s.type, preview, lang, numbers, citations)}
          </View>
        ))}
        {foot}
      </Page>
    </Document>
  );
}

/** The PDF's bytes. */
export async function renderReportPdf(
  preview: ReportPreview,
  lang: Lang,
  options: ReportPdfOptions = {},
): Promise<Uint8Array> {
  const buffer = await renderToBuffer(
    <ReportPdfDocument preview={preview} lang={lang} {...options} />,
  );
  return new Uint8Array(buffer);
}

/** The file name a download gets: `wielimira-wrzosowiecka-raport.pdf`. */
export function reportPdfFileName(displayName: string, lang: Lang): string {
  const stem = displayName
    .toLocaleLowerCase("pl")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/gu, "l")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return `${stem === "" ? "name-atlas" : stem}-${lang === "en" ? "report" : "raport"}.pdf`;
}

/** The PDF's own words, for its tests. */
export const REPORT_PDF_TEXT = TEXT;
