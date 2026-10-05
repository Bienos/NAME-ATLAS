import type { HiddenField, LivingStatus, ParentRole, PersonsTable } from "./schema.js";

/**
 * The tree's rules that need no database (ADR-0029 §2.2): what a person row
 * may hold, which status counts as living, and whether a parent link would
 * close a loop. The service applies them inside its transactions; the
 * database repeats the ones it can as constraints and policies.
 */

export const NAME_MAX = 120;
export const PLACE_TEXT_MAX = 120;
export const SOURCE_NOTE_MAX = 500;
export const NOTES_MAX = 2000;
export const YEAR_MIN = 1000;
export const YEAR_MAX = 2100;
/** A child has at most this many parents. */
export const PARENTS_MAX = 2;

/**
 * A tree whose owner has no paid tier holds at most this many people; adding
 * one more needs a paid tier, any of the four (ADR-0037 §2.1, D-025, TASK-112).
 */
export const FREE_TREE_PERSONS_MAX = 5;

/**
 * Whether an account has a paid tier. No checkout exists (ADR-0023 §2.5), so
 * nothing records one and every account answers false. Checkout replaces this
 * through `FamilyDeps.hasPaidTier`.
 */
export async function noPaidTier(_userId: string): Promise<boolean> {
  return false;
}

/** The canonical rule: an unknown status is protected as living (`docs/canonical/19` §10). */
export function treatedAsLiving(status: LivingStatus): boolean {
  return status !== "DECEASED";
}

export interface PersonInput {
  readonly givenNames: string;
  readonly surname: string;
  readonly birthSurname?: string | null;
  readonly birthYear?: number | null;
  readonly birthYearApprox?: boolean;
  readonly birthPlaceCode?: string | null;
  readonly birthPlaceText?: string | null;
  readonly deathYear?: number | null;
  readonly deathYearApprox?: boolean;
  readonly deathPlaceCode?: string | null;
  readonly deathPlaceText?: string | null;
  readonly livingStatus?: LivingStatus;
  readonly sourceNote?: string | null;
  readonly notes?: string | null;
}

export type PersonProblem =
  | "GIVEN_NAMES"
  | "SURNAME"
  | "BIRTH_SURNAME"
  | "BIRTH_YEAR"
  | "DEATH_YEAR"
  | "DEATH_BEFORE_BIRTH"
  | "BIRTH_PLACE_CODE"
  | "DEATH_PLACE_CODE"
  | "BIRTH_PLACE_TEXT"
  | "DEATH_PLACE_TEXT"
  | "SOURCE_NOTE"
  | "NOTES";

/** The row a valid input becomes. `livingStatus` is `DECEASED` whenever a death year is given. */
export interface PersonFields {
  readonly given_names: string;
  readonly surname: string;
  readonly birth_surname: string | null;
  readonly birth_year: number | null;
  readonly birth_year_approx: boolean;
  readonly birth_place_code: string | null;
  readonly birth_place_text: string | null;
  readonly death_year: number | null;
  readonly death_year_approx: boolean;
  readonly death_place_code: string | null;
  readonly death_place_text: string | null;
  readonly living_status: LivingStatus;
  readonly source_note: string | null;
  readonly notes: string | null;
}

export type PersonCheck =
  | { readonly ok: true; readonly fields: PersonFields }
  | { readonly ok: false; readonly problems: readonly PersonProblem[] };

const SIMC = /^[0-9]{7}$/u;

function text(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function year(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : value;
}

function validYear(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= YEAR_MIN && value <= YEAR_MAX);
}

/**
 * Trims, checks and normalises one person. Nothing here infers: a death year
 * makes the status `DECEASED` because a death is a death, and that is all.
 */
export function checkPerson(input: PersonInput): PersonCheck {
  const problems: PersonProblem[] = [];
  const givenNames = text(input.givenNames) ?? "";
  const surname = text(input.surname) ?? "";
  const birthSurname = text(input.birthSurname);
  const birthYear = year(input.birthYear);
  const deathYear = year(input.deathYear);
  const birthPlaceCode = text(input.birthPlaceCode);
  const deathPlaceCode = text(input.deathPlaceCode);
  const birthPlaceText = text(input.birthPlaceText);
  const deathPlaceText = text(input.deathPlaceText);
  const sourceNote = text(input.sourceNote);
  const notes = text(input.notes);

  if (givenNames.length < 1 || givenNames.length > NAME_MAX) problems.push("GIVEN_NAMES");
  if (surname.length < 1 || surname.length > NAME_MAX) problems.push("SURNAME");
  if (birthSurname !== null && birthSurname.length > NAME_MAX) problems.push("BIRTH_SURNAME");
  if (!validYear(birthYear)) problems.push("BIRTH_YEAR");
  if (!validYear(deathYear)) problems.push("DEATH_YEAR");
  if (birthYear !== null && deathYear !== null && deathYear < birthYear) {
    problems.push("DEATH_BEFORE_BIRTH");
  }
  if (birthPlaceCode !== null && !SIMC.test(birthPlaceCode)) problems.push("BIRTH_PLACE_CODE");
  if (deathPlaceCode !== null && !SIMC.test(deathPlaceCode)) problems.push("DEATH_PLACE_CODE");
  if (birthPlaceText !== null && birthPlaceText.length > PLACE_TEXT_MAX)
    problems.push("BIRTH_PLACE_TEXT");
  if (deathPlaceText !== null && deathPlaceText.length > PLACE_TEXT_MAX)
    problems.push("DEATH_PLACE_TEXT");
  if (sourceNote !== null && sourceNote.length > SOURCE_NOTE_MAX) problems.push("SOURCE_NOTE");
  if (notes !== null && notes.length > NOTES_MAX) problems.push("NOTES");
  if (problems.length > 0) return { ok: false, problems };

  const livingStatus: LivingStatus =
    deathYear !== null ? "DECEASED" : (input.livingStatus ?? "UNKNOWN");
  return {
    ok: true,
    fields: {
      given_names: givenNames,
      surname,
      birth_surname: birthSurname,
      birth_year: birthYear,
      birth_year_approx: input.birthYearApprox ?? false,
      birth_place_code: birthPlaceCode,
      birth_place_text: birthPlaceText,
      death_year: deathYear,
      death_year_approx: input.deathYearApprox ?? false,
      death_place_code: deathPlaceCode,
      death_place_text: deathPlaceText,
      living_status: livingStatus,
      source_note: sourceNote,
      notes,
    },
  };
}

