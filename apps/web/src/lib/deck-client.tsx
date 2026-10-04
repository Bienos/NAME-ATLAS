"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { shareOrSave } from "./share-actions.js";

export { fileStem } from "./share-actions.js";

/**
 * The deck of cards over the surname page (TASK-055, ADR-0025): the client
 * part. The faces arrive rendered from the validated response (`deck.tsx`);
 * this lays them out as a pile, moves between them by swipe, drag, keys,
 * buttons and tap, and closes onto the page.
 *
 * Nothing is drawn before the script runs. Without script the page is all
 * there is, which is ADR-0022 §3's reason for refusing a pager, kept.
 */

/**
 * The browser members this island uses, declared rather than widening the
 * repository's `lib: ["ES2022"]` (the convention of `surname-combobox.tsx`).
 */
interface ElementLike {
  inert: boolean;
  readonly style: {
    setProperty(name: string, value: string): void;
    removeProperty(name: string): void;
  };
  getBoundingClientRect(): { readonly left: number; readonly width: number };
  setPointerCapture?(id: number): void;
  focus?(options?: { preventScroll?: boolean }): void;
  closest?(selector: string): ElementLike | null;
  getAttribute?(name: string): string | null;
}
interface KeyLike {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  preventDefault(): void;
}
declare const document:
  | {
      readonly body: ElementLike & { readonly children: ArrayLike<ElementLike> };
      readonly documentElement: {
        setAttribute(name: string, value: string): void;
        removeAttribute(name: string): void;
      };
    }
  | undefined;
declare const window:
  | {
      addEventListener(type: "keydown", listener: (event: KeyLike) => void): void;
      removeEventListener(type: "keydown", listener: (event: KeyLike) => void): void;
    }
  | undefined;
declare const history:
  { replaceState(data: unknown, unused: string, url: string): void } | undefined;
declare const location: { readonly href: string; assign(url: string): void } | undefined;

interface PointerLike {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly clientX: number;
  readonly clientY: number;
  readonly target: unknown;
}

export interface DeckFace {
  readonly key: string;
  readonly title: string;
  readonly paper?: boolean;
  readonly face: ReactNode;
  /** The card's share image (TASK-056), or null. */
  readonly share: string | null;
}

/** What the deck says to a reader the image route turned away for want of a session (TASK-064). */
export interface DeckSignIn {
  readonly text: string;
  readonly link: string;
  /** The sign-in page, carrying the surname page to return to. */
  readonly href: string;
}

/** The way out of the deck from its last card (TASK-093, ADR-0034 §2.1). */
export interface DeckFinish {
  readonly href: string;
  readonly label: string;
}

export interface DeckLabels {
  readonly open: string;
  readonly close: string;
  readonly label: string;
  readonly cards: string;
  readonly of: string;
  readonly prev: string;
  readonly next: string;
  readonly hintKeys: string;
  readonly hintTouch: string;
  readonly share: string;
  readonly sharing: string;
}

/** `<html data-deck>` while the deck is open: the page behind stops scrolling (`globals.css`). */
const OPEN_ATTRIBUTE = "data-deck";
/** How far a card must travel to count as a swipe, in CSS pixels. */
const SWIPE = 80;
/** Below this a press is a tap, not a drag. */
const TAP = 6;

/** The page's address with `view=cards` set or removed, everything else kept. */
function addressWith(open: boolean): string | null {
  if (location === undefined) return null;
  const url = new URL(location.href);
  if (open) url.searchParams.set("view", "cards");
  else url.searchParams.delete("view");
  return `${url.pathname}${url.search}${url.hash}`;
}

const two = (n: number) => String(n).padStart(2, "0");

/** Nothing outside changes whether this is the client, so there is nothing to subscribe to. */
const subscribeNever = () => () => undefined;

