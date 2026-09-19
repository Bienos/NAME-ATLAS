import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The workspace packages are consumed as TypeScript source — each exports
   * `./src/index.ts` — and their internal imports carry `.js` extensions,
   * the NodeNext convention the rest of the repo uses so `tsx`, Node and
   * vitest can run them directly (TASK-001).
   *
   * `transpilePackages` makes Next compile them with its own pipeline, and
   * `extensionAlias` teaches the bundler TypeScript's rule that a `.js`
   * specifier may be satisfied by a `.ts` file. Without the alias every
   * internal import inside those packages fails to resolve.
   *
   * `extensionAlias` is a webpack option and Turbopack has no equivalent, so
   * `dev` and `build` pass `--webpack` (see package.json). Revisit when
   * either Turbopack gains extension aliasing or the workspace packages are
   * compiled to `dist` — the second is the cleaner long-term fix and is a
   * repo-wide change, not TASK-006's to make.
   *
   * Build configuration only: no domain logic, no rewrites.
   */
  transpilePackages: [
    "@name-atlas/contracts",
    "@name-atlas/db",
    "@name-atlas/domain",
    "@name-atlas/resolver",
    "@name-atlas/sources",
    "@name-atlas/truth",
  ],
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias as Record<string, string[]> | undefined),
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
