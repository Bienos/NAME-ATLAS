import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createAccountsDb, createPurchases, isTokenShape } from "@name-atlas/accounts";
import type { Purchases } from "@name-atlas/accounts";
import { FREE_TREE_PERSONS_MAX } from "@name-atlas/family";
import { AtlasGrid, AtlasPoint, ContourField } from "../design-system/graphics/index.js";
import { AccountDashboard } from "./account-dashboard.js";
import { Field, Form, Send } from "./account-form.js";
import { loadAccountOverview, NO_FEATURES, UNKNOWN_OVERVIEW } from "./account-overview.js";
import type { AccountFeatures, AccountOverview } from "./account-overview.js";
import {
  accountPath,
  googleStartPath,
  isTreeNext,
  safeNext,
  stepFromSlug,
} from "./account-paths.js";
import type { AccountStep } from "./account-paths.js";
import { ACCOUNT_TEXT, statusWords } from "./account-text.js";
import { accountsEnabled, googleEnabled, mailEnabled } from "./accounts-config.js";
import { accountsRuntime } from "./accounts-runtime.js";
import type { AccountsRuntime } from "./accounts-runtime.js";
import { babyNamesEnabled } from "./baby-names-config.js";
import { isCheckoutTester } from "./checkout-config.js";
import { checkoutRuntime } from "./checkout-runtime.js";
import { CheckoutSection, checkoutStatusFrom } from "./checkout-section.js";
import { familyTreeEnabled } from "./family-config.js";
import { familyRuntime } from "./family-runtime.js";
import { legalPath } from "./legal-text.js";
import { GOOGLE_MARK } from "./design-tokens.js";
import type { Lang } from "./messages.js";
import { sessionCookieName } from "./session-cookie.js";
import { SiteShell } from "./site-shell.js";

/**
 * The account's pages (TASK-062): `/pl/konto/[[...step]]` and
 * `/en/account/[[...step]]`. TASK-084 adds "Continue with Google" to sign-in
 * and sign-up, and the terms step of a first Google sign-in (`welcome`). With
 * Google only (no mail configured), the email forms and the mail's three
 * steps are not there.
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
 *
 * TASK-153 draws the pages on Brand System v1 (ADR-0046): the sign-in steps as
 * a form card beside an art panel, and the account step as a dashboard
 * (`account-dashboard.tsx`) over the facts `account-overview.ts` reads.
 */

export interface SessionView {
  readonly email: string;
  /** False for an account made through Google with no password yet. */
  readonly hasPassword: boolean;
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
  /** The page a sign-in returns to (a surname's, TASK-064; the tree's, TASK-084), on sign-in and welcome only, or null. */
  readonly next: string | null;
  readonly ways: Ways;
}

/** Which ways in are configured (ADR-0033). */
export interface Ways {
  readonly mail: boolean;
  readonly google: boolean;
}

const MAIL_ONLY: Ways = { mail: true, google: false };

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
  readonly ways?: Ways;
}): AccountPageDecision {
  const { lang, session } = input;
  const ways = input.ways ?? MAIL_ONLY;
  if (!input.enabled) return { kind: "not-found" };
  const step = stepFromSlug(lang, input.segments);
  if (step === null) return { kind: "not-found" };
  // The mail's steps without mail, and Google's step without Google, do not exist.
  if (!ways.mail && (step === "reset" || step === "confirm" || step === "new-password")) {
    return { kind: "not-found" };
  }
  if (!ways.google && step === "welcome") return { kind: "not-found" };

  // Only sign-in and Google's terms step honour it, and only for a page of this site (`safeNext`).
  const next =
    step === "sign-in" || step === "welcome" ? safeNext(first(input.query, "next")) : null;

  if (step === "account") {
    if (session === null) return { kind: "redirect", to: accountPath(lang, "sign-in") };
  } else if ((step === "sign-in" || step === "sign-up") && session !== null) {
    return { kind: "redirect", to: next ?? accountPath(lang, "account") };
  }

  const word = first(input.query, "status");
  const known = statusWords(lang, step, word) === null ? null : word;
  const given = first(input.query, "token");
  const token = given !== null && isTokenShape(given) ? given : null;
  // A link with no usable token cannot do anything but say so.
  const needsToken = step === "confirm" || step === "new-password" || step === "welcome";
  const status = needsToken && token === null && known === null ? "expired" : known;
  return { kind: "view", data: { lang, step, status, token, session, next, ways } };
}

export function accountMetadata(lang: Lang, step: AccountStep): Metadata {
  const carriesToken = step === "confirm" || step === "new-password" || step === "welcome";
  return {
    title: `${ACCOUNT_TEXT[lang].headings[step]} | Name Atlas`,
    robots: { index: false, follow: false },
    // `same-origin`, not `no-referrer`: a page with `no-referrer` makes the browser
    // post its own form with `Origin: null`. Other sites still get no Referer.
    ...(carriesToken ? { referrer: "same-origin" as const } : {}),
  };
}

