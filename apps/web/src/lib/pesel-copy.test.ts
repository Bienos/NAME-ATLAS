import { describe, expect, it } from "vitest";
import { PESEL_RESOURCE_ROLES, peselResource } from "@name-atlas/sources/pesel";
import { LIST_COPY, sourceRef } from "./pesel-copy";

describe("LIST_COPY", () => {
  it("names each list by the start of the publisher's own title", () => {
    for (const role of PESEL_RESOURCE_ROLES) {
      expect(peselResource(role).resource_title.startsWith(`${LIST_COPY[role].title} - `)).toBe(
        true,
      );
    }
  });
});

describe("sourceRef", () => {
  it("numbers sources S01, S02 … in the §17 style", () => {
    expect([0, 1, 9].map(sourceRef)).toEqual(["S01", "S02", "S10"]);
  });
});
