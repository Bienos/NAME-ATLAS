import { expect, test } from "@playwright/test";

/**
 * The reader's journey on the built site (TASK-103): search, the surname page,
 * the deck of cards, a card's share image, and a surname that is not in the
 * register. The database is `seed.sh`'s: the committed PESEL fixtures, and
 * NOWAK's well-known bearers from the pinned Wikidata answer, names rewritten.
 */

test("a search for a surname opens its page with the deck", async ({ page }) => {
  await page.goto("/");
  await page.locator("#surname").fill("Nowak");
  await page.locator("#surname").press("Enter");
  await expect(page).toHaveURL(/\/pl\/nazwisko\/nowak\?view=cards$/u);
  await expect(page.getByRole("dialog", { name: /NOWAK/u })).toBeVisible();
});

test("the surname page shows the count and the well-known bearers, without sideways scroll", async ({
  page,
}) => {
  await page.goto("/pl/nazwisko/nowak");
  await expect(page.locator("#today-count")).toBeVisible();
  const bearers = page.locator("#bearers");
  await expect(bearers).toContainText("Wikidane wymieniają 59 osób o nazwisku NOWAK");
  await expect(bearers).toContainText("To samo nazwisko nie oznacza pokrewieństwa");
  await expect(bearers.locator(".bearer")).toHaveCount(3);
  await expect(bearers.locator(".bearer").first()).toContainText("Stanisław Nowak");
  await expect(bearers).toContainText("Świat · Wikidata");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("the deck holds the well-known bearers' card and moves card by card", async ({ page }) => {
  await page.goto("/pl/nazwisko/nowak?view=cards");
  const deck = page.getByRole("dialog", { name: /NOWAK/u });
  await expect(deck).toBeVisible();
  // Every card is in the deck, the hidden ones too; their labels read "N z M: title".
  await expect(deck.locator('.dk-card[aria-label$=": Znane osoby"]')).toHaveCount(1);
  const active = deck.locator(".dk-card.is-active");
  const first = await active.getAttribute("aria-label");
  await page.keyboard.press("ArrowRight");
  await expect(active).not.toHaveAttribute("aria-label", first ?? "");
  // The next-card button walks on to the bearers' card, on a phone as on a desktop.
  const next = deck.getByRole("button", { name: "Następna karta" });
  for (let i = 0; i < 20; i++) {
    if (((await active.getAttribute("aria-label")) ?? "").endsWith(": Znane osoby")) break;
    await next.click();
  }
  await expect(active).toHaveAttribute("aria-label", /: Znane osoby$/u);
  await expect(active).toContainText("Stanisław Nowak");
  await expect(active).toContainText("To samo nazwisko nie oznacza pokrewieństwa");
  await deck.getByRole("button", { name: /Cała strona/u }).click();
  await expect(deck).toBeHidden();
});

test("a card's share image is drawn as a PNG", async ({ request }) => {
  const response = await request.get("/pl/nazwisko/nowak/karta/summary");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
  expect((await response.body()).subarray(1, 4).toString("ascii")).toBe("PNG");
});

test("a surname that is not in the register is said to be not found, with no figures", async ({
  page,
}) => {
  await page.goto("/?surname=Zzyzx");
  await expect(page.locator("#today-count")).toHaveCount(0);
  await expect(page.locator("#bearers")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Nie znaleziono takiego nazwiska" }),
  ).toBeVisible();
});