/**
 * "Continue with Google": a plain link to the start route, so it needs no
 * script. Google's mark is drawn inline in its own four colours, on white, as
 * its branding guidelines ask.
 */
function GoogleButton({ lang, next }: { readonly lang: Lang; readonly next: string | null }) {
  return (
    <a className="account-google" href={googleStartPath(lang, next)}>
      <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" focusable="false">
        <path
          fill={GOOGLE_MARK.red}
          d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"
        />
        <path
          fill={GOOGLE_MARK.blue}
          d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-16.8z"
        />
        <path
          fill={GOOGLE_MARK.yellow}
          d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"
        />
        <path
          fill={GOOGLE_MARK.green}
          d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"
        />
      </svg>
      <span>{ACCOUNT_TEXT[lang].google.button}</span>
    </a>
  );
}

function TermsCheck({ lang }: { readonly lang: Lang }) {
  const t = ACCOUNT_TEXT[lang];
  return (
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
  );
}

/**
 * `purchases` is test-mode checkout's section (TASK-111), rendered on the
 * account step under the account's own controls; absent while checkout is off.
 */
/**
 * The sign-in pages' art panel (TASK-153): a contour field, the Atlas Point,
 * a stamp and what an account gives, one line per section this site has. It
 * sits beside the form on a wide screen and under it on a phone; it holds no
 * form, so a page that must show none (a spent link) still shows none.
 */
function AuthArt({ lang, features }: { readonly lang: Lang; readonly features: AccountFeatures }) {
  const a = ACCOUNT_TEXT[lang].art;
  // The ring the stamp's words run round, and its length, so any wording fills it once.
  const ring = 44;
  return (
    <aside className="account-art" aria-label={a.label}>
      <div className="account-art-field" aria-hidden="true">
        <ContourField
          seed={23}
          density={9}
          variant="blue"
          opacity={0.6}
          focusPoint={{ x: 62, y: 40 }}
        />
        <ContourField
          seed={7}
          density={6}
          variant="ivory"
          opacity={0.2}
          orientation="falling"
          className="account-contour-b"
        />
        <AtlasGrid />
      </div>
      <svg className="account-stamp" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <defs>
          <path
            id="account-stamp-ring"
            d={`M60,60 m-${ring},0 a${ring},${ring} 0 1,1 ${2 * ring},0 a${ring},${ring} 0 1,1 -${2 * ring},0`}
          />
        </defs>
        <circle cx="60" cy="60" r="55" />
        <circle cx="60" cy="60" r="34" />
        <text textLength={Math.round(2 * Math.PI * ring)} lengthAdjust="spacing">
          <textPath href="#account-stamp-ring">{a.stamp}</textPath>
        </text>
      </svg>
      <span className="account-art-point" aria-hidden="true">
        <AtlasPoint size={12} glow />
      </span>
      <div className="account-art-copy">
        <p className="account-art-kicker">{a.kicker}</p>
        <p className="account-art-title">
          {a.title[0]} <em>{a.title[1]}</em>
        </p>
        <p className="account-art-perks-heading">{a.perksHeading}</p>
        <ul className="account-art-perks">
          <li>{a.perks.cards}</li>
          {features.tree ? <li>{a.perks.tree(FREE_TREE_PERSONS_MAX)}</li> : null}
          {features.babyNames ? <li>{a.perks.babyNames}</li> : null}
        </ul>
      </div>
    </aside>
  );
}

/**
 * The account's pages. `purchases` is test-mode checkout's section (TASK-111);
 * `overview` is the dashboard's facts and `features` the signed-in sections
 * this site has (TASK-153). Both default to "unknown" and "none", so a page
 * rendered without them claims nothing.
 */
