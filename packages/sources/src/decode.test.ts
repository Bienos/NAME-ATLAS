import { describe, expect, it } from "vitest";
import { decodePeselBytes } from "./decode.js";
import { PeselSchemaError } from "./errors.js";

describe("decodePeselBytes", () => {
  it("decodes valid UTF-8, including Polish diacritics, exactly", () => {
    const text = "Nazwisko aktualne,Liczba\r\nWIŚNIEWSKI,53079\r\n";
    const bytes = new TextEncoder().encode(text);
    expect(decodePeselBytes(bytes)).toBe(text);
  });

  it("rejects a byte-order mark, matching the confirmed BOM-less source shape", () => {
    const withBom = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode("Nazwisko aktualne,Liczba\r\n"),
    ]);
    expect(() => decodePeselBytes(withBom)).toThrow(PeselSchemaError);
    expect(() => decodePeselBytes(withBom)).toThrow(/byte-order mark/);
  });

  it("rejects invalid UTF-8 byte sequences rather than substituting replacement characters", () => {
    // 0xFF is not a valid UTF-8 lead byte anywhere in the standard.
    const invalid = new Uint8Array([0x4e, 0x61, 0x7a, 0xff, 0xfe]);
    expect(() => decodePeselBytes(invalid)).toThrow(PeselSchemaError);
    expect(() => decodePeselBytes(invalid)).toThrow(/not valid UTF-8/);
  });
});
