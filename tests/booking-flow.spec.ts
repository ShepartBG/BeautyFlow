import { test, expect } from "@playwright/test";
import { settle, watchPage } from "./helpers";

test("public booking flow reaches a selectable real slot", async ({ page }) => {
  const slug = process.env.TEST_SALON_SLUG?.trim();
  if (!slug) {
    throw new Error(
      "Добави TEST_SALON_SLUG в .env.test.local (примерно slug-а на твоя тестов BeautyFlow салон)."
    );
  }

  const verify = watchPage(page);
  await page.goto(`/salon/${encodeURIComponent(slug)}`);
  await settle(page);

  const service = page.locator('select').first();
  await expect(service).toBeVisible();
  const options = await service.locator('option').count();
  expect(options, "Няма активна услуга за тест.").toBeGreaterThan(1);
  await service.selectOption({ index: 1 });

  let availableDay = page.locator(".booking-calendar-grid button.day-available:not([disabled])").first();
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(900);
    if (await availableDay.isVisible().catch(() => false)) break;
    const next = page.locator(".booking-calendar-head button").last();
    if (!(await next.isEnabled().catch(() => false))) break;
    await next.click();
  }

  await expect(
    availableDay,
    "Не беше намерен ден със свободни часове за първата активна услуга."
  ).toBeVisible();
  await availableDay.click();

  const freeSlot = page.locator(".timeline-grid button.available:not([disabled])").first();
  await expect(freeSlot, "Не беше намерен реален свободен час.").toBeVisible({ timeout: 12_000 });
  await freeSlot.click();

  await expect(page.locator('input[name="customerName"]')).toBeVisible();
  await expect(page.locator('input[name="customerPhone"]')).toBeVisible();
  await expect(page.locator('input[name="acceptedTerms"]')).toBeVisible();

  // Не натискаме финалния бутон, за да не създаваме излишна резервация в safe теста.
  await verify();
});
