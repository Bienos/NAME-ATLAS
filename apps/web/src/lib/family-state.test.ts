import { describe, expect, it } from "vitest";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import {
  cardsOf,
  emptyEntries,
  identityOf,
  LABELS,
  LOADING,
  lookupsOf,
  parseLabel,
  requestPath,
  SLOTS,
  stateOf,
  withLabel,
  withSurname,
} from "./family-state.js";
import type { CardState, Entry, SlotId } from "./family-state.js";

/**
 * TASK-040's state rules, asserted on the pure module (§11: AC-01, AC-07,
 * AC-08, AC-10, AC-12 and AC-14's label set, plus §10's state mapping).
 */

const SURFACE = { surface: "FREE", decision: "ALLOWED", reason_code: "RIGHTS_PERMIT_FREE_SURFACE" };

/** A resolved answer whose figures are not prepared: valid, and small. */
function resolved(id: string, displayName: string): SurnameResultResponse {
  const notDerived = {
    state: "UNAVAILABLE",
    reason_code: "NOT_DERIVED_YET",
    surface: SURFACE,
  };
  return surnameResultResponseSchema.parse({
    schema_version: "1.6",
    status: "RESOLVED",
    surname: { id, display_name: displayName, script: "Latn" },
    population: { ...notDerived, observations: [] },
    rarity: { ...notDerived, entries: [] },
    distribution: { ...notDerived, entries: [] },
    suggestions: null,
    meaning: {
      state: "NO_SOURCED_MEANING",
      interpretations: [],
      confidence: null,
      methodology_code: null,
      reason_code: "NO_ADMISSIBLE_ONOMASTIC_SOURCE",
      surface: SURFACE,
    },
  });
}

const UNRESOLVED: SurnameResultResponse = surnameResultResponseSchema.parse({
  schema_version: "1.6",
  status: "UNRESOLVED",
  surname: null,
  population: null,
  rarity: null,
  distribution: null,
  suggestions: {
    state: "UNAVAILABLE",
    outcome: null,
    decision_mode: null,
    reason_code: "NO_CANDIDATE_ABOVE_THRESHOLD",
    suggestions: [],
  },
  meaning: null,
});

const NOWAK_ID = "01a0b9e3-34f3-7633-a239-2b8596dfc088";
const LUCZAK_ID = "01a0b9e3-34f3-7633-a239-2b8596dfc0b1";
const LUCZAK_ASCII_ID = "01a0b9e3-34f3-7633-a239-2b8596dfc0b2";

function entries(...surnames: string[]): Entry[] {
  return surnames.reduce(
    (list, surname, index) => withSurname(list, SLOTS[index] as SlotId, surname),
    emptyEntries(),
  );
}

function result(response: SurnameResultResponse): CardState {
  return { kind: "RESULT", response };
}

describe("AC-01: at most four inputs; empty ones send nothing", () => {
  it("has exactly four slots, with neutral names", () => {
    expect(SLOTS).toEqual(["surname-1", "surname-2", "surname-3", "surname-4"]);
    expect(emptyEntries()).toHaveLength(4);
  });

  it("offers no way to add a fifth: an update to an unknown slot changes nothing", () => {
    const list = emptyEntries();
    const after = withSurname(list, "surname-5" as SlotId, "NOWAK");
    expect(after).toHaveLength(4);
    expect(after.every((entry) => entry.surname === "")).toBe(true);
  });

  it("looks up only non-empty inputs, in input order", () => {
    const list = entries("NOWAK", "", "   ", "KOWALSKI");
    expect(lookupsOf(list).map((entry) => [entry.slot, entry.surname])).toEqual([
      ["surname-1", "NOWAK"],
      ["surname-4", "KOWALSKI"],
    ]);
  });

  it("looks up nothing when every input is empty or whitespace", () => {
    expect(lookupsOf(entries("", " ", "\t", "\n"))).toEqual([]);
  });

  it("ignores anything past the fourth entry, however it got there", () => {
    const five = [...entries("A", "B", "C", "D"), { slot: "surname-4", surname: "E", label: null }];
    expect(lookupsOf(five as Entry[])).toHaveLength(4);
  });
});

