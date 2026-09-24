"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

/**
 * The browser members this island uses, declared rather than widening the
 * repository's `lib: ["ES2022"]` (the same convention as `share-button.tsx`).
 * `fetch`, `AbortController` and `URLSearchParams` come from the Node types.
 */
declare const location: { assign(url: string): void } | undefined;
interface InputLike {
  readonly value: string;
  readonly form: EventTargetLike | null;
}
interface EventTargetLike {
  addEventListener(type: string, listener: (event: PageSwapLike) => void): void;
  removeEventListener(type: string, listener: (event: PageSwapLike) => void): void;
}
interface PageSwapLike {
  readonly viewTransition?: { skipTransition(): void } | null;
  readonly persisted?: boolean;
}
interface MeasurableLike {
  getBoundingClientRect(): { readonly width: number };
}
interface StyleTargetLike {
  readonly style: { setProperty(name: string, value: string): void };
}
declare const window: EventTargetLike | undefined;
declare const document:
  | {
      readonly documentElement: {
        setAttribute(name: string, value: string): void;
        removeAttribute(name: string): void;
      };
      readonly fonts?: { readonly ready: Promise<unknown> };
    }
  | undefined;
declare const ResizeObserver:
  | (new (callback: () => void) => { observe(target: unknown): void; disconnect(): void })
  | undefined;

/** Set on `<html>` while a submitted search is navigating (`globals.css`). */
const SEARCHING = "data-searching";

/** Publishes the typed text's rendered width as `--typed` on the field's box. */
function measureTyped(box: unknown, mirror: unknown): void {
  const target = box as StyleTargetLike | null;
  const text = mirror as MeasurableLike | null;
  if (target === null || text === null) return;
  target.style.setProperty("--typed", `${text.getBoundingClientRect().width.toFixed(1)}px`);
}

interface Item {
  readonly display_name: string;
  readonly path: string | null;
}

export interface ComboboxLabels {
  readonly placeholder: string;
  /** Screen-reader announcement, e.g. "Podpowiedzi: 5". */
  readonly available: string;
}

/** Wait this long after the last keystroke before asking. */
const PAUSE_MS = 200;
const MIN_LENGTH = 2;

/**
 * The search input, with suggest-as-you-type (`docs/contracts/surname-prefix.md`).
 *
 * The WAI-ARIA 1.2 combobox pattern: the input owns a listbox, arrow keys move
 * the active option, Enter opens it, Escape closes the list. With no option
 * active, Enter submits the form exactly as before — and without JavaScript
 * this is the same plain `GET` input it replaced, so nothing depends on it.
 *
 * A suggestion is only ever a link to a surname's page (or to the ordinary
 * search when it has no page). Nothing is filled in or resolved on the
 * reader's behalf. A failed, refused (429) or stale request shows nothing.
 *
 * The underline is an Atlas Thread (Visual System §8, §22): a hidden mirror of
 * the typed text measures its width, and `globals.css` draws the thread that
 * long. On submit, `<html data-searching>` names the mirror as the "before" of
 * a cross-document view transition whose "after" is the result page's
 * heading, so the typed surname becomes the heading (§23 "Search") across the
 * ordinary GET navigation and its redirect. It is CSS only: a browser without
 * cross-document view transitions simply navigates. The island skips the
 * transition for any navigation that is not its own submitted search.
 */
export function SurnameCombobox({
  lang,
  defaultValue,
  labels,
}: {
  lang: "pl" | "en";
  defaultValue: string;
  labels: ComboboxLabels;
}) {
  const listId = `${useId().replace(/:/g, "")}-list`;
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<readonly Item[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const controller = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);

  // The thread is as wide as the typed text: re-measured on every keystroke,
  // on resize (the field's font size is responsive) and once the fonts load.
  useLayoutEffect(() => {
    measureTyped(boxRef.current, mirrorRef.current);
  }, [value]);

  useEffect(() => {
    const box = boxRef.current;
    if (box === null || typeof ResizeObserver === "undefined") return;
    const remeasure = () => measureTyped(boxRef.current, mirrorRef.current);
    const observer = new ResizeObserver(remeasure);
    observer.observe(box);
    void document?.fonts?.ready.then(remeasure);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const form = (inputRef.current as unknown as InputLike | null)?.form ?? null;
    const root = document?.documentElement;
    if (form === null || root === undefined || typeof window === "undefined") return;
    let searching = false;
    const onSubmit = () => {
      searching = true;
      root.setAttribute(SEARCHING, "");
    };
    const onPageSwap = (event: PageSwapLike) => {
      if (!searching) event.viewTransition?.skipTransition();
    };
    // Restored from the back/forward cache: the field must not stay mid-flight.
    const onPageShow = (event: PageSwapLike) => {
      if (event.persisted === true) {
        searching = false;
        root.removeAttribute(SEARCHING);
      }
    };
    form.addEventListener("submit", onSubmit);
    window.addEventListener("pageswap", onPageSwap);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      form.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageswap", onPageSwap);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  useEffect(() => {
    const q = value.trim();
    // Too short: ask nothing. What is shown is filtered in render below, so the
    // effect never sets state synchronously.
    if ([...q].length < MIN_LENGTH) {
      controller.current?.abort();
      return;
    }
    const timer = setTimeout(() => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      const params = new URLSearchParams({ q });
      if (lang === "en") params.set("lang", "en");
      fetch(`/api/v1/surname-prefix?${params.toString()}`, { signal: current.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ status?: string; items?: Item[] }>) : null))
        .then((body) => {
          if (current.signal.aborted) return;
          setItems(body?.status === "SUGGESTIONS" && Array.isArray(body.items) ? body.items : []);
          setActive(-1);
        })
        .catch(() => {
          if (!current.signal.aborted) setItems([]);
        });
    }, PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value, lang]);

  const hrefOf = (item: Item) =>
    item.path ??
    `/?${new URLSearchParams({ surname: item.display_name, ...(lang === "en" ? { lang } : {}) }).toString()}`;

  const shown = [...value.trim()].length >= MIN_LENGTH ? items : [];
  const expanded = open && shown.length > 0;

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && shown.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % shown.length);
    } else if (event.key === "ArrowUp" && shown.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? shown.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Enter" && expanded && active >= 0) {
      const item = shown[active];
      if (item) {
        event.preventDefault();
        location?.assign(hrefOf(item));
      }
    }
  }

  return (
    <div className="combobox" ref={boxRef}>
      <input
        ref={inputRef}
        id="surname"
        name="surname"
        type="text"
        value={value}
        onChange={(e) => {
          setValue((e.target as unknown as InputLike).value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={labels.placeholder}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="characters"
        enterKeyHint="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${String(active)}` : undefined}
      />
      <span className="combobox-mirror" ref={mirrorRef} aria-hidden="true">
        {value}
      </span>
      <ul id={listId} role="listbox" className="combobox-list" hidden={!expanded}>
        {shown.map((item, i) => (
          <li
            key={`${item.display_name}-${String(i)}`}
            id={`${listId}-${String(i)}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? "is-active" : undefined}
            // Keep focus in the input so blur does not close the list before the click lands.
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(i)}
          >
            <a href={hrefOf(item)} tabIndex={-1}>
              {item.display_name}
            </a>
          </li>
        ))}
      </ul>
      <p className="visually-hidden" aria-live="polite">
        {expanded ? `${labels.available} ${String(shown.length)}` : ""}
      </p>
    </div>
  );
}