export function SurnameDeck({
  cards,
  surname,
  initiallyOpen,
  labels,
  lang,
  signIn = null,
  finish = null,
}: {
  cards: readonly DeckFace[];
  surname: string;
  /** The page's language, for the deck's own node outside `<main>`. */
  lang: string;
  /** The search that brought the reader here asked for the deck (`?view=cards`). */
  initiallyOpen: boolean;
  labels: DeckLabels;
  /** Given only when accounts are on, which is when the image route can answer 401. */
  signIn?: DeckSignIn | null;
  /**
   * Where "next" leads from the last card (TASK-093): the share studio. The
   * deck ends there, by navigation. Null keeps "next" disabled on the last card.
   */
  finish?: DeckFinish | null;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [at, setAt] = useState(0);
  const pile = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const cardEls = useRef<(HTMLElement | null)[]>([]);
  const drag = useRef<{ x: number; dx: number; moved: boolean; el: ElementLike } | null>(null);
  const suppressClick = useRef(false);
  const [sharing, setSharing] = useState(false);
  /** The card whose image the route refused with 401: the prompt shows beside that card only. */
  const [signInFor, setSignInFor] = useState<number | null>(null);

  /**
   * Shares the card in view as an image: the system share sheet where the
   * browser can share files (most phones), a download everywhere else.
   */
  async function shareCard(url: string, key: string): Promise<void> {
    setSharing(true);
    try {
      if ((await shareOrSave(url, surname, key)) === "sign-in") setSignInFor(at);
    } finally {
      setSharing(false);
    }
  }
  /** Whether the deck has been open: focus returns to the button only after a close. */
  const wasOpen = useRef(false);
  const last = cards.length - 1;

  // Drawn by the script only: on the server and before hydration there is no deck.
  const client = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  const go = useCallback((index: number) => setAt(Math.max(0, Math.min(last, index))), [last]);

  const close = useCallback(() => {
    setOpen(false);
    const address = addressWith(false);
    if (address !== null) history?.replaceState(null, "", address);
  }, []);

  const show = useCallback(() => {
    setOpen(true);
    const address = addressWith(true);
    if (address !== null) history?.replaceState(null, "", address);
  }, []);

  // While open: the page behind is inert and still, and focus is in the deck.
  useEffect(() => {
    if (!client || document === undefined) return;
    if (!open) {
      if (wasOpen.current) {
        (opener.current as unknown as ElementLike | null)?.focus?.({ preventScroll: true });
      }
      return;
    }
    wasOpen.current = true;
    const doc = document;
    const self = dialog.current as unknown as ElementLike | null;
    const others = Array.from(doc.body.children).filter((el) => el !== self);
    const before = others.map((el) => el.inert);
    for (const el of others) el.inert = true;
    doc.documentElement.setAttribute(OPEN_ATTRIBUTE, "");
    (dialog.current as unknown as ElementLike | null)?.focus?.({ preventScroll: true });
    return () => {
      others.forEach((el, i) => {
        el.inert = before[i] ?? false;
      });
      doc.documentElement.removeAttribute(OPEN_ATTRIBUTE);
    };
  }, [open, client]);

  useEffect(() => {
    if (!open || window === undefined) return;
    const onKey = (event: KeyLike) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        if (at === last && finish !== null) location?.assign(finish.href);
        else go(at + 1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") go(at - 1);
      else if (event.key === "Home") go(0);
      else if (event.key === "End") go(last);
      else if (event.key === "Escape") close();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window?.removeEventListener("keydown", onKey);
  }, [open, at, last, go, close, finish]);

  function onPointerDown(event: PointerLike) {
    const target = event.target as ElementLike | null;
    if (target?.closest?.("a, button, label, input, summary") != null) return;
    const el = cardEls.current[at] as unknown as ElementLike | null;
    if (el === null) return;
    drag.current = { x: event.clientX, dx: 0, moved: false, el };
    (pile.current as unknown as ElementLike | null)?.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerLike) {
    const d = drag.current;
    if (d === null) return;
    d.dx = event.clientX - d.x;
    if (Math.abs(d.dx) > TAP) d.moved = true;
    if (d.moved) {
      d.el.style.setProperty("transition", "none");
      d.el.style.setProperty(
        "transform",
        `translateX(${String(d.dx)}px) rotate(${String(d.dx / 22)}deg)`,
      );
    }
  }

  function onPointerUp(event: PointerLike | null) {
    const d = drag.current;
    drag.current = null;
    if (d === null) return;
    d.el.style.removeProperty("transition");
    d.el.style.removeProperty("transform");
    if (d.moved) {
      suppressClick.current = true;
      if (d.dx < -SWIPE) go(at + 1);
      else if (d.dx > SWIPE) go(at - 1);
      return;
    }
    // A tap on a touch screen: the right third goes on, the left third back.
    if (event !== null && event.pointerType === "touch") {
      const box = (pile.current as unknown as ElementLike | null)?.getBoundingClientRect();
      if (box === undefined) return;
      if (event.clientX > box.left + box.width * 0.66) go(at + 1);
      else if (event.clientX < box.left + box.width * 0.33) go(at - 1);
    }
  }

  function onClickCapture(event: {
    target: unknown;
    preventDefault(): void;
    stopPropagation(): void;
  }) {
    if (suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const target = event.target as ElementLike | null;
    const closer = target?.closest?.("[data-deck-close]");
    if (closer == null) return;
    // "Full page" stays here and closes; "search another" closes and follows its #anchor.
    const to = closer.getAttribute?.("href") ?? "";
    if (!to.startsWith("#")) event.preventDefault();
    close();
  }

  if (!client || document === undefined || cards.length === 0) return null;
  const body = document.body as never;

  if (!open) {
    return createPortal(
      <button type="button" className="deck-open" lang={lang} ref={opener} onClick={show}>
        <span className="deck-open-stack" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        {labels.open}
      </button>,
      body,
    );
  }

  const current = cards[at];
  return createPortal(
    <div
      className="deck"
      lang={lang}
      role="dialog"
      aria-modal="true"
      aria-label={`${labels.label}: ${surname}`}
      tabIndex={-1}
      ref={dialog}
    >
      <div className="deck-bar">
        <ol className="deck-progress" aria-hidden="true">
          {cards.map((card, i) => (
            <li key={card.key} className={i <= at ? "done" : undefined} />
          ))}
        </ol>
        {current?.share == null ? null : (
          <button
            type="button"
            className="deck-share"
            onClick={() => void shareCard(current.share as string, current.key)}
            disabled={sharing}
          >
            <span aria-hidden="true">↗</span> {sharing ? labels.sharing : labels.share}
          </button>
        )}
        <button type="button" className="deck-full" onClick={close}>
          {labels.close} <span aria-hidden="true">↓</span>
        </button>
      </div>
      {/* Always in the page, so a screen reader announces the text when it appears. */}
      <div className="deck-gate" role="status">
        {signIn !== null && signInFor === at ? (
          <>
            {signIn.text} <a href={signIn.href}>{signIn.link}</a>
          </>
        ) : null}
      </div>
      <div className="deck-stage">
        <nav className="deck-toc" aria-label={labels.cards}>
          <ol>
            {cards.map((card, i) => (
              <li key={card.key}>
                <button
                  type="button"
                  aria-current={i === at ? "step" : undefined}
                  onClick={() => go(i)}
                >
                  {card.title} <span>{two(i + 1)}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div
          className="deck-pile"
          ref={pile}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => onPointerUp(null)}
          onClickCapture={onClickCapture}
        >
          {cards.map((card, i) => {
            const d = i - at;
            const depth = Math.min(Math.max(d, 0), 3);
            const style = {
              "--ty": `${String(depth * 14)}px`,
              "--s": String(1 - depth * 0.045),
              "--o": d < 0 || d > 3 ? "0" : String(1 - d * 0.18),
              zIndex: d < 0 ? 50 - i : 100 - d,
            } as CSSProperties;
            const className = [
              "dk-card",
              card.paper === true ? "dk-paper" : null,
              d === 0 ? "is-active" : null,
              d < 0 ? "is-gone" : null,
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <article
                key={card.key}
                ref={(el) => {
                  cardEls.current[i] = el;
                }}
                className={className}
                style={style}
                aria-hidden={d !== 0}
                inert={d !== 0}
                aria-label={`${String(i + 1)} ${labels.of} ${String(cards.length)}: ${card.title}`}
              >
                <span className="dk-spine" aria-hidden="true">
                  {surname} · NAME ATLAS
                </span>
                <span className="dk-index" aria-hidden="true">
                  {two(i + 1)}
                </span>
                {card.face}
              </article>
            );
          })}
        </div>
        <div className="deck-side">
          <button
            type="button"
            className="deck-nav"
            aria-label={labels.prev}
            disabled={at === 0}
            onClick={() => go(at - 1)}
          >
            ←
          </button>
          {at === last && finish !== null ? (
            <a className="deck-nav deck-finish" href={finish.href} aria-label={finish.label}>
              →
            </a>
          ) : (
            <button
              type="button"
              className="deck-nav"
              aria-label={labels.next}
              disabled={at === last}
              onClick={() => go(at + 1)}
            >
              →
            </button>
          )}
        </div>
      </div>
      <p className="deck-foot">
        <span className="deck-hint-touch">{labels.hintTouch}</span>
        <span className="deck-hint-keys">{labels.hintKeys}</span>
      </p>
      <p className="visually-hidden" aria-live="polite">
        {current === undefined
          ? ""
          : `${String(at + 1)} ${labels.of} ${String(cards.length)}: ${current.title}`}
      </p>
    </div>,
    body,
  );
}