describe("AC-12: a compound is one lookup, sent as typed", () => {
  it("does not split, trim or rewrite the input", () => {
    const [only, ...rest] = lookupsOf(entries("Kowalska-Nowak"));
    expect(rest).toEqual([]);
    expect(only?.surname).toBe("Kowalska-Nowak");
    expect(requestPath("Kowalska-Nowak")).toBe("/api/v1/surname-results?surname=Kowalska-Nowak");
  });

  it("sends the input exactly as typed, spaces and diacritics included", () => {
    expect(lookupsOf(entries(" Łuczak "))[0]?.surname).toBe(" Łuczak ");
    expect(requestPath(" Łuczak ")).toBe("/api/v1/surname-results?surname=%20%C5%81uczak%20");
  });
});

describe("AC-14: exactly four fixed labels, optional, no free text", () => {
  it("is the decided set", () => {
    expect(LABELS).toEqual(["SELF", "FATHER", "MOTHER", "OTHER"]);
  });

  it("starts unlabelled, and a label is optional", () => {
    expect(emptyEntries().every((entry) => entry.label === null)).toBe(true);
  });

  it("accepts only the four values; anything else is no label", () => {
    for (const label of LABELS) expect(parseLabel(label)).toBe(label);
    expect(parseLabel("")).toBeNull();
    expect(parseLabel("GRANDMOTHER")).toBeNull();
    expect(parseLabel("Babcia Zofia, ur. 1931")).toBeNull();
  });

  it("sets a label on one slot only", () => {
    const list = withLabel(entries("NOWAK", "KOWALSKI"), "surname-2", "MOTHER");
    expect(list.map((entry) => entry.label)).toEqual([null, "MOTHER", null, null]);
  });
});

describe("§10: each answer maps onto one card state", () => {
  it("a valid 200 is a result", () => {
    const response = resolved(NOWAK_ID, "NOWAK");
    expect(stateOf(200, response)).toEqual({ kind: "RESULT", response });
    expect(stateOf(200, UNRESOLVED)).toEqual({ kind: "RESULT", response: UNRESOLVED });
  });

  it("a 200 that fails its own contract is an error with no figures, not a result", () => {
    const broken = { ...resolved(NOWAK_ID, "NOWAK"), surname: null };
    expect(stateOf(200, broken)).toEqual({ kind: "ERROR", retryable: false });
    expect(stateOf(200, null)).toEqual({ kind: "ERROR", retryable: false });
  });

  it("a 400 is the validation state", () => {
    const envelope = {
      error: {
        code: "INVALID_SURNAME_INPUT",
        message: "the surname could not be accepted: EMPTY",
        retryable: false,
        request_id: "r-1",
      },
    };
    expect(stateOf(400, envelope)).toEqual({ kind: "INVALID" });
  });

  it("a 429 is the retry state, recognised by status because its body is plain text", () => {
    expect(stateOf(429, null)).toEqual({ kind: "RATE_LIMITED" });
  });

  it("a server error keeps the envelope's retryable flag, and is never an unknown surname", () => {
    const unavailable = {
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "the surname service is temporarily unavailable",
        retryable: true,
        request_id: "r-2",
      },
    };
    const internal = {
      error: {
        code: "INTERNAL_ERROR",
        message: "the request could not be completed",
        retryable: false,
        request_id: "r-3",
      },
    };
    expect(stateOf(503, unavailable)).toEqual({ kind: "ERROR", retryable: true });
    expect(stateOf(500, internal)).toEqual({ kind: "ERROR", retryable: false });
    // A gateway's HTML error page has no envelope; a 5xx is worth one retry.
    expect(stateOf(504, null)).toEqual({ kind: "ERROR", retryable: true });
  });
});

