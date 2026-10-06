import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const css = readFileSync(path.join(HERE, "brand-system.css"), "utf8");

describe("Brand System v1", () => {
  it("keeps Atlas Blue as the semantic primary action and amber as a separate signal", () => {
    expect(css).toContain("--color-accent-primary: var(--atlas-blue-500)");
    expect(css).toContain("--color-signal-amber: var(--atlas-amber-500)");
  });

  it("has reduced-motion treatment", () => {
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("keeps the brand lab out of production", () => {
    const page = readFileSync(path.join(ROOT, "app", "dev", "brand", "page.tsx"), "utf8");
    expect(page).toContain('process.env.VERCEL_ENV === "production"');
    expect(page).toContain("notFound()");
  });
});
