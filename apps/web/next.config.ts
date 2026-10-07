import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security-headers";

/**
 * pdfkit's built-in fonts as `require` loads them (`#standard-fonts/*` →
 * `js/standard-fonts/*.cjs`, and the `chunks/` they require), from the
 * workspace's store, any version.
 */
const PDFKIT_STANDARD_FONTS =
  "../../node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/standard-fonts/**/*.cjs";

const nextConfig: NextConfig = {
  /**
   * The workspace packages are consumed as TypeScript source — each exports
   * `./src/index.ts` — and their internal imports carry explicit `.js`
   * extensions, which keeps emitted JavaScript runnable by plain Node under
   * `type: module`. Note that `tsconfig.base.json` sets
   * `moduleResolution: "Bundler"`, under which TypeScript does not *require*
   * those extensions; the convention is about portability of emitted output,
   * not about satisfying the type checker. (An earlier version of this
   * comment attributed it to NodeNext resolution, which the repo does not
   * use. Corrected 2026-09-19.)
   *
   * `transpilePackages` makes Next compile them with its own pipeline, and
   * `extensionAlias` teaches the bundler TypeScript's rule that a `.js`
   * specifier may be satisfied by a `.ts` file. Without the alias every
   * internal import inside those packages fails to resolve.
   *
   * `extensionAlias` is a webpack option and Turbopack has no equivalent, so
   * `dev` and `build` pass `--webpack` (see package.json). Verified by running
   * on 2026-09-19: `next build --turbopack` fails `module-not-found` across
   * `packages/truth` and `packages/db`, and neither `turbopack.resolveAlias`
   * (bare specifiers only) nor `turbopack.resolveExtensions` (extensionless
   * imports only) addresses an explicit `./x.js` request.
   *
   * Because a `webpack` key is present and no `turbopack` key is, Next 16
   * refuses a *bare* `next build` with a guard error and asks for an explicit
   * flag. The scripts always pass `--webpack`, so this only bites someone
   * running the bare command. Do not add `turbopack: {}` to silence it: that
   * makes Turbopack the default builder and the build then fails as above.
   *
   * The options and a recommendation are recorded as **D-012** in
   * `docs/DECISIONS_NEEDED.md`. Do not change this block without that
   * decision.
   *
   * Build configuration only: no surname logic, no rewrites.
   */
  transpilePackages: [
    "@name-atlas/accounts",
    "@name-atlas/contracts",
    "@name-atlas/db",
    "@name-atlas/domain",
    "@name-atlas/logging",
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
  /**
   * The share card reads its fonts from `assets/fonts/` at run time
   * (`src/lib/og-card.tsx`), by a path the build's file tracing does not
   * follow, so a deployment would leave them out and the card would fall back
   * to Geist. Verified 2026-09-24: with the four TTFs present, neither
   * `opengraph-image` route's trace listed a file from `assets/` until this was
   * added. Keys are picomatch globs over the route, where `[slug]` would be a
   * character class, hence the wildcard.
   */
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/fonts/*.ttf"],
    "/**/opengraph-image": ["./assets/fonts/*.ttf"],
    // The share cards (TASK-056) read the same files.
    "/pl/nazwisko/**/karta/**": ["./assets/fonts/*.ttf"],
    "/en/surname/**/card/**": ["./assets/fonts/*.ttf"],
    // The report as a PDF (TASK-172) embeds the same files. pdfkit, under
    // `@react-pdf/renderer`, loads its built-in Helvetica whenever it opens a
    // document, through `require("#standard-fonts/…")`, which resolves to the
    // `.cjs` files; the trace follows only the `.mjs` ones. Without these, the
    // route answered 500 on Vercel ("Cannot find module …/Helvetica.cjs").
    "/pl/przykladowy-raport.pdf": ["./assets/fonts/*.ttf", PDFKIT_STANDARD_FONTS],
    "/en/sample-report.pdf": ["./assets/fonts/*.ttf", PDFKIT_STANDARD_FONTS],
    // The blog (TASK-071) reads its posts from `src/content/blog/` at run time.
    "/pl/blog": ["./src/content/blog/*.md"],
    "/en/blog": ["./src/content/blog/*.md"],
    "/pl/blog/**": ["./src/content/blog/*.md"],
    "/en/blog/**": ["./src/content/blog/*.md"],
    "/sitemap.xml": ["./src/content/blog/*.md"],
    "/sitemap-blog.xml": ["./src/content/blog/*.md"],
  },
  /** Keep shared links, including their surname path and query, on one public domain. */
  async redirects() {
    return ["nameatlas.pl", "www.nameatlas.pl", "www.name-atlas.pl"].map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://name-atlas.pl/:path*",
      permanent: true,
    }));
  },
  /**
   * The security headers (TASK-048) on every path: pages, the API and the share
   * cards. What each one is and why, and what is deliberately left out, is in
   * `src/lib/security-headers.ts`.
   */
  async headers() {
    return [{ source: "/:path*", headers: [...SECURITY_HEADERS] }];
  },
};

export default nextConfig;
