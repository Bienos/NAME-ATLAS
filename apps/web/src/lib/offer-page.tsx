import {
  BABY_NAMES_FULL_TIERS,
  FULL_NAME_COMPARE_TIERS,
  TREE_UNLOCK_TIERS,
} from "@name-atlas/accounts";
import type { PurchaseTier } from "@name-atlas/accounts";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { accountPath } from "./account-paths.js";
import { accountsRuntime } from "./accounts-runtime.js";
import { sessionCookieName } from "./session-cookie.js";
import { BABY_NAMES_PATHS, babyNamesEnabled, babyNamesFreeUntil } from "./baby-names-config.js";
import { CHECKOUT_TIERS, formatPrice, isCheckoutTester, tierOffer } from "./checkout-config.js";
import type { CheckoutTier } from "./checkout-config.js";
import { checkoutRuntime } from "./checkout-runtime.js";
import { formatDate } from "./messages.js";
import type { Lang } from "./messages.js";
import { OfferForm } from "./offer-form.js";
import { offerDocument, TABLE_COLUMNS, TABLE_ROWS } from "./offer-text.js";
import type { Product, TableColumn, TableRow, Tier, WaitlistTier } from "./offer-text.js";
import { SiteShell } from "./site-shell.js";
import { homePath, offerPath } from "./site-links.js";

/**
 * `/pl/oferta` and `/en/offer` (TASK-057, TASK-104, TASK-167, ADR-0037): the
 * free plan as it is, the two one-off products, the three tree packs and the
 * 800 zł research, a table of what each holds, and how paying will work.
 *
 * It reads the session cookie, so the free plan and the baby-names free window
 * (D-051) point a signed-in reader to the account and the page itself. A
 * listed tester with test-mode checkout on (TASK-111, TASK-154) gets a buy form
 * per product posting to `/api/checkout`; nobody else is offered a purchase
 * (ADR-0023 §2.5). Without accounts it reads nothing and is the same for all.
 */

/** Who is reading, as far as the page needs to know. */
export interface OfferReader {
  /** Accounts are on: sign-up and sign-in exist. */
  readonly accounts: boolean;
  readonly signedIn: boolean;
  /** Signed in, test-mode checkout on, and the account is on `CHECKOUT_TESTERS`. */
  readonly tester: boolean;
  /**
   * The baby-names view is free for signed-in readers now (D-051): the window's
   * last day in Warsaw (`YYYY-MM-DD`), and whether it ends within 7 days. Null
   * when it is closed. The page shows the true end, never an invented one.
   */
  readonly freeWindow: { readonly until: string; readonly lastWeek: boolean } | null;
}

