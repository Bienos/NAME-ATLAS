"use client";

import { useState } from "react";
import type { Lang } from "./messages.js";
import type { ProductEvent } from "./events.js";

/**
 * The browser APIs this component touches, named here on purpose.
 *
 * `tsconfig.base.json` sets `lib: ["ES2022"]` — no DOM — which is right for a
 * repository whose every other file runs on the server. Rather than widen that
 * for one component, the three members used are declared, so a typo is still a
 * compile error and the surface this island depends on is legible.
 */
interface ShareCapableNavigator {
  readonly share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  readonly clipboard?: { readonly writeText?: (text: string) => Promise<void> };
  readonly sendBeacon?: (url: string, data?: unknown) => boolean;
}

declare const navigator: ShareCapableNavigator | undefined;
declare function fetch(input: string, init?: Record<string, unknown>): Promise<unknown>;
declare const Blob: new (parts: readonly string[], options?: { type?: string }) => unknown;

/**
 * The share control (TASK-024) — this app's one client island.
 *
 * Everything else on the page is server-rendered with no script, and that
 * remains the rule; sharing is the one interaction a browser cannot do from a
 * link. The URL is a **server-supplied prop**: the canonical address of the
 * validated projection, never something assembled from client state, so what
 * gets shared is exactly the page (`docs/canonical/16` §120).
 *
 * Nothing is ever posted on the reader's behalf. Web Share opens the device's
 * own sheet and the reader chooses; the fallback copies a link. A cancelled
 * share is not an error and is reported as nothing more than "not shared".
 *
 * Without JavaScript the canonical link is visible as text beside the control.
 */

const COPY = {
  pl: {
    share: "Udostępnij",
    copied: "Skopiowano link.",
    shared: "Udostępniono.",
    cancelled: "Nie udostępniono.",
    denied: "Nie udało się skopiować. Link do skopiowania ręcznie:",
  },
  en: {
    share: "Share",
    copied: "Link copied.",
    shared: "Shared.",
    cancelled: "Not shared.",
    denied: "Could not copy. The link to copy by hand:",
  },
} as const;

type Status = "IDLE" | "SHARED" | "COPIED" | "CANCELLED" | "DENIED";

/**
 * The events this control reports, narrowed from the route's own allow-list, so
 * the client and the server cannot drift: a name removed there stops compiling
 * here.
 */
export type ShareEvent = Extract<
  ProductEvent,
  "share_started" | "share_completed" | "share_cancelled" | "copy_link_success" | "copy_link_denied"
>;

export interface ShareDeps {
  readonly share?: ((data: { title: string; url: string }) => Promise<void>) | undefined;
  readonly writeText?: ((text: string) => Promise<void>) | undefined;
  readonly report: (event: ShareEvent) => void;
}

/**
 * The decision logic, separated from the DOM so it can be tested with a
 * stubbed `navigator`: which path is taken, and what each outcome means.
 */
export async function performShare(
  deps: ShareDeps,
  data: { title: string; url: string },
): Promise<Status> {
  deps.report("share_started");
  if (deps.share) {
    try {
      await deps.share(data);
      deps.report("share_completed");
      return "SHARED";
    } catch (cause: unknown) {
      // The reader closed the sheet. Not a failure, and nothing to retry.
      if (cause instanceof Error && cause.name === "AbortError") {
        deps.report("share_cancelled");
        return "CANCELLED";
      }
      // Anything else: fall through to the clipboard.
    }
  }
  if (deps.writeText) {
    try {
      await deps.writeText(data.url);
      deps.report("copy_link_success");
      return "COPIED";
    } catch {
      deps.report("copy_link_denied");
      return "DENIED";
    }
  }
  deps.report("copy_link_denied");
  return "DENIED";
}

/** Fire-and-forget beacon; the body is an event name and nothing else. */
function reportEvent(event: ShareEvent): void {
  try {
    const body = JSON.stringify({ event });
    const beacon = navigator?.sendBeacon;
    if (beacon) {
      beacon.call(navigator, "/api/v1/events", new Blob([body], { type: "application/json" }));
      return;
    }
    // `.catch` and not the enclosing try/catch: the request rejects after this
    // function has returned, so the try cannot see it, and an unhandled
    // rejection over telemetry would be reported as a page error.
    void fetch("/api/v1/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Telemetry never affects the reader.
  }
}

function browserDeps(): ShareDeps {
  const nav = navigator;
  const share = nav?.share;
  const writeText = nav?.clipboard?.writeText;
  return {
    share: share ? (data) => share.call(nav, { title: data.title, url: data.url }) : undefined,
    writeText: writeText ? (text) => writeText.call(nav?.clipboard, text) : undefined,
    report: reportEvent,
  };
}

export function ShareButton({ url, title, lang }: { url: string; title: string; lang: Lang }) {
  const t = COPY[lang];
  const [status, setStatus] = useState<Status>("IDLE");

  // The label does not depend on what the browser supports.
  //
  // An earlier version sniffed `navigator.share` to choose between "Share" and
  // "Copy link", and set state during render to do it. That is a React
  // anti-pattern, and the guard was wrong as well: Node 22 defines a global
  // `navigator`, so the check ran on the server too and the server HTML and the
  // first client render could disagree — a hydration mismatch on every browser
  // with Web Share. Both paths share; one label is honest for both, and the
  // component now renders identically everywhere (review, 2026-09-21).

  const message =
    status === "SHARED"
      ? t.shared
      : status === "COPIED"
        ? t.copied
        : status === "CANCELLED"
          ? t.cancelled
          : status === "DENIED"
            ? t.denied
            : null;

  return (
    <div className="share">
      <button
        type="button"
        onClick={() => {
          void performShare(browserDeps(), { title, url }).then(setStatus);
        }}
      >
        {t.share}
      </button>
      {/* Always present: the link a reader can copy by hand, with or without script. */}
      {/* No `aria-label`: it would replace the link's text, and the text is the
          URL — precisely what the "copy it by hand" state tells a reader to
          read (review, 2026-09-21). */}
      <a className="share-url" href={url}>
        {url}
      </a>
      <p className="share-status" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
