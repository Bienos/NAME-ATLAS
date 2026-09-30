import { cache } from "react";
import { db as sharedDb } from "./db.js";
import type { Metadata } from "next";
import { createLogger } from "@name-atlas/logging";
import { querySurnameResult } from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { assessIndexability, indexingEnabled, siteOrigin } from "./seo.js";
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
import { SearchForm } from "./search-form.js";
import { ShareButton } from "./share-button.js";
import { NamePrint } from "./name-print.js";

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

export { siteOrigin };

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

function pageLog(lang: Lang) {
  return createLogger({
    service: "web",
    base: { route: lang === "en" ? "/en/surname/[slug]" : "/pl/nazwisko/[slug]" },
  });
}

/**
 * Resolves the slug and reads the projection. Every failure is a typed answer;
 * nothing from a caught error reaches the page (canonical/16 §78).
 *
 * Memoised per request with React's `cache`: `generateMetadata` and the page
 * ask for the same slug in the same request, and it is read from the database
 * once. `ms` is the time to the validated projection, as `page_rendered` has
 * always reported it.
 */
const resolveAnswer = cache(
  async (slug: string, lang: Lang): Promise<{ answer: PageAnswer; ms: number }> => {
    const log = pageLog(lang);
    const startedAt = Date.now();
    try {
      const db = sharedDb();
      const resolved = await resolveSlug(db, slug, lang);
      if (resolved.kind === "INVALID") return { answer: { kind: "INVALID_SLUG" }, ms: 0 };
      if (resolved.kind === "MOVED") {
        // A display form was corrected and this address retired. The link is
        // already in somebody's index, so it is redirected rather than refused
        // (ADR-0010 §2). The surname itself is never logged — only that it moved.
        log.info("slug_superseded", { ms: Date.now() - startedAt });
        return { answer: { kind: "MOVED", current_slug: resolved.current_slug }, ms: 0 };
      }
      if (resolved.kind === "UNKNOWN") {
        log.info("slug_unknown", { ms: Date.now() - startedAt });
        return { answer: { kind: "UNKNOWN", slug }, ms: 0 };
      }
      const outcome = await querySurnameResult(db, resolved.display_name);
      if (outcome.kind !== "OK") {
        log.error("page_unavailable", { reason: outcome.reason, ms: Date.now() - startedAt });
        return { answer: { kind: "UNAVAILABLE" }, ms: 0 };
      }
      const parsed = surnameResultResponseSchema.safeParse(outcome.response);
      if (!parsed.success) {
        log.error("page_contract_violation", {
          issues: parsed.error.issues,
          ms: Date.now() - startedAt,
        });
        return { answer: { kind: "UNAVAILABLE" }, ms: 0 };
      }
      const ms = Date.now() - startedAt;
      const [gates, otherLangPath] = await Promise.all([
        seoGatesFor(db, resolved.surname_id),
        currentPathFor(db, resolved.surname_id, lang === "pl" ? "en" : "pl"),
      ]);
      return {
        answer: {
          kind: "RESULT",
          response: parsed.data,
          display: resolved.display_name,
          slug: resolved.slug,
          otherLangPath,
          gates: { seoSurfaceAllowed: gates.seoSurfaceAllowed, privacyPublic: gates.privacyPublic },
        },
        ms,
      };
    } catch (cause: unknown) {
      log.error("page_failed", { cause, ms: Date.now() - startedAt });
      return { answer: { kind: "UNAVAILABLE" }, ms: 0 };
    }
  },
);

/**
 * The page's answer for metadata: the same memoised read as the page, without
 * recording a page view.
 */
export async function answerSlugForMetadata(slug: string, lang: Lang): Promise<PageAnswer> {
  return (await resolveAnswer(slug, lang)).answer;
}

/** The page's answer, recording one `page_rendered` view when there is a result. */
export async function answerSlug(
  slug: string,
  referrerPath: string | null,
  lang: Lang = "pl",
): Promise<PageAnswer> {
  const { answer, ms } = await resolveAnswer(slug, lang);
  if (answer.kind === "RESULT") {
    const { response } = answer;
    pageLog(lang).info("page_rendered", {
      route: "canonical",
      result_status: response.status,
      population_state: response.population?.state ?? null,
      rarity_state: response.rarity?.state ?? null,
      distribution_state: response.distribution?.state ?? null,
      meaning_state: response.meaning?.state ?? null,
      search_origin: searchOrigin(referrerPath),
      ms,
    });
  }
  return answer;
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
}: {
  answer: PageAnswer;
  lang: Lang;
  slug: string;
  intent: Intent;
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

  return (
    <>
      <main lang={htmlLang(lang)} className="profile">
        <div className="masthead">
          <h1>
            <a href={lang === "en" ? "/?lang=en" : "/"}>
              <NamePrint className="logo-mark" size="small" />
              {t.title}
            </a>
          </h1>
          <a href={otherPath}>{t.langSwitch}</a>
        </div>
        <SearchForm lang={lang} query={answer.kind === "RESULT" ? answer.display : ""} />
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
            <Result response={answer.response} lang={lang} intent={intent} />
            <div className="result-actions">
              {shareUrl === null ? null : (
                <ShareButton url={shareUrl} title={`${answer.display} — ${t.title}`} lang={lang} />
              )}
              <p className="again">
                <a href="#surname">{t.searchAnother}</a>
              </p>
            </div>
          </>
        ) : // `MOVED`. The route answers a permanent redirect before rendering, so
        // this branch exists only to keep the union exhaustive.
        null}
      </main>
      <footer lang={htmlLang(lang)}>{t.footer}</footer>
    </>
  );
}

export { parseIntent };
