import { test, expect, devices, type Page } from "@playwright/test";
import { settle } from "./helpers";

// Read-only visual regression checks for the polish layer. No data is created or changed.

const publicRoutes = ["/", "/salons", "/specialists", "/discover", "/how-it-works", "/about", "/contact", "/register-salon", "/login", "/forgot-password", "/privacy", "/terms", "/cookies"];
const adminRoutes = ["/admin", "/admin/overview", "/admin/calendar", "/admin/bookings", "/admin/waitlist", "/admin/services", "/admin/staff", "/admin/customers", "/admin/schedule", "/admin/my-profile", "/admin/settings"];

// Phone emulation on Chromium (the iPhone preset would force WebKit and a new worker).
const { defaultBrowserType: _browser, ...phone } = devices["iPhone 13"];

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

function boxesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test.describe("typography", () => {
  test("pages render with the Manrope web font instead of Arial", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(family.toLowerCase()).toContain("manrope");
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => document.fonts.check('700 16px Manrope', "Контрол"));
    expect(loaded).toBe(true);
  });

  test("Bulgarian locale letterforms are switched off", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    const features = await page.evaluate(() => getComputedStyle(document.body).fontFeatureSettings);
    expect(features).toContain('"locl" 0');
  });
});

test.describe("phone layout", () => {
  test.use(phone);

  for (const route of [...publicRoutes, "/salon/beautyflow"]) {
    test(`no horizontal scroll on ${route}`, async ({ page }) => {
      await page.goto(route);
      await settle(page);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    });
  }

  for (const route of adminRoutes) {
    test(`no horizontal scroll on ${route}`, async ({ page }) => {
      await page.goto(route);
      await settle(page);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    });
  }

  test("home hero buttons stay on one line", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    const buttons = page.locator(".bf-v230-actions .bf-v230-btn");
    await expect(buttons).toHaveCount(2);
    for (const button of await buttons.all()) {
      // Count rendered text lines of the label: a wrapped label yields more than one line box.
      const lines = await button.locator("span").evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      });
      expect(lines).toBe(1);
    }
  });

  test("category arrows do not cover category names", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    const cards = page.locator(".bf-v230-category-copy");
    expect(await cards.count()).toBeGreaterThan(0);
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      const title = await card.locator("h3").boundingBox();
      const arrow = await card.locator("i").boundingBox();
      expect(boxesOverlap(title!, arrow!)).toBe(false);
    }
  });

  test("specialists search and filter fit the screen", async ({ page }) => {
    await page.goto("/specialists");
    await settle(page);
    const width = page.viewportSize()!.width;
    for (const selector of [".directory-search", ".bf-specialist-filter"]) {
      const box = await page.locator(selector).first().boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
  });
});

test.describe("admin team list", () => {
  for (const [name, device] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["phone", phone]] as const) {
    test.describe(name, () => {
      test.use(device);
      test("action buttons never cover the specialist name", async ({ page }) => {
        await page.goto("/admin/staff");
        await settle(page);
        const rows = page.locator(".bf-staff-manage > div").filter({ has: page.locator(".bf-staff-actions") });
        const count = await rows.count();
        test.skip(count === 0, "Тестовият салон няма служители освен собственика.");
        for (const row of await rows.all()) {
          // Compare the rectangles of the rendered text itself (element boxes can be narrower than overflowing text).
          const overlaps = await row.evaluate((el) => {
            const range = document.createRange();
            range.selectNodeContents(el.querySelector("section")!);
            const text = [...range.getClientRects()].filter((r) => r.width > 0);
            const buttons = [...el.querySelectorAll(".bf-staff-actions button")].map((b) => b.getBoundingClientRect());
            return text.some((t) => buttons.some((b) => t.left < b.right && b.left < t.right && t.top < b.bottom && b.top < t.bottom));
          });
          expect(overlaps).toBe(false);
        }
      });
    });
  }
});

test("file inputs use the styled picker button", async ({ page }) => {
  await page.goto("/admin/services");
  await settle(page);
  const input = page.locator('input[type="file"]').first();
  await expect(input).toBeAttached();
  const bg = await input.evaluate((el) => getComputedStyle(el, "::file-selector-button").backgroundImage);
  expect(bg).toContain("gradient");
});

test.describe("motion layer", () => {
  test("hero sparkles and the running strip never block clicks", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await expect(page.locator(".bfm-sparkles")).toHaveCSS("pointer-events", "none");
    await expect(page.locator(".bfm-marquee")).toHaveAttribute("aria-hidden", "true");
    // The main hero button is still the element that receives the click.
    const button = page.locator(".bf-v230-actions .bf-v230-btn").first();
    const box = (await button.boundingBox())!;
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest(".bf-v230-btn") !== null, [box.x + box.width / 2, box.y + box.height / 2]);
    expect(hit).toBe(true);
  });

  test("everything stands still when the visitor prefers reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await settle(page);
    await expect(page.locator(".bfm-marquee-track")).toHaveCSS("animation-name", "none");
    await expect(page.locator(".bf-real-phone-image")).toHaveCSS("animation-name", "none");
    const drawn = await page.locator(".bfm-sparkles").evaluate((c: HTMLCanvasElement) => c.width > 0 && c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data.some((v) => v !== 0));
    expect(drawn).toBe(false);
  });
});
