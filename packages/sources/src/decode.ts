import { PeselSchemaError } from "./errors.js";

const UTF8_BOM = "﻿";

/**
 * Decodes raw resource bytes as strict UTF-8, failing closed rather than
 * silently substituting replacement characters for invalid byte
 * sequences. Also fails closed on a byte-order mark: both confirmed
 * source files begin directly with the header text (bytes `4e 61 7a...`,
 * i.e. "Naz…"), with no BOM. A BOM appearing in a future resource is a
 * shape change this package must not paper over.
 */
export function decodePeselBytes(bytes: Uint8Array): string {
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  let text: string;
  try {
    text = decoder.decode(bytes);
  } catch {
    throw new PeselSchemaError("invalid_encoding", "resource is not valid UTF-8");
  }
  if (text.startsWith(UTF8_BOM)) {
    throw new PeselSchemaError(
      "unexpected_bom",
      "resource begins with a UTF-8 byte-order mark; the confirmed source shape has none",
    );
  }
  return text;
}
