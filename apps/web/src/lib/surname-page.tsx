import { accountsEnabled } from "./accounts-config.js";
import { db as sharedDb } from "./db.js";
import type { Metadata } from "next";
import Image from "next/image";
import { createLogger } from "@name-atlas/logging";
import { querySurnameResult } from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { assessIndexability, indexingEnabled } from "./seo.js";
import { seoGatesFor } from "./seo-surface.js";
import { currentPathFor, pathForSlug, resolveSlug } from "./slug.js";
import {
  formatDate,
  formatInteger,
  htmlLang,
  parseIntent,
  partitionLabel,
  UI,
} from "./messages.js";
import type { Intent, Lang } from "./messages.js";
import { Result } from "./result-view.js";
import { ShareButton } from "./share-button.js";
import { ReportLink } from "./report-link.js";
import { SiteShell } from "./site-shell.js";
import { SUMMARY_ANCHOR } from "./sections.js";
import { comparePagePath } from "./site-links.js";
import { EMPTY_WORLD, worldInput } from "./dusk-world-input.js";
import { deckCards, deckSignIn } from "./deck.js";
import { SurnameDeck } from "./deck-client.js";

/**
 * The canonical surname page (TASK-024, ADR-0009), shared by
 * `/pl/nazwisko/[slug]` and `/en/surname/[slug]`.
 *
 * The same rule as `/`: it derives nothing, queries once, validates against
 * the contract and renders only what validated. What is new here is that the
 * page has an *address*: a slug that maps back to exactly one entity or to an
 * honest refusal, a canonical URL, robots metadata that says `noindex` until
 * `docs/canonical/21` §42's policy and the alpha flag both allow indexing, and
 * a share control whose URL is this page's own.
 */

export const SITE_ORIGIN_ENV = "SITE_ORIGIN";

/** The public origin for canonical and Open Graph URLs. Never guessed from a request. */
export function siteOrigin(env: Record<string, string | undefined> = process.env): string | null {
  const value = env[SITE_ORIGIN_ENV]?.trim();
  return value ? value.replace(/\/+$/u, "") : null;
}

export type PageAnswer =
  | { readonly kind: "INVALID_SLUG" }
  | { readonly kind: "UNKNOWN"; readonly slug: string }
  /** A retired address (ADR-0010 §2). The route answers a permanent redirect. */
  | { readonly kind: "MOVED"; readonly current_slug: string }
  | { readonly kind: "UNAVAILABLE" }
  | {
      readonly kind: "RESULT";
      readonly response: SurnameResultResponse;
      readonly display: string;
      /** The stored address that resolved, in the page's language. Links use it. */
      readonly slug: string;
      /** The same surname's stored address in the other language, if it has one. */
      readonly otherLangPath: string | null;
      /** §40's SEO-surface and privacy gates, evaluated where the database is. */
      readonly gates: { readonly seoSurfaceAllowed: boolean; readonly privacyPublic: boolean };
    };

/**
 * Resolves the slug and reads the projection. Every failure is a typed answer;
 * nothing from a caught error reaches the page (canonical/16 §78).
 */
export async function answerSlug(
  slug: string,
  referrerPath: string | null,
  lang: Lang = "pl",
): Promise<PageAnswer> {
  const log = createLogger({
    service: "web",
    base: { route: lang === "en" ? "/en/surname/[slug]" : "/pl/nazwisko/[slug]" },
  });
  const startedAt = Date.now();
  try {
    const db = sharedDb();
    const resolved = await resolveSlug(db, slug, lang);
    if (resolved.kind === "INVALID") return { kind: "INVALID_SLUG" };
    if (resolved.kind === "MOVED") {
      // A display form was corrected and this address retired. The link is
      // already in somebody's index, so it is redirected rather than refused
      // (ADR-0010 §2). The surname itself is never logged — only that it moved.
      log.info("slug_superseded", { ms: Date.now() - startedAt });
      return { kind: "MOVED", current_slug: resolved.current_slug };
    }
    if (resolved.kind === "UNKNOWN") {
      log.info("slug_unknown", { ms: Date.now() - startedAt });
      return { kind: "UNKNOWN", slug };
    }
    const outcome = await querySurnameResult(db, resolved.display_name);
    if (outcome.kind !== "OK") {
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
    log.info("page_rendered", {
      route: "canonical",
      result_status: parsed.data.status,
      population_state: parsed.data.population?.state ?? null,
      rarity_state: parsed.data.rarity?.state ?? null,
      distribution_state: parsed.data.distribution?.state ?? null,
      meaning_state: parsed.data.meaning?.state ?? null,
      archive_state: parsed.data.archive?.state ?? null,
      search_origin: searchOrigin(referrerPath),
      ms: Date.now() - startedAt,
    });
    const gates = await seoGatesFor(db, resolved.surname_id);
    const otherLangPath = await currentPathFor(
      db,
      resolved.surname_id,
      lang === "pl" ? "en" : "pl",
    );
    return {
      kind: "RESULT",
      response: parsed.data,
      display: resolved.display_name,
      slug: resolved.slug,
      otherLangPath,
      gates: { seoSurfaceAllowed: gates.seoSurfaceAllowed, privacyPublic: gates.privacyPublic },
    };
  } catch (cause: unknown) {
    log.error("page_failed", { cause, ms: Date.now() - startedAt });
    return { kind: "UNAVAILABLE" };
  }
}

/**
 * Where a search came from, from the referrer's **path** only (TASK-023 §2.6).
 * A second search from a result page is the metric the directive names; the
 * surname in that path is never logged, only the fact that it was a result page.
 */
export function searchOrigin(
  referrerPath: string | null,
): "result_page" | "home" | "external" | "direct" {
  if (referrerPath === null) return "direct";
  if (/^\/(pl\/nazwisko|en\/surname)\//u.test(referrerPath)) return "result_page";
  if (referrerPath === "/" || referrerPath.startsWith("/?")) return "home";
  return "external";
}

/**
 * The referrer's path when it is same-origin, else the marker `"external"`.
 * Never the query string: a referrer from a search page carries the visitor's
 * surname in it, and that must not reach a log (`docs/canonical/19` §85).
 *
 * `origin` is this deployment's own. When it is unknown the referrer is
 * **external** — not trusted. Review on 2026-09-21 pointed out that skipping
 * the check when `SITE_ORIGIN` is unset let any third party set the
 * `search_origin` metric by linking in. Callers pass the request's own `Host`
 * as a fallback so the check still works in local development.
 */
export function referrerPath(referer: string | null, origin: string | null): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    if (origin === null || url.origin !== origin) return "external";
    return url.pathname;
  } catch {
    return null;
  }
}

