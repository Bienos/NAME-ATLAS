import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The workspace packages ship TypeScript source written as ES modules, so
    // their relative imports name the emitted `.js` file (`./lookup.js`) while
    // the file on disk is `.ts`. tsc, tsx and Vitest map this themselves; the
    // bundler needs to be told. Turbopack (the Next 16 default) has no
    // equivalent option, which is why this app runs `next dev --webpack` and
    // `next build --webpack`.
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
    },
  },
  // `next dev` otherwise writes its own AGENTS.md/CLAUDE.md into this app.
  // The repository keeps one set of agent rules, at its root.
  agentRules: false,
};

export default nextConfig;
