import type { CSSProperties, ReactNode } from "react";
import { FREE_TREE_PERSONS_MAX } from "@name-atlas/family";
import { AtlasGrid, AtlasPoint, ContourField } from "../design-system/graphics/index.js";
import { Field, Form, Send } from "./account-form.js";
import { planOf } from "./account-overview.js";
import type { AccountFeatures, AccountOverview, Plan, TreeRow } from "./account-overview.js";
import { accountPath } from "./account-paths.js";
import type { StatusWords } from "./account-text.js";
import { ACCOUNT_TEXT } from "./account-text.js";
import { BABY_NAMES_PATHS } from "./baby-names-config.js";
import { formatPrice, tierOffer } from "./checkout-config.js";
import type { PurchaseRow } from "./checkout-section.js";
import { formatDate, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { SearchForm } from "./search-form.js";
import { atlasPath, comparePagePath, offerPath } from "./site-links.js";
import { treePath } from "./tree-paths.js";
import { TREE_TEXT } from "./tree-text.js";

/**
 * The account's dashboard (TASK-153), the `account` step of `/pl/konto` and
 * `/en/account`: who is signed in, the plan their purchases add up to, a
 * search, their family trees, what they bought, how they sign in, and the
 * deletion. Rendered on the server; every form is a plain HTML form.
 *
 * It derives nothing it does not read. A figure that could not be read is a
 * dash with "not available" for a screen reader, never a zero, and a plan is
 * shown only when the purchases were read (`account-overview.ts`).
 */

export interface DashboardSession {
  readonly email: string;
  readonly hasPassword: boolean;
  readonly termsVersion: string;
  readonly termsAcceptedOn: string;
}

function tierName(key: string, lang: Lang): string {
  return tierOffer(key)?.name[lang] ?? key;
}

/** The email's first character, for the monogram; a whole code point, never half a pair. */
function initialOf(email: string): string {
  return (Array.from(email.trim())[0] ?? "?").toLocaleUpperCase();
}

function Stat({
  label,
  value,
  none,
}: {
  readonly label: string;
  readonly value: ReactNode;
  readonly none: string;
}) {
  return (
    <div className="account-stat">
      <dt>{label}</dt>
      <dd>
        {value === null ? (
          <>
            <span aria-hidden="true">—</span>
            <span className="visually-hidden">{none}</span>
          </>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function Mark({ full }: { readonly full: boolean }) {
  return (
    <svg
      className="account-ent-mark"
      viewBox="0 0 20 20"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="10" cy="10" r="8.5" />
      {full ? <path d="M6 10.4 8.7 13 14 7.4" /> : <path d="M6.5 10h7" />}
    </svg>
  );
}

function Entitlement({
  label,
  value,
  full,
  mark,
}: {
  readonly label: string;
  readonly value: string;
  readonly full: boolean;
  readonly mark: string;
}) {
  return (
    <li className={full ? "account-ent account-ent-full" : "account-ent account-ent-limited"}>
      <Mark full={full} />
      <span className="account-ent-label">{label}</span>
      <span className="account-ent-value">
        <span className="visually-hidden">{mark}: </span>
        {value}
      </span>
    </li>
  );
}

function PlanPanel({
  lang,
  plan,
  features,
}: {
  readonly lang: Lang;
  readonly plan: Plan;
  readonly features: AccountFeatures;
}) {
  const p = ACCOUNT_TEXT[lang].dashboard.plan;
  const treeMore = plan.kind === "paid" && plan.treeUnlimited;
  const babyFull = plan.kind === "paid" && plan.babyNamesFull;
  return (
    <section className="account-panel account-plan" aria-labelledby="account-plan-heading">
      <h3 id="account-plan-heading">{p.heading}</h3>
      {plan.kind === "unknown" ? (
        <p>{p.unknown}</p>
      ) : (
        <>
          <p>{plan.kind === "free" ? p.free : p.paid}</p>
          {plan.kind === "paid" ? (
            <ul className="account-tiers">
              {plan.tiers.map((key) => (
                <li key={key} className={key === plan.top ? "account-tier-top" : undefined}>
                  {tierName(key, lang)}
                </li>
              ))}
            </ul>
          ) : null}
          <ul className="account-ents">
            <Entitlement label={p.answers} value={p.answersValue} full mark={p.included} />
            {features.tree ? (
              <Entitlement
                label={p.tree}
                value={
                  treeMore ? p.treeMore(FREE_TREE_PERSONS_MAX) : p.treeFree(FREE_TREE_PERSONS_MAX)
                }
                full={treeMore}
                mark={treeMore ? p.included : p.limited}
              />
            ) : null}
            {features.babyNames ? (
              <Entitlement
                label={p.babyNames}
                value={babyFull ? p.babyFull : p.babyFree}
                full={babyFull}
                mark={babyFull ? p.included : p.limited}
              />
            ) : null}
          </ul>
          {plan.kind === "paid" ? <p className="account-note">{p.testMode}</p> : null}
        </>
      )}
      <a className="account-arrow-link" href={offerPath(lang)}>
        {p.offer}
      </a>
    </section>
  );
}

function SearchPanel({
  lang,
  features,
}: {
  readonly lang: Lang;
  readonly features: AccountFeatures;
}) {
  const s = ACCOUNT_TEXT[lang].dashboard.search;
  const ui = UI[lang];
  const shortcuts: readonly (readonly [string, string])[] = [
    [atlasPath(lang), ui.navAtlas],
    [comparePagePath(lang), ui.navCompare],
    ...(features.babyNames ? ([[BABY_NAMES_PATHS[lang], ui.navBabyNames]] as const) : []),
    ...(features.tree ? ([[treePath(lang, { page: "trees" }), ui.navTrees]] as const) : []),
    [offerPath(lang), ui.navOffer],
  ];
  return (
    <section className="account-panel account-search" aria-labelledby="account-search-heading">
      <h3 id="account-search-heading">{s.heading}</h3>
      <p>{s.lede}</p>
      <SearchForm lang={lang} query="" variant="compact" />
      <p className="account-note">{s.history}</p>
      <nav aria-label={s.shortcuts}>
        <p className="account-mini-heading" aria-hidden="true">
          {s.shortcuts}
        </p>
        <ul className="account-shortcuts">
          {shortcuts.map(([href, label]) => (
            <li key={href}>
              <a href={href}>{label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

function TreesPanel({
  lang,
  trees,
  plan,
}: {
  readonly lang: Lang;
  readonly trees: readonly TreeRow[] | null;
  readonly plan: Plan;
}) {
  const d = ACCOUNT_TEXT[lang].dashboard.trees;
  const tt = TREE_TEXT[lang];
  // The cap is shown only when the plan is known not to lift it.
  const capped = plan.kind === "free" || (plan.kind === "paid" && !plan.treeUnlimited);
  const all = treePath(lang, { page: "trees" });
  return (
    <section className="account-panel account-trees" aria-labelledby="account-trees-heading">
      <h3 id="account-trees-heading">{tt.landing.yourTrees}</h3>
      {trees === null ? (
        <p>{d.unreadable}</p>
      ) : trees.length === 0 ? (
        <>
          <p>{tt.dashboard.none}</p>
          <a className="account-arrow-link" href={all}>
            {d.start}
          </a>
        </>
      ) : (
        <>
          <ul className="account-tree-list">
            {trees.map((tree) => {
              const shown = Math.min(tree.people, FREE_TREE_PERSONS_MAX);
              return (
                <li key={tree.id}>
                  <a
                    className="account-tree"
                    href={treePath(lang, { page: "tree", treeId: tree.id })}
                  >
                    <span className="account-tree-title">{tree.title}</span>
                    <span className="account-tree-meta">
                      {tt.dashboard.role[tree.role]} · {tt.dashboard.people(tree.people)} ·{" "}
                      {tt.dashboard.changed} {formatDate(tree.updatedOn, lang)}
                    </span>
                    {capped && tree.role === "OWNER" ? (
                      <span className="account-tree-cap">
                        <span
                          className="account-tree-bar"
                          aria-hidden="true"
                          style={
                            { "--fill": String(shown / FREE_TREE_PERSONS_MAX) } as CSSProperties
                          }
                        />
                        {d.freeCap(shown, FREE_TREE_PERSONS_MAX)}
                      </span>
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>
          <a className="account-arrow-link" href={all}>
            {d.all}
          </a>
        </>
      )}
    </section>
  );
}

function PurchasesPanel({
  lang,
  purchases,
}: {
  readonly lang: Lang;
  readonly purchases: readonly PurchaseRow[] | null;
}) {
  const d = ACCOUNT_TEXT[lang].dashboard.purchases;
  const total = (purchases ?? []).reduce((sum, p) => sum + p.amountTotal, 0);
  return (
    <section
      className="account-panel account-purchases"
      aria-labelledby="account-purchases-heading"
    >
      <h3 id="account-purchases-heading">{d.heading}</h3>
      {purchases === null ? (
        <p>{d.unreadable}</p>
      ) : purchases.length === 0 ? (
        <p>{d.none}</p>
      ) : (
        <>
          <ol className="account-receipts">
            {purchases.map((p, i) => (
              <li key={`${p.paidOn}-${String(i)}`}>
                <span className="account-receipt-name">{tierName(p.tier, lang)}</span>
                <span className="account-receipt-date">{formatDate(p.paidOn, lang)}</span>
                <span className="account-receipt-price">{formatPrice(p.amountTotal, lang)}</span>
              </li>
            ))}
          </ol>
          <p className="account-receipt-total">{d.total(formatPrice(total, lang))}</p>
          <p className="account-note">{ACCOUNT_TEXT[lang].dashboard.plan.testMode}</p>
        </>
      )}
    </section>
  );
}

function SecurityPanel({
  lang,
  session,
  overview,
  ways,
}: {
  readonly lang: Lang;
  readonly session: DashboardSession;
  readonly overview: AccountOverview;
  readonly ways: { readonly mail: boolean; readonly google: boolean };
}) {
  const t = ACCOUNT_TEXT[lang];
  const s = t.dashboard.security;
  const unknown = <span className="account-unknown">{s.unknown}</span>;
  return (
    <section className="account-panel account-security" aria-labelledby="account-security-heading">
      <h3 id="account-security-heading">{s.heading}</h3>
      <dl className="account-facts">
        <div>
          <dt>{s.password}</dt>
          <dd>
            {session.hasPassword ? s.passwordSet : s.passwordUnset}
            {ways.mail ? (
              <>
                {" · "}
                <a href={accountPath(lang, "reset")}>
                  {session.hasPassword ? s.changePassword : t.account.setPassword}
                </a>
              </>
            ) : null}
          </dd>
        </div>
        {ways.google || overview.googleLinked === true ? (
          <div>
            <dt>{s.google}</dt>
            <dd>
              {overview.googleLinked === null
                ? unknown
                : overview.googleLinked
                  ? s.googleOn
                  : s.googleOff}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>{s.sessions}</dt>
          <dd>{overview.activeSessions ?? unknown}</dd>
        </div>
        {overview.lastSignInOn === null ? null : (
          <div>
            <dt>{s.lastSignIn}</dt>
            <dd>{formatDate(overview.lastSignInOn, lang)}</dd>
          </div>
        )}
      </dl>
      {session.hasPassword ? null : <p>{t.account.viaGoogle}</p>}
      <p className="account-note">{s.sessionsNote}</p>
      <p className="account-note">
        {t.account.termsAccepted(
          formatDate(session.termsVersion, lang),
          formatDate(session.termsAcceptedOn, lang),
        )}
      </p>
      <Form action="sign-out" lang={lang} label={t.account.signOut}>
        <Send>{t.account.signOut}</Send>
      </Form>
    </section>
  );
}

function DeletePanel({
  lang,
  session,
}: {
  readonly lang: Lang;
  readonly session: DashboardSession;
}) {
  const t = ACCOUNT_TEXT[lang];
  return (
    <section className="account-panel account-delete" aria-labelledby="account-delete-heading">
      <h3 id="account-delete-heading">{t.account.deleteHeading}</h3>
      <p>{session.hasPassword ? t.account.deleteLede : t.account.deleteLedeNoPassword}</p>
      <Form action="delete" lang={lang} label={t.account.deleteHeading}>
        {session.hasPassword ? (
          <Field
            name="password"
            label={t.account.deletePassword}
            type="password"
            autoComplete="current-password"
            maxLength={128}
          />
        ) : (
          <label className="account-check">
            <input type="checkbox" name="confirm" value="on" required />
            <span>{t.account.deleteConfirm}</span>
          </label>
        )}
        <Send danger>{t.account.deleteSubmit}</Send>
      </Form>
    </section>
  );
}

export function AccountDashboard({
  lang,
  session,
  ways,
  status,
  overview,
  features,
  purchases,
}: {
  readonly lang: Lang;
  readonly session: DashboardSession;
  readonly ways: { readonly mail: boolean; readonly google: boolean };
  readonly status: StatusWords | null;
  readonly overview: AccountOverview;
  readonly features: AccountFeatures;
  /** Test-mode checkout's section (TASK-111), in place of the plain purchase list while checkout is on. */
  readonly purchases: ReactNode;
}) {
  const t = ACCOUNT_TEXT[lang];
  const d = t.dashboard;
  const plan = planOf(overview.purchases);
  const planChip =
    plan.kind === "unknown"
      ? d.planChip.unknown
      : plan.kind === "free"
        ? d.planChip.free
        : d.planChip.paid(tierName(plan.top, lang));
  const planStat =
    plan.kind === "unknown" ? null : plan.kind === "free" ? d.stats.free : tierName(plan.top, lang);

  return (
    <div className="account-shell account-dash atlas-v1">
      <header className="account-hero">
        <div className="account-hero-field" aria-hidden="true">
          <ContourField
            seed={41}
            density={8}
            variant="blue"
            opacity={0.5}
            focusPoint={{ x: 80, y: 36 }}
          />
          <ContourField
            seed={13}
            density={5}
            variant="ivory"
            opacity={0.16}
            orientation="falling"
            className="account-contour-b"
          />
          <AtlasGrid />
        </div>
        <div className="account-monogram" aria-hidden="true">
          <span>{initialOf(session.email)}</span>
        </div>
        <div className="account-hero-copy">
          <p className="account-eyebrow">
            <AtlasPoint size={8} glow />
            {t.eyebrows.account}
          </p>
          <h2>{t.headings.account}</h2>
          <p className="account-hero-email">
            {t.account.signedInAs} <strong>{session.email}</strong>
          </p>
          <ul className="account-chips">
            <li className={`account-chip account-chip-plan account-chip-${plan.kind}`}>
              {planChip}
            </li>
            {overview.memberSince === null ? null : (
              <li className="account-chip">
                {d.memberSince(formatDate(overview.memberSince, lang))}
              </li>
            )}
          </ul>
        </div>
      </header>

      {status === null ? null : (
        <p
          className={`account-status account-status-${status.tone}`}
          role={status.tone === "problem" ? "alert" : "status"}
        >
          {status.text}
        </p>
      )}

      <h3 className="visually-hidden">{d.stats.label}</h3>
      <dl className="account-stats">
        <Stat label={d.stats.plan} value={planStat} none={d.stats.none} />
        {features.tree ? (
          <Stat label={d.stats.trees} value={overview.trees?.length ?? null} none={d.stats.none} />
        ) : null}
        <Stat
          label={d.stats.purchases}
          value={overview.purchases?.length ?? null}
          none={d.stats.none}
        />
        <Stat label={d.stats.sessions} value={overview.activeSessions} none={d.stats.none} />
      </dl>

      <div className="account-grid">
        <PlanPanel lang={lang} plan={plan} features={features} />
        <SearchPanel lang={lang} features={features} />
        {features.tree ? <TreesPanel lang={lang} trees={overview.trees} plan={plan} /> : null}
        {purchases ?? <PurchasesPanel lang={lang} purchases={overview.purchases} />}
        <SecurityPanel lang={lang} session={session} overview={overview} ways={ways} />
        <DeletePanel lang={lang} session={session} />
      </div>
    </div>
  );
}
