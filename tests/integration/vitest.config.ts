import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Starting a real container is slow relative to unit tests; give it
    // room rather than flaking on a busy CI runner.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
