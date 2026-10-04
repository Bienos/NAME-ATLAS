import type {
  CardInput,
  CardRead,
  InvitationAnswer,
  LivingStatus,
  PersonInput,
  TreePersonRead,
} from "@name-atlas/family";
import type { Lang } from "./messages.js";

/**
 * The tree's addresses (TASK-076): the pages a reader opens, the routes their
 * forms post to, and the one-question flow's draft, which lives in the page's
 * query and nowhere else. Pure, so the header, the pages, the redirects and
 * the tests all take them from here.
 *
 * The pages are one catch-all route per language under the account,
 * `/pl/konto/drzewa/[[...rest]]` and `/en/account/trees/[[...rest]]`:
 *
 * - `` — the dashboard: the reader's trees and the next question;
 * - `zgoda` / `consent` — the one-time step before the first living person;
 * - `{tree}` — the pedigree (Rodowód);
 * - `{tree}/dodaj` / `{tree}/add` — one question, one person;
 * - `{tree}/osoba/{person}` / `{tree}/person/{person}` — a person's form;
 * - `zaproszenie?t=…` / `invitation?t=…` — an invited person's own row and the three answers (TASK-094);
 * - `karty` / `cards` — the rows the reader has claimed, and `karta/{person}` / `card/{person}` one of them.
 *
 * An id is a UUID or the segment is not an address (404). Nothing in a path or
 * a query is ever a name: the draft carries what the reader is typing, which
 * is theirs, and a status word says what happened.
 */

export type TreePage =
  | "trees"
  | "consent"
  | "tree"
  | "constellation"
  | "map"
  | "add"
  | "person"
  | "invitation"
  | "cards"
  | "card";

export type TreeTarget =
  | { readonly page: "trees" }
  | { readonly page: "consent" }
  | { readonly page: "tree"; readonly treeId: string }
  /** The Konstelacja view of a tree (TASK-091). */
  | { readonly page: "constellation"; readonly treeId: string }
  /** The Mapa view of a tree (TASK-092). */
  | { readonly page: "map"; readonly treeId: string }
  | { readonly page: "add"; readonly treeId: string }
  | { readonly page: "person"; readonly treeId: string; readonly personId: string }
  /** An invitation's page (TASK-094); the token travels in the query, `t`. */
  | { readonly page: "invitation" }
  | { readonly page: "cards" }
  | { readonly page: "card"; readonly personId: string };

const BASE: Readonly<Record<Lang, string>> = { pl: "/pl/konto/drzewa", en: "/en/account/trees" };

const SLUG: Readonly<
  Record<
    Lang,
    Readonly<
      Record<
        "consent" | "add" | "person" | "constellation" | "map" | "invitation" | "cards" | "card",
        string
      >
    >
  >
> = {
  pl: {
    consent: "zgoda",
    add: "dodaj",
    person: "osoba",
    constellation: "konstelacja",
    map: "mapa",
    invitation: "zaproszenie",
    cards: "karty",
    card: "karta",
  },
  en: {
    consent: "consent",
    add: "add",
    person: "person",
    constellation: "constellation",
    map: "map",
    invitation: "invitation",
    cards: "cards",
    card: "card",
  },
};

/** The query name of an invitation's token, on the page and in the mail's link. */
export const INVITATION_TOKEN = "t";
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/u;

/** A token as the route makes them: 32 random bytes as base64url. Anything else is not one. */
export function isToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_SHAPE.test(value);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** A tree's or a person's id as the service makes them (`randomUUID`). */
export function isId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function treeBase(lang: Lang): string {
  return BASE[lang];
}

/**
 * The tree's landing page: what it is, why, what the reader can do, who sees
 * what. Public (no session), where the header's "Drzewa" leads; the pages
 * above need a session (the owner, 2026-10-03).
 */
export function treeLandingPath(lang: Lang): string {
  return lang === "en" ? "/en/family-tree" : "/pl/drzewo-rodzinne";
}

/** The address of a page, with a query when it has one (a status word, a draft). */
export function treePath(
  lang: Lang,
  target: TreeTarget,
  query: Readonly<Record<string, string>> = {},
): string {
  const base = BASE[lang];
  const slug = SLUG[lang];
  let path: string;
  switch (target.page) {
    case "trees":
      path = base;
      break;
    case "consent":
      path = `${base}/${slug.consent}`;
      break;
    case "tree":
      path = `${base}/${target.treeId}`;
      break;
    case "constellation":
      path = `${base}/${target.treeId}/${slug.constellation}`;
      break;
    case "map":
      path = `${base}/${target.treeId}/${slug.map}`;
      break;
    case "add":
      path = `${base}/${target.treeId}/${slug.add}`;
      break;
    case "person":
      path = `${base}/${target.treeId}/${slug.person}/${target.personId}`;
      break;
    case "invitation":
      path = `${base}/${slug.invitation}`;
      break;
    case "cards":
      path = `${base}/${slug.cards}`;
      break;
    case "card":
      path = `${base}/${slug.card}/${target.personId}`;
      break;
  }
  const search = new URLSearchParams(query).toString();
  return search === "" ? path : `${path}?${search}`;
}

