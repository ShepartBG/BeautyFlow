import { test, expect, Browser, Page } from "@playwright/test";
import { settle, watchPage } from "./helpers";

const ownerEmail = process.env.TEST_OWNER_EMAIL?.trim() || "";
const ownerPassword = process.env.TEST_OWNER_PASSWORD || "";
const newAdminPassword = process.env.TEST_NEW_ADMIN_PASSWORD || "";

async function login(page: Page, email: string, password: string, target: RegExp) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /^Вход$/ }).click();
  await page.waitForURL(target, { timeout: 25_000 });
}

async function freshPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}

test("A-Z: access request -> Owner approval -> new admin onboarding -> admin CRUD -> cleanup", async ({ browser }) => {
  test.setTimeout(150_000);
  expect(ownerEmail, "Добави TEST_OWNER_EMAIL в .env.test.local").not.toBe("");
  expect(ownerPassword, "Добави TEST_OWNER_PASSWORD в .env.test.local").not.toBe("");
  expect(newAdminPassword, "Добави TEST_NEW_ADMIN_PASSWORD в .env.test.local (само локална E2E парола)").not.toBe("");

  const stamp = Date.now().toString();
  const email = `beautyflow-e2e-${stamp}@example.com`;
  const business = `BeautyFlow E2E ${stamp.slice(-6)}`;
  const service = `E2E услуга ${stamp.slice(-5)}`;

  // 1) Completely public visitor submits a real access request through the UI.
  const publicSide = await freshPage(browser);
  const publicErrors = watchPage(publicSide.page);
  await publicSide.page.goto("/register-salon");
  await settle(publicSide.page);
  const form = publicSide.page.locator("form");
  await form.locator('[name="ownerName"]').fill("Иван Петров");
  await form.locator('[name="email"]').fill(email);
  await form.locator('[name="phone"]').fill(`088${stamp.slice(-7)}`);
  await form.locator('[name="businessName"]').fill(business);
  await form.locator('[name="category"]').selectOption({ index: 1 });
  await form.locator('[name="city"]').fill("Козлодуй");
  await form.locator('[name="message"]').fill("Автоматичен BeautyFlow A-Z release тест.");
  const challenge = await form.locator(".bf-human-check label").innerText();
  const m = challenge.match(/(\d+)\s*\+\s*(\d+)/);
  expect(m, "Не намерих math challenge").toBeTruthy();
  await publicSide.page.waitForTimeout(1900);
  await form.locator('[name="mathAnswer"]').fill(String(Number(m![1]) + Number(m![2])));
  const accessResponse = publicSide.page.waitForResponse(r => r.url().endsWith("/api/access-request") && r.request().method() === "POST");
  await form.getByRole("button", { name: "Изпрати заявка" }).click();
  expect((await accessResponse).ok()).toBeTruthy();
  await expect(publicSide.page.getByText(/Заявката е изпратена успешно|Заявката е записана/)).toBeVisible();
  await publicErrors();
  await publicSide.context.close();

  // 2) Platform Owner sees and approves exactly that request.
  const ownerSide = await freshPage(browser);
  await login(ownerSide.page, ownerEmail, ownerPassword, /\/owner(?:\/|$)/);
  await ownerSide.page.goto("/owner/requests");
  await settle(ownerSide.page);
  const card = ownerSide.page.locator(".request-card").filter({ hasText: email });
  await expect(card).toBeVisible();
  await expect(card).toContainText(business);
  ownerSide.page.once("dialog", d => d.accept());
  const approveResponse = ownerSide.page.waitForResponse(r => r.url().endsWith("/api/owner/request-decision") && r.request().method() === "POST");
  await card.getByRole("button", { name: /Одобри/ }).click();
  expect((await approveResponse).ok()).toBeTruthy();
  await expect(card).toContainText(/Активна|active/i);

  // 3) Newly approved business owner can log in and reaches Admin.
  const adminSide = await freshPage(browser);
  await login(adminSide.page, email, newAdminPassword, /\/admin(?:\/|$)/);
  await expect(adminSide.page.locator("body")).toContainText(business);

  // 4) Onboarding/settings can be saved and public profile data remains valid.
  await adminSide.page.goto("/admin/settings");
  await settle(adminSide.page);
  const settings = adminSide.page.locator("form").first();
  await expect(settings.locator('[name="name"]')).toHaveValue(business);
  await settings.locator('[name="address"]').fill("E2E тест адрес 1");
  await settings.locator('[name="description"]').fill("E2E профил за пълен автоматизиран тест.");
  await settings.getByRole("button", { name: "Запази всички настройки" }).click();
  await expect(settings.getByText(/запазени/i)).toBeVisible();

  // 5) Service CRUD: create -> hide -> activate -> delete.
  await adminSide.page.goto("/admin/services");
  await settle(adminSide.page);
  const serviceForm = adminSide.page.locator("form").first();
  await serviceForm.locator('[name="name"]').fill(service);
  await serviceForm.locator('[name="price"]').fill("25");
  await serviceForm.locator('[name="duration"]').fill("30");
  await serviceForm.getByRole("button", { name: "Добави", exact: true }).click();
  const row = adminSide.page.locator(".bf-service-manage-row").filter({ hasText: service });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Активна" }).click();
  await expect(row.getByRole("button", { name: "Скрита" })).toBeVisible();
  await row.getByRole("button", { name: "Скрита" }).click();
  await expect(row.getByRole("button", { name: "Активна" })).toBeVisible();
  adminSide.page.once("dialog", d => d.accept());
  await row.locator("button.danger").click();
  await expect(adminSide.page.locator(".bf-service-manage-row").filter({ hasText: service })).toHaveCount(0);

  // 6) Schedule can be persisted.
  await adminSide.page.goto("/admin/schedule");
  await settle(adminSide.page);
  const monday = adminSide.page.locator(".hours-row").filter({ hasText: "Понеделник" });
  await expect(monday).toBeVisible();
  await monday.getByRole("button", { name: "Запази" }).click();
  await adminSide.context.close();

  // 7) Owner cleanup removes the E2E request and its linked business/user data path.
  await ownerSide.page.goto("/owner/requests");
  await settle(ownerSide.page);
  const cleanupCard = ownerSide.page.locator(".request-card").filter({ hasText: email });
  await expect(cleanupCard).toBeVisible();
  ownerSide.page.once("dialog", d => d.accept());
  const deleteResponse = ownerSide.page.waitForResponse(r => r.url().endsWith("/api/owner/business-action") && r.request().method() === "POST");
  await cleanupCard.getByRole("button", { name: /Изтрий/ }).click();
  expect((await deleteResponse).ok()).toBeTruthy();
  await expect(ownerSide.page.locator(".request-card").filter({ hasText: email })).toHaveCount(0);
  await ownerSide.context.close();
});
