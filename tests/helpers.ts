import { expect, Page } from "@playwright/test";

export function watchPage(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const badResponses: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("response", (response) => {
    const status = response.status();
    if (status >= 500 || status === 401 || status === 403) {
      badResponses.push(`${status} ${response.request().method()} ${response.url()}`);
    }
  });

  return async () => {
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
    expect(pageErrors, `Client-side exceptions:\n${pageErrors.join("\n")}`).toEqual([]);
    expect(badResponses, `Bad HTTP responses:\n${badResponses.join("\n")}`).toEqual([]);

    const meaningful = consoleErrors.filter(
      (x) =>
        !x.includes("preloaded using link preload") &&
        !x.includes("favicon.ico") &&
        !x.includes("Failed to load resource: the server responded with a status of 401") &&
        !x.includes("Failed to load resource: the server responded with a status of 403")
    );
    expect(meaningful, `console.error output:\n${meaningful.join("\n")}`).toEqual([]);
  };
}

export async function acceptCookies(page: Page) {
  const buttons = [
    page.getByRole("button", { name: /приемам/i }),
    page.getByRole("button", { name: /приеми/i }),
    page.getByRole("button", { name: /разбрах/i }),
    page.getByRole("button", { name: /accept/i }),
  ];

  for (const button of buttons) {
    if (await button.first().isVisible().catch(() => false)) {
      await button.first().click();
      await page.waitForTimeout(200);
      return;
    }
  }
}

export async function settle(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1300);
  await acceptCookies(page);
}
