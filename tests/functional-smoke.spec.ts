import { test, expect } from "@playwright/test";
import { settle, watchPage } from "./helpers";

async function openAdmin(page: any, route: string) {
  const response = await page.goto(route);
  expect(response?.status(), `${route} returned bad status`).toBeLessThan(500);
  await settle(page);
  expect(page.url()).not.toContain("/login");
}

test("services UI has working create controls", async ({ page }) => {
  const verify = watchPage(page);
  await openAdmin(page, "/admin/services");
  await expect(page.getByRole("heading", { name: "Какво предлагаш?" })).toBeVisible();
  await expect(page.locator('input[name="name"]')).toBeVisible();
  await expect(page.locator('input[name="price"]')).toBeVisible();
  await expect(page.locator('input[name="duration"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Добави", exact: true })).toBeVisible();
  await verify();
});

test("staff UI has invite and service assignment sections", async ({ page }) => {
  const verify = watchPage(page);
  await openAdmin(page, "/admin/staff");
  await expect(page.getByRole("heading", { name: "Специалисти" })).toBeVisible();
  await expect(page.locator('input[name="name"]')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.getByText("Кой какво извършва", { exact: true })).toBeVisible();
  await verify();
});

test("schedule UI exposes weekly hours and time-off controls", async ({ page }) => {
  const verify = watchPage(page);
  await openAdmin(page, "/admin/schedule");
  await expect(page.getByRole("heading", { name: "Седмично работно време" })).toBeVisible();
  await expect(page.getByText("Почивка за конкретна дата", { exact: true })).toBeVisible();
  await expect(page.getByText("Почивен ден / отпуск", { exact: true })).toBeVisible();
  await verify();
});

test("customers UI exposes regular and blacklist sections", async ({ page }) => {
  const verify = watchPage(page);
  await openAdmin(page, "/admin/customers");
  await expect(page.getByRole("heading", { name: "Клиенти" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Редовни" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Черен списък" })).toBeVisible();
  await verify();
});

test("business settings expose public profile and booking rules", async ({ page }) => {
  const verify = watchPage(page);
  await openAdmin(page, "/admin/settings");
  await expect(page.getByRole("heading", { name: "Настройки на бизнеса" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Публичен профил" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Правила за онлайн записване" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Запази всички настройки" })).toBeVisible();
  await verify();
});

test("specialist profile exposes editable profile fields", async ({ page }) => {
  const verify = watchPage(page);
  await openAdmin(page, "/admin/my-profile");
  await expect(page.getByRole("heading", { name: "Профил на специалист" })).toBeVisible();
  await expect(page.locator('input[name="name"]')).toBeVisible();
  await expect(page.locator('textarea[name="bio"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Запази профила" })).toBeVisible();
  await verify();
});

test("statistics page renders without runtime errors", async ({ page }) => {
  const verify = watchPage(page);
  await openAdmin(page, "/admin/stats");
  await expect(page.getByRole("heading", { name: "Статистика" })).toBeVisible();
  await verify();
});
