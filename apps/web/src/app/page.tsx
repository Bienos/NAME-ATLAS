import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { createLogger } from "@name-atlas/logging";
import { querySurnameResult } from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { parseLang, UI } from "../lib/messages.js";
import type { Lang } from "../lib/messages.js";
import { Result } from "../lib/result-view.js";

/**
 * The free surname result page (TASK-017) — M2's exit journey.
 *
 * A server component. There is no client bundle: a `GET` form and server
 * rendering answer this journey, and `PRODUCT.md` §2's user is on mobile.
 *
 * **This page derives nothing.** It calls `querySurnameResult`, parses the
 * result with `surnameResultResponseSchema`, and renders from the parsed value.
 * If validation fails it renders an error and no figures at all, because a
 * payload that violates its own contract is a bug and must not reach a reader
 * (`ARCHITECTURE.md` §6; `docs/canonical/16` §1.3).
 *
 * Consequences of that one rule, all visible below: nothing here sums the two
 * sex partitions, rounds a figure, divides a regional count by a national one,
 * decides whether a distribution may be presented, or renders a value the rights
 * layer withheld — a `RIGHTS_BLOCKED` section carries no values in the payload at
 * all, so there is nothing to hide (`docs/canonical/16` §55).
 */

export const dynamic = "force-dynamic";

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
 * outside any try.
 */
type Answer =
  | { readonly kind: "NONE" }
  | { readonly kind: "INVALID" }
  | { readonly kind: "UNAVAILABLE" }
  | { readonly kind: "RESULT"; readonly response: SurnameResultResponse };

/**
 * Answers one query, or says honestly that it cannot.
 *
 * Configuration, connection, query and validation are all inside the try.
 * `loadDbConfig` throws when `DATABASE_URL` is absent, and a misconfigured
 * deployment must render the unavailable state rather than crash — the reader is
 * owed the same answer either way.
 */
async function answer(query: string): Promise<Answer> {
  if (query === "") return { kind: "NONE" };
  // The surname is deliberately absent from every line below: canonical/19 §85
  // wants request content redacted by default, and a search term with a
  // timestamp is the visitor's, not the register's (TASK-019).
  const log = createLogger({ service: "web", base: { route: "/" } });
  const startedAt = Date.now();
  let db: ReturnType<typeof createDb> | null = null;
  try {
    db = createDb(createPool(loadDbConfig()));
    const outcome = await querySurnameResult(db, query);
    if (outcome.kind === "INVALID_INPUT") {
      log.info("page_rejected_input", { reason: outcome.reason, ms: Date.now() - startedAt });
      return { kind: "INVALID" };
    }
    if (outcome.kind === "UNAVAILABLE") {
      // Logged so an outage is diagnosable; nothing about it reaches the page.
      log.error("page_unavailable", { reason: outcome.reason, ms: Date.now() - startedAt });
      return { kind: "UNAVAILABLE" };
    }
    // The rule this page is built on: render only what validated.
    const parsed = surnameResultResponseSchema.safeParse(outcome.response);
    if (!parsed.success) {
      // A payload that violates its own contract is a bug, not an outage. The
      // reader sees the same honest message; the log tells the two apart.
      log.error("page_contract_violation", {
        issues: parsed.error.issues,
        ms: Date.now() - startedAt,
      });
      return { kind: "UNAVAILABLE" };
    }
    log.info("page_rendered", {
      result_status: parsed.data.status,
      population_state: parsed.data.population?.state ?? null,
      rarity_state: parsed.data.rarity?.state ?? null,
      distribution_state: parsed.data.distribution?.state ?? null,
      suggestions_state: parsed.data.suggestions?.state ?? null,
      ms: Date.now() - startedAt,
    });
    return { kind: "RESULT", response: parsed.data };
  } catch (cause: unknown) {
    // Nothing from `cause` reaches the page: no message, no stack, no SQL and no
    // connection string (docs/canonical/16 §78's rule, applied to a page). The
    // logger redacts it, so it cannot reach a log file either.
    log.error("page_failed", { cause, ms: Date.now() - startedAt });
    return { kind: "UNAVAILABLE" };
  } finally {
    await db?.destroy();
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
  const t = UI[lang];
  const raw = first(params["surname"]);
  const query = raw?.trim() ?? "";

  const given = await answer(query);

  const otherLang: Lang = lang === "pl" ? "en" : "pl";
  const switchParams = new URLSearchParams();
  if (query !== "") switchParams.set("surname", query);
  if (otherLang === "en") switchParams.set("lang", "en");

  return (
    <>
      <main>
        <div className="masthead">
          <h1>{t.title}</h1>
          <a href={`/?${switchParams.toString()}`}>{t.langSwitch}</a>
        </div>
        <p className="tagline">{t.tagline}</p>
        <form className="search" action="/" method="get">
          <label htmlFor="surname">{t.searchLabel}</label>
          <input
            id="surname"
            name="surname"
            type="text"
            defaultValue={query}
            placeholder={t.searchPlaceholder}
            autoComplete="off"
            spellCheck={false}
          />
          {lang === "en" ? <input type="hidden" name="lang" value="en" /> : null}
          <button type="submit">{t.searchAction}</button>
        </form>
        <Body answer={given} lang={lang} />
      </main>
      <footer>{t.footer}</footer>
    </>
  );
}
