import { test, expect } from "@playwright/test";
import { settle, watchPage } from "./helpers";

const publicRoutes = [
  "/",
  "/about",
  "/contact",
  "/cookies",
  "/discover",
  "/forgot-password",
  "/how-it-works",
  "/login",
  "/privacy",
  "/register-salon",
  "/salons",
  "/specialists",
  "/terms",
];

for (const route of publicRoutes) {
  test(`public ${route}`, async ({ page }) => {
    const verify = watchPage(page);
    const response = await page.goto(route);
    expect(response?.status(), `${route} returned bad status`).toBeLessThan(500);
    await settle(page);
    await verify();
  });
}

test("first public salon opens without runtime errors", async ({ page }) => {
  const verify = watchPage(page);
  await page.goto("/salons");
  await settle(page);

  const hrefs = await page.locator('a[href^="/salon/"]').evaluateAll((els) =>
    els.map((e) => (e as HTMLAnchorElement).getAttribute("href") || "")
  );
  const href = hrefs.find((x) => x && x !== "/salon/demo");

  if (href) {
    const response = await page.goto(href);
    expect(response?.status()).toBeLessThan(500);
    await settle(page);
    await expect(page.getByText("Запази час")).toBeVisible();
  }

  await verify();
});
