import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next.js's own tsconfig sets jsx: "preserve" for its build pipeline.
  // @vitejs/plugin-react transforms .tsx independently of that, so
  // Vitest can run component-level tests without affecting `next build`,
  // which reads next.config.ts/tsconfig.json on its own.
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