/**
 * This deployment's origin: `SITE_ORIGIN` when set, else the request's own
 * `Host`. The header is not trustworthy for building a *canonical* URL — which
 * is why `siteOrigin` alone does that — but it is exactly right for deciding
 * whether a referrer came from this same site.
 */
export function requestOrigin(host: string | null, protocol = "https"): string | null {
  const fromEnv = siteOrigin();
  if (fromEnv !== null) return fromEnv;
  if (!host) return null;
  try {
    return new URL(`${host.startsWith("localhost") ? "http" : protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

/** Title and description from the projection alone; never a fact it lacks. */
/**
 * The canonical path for an answer.
 *
 * Taken from the **resolved** surname's stored address where there is one, never
 * echoed from the request: a differently-encoded address must still declare the
 * one canonical URL, which is the whole point of the tag. Nor is it recomputed
 * from the display form, which cannot produce a collision suffix
 * (`currentPathFor`). Only an unresolved address falls back to what was asked
 * for, and that address is `noindex`.
 */
export function canonicalPathFor(answer: PageAnswer, lang: Lang, slug: string): string {
  if (answer.kind === "RESULT") {
    const path = pathForSlug(answer.slug, lang);
    if (path !== null) return path;
  }
  const encoded = encodeURIComponent(slug);
  return lang === "en" ? `/en/surname/${encoded}` : `/pl/nazwisko/${encoded}`;
}

export function metadataFor(answer: PageAnswer, lang: Lang, slug: string): Metadata {
  const t = UI[lang];
  const origin = siteOrigin();
  const path = canonicalPathFor(answer, lang, slug);
  const canonical = origin === null ? path : `${origin}${path}`;
  const base: Metadata = {
    alternates: { canonical },
    robots: { index: false, follow: true },
  };
  if (answer.kind !== "RESULT" || answer.response.status !== "RESOLVED") {
    return { ...base, title: `${t.title}` };
  }
  const r = answer.response;
  const indexability = assessIndexability(r, {
    enabled: indexingEnabled(),
    // Real values now (TASK-027): `answerSlug` folds every cited source's rights
    // most-restrictively and evaluates the SEO surface from the fold, and reads
    // the entity's privacy class. §40 wants both gates, and both are answered.
    seoSurfaceAllowed: answer.gates.seoSurfaceAllowed,
    privacyPublic: answer.gates.privacyPublic,
  });
  const description =
    r.population?.state === "READY"
      ? r.population.observations
          .map((o) => {
            const sex = partitionLabel(o.comparability_group, lang);
            const n = o.value.value === null ? null : formatInteger(o.value.value, lang);
            if (n === null) return null;
            // The date travels with the count. `ARCHITECTURE.md` §10 invariant 5
            // applies to a search-result snippet as much as to the page: a
            // count without its date is not a count (review, 2026-09-21).
            const on = formatDate(o.snapshot_date, lang);
            return lang === "pl"
              ? `${n} osób${sex ? ` (${sex})` : ""} w rejestrze PESEL na dzień ${on}`
              : `${n} people${sex ? ` (${sex})` : ""} in the PESEL register on ${on}`;
          })
          .filter((s): s is string => s !== null)
          .join(" · ")
      : r.population?.reason_code === "NOT_DERIVED_YET"
        ? t.heroNotDerived
        : t.heroNoCount;
  return {
    ...base,
    title: `${answer.display} — ${t.title}`,
    description,
    robots: { index: indexability.indexability === "INDEX", follow: true },
    openGraph: {
      title: `${answer.display} — ${t.title}`,
      description,
      url: canonical,
      type: "website",
      locale: lang === "pl" ? "pl_PL" : "en_GB",
    },
  };
}

export function CanonicalSurnamePage({
  answer,
  lang,
  slug,
  intent,
  origin,
  cards = false,
}: {
  answer: PageAnswer;
  lang: Lang;
  slug: string;
  intent: Intent;
  /** The search asked for the deck (`?view=cards`, ADR-0025 §2.2). */
  cards?: boolean;
  /**
   * The absolute origin to build the share URL from — `SITE_ORIGIN`, else the
   * request's own `Host`. `null` withholds the share control, because a
   * relative path in someone's clipboard is not a link (review, 2026-09-21).
   */
  origin: string | null;
}) {
  const t = UI[lang];
  // What the reader shares is this page's canonical address, not the one they
  // happened to type (review, 2026-09-21).
  const path = canonicalPathFor(answer, lang, slug);
  const shareUrl = origin === null ? null : `${origin}${path}`;
  const otherLang: Lang = lang === "pl" ? "en" : "pl";
  const otherPath =
    (answer.kind === "RESULT" ? answer.otherLangPath : null) ??
    (otherLang === "en" ? "/?lang=en" : "/");
  // The dusk world behind the journey (ADR-0021, TASK-052): the camera already
  // down, the register as points, and the surname's own regional shares — the
  // validated ones the chapter prints — as its light. Nothing else is derived.
  const world = answer.kind === "RESULT" ? worldInput(answer.response) : EMPTY_WORLD;
  // The deck over the page (TASK-055): the same response, one answer per card.
  const deck = answer.kind === "RESULT" ? deckCards(answer.response, lang, { path, shareUrl }) : [];

  return (
    <SiteShell
      lang={lang}
      otherPath={otherPath}
      world={{ mode: "journey", weights: world.weights, lit: world.lit }}
      search={{ query: answer.kind === "RESULT" ? answer.display : "" }}
      mainClassName="profile"
    >
      {answer.kind === "INVALID_SLUG" || answer.kind === "UNKNOWN" ? (
        <section>
          <h3>{t.unresolvedHeading}</h3>
          <p className="absent">{t.slugUnknownBody}</p>
        </section>
      ) : answer.kind === "UNAVAILABLE" ? (
        <section>
          <h3>{t.unavailableHeading}</h3>
          <p className="absent">{t.unavailableBody}</p>
        </section>
      ) : answer.kind === "RESULT" ? (
        <>
          <Result
            response={answer.response}
            lang={lang}
            intent={intent}
            after={{ href: `#${SUMMARY_ANCHOR}`, label: t.summaryHeading }}
          />
          {/* The journey's last screen (TASK-053): the share card the page
              already serves for this address, drawn only from validated
              facts (`og-card.tsx`), to share or save; then where to go next. */}
          <section
            id={SUMMARY_ANCHOR}
            className="result-actions summary"
            aria-labelledby="summary-heading"
          >
            <h3 id="summary-heading">{t.summaryHeading}</h3>
            <p className="summary-lede">{t.summaryLede}</p>
            {/* Served as is: the card is already a generated PNG at its final size. */}
            <Image
              className="summary-card"
              src={`${path}/opengraph-image`}
              alt={`${t.summaryCardAlt}: ${answer.display}`}
              width={1200}
              height={630}
              unoptimized
            />
            <div className="summary-share">
              {shareUrl === null ? null : (
                <ShareButton url={shareUrl} title={`${answer.display} — ${t.title}`} lang={lang} />
              )}
              <a
                className="save-image"
                href={`${path}/opengraph-image`}
                download={`${answer.slug}.png`}
              >
                {t.saveImage}
              </a>
            </div>
            <p className="again">
              <a href="#surname">{t.searchAnother}</a>
              <a href={`${comparePagePath(lang)}?a=${encodeURIComponent(answer.slug)}`}>
                {t.compareFromHere}
              </a>
            </p>
            <ReportLink surnames={[answer.display]} pageUrl={shareUrl ?? path} lang={lang} />
          </section>
          {deck.length === 0 ? null : (
            <SurnameDeck
              cards={deck}
              surname={answer.display}
              initiallyOpen={cards}
              lang={htmlLang(lang)}
              labels={{
                open: t.deckOpen,
                close: t.deckClose,
                label: t.deckLabel,
                cards: t.deckCards,
                of: t.deckOf,
                prev: t.deckPrev,
                next: t.deckNext,
                hintKeys: t.deckHintKeys,
                hintTouch: t.deckHintTouch,
                share: t.deckShare,
                sharing: t.deckSharing,
              }}
              signIn={deckSignIn(lang, path, accountsEnabled())}
            />
          )}
        </>
      ) : // `MOVED`. The route answers a permanent redirect before rendering, so
      // this branch exists only to keep the union exhaustive.
      null}
    </SiteShell>
  );
}

export { parseIntent };
