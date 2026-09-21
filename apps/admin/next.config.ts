import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The same build configuration `apps/web` carries, for the same reason and
   * under the same decision (**D-012**).
   *
   * The admin app grew workspace dependencies with TASK-018's inspector. Those
   * packages are consumed as TypeScript source and their internal imports carry
   * explicit `.js` extensions, so the bundler needs `extensionAlias` to learn
   * TypeScript's rule that a `.js` specifier may be satisfied by a `.ts` file.
   * `extensionAlias` is a webpack option with no Turbopack equivalent, so `dev`
   * and `build` pass `--webpack` (see package.json). Verified by running: a bare
   * `next build` on Turbopack failed `module-not-found` across every workspace
   * import here, exactly as `apps/web`'s note records.
   *
   * Do not add `turbopack: {}` to silence Next's guard about the `webpack` key:
   * that makes Turbopack the default builder and the build then fails.
   *
   * Build configuration only: no domain logic, no rewrites.
   */
  transpilePackages: [
    "@name-atlas/db",
    "@name-atlas/domain",
    "@name-atlas/logging",
    "@name-atlas/resolver",
    "@name-atlas/sources",
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