export interface ParentEdge {
  readonly child_id: string;
  readonly parent_id: string;
  readonly role?: ParentRole;
}

/**
 * Whether making `parentId` a parent of `childId` would close a loop: true
 * when the child is already an ancestor of the parent (or is the parent). The
 * edges are one tree's, which is small, so a walk is enough.
 */
export function wouldCycle(
  edges: readonly ParentEdge[],
  childId: string,
  parentId: string,
): boolean {
  if (childId === parentId) return true;
  const parentsOf = new Map<string, string[]>();
  for (const edge of edges) {
    const list = parentsOf.get(edge.child_id) ?? [];
    list.push(edge.parent_id);
    parentsOf.set(edge.child_id, list);
  }
  // Walk up from the would-be parent: if the child is found above it, the
  // child would become its own ancestor.
  const seen = new Set<string>();
  const stack = [parentId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const up of parentsOf.get(current) ?? []) {
      if (up === childId) return true;
      stack.push(up);
    }
  }
  return false;
}

/** How many parents a child already has. */
export function parentCount(edges: readonly ParentEdge[], childId: string): number {
  return edges.filter((edge) => edge.child_id === childId).length;
}

// --- Invitations and claims (TASK-094, ADR-0029 §2.6) ---------------------

/** An invitation lives this long; there is no reminder (§2.6.20). */
export const INVITATION_DAYS = 14;
/** How many invitations one tree may send in `INVITATION_WINDOW_DAYS` (§2.6.20: "ten a month"). */
export const INVITATIONS_PER_WINDOW = 10;
export const INVITATION_WINDOW_DAYS = 30;
/** Nobody whose birth year makes them younger than this is invited (§2.6.20). */
export const INVITATION_MIN_AGE = 18;

export const HIDDEN_FIELDS: readonly HiddenField[] = ["birth_year", "birth_place", "birth_surname"];

export function isHiddenField(value: unknown): value is HiddenField {
  return (HIDDEN_FIELDS as readonly unknown[]).includes(value);
}

export type InviteProblem =
  /** A person who has died is not invited; the invitation is for the living (§2.6). */
  | "NOT_LIVING"
  | "MINOR"
  /** The row is already somebody's. */
  | "CLAIMED"
  /** The person answered "nie chcę kontaktu" (§2.6.23). */
  | "DECLINED"
  /** The address is on the tree's suppression list. */
  | "SUPPRESSED"
  /** An invitation for this person is still open. */
  | "PENDING"
  | "LIMIT";

/**
 * Why a person may not be invited, from the row alone, or null when they may.
 * The address's and the tree's problems (`SUPPRESSED`, `PENDING`, `LIMIT`)
 * need the database and are the service's.
 */
export function inviteProblem(
  person: Pick<
    PersonsTable,
    "living_status" | "birth_year" | "claimed_by_user_id" | "contact_declined"
  >,
  now: Date,
): Extract<InviteProblem, "NOT_LIVING" | "MINOR" | "CLAIMED" | "DECLINED"> | null {
  if (!treatedAsLiving(person.living_status)) return "NOT_LIVING";
  if (person.birth_year !== null && now.getUTCFullYear() - person.birth_year < INVITATION_MIN_AGE) {
    return "MINOR";
  }
  if (person.claimed_by_user_id !== null) return "CLAIMED";
  if (person.contact_declined) return "DECLINED";
  return null;
}

/** The hidden fields as typed, each known and each once. */
export function checkHiddenFields(values: readonly unknown[]): readonly HiddenField[] | null {
  const seen = new Set<HiddenField>();
  for (const value of values) {
    if (!isHiddenField(value)) return null;
    seen.add(value);
  }
  return HIDDEN_FIELDS.filter((f) => seen.has(f));
}
