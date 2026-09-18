import { describe, expect, it } from "vitest";
import { CONTRACT_PACKAGE_VERSION } from "./index.js";

describe("@name-atlas/contracts placeholder export", () => {
  it("exposes a non-empty version string", () => {
    expect(CONTRACT_PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