export function AccountView({
  data,
  purchases,
  overview = UNKNOWN_OVERVIEW,
  features = NO_FEATURES,
}: {
  readonly data: AccountPageData;
  readonly purchases?: ReactNode;
  readonly overview?: AccountOverview;
  readonly features?: AccountFeatures;
}) {
  const { lang, step, token, session, ways } = data;
  const t = ACCOUNT_TEXT[lang];
  const other: Lang = lang === "pl" ? "en" : "pl";
  const status = statusWords(lang, step, data.status);
  const heading = t.headings[step];
  const lede = t.ledes[step];

  if (step === "account") {
    return (
      <SiteShell
        lang={lang}
        otherPath={accountPath(other, step)}
        world={{ mode: "quiet" }}
        mainClassName="reading account-page"
        current="account"
      >
        {session === null ? null : (
          <AccountDashboard
            lang={lang}
            session={session}
            ways={ways}
            status={status}
            overview={overview}
            features={features}
            purchases={purchases ?? null}
          />
        )}
      </SiteShell>
    );
  }

  // The two token steps show a form only while there is a token to spend.
  const showTokenForm =
    (step === "confirm" || step === "new-password" || step === "welcome") &&
    token !== null &&
    data.status !== "expired";
  const googleFirst =
    ways.google && (step === "sign-in" || step === "sign-up") ? (
      <>
        <GoogleButton lang={lang} next={step === "sign-in" ? data.next : null} />
        {ways.mail ? <p className="account-or">{t.google.or}</p> : null}
      </>
    ) : null;

  return (
    <SiteShell
      lang={lang}
      otherPath={accountPath(other, step)}
      world={{ mode: "quiet" }}
      mainClassName="reading account-page"
      current="account"
    >
      <div className="account-shell account-plate atlas-v1">
        <section className="account-card">
          <span className="account-card-ticks" aria-hidden="true" />
          <p className="account-eyebrow">
            <AtlasPoint size={8} glow />
            {t.eyebrows[step]}
          </p>
          <h2>{heading}</h2>
          {step === "sign-in" && isTreeNext(data.next) ? (
            <p className="account-context">{t.google.forTree}</p>
          ) : null}
          {lede === "" ? null : <p className="account-lede">{lede}</p>}
          {status === null ? null : (
            <p
              className={`account-status account-status-${status.tone}`}
              role={status.tone === "problem" ? "alert" : "status"}
            >
              {status.text}
            </p>
          )}

          {googleFirst}

          {step === "sign-in" && ways.mail ? (
            <>
              <Form action="sign-in" lang={lang} label={heading}>
                {data.next === null ? null : <input type="hidden" name="next" value={data.next} />}
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

          {step === "sign-up" && ways.mail ? (
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
              <TermsCheck lang={lang} />
              <Send>{t.submit.confirm}</Send>
            </Form>
          ) : null}

          {step === "welcome" && showTokenForm ? (
            <Form action="google-complete" lang={lang} label={heading}>
              <input type="hidden" name="token" value={token ?? ""} />
              {data.next === null ? null : <input type="hidden" name="next" value={data.next} />}
              <TermsCheck lang={lang} />
              <Send>{t.submit.welcome}</Send>
            </Form>
          ) : null}
          {step === "welcome" && !showTokenForm ? (
            <p className="account-links">
              <a href={accountPath(lang, "sign-in")}>{t.links.signIn}</a>
            </p>
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
        </section>
        <AuthArt lang={lang} features={features} />
      </div>
    </SiteShell>
  );
}

/** The purchases store over the accounts pool, made once per instance, for the dashboard. */
let purchaseStore: { readonly pool: unknown; readonly store: Purchases } | undefined;
function purchasesOn(pool: AccountsRuntime["pool"]): Purchases {
  if (purchaseStore?.pool !== pool) {
    purchaseStore = { pool, store: createPurchases({ db: createAccountsDb(pool) }) };
  }
  return purchaseStore.store;
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
  let userId: string | null = null;
  const runtime = enabled && step !== null && stepNeedsSession(step) ? accountsRuntime() : null;
  if (runtime !== null) {
    const token = (await cookies()).get(sessionCookieName(runtime.secure))?.value;
    try {
      const found = token === undefined ? null : await runtime.accounts.sessionFromToken(token);
      if (found !== null) {
        userId = found.userId;
        session = {
          email: found.email,
          hasPassword: found.hasPassword,
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

  const ways: Ways = { mail: mailEnabled(), google: googleEnabled() };
  const decision = decideAccountPage({ enabled, lang, segments, query, session, ways });
  if (decision.kind === "not-found") notFound();
  if (decision.kind === "redirect") redirect(decision.to);

  const features: AccountFeatures = { tree: familyTreeEnabled(), babyNames: babyNamesEnabled() };

  // The dashboard's facts (TASK-153), on the account step only: three reads at
  // once, each of which may fail alone and then shows as "not available".
  let overview: AccountOverview | undefined;
  if (step === "account" && userId !== null && runtime !== null) {
    const family = features.tree ? familyRuntime() : null;
    const purchases = purchasesOn(runtime.pool);
    overview = await loadAccountOverview({
      userId,
      summary: (id) => runtime.accounts.accountSummary(id),
      purchases: (id) => purchases.listForUser(id),
      trees: family === null ? null : (id) => family.family.listTrees(id),
    });
  }

  // Test-mode checkout (TASK-111): on the account step only, with the purchases just read,
  // and only for an account on `CHECKOUT_TESTERS` (TASK-154).
  const runtimeCheckout = step === "account" && userId !== null ? checkoutRuntime() : null;
  const checkout =
    runtimeCheckout !== null &&
    session !== null &&
    isCheckoutTester(session.email, runtimeCheckout.testers)
      ? runtimeCheckout
      : null;
  let purchases: ReactNode = null;
  if (checkout !== null) {
    const word = query["checkout"];
    purchases = (
      <CheckoutSection
        lang={lang}
        status={checkoutStatusFrom(typeof word === "string" ? word : null)}
        purchases={overview?.purchases ?? []}
      />
    );
  }
  return (
    <AccountView
      data={decision.data}
      purchases={purchases}
      overview={overview}
      features={features}
    />
  );
}

export async function accountMetadataFor(
  lang: Lang,
  params: Promise<{ readonly step?: string[] }>,
): Promise<Metadata> {
  const step = stepFromSlug(lang, (await params).step);
  return step === null ? {} : accountMetadata(lang, step);
}
