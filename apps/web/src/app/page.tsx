import { db as sharedDb } from "../lib/db.js";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { searchTarget } from "../lib/deck-target.js";
import { createLogger } from "@name-atlas/logging";
import { listFacts, querySurnameResult } from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { parseIntent, parseLang, UI } from "../lib/messages.js";
import type { Lang } from "../lib/messages.js";
import { Result } from "../lib/result-view.js";
import { SearchForm } from "../lib/search-form.js";
import { currentPathFor } from "../lib/slug.js";
import { referrerPath, requestOrigin, searchOrigin, siteOrigin } from "../lib/surname-page.js";
import { landingMetadata } from "../lib/site-metadata.js";
import { jsonLd, siteGraph } from "../lib/structured-data.js";
import { DuskZoom } from "../lib/dusk-zoom.js";
import { loadListFacts } from "../lib/list-atlas-load.js";
import { SiteShell } from "../lib/site-shell.js";
import { deckCards } from "../lib/deck.js";
import {
  LANDING_EXAMPLE,
  LandingExpect,
  LandingSteps,
  LandingTools,
  LandingTreeLine,
  LandingWhat,
  Scatter,
} from "../lib/landing-sections.js";
import type { AtlasFigures, LandingExample } from "../lib/landing-sections.js";

/**
 * The search page (TASK-017; TASK-024 gave resolved results an address).
 *
 * A server component: a `GET` form and server rendering answer this journey,
 * and `PRODUCT.md` §2's user is on mobile. It is not free of client code: the
 * search field is a client island (`surname-combobox.tsx`), and so is the dusk
 * world behind the hero with its zoom (`dusk-world.tsx`, `dusk-zoom.tsx`;
 * TASK-052, ADR-0021). The atlas's plates moved to `/pl/atlas` (TASK-178).
 *
 * A query that resolves to exactly one surname is **redirected** to that
 * surname's canonical page (ADR-0009) — `/pl/nazwisko/{slug}` — so the address
 * in the bar is the shareable one. An unresolved or ambiguous query renders
 * here with suggestions, because a miss is not a page.
 *
 * **This page derives nothing.** It calls `querySurnameResult`, parses the
 * result with `surnameResultResponseSchema`, and renders from the parsed value.
 * If validation fails it renders an error and no figures at all, because a
 * payload that violates its own contract is a bug and must not reach a reader
 * (`ARCHITECTURE.md` §6; `docs/canonical/16` §1.3).
 */

export const dynamic = "force-dynamic";

/**
 * A search result carries the visitor's raw query in the URL, so it is never
 * indexed: `docs/canonical/21` §36 keeps internal search out of the index, and
 * an indexed `/?surname=<whatever someone typed>` would publish it. The bare
 * landing page has no query and stays indexable.
 *
 * A resolved query redirects to its canonical page before this matters; this
 * covers the unresolved, ambiguous and invalid answers, which render here.
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const searched = first(params["surname"])?.trim() ?? "";
  const metadata = landingMetadata(parseLang(first(params["lang"])), siteOrigin());
  return searched === "" ? metadata : { ...metadata, robots: { index: false, follow: true } };
}

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * What the page has to show, as data.
 *
 * Deliberately not JSX: React renders lazily, so building JSX inside a
 * `try`/`catch` produces a block that looks like it handles render errors and
 * does not. This returns a value, and the component below turns it into markup
 * outside any try. The redirect also happens outside the try, because Next
 * implements it by throwing.
 */
type Answer =
  | { readonly kind: "NONE" }
  | { readonly kind: "INVALID" }
  | { readonly kind: "UNAVAILABLE" }
  | {
      readonly kind: "RESULT";
      readonly response: SurnameResultResponse;
      /** A resolved surname's stored address, when it has one. The page redirects there. */
      readonly path: string | null;
    };

