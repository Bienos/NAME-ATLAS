import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import { UI, parseIntent as parseIntentFromMessages } from "./messages.js";
import { SECTIONS, SOURCES_ANCHOR, anchorOf, parseIntent, sectionOrder } from "./sections.js";

/**
 * TASK-034: the section registry is the only declaration of the page's
 * sections, and the rest of the web app is held to it here. Each test names
 * the drift it catches.
 */

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS = readFileSync(path.join(SRC, "app", "globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//gu,
  "",
);
const ANCHORS = [...SECTIONS.map((section) => section.anchor), SOURCES_ANCHOR];

/** Every source file of the app, tests excluded. */
function sourceFiles(dir: string = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.tsx?$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name) ? [file] : [];
  });
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

describe("the section registry (TASK-034)", () => {
  it("names each chapter once: keys, anchors and intents are unique", () => {
    expect(unique(SECTIONS.map((section) => section.key))).toBe(true);
    expect(unique(ANCHORS)).toBe(true);
    const intents = SECTIONS.flatMap((section) =>
      section.intent === null ? [] : [section.intent],
    );
    expect(unique(intents)).toBe(true);
    expect(intents).not.toContain("default");
  });

  it("covers exactly the contract's chapter sections — a new section cannot be forgotten", () => {
    // Everything else in the payload is identity, or shown only when nothing resolved.
    const notChapters = new Set(["schema_version", "status", "surname", "suggestions"]);
    const contractSections = Object.keys(surnameResultResponseSchema.shape).filter(
      (field) => !notChapters.has(field),
    );
    const shown = SECTIONS.flatMap((section) => [
      section.field,
      ...("also" in section ? section.also : []),
    ]);
    expect(shown.sort()).toEqual(contractSections.sort());
  });

  it("has words for every chapter's link, question and reading note, in both languages", () => {
    for (const lang of ["pl", "en"] as const) {
      for (const section of SECTIONS) {
        for (const key of [section.nav, section.title, section.lede]) {
          const text: unknown = UI[lang][key];
          expect(typeof text, `${lang}.${key}`).toBe("string");
          expect(String(text).trim(), `${lang}.${key}`).not.toBe("");
        }
      }
    }
  });

  it("parses each registered intent to itself, and anything else to the default", () => {
    for (const section of SECTIONS) {
      if (section.intent !== null) expect(parseIntent(section.intent)).toBe(section.intent);
    }
    for (const other of [undefined, null, "", "default", "count", "where", "MAP"]) {
      expect(parseIntent(other)).toBe("default");
    }
    // `messages.ts` re-exports the registry's parser; it keeps no list of its own.
    expect(parseIntentFromMessages).toBe(parseIntent);
  });

  it("orders chapters as registered, and an intent moves only its own chapter first", () => {
    const base = SECTIONS.map((section) => section.key);
    expect(sectionOrder("default")).toEqual(base);
    for (const section of SECTIONS) {
      if (section.intent === null) continue;
      expect(sectionOrder(parseIntent(section.intent))).toEqual([
        section.key,
        ...base.filter((key) => key !== section.key),
      ]);
    }
  });

  it("is the only place an anchor is written: the views take theirs from the registry", () => {
    const literal = new RegExp(`(?:id|href)=["'\`]#?(?:${ANCHORS.join("|")})["'\`]`, "u");
    const offenders = sourceFiles()
      .filter((file) => path.basename(file) !== "sections.ts")
      .filter((file) => literal.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(SRC, file));
    expect(offenders).toEqual([]);
    expect(anchorOf("map")).toBe("where");
  });

  it("styles by id only anchors the registry declares — a renamed anchor fails here", () => {
    // An id in a selector is followed by `{` before any `}`; a colour value is not.
    const ids = [...CSS.matchAll(/#([a-z][a-z0-9-]*)(?=[^{}]*\{)/gu)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(0);
    const unknown = ids.filter((id) => id === undefined || !ANCHORS.includes(id));
    expect(unknown).toEqual([]);
  });
});
