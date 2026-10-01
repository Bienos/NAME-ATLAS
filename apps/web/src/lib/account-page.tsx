import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isTokenShape } from "@name-atlas/accounts";
import { accountPath, actionPath, stepFromSlug } from "./account-paths.js";
import type { AccountAction, AccountStep } from "./account-paths.js";
import { ACCOUNT_TEXT, statusWords } from "./account-text.js";
import { accountsEnabled } from "./accounts-config.js";
import { accountsRuntime } from "./accounts-runtime.js";
import { legalPath } from "./legal-text.js";
import { formatDate } from "./messages.js";
import type { Lang } from "./messages.js";
import { sessionCookieName } from "./session-cookie.js";
import { SiteShell } from "./site-shell.js";

/**
 * The account's six pages (TASK-062): `/pl/konto/[[...step]]` and
 * `/en/account/[[...step]]`.
 *
 * Plain HTML forms that post to `/api/account/<action>` and need no script. The
 * pages are `noindex` and `no-store`. The two that carry a token in the address
 * (confirming a sign-up, choosing a new password) also send no `Referer` to
 * another site (`same-origin`; the default policy already sends such a site only
 * the origin, never the path or the query), and
 * the token is in the query and the form's hidden field only. Opening one
 * spends nothing: the token is spent by the form's POST, so a mail scanner that
 * follows the link does not use it up (ADR-0027 §2.6).
 *
 * `decideAccountPage` holds every decision and is pure; the component below it
 * only fetches the session and renders the answer.
 */

export interface SessionView {
  readonly email: string;
  readonly termsVersion: string;
  /** ISO date, `YYYY-MM-DD`. */
  readonly termsAcceptedOn: string;
}

export interface AccountPageData {
  readonly lang: Lang;
  readonly step: AccountStep;
  /** A status word the step knows, or null. */
  readonly status: string | null;
  /** A well-formed token for `confirm` and `new-password`, or null. */
  readonly token: string | null;
  readonly session: SessionView | null;
}

export type AccountPageDecision =
  | { readonly kind: "not-found" }
  | { readonly kind: "redirect"; readonly to: string }
  | { readonly kind: "view"; readonly data: AccountPageData };

type Query = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(query: Query, name: string): string | null {
  const value = query[name];
  const text = Array.isArray(value) ? value[0] : value;
  return typeof text === "string" && text !== "" ? text : null;
}

/** Which of the steps need to know who is signed in. */
const NEEDS_SESSION: ReadonlySet<AccountStep> = new Set(["account", "sign-in", "sign-up"]);

export function stepNeedsSession(step: AccountStep): boolean {
  return NEEDS_SESSION.has(step);
}

export function decideAccountPage(input: {
  readonly enabled: boolean;
  readonly lang: Lang;
  readonly segments: readonly string[] | undefined;
  readonly query: Query;
  readonly session: SessionView | null;
}): AccountPageDecision {
  const { lang, session } = input;
  if (!input.enabled) return { kind: "not-found" };
  const step = stepFromSlug(lang, input.segments);
  if (step === null) return { kind: "not-found" };

  if (step === "account") {
    if (session === null) return { kind: "redirect", to: accountPath(lang, "sign-in") };
  } else if ((step === "sign-in" || step === "sign-up") && session !== null) {
    return { kind: "redirect", to: accountPath(lang, "account") };
  }

  const word = first(input.query, "status");
  const known = statusWords(lang, step, word) === null ? null : word;
  const given = first(input.query, "token");
  const token = given !== null && isTokenShape(given) ? given : null;
  // A link with no usable token cannot do anything but say so.
  const needsToken = step === "confirm" || step === "new-password";
  const status = needsToken && token === null && known === null ? "expired" : known;
  return { kind: "view", data: { lang, step, status, token, session } };
}

export function accountMetadata(lang: Lang, step: AccountStep): Metadata {
  const carriesToken = step === "confirm" || step === "new-password";
  return {
    title: `${ACCOUNT_TEXT[lang].headings[step]} — Name Atlas`,
    robots: { index: false, follow: false },
    // `same-origin`, not `no-referrer`: a page with `no-referrer` makes the browser
    // post its own form with `Origin: null`. Other sites still get no Referer.
    ...(carriesToken ? { referrer: "same-origin" as const } : {}),
  };
}