/** The page a catch-all route's segments name, or null for none (404). */
export function treeTarget(lang: Lang, segments: readonly string[] | undefined): TreeTarget | null {
  const parts = segments ?? [];
  const slug = SLUG[lang];
  if (parts.length === 0) return { page: "trees" };
  const [first, second, third] = parts;
  if (parts.length === 1 && first === slug.consent) return { page: "consent" };
  if (parts.length === 1 && first === slug.invitation) return { page: "invitation" };
  if (parts.length === 1 && first === slug.cards) return { page: "cards" };
  if (parts.length === 2 && first === slug.card && isId(second)) {
    return { page: "card", personId: second.toLowerCase() };
  }
  if (!isId(first)) return null;
  const treeId = first.toLowerCase();
  if (parts.length === 1) return { page: "tree", treeId };
  if (parts.length === 2 && second === slug.add) return { page: "add", treeId };
  if (parts.length === 2 && second === slug.constellation) return { page: "constellation", treeId };
  if (parts.length === 2 && second === slug.map) return { page: "map", treeId };
  if (parts.length === 3 && second === slug.person && isId(third)) {
    return { page: "person", treeId, personId: third.toLowerCase() };
  }
  return null;
}

export type TreeAction =
  | "create-tree"
  | "add-person"
  | "update-person"
  | "delete-person"
  | "set-parent"
  | "remove-parent"
  | "set-root"
  | "accept-living-terms"
  | "delete-tree"
  | "invite"
  | "answer-invitation"
  | "update-card"
  | "leave-tree";

export const TREE_ACTIONS: readonly TreeAction[] = [
  "create-tree",
  "add-person",
  "update-person",
  "delete-person",
  "set-parent",
  "remove-parent",
  "set-root",
  "accept-living-terms",
  "delete-tree",
  "invite",
  "answer-invitation",
  "update-card",
  "leave-tree",
];

/** The three answers as the form sends them (TASK-094, ADR-0029 §2.6.21). */
export const INVITATION_ANSWERS = {
  me: "ME",
  "not-me": "NOT_ME",
  "no-contact": "NO_CONTACT",
} as const;

export function invitationAnswer(value: unknown): InvitationAnswer | null {
  return typeof value === "string" && Object.hasOwn(INVITATION_ANSWERS, value)
    ? INVITATION_ANSWERS[value as keyof typeof INVITATION_ANSWERS]
    : null;
}

/** The claimant's form (TASK-094): the draft's fields it shares, and the boxes that hide one. */
export const HIDE_FIELD = "hide";

export const TREE_API_PREFIX = "/api/tree/";

export function isTreeAction(value: string): value is TreeAction {
  return (TREE_ACTIONS as readonly string[]).includes(value);
}

/** The route a form posts to. */
export function treeActionPath(action: TreeAction): string {
  return `${TREE_API_PREFIX}${action}`;
}

export type SlotRole = "MOTHER" | "FATHER";

export function isSlotRole(value: unknown): value is SlotRole {
  return value === "MOTHER" || value === "FATHER";
}

export function isLivingStatus(value: unknown): value is LivingStatus {
  return value === "LIVING" || value === "DECEASED" || value === "UNKNOWN";
}

/**
 * What the reader has typed about one person, as the one-question flow carries
 * it from page to page in the query (TASK-076 AC-6): the form's fields, as
 * text, so a reload of any page loses nothing but what is in its own address,
 * and a page before the last POST stores nothing.
 */
export interface PersonDraft {
  readonly given: string;
  readonly surname: string;
  readonly birthSurname: string;
  readonly birthYear: string;
  readonly birthApprox: boolean;
  readonly placeCode: string;
  readonly placeText: string;
  readonly deathYear: string;
  readonly deathApprox: boolean;
  readonly living: LivingStatus;
  readonly sourceNote: string;
  readonly notes: string;
}

export const EMPTY_DRAFT: PersonDraft = {
  given: "",
  surname: "",
  birthSurname: "",
  birthYear: "",
  birthApprox: false,
  placeCode: "",
  placeText: "",
  deathYear: "",
  deathApprox: false,
  living: "UNKNOWN",
  sourceNote: "",
  notes: "",
};

/** The field names, in the form and in the query alike. */
export const DRAFT_FIELDS = {
  given: "given",
  surname: "surname",
  birthSurname: "born",
  birthYear: "birth",
  birthApprox: "birth_approx",
  placeCode: "place_code",
  placeText: "place",
  deathYear: "death",
  deathApprox: "death_approx",
  living: "living",
  sourceNote: "source",
  notes: "notes",
} as const;

/** Whether any of the draft's fields is present at all, so a page can tell a fresh form from a kept one. */
export function hasDraft(get: (name: string) => string | null): boolean {
  return Object.values(DRAFT_FIELDS).some((name) => get(name) !== null);
}

