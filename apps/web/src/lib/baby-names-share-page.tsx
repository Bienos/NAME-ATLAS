import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { BirthSex } from "@name-atlas/truth";
import { accountPath } from "./account-paths.js";
import { accountsRuntime } from "./accounts-runtime.js";
import { BABY_NAMES_PATHS, BABY_NAMES_SHARE_PATHS, babyNamesEnabled } from "./baby-names-config.js";
import { readBabyNamesSession, runningBabyNamesDeps } from "./baby-names-page.js";
import type { BabyNamesDeps } from "./baby-names-page.js";
import { BabyShareActions } from "./baby-names-share-client.js";
import {
  BABY_CARD_SIZES,
  babyCardFileName,
  babyCardOf,
  babyCardPath,
  babyFreeCardFacts,
  babyPagePath,
  babyPaidCardFacts,
  babySharePath,
  parseBabyShareQuery,
} from "./baby-names-share-facts.js";
import type { BabyShareChoice, BabyShareFormat } from "./baby-names-share-facts.js";
import { BABY_NAMES_SHARE_TEXT } from "./baby-names-share-text.js";
import { BABY_NAMES_TEXT } from "./baby-names-text.js";
import type { Lang } from "./messages.js";
import { siteOrigin } from "./seo.js";
import { SiteShell } from "./site-shell.js";

/**
 * The baby-names share sheet (TASK-152): `/pl/imiona-dla-dziecka/udostepnij`
 * and `/en/baby-names/share`, `?imie={name}&sex=boys|girls&card=basic|paid&format=story|square`.
 *
 * A page, not an overlay, so it works without script: the card picker, the
 * format toggle and the preview are links and an `<img>`, and "Zapisz obraz"
 * is a download link. The one island (`baby-names-share-client.tsx`) adds the
 * system share sheet and the clipboard. The paid option is shown to every
 * reader and inert for one without the entitlement, marked "Wkrótce" as the
 * page's locked card is; nothing here links to a checkout (ADR-0023 §2.5).
 *
 * Gated as the page: a 404 unless the flag and accounts are on; signed out it
 * explains and links to sign-in, which comes back to the page; `noindex`;
 * `private, no-store` from the middleware; in no sitemap.
 */

export const BABY_SHARE_METADATA: Readonly<Record<Lang, Metadata>> = {
  pl: {
    title: "Udostępnij kartę · Imiona dla dziecka · Name Atlas",
    robots: { index: false, follow: false },
  },
  en: { title: "Share a card · Baby names · Name Atlas", robots: { index: false, follow: false } },
};

type Query = Readonly<Record<string, string | string[] | undefined>>;

export type BabyShareData =
  | { readonly kind: "signed-out"; readonly lang: Lang; readonly signInHref: string }
  /** No name or sex in the query: the way back to the page. */
  | { readonly kind: "no-name"; readonly lang: Lang }
  /** The name has no free card for this sex (not on its latest list, or unknown). */
  | {
      readonly kind: "no-card";
      readonly lang: Lang;
      readonly typed: string;
      readonly sex: BirthSex;
    }
  | {
      readonly kind: "sheet";
      readonly lang: Lang;
      readonly name: string;
      readonly sex: BirthSex;
      readonly card: BabyShareChoice;
      readonly format: BabyShareFormat;
      /** The account holds the entitlement and the name has a paid card for this sex. */
      readonly paidAvailable: boolean;
    };