function Field({
  name,
  label,
  type,
  autoComplete,
  hint,
  minLength,
  maxLength,
}: {
  readonly name: string;
  readonly label: string;
  readonly type: "email" | "password";
  readonly autoComplete: string;
  readonly hint?: string;
  readonly minLength?: number;
  readonly maxLength: number;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        maxLength={maxLength}
        autoCapitalize="none"
        spellCheck={false}
      />
      {hint === undefined ? null : <small>{hint}</small>}
    </label>
  );
}

function Form({
  action,
  lang,
  children,
  label,
}: {
  readonly action: AccountAction;
  readonly lang: Lang;
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <form
      className="offer-form account-form"
      method="post"
      action={actionPath(action)}
      aria-label={label}
    >
      <input type="hidden" name="lang" value={lang} />
      {children}
    </form>
  );
}

function Send({
  children,
  danger = false,
}: {
  readonly children: ReactNode;
  readonly danger?: boolean;
}) {
  return (
    <button type="submit" className={danger ? "offer-send account-danger" : "offer-send"}>
      {children}
    </button>
  );
}

export function AccountView({ data }: { readonly data: AccountPageData }) {
  const { lang, step, token, session } = data;
  const t = ACCOUNT_TEXT[lang];
  const other: Lang = lang === "pl" ? "en" : "pl";
  const status = statusWords(lang, step, data.status);
  const heading = t.headings[step];
  const lede = t.ledes[step];

  // The two token steps show a form only while there is a token to spend.
  const showTokenForm =
    (step === "confirm" || step === "new-password") && token !== null && data.status !== "expired";

  return (
    <SiteShell
      lang={lang}
      otherPath={accountPath(other, step)}
      world={{ mode: "quiet" }}
      mainClassName="reading account"
      current="account"
    >
      <section>
        <h2>{heading}</h2>
        {lede !== "" && step !== "account" ? <p>{lede}</p> : null}
        {status === null ? null : (
          <p
            className={`account-status account-status-${status.tone}`}
            role={status.tone === "problem" ? "alert" : "status"}
          >
            {status.text}
          </p>
        )}

        {step === "sign-in" ? (
          <>
            <Form action="sign-in" lang={lang} label={heading}>
              <Field
                name="email"
                label={t.email}
                type="email"
                autoComplete="email"
                maxLength={254}
              />
              <Field
                name="password"
                label={t.password}
                type="password"
                autoComplete="current-password"
                maxLength={128}
              />
              <Send>{t.submit["sign-in"]}</Send>
            </Form>
            <p className="account-links">
              {t.links.noAccount} <a href={accountPath(lang, "sign-up")}>{t.links.signUp}</a>
              {" · "}
              <a href={accountPath(lang, "reset")}>{t.links.forgot}</a>
            </p>
          </>
        ) : null}

        {step === "sign-up" ? (
          <>
            <Form action="sign-up" lang={lang} label={heading}>
              <Field
                name="email"
                label={t.email}
                type="email"
                autoComplete="email"
                maxLength={254}
              />
              <Send>{t.submit["sign-up"]}</Send>
            </Form>
            <p className="account-links">
              {t.links.haveAccount} <a href={accountPath(lang, "sign-in")}>{t.links.signIn}</a>
            </p>
          </>
        ) : null}

        {step === "reset" ? (
          <>
            <Form action="reset-request" lang={lang} label={heading}>
              <Field
                name="email"
                label={t.email}
                type="email"
                autoComplete="email"
                maxLength={254}
              />
              <Send>{t.submit.reset}</Send>
            </Form>
            <p className="account-links">
              <a href={accountPath(lang, "sign-in")}>{t.links.signIn}</a>
            </p>
          </>
        ) : null}

        {step === "confirm" && showTokenForm ? (
          <Form action="complete" lang={lang} label={heading}>
            <input type="hidden" name="token" value={token ?? ""} />
            <Field
              name="password"
              label={t.password}
              type="password"
              autoComplete="new-password"
              hint={t.passwordHint}
              minLength={10}
              maxLength={128}
            />
            <label className="account-check">
              <input type="checkbox" name="terms" value="on" required />
              <span>
                {t.terms.before}
                <a href={legalPath("terms", lang)} target="_blank" rel="noopener">
                  {t.terms.termsLink}
                </a>
                {t.terms.between}
                <a href={legalPath("privacy", lang)} target="_blank" rel="noopener">
                  {t.terms.privacyLink}
                </a>
                {t.terms.after}
              </span>
            </label>
            <Send>{t.submit.confirm}</Send>
          </Form>
        ) : null}

        {step === "new-password" && showTokenForm ? (
          <Form action="reset" lang={lang} label={heading}>
            <input type="hidden" name="token" value={token ?? ""} />
            <Field
              name="password"
              label={t.newPassword}
              type="password"
              autoComplete="new-password"
              hint={t.passwordHint}
              minLength={10}
              maxLength={128}
            />
            <Send>{t.submit["new-password"]}</Send>
          </Form>
        ) : null}

        {step === "confirm" && !showTokenForm ? (
          <p className="account-links">
            <a href={accountPath(lang, "sign-up")}>{t.links.signUp}</a>
          </p>
        ) : null}
        {step === "new-password" && !showTokenForm ? (
          <p className="account-links">
            <a href={accountPath(lang, "reset")}>{t.links.requestNew}</a>
          </p>
        ) : null}

        {step === "account" && session !== null ? (
          <>
            <p>
              {t.account.signedInAs} <strong>{session.email}</strong>
            </p>
            <p>
              {t.account.termsAccepted(
                formatDate(session.termsVersion, lang),
                formatDate(session.termsAcceptedOn, lang),
              )}
            </p>
            <Form action="sign-out" lang={lang} label={t.account.signOut}>
              <Send>{t.account.signOut}</Send>
            </Form>
            <h3>{t.account.deleteHeading}</h3>
            <p>{t.account.deleteLede}</p>
            <Form action="delete" lang={lang} label={t.account.deleteHeading}>
              <Field
                name="password"
                label={t.account.deletePassword}
                type="password"
                autoComplete="current-password"
                maxLength={128}
              />
              <Send danger>{t.account.deleteSubmit}</Send>
            </Form>
          </>
        ) : null}
      </section>
    </SiteShell>
  );
}

