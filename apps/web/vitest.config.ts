import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  // `apps/web/tsconfig.json` sets `jsx: "preserve"`, because Next does its own
  // JSX transform at build time. Vitest does not, so the transform is named here
  // for the view tests, which render real components to markup (TASK-017).
  oxc: { jsx: { runtime: "automatic" } },
});
