import { db as sharedDb } from "../lib/db.js";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createLogger } from "@name-atlas/logging";
import { mostCommonSurnames, querySurnameResult } from "@name-atlas/truth";
import { currentSlugsFor } from "@name-atlas/seo";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { htmlLang, parseIntent, parseLang, UI } from "../lib/messages.js";
import type { Lang } from "../lib/messages.js";
import { Result } from "../lib/result-view.js";
import { SearchForm } from "../lib/search-form.js";
import { CommonSurnames } from "../lib/common-surnames.js";
import type { CommonList } from "../lib/common-surnames.js";
import { pathForSlug } from "../lib/slug.js";
import { surnamePath } from "../lib/slug.js";
import { referrerPath, requestOrigin, searchOrigin } from "../lib/surname-page.js";
import { NamePrint } from "../lib/name-print.js";
import { AtlasField } from "../lib/atlas-field.js";

/**
 * The search page (TASK-017; TASK-024 gave resolved results an address).
 *
 * A server component with no client bundle: a `GET` form and server rendering
 * answer this journey, and `PRODUCT.md` §2's user is on mobile.
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
  return searched === "" ? {} : { robots: { index: false, follow: true } };
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
  | { readonly kind: "RESULT"; readonly response: SurnameResultResponse };

async function answer(query: string, origin: ReturnType<typeof searchOrigin>): Promise<Answer> {
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
    return { kind: "RESULT", response: parsed.data };
  } catch (cause: unknown) {
    log.error("page_failed", { cause, ms: Date.now() - startedAt });
    return { kind: "UNAVAILABLE" };
  }
}

/**
 * The most common surnames for the bare landing page, from rank claims
 * (`mostCommonSurnames`). A failure here costs the section, never the page.
 */
async function commonLists(lang: Lang): Promise<CommonList[]> {
  try {
    const db = sharedDb();
    const lists = await mostCommonSurnames(db, { limit: 10 });
    const ids = lists.flatMap((l) => l.items.map((i) => i.surname_id));
    const slugs = await currentSlugsFor(db, lang, ids);
    return lists.map((l) => ({
      comparability_group: l.comparability_group,
      snapshot_date: l.snapshot_date,
      items: l.items.map((i) => {
        const slug = slugs.get(i.surname_id);
        const path = slug === undefined ? null : pathForSlug(slug, lang);
        const search = new URLSearchParams({
          surname: i.display_name,
          ...(lang === "en" ? { lang } : {}),
        });
        return {
          display_name: i.display_name,
          rank: i.rank,
          path: path ?? `/?${search.toString()}`,
        };
      }),
    }));
  } catch (cause: unknown) {
    createLogger({ service: "web", base: { route: "/" } }).error("common_surnames_failed", {
      cause,
    });
    return [];
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

  const given = await answer(query, origin);
  const common = given.kind === "NONE" ? await commonLists(lang) : [];

  if (
    given.kind === "RESULT" &&
    given.response.status === "RESOLVED" &&
    given.response.surname !== null
  ) {
    // The result has an address of its own. `?intent=` travels with it; the
    // canonical URL does not change (canonical/21 §35).
    const path = surnamePath(given.response.surname.display_name, lang);
    // A display form that slugs to nothing has no canonical address, so the
    // answer stays here rather than redirecting to `/pl/nazwisko/`.
    if (path !== null) redirect(intent === "default" ? path : `${path}?intent=${intent}`);
  }

  const otherLang: Lang = lang === "pl" ? "en" : "pl";
  const switchParams = new URLSearchParams();
  if (query !== "") switchParams.set("surname", query);
  if (otherLang === "en") switchParams.set("lang", "en");

  // The bare page is the landing (Visual System §39 screen 01): a headline, the
  // field as the second-largest object, and the Atlas field graphic. Any query
  // answered here keeps the compact search above its answer.
  const landing = given.kind === "NONE";

  return (
    <>
      {/* The nearest `lang` wins: the document is Polish by default and an
          English answer says so here (see `layout.tsx`). */}
      <main lang={htmlLang(lang)} className={landing ? "landing" : undefined}>
        <div className="masthead">
          <h1>
            <NamePrint className="logo-mark" size="small" />
            {t.title}
          </h1>
          <a href={`/?${switchParams.toString()}`}>{t.langSwitch}</a>
        </div>
        {landing ? (
          <div className="landing-stage">
            <h2 className="landing-headline">
              {t.landingHeadline} <em>{t.landingHeadlineEm}</em>
            </h2>
            <p className="landing-lede">{t.landingLede}</p>
            <SearchForm lang={lang} query={query} />
            <p className="landing-hint">{t.landingHint}</p>
            <AtlasField />
          </div>
        ) : (
          <>
            <p className="tagline">{t.tagline}</p>
            <SearchForm lang={lang} query={query} />
          </>
        )}
        <Body answer={given} lang={lang} />
        <CommonSurnames lists={common} lang={lang} />
      </main>
      <footer lang={htmlLang(lang)}>{t.footer}</footer>
    </>
  );
}