/**
 * The route's page: decides, then renders. A server component, so it may read
 * the session cookie; a step that does not need one (the mail's two links, the
 * reset request) never touches the database.
 */
export async function AccountPage({
  lang,
  params,
  searchParams,
}: {
  readonly lang: Lang;
  readonly params: Promise<{ readonly step?: string[] }>;
  readonly searchParams: Promise<Query>;
}) {
  const segments = (await params).step;
  const query = await searchParams;
  const enabled = accountsEnabled();
  const step = enabled ? stepFromSlug(lang, segments) : null;

  let session: SessionView | null = null;
  const runtime = enabled && step !== null && stepNeedsSession(step) ? accountsRuntime() : null;
  if (runtime !== null) {
    const token = (await cookies()).get(sessionCookieName(runtime.secure))?.value;
    try {
      const found = token === undefined ? null : await runtime.accounts.sessionFromToken(token);
      if (found !== null) {
        session = {
          email: found.email,
          termsVersion: found.termsVersion,
          termsAcceptedOn: found.termsAcceptedAt.toISOString().slice(0, 10),
        };
      }
    } catch {
      // The database is unreachable: the page treats the reader as signed out,
      // and the sign-in form says nothing it could not say anyway.
      session = null;
    }
  }

  const decision = decideAccountPage({ enabled, lang, segments, query, session });
  if (decision.kind === "not-found") notFound();
  if (decision.kind === "redirect") redirect(decision.to);
  return <AccountView data={decision.data} />;
}

export async function accountMetadataFor(
  lang: Lang,
  params: Promise<{ readonly step?: string[] }>,
): Promise<Metadata> {
  const step = stepFromSlug(lang, (await params).step);
  return step === null ? {} : accountMetadata(lang, step);
}
