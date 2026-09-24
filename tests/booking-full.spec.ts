import { test, expect, Page } from "@playwright/test";
import { settle, watchPage } from "./helpers";

const MONTHS: Record<string, number> = {
  "Януари": 1, "Февруари": 2, "Март": 3, "Април": 4,
  "Май": 5, "Юни": 6, "Юли": 7, "Август": 8,
  "Септември": 9, "Октомври": 10, "Ноември": 11, "Декември": 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

async function selectedBookingDate(page: Page): Promise<string> {
  const heading = ((await page.locator(".booking-calendar-head strong").textContent()) || "").trim();
  const [monthName, yearRaw] = heading.split(/\s+/);
  const month = MONTHS[monthName], year = Number(yearRaw);
  const day = Number(((await page.locator(".booking-calendar-grid button.selected span").first().textContent()) || "").trim());
  if (!year || !month || !day) throw new Error(`Не успях да разчета избраната дата: ${heading}`);
  return `${year}-${pad(month)}-${pad(day)}`;
}

async function chooseAdminDate(page: Page, iso: string) {
  const [targetYear, targetMonth, targetDay] = iso.split("-").map(Number);
  const trigger = page.locator(".admin-date-trigger");
  await expect(trigger).toBeVisible({ timeout: 12000 });
  await trigger.click();
  const headingLocator = page.locator(".admin-date-head strong");
  await expect(headingLocator).toBeVisible({ timeout: 12000 });

  for (let i = 0; i < 30; i++) {
    const heading = ((await headingLocator.textContent()) || "").trim();
    const [monthName, yearRaw] = heading.split(/\s+/);
    const currentMonth = MONTHS[monthName], currentYear = Number(yearRaw);
    if (!currentMonth || !currentYear) throw new Error(`Не успях да разчета месеца: ${heading}`);
    if (currentYear === targetYear && currentMonth === targetMonth) break;
    const currentIndex = currentYear * 12 + currentMonth;
    const targetIndex = targetYear * 12 + targetMonth;
    const buttons = page.locator(".admin-date-head button");
    await (targetIndex > currentIndex ? buttons.last() : buttons.first()).click();
  }

  const dayButton = page.locator(".admin-date-grid button").filter({
    has: page.locator("b", { hasText: new RegExp(`^${targetDay}$`) }),
  }).first();
  await expect(dayButton, `Не намерих ${iso} в админ календара.`).toBeVisible({ timeout: 12000 });
  await dayButton.click();
  await page.waitForTimeout(900);
}

test("real booking -> admin verification -> delete -> slot is free again", async ({ page }) => {
  const slug = process.env.TEST_SALON_SLUG?.trim();
  if (!slug) throw new Error("Добави TEST_SALON_SLUG в .env.test.local");
  const verify = watchPage(page);

  const stamp = Date.now().toString();
  const customerName = `E2E BeautyFlow ${stamp.slice(-6)}`;
  const customerPhone = `089${stamp.slice(-7)}`;
  const customerEmail = `e2e-${stamp}@example.com`;
  const note = `AUTOMATED E2E TEST ${stamp}`;

  await page.goto(`/salon/${encodeURIComponent(slug)}`);
  await settle(page);

  const serviceSelect = page.locator(".booking-box form select").first();
  await expect(serviceSelect).toBeVisible();
  expect(await serviceSelect.locator("option").count(), "Няма активна услуга за E2E тест.").toBeGreaterThan(1);
  await serviceSelect.selectOption({ index: 1 });
  const selectedServiceText = ((await serviceSelect.locator("option:checked").textContent()) || "").trim();
  const serviceName = selectedServiceText.split("·")[0].trim();

  let availableDay = page.locator(".booking-calendar-grid button.day-available:not([disabled])").first();
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(900);
    if (await availableDay.isVisible().catch(() => false)) break;
    const next = page.locator(".booking-calendar-head button").last();
    if (!(await next.isEnabled().catch(() => false))) break;
    await next.click();
  }
  await expect(availableDay, "Не беше намерен свободен работен ден в следващите 6 месеца.").toBeVisible();
  await availableDay.click();
  const appointmentDate = await selectedBookingDate(page);

  const freeSlot = page.locator(".timeline-grid button.available:not([disabled])").first();
  await expect(freeSlot, "Не беше намерен свободен час.").toBeVisible({ timeout: 15000 });
  const appointmentTime = ((await freeSlot.locator("b").textContent()) || "").trim();
  await freeSlot.click();

  await page.locator('input[name="customerName"]').fill(customerName);
  await page.locator('input[name="customerPhone"]').fill(customerPhone);
  await page.locator('input[name="customerEmail"]').fill(customerEmail);
  await page.locator('textarea[name="note"]').fill(note);
  await page.locator('input[name="acceptedTerms"]').check();

  const codeResponsePromise = page.waitForResponse(r => r.url().includes("/api/public/booking-code") && r.request().method() === "POST");
  await page.getByRole("button", { name: /Запиши час/i }).click();
  const codeResponse = await codeResponsePromise;
  expect(codeResponse.status(), "booking-code API не върна 200").toBe(200);
  const codeJson = await codeResponse.json();
  expect(codeJson.verificationId, "Липсва verificationId").toBeTruthy();
  const testCode = String(codeJson.testCode || "");
  expect(testCode, "Локалният E2E режим не върна testCode.").toMatch(/^[0-9]{6}$/);

  const codeInput = page.locator(".bf-booking-code-card input");
  const confirmCodeButton = page.getByTestId("confirm-booking-code");
  await expect(codeInput).toBeVisible();
  await codeInput.fill(testCode);
  await expect(codeInput).toHaveValue(testCode);
  await expect(confirmCodeButton).toBeEnabled();

  const bookResponsePromise = page.waitForResponse(r => r.url().endsWith("/api/public/book") && r.request().method() === "POST");
  await confirmCodeButton.click();
  const bookResponse = await bookResponsePromise;
  const bookJson = await bookResponse.json().catch(() => ({}));
  expect(bookResponse.status(), `book API: ${JSON.stringify(bookJson)}`).toBe(200);
  expect(bookJson.ok).toBe(true);
  expect(bookJson.appointmentId, "API не върна appointmentId").toBeTruthy();

  await expect(page.locator(".booking-success")).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".booking-success")).toContainText(serviceName);
  await expect(page.locator(".booking-success")).toContainText(appointmentTime);

  await page.goto("/admin/bookings");
  await settle(page);
  await chooseAdminDate(page, appointmentDate);

  const row = page.locator(".booking-row").filter({ hasText: customerName }).first();
  await expect(row, "Новото записване не се появи в Админ → Записвания.").toBeVisible({ timeout: 12000 });
  await expect(row).toContainText(serviceName);
  await expect(row).toContainText(appointmentTime);
  await expect(row).toContainText(customerPhone);
  await expect(row).toContainText("Подробности");

  await page.goto("/admin/calendar");
  await settle(page);
  await chooseAdminDate(page, appointmentDate);

  const calendarAppointment = page.locator(".calendar-appointment").filter({ hasText: customerName }).first();
  await expect(calendarAppointment, "Новото записване не се появи в Админ → Календар.").toBeVisible({ timeout: 12000 });
  await expect(calendarAppointment).toContainText(serviceName);
  await expect(calendarAppointment).toContainText(appointmentTime);

  page.once("dialog", async dialog => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await calendarAppointment.getByRole("button", { name: "Изтрий часа" }).click();
  await expect(calendarAppointment).toHaveCount(0, { timeout: 12000 });

  await page.goto(`/salon/${encodeURIComponent(slug)}`);
  await settle(page);
  const serviceAgain = page.locator(".booking-box form select").first();
  await serviceAgain.selectOption({ index: 1 });

  const [targetYear, targetMonth, targetDay] = appointmentDate.split("-").map(Number);
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(400);
    const heading = ((await page.locator(".booking-calendar-head strong").textContent()) || "").trim();
    const [monthName, yearRaw] = heading.split(/\s+/);
    const currentMonth = MONTHS[monthName], currentYear = Number(yearRaw);
    if (!currentMonth || !currentYear) throw new Error(`Не успях да разчета публичния календар: ${heading}`);
    if (currentYear === targetYear && currentMonth === targetMonth) break;
    const currentIndex = currentYear * 12 + currentMonth;
    const targetIndex = targetYear * 12 + targetMonth;
    const buttons = page.locator(".booking-calendar-head button");
    await (targetIndex > currentIndex ? buttons.last() : buttons.first()).click();
  }

  const targetDayButton = page.locator(".booking-calendar-grid button").filter({
    has: page.locator("span", { hasText: new RegExp(`^${targetDay}$`) }),
  }).first();
  await expect(targetDayButton).toBeEnabled();
  await targetDayButton.click();

  const restoredSlot = page.locator(".timeline-grid button.available").filter({
    has: page.locator("b", { hasText: new RegExp(`^${appointmentTime}$`) }),
  }).first();
  await expect(restoredSlot, "След изтриването часът не се освободи отново за клиента.").toBeVisible({ timeout: 15000 });

  await verify();
});