export const GUEST: OfferReader = {
  accounts: false,
  signedIn: false,
  tester: false,
  freeWindow: null,
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The free window as the page states it: its last day in Warsaw, and whether that is within a week of `now`. */
export function freeWindowFrom(
  until: Date | null,
  now: Date = new Date(),
): OfferReader["freeWindow"] {
  if (until === null) return null;
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(until);
  return { until: day, lastWeek: until.getTime() - now.getTime() <= WEEK_MS };
}

export function offerMetadata(lang: Lang): Metadata {
  return {
    title: `${offerDocument(lang).title} — Name Atlas`,
    alternates: {
      canonical: offerPath(lang),
      languages: { pl: offerPath("pl"), en: offerPath("en") },
    },
  };
}

/** The reader behind the request's session cookie; a failed read is a signed-out reader. */
export async function readOfferReader(): Promise<OfferReader> {
  const accounts = accountsRuntime();
  if (accounts === null) return GUEST;
  const freeWindow = babyNamesEnabled() ? freeWindowFrom(babyNamesFreeUntil()) : null;
  const token = (await cookies()).get(sessionCookieName(accounts.secure))?.value;
  let email: string | null = null;
  try {
    const found = token === undefined ? null : await accounts.accounts.sessionFromToken(token);
    email = found?.email ?? null;
  } catch {
    email = null;
  }
  const checkout = email === null ? null : checkoutRuntime();
  return {
    accounts: true,
    signedIn: email !== null,
    tester: email !== null && checkout !== null && isCheckoutTester(email, checkout.testers),
    freeWindow,
  };
}

/** A test-mode purchase: the account page's form (`checkout-section.tsx`), here per card. */
export function BuyForm({ tier, lang }: { readonly tier: CheckoutTier; readonly lang: Lang }) {
  const doc = offerDocument(lang);
  const offer = tierOffer(tier);
  if (offer === null) return null;
  return (
    <form className="offer-buy" method="post" action="/api/checkout" aria-label={offer.name[lang]}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="tier" value={tier} />
      <button type="submit" className="offer-send">
        {doc.buy(formatPrice(offer.amount, lang))}
      </button>
      <p className="offer-test-note">{doc.testNote}</p>
    </form>
  );
}

function Waitlist({ tier, lang }: { readonly tier: WaitlistTier; readonly lang: Lang }) {
  const words = offerDocument(lang).waitlist;
  return (
    <div className="offer-ask">
      <h4>{words.heading}</h4>
      <p>{words.intro}</p>
      <OfferForm tier={tier} lang={lang} />
    </div>
  );
}

function isSellable(key: string): key is CheckoutTier {
  return CHECKOUT_TIERS.some((tier) => tier.key === key);
}

/** A product or a pack: its status, price, what it holds, and the one way to act on it. */
function PaidCard({
  item,
  lang,
  reader,
}: {
  readonly item: Product | Tier;
  readonly lang: Lang;
  readonly reader: OfferReader;
}) {
  const doc = offerDocument(lang);
  const key = item.key;
  const window = key === "babynames" ? reader.freeWindow : null;
  const free = window !== null;
  const test = reader.tester && isSellable(key);
  const status = test ? doc.testMode : free ? doc.freeToday : doc.soon;
  const freeHref = reader.signedIn
    ? BABY_NAMES_PATHS[lang]
    : accountPath(lang, "sign-in", { next: BABY_NAMES_PATHS[lang] });
  return (
    <article className={`offer-tier offer-${key}`} aria-labelledby={`tier-${key}`}>
      <p className={`offer-status${test ? " is-test" : free ? " is-free" : ""}`}>{status}</p>
      <h3 id={`tier-${key}`}>{item.name}</h3>
      {free ? (
        <p className="offer-price">
          <s>{item.price}</s> {lang === "en" ? "PLN 0" : "0 zł"}
        </p>
      ) : (
        <p className="offer-price">{item.price}</p>
      )}
      <p className="offer-once">
        {window === null
          ? doc.once
          : doc.freeWindow.when(formatDate(window.until, lang), window.lastWeek)}
      </p>
      <p className="offer-lede">{item.lede}</p>
      <ul>
        {item.items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {free ? (
        <p>
          <a className="offer-send" href={freeHref}>
            {reader.signedIn ? doc.freeWindow.signedIn : doc.freeWindow.signedOut}{" "}
            <span aria-hidden="true">→</span>
          </a>
        </p>
      ) : null}
      {test && isSellable(key) ? (
        <BuyForm tier={key} lang={lang} />
      ) : free || key === "free" || key === "genealogy" ? null : (
        <Waitlist tier={key} lang={lang} />
      )}
    </article>
  );
}

function FreePlan({ lang, reader }: { readonly lang: Lang; readonly reader: OfferReader }) {
  const doc = offerDocument(lang);
  const tier = doc.tiers.find((t) => t.key === "free");
  if (tier === undefined) return null;
  return (
    <section className="offer-free" aria-labelledby="tier-free">
      <div>
        <p className="offer-status">{doc.now}</p>
        <h2 id="tier-free">{tier.name}</h2>
        <p className="offer-price">{tier.price}</p>
        <p className="offer-lede">{tier.lede}</p>
        {reader.accounts ? <p className="offer-once">{doc.accountWays}</p> : null}
        <p className="offer-actions">
          {reader.accounts ? (
            <a
              className="offer-send"
              href={accountPath(lang, reader.signedIn ? "account" : "sign-up")}
            >
              {reader.signedIn ? doc.yourAccount : doc.signUp} <span aria-hidden="true">→</span>
            </a>
          ) : null}
          <a className="offer-plain" href={homePath(lang)}>
            {doc.freeCta}
          </a>
        </p>
      </div>
      <ul>
        {tier.items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

function holds(tiers: readonly PurchaseTier[], column: TableColumn): boolean {
  return column !== "free" && (tiers as readonly string[]).includes(column);
}

/**
 * One cell of "what each includes", from the same lists the entitlement checks
 * read (`@name-atlas/accounts`), so the table cannot drift from what unlocks.
 */
export function tableCell(row: TableRow, column: TableColumn, lang: Lang): string | boolean {
  const t = offerDocument(lang).table;
  switch (row) {
    case "surname":
    case "compare":
    case "babyTop":
      return true;
    case "babyFull":
      return holds(BABY_NAMES_FULL_TIERS, column);
    case "fullnames":
      return holds(FULL_NAME_COMPARE_TIERS, column);
    case "coupleReport":
      return column === "couple";
    case "tree":
      return holds(TREE_UNLOCK_TIERS, column) ? t.more : t.upTo5;
    case "matches":
      return holds(TREE_UNLOCK_TIERS, column) ? t.further : t.upToSecond;
  }
}

function Table({ lang }: { readonly lang: Lang }) {
  const doc = offerDocument(lang);
  const all = [...doc.tiers, ...doc.products];
  return (
    <section className="offer-section" aria-labelledby="offer-table">
      <h2 id="offer-table">{doc.table.heading}</h2>
      <div className="offer-table-box">
        <table className="offer-table">
          <thead>
            <tr>
              <td />
              {TABLE_COLUMNS.map((column) => {
                const item = all.find((x) => x.key === column);
                return (
                  <th key={column} scope="col">
                    {item?.name}
                    <span>{item?.price}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row) => (
              <tr key={row}>
                <th scope="row">{doc.table.rows[row]}</th>
                {TABLE_COLUMNS.map((column) => {
                  const cell = tableCell(row, column, lang);
                  if (typeof cell === "string") {
                    const unlocked = cell === doc.table.more || cell === doc.table.further;
                    return (
                      <td key={column} className={unlocked ? "is-yes" : "is-text"}>
                        {cell}
                      </td>
                    );
                  }
                  return (
                    <td key={column} className={cell ? "is-yes" : "is-no"}>
                      <span aria-hidden="true">{cell ? "✓" : "—"}</span>
                      <span className="visually-hidden">{cell ? doc.table.yes : doc.table.no}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function OfferView({
  lang,
  reader = GUEST,
}: {
  readonly lang: Lang;
  readonly reader?: OfferReader;
}) {
  const doc = offerDocument(lang);
  const other: Lang = lang === "pl" ? "en" : "pl";
  const packs = doc.tiers.filter((t) => t.key !== "free" && t.key !== "genealogy");
  const genealogy = doc.tiers.find((t) => t.key === "genealogy");
  return (
    <SiteShell
      lang={lang}
      otherPath={offerPath(other)}
      world={{ mode: "quiet" }}
      current="offer"
      mainClassName="offer"
    >
      <header className="offer-hero">
        <h1 className="page-title">{doc.title}</h1>
        <p className="page-lede">{doc.lede}</p>
        <ul className="offer-facts">
          {doc.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </header>

      <FreePlan lang={lang} reader={reader} />

      <section className="offer-section" aria-labelledby="offer-products">
        <div className="offer-section-head">
          <h2 id="offer-products">{doc.productsHeading}</h2>
          <p>{doc.productsLede}</p>
        </div>
        <div className="offer-tiers">
          {doc.products.map((product) => (
            <PaidCard key={product.key} item={product} lang={lang} reader={reader} />
          ))}
        </div>
      </section>

      <section className="offer-section" aria-labelledby="offer-packs">
        <div className="offer-section-head">
          <h2 id="offer-packs">{doc.packsHeading}</h2>
          <p>{doc.packsLede}</p>
        </div>
        <div className="offer-tiers">
          {packs.map((tier) => (
            <PaidCard key={tier.key} item={tier} lang={lang} reader={reader} />
          ))}
        </div>
      </section>

      {genealogy === undefined ? null : (
        <section className="offer-section offer-genealogy" aria-labelledby="tier-genealogy">
          <div>
            <p className="offer-status">{doc.soon}</p>
            <h2 id="tier-genealogy">{genealogy.name}</h2>
            <p className="offer-price">{genealogy.price}</p>
            <p className="offer-lede">{genealogy.lede}</p>
            <ul>
              {genealogy.items.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="offer-ask">
            <h3>{doc.enquiry.heading}</h3>
            <p>{doc.enquiry.intro}</p>
            <OfferForm tier="genealogy" lang={lang} />
          </div>
        </section>
      )}

      <Table lang={lang} />

      <section className="offer-section" aria-labelledby="offer-pay">
        <div className="offer-section-head">
          <h2 id="offer-pay">{doc.pay.heading}</h2>
          <p>{doc.pay.lede}</p>
        </div>
        <ol className="offer-steps">
          {doc.pay.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="offer-section offer-faq" aria-labelledby="offer-faq">
        <h2 id="offer-faq">{doc.faq.heading}</h2>
        {doc.faq.items.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>

      <section className="offer-small">
        <p>{doc.nothingOnSale}</p>
        <p>{doc.howFormsWork}</p>
        <p>{doc.noDna}</p>
        <p>{doc.writeYourself}</p>
      </section>
    </SiteShell>
  );
}

/** The route's page: reads the reader, then renders. */
export async function OfferRoute({ lang }: { readonly lang: Lang }) {
  return <OfferView lang={lang} reader={await readOfferReader()} />;
}
