"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * The browser members this island uses, declared rather than widening the
 * repository's `lib: ["ES2022"]` (the convention of `share-button.tsx`).
 */
interface ElementLike {
  setAttribute(name: string, value: string): void;
  getBoundingClientRect(): { readonly top: number };
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
}
interface IntersectionEntryLike {
  readonly isIntersecting: boolean;
  readonly target: ElementLike;
}
interface IntersectionObserverLike {
  observe(target: ElementLike): void;
  unobserve(target: ElementLike): void;
  disconnect(): void;
}
declare const IntersectionObserver:
  | (new (
      callback: (entries: readonly IntersectionEntryLike[]) => void,
      options?: { readonly rootMargin?: string; readonly threshold?: number },
    ) => IntersectionObserverLike)
  | undefined;
declare const innerHeight: number;
declare const matchMedia: ((query: string) => { readonly matches: boolean }) | undefined;

export interface AtlasSwitchLabels {
  readonly group: string;
  readonly male: string;
  readonly female: string;
  readonly note: string;
}

/** Longer than the slowest entrance in `globals.css` (plate IV's gauge: about 1.6 s). */
const SPENT_AFTER_MS = 2600;

/**
 * Whether a block the page hydrates with is already reached: on screen, or
 * above it because the reader scrolled past it before hydration. Either way
 * the reader has seen it in its final state, so it must never blank out to
 * replay its entrance; only blocks still below the screen are left to play.
 */
export function reachedAtHydration(box: { readonly top: number }, viewportHeight: number): boolean {
  return box.top < viewportHeight;
}

/**
 * The atlas section's client island (TASK-040; six plates since TASK-043): the
 * section, its list switch, and the plates' entrance. Plate I's sky is a
 * second island (`list-atlas-sky.tsx`) that follows the same switch.
 *
 * Everything inside is server-rendered, and every figure is in the markup for
 * both lists. The switch is two native radio buttons, the male list checked in
 * the markup, and the stylesheet does the rest with `:has()`: of each pair of
 * list variants (`.lf-alt`), the chosen one shows and the other keeps its
 * place, hidden. So it works the same before hydration, after it and without
 * JavaScript at all, and hydration changes no layout. React never reads it;
 * nothing here reads or changes a figure.
 *
 * Motion is opt-in and the island's only job: when the reader has not asked
 * for reduced motion, every `.lf-rv` block already reached — on screen or
 * scrolled past (`reachedAtHydration`) — is marked `data-seen` and `data-done`
 * (seen in its final state, so it never blanks out to replay), the blocks
 * below the screen are watched, and only then is the section marked
 * `data-motion`. A watched block is marked `data-seen` the first time any part
 * of it enters the viewport, and `data-done` once its entrance has played. The
 * stylesheet draws a figure's reveal from those marks; without them every
 * figure is simply in its final state.
 */
export function ListAtlasShell({
  labels,
  labelledBy,
  head,
  name = "lf-list",
  className = "lf",
  children,
}: {
  labels: AtlasSwitchLabels;
  labelledBy: string;
  head: ReactNode;
  /** The radio group's name: two sections on one page (TASK-178) switch apart. */
  name?: string;
  /** The section's class beside `lf`, for a part's own styles. */
  className?: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = root.current as unknown as ElementLike | null;
    if (section === null || typeof IntersectionObserver === "undefined") return;
    if (typeof matchMedia === "undefined") return;
    if (!matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const block = entry.target;
          block.setAttribute("data-seen", "");
          observer.unobserve(block);
          // Once played, a block's motion is spent: showing it again after a
          // list switch must not replay it (figures resolve once).
          timers.push(setTimeout(() => block.setAttribute("data-done", ""), SPENT_AFTER_MS));
        }
      },
      { rootMargin: "0px", threshold: 0 },
    );
    const blocks = section.querySelectorAll(".lf-rv");
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block === undefined) continue;
      if (reachedAtHydration(block.getBoundingClientRect(), innerHeight)) {
        block.setAttribute("data-seen", "");
        block.setAttribute("data-done", "");
      } else observer.observe(block);
    }
    section.setAttribute("data-motion", "");
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <section
      ref={root}
      className={className === "lf" ? "lf" : `lf ${className}`}
      aria-labelledby={labelledBy}
    >
      {head}
      <div className="lf-switchbar">
        <fieldset className="lf-switch">
          <legend className="lf-sr">{labels.group}</legend>
          {(["male", "female"] as const).map((option) => (
            <label key={option}>
              <input type="radio" name={name} value={option} defaultChecked={option === "male"} />
              <span>{option === "male" ? labels.male : labels.female}</span>
            </label>
          ))}
        </fieldset>
        <span className="lf-switch-note">{labels.note}</span>
      </div>
      {children}
    </section>
  );
}