async function answer(
  query: string,
  origin: ReturnType<typeof searchOrigin>,
  lang: Lang,
): Promise<Answer> {
  if (query === "") return { kind: "NONE" };
  // The surname is deliberately absent from every line below: canonical/19 §85
  // wants request content redacted by default, and a search term with a
  // timestamp is the visitor's, not the register's (TASK-019).
  const log = createLogger({ service: "web", base: { route: "/" } });
  const startedAt = Date.now();
  try {
    const db = sharedDb();
    const outcome = await querySurnameResult(db, query);
    if (outcome.kind === "INVALID_INPUT") {
      log.info("page_rejected_input", { reason: outcome.reason, ms: Date.now() - startedAt });
      return { kind: "INVALID" };
    }
    if (outcome.kind === "UNAVAILABLE") {
      log.error("page_unavailable", { reason: outcome.reason, ms: Date.now() - startedAt });
      return { kind: "UNAVAILABLE" };
    }
    const parsed = surnameResultResponseSchema.safeParse(outcome.response);
    if (!parsed.success) {
      log.error("page_contract_violation", {
        issues: parsed.error.issues,
        ms: Date.now() - startedAt,
      });
      return { kind: "UNAVAILABLE" };
    }
    log.info("search_completed", {
      result_status: parsed.data.status,
      suggestions_state: parsed.data.suggestions?.state ?? null,
      // Where the search came from — a result page, the home page, elsewhere —
      // and never which surname. `second_surname_search` is this field being
      // `result_page` (TASK-023 §2.6).
      search_origin: origin,
      ms: Date.now() - startedAt,
    });
    // The stored address, never one recomputed from the display form, which
    // cannot produce a collision suffix (`currentPathFor`).
    const path =
      parsed.data.status === "RESOLVED" && parsed.data.surname !== null
        ? await currentPathFor(db, parsed.data.surname.id, lang)
        : null;
    return { kind: "RESULT", response: parsed.data, path };
  } catch (cause: unknown) {
    log.error("page_failed", { cause, ms: Date.now() - startedAt });
    return { kind: "UNAVAILABLE" };
  }
}

/**
 * The card the landing shows before a search (TASK-065; one card since
 * TASK-178): the example surname's own first face, rendered by `deckCards`
 * from its validated response, so it carries its source and date and nothing
 * is drawn a second way. A failure costs the card, never the page. An answer
 * is kept for ten minutes per process, as the card images are kept at the
 * edge: it is one surname's whole page, which would otherwise be read on
 * every visit.
 */
const EXAMPLE_KEYS: readonly string[] = ["hello"];
const EXAMPLE_KEEP_MS = 10 * 60 * 1000;
const exampleKept = new Map<Lang, { readonly at: number; readonly value: LandingExample }>();

async function exampleDeck(lang: Lang): Promise<LandingExample | null> {
  const kept = exampleKept.get(lang);
  if (kept !== undefined && Date.now() - kept.at < EXAMPLE_KEEP_MS) return kept.value;
  const value = await loadExample(lang);
  if (value !== null) exampleKept.set(lang, { at: Date.now(), value });
  return value;
}

async function loadExample(lang: Lang): Promise<LandingExample | null> {
  try {
    const db = sharedDb();
    const outcome = await querySurnameResult(db, LANDING_EXAMPLE);
    if (outcome.kind !== "OK") return null;
    const parsed = surnameResultResponseSchema.safeParse(outcome.response);
    if (!parsed.success) return null;
    const response = parsed.data;
    if (response.status !== "RESOLVED" || response.surname === null) return null;
    const path = await currentPathFor(db, response.surname.id, lang);
    if (path === null) return null;
    const cards = deckCards(response, lang, { path, shareUrl: null })
      .map((card, i) => ({ number: i + 1, key: card.key, title: card.title, face: card.face }))
      .filter((card) => EXAMPLE_KEYS.includes(card.key));
    if (cards.length < 1) return null;
    return {
      surname: response.surname.display_name,
      deckPath: searchTarget(path, "default"),
      cards,
    };
  } catch (cause: unknown) {
    createLogger({ service: "web", base: { route: "/" } }).error("landing_example_failed", {
      cause,
    });
    return null;
  }
}

