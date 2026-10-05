"use client";

import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * The studio's cards, switched in place: a chip, a swipe across the image or
 * the arrow keys show another card without loading a new page, and the
 * address follows with `history.replaceState`, so a reload or a shared link
 * opens the same card. Without script the chips stay ordinary links to the
 * studio for that card.
 */

/**
 * The browser members this island uses, declared rather than widening the
 * repository's `lib: ["ES2022"]` (the convention of `deck-client.tsx`).
 */
interface KeyLike {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly target: { closest?(selector: string): unknown } | null;
}
declare const window:
  | {
      addEventListener(type: "keydown", listener: (event: KeyLike) => void): void;
      removeEventListener(type: "keydown", listener: (event: KeyLike) => void): void;
      Image: new () => { src: string };
    }
  | undefined;
declare const history:
  | { readonly state: unknown; replaceState(data: unknown, unused: string, url: string): void }
  | undefined;

export interface StudioCardView {
  readonly key: string;
  readonly title: string;
  /** The studio's address for this card. */
  readonly href: string;
  /** The image the reader sees: the full card, or the marked preview. */
  readonly src: string;
  readonly alt: string;
}

/** The card a step away, wrapping at neither end. */
export function stepCard(keys: readonly string[], current: string, step: -1 | 1): string {
  const at = keys.indexOf(current);
  if (at === -1) return keys[0] ?? current;
  return keys[Math.min(Math.max(at + step, 0), keys.length - 1)] ?? current;
}

/** A horizontal swipe long enough and flat enough to mean "next" or "previous". */
export function swipeStep(dx: number, dy: number): -1 | 1 | null {
  if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? 1 : -1;
}

export function StudioViewer({
  cards,
  initial,
  navLabel,
  lead,
  children,
}: {
  cards: readonly StudioCardView[];
  initial: string;
  navLabel: string;
  /** The top of the panel for each card: its buttons, or the way to sign in for it. */
  lead: Readonly<Record<string, ReactNode>>;
  /** The rest of the panel, the same for every card. */
  children: ReactNode;
}) {
  const [current, setCurrent] = useState(initial);
  const start = useRef<{ x: number; y: number } | null>(null);
  const keys = cards.map((c) => c.key);
  const shown = cards.find((c) => c.key === current) ?? cards[0];

  function show(key: string): void {
    const card = cards.find((c) => c.key === key);
    if (card === undefined || key === current) return;
    setCurrent(key);
    history?.replaceState(history.state, "", card.href);
  }

  // Fetch the neighbours' images ahead, so the next card appears at once.
  useEffect(() => {
    for (const key of [stepCard(keys, current, -1), stepCard(keys, current, 1)]) {
      const card = cards.find((c) => c.key === key);
      if (card !== undefined && key !== current && window !== undefined) {
        new window.Image().src = card.src;
      }
    }
  });

  useEffect(() => {
    function onKey(event: KeyLike): void {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target?.closest?.("input, textarea, select") != null) return;
      if (event.key === "ArrowRight") show(stepCard(keys, current, 1));
      if (event.key === "ArrowLeft") show(stepCard(keys, current, -1));
    }
    window?.addEventListener("keydown", onKey);
    return () => window?.removeEventListener("keydown", onKey);
  });

  if (shown === undefined) return null;

  return (
    <>
      {cards.length > 1 ? (
        <nav className="studio-cards" aria-label={navLabel}>
          <ul>
            {cards.map((c) => (
              <li key={c.key}>
                <a
                  href={c.href}
                  aria-current={c.key === shown.key ? "page" : undefined}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    show(c.key);
                  }}
                >
                  {c.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <div className="studio-stage">
        <div
          className="studio-swipe"
          onPointerDown={(event) => {
            start.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const from = start.current;
            start.current = null;
            if (from === null) return;
            const step = swipeStep(event.clientX - from.x, event.clientY - from.y);
            if (step !== null) show(stepCard(keys, shown.key, step));
          }}
          onPointerCancel={() => {
            start.current = null;
          }}
        >
          {/* A generated PNG at its final size, served as is. */}
          <Image
            className="studio-image"
            src={shown.src}
            alt={shown.alt}
            width={540}
            height={960}
            unoptimized
            priority
            draggable={false}
          />
        </div>
        <div className="studio-panel">
          {/* Keyed, so one card's status line does not carry over to the next. */}
          <Fragment key={shown.key}>{lead[shown.key]}</Fragment>
          {children}
        </div>
      </div>
    </>
  );
}
