import { expect, test } from "@playwright/test";

/**
 * The family surnames view on the built site (TASK-169 §11): three surnames,
 * one of whose lookups fails, show two results and one error, and the address
 * never changes. The failure is the network's: the third request is aborted.
 */

test("three surnames with one failing show two results and one error", async ({ page }) => {
  await page.route(
    (url) =>
      url.pathname === "/api/v1/surname-results" && url.searchParams.get("surname") === "Kowalski",
    (route) => route.abort(),
  );
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/surname-results")) requests.push(r.url());
  });

  await page.goto("/pl/nazwiska-w-rodzinie");
  await page.getByRole("button", { name: "Dodaj nazwisko" }).click();
  await page.locator('input[name="surname-1"]').fill("Nowak");
  await page.locator('input[name="surname-2"]').fill("Wiśniewski");
  await page.locator('input[name="surname-3"]').fill("Kowalski");
  await page.getByRole("combobox").nth(1).selectOption("MOTHER");
  await page.getByRole("button", { name: "Pokaż wyniki" }).click();

  const cards = page.locator("article.family-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0).getByRole("heading", { name: "NOWAK" })).toBeVisible();
  await expect(cards.nth(1).getByRole("heading", { name: "WIŚNIEWSKI" })).toBeVisible();
  await expect(cards.nth(2)).toContainText("Usługa chwilowo niedostępna");
  await expect(cards.nth(2).getByRole("button", { name: "Spróbuj ponownie" })).toBeVisible();
  await expect(page.locator(".family-notice")).toBeVisible();

  expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe("/pl/nazwiska-w-rodzinie");
  expect(requests).toHaveLength(3);
  for (const url of requests) {
    expect([...new URL(url).searchParams.keys()]).toEqual(["surname"]);
    expect(url).not.toContain("MOTHER");
  }
});