function Body({ answer: given, lang }: { answer: Answer; lang: Lang }) {
  const t = UI[lang];
  switch (given.kind) {
    case "NONE":
      return null;
    case "INVALID":
      return (
        <section>
          <h3>{t.invalidHeading}</h3>
          <p className="absent">{t.invalidBody}</p>
        </section>
      );
    case "UNAVAILABLE":
      return (
        <section>
          <h3>{t.unavailableHeading}</h3>
          <p className="absent">{t.unavailableBody}</p>
        </section>
      );
    case "RESULT":
      return <Result response={given.response} lang={lang} />;
  }
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const lang = parseLang(first(params["lang"]));
  const intent = parseIntent(first(params["intent"]));
  const t = UI[lang];
  const raw = first(params["surname"]);
  const query = raw?.trim() ?? "";
  const h = await headers();
  const origin = searchOrigin(referrerPath(h.get("referer"), requestOrigin(h.get("host"))));

  const given = await answer(query, origin, lang);
  const example = given.kind === "NONE" ? await exampleDeck(lang) : null;
  // The artefact's two list sizes for the Atlas tile and the register line
  // (TASK-040; TASK-178 moved the plates to `/pl/atlas`). Fails soft: no
  // facts, no figures.
  const atlas = given.kind === "NONE" ? loadListFacts(listFacts) : null;
  const figures: AtlasFigures | null =
    atlas === null
      ? null
      : { male: atlas.lists.male.summary.surnames, female: atlas.lists.female.summary.surnames };

  if (given.kind === "RESULT" && given.path !== null) {
    // The result has an address of its own. `?intent=` travels with it; the
    // canonical URL does not change (canonical/21 §35). A surname with no
    // stored address yet is answered here rather than sent to an address that
    // would not resolve.
    // The search opens the deck of cards over it (TASK-055, ADR-0025 §2.2).
    redirect(searchTarget(given.path, intent));
  }

  const otherLang: Lang = lang === "pl" ? "en" : "pl";
  const switchParams = new URLSearchParams();
  if (query !== "") switchParams.set("surname", query);
  if (otherLang === "en") switchParams.set("lang", "en");
  const otherPath = `/?${switchParams.toString()}`;

  // The bare page is the landing (ADR-0021; TASK-052): the dusk hero — the
  // register line, the headline, the field as the second-largest object,
  // Poland on the horizon behind them — then, on the ground (TASK-178's
  // order): what it is and why, how to use it, what to expect with the
  // example's card, and one tile per other tool.
  if (given.kind === "NONE") {
    // The register line names the artefact's own date; without the artefact
    // it names the register alone. Never a count, and never the two lists
    // added up.
    const canonicalOrigin = siteOrigin();
    const siteJsonLd = canonicalOrigin === null ? null : jsonLd(siteGraph(canonicalOrigin));
    const eyebrow =
      atlas === null
        ? t.landingEyebrow
        : `${t.landingEyebrow} · ${t.landingAsOf} ${numericDate(atlas.snapshot_date)}`;
    return (
      <SiteShell lang={lang} otherPath={otherPath} world={{ mode: "hero" }} mainClassName="landing">
        <DuskZoom />
        {/* Who publishes the site, and the site (TASK-123, `docs/canonical/21`
            §80): on the landing page only, and only with an absolute origin. */}
        {siteJsonLd === null ? null : (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteJsonLd }} />
        )}
        <section className="landing-stage" aria-labelledby="landing-headline">
          <p className="landing-eyebrow">{eyebrow}</p>
          {/* The words are ADR-0021's; their letters drift apart into points
              as the headline leaves the screen (the stylesheet). */}
          <h1 id="landing-headline" className="landing-headline">
            <Scatter text={t.landingHeadline} />{" "}
            <span>
              <Scatter text={t.landingHeadlineEm} />
            </span>
          </h1>
          <p className="landing-lede">{t.landingLede}</p>
          <SearchForm lang={lang} query={query} />
          <LandingTreeLine lang={lang} />
          {/* Empty until a search leaves the page: `dusk-zoom.tsx` fills it
              from `data-text`, so nothing is announced before it is true. */}
          <p
            className="landing-status visually-hidden"
            aria-live="polite"
            data-text={t.landingSearching}
          />
          {/* The journey's analysis screen (TASK-053): the typed surname and
              the parts of the answer the one request reads, shown while the
              camera comes down. Nothing is ticked off and there is no
              progress bar: the request does all of it at once. The status
              line above is what assistive technology hears. */}
          <div className="landing-analysis" aria-hidden="true" hidden>
            <p className="analysis-name" />
            <ul className="analysis-steps">
              {t.analysisSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
          <p className="landing-trust">{t.landingTrust}</p>
        </section>
        <div className="landing-atlas">
          <LandingWhat lang={lang} />
          <LandingSteps lang={lang} />
          <LandingExpect example={example} lang={lang} />
          <LandingTools figures={figures} lang={lang} />
        </div>
      </SiteShell>
    );
  }

  // A query answered here — unresolved, ambiguous, invalid or unavailable —
  // keeps the search in the header, above its answer.
  return (
    <SiteShell
      lang={lang}
      otherPath={otherPath}
      world={{ mode: "journey" }}
      search={{ query }}
      mainClassName="answer"
    >
      <Body answer={given} lang={lang} />
    </SiteShell>
  );
}

/** `2026-01-20` → `20.01.2026`, the brand's numeric date. Presentation only. */
function numericDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return day === undefined || month === undefined || year === undefined
    ? iso
    : `${day}.${month}.${year}`;
}
