import { expect, Page, TestInfo } from "@playwright/test";

export function isOnline(baseURL?: string) {
  const host = new URL(baseURL || "http://127.0.0.1:3000").hostname;
  return host !== "localhost" && host !== "127.0.0.1" && host !== "::1" && host !== "[::1]";
}

export function customerEmail(baseURL: string | undefined, fallback: string) {
  if (!isOnline(baseURL)) return fallback;
  const email = process.env.TEST_CUSTOMER_EMAIL?.trim() || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /@(example\.(com|org|net)|[^@]+\.invalid)$/i.test(email)) {
    throw new Error("За онлайн тест добави TEST_CUSTOMER_EMAIL с реална твоя поща в .env.test.local.");
  }
  return email;
}

export function requireVisibleOnlineBrowser(baseURL: string | undefined, info: TestInfo) {
  if (isOnline(baseURL) && info.project.use.headless !== false) {
    throw new Error("Онлайн записването изисква --headed, за да въведеш реалния код от имейла.");
  }
}

export async function enterBookingCode(page: Page, baseURL: string | undefined, response: { testCode?: string }) {
  const input = page.locator(".bf-booking-code-card input");
  await expect(input).toBeVisible();
  if (!isOnline(baseURL)) {
    expect(String(response.testCode || ""), "Локалният E2E режим не върна testCode.").toMatch(/^[0-9]{6}$/);
    await input.fill(String(response.testCode));
  } else {
    expect(response.testCode, "Публичният сайт не трябва да връща тестов код.").toBeUndefined();
    console.log("\nОНЛАЙН ТЕСТ: отвори TEST_CUSTOMER_EMAIL и въведи получения 6-цифрен код в браузъра. Не натискай потвърждение — тестът ще продължи сам. Изчакване: 3 минути.\n");
    await expect.poll(() => input.inputValue(), {
      timeout: 180_000,
      message: "Не беше въведен 6-цифрен код от реалния имейл за 3 минути.",
    }).toMatch(/^[0-9]{6}$/);
  }
}
