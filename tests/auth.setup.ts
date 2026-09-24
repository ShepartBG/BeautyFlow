import { expect, test as setup } from "@playwright/test";
import fs from "node:fs";

const authFile = "playwright/.auth/admin.json";

setup("authenticate BeautyFlow business admin", async ({ page }) => {
  const email = process.env.TEST_ADMIN_EMAIL?.trim() || "";
  const password = process.env.TEST_ADMIN_PASSWORD || "";

  if (!email || !password) {
    throw new Error("Липсват TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD в .env.test.local");
  }

  fs.mkdirSync("playwright/.auth", { recursive: true });

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /^Вход$/ }).click();

  await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 25_000 });
  await expect(page.locator("body")).not.toContainText("Невалиден email или парола");
  await page.context().storageState({ path: authFile });
});
