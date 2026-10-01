"use client";

import { useEffect } from "react";

/**
 * The browser members this island uses, declared rather than widening the
 * repository's `lib: ["ES2022"]` (the convention of `surname-combobox.tsx`).
 */
interface FormLike {
  submit(): void;
  addEventListener(type: "submit", listener: (event: { preventDefault(): void }) => void): void;
  removeEventListener(type: "submit", listener: (event: { preventDefault(): void }) => void): void;
}
interface StatusLike {
  textContent: string | null;
  getAttribute(name: string): string | null;
}
interface PageShowLike {
  readonly persisted?: boolean;
}
interface PanelLike {
  hidden: boolean;
}
interface FieldLike {
  readonly value: string;
}
declare const document:
  | {
      readonly documentElement: {
        setAttribute(name: string, value: string): void;
        removeAttribute(name: string): void;
      };
      querySelector(selector: "form.search"): FormLike | null;
      querySelector(selector: ".landing-status" | ".analysis-name"): StatusLike | null;
      querySelector(selector: ".landing-analysis"): PanelLike | null;
      querySelector(selector: "#surname"): FieldLike | null;
    }
  | undefined;
declare const window:
  | {
      addEventListener(type: "pageshow", listener: (event: PageShowLike) => void): void;
      removeEventListener(type: "pageshow", listener: (event: PageShowLike) => void): void;
    }
  | undefined;
declare const matchMedia: ((query: string) => { readonly matches: boolean }) | undefined;

/** Set on `<html>` while the camera comes down (`globals.css`, the dusk section). */
const ZOOMING = "data-dusk-zoom";
/** How long the landing keeps the camera move before the search leaves the page. */
const HOLD_MS = 900;

/**
 * The landing's zoom (TASK-052, ADR-0021, `components/Zoom` of the design
 * system): a submitted search starts the camera move into Poland, the status
 * line says what is happening, the analysis screen (TASK-053) shows the typed
 * surname over the parts of the answer the request reads, and the plain `GET`
 * search follows after a short hold, so the move is seen before the result
 * page answers.
 *
 * Progressive enhancement, like the combobox: without this script the form
 * submits as before. The combobox's own submit listener still runs, so its
 * `data-searching` state and the cross-document transition of the typed name
 * are unchanged. With reduced motion there is no hold. Restored from the
 * back/forward cache, the landing is reset so it is not stuck mid-flight.
 */
export function DuskZoom() {
  useEffect(() => {
    const form = document?.querySelector("form.search") ?? null;
    const status = document?.querySelector(".landing-status") ?? null;
    const panel = document?.querySelector(".landing-analysis") ?? null;
    const name = document?.querySelector(".analysis-name") ?? null;
    const field = document?.querySelector("#surname") ?? null;
    const root = document?.documentElement;
    if (form === null || root === undefined || typeof window === "undefined") return;
    let zooming = false;
    const reduced =
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onSubmit = (event: { preventDefault(): void }) => {
      if (zooming) return;
      zooming = true;
      event.preventDefault();
      root.setAttribute(ZOOMING, "");
      if (status !== null) status.textContent = status.getAttribute("data-text");
      // The analysis screen: the surname as typed, over the lookups.
      if (name !== null) name.textContent = (field?.value ?? "").trim();
      if (panel !== null) panel.hidden = false;
      // `submit()` bypasses this listener, so the search leaves the page once.
      setTimeout(() => form.submit(), reduced ? 0 : HOLD_MS);
    };
    const onPageShow = (event: PageShowLike) => {
      if (event.persisted === true) {
        zooming = false;
        root.removeAttribute(ZOOMING);
        if (status !== null) status.textContent = "";
        if (panel !== null) panel.hidden = true;
      }
    };
    form.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      form.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
  return null;
}