/** What the sheet shows, from the session and the query; no rendering, no cookie. */
export async function loadBabyShare(input: {
  readonly lang: Lang;
  readonly query: Query;
  readonly session: { readonly userId: string } | null;
  readonly deps: BabyNamesDeps;
}): Promise<BabyShareData> {
  const { lang, session, deps } = input;
  if (session === null) {
    return {
      kind: "signed-out",
      lang,
      signInHref: accountPath(lang, "sign-in", { next: BABY_NAMES_PATHS[lang] }),
    };
  }
  const { typed, sex, card, format } = parseBabyShareQuery(lang, input.query);
  if (typed === "" || sex === null) return { kind: "no-name", lang };
  const lookup = await deps.findName(typed);
  if (lookup.kind !== "FOUND") return { kind: "no-card", lang, typed, sex };
  const full = await deps.hasFullView(session.userId);
  const [facts, stock] = await Promise.all([
    deps.readFacts(lookup.given_name, full),
    deps.readStock(lookup.given_name),
  ]);
  const free = babyFreeCardFacts({ facts, stock, sex, lang, host: null });
  if (free === null) return { kind: "no-card", lang, typed, sex };
  const paidAvailable = full && babyPaidCardFacts({ facts, stock, sex, lang, host: null }) !== null;
  return {
    kind: "sheet",
    lang,
    name: lookup.given_name.display_name,
    sex,
    card: card === "paid" && paidAvailable ? "paid" : "basic",
    format,
    paidAvailable,
  };
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

function Option({
  href,
  current,
  title,
  sub,
}: {
  href: string | null;
  current: boolean;
  title: string;
  sub: string;
}) {
  const body = (
    <>
      <span className="bns-option-title">{title}</span>
      <small className="bns-option-sub">{sub}</small>
    </>
  );
  if (href === null) {
    // Inert: no link, no button, nothing to buy (ADR-0023 §2.5).
    return (
      <span className="bns-option bns-locked" aria-disabled="true" data-option="paid">
        {body}
      </span>
    );
  }
  return (
    <a
      className="bns-option"
      href={href}
      aria-current={current ? "page" : undefined}
      data-option={title}
    >
      {body}
    </a>
  );
}

function Sheet({ data }: { data: Extract<BabyShareData, { kind: "sheet" }> }) {
  const { lang, name, sex, card, format } = data;
  const t = BABY_NAMES_SHARE_TEXT[lang];
  const key = babyCardOf(card, format);
  const size = BABY_CARD_SIZES[key];
  const image = babyCardPath(lang, key, name, sex);
  const pagePath = babyPagePath(lang, name, sex);
  const origin = siteOrigin();
  const pageUrl = origin === null ? pagePath : `${origin}${pagePath}`;
  const sheet = (choice: { card?: BabyShareChoice; format?: BabyShareFormat }) =>
    babySharePath(lang, name, sex, { card, format, ...choice });
  return (
    <>
      <nav className="bns-top" aria-label={t.sheetTitle}>
        <a className="bns-back" href={pagePath}>
          <span aria-hidden="true">‹ </span>
          {t.sheetBack(name)}
        </a>
        <h1 className="bns-title">{t.sheetTitle}</h1>
      </nav>
      <section className="bns-picker" aria-labelledby="bns-picker-label">
        <p id="bns-picker-label" className="bns-label">
          {t.pickerLabel}
        </p>
        <div className="bns-options">
          <Option
            href={sheet({ card: "basic" })}
            current={card === "basic"}
            title={t.basicCard}
            sub={t.basicPrice}
          />
          <Option
            href={data.paidAvailable ? sheet({ card: "paid" }) : null}
            current={card === "paid"}
            title={t.paidCard}
            sub={data.paidAvailable ? t.paidPrice : `${t.paidPrice} · ${t.locked}`}
          />
        </div>
      </section>
      <figure className="bns-preview" data-card={key}>
        {/* A plain <img>: the card is one reader's private PNG, drawn on request; next/image would re-encode and cache it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          width={size.width}
          height={size.height}
          alt={t.previewAlt(name, sex)}
          decoding="async"
        />
      </figure>
      <section className="bns-format" aria-labelledby="bns-format-label">
        <p id="bns-format-label" className="bns-label">
          {t.formatLabel}
        </p>
        {card === "paid" ? (
          <p className="note bns-story-only">{t.storyOnly}</p>
        ) : (
          <div className="bns-options bns-formats">
            <a
              className="bns-option bns-pill"
              href={sheet({ format: "story" })}
              aria-current={format === "story" ? "page" : undefined}
              data-format="story"
            >
              {t.story}
            </a>
            <a
              className="bns-option bns-pill"
              href={sheet({ format: "square" })}
              aria-current={format === "square" ? "page" : undefined}
              data-format="square"
            >
              {t.square}
            </a>
          </div>
        )}
      </section>
      <BabyShareActions
        image={image}
        fileName={babyCardFileName(name, sex, key)}
        title={name}
        pageUrl={pageUrl}
        labels={{
          share: t.share,
          save: t.save,
          copy: t.copy,
          working: t.working,
          shared: t.shared,
          saved: t.saved,
          cancelled: t.cancelled,
          copied: t.copied,
          copyDenied: t.copyDenied,
          failed: t.failed,
          signIn: t.signInAgain,
        }}
        signInHref={accountPath(lang, "sign-in", { next: BABY_NAMES_PATHS[lang] })}
      />
      <p className="note bns-link-note">{t.linkNote}</p>
      <p className="bns-footer">{card === "paid" ? t.footerPaid : t.footerFree}</p>
    </>
  );
}

export function BabyShareView({ data }: { data: BabyShareData }) {
  const { lang } = data;
  const t = BABY_NAMES_SHARE_TEXT[lang];
  const page = BABY_NAMES_TEXT[lang];
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <SiteShell
      lang={lang}
      otherPath={BABY_NAMES_SHARE_PATHS[other]}
      world={{ mode: "quiet" }}
      current="babyNames"
      mainClassName="baby-names atlas-v1 bn-share-page"
    >
      {data.kind === "signed-out" ? (
        <>
          <h1 className="page-title">{t.sheetTitle}</h1>
          <p>{t.signedOut}</p>
          <p>
            <a className="baby-sign-in" href={data.signInHref}>
              {page.signIn}
            </a>
          </p>
        </>
      ) : data.kind === "no-name" ? (
        <>
          <h1 className="page-title">{t.sheetTitle}</h1>
          <p>{t.noName}</p>
          <p>
            <a href={BABY_NAMES_PATHS[lang]}>{page.title}</a>
          </p>
        </>
      ) : data.kind === "no-card" ? (
        <>
          <h1 className="page-title">{t.sheetTitle}</h1>
          <p>{t.noCard}</p>
          <p>
            <a href={babyPagePath(lang, data.typed, data.sex)}>{t.backToPage}</a>
          </p>
        </>
      ) : (
        <Sheet data={data} />
      )}
    </SiteShell>
  );
}

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

export function babyShareMetadata(lang: Lang): Metadata {
  return babyNamesEnabled() ? BABY_SHARE_METADATA[lang] : {};
}

/** The route's page: a 404 when off; reads the session cookie, loads, renders. */
export async function BabyShareRoute({
  lang,
  searchParams,
}: {
  readonly lang: Lang;
  readonly searchParams: Promise<Query>;
}) {
  if (!babyNamesEnabled()) notFound();
  const accounts = accountsRuntime();
  if (accounts === null) notFound();
  const query = await searchParams;
  const session = await readBabyNamesSession(accounts);
  const data = await loadBabyShare({
    lang,
    query,
    session,
    deps: runningBabyNamesDeps(accounts.pool),
  });
  return <BabyShareView data={data} />;
}
