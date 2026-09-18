// Single ESLint configuration for the whole workspace (AGENTS.md §6: one
// linter, one configuration at the root, applied across all workspaces).
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/*.d.ts",
      "packages/db/src/generated/**",
      "pnpm-lock.yaml",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  ...nextCoreWebVitals.map((config) => ({
    ...config,
    files: ["apps/web/**/*.{ts,tsx}", "apps/admin/**/*.{ts,tsx}"],
    languageOptions: {
      ...config.languageOptions,
      globals: {
        ...config.languageOptions?.globals,
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      ...config.settings,
      next: { rootDir: ["apps/web/", "apps/admin/"] },
    },
  })),
  {
    files: ["**/*.test.ts", "**/*.property.test.ts", "**/vitest.config.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
