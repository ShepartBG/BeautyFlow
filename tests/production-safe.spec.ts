import { test, expect } from "@playwright/test";
import { settle, watchPage } from "./helpers";

const publicRoutes = [
  "/", "/about", "/contact", "/cookies", "/discover", "/forgot-password",
  "/how-it-works", "/login", "/privacy", "/register-salon", "/salons",
  "/specialists", "/terms",
];

for (const route of publicRoutes) {
  test(`production-safe ${route}`, async ({ page }) => {
    const verify = watchPage(page);
    const response = await page.goto(route);
    expect(response?.status(), `${route} returned bad status`).toBeLessThan(500);
    await settle(page);
    await expect(page.locator("body")).toBeVisible();
    await verify();
  });
}

test("production-safe first salon profile opens", async ({ page }) => {
  const verify = watchPage(page);
  await page.goto("/salons");
  await settle(page);
  const salonLink = page.locator('a[href^="/salon/"]').first();
  if (await salonLink.count()) {
    const href = await salonLink.getAttribute("href");
    expect(href).toBeTruthy();
    const response = await page.goto(href!);
    expect(response?.status()).toBeLessThan(500);
    await settle(page);
  }
  await verify();
});
