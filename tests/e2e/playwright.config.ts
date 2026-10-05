import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests over the built site (TASK-103): `next start` on the
 * production build, against a database seeded by `seed.sh` from the committed
 * fixtures. `pnpm build` must have run first; CI runs this after its Build step.
 *
 * `PLAYWRIGHT_CHROMIUM` points at a Chromium that is already installed (a
 * Claude Code web session has one at /opt/pw-browsers/chromium); without it,
 * Playwright uses the browser `playwright install chromium` downloaded.
 */
const PORT = Number(process.env.E2E_PORT ?? "3100");
const executablePath = process.env.PLAYWRIGHT_CHROMIUM;

export default defineConfig({
  testDir: "specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "phone", use: { ...devices["Pixel 7"], browserName: "chromium" } },
  ],
  webServer: {
    command: `pnpm --filter web exec next start -p ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}/pl/nazwisko/nowak`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
