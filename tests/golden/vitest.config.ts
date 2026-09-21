import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The resolution domain starts a real PostgreSQL, as `tests/integration`
    // does, and for the same reason: an exact resolver not exercised against a
    // real `canonical_key` index proves nothing.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
