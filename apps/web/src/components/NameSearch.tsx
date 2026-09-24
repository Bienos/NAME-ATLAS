"use client";

import {
  ViewTransition,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RESULTS_PATH, checkSearchInput, surnameHref } from "../lib/search";
import type { SearchInputCheck } from "../lib/search";
import { surnameSizingStyle } from "../lib/surname-sizing";
import styles from "./NameSearch.module.css";

/**
 * `NameSearchField` (visual system §19, §22): a large text input on an
 * editorial underline, with an arrow.
 *
 * The underline is an Atlas Thread. Its point fills with Atlas Blue as soon
 * as there is something to look up (§39 screen 01: "while typing, one node
 * becomes active"), and a blue line draws under the letters as they are
 * typed. On submit the line travels to the arrow while the request is in
 * flight, and the typed name becomes the result heading through a shared
 * element transition (§23 "Search") — it never disappears and reappears.
 *
 * Without JavaScript this is an ordinary GET form, and it lands on the same
 * results page.
 */

type Phase = "idle" | "typing" | "invalid";

const MESSAGES: Record<Exclude<SearchInputCheck, "OK">, string> = {
  EMPTY: "Type a surname first.",
  TOO_LONG: "That’s longer than any surname we can look up.",
  UNREADABLE: "That includes a character we can’t read. Try typing it again.",
};

interface NameSearchProps {
  /** `hero` is the landing field; `compact` sits on the results page. */
  readonly variant?: "hero" | "compact";
  readonly initialValue?: string;
  /** Focus on arrival, on devices with a fine pointer only (no surprise keyboard on phones). */
  readonly autoFocus?: boolean;
  readonly label?: string;
}

export function NameSearch({
  variant = "hero",
  initialValue = "",
  autoFocus = false,
  label = "Your surname",
}: NameSearchProps) {
  const router = useRouter();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(initialValue);
  const [phase, setPhase] = useState<Phase>(initialValue === "" ? "idle" : "typing");
  const [message, setMessage] = useState<string | null>(null);
  // Pending exactly as long as the navigation is: it settles on its own, even
  // when the destination is the page already open.
  const [submitting, startNavigation] = useTransition();

  // The thread under the letters is as long as the typed text is wide.
  const measure = useCallback(() => {
    const field = fieldRef.current;
    const mirror = mirrorRef.current;
    if (field && mirror) {
      field.style.setProperty("--typed-width", `${mirror.getBoundingClientRect().width}px`);
    }
  }, []);

  useLayoutEffect(measure, [measure, value]);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(field);
    void document.fonts.ready.then(measure);
    return () => {
      observer.disconnect();
    };
  }, [measure]);

  useEffect(() => {
    if (autoFocus && window.matchMedia("(pointer: fine)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [autoFocus]);

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setValue(next);
    setMessage(null);
    const check = checkSearchInput(next);
    setPhase(check === "EMPTY" ? "idle" : check === "OK" ? "typing" : "invalid");
    if (check === "TOO_LONG" || check === "UNREADABLE") {
      setMessage(MESSAGES[check]);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const check = checkSearchInput(value);
    if (check !== "OK") {
      setPhase(check === "EMPTY" ? "idle" : "invalid");
      setMessage(MESSAGES[check]);
      inputRef.current?.focus();
      return;
    }
    // The pending render commits before the navigation does, so the named
    // elements below exist when its view transition takes the "before" snapshot.
    startNavigation(() => {
      router.push(surnameHref(value), { transitionTypes: ["surname-search"] });
    });
  }

  const hero = variant === "hero";
  const describedBy = [hero ? `${id}-help` : null, message ? `${id}-message` : null]
    .filter(Boolean)
    .join(" ");

  const mirror = (
    <span ref={mirrorRef} className={styles.mirror} aria-hidden="true">
      {value}
    </span>
  );
  const thread = <span className={styles.thread} aria-hidden="true" />;

  return (
    <form
      role="search"
      action={RESULTS_PATH}
      method="get"
      onSubmit={onSubmit}
      className={hero ? styles.search : `${styles.search} ${styles.compact}`}
      data-search-phase={submitting ? "submitting" : phase}
      aria-busy={submitting || undefined}
    >
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div ref={fieldRef} className={styles.field} style={surnameSizingStyle(value)}>
        <span className={styles.node} aria-hidden="true" />
        <div className={styles.control}>
          <input
            ref={inputRef}
            id={id}
            name="name"
            type="text"
            className={styles.input}
            value={value}
            onChange={onChange}
            placeholder="Enter your surname"
            autoComplete="family-name"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-invalid={phase === "invalid" || undefined}
            aria-describedby={describedBy || undefined}
            readOnly={submitting}
          />
          {/* Named only while submitting: it is the "before" of the morph. */}
          {hero && submitting ? (
            <ViewTransition name="surname-hero">{mirror}</ViewTransition>
          ) : (
            mirror
          )}
        </div>
        <button type="submit" className={styles.go} aria-label="Discover this surname">
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
            <path d="M4 16h22M18 8l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        </button>
        <span className={styles.rule} aria-hidden="true" />
        {hero && submitting ? (
          <ViewTransition name="atlas-thread">{thread}</ViewTransition>
        ) : (
          thread
        )}
      </div>
      {hero ? (
        <p id={`${id}-help`} className={styles.help}>
          Exactly as it&rsquo;s written &mdash; Polish letters welcome.
        </p>
      ) : null}
      <p id={`${id}-message`} className={styles.message} role="status">
        {message}
      </p>
    </form>
  );
}