describe("AC-07: cards merge only on the identity the endpoint returns", () => {
  it("NOWAK and Nowak are two lookups, and one card when both answers name one surname", () => {
    const list = lookupsOf(entries("NOWAK", "Nowak"));
    expect(list).toHaveLength(2);
    const states = new Map<SlotId, CardState>([
      ["surname-1", result(resolved(NOWAK_ID, "NOWAK"))],
      ["surname-2", result(resolved(NOWAK_ID, "NOWAK"))],
    ]);
    const cards = cardsOf(list, states);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.entries.map((entry) => entry.surname)).toEqual(["NOWAK", "Nowak"]);
  });

  it("Łuczak and Luczak with two identities are two cards: no diacritic folding", () => {
    const list = lookupsOf(entries("Łuczak", "Luczak"));
    const states = new Map<SlotId, CardState>([
      ["surname-1", result(resolved(LUCZAK_ID, "ŁUCZAK"))],
      ["surname-2", result(resolved(LUCZAK_ASCII_ID, "LUCZAK"))],
    ]);
    expect(cardsOf(list, states).map((card) => card.entries.length)).toEqual([1, 1]);
  });

  it("never merges without an identity, however alike the inputs", () => {
    const list = lookupsOf(entries("Xyzzy", "Xyzzy", "XYZZY"));
    const states = new Map<SlotId, CardState>([
      ["surname-1", result(UNRESOLVED)],
      ["surname-2", result(UNRESOLVED)],
      ["surname-3", { kind: "INVALID" }],
    ]);
    expect(cardsOf(list, states)).toHaveLength(3);
    expect(identityOf(result(UNRESOLVED))).toBeNull();
    expect(identityOf(LOADING)).toBeNull();
  });

  it("does not merge while an answer is still loading", () => {
    const list = lookupsOf(entries("NOWAK", "Nowak"));
    const states = new Map<SlotId, CardState>([["surname-1", result(resolved(NOWAK_ID, "NOWAK"))]]);
    const cards = cardsOf(list, states);
    expect(cards).toHaveLength(2);
    expect(cards[1]?.state).toEqual(LOADING);
  });
});

describe("AC-08: one card's outcome never changes another's", () => {
  const list = lookupsOf(entries("NOWAK", "Xyzzy", "K0walski", "KOWALSKI"));
  const nowak = result(resolved(NOWAK_ID, "NOWAK"));
  const unresolved = result(UNRESOLVED);
  const invalid: CardState = { kind: "INVALID" };
  const limited: CardState = { kind: "RATE_LIMITED" };
  const before = new Map<SlotId, CardState>([
    ["surname-1", nowak],
    ["surname-2", unresolved],
    ["surname-3", invalid],
    ["surname-4", limited],
  ]);

  it("maps each input to its own state, one to one, in a mixed submission", () => {
    expect(cardsOf(list, before).map((card) => [card.key, card.state])).toEqual([
      ["surname-1", nowak],
      ["surname-2", unresolved],
      ["surname-3", invalid],
      ["surname-4", limited],
    ]);
  });

  it("a retried card changes alone", () => {
    const after = new Map(before).set("surname-4", { kind: "ERROR", retryable: true });
    const [a, b, c, d] = cardsOf(list, after);
    expect([a?.state, b?.state, c?.state]).toEqual([nowak, unresolved, invalid]);
    expect(a?.state).toBe(nowak);
    expect(d?.state).toEqual({ kind: "ERROR", retryable: true });
  });
});

describe("AC-10: cards in input order, never sorted", () => {
  it("keeps input order whatever the answers say", () => {
    const list = lookupsOf(entries("ZIELIŃSKI", "ABRAMOWICZ", "NOWAK"));
    const states = new Map<SlotId, CardState>([
      ["surname-1", result(resolved("01a0b9e3-34f3-7633-a239-2b8596dfc0c1", "ZIELIŃSKI"))],
      ["surname-2", result(resolved("01a0b9e3-34f3-7633-a239-2b8596dfc0c2", "ABRAMOWICZ"))],
      ["surname-3", result(resolved(NOWAK_ID, "NOWAK"))],
    ]);
    expect(cardsOf(list, states).map((card) => card.key)).toEqual([
      "surname-1",
      "surname-2",
      "surname-3",
    ]);
  });
});