/** The draft from a query or a form, missing fields empty. */
export function draftFrom(get: (name: string) => string | null): PersonDraft {
  const text = (name: string): string => get(name) ?? "";
  const flag = (name: string): boolean => get(name) === "1" || get(name) === "on";
  const living = get(DRAFT_FIELDS.living);
  // A place chosen from the TERYT list arrives as "<code> <name>" (one radio
  // value, no script): the code is kept and the name replaces what was typed,
  // so the pedigree shows the register's name without reading the register.
  const chosen = /^([0-9]{7}) (.+)$/u.exec(text(DRAFT_FIELDS.placeCode).trim());
  return {
    given: text(DRAFT_FIELDS.given),
    surname: text(DRAFT_FIELDS.surname),
    birthSurname: text(DRAFT_FIELDS.birthSurname),
    birthYear: text(DRAFT_FIELDS.birthYear),
    birthApprox: flag(DRAFT_FIELDS.birthApprox),
    placeCode: chosen === null ? text(DRAFT_FIELDS.placeCode) : (chosen[1] ?? ""),
    placeText: chosen === null ? text(DRAFT_FIELDS.placeText) : (chosen[2] ?? ""),
    deathYear: text(DRAFT_FIELDS.deathYear),
    deathApprox: flag(DRAFT_FIELDS.deathApprox),
    living: isLivingStatus(living) ? living : "UNKNOWN",
    sourceNote: text(DRAFT_FIELDS.sourceNote),
    notes: text(DRAFT_FIELDS.notes),
  };
}

/** The draft as a query, empty fields left out. */
export function draftQuery(draft: PersonDraft): Record<string, string> {
  const query: Record<string, string> = {};
  const put = (name: string, value: string): void => {
    if (value !== "") query[name] = value;
  };
  put(DRAFT_FIELDS.given, draft.given);
  put(DRAFT_FIELDS.surname, draft.surname);
  put(DRAFT_FIELDS.birthSurname, draft.birthSurname);
  put(DRAFT_FIELDS.birthYear, draft.birthYear);
  if (draft.birthApprox) query[DRAFT_FIELDS.birthApprox] = "1";
  put(DRAFT_FIELDS.placeCode, draft.placeCode);
  put(DRAFT_FIELDS.placeText, draft.placeText);
  put(DRAFT_FIELDS.deathYear, draft.deathYear);
  if (draft.deathApprox) query[DRAFT_FIELDS.deathApprox] = "1";
  if (draft.living !== "UNKNOWN") query[DRAFT_FIELDS.living] = draft.living;
  put(DRAFT_FIELDS.sourceNote, draft.sourceNote);
  put(DRAFT_FIELDS.notes, draft.notes);
  return query;
}

/** A year as typed: empty is none, four digits are a year, anything else is a problem `checkPerson` reports. */
export function parseYear(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  return /^[0-9]{4}$/u.test(trimmed) ? Number(trimmed) : Number.NaN;
}

/** The draft as the service's input. `checkPerson` does the checking; this only reads. */
export function personFromDraft(draft: PersonDraft): PersonInput {
  return {
    givenNames: draft.given,
    surname: draft.surname,
    birthSurname: draft.birthSurname,
    birthYear: parseYear(draft.birthYear),
    birthYearApprox: draft.birthApprox,
    birthPlaceCode: draft.placeCode,
    birthPlaceText: draft.placeText,
    deathYear: parseYear(draft.deathYear),
    deathYearApprox: draft.deathApprox,
    livingStatus: draft.living,
    sourceNote: draft.sourceNote,
    notes: draft.notes,
  };
}

/** A person as the form shows them, for a correction. */
export function draftOf(person: TreePersonRead): PersonDraft {
  return {
    given: person.given_names,
    surname: person.surname,
    birthSurname: person.birth_surname ?? "",
    birthYear: person.birth.year === null ? "" : String(person.birth.year),
    birthApprox: person.birth.approx,
    placeCode: person.birth.place_code ?? "",
    placeText: person.birth.place_text ?? "",
    deathYear: person.death.year === null ? "" : String(person.death.year),
    deathApprox: person.death.approx,
    living: person.living_status,
    sourceNote: person.source_note ?? "",
    notes: person.notes ?? "",
  };
}

/** The claimant's own row as the card form shows it (TASK-094): the draft's shared fields, the rest empty. */
export function draftOfCard(card: CardRead): PersonDraft {
  const p = card.person;
  return {
    ...EMPTY_DRAFT,
    given: p.given_names,
    surname: p.surname,
    birthSurname: p.birth_surname ?? "",
    birthYear: p.birth.year === null ? "" : String(p.birth.year),
    birthApprox: p.birth.approx,
    placeCode: p.birth.place_code ?? "",
    placeText: p.birth.place_text ?? "",
    living: "LIVING",
  };
}

/** The draft as the service's card input, with what the reader ticked to hide. `updateCard` checks both. */
export function cardFromDraft(draft: PersonDraft, hidden: readonly string[]): CardInput {
  return {
    givenNames: draft.given,
    surname: draft.surname,
    birthSurname: draft.birthSurname,
    birthYear: parseYear(draft.birthYear),
    birthYearApprox: draft.birthApprox,
    birthPlaceCode: draft.placeCode,
    birthPlaceText: draft.placeText,
    hiddenFields: hidden,
  };
}
