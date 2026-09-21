import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import AdminHomePage from "./page.js";
import { inspectorEnabled } from "../lib/inspect.js";

/**
 * TASK-018 AC-1 and AC-8. The gate is the security-relevant part: an
 * unauthenticated console over internal evidence must not answer by default.
 */

const KEY = "ADMIN_INSPECTOR_ENABLED";

afterEach(() => {
  delete process.env[KEY];
});

async function render(params: Record<string, string> = {}): Promise<string> {
  const element = await AdminHomePage({ searchParams: Promise.resolve(params) });
  return renderToStaticMarkup(element);
}

describe("inspectorEnabled", () => {
  it("is true only for the exact string", () => {
    expect(inspectorEnabled({})).toBe(false);
    expect(inspectorEnabled({ [KEY]: "true" })).toBe(true);
    expect(inspectorEnabled({ [KEY]: "TRUE" })).toBe(false);
    expect(inspectorEnabled({ [KEY]: "1" })).toBe(false);
    expect(inspectorEnabled({ [KEY]: "yes" })).toBe(false);
    expect(inspectorEnabled({ [KEY]: "" })).toBe(false);
  });
});

describe("AC-1: the page fails closed", () => {
  it("refuses without the flag, and queries nothing", async () => {
    // No DATABASE_URL is set in this test, so reaching a query at all would
    // throw. Rendering cleanly is itself the proof that none was attempted.
    const markup = await render({ surname: "NOWAK" });
    expect(markup).toContain("Disabled");
    expect(markup).toContain("ADMIN_INSPECTOR_ENABLED=true");
    // The refusal explains the real gap rather than implying the flag is auth.
    expect(markup).toContain("§6");
    expect(markup).toMatch(/not authentication/u);
    // And no result shape leaked.
    expect(markup).not.toContain("Identity");
    expect(markup).not.toContain("Claims");
  });

  it("renders a valid element either way", async () => {
    expect(typeof (await render())).toBe("string");
    process.env[KEY] = "true";
    expect(typeof (await render())).toBe("string");
  });
});

describe("AC-8: with the flag set, the form renders server-side", () => {
  it("shows the search form and the no-authentication banner", async () => {
    process.env[KEY] = "true";
    const markup = await render();
    expect(markup).toContain('method="get"');
    expect(markup).toContain('name="surname"');
    expect(markup).toContain("Read-only");
    expect(markup).toMatch(/must not be exposed to a network/u);
    // No client bundle is implied by this page: no event handler attributes.
    expect(markup).not.toMatch(/onclick|onchange|onsubmit/iu);
  });
});
