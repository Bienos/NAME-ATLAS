"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CONSENT_COPY,
  CONSENT_DEFAULT,
  CONSENT_KEY,
  CONSENT_REOPEN_EVENT,
  GA_MEASUREMENT_ID,
  consentLang,
  gaCounts,
  gaPageParams,
  parseConsent,
} from "./google-analytics.js";
import type { Consent, GaPageParams } from "./google-analytics.js";

/**
 * The consent banner and Google Analytics behind it (TASK-109, ADR-0038;
 * TASK-114, ADR-0040). Google's script is in every page (`app/layout.tsx`);
 * on production's host this island configures it and sends one redacted
 * `page_view` per route, whatever the choice. The banner decides the cookies
 * only: until "Accept", and after "Reject", `analytics_storage` stays denied,
 * so Google sets no cookie. Rendered once by the root layout.
 *
 * The browser members this island uses, declared rather than widening the
 * app's `lib` to the DOM (as `dusk-zoom.tsx` and `surname-combobox.tsx` do).
 */

type Gtag = (...args: unknown[]) => void;

declare const window: {
  dataLayer?: unknown[];
  gtag?: Gtag;
  readonly localStorage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
  readonly location: { readonly href: string; readonly hostname: string };
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  dispatchEvent(event: unknown): boolean;
};

declare const document: {
  cookie: string;
  readonly referrer: string;
};

declare const Event: new (type: string) => unknown;

/** Fired on this page when the stored choice changes. */
const CHANGE_EVENT = "name-atlas:analytics-consent-change";

/** The choice when storage is blocked: it then holds for this page only. */
let memory: Consent | null = null;

function readStored(): Consent | null {
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_KEY)) ?? memory;
  } catch {
    return memory;
  }
}

function store(consent: Consent): void {
  memory = consent;
  try {
    window.localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // Storage blocked: `memory` keeps the choice for this page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** "unset" until the visitor chooses; "server" while rendering on the server. */
type Snapshot = Consent | "unset" | "server";
const clientSnapshot = (): Snapshot => readStored() ?? "unset";
const serverSnapshot = (): Snapshot => "server";

/**
 * Configures Google's script once, starting from "everything denied" and
 * granting analytics storage only if the visitor accepted. The redacted
 * address is set before `config`, so no request carries the real one.
 */
function startGa(params: GaPageParams): Gtag {
  if (window.gtag) return window.gtag;
  window.dataLayer = window.dataLayer ?? [];
  const gtag: Gtag = function gtag() {
    // gtag.js reads the `arguments` object itself, as Google's snippet does.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag = gtag;
  gtag("consent", "default", CONSENT_DEFAULT);
  if (readStored() === "granted") gtag("consent", "update", { analytics_storage: "granted" });
  gtag("set", params);
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  return gtag;
}

/** Withdraws analytics storage on this page and removes the cookies GA set on this site. */
function dropGaCookies(): void {
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  const host = window.location.hostname;
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim() ?? "";
    if (name !== "_ga" && !name.startsWith("_ga_")) continue;
    for (const domain of ["", `; domain=${host}`, `; domain=.${host}`]) {
      document.cookie = `${name}=; max-age=0; path=/${domain}`;
    }
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname() ?? "/";
  const consent = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen);
  }, []);

  // A change of mind on this page; the first page's choice is read by `startGa`.
  useEffect(() => {
    if (consent === "server") return;
    window.gtag?.("consent", "update", {
      analytics_storage: consent === "granted" ? "granted" : "denied",
    });
  }, [consent]);

  const hydrated = consent !== "server";
  useEffect(() => {
    if (!hydrated || !gaCounts(window.location.hostname)) return;
    const params = gaPageParams(window.location.href, document.referrer);
    if (params === null) return;
    const gtag = startGa(params);
    gtag("set", params);
    gtag("event", "page_view", params);
  }, [hydrated, pathname]);

  if (consent === "server" || (consent !== "unset" && !reopened)) return null;
  const lang = consentLang(pathname);
  const t = CONSENT_COPY[lang];
  const choose = (choice: Consent) => {
    if (choice === "denied") dropGaCookies();
    store(choice);
    setReopened(false);
  };
  return (
    <section className="consent-banner" role="region" aria-label={t.label} lang={lang}>
      <p>
        {t.text} <a href={lang === "en" ? "/en/privacy" : "/pl/prywatnosc"}>{t.privacy}</a>
      </p>
      <div className="consent-actions">
        <button type="button" onClick={() => choose("denied")}>
          {t.reject}
        </button>
        <button type="button" onClick={() => choose("granted")}>
          {t.accept}
        </button>
      </div>
    </section>
  );
}

/** The privacy page's button that opens the banner again, to give or withdraw consent. */
export function ConsentSettingsButton({ label }: { readonly label: string }) {
  return (
    <button
      type="button"
      className="consent-settings"
      onClick={() => window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT))}
    >
      {label}
    </button>
  );
}
