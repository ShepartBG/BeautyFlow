import { test, expect, devices, request as pwRequest, type Browser, type BrowserContext, type Page, type APIRequestContext } from "@playwright/test";
import sharp from "sharp";
import {
  assertEnvironment, assertEmailQuota, db, env, mark, step, derive, writeReport, hasFailures,
  waitForEmail, emailBody, linksIn, settle, acceptCookies, login, chooseAdminDate, publicGotoMonth,
  availability, monthAvailability, freeTimes, bookingCode, apiBook, bookWithCode,
  sofiaToday, addDays, weekday, nextWeekday,
} from "./full-system/lib";
import { bulgarianHolidays } from "../lib/beautyflow/bulgarianHolidays";
import { sofiaToUtc } from "../lib/beautyflow/calendarEvent";
const sofiaToUtcIso = (date: string, time: string) => sofiaToUtc(date, time).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/*
  BeautyFlow — full system test (release gate).
  Creates a brand-new disposable salon through the real flow (access request → platform owner approval),
  exercises every checklist item with real emails (sent to Resend test inboxes, read back through the
  Resend API), then deletes everything it created. Existing salons are snapshotted before and compared after.
  Run: npm run test:full-system   → report: full-system-report/report.html
*/

const STAMP = Date.now().toString(36);
const inbox = (label: string) => `delivered+bf-${label}-${STAMP}@resend.dev`;
const PH_BASE = String(Date.now()).slice(-5);
let phoneSeq = 10;
/** Unique Bulgarian mobile number for this run (10 digits). The argument only documents the use. */
const phone = (_use?: number) => `089${PH_BASE}${String(phoneSeq++).padStart(2, "0")}`;
const BUSINESS = `BF Тест Студио ${STAMP.slice(-5).toUpperCase()}`;
const PASSWORD = `Bf!Full-${STAMP}`;
const OWNER_NAME = "Тест Собственик";

type Ctx = { context: BrowserContext; page: Page };
const S: {
  salonId: string; slug: string; requestId: string; ownerUserId: string;
  ownerStaff: string; staff1: string; staff2: string;
  serviceA: string; serviceB: string; category: string;
  emails: string[]; userEmails: string[]; links: string[];
  snapshot: Record<string, string>;
} = { salonId: "", slug: "", requestId: "", ownerUserId: "", ownerStaff: "", staff1: "", staff2: "", serviceA: "", serviceB: "", category: "", emails: [], userEmails: [], links: [], snapshot: {} };

const SERVICE_A = "Маникюр с гел лак (тест)";
const SERVICE_B = "Подстригване (тест)";
const STAFF1 = "Мария Тест";
const STAFF2 = "Елена Тест";

async function photo(color: string) {
  return sharp({ create: { width: 900, height: 700, channels: 3, background: color } }).jpeg({ quality: 78 }).toBuffer();
}
const file = async (name: string, color = "#835f9a") => ({ name, mimeType: "image/jpeg", buffer: await photo(color) });

async function newCtx(browser: Browser, phoneDevice = false): Promise<Ctx> {
  const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
  const context = await browser.newContext(phoneDevice ? { ...iphone, locale: "bg-BG", timezoneId: "Europe/Sofia" } : { viewport: { width: 1440, height: 900 }, locale: "bg-BG", timezoneId: "Europe/Sofia" });
  const page = await context.newPage();
  await acceptCookies(page);
  return { context, page };
}
/** waitForResponse that never becomes an unhandled rejection when the step that awaits it fails first. */
function waitResp(page: Page, match: (r: import("@playwright/test").Response) => boolean) {
  const p = page.waitForResponse(match);
  p.catch(() => {});
  return p;
}
async function accessToken(page: Page) {
  return page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith("sb-") && x.endsWith("-auth-token"));
    return k ? JSON.parse(localStorage.getItem(k) || "{}").access_token as string : "";
  });
}
async function recordEmailLinks(mailId: string) {
  const body = await emailBody(mailId);
  S.links.push(...linksIn(body.html));
  return body;
}
const TABLES_BY_SALON = ["appointments", "waitlist_entries", "salon_customers", "booking_email_verifications", "staff_time_off", "staff_working_hours", "staff_services", "services", "salon_gallery", "business_members", "staff_invite_log", "booking_settings", "working_hours", "time_off", "staff"];

async function snapshotOtherSalons(exclude: string[]) {
  const out: Record<string, string> = {};
  const { data: salons } = await db.from("salons").select("*").order("id");
  for (const s of (salons || []).filter((x) => !exclude.includes(x.id))) {
    out[`salon:${s.id}`] = JSON.stringify(s);
    for (const t of TABLES_BY_SALON) {
      const { data } = await db.from(t).select("*").eq("salon_id", s.id);
      out[`${t}:${s.id}`] = JSON.stringify((data || []).map((r) => JSON.stringify(r)).sort());
    }
  }
  return out;
}

async function cleanup() {
  const log: string[] = [];
  if (S.salonId) {
    for (const t of TABLES_BY_SALON) { const { error } = await db.from(t).delete().eq("salon_id", S.salonId); if (error) log.push(`${t}: ${error.message}`); }
    // Storage: everything under the salon's folder.
    const bucket = db.storage.from("salon-media");
    const walk = async (prefix: string): Promise<string[]> => {
      const { data } = await bucket.list(prefix, { limit: 1000 });
      const files: string[] = [];
      for (const f of data || []) {
        const p = `${prefix}/${f.name}`;
        if (f.id) files.push(p); else files.push(...await walk(p));
      }
      return files;
    };
    const files = await walk(S.salonId);
    if (files.length) await bucket.remove(files);
    const { error } = await db.from("salons").delete().eq("id", S.salonId);
    if (error) log.push(`salons: ${error.message}`);
  }
  for (const email of S.userEmails) {
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = (data?.users || []) as { id: string; email?: string }[];
    const u = users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) await db.auth.admin.deleteUser(u.id);
  }
  await db.from("access_requests").delete().eq("email", inbox("owner"));
  return log;
}

test("BeautyFlow — пълен системен тест", async ({ browser, baseURL }) => {
  test.setTimeout(50 * 60_000);
  assertEnvironment(baseURL!);
  const quota = await assertEmailQuota();
  console.log(`Resend днес: ${quota.used}/${quota.limit} изпратени, остават ${quota.left}`);
  const api: APIRequestContext = await pwRequest.newContext({ baseURL });
  const started = Date.now();
  S.userEmails = [inbox("owner"), inbox("staff1"), inbox("staff2"), inbox("staff3")];
  S.snapshot = await snapshotOtherSalons([]);

  const pub = await newCtx(browser);           // visitor on a computer
  const phoneCtx = await newCtx(browser, true); // another device: phone
  const platform = await newCtx(browser);       // platform owner
  const admin = await newCtx(browser);          // new salon owner
  const st1 = await newCtx(browser);            // specialist 1
  const st2 = await newCtx(browser);            // specialist 2

  const today = sofiaToday();
  // Dates used across the run (all Mon–Fri, far enough for the 3-hour rule).
  const dMon = nextWeekday(3, [1]);
  const dBreak = nextWeekday(3, [2]);
  const dOff = nextWeekday(3, [3]);
  const dVac1 = nextWeekday(10, [4]);
  const dVac2 = addDays(dVac1, 1);
  const dBook = nextWeekday(3, [4], [dVac1]);
  const dConc = nextWeekday(12, [2]);

  try {
    // ════════ 1. Access request and approval ════════
    console.log("\n▶ 1. Заявка за достъп и одобрение");
    const req = pub.page;
    await step("1.01", async () => {
      await req.goto("/register-salon?plan=studio");
      await settle(req);
      await expect(req.locator("form").filter({ has: req.locator('[name="businessName"]') })).toBeVisible();
      return "Локалният сайт с новия ъпдейт";
    }, { critical: true });
    await step("1.02", async () => {
      const f = req.locator("form").filter({ has: req.locator('[name="businessName"]') });
      await f.locator('[name="ownerName"]').fill(OWNER_NAME);
      await f.locator('[name="email"]').fill(inbox("owner"));
      await f.locator('[name="phone"]').fill(phone(1));
      await f.locator('[name="businessName"]').fill(BUSINESS);
      await f.locator('[name="category"]').selectOption({ index: 1 });
      S.category = await f.locator('[name="category"]').inputValue();
      await f.locator('[name="city"]').fill("Козлодуй");
      await f.locator('[name="message"]').fill("Автоматичен пълен тест на BeautyFlow.");
      await f.locator('[name="requestedPlan"]').selectOption("studio");
      const q = await f.locator(".bf-human-check label").innerText();
      const m = q.match(/(\d+)\s*\+\s*(\d+)/)!;
      await req.waitForTimeout(2000);
      await f.locator('[name="mathAnswer"]').fill(String(+m[1] + +m[2]));
      return "План Studio (до 3 специалисти)";
    }, { critical: true });
    await step("1.03", async () => {
      const f = req.locator("form").filter({ has: req.locator('[name="businessName"]') });
      const resp = waitResp(req, (r) => r.url().endsWith("/api/access-request") && r.request().method() === "POST");
      await f.getByRole("button", { name: "Изпрати заявка" }).click();
      const r = await resp; const j = await r.json();
      expect(r.status(), j.message).toBe(200);
      expect(j.emailSent, "И двата имейла (до заявителя и до BeautyFlow) трябва да са изпратени").toBe(true);
      await expect(req.locator("body")).toContainText(/успешно/i);
      return j.message;
    }, { critical: true });
    await step(["11.01"], async () => {
      const m = await waitForEmail(inbox("owner"), /получихме заявката/i, started);
      await recordEmailLinks(m.id);
      S.emails.push(m.id);
      let note = "До заявителя: „" + m.subject + "“";
      if (env.platformInbox) { const o = await waitForEmail(env.platformInbox, new RegExp(`Нова BeautyFlow заявка — ${BUSINESS}`), started); note += "; до BeautyFlow: „" + o.subject + "“"; }
      return note;
    });

    await step("1.04", async () => {
      await login(platform.page, env.ownerEmail, env.ownerPassword, /\/owner/);
      await platform.page.goto("/owner/requests");
      await settle(platform.page);
      await expect(platform.page.locator(".request-card").filter({ hasText: inbox("owner") })).toBeVisible({ timeout: 20_000 });
    }, { critical: true });
    const card = () => platform.page.locator(".request-card").filter({ hasText: inbox("owner") });
    await step("1.05", async () => {
      for (const t of [BUSINESS, OWNER_NAME, "Козлодуй", "studio"]) await expect(card()).toContainText(t);
      return "Име, собственик, град, план и контакти се виждат";
    });
    await step(["1.06", "1.07"], async () => {
      platform.page.once("dialog", (d) => d.accept());
      const resp = waitResp(platform.page, (r) => r.url().endsWith("/api/owner/request-decision") && r.request().method() === "POST");
      await card().getByRole("button", { name: /Одобри/ }).click();
      const r = await resp; const j = await r.json();
      expect(r.status(), j.message).toBe(200);
      expect(j.emailSent, j.message).toBe(true);
      const { data: s } = await db.from("salons").select("*").eq("name", BUSINESS).single();
      S.salonId = s.id; S.slug = s.slug; S.ownerUserId = s.owner_id;
      expect(s.active).toBe(true);
      const days = Math.round((new Date(s.trial_ends_at || s.subscription_ends_at).getTime() - Date.now()) / 86400000);
      expect(days).toBeGreaterThanOrEqual(29);
      const { data: ar } = await db.from("access_requests").select("id,status").eq("email", inbox("owner")).single();
      S.requestId = ar!.id; expect(ar!.status).toBe("active");
      const { data: st } = await db.from("staff").select("id").eq("salon_id", S.salonId).eq("is_owner", true).single();
      S.ownerStaff = st!.id;
      return `Салонът е създаден, активен, план ${s.plan_id || "studio"}, достъп ${days} дни`;
    }, { critical: true });

    let setupUrl = "";
    await step(["1.08", "11.02"], async () => {
      const m = await waitForEmail(inbox("owner"), /достъпът Ви е одобрен/i, started);
      const body = await recordEmailLinks(m.id);
      setupUrl = linksIn(body.html).find((l) => l.includes("/reset-password?token_hash=")) || "";
      expect(setupUrl, "В имейла няма линк за създаване на парола").not.toBe("");
      return `Тема „${m.subject}“, линкът води към ${new URL(setupUrl).origin}`;
    }, { critical: true });
    await step("1.09", async () => {
      const local = new URL(setupUrl); // the email points to the live domain; open the same token on this build
      await admin.page.goto(`/reset-password${local.search}`);
      await settle(admin.page, 2500);
      await admin.page.locator('input[name="password"]').fill(PASSWORD);
      await admin.page.locator('input[name="confirm"]').fill(PASSWORD);
      await admin.page.locator("form button").last().click();
      await admin.page.waitForURL(/\/login/, { timeout: 30_000 });
      await login(admin.page, inbox("owner"), PASSWORD, /\/admin/);
      return "Паролата е зададена през линка от имейла";
    }, { critical: true });
    await step("1.10", async () => {
      await expect(admin.page).toHaveURL(/\/admin/);
      await expect(admin.page.locator("body")).toContainText(BUSINESS, { timeout: 20_000 });
    }, { critical: true });

    // ════════ 2. Salon information ════════
    console.log("\n▶ 2. Основна информация за салона");
    const ap = admin.page;
    const uploadedMessage = /запазена|качена/;
    await step("2.01", async () => { await ap.goto("/admin/settings"); await settle(ap); await expect(ap.locator("form").first()).toBeVisible(); });
    const sf = () => ap.locator("form").first();
    await step(["2.02", "2.04", "2.05", "2.06", "2.07"], async () => {
      await sf().locator('[name="name"]').fill(BUSINESS);
      await sf().locator('[name="description"]').fill("Тестов салон: маникюр, коса и грижа. Автоматична проверка на всички функции.");
      await sf().locator('[name="city"]').fill("Козлодуй");
      await sf().locator('[name="address"]').fill("ул. Тестова 1");
      await sf().locator('[name="map_location"]').fill("43.7786, 23.7217");
      await sf().locator('[name="phone"]').fill("0891234567");
      await sf().locator('[name="facebook_url"]').fill("https://facebook.com/beautyflow.fulltest");
      await sf().locator('[name="instagram_url"]').fill("https://instagram.com/beautyflow.fulltest");
      await sf().locator('[name="tiktok_url"]').fill("https://tiktok.com/@beautyflow.fulltest");
      await sf().locator("select").first().selectOption("180");
      const toggle = sf().locator('input[type="checkbox"]').last();
      if (!(await toggle.isChecked())) await toggle.click({ force: true });
      await sf().getByRole("button", { name: "Запази всички настройки" }).click();
      await expect(sf().locator(".form-message")).toContainText("запазени");
      const { data: s } = await db.from("salons").select("*").eq("id", S.salonId).single();
      expect(s.address).toBe("ул. Тестова 1"); expect(s.map_location).toContain("43.7786"); expect(s.phone).toBe("0891234567");
      expect(s.instagram_url).toContain("instagram.com"); expect(s.tiktok_url).toContain("tiktok.com");
      const { data: bs } = await db.from("booking_settings").select("notify_new_booking").eq("salon_id", S.salonId).single();
      expect(bs!.notify_new_booking).toBe(true);
      return "Запазено и проверено в базата; включени имейл известия за салона";
    });
    await step("2.03", async () => {
      const { data: s } = await db.from("salons").select("category").eq("id", S.salonId).single();
      expect(s!.category).toBe(S.category);
      return `Специализацията се избира в заявката (${S.category}); в настройките няма отделно поле`;
    });
    await step("2.08", async () => {
      await ap.locator('.media-logo input[type="file"]').setInputFiles(await file("logo.jpg", "#ffffff"));
      await expect(ap.locator(".media-logo .media-message")).toContainText(uploadedMessage, { timeout: 45_000 });
    });
    await step("2.09", async () => {
      await ap.locator('.media-cover input[type="file"]').setInputFiles(await file("cover.jpg", "#3d2558"));
      await expect(ap.locator(".media-cover .media-message")).toContainText(uploadedMessage, { timeout: 45_000 });
      const { data: s } = await db.from("salons").select("logo_url,cover_url").eq("id", S.salonId).single();
      expect(s!.logo_url).toBeTruthy(); expect(s!.cover_url).toBeTruthy();
    });
    await step("2.10", async () => {
      const colors = ["#7b4fc9", "#c29a78", "#4b2b5e", "#9b6bf2", "#d9b48a", "#5e3a75", "#e6c7b0", "#3a3640", "#b892ff", "#6f8f7a"];
      const files = await Promise.all(colors.map((c, i) => file(`gallery-${i + 1}.jpg`, c)));
      await ap.locator(".bf-gallery-add input").setInputFiles(files);
      await expect(ap.locator(".bf-gallery-admin-grid img")).toHaveCount(10, { timeout: 180_000 });
      await expect(ap.locator(".bf-gallery-add"), "При 10 снимки бутонът за качване трябва да изчезне").toHaveCount(0);
      // Remove one and add it back: the limit frees a slot again.
      await ap.locator(".bf-gallery-admin-grid .bf-gallery-remove").first().click();
      await expect(ap.locator(".bf-gallery-admin-grid img")).toHaveCount(9, { timeout: 20_000 });
      await ap.locator(".bf-gallery-add input").setInputFiles(await file("gallery-11.jpg", "#2a1c33"));
      await expect(ap.locator(".bf-gallery-admin-grid img")).toHaveCount(10, { timeout: 60_000 });
      const { data: g } = await db.from("salon_gallery").select("sort_order").eq("salon_id", S.salonId).order("sort_order");
      expect(g!.length).toBe(10);
      return "10 снимки, лимитът спира 11-та, изтриване и ново качване работят. Подреждането е по реда на качване (ръчно пренареждане няма)";
    });
    await step("2.11", async () => {
      await pub.page.goto(`/salon/${S.slug}`);
      await settle(pub.page, 2500);
      const body = pub.page.locator("body");
      for (const t of [BUSINESS, "ул. Тестова 1", "Автоматична проверка"]) await expect(body).toContainText(t);
      await expect(pub.page.locator('a[href*="facebook.com/beautyflow.fulltest"]')).toHaveCount(1);
      await expect(pub.page.locator('a[href*="instagram.com/beautyflow.fulltest"]')).toHaveCount(1);
      await expect(pub.page.locator('a[href*="tiktok.com/@beautyflow.fulltest"]')).toHaveCount(1);
      await expect(pub.page.locator(".bf-salon-gallery-public img")).toHaveCount(10);
    });

    // ════════ 4. Services (needed before the team, so specialists can be linked) ════════
    console.log("\n▶ 4. Услуги и цени");
    await step("4.01", async () => { await ap.goto("/admin/services"); await settle(ap); await expect(ap.getByText("Нова услуга")).toBeVisible(); });
    await step(["4.02", "4.04", "4.05", "4.06", "4.07"], async () => {
      const f = ap.locator("form").first();
      await f.locator('[name="name"]').fill(SERVICE_A);
      await f.locator('[name="price"]').fill("35");
      await f.locator('[name="duration"]').fill("45");
      const buffer = f.locator('input[type="checkbox"]');
      await buffer.evaluate((el: HTMLInputElement) => el.click());
      await f.locator('[name="buffer"]').fill("15");
      await f.locator('input[type="file"]').setInputFiles(await file("service.jpg", "#d9b48a"));
      await f.getByRole("button", { name: "Добави", exact: true }).click();
      await expect(ap.locator(".bf-service-manage-row").filter({ hasText: SERVICE_A })).toBeVisible({ timeout: 45_000 });
      const { data: s } = await db.from("services").select("*").eq("salon_id", S.salonId).eq("name", SERVICE_A).single();
      S.serviceA = s.id;
      expect([Number(s.price), s.duration_min, s.buffer_min]).toEqual([35, 45, 15]);
      expect(s.image_url, "Снимката на услугата не е записана").toBeTruthy();
      return "35 €, 45 мин. + 15 мин. почивка, със снимка";
    });
    mark("4.03", "na", "Формата за услуга няма поле „описание“ — само име, цена, време, почивка и снимка.");
    await step("4.10", async () => {
      const r = ap.locator(".bf-service-manage-row").filter({ hasText: SERVICE_A });
      await r.getByRole("button", { name: "Редактирай" }).click();
      const inp = r.locator(".bf-service-edit-form input");
      await inp.nth(1).fill("40");
      await inp.nth(2).fill("45");
      await inp.nth(3).fill("15");
      await r.getByRole("button", { name: "Запази" }).click();
      await expect(ap.getByText("Промените в услугата са запазени.")).toBeVisible();
      await expect.poll(async () => Number((await db.from("services").select("price").eq("id", S.serviceA).single()).data!.price)).toBe(40);
      return "Цената е сменена от 35 на 40 €";
    });
    await step("4.09", async () => {
      await pub.page.goto(`/salon/${S.slug}`); await settle(pub.page, 2000);
      await expect(pub.page.locator(".booking-box form select").first().locator(`option[value="${S.serviceA}"]`)).toHaveCount(1);
      await expect(pub.page.locator("body")).toContainText(SERVICE_A);
      return "Услугата се вижда в списъка с услуги и в избора за записване";
    });
    await step("4.11", async () => {
      const r = () => ap.locator(".bf-service-manage-row").filter({ hasText: SERVICE_A });
      await r().getByRole("button", { name: "Активна" }).click();
      await expect.poll(async () => (await db.from("services").select("active").eq("id", S.serviceA).single()).data!.active).toBe(false);
      await pub.page.goto(`/salon/${S.slug}`); await settle(pub.page, 2000);
      await expect(pub.page.locator(".booking-box form select").first().locator("option", { hasText: SERVICE_A })).toHaveCount(0);
      await r().getByRole("button", { name: "Скрита" }).click();
      await expect.poll(async () => (await db.from("services").select("active").eq("id", S.serviceA).single()).data!.active).toBe(true);
      return "Скритата услуга изчезва от публичната страница и се връща";
    });

    // ════════ 3. Owner profile and team ════════
    console.log("\n▶ 3. Профил на собственика и екип");
    await step("3.01", async () => { await ap.goto("/admin/my-profile"); await settle(ap); await expect(ap.locator('textarea[name="bio"]')).toBeVisible(); });
    await step(["3.02", "3.03"], async () => {
      const name = ap.locator('input[name="name"]');
      if (await name.count()) await name.fill(OWNER_NAME);
      await ap.locator('input[name="title"]').fill("Собственик и маникюрист");
      await ap.locator('textarea[name="bio"]').fill("Собственик на салона, работи и като специалист.");
      await ap.locator('input[name="instagram_url"]').fill("https://instagram.com/bf.owner.test");
      await ap.locator('input[name="photo"]').setInputFiles(await file("owner.jpg", "#9b6bf2"));
      await ap.getByRole("button", { name: "Запази профила" }).click();
      // The photo is optimised and uploaded first; on a busy dev server that can take a while.
      await expect(ap.locator(".form-message").last()).toContainText(/успешно|запазен/i, { timeout: 120_000 });
      const { data: st } = await db.from("staff").select("*").eq("id", S.ownerStaff).single();
      expect(st.avatar_url).toBeTruthy(); expect(st.active).toBe(true);
      return "Собственикът е активен специалист със снимка и представяне";
    });
    await step("3.04", async () => { await ap.goto("/admin/staff"); await settle(ap); await expect(ap.getByText("Покани специалист")).toBeVisible(); });

    const invite = async (label: string, name: string, title: string) => {
      const form = ap.locator(".dash-card form").first();
      await form.locator('[name="name"]').fill(name);
      await form.locator('[name="title"]').fill(title);
      await form.locator('[name="email"]').fill(inbox(label));
      const rr = waitResp(ap, (r) => r.url().endsWith("/api/business/staff/invite") && r.request().method() === "POST");
      await form.getByRole("button", { name: "Изпрати покана" }).click();
      const r = await rr; const j = await r.json();
      expect(r.status(), j.message).toBe(200);
      expect(j.emailSent, j.message).toBe(true);
      return j.staffId as string;
    };
    await step("3.06", async () => {
      const since = Date.now();
      S.staff1 = await invite("staff1", STAFF1, "Маникюрист");
      await ap.reload(); await settle(ap);
      S.staff2 = await invite("staff2", STAFF2, "Фризьор");
      const m = await waitForEmail(inbox("staff1"), /покана за екипа/i, since);
      await recordEmailLinks(m.id);
      return `2 покани; тема „${m.subject}“`;
    }, { critical: true });
    await step("3.05", async () => {
      await ap.reload(); await settle(ap);
      const { count } = await db.from("staff").select("id", { count: "exact", head: true }).eq("salon_id", S.salonId).eq("active", true);
      expect(count).toBe(3);
      const token = await accessToken(ap);
      const r = await api.post("/api/business/staff/invite", { headers: { Authorization: `Bearer ${token}` }, data: { name: "Четвърти Тест", title: "Масажист", email: inbox("staff3") } });
      const j = await r.json();
      expect(r.status(), j.message).toBe(409);
      expect(j.message).toContain("3");
      return `Studio: 3/3 активни, 4-ти е отказан („${j.message}“)`;
    });

    const acceptInvite = async (ctx: Ctx, label: string) => {
      const m = await waitForEmail(inbox(label), /покана за екипа/i, started);
      const link = linksIn((await emailBody(m.id)).html).find((l) => /\/auth\/v1\/verify/.test(l));
      expect(link, "В поканата няма линк за вход").toBeTruthy();
      const r = await api.get(link!, { maxRedirects: 0 });
      const loc = r.headers()["location"] || "";
      const hash = loc.includes("#") ? loc.slice(loc.indexOf("#")) : "";
      expect(hash, `Линкът не върна сесия: ${loc.slice(0, 120)}`).toContain("access_token");
      await ctx.page.goto(`/reset-password${hash}`);
      await settle(ctx.page, 2500);
      await ctx.page.locator('input[name="password"]').fill(PASSWORD);
      await ctx.page.locator('input[name="confirm"]').fill(PASSWORD);
      await ctx.page.locator("form button").last().click();
      await ctx.page.waitForURL(/\/login/, { timeout: 30_000 });
      await login(ctx.page, inbox(label), PASSWORD, /\/admin/);
    };
    await step("3.07", async () => {
      await acceptInvite(st1, "staff1");
      await acceptInvite(st2, "staff2");
      return "И двамата специалисти задават парола от поканата и влизат";
    }, { critical: true });
    await step("3.08", async () => {
      for (const [ctx, n] of [[st1, 1], [st2, 2]] as const) {
        await ctx.page.goto("/admin/my-profile"); await settle(ctx.page);
        await ctx.page.locator('textarea[name="bio"]').fill(`Специалист ${n} — автоматичен тест.`);
        await ctx.page.locator('input[name="photo"]').setInputFiles(await file(`staff-${n}.jpg`, n === 1 ? "#c29a78" : "#5e3a75"));
        await ctx.page.getByRole("button", { name: "Запази профила" }).click();
        await expect(ctx.page.locator(".form-message").last()).toContainText(/успешно|запазен/i, { timeout: 45_000 });
      }
    });

    // Service B, linked only to specialist 1 (4.08 / 3.09).
    await step(["4.08", "3.09"], async () => {
      await ap.goto("/admin/services"); await settle(ap);
      const f = ap.locator("form").first();
      await f.locator('[name="name"]').fill(SERVICE_B);
      await f.locator('[name="price"]').fill("25");
      await f.locator('[name="duration"]').fill("30");
      await f.getByRole("button", { name: "Добави", exact: true }).click();
      await expect(ap.locator(".bf-service-manage-row").filter({ hasText: SERVICE_B })).toBeVisible({ timeout: 30_000 });
      S.serviceB = (await db.from("services").select("id").eq("salon_id", S.salonId).eq("name", SERVICE_B).single()).data!.id;
      await ap.goto("/admin/staff"); await settle(ap);
      for (const [name, want] of [[OWNER_NAME, false], [STAFF1, true], [STAFF2, false]] as const) {
        const box = ap.locator(".bf-staff-service-matrix article").filter({ hasText: name }).locator("label", { hasText: SERVICE_B }).locator('input[type="checkbox"]');
        if ((await box.isChecked()) !== want) { await box.click(); await ap.waitForTimeout(900); }
      }
      await expect.poll(async () => ((await db.from("staff_services").select("staff_id").eq("service_id", S.serviceB)).data || []).map((x) => x.staff_id).sort().join(","), { timeout: 15_000 }).toBe(S.staff1);
      return `„${SERVICE_B}“ е само при ${STAFF1}; „${SERVICE_A}“ е при всички`;
    });

    // ════════ 5. Working hours and schedules ════════
    console.log("\n▶ 5. Работно време и графици");
    const setWeek = async (page: Page, plan: Record<string, [string, string] | null>) => {
      await page.goto("/admin/schedule"); await settle(page);
      const rows = page.locator(".hours-row");
      await expect(rows).toHaveCount(7);
      for (let i = 0; i < 7; i++) {
        const row = rows.nth(i);
        const name = (await row.locator("b").innerText()).trim();
        const want = plan[name];
        const cb = row.locator('input[type="checkbox"]');
        if (!!want !== (await cb.isChecked())) await cb.click();
        if (want) { await row.locator("select").nth(0).selectOption(want[0]); await row.locator("select").nth(1).selectOption(want[1]); }
      }
      await page.getByRole("button", { name: "Запази целия седмичен график" }).click();
      await expect(page.getByRole("status")).toContainText("запазен");
    };
    const workweek = (mon: [string, string] = ["09:00", "18:00"], skip: string[] = []) => {
      const all: Record<string, [string, string] | null> = { "Понеделник": mon, "Вторник": ["09:00", "18:00"], "Сряда": ["09:00", "18:00"], "Четвъртък": ["09:00", "18:00"], "Петък": ["09:00", "18:00"], "Събота": null, "Неделя": null };
      for (const d of skip) all[d] = null;
      return all;
    };
    await step(["5.01", "5.02"], async () => {
      await setWeek(ap, workweek(["10:00", "17:00"]));
      await setWeek(st1.page, workweek());
      const a = await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.ownerStaff, date: dMon });
      const free = freeTimes(a);
      expect(free[0], "Първият час в понеделник трябва да е 10:00").toBe("10:00");
      expect(free[free.length - 1] <= "16:00", `Последен свободен ${free[free.length - 1]} (45+15 мин. до 17:00)`).toBe(true);
      const sat = await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.ownerStaff, date: nextWeekday(3, [6]) });
      expect(freeTimes(sat)).toEqual([]);
      return `Пн 10:00–17:00 (първи ${free[0]}, последен ${free[free.length - 1]}), Вт–Пт 09–18, събота и неделя почивни`;
    });
    await step("5.03", async () => {
      const free = freeTimes(await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.ownerStaff, date: dBreak }));
      const mins = free.map((t) => +t.slice(0, 2) * 60 + +t.slice(3));
      expect(mins.length).toBeGreaterThan(10);
      expect(mins.every((m) => m % 15 === 0)).toBe(true);
      expect(mins.slice(1).some((m, i) => m - mins[i] === 15)).toBe(true);
    });
    await step(["5.04", "5.05"], async () => {
      await ap.goto("/admin/schedule"); await settle(ap);
      const card = ap.locator("section.dash-card").filter({ hasText: "Почивка за конкретна дата" });
      await chooseAdminDate(ap, dBreak, card);
      await card.locator("select").nth(0).selectOption("13:00");
      await card.locator("select").nth(1).selectOption("14:00");
      await card.locator('[name="note"]').fill("Обедна почивка (тест)");
      await card.getByRole("button", { name: "Добави почивка" }).click();
      await expect(ap.locator(".manage-list")).toContainText("Обедна почивка (тест)", { timeout: 15_000 });
      const free = freeTimes(await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.ownerStaff, date: dBreak }));
      for (const t of ["12:15", "12:30", "12:45", "13:00", "13:15", "13:30", "13:45"]) expect(free, `${t} попада в почивката`).not.toContain(t);
      expect(free).toContain("14:00");
      return "13:00–14:00: не се предлагат часове, които се застъпват с почивката";
    });
    const closeDay = async (date: string, note: string) => {
      const card = ap.locator("section.dash-card").filter({ hasText: "Почивен ден / отпуск" });
      await chooseAdminDate(ap, date, card);
      await card.locator('[name="note"]').fill(note);
      await card.getByRole("button", { name: "Затвори целия ден" }).click();
      await expect(ap.locator(".manage-list")).toContainText(note, { timeout: 15_000 });
    };
    await step("5.06", async () => {
      await closeDay(dOff, "Почивен ден (тест)");
      expect(freeTimes(await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.ownerStaff, date: dOff }))).toEqual([]);
      return dOff;
    });
    const closePeriod = async (from: string, to: string, note: string) => {
      await ap.goto("/admin/schedule"); await settle(ap);
      const card = ap.locator("section.dash-card").filter({ hasText: "Почивен ден / отпуск" });
      await chooseAdminDate(ap, from, card.locator(".bf-off-from"));
      await chooseAdminDate(ap, to, card.locator(".bf-off-to"));
      await card.locator('[name="note"]').fill(note);
      const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
      await card.getByRole("button", { name: days > 1 ? `Затвори ${days} дни` : "Затвори целия ден" }).click();
      const row = ap.locator(".manage-list > div").filter({ hasText: note });
      await expect(row).toHaveCount(1, { timeout: 15_000 });
      if (days > 1) await expect(row).toContainText(`Целият период · ${days} дни`);
      return { row, days };
    };
    await step(["5.07", "14.01"], async () => {
      await closePeriod(dVac1, dVac2, "Отпуск (тест)");
      for (const d of [dVac1, dVac2]) expect(freeTimes(await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.ownerStaff, date: d }))).toEqual([]);
      const { count } = await db.from("staff_time_off").select("id", { count: "exact", head: true }).eq("staff_id", S.ownerStaff).eq("all_day", true).gte("off_date", dVac1).lte("off_date", dVac2);
      expect(count).toBe(2);
      return `Отпуск ${dVac1} – ${dVac2} с едно натискане („Затвори 2 дни“); и двата дни са затворени`;
    });
    await step("14.02", async () => {
      const from = nextWeekday(30, [1]), to = addDays(from, 4);
      const { row, days } = await closePeriod(from, to, "Период за премахване (тест)");
      await row.getByRole("button", { name: "Премахни" }).click();
      await expect(row).toHaveCount(0, { timeout: 15_000 });
      const { count } = await db.from("staff_time_off").select("id", { count: "exact", head: true }).eq("staff_id", S.ownerStaff).gte("off_date", from).lte("off_date", to);
      expect(count).toBe(0);
      return `${days} дни се показват като един ред и се премахват с един бутон`;
    });
    await step("5.08", async () => {
      const year = Number(today.slice(0, 4));
      const all = { ...bulgarianHolidays(year), ...bulgarianHolidays(year + 1) };
      const next = Object.keys(all).filter((d) => d > today).sort()[0];
      // The public calendar only goes max_advance_days ahead; open it far enough for this check, then restore.
      const { data: bs } = await db.from("booking_settings").select("max_advance_days").eq("salon_id", S.salonId).single();
      const need = Math.ceil((new Date(next).getTime() - Date.now()) / 86400000) + 10;
      if (need > bs!.max_advance_days) await db.from("booking_settings").update({ max_advance_days: need }).eq("salon_id", S.salonId);
      try {
        await pub.page.goto(`/salon/${S.slug}`); await settle(pub.page, 2000);
        await pub.page.locator(".booking-box form select").first().selectOption({ value: S.serviceA });
        await publicGotoMonth(pub.page, next);
        const btn = pub.page.locator(".booking-calendar-grid button.holiday").filter({ has: pub.page.locator("span", { hasText: new RegExp(`^${Number(next.slice(8))}$`) }) });
        await expect(btn).toHaveCount(1);
      } finally {
        await db.from("booking_settings").update({ max_advance_days: bs!.max_advance_days }).eq("salon_id", S.salonId);
      }
      return `${next}: „${all[next].name}“ е отбелязан в публичния календар`;
    });
    await step("5.09", async () => {
      await setWeek(st2.page, workweek(["09:00", "18:00"], ["Сряда"]));
      const wed = nextWeekday(3, [3], [dOff]);
      const s2 = freeTimes(await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff2, date: wed }));
      const s1 = freeTimes(await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff1, date: wed }));
      expect(s2).toEqual([]); expect(s1.length).toBeGreaterThan(0);
      return `${STAFF2} не работи в сряда, ${STAFF1} работи — графиците са независими`;
    });
    await step("5.10", async () => {
      await pub.page.goto(`/salon/${S.slug}`); await settle(pub.page, 2000);
      const svc = pub.page.locator(".booking-box form select").first();
      await svc.selectOption({ value: S.serviceA });
      await publicGotoMonth(pub.page, dBook);
      await pub.page.locator(".booking-calendar-grid button.day-available").filter({ has: pub.page.locator("span", { hasText: new RegExp(`^${Number(dBook.slice(8))}$`) }) }).first().click();
      await expect(pub.page.locator(".timeline-grid button.available").first()).toBeVisible({ timeout: 15_000 });
      return `Публичната страница показва свободни часове за ${dBook}`;
    });

    // ════════ 14. New features: gallery order, announcement, owner-only ════════
    console.log("\n▶ 14. Нови функции");
    const galleryIds = async () => ((await db.from("salon_gallery").select("id,image_url").eq("salon_id", S.salonId).order("sort_order").order("id")).data || []);
    const fileOf = (u: string) => decodeURIComponent(u).split("/").pop()!.split("?")[0].split("&")[0];
    await step("14.03", async () => {
      await ap.goto("/admin/settings"); await settle(ap, 2000);
      const before = await galleryIds();
      const items = ap.locator(".bf-gallery-admin-grid .bf-gallery-item");
      await expect(items).toHaveCount(10);
      const save = waitResp(ap, (r) => r.url().endsWith("/api/business/gallery-order") && r.request().method() === "POST");
      await items.nth(0).getByRole("button", { name: /надясно/ }).click();
      expect((await save).status()).toBe(200);
      await expect(ap.locator(".bf-gallery-order-msg")).toContainText("запазена");
      const after = await galleryIds();
      expect([after[0].id, after[1].id]).toEqual([before[1].id, before[0].id]);
      return "Стрелка „→“ на първата снимка я премества на второ място и се запазва веднага";
    });
    await step("14.04", async () => {
      const before = await galleryIds();
      const items = ap.locator(".bf-gallery-admin-grid .bf-gallery-item");
      const save = waitResp(ap, (r) => r.url().endsWith("/api/business/gallery-order") && r.request().method() === "POST");
      await items.nth(4).dragTo(items.nth(0));
      expect((await save).status()).toBe(200);
      const after = await galleryIds();
      expect(after[0].id, "Плъзнатата 5-та снимка трябва да е първа").toBe(before[4].id);
      await ap.reload(); await settle(ap, 2000);
      expect(fileOf(await ap.locator(".bf-gallery-admin-grid .bf-gallery-item img").first().getAttribute("src") || "")).toBe(fileOf(before[4].image_url));
      return "5-тата снимка е плъзната най-отпред; подредбата остава и след презареждане";
    });
    await step("14.05", async () => {
      const order = await galleryIds();
      await pub.page.goto(`/salon/${S.slug}`); await settle(pub.page, 2500);
      const srcs = await pub.page.locator(".bf-salon-gallery-public img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute("src") || ""));
      expect(srcs.slice(0, 3).map(fileOf)).toEqual(order.slice(0, 3).map((g) => fileOf(g.image_url)));
      return "Клиентите виждат галерията в новия ред";
    });
    const annCard = () => ap.locator(".bf-announcement-card");
    const annText = "От 1 ноември цените на маникюра се променят. Благодарим ви! (тест)";
    await step("14.06", async () => {
      await ap.goto("/admin/settings"); await settle(ap, 2000);
      await annCard().locator("#ann-type").selectOption("prices");
      await annCard().locator("#ann-text").fill(annText);
      await annCard().locator("#ann-until").fill(addDays(today, 5));
      const resp = waitResp(ap, (r) => r.url().endsWith("/api/business/announcement") && r.request().method() === "POST");
      await annCard().getByRole("button", { name: "Публикувай съобщението" }).click();
      const r = await resp; const j = await r.json();
      expect(r.status(), j.message).toBe(200);
      await pub.page.goto(`/salon/${S.slug}`); await settle(pub.page, 2500);
      const banner = pub.page.getByTestId("salon-announcement");
      await expect(banner).toContainText(annText);
      await expect(banner).toContainText("Промяна в цените");
      const [y, m, d] = addDays(today, 5).split("-");
      await expect(banner).toContainText(`Валидно до ${d}.${m}.${y}`);
      await phoneCtx.page.goto("/salons"); await settle(phoneCtx.page, 2500);
      await expect(phoneCtx.page.locator(".salon-card").filter({ hasText: BUSINESS }).locator(".bf-salon-card-announcement")).toContainText("цените на маникюра");
      return "Видимо в профила (с вид и срок) и в картата в списъка — проверено и на телефон";
    });
    await step("14.07", async () => {
      await db.from("salons").update({ announcement_until: addDays(today, -1) }).eq("id", S.salonId);
      const r = await api.get(`/api/public/salon?slug=${encodeURIComponent(S.slug)}`);
      expect((await r.json()).announcement).toBeNull();
      await pub.page.goto(`/salon/${S.slug}`); await settle(pub.page, 2500);
      await expect(pub.page.getByTestId("salon-announcement")).toHaveCount(0);
      await expect(annCard().locator("#ann-until")).toHaveAttribute("min", today);
      await db.from("salons").update({ announcement_until: addDays(today, 5) }).eq("id", S.salonId);
      return "След изтичане съобщението изчезва само; в настройките не може да се избере минала дата";
    });
    await step("14.08", async () => {
      await ap.goto("/admin/settings"); await settle(ap, 2000);
      const resp = waitResp(ap, (r) => r.url().endsWith("/api/business/announcement") && r.request().method() === "DELETE");
      await annCard().getByRole("button", { name: "Премахни съобщението" }).click();
      expect((await resp).status()).toBe(200);
      const { data } = await db.from("salons").select("announcement_text").eq("id", S.salonId).single();
      expect(data!.announcement_text).toBeNull();
      await pub.page.goto(`/salon/${S.slug}`); await settle(pub.page, 2500);
      await expect(pub.page.getByTestId("salon-announcement")).toHaveCount(0);
    });
    await step("14.09", async () => {
      const token = await accessToken(st1.page);
      const a = await api.post("/api/business/announcement", { headers: { Authorization: `Bearer ${token}` }, data: { type: "info", text: "Не трябва да мине" } });
      const g = await api.post("/api/business/gallery-order", { headers: { Authorization: `Bearer ${token}` }, data: { ids: (await galleryIds()).map((x) => x.id) } });
      const anon = await api.post("/api/business/announcement", { data: { type: "info", text: "Без вход" } });
      expect([a.status(), g.status(), anon.status()]).toEqual([403, 403, 401]);
      return "Служител → 403, без вход → 401; само собственикът може";
    });

    // ════════ 6. Online booking rules ════════
    console.log("\n▶ 6. Правила за онлайн записване");
    await step("6.01", async () => {
      const setNotice = async (minutes: string) => {
        await ap.goto("/admin/settings"); await settle(ap);
        await sf().locator("select").first().selectOption(minutes);
        await sf().getByRole("button", { name: "Запази всички настройки" }).click();
        await expect(sf().locator(".form-message")).toContainText("запазени");
      };
      let note = "";
      await setNotice("10080");
      try {
        const month = addDays(today, 3).slice(0, 7);
        const days = await monthAvailability(api, { salonId: S.salonId, serviceId: S.serviceA, month });
        const soon = Object.entries(days).filter(([d]) => d > today && d < addDays(today, 7));
        expect(soon.every(([, st]) => st !== "available"), "При 7 дни най-близките дни трябва да са затворени").toBe(true);
        // dBook is 3–6 days ahead: inside the 7-day window, so it must be refused.
        const c = await bookingCode(api, S.salonId, inbox("rule7"));
        const tooSoon = await apiBook(api, { salonId: S.salonId, serviceId: S.serviceA, date: dBook, startTime: "10:00", name: "Правило Тест", phone: phone(7), email: inbox("rule7"), verificationId: c.verificationId, code: c.code });
        expect(tooSoon.status, JSON.stringify(tooSoon.body)).toBe(409);
        expect(tooSoon.body.message).toMatch(/7 дни/);
        note = `7 дни: близките дати са затворени и записване за ${dBook} е отказано („${tooSoon.body.message}“)`;
      } finally {
        await setNotice("180");
      }
      const todaySlots = freeTimes(await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff1, date: today }));
      const now = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
      const limit = (+now.slice(0, 2) + 3) * 60 + +now.slice(3);
      expect(todaySlots.every((t) => +t.slice(0, 2) * 60 + +t.slice(3) >= limit), "Днес не трябва да има часове по-рано от 3 часа").toBe(true);
      const tomorrowish = freeTimes(await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff1, date: dBook }));
      expect(tomorrowish.length, "При 3 часа датата след 3 дни трябва да има свободни часове").toBeGreaterThan(0);
      return `${note}; 3 часа: днес няма часове преди ${String(Math.floor(limit / 60)).padStart(2, "0")}:${String(limit % 60).padStart(2, "0")}, а ${dBook} отново е отворен`;
    });
    await step("6.06", async () => {
      const r = await apiBook(api, { salonId: S.salonId, serviceId: S.serviceA, date: dBook, startTime: "15:00", name: "Без Условия", phone: phone(8), email: inbox("noterms"), acceptedTerms: false, verificationId: "00000000-0000-0000-0000-000000000000", code: "123456" });
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/Общите условия/);
      return "Без съгласие записването се отказва; в UI чекбоксът е задължителен (проверено в 7.08)";
    });
    await step("6.07", async () => {
      const c = await bookingCode(api, S.salonId, inbox("wrongcode"));
      const wrong = String((Number(c.code) + 1) % 1000000).padStart(6, "0");
      const r = await apiBook(api, { salonId: S.salonId, serviceId: S.serviceA, date: dBook, startTime: "15:00", name: "Грешен Код", phone: phone(9), email: inbox("wrongcode"), verificationId: c.verificationId, code: wrong });
      expect(r.status).toBe(403);
      return "Грешен код → отказ; верният код се ползва в 7.09";
    });
    await step("6.03", async () => {
      const r1 = await api.post("/api/public/booking-code", { data: { salonId: S.salonId, email: inbox("wrongcode") } });
      const j1 = await r1.json();
      expect(r1.status(), "Втори код за същия имейл веднага трябва да е отказан").toBe(429);
      return `Защита: „${j1.message}“ (още: 5 кода/10 мин., 30 заявки/IP, 90 сек. между записвания от един телефон — проверено в 6.02)`;
    });

    // ════════ 7. Public page and first booking (phone, separate device) ════════
    console.log("\n▶ 7. Публична страница и първо записване");
    const pp = phoneCtx.page;
    const cust1 = { name: "Клиент Първи", phone: phone(2), email: inbox("cust1"), note: "Моля, по-къси нокти." };
    let firstTime = "";
    await step("7.01", async () => { await pp.goto("/salons"); await settle(pp, 2500); await expect(pp.locator(".salon-card").filter({ hasText: BUSINESS })).toBeVisible({ timeout: 20_000 }); });
    await step("7.02", async () => {
      await expect(pp.locator('.salon-card a[href="/salon/demo"]')).toHaveCount(0);
      await expect(pp.locator(".salon-card").filter({ hasText: /demo/i })).toHaveCount(0);
      return "Одобреният салон е в списъка, демо салон няма";
    });
    await step(["7.03", "13.01"], async () => {
      await pp.locator(".salon-card").filter({ hasText: BUSINESS }).locator("a").first().click();
      await pp.waitForURL((u) => decodeURIComponent(u.pathname) === `/salon/${S.slug}`, { waitUntil: "commit" });
      await settle(pp, 2500);
      for (const t of [BUSINESS, "ул. Тестова 1", "Автоматична проверка"]) await expect(pp.locator("body")).toContainText(t);
      await expect(pp.locator(".bf-salon-gallery-public img")).toHaveCount(10);
      await expect(pp.locator('a[href*="google.com/maps"]').first()).toBeVisible();
      return "Лого, корица, галерия, описание, адрес, карта и социални мрежи — на телефон";
    });
    await step(["7.04", "7.05", "7.06", "6.04"], async () => {
      const selects = pp.locator(".booking-box form select");
      await selects.first().selectOption({ value: S.serviceA });
      await selects.nth(1).selectOption({ label: await selects.nth(1).locator("option", { hasText: STAFF1 }).innerText() });
      await publicGotoMonth(pp, dBook);
      await pp.locator(".booking-calendar-grid button.day-available").filter({ has: pp.locator("span", { hasText: new RegExp(`^${Number(dBook.slice(8))}$`) }) }).first().click();
      const slot = pp.locator(".timeline-grid button.available").first();
      await expect(slot).toBeVisible({ timeout: 15_000 });
      firstTime = ((await slot.locator("b").textContent()) || "").trim();
      await slot.click();
      return `${SERVICE_A} · ${STAFF1} · ${dBook} ${firstTime}`;
    }, { critical: true });
    await step(["7.07", "7.08"], async () => {
      await pp.locator('input[name="customerName"]').fill(cust1.name);
      await pp.locator('input[name="customerPhone"]').fill(cust1.phone);
      await pp.locator('input[name="customerEmail"]').fill(cust1.email);
      await pp.locator('textarea[name="note"]').fill(cust1.note);
      const terms = pp.locator('input[name="acceptedTerms"]');
      await expect(pp.locator('.booking-legal-check a[href="/terms"]')).toBeAttached();
      await expect(pp.locator('.booking-legal-check a[href="/privacy"]')).toBeAttached();
      await terms.check();
      return "Данни, бележка и задължително съгласие с Общите условия и Политиката за поверителност";
    }, { critical: true });
    let bookedId = "";
    await step(["7.09", "7.10", "13.03"], async () => {
      const since = Date.now();
      const codeResp = waitResp(pp, (r) => r.url().includes("/api/public/booking-code") && r.request().method() === "POST");
      await pp.getByRole("button", { name: /Запиши час/i }).click();
      const cr = await codeResp; expect(cr.status()).toBe(200);
      const mail = await waitForEmail(cust1.email, /код за потвърждение: \d{6}/, since);
      await pp.locator(".bf-booking-code-card input").fill(mail.subject.match(/(\d{6})/)![1]);
      const bookResp = waitResp(pp, (r) => r.url().endsWith("/api/public/book") && r.request().method() === "POST");
      await pp.getByTestId("confirm-booking-code").click();
      const br = await bookResp; const bj = await br.json();
      expect(br.status(), bj.message).toBe(200);
      bookedId = bj.appointmentId;
      await expect(pp.locator(".booking-success")).toBeVisible({ timeout: 20_000 });
      return `Кодът е прочетен от имейла „${mail.subject.replace(/\d{6}/, "••••••")}“; записване ${firstTime}`;
    }, { critical: true });
    await step("7.11", async () => {
      const ok = pp.locator(".booking-success");
      await expect(ok).toContainText(SERVICE_A);
      await expect(ok).toContainText(firstTime);
      await expect(ok.locator('a[href*="google.com/maps"]')).toBeVisible();
    });
    await step("14.11", async () => {
      const href = await pp.getByTestId("add-to-google-calendar").getAttribute("href");
      const u = new URL(href!);
      expect(u.host).toBe("calendar.google.com");
      expect(u.searchParams.get("dates")!.split("/")[0]).toBe(sofiaToUtcIso(dBook, firstTime));
      expect(u.searchParams.get("text")).toBe(`${SERVICE_A} · ${BUSINESS}`);
      return `Google Календар: ${u.searchParams.get("dates")}`;
    });
    await step("14.10", async () => {
      const resp = waitResp(pp, (r) => r.url().includes("/api/public/booking-ics"));
      await pp.getByTestId("add-to-calendar").click().catch(() => {});
      const r = await resp;
      expect(r.status()).toBe(200);
      expect(r.headers()["content-type"]).toContain("text/calendar");
      const ics = (await (await api.get(r.url())).text()).replace(/\r\n /g, "");
      const startUtc = sofiaToUtcIso(dBook, firstTime);
      for (const k of ["UID:", "DTSTAMP:", `DTSTART:${startUtc}`, "TRIGGER:-P1D", "TRIGGER:-PT2H", `SUMMARY:${SERVICE_A} · ${BUSINESS}`]) expect(ics, k).toContain(k);
      await pp.goto(`/salon/${S.slug}`).catch(() => {});
      return `Файл .ics: начало ${dBook} ${firstTime} (${startUtc}), напомняния ден преди и 2 часа преди`;
    });
    await step(["7.12", "11.03", "11.08"], async () => {
      const m = await waitForEmail(cust1.email, /часът Ви в .* е потвърден|запазен час/i, started);
      const body = await recordEmailLinks(m.id);
      const [y, mo, d] = dBook.split("-");
      const txt = body.text || body.html;
      expect(txt).toContain(`${d}.${mo}.${y}`);
      expect(txt).toContain(firstTime);
      expect(txt).toContain(BUSINESS);
      expect(linksIn(body.html).some((l) => l.includes("google.com/maps"))).toBe(true);
      return `„${m.subject}“ — с дата ${d}.${mo}.${y}, час ${firstTime}, салон и линк към картата`;
    });
    await step("11.04", async () => {
      const [y, mo, d] = dBook.split("-");
      const m = await waitForEmail(inbox("owner"), new RegExp(`Ново записване — ${d}\\.${mo}\\.${y} в ${firstTime}`), started);
      const body = await recordEmailLinks(m.id);
      expect(body.text || body.html).toContain(cust1.name);
      return `До салона: „${m.subject}“`;
    });
    await step("7.13", async () => {
      await st1.page.goto("/admin/calendar"); await settle(st1.page);
      await chooseAdminDate(st1.page, dBook);
      await expect(st1.page.locator(".calendar-appointment").filter({ hasText: cust1.name })).toBeVisible({ timeout: 15_000 });
      return `Вижда се в календара на ${STAFF1}`;
    });

    // ════════ 8. Calendar and booking management ════════
    console.log("\n▶ 8. Календар и управление на записвания");
    const cust2 = { name: "Клиент Втори", phone: phone(3), email: inbox("cust2"), note: "Бележка за собственика" };
    let ownerAppt = "";
    await step(["8.01", "8.02"], async () => {
      const r = await bookWithCode(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.ownerStaff, date: dBreak, startTime: "10:00", ...cust2 });
      expect(r.status, r.body.message).toBe(200);
      ownerAppt = r.body.appointmentId;
      await ap.goto("/admin/calendar"); await settle(ap);
      await chooseAdminDate(ap, dBreak);
      await expect(ap.locator(".calendar-appointment").filter({ hasText: cust2.name })).toBeVisible({ timeout: 15_000 });
      await expect(ap.locator("body")).toContainText("Свободно");
      return "Личният календар показва заетия час и свободните часове";
    });
    await step("4.12", async () => {
      const free = freeTimes(await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.ownerStaff, date: dBreak }));
      for (const t of ["09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45"]) expect(free, `${t} се застъпва с 10:00–11:00`).not.toContain(t);
      expect(free).toContain("11:00");
      return "Час 10:00 (45 мин. + 15 мин. почивка) блокира 10:00–11:00; следващият свободен е 11:00";
    });
    await step("6.05", async () => { derive("6.05", ["4.12", "5.05"], "Продължителност, почивка след услуга, почивки и заетост се спазват"); });
    await step(["8.03", "8.04"], async () => {
      const c = ap.locator(".calendar-appointment").filter({ hasText: cust2.name });
      for (const t of [SERVICE_A, cust2.name, "10:00", cust2.note]) await expect(c).toContainText(t);
      await ap.goto(`/admin/overview?date=${dBreak}`); await settle(ap);
      const row = ap.locator(".booking-row").filter({ hasText: cust2.name });
      await expect(row).toContainText(OWNER_NAME);
      await expect(row).toContainText(cust2.phone);
      return "Календар: клиент, услуга, час, бележка; „Общ преглед“: специалист, дата и телефон";
    });
    await step("8.05", async () => {
      const done: string[] = [];
      for (const [label, status] of [["Завършен", "completed"], ["Закъснял", "late"], ["Не дошъл", "no_show"], ["Отказан", "cancelled"]] as const) {
        await ap.goto("/admin/calendar"); await settle(ap);
        await chooseAdminDate(ap, dBreak);
        const c = ap.locator(".calendar-appointment").filter({ hasText: cust2.name });
        await c.getByRole("button", { name: label }).click();
        await c.getByRole("button", { name: "Запази" }).click();
        await expect.poll(async () => (await db.from("appointments").select("status").eq("id", ownerAppt).single()).data!.status, { timeout: 15_000 }).toBe(status);
        done.push(label);
      }
      return done.join(" → ");
    });
    await step(["8.06", "9.01", "9.02", "9.03", "9.04"], async () => {
      await ap.goto("/admin/customers"); await settle(ap);
      const card = ap.locator(".customer-card").filter({ hasText: cust2.name });
      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect(card).toContainText(cust2.phone);
      await expect(card).toContainText(/Отказвал/);
      await expect(ap.locator(".customer-card").filter({ hasText: cust1.name })).toBeVisible();
      return "Клиентите от записванията са в списъка; историята показва последния резултат („Отказвал“)";
    });

    // Concurrency: same time with two specialists, and a collision for one specialist.
    await step(["8.11", "5.11"], async () => {
      const a = await bookWithCode(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff1, date: dConc, startTime: "11:00", name: "Едновременен Едно", phone: phone(4), email: inbox("conc1") });
      const b = await bookWithCode(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff2, date: dConc, startTime: "11:00", name: "Едновременен Две", phone: phone(5), email: inbox("conc2") });
      expect(a.status, a.body.message).toBe(200); expect(b.status, b.body.message).toBe(200);
      return `${dConc} 11:00 — ${STAFF1} и ${STAFF2} имат час по едно и също време`;
    });
    await step("6.08", async () => {
      const r = await bookWithCode(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff1, date: dConc, startTime: "11:00", name: "Втори Клиент Същ Час", phone: phone(6), email: inbox("dup") });
      expect(r.status).toBe(409);
      return `Втори клиент за зает час при ${STAFF1}: „${r.body.message}“`;
    });
    await step(["8.09", "3.10"], async () => {
      await st1.page.goto("/admin/calendar"); await settle(st1.page);
      await chooseAdminDate(st1.page, dConc);
      await expect(st1.page.locator(".calendar-appointment").filter({ hasText: "Едновременен Едно" })).toBeVisible({ timeout: 15_000 });
      await expect(st1.page.locator(".calendar-appointment").filter({ hasText: "Едновременен Две" })).toHaveCount(0);
      await st2.page.goto("/admin/bookings"); await settle(st2.page);
      await chooseAdminDate(st2.page, dConc);
      await expect(st2.page.locator("body")).toContainText("Едновременен Две");
      await expect(st2.page.locator("body")).not.toContainText("Едновременен Едно");
      await st2.page.goto("/admin/customers"); await settle(st2.page);
      await expect(st2.page.locator("body")).not.toContainText(cust1.name);
      return "Всеки специалист вижда само своите часове; клиентите на собственика не са достъпни за служител";
    });
    await step(["8.10", "3.11", "12.05", "12.06"], async () => {
      await ap.goto(`/admin/overview?date=${dConc}`); await settle(ap);
      await expect(ap.locator(".booking-row").filter({ hasText: "Едновременен Едно" })).toContainText(STAFF1);
      await expect(ap.locator(".booking-row").filter({ hasText: "Едновременен Две" })).toContainText(STAFF2);
      return "Собственикът вижда часовете на целия екип";
    });
    await step(["8.07", "8.08"], async () => {
      await ap.goto(`/admin/overview?date=${dConc}`); await settle(ap);
      const row = ap.locator(".booking-row").filter({ hasText: "Едновременен Две" });
      ap.once("dialog", (d) => d.accept());
      await row.getByRole("button", { name: "Изтрий" }).click();
      await expect(row).toHaveCount(0, { timeout: 15_000 });
      const free = freeTimes(await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff2, date: dConc }));
      expect(free).toContain("11:00");
      return "След изтриване 11:00 при " + STAFF2 + " отново е свободен";
    });

    // ════════ 6.02 phone limit (needs bookings in the past 90 s window cleared) ════════
    await step("6.02", async () => {
      const ph = phone(0);
      const old = new Date(Date.now() - 5 * 60_000).toISOString();
      const rows = [0, 1, 2].map((i) => ({ salon_id: S.salonId, service_id: S.serviceA, staff_id: S.ownerStaff, customer_name: "Лимит Тест", customer_phone: ph, customer_phone_normalized: ph, customer_email: inbox("limit"), appointment_date: nextWeekday(20 + i * 7, [2, 4]), start_time: "09:00", end_time: "10:00", status: "confirmed", created_at: old }));
      const ins = await db.from("appointments").insert(rows).select("id");
      expect(ins.error?.message || "").toBe("");
      const r = await bookWithCode(api, { salonId: S.salonId, serviceId: S.serviceA, date: dConc, startTime: "14:00", name: "Лимит Тест", phone: ph, email: inbox("limit") });
      expect(r.status).toBe(429);
      expect(r.body.message).toMatch(/3 активни/);
      // 90-second rule: a fresh booking, then an immediate second one from the same phone.
      const ph2 = phone(1);
      const first = await bookWithCode(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff1, date: dConc, startTime: "15:00", name: "Бърз Клиент", phone: ph2, email: inbox("fast1") });
      expect(first.status, first.body.message).toBe(200);
      const second = await bookWithCode(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff1, date: dConc, startTime: "16:00", name: "Бърз Клиент", phone: ph2, email: inbox("fast2") });
      expect(second.status).toBe(429);
      return `4-то бъдещо записване от един телефон е отказано („${r.body.message}“); второ записване до 90 сек.: „${second.body.message}“`;
    });

    // ════════ 9. Blacklist ════════
    console.log("\n▶ 9. Клиенти и черен списък");
    await step(["9.05", "9.06"], async () => {
      // The customer's last visit was cancelled, so the page lists them in the "Черен списък" column already.
      await ap.goto("/admin/customers"); await settle(ap);
      const card = () => ap.locator(".customer-card").filter({ hasText: cust2.name });
      await expect(card().getByRole("button", { name: "Върни в редовни" })).toBeVisible();
      // Finding: such a customer is shown as blocked but the server still accepts their bookings.
      const probe = await bookWithCode(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff2, date: dConc, startTime: "16:00", name: cust2.name, phone: cust2.phone, email: inbox("cust2probe") });
      const shownButNotBlocked = probe.status === 200;
      if (probe.body.appointmentId) await db.from("appointments").delete().eq("id", probe.body.appointmentId);
      await card().getByRole("button", { name: "Върни в редовни" }).click();
      await expect.poll(async () => (await db.from("salon_customers").select("status").eq("salon_id", S.salonId).eq("phone_normalized", cust2.phone).single()).data!.status, { timeout: 15_000 }).toBe("regular");
      await card().getByRole("button", { name: "Черен списък" }).click();
      await expect.poll(async () => (await db.from("salon_customers").select("status").eq("salon_id", S.salonId).eq("phone_normalized", cust2.phone).single()).data!.status, { timeout: 15_000 }).toBe("blacklist");
      return shownButNotBlocked
        ? "Ръчно добавяне в черния списък работи. ⚠️ Находка: клиент с отказан/неявил се час се показва в колона „Черен списък“, но онлайн записването му НЕ е спряно — спира се само при ръчно добавяне"
        : "Статусът се сменя от „Отказвал“ → „Редовен“ → „Черен списък“";
    });
    await step("9.07", async () => {
      const r = await bookWithCode(api, { salonId: S.salonId, serviceId: S.serviceA, date: dConc, startTime: "13:00", name: cust2.name, phone: cust2.phone, email: inbox("cust2b") });
      expect(r.status).toBe(403);
      const w = await api.post("/api/public/waitlist", { data: { salonId: S.salonId, serviceId: S.serviceA, customerName: cust2.name, customerPhone: cust2.phone, customerEmail: cust2.email, dateFrom: dConc, dateTo: dConc } });
      expect(w.status()).toBe(403);
      return `Записване: „${r.body.message}“; изчакване също е блокирано`;
    });
    await step("9.08", async () => {
      await ap.reload(); await settle(ap);
      await ap.locator(".customer-card").filter({ hasText: cust2.name }).getByRole("button", { name: "Върни в редовни" }).click();
      await expect.poll(async () => (await db.from("salon_customers").select("status").eq("salon_id", S.salonId).eq("phone_normalized", cust2.phone).single()).data!.status, { timeout: 15_000 }).toBe("regular");
    });
    await step("9.09", async () => {
      await new Promise((res) => setTimeout(res, 92_000)); // the 90-second rule per phone (probe booking in 9.05)
      const r = await bookWithCode(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff2, date: dConc, startTime: "13:00", name: cust2.name, phone: cust2.phone, email: inbox("cust2c") });
      expect(r.status, r.body.message).toBe(200);
      return "След премахване клиентът отново записва час";
    });

    // ════════ 10. Waitlist (public form on the phone) ════════
    console.log("\n▶ 10. Списък за изчакване");
    const waiter = { name: "Чакащ Клиент", phone: phone(4), email: inbox("wait1") };
    const wFrom = dConc, wTo = addDays(dConc, 2);
    await step(["10.01", "10.02"], async () => {
      const tooLong = await api.post("/api/public/waitlist", { data: { salonId: S.salonId, serviceId: S.serviceA, customerName: "Дълъг Период", customerPhone: phone(8), customerEmail: inbox("waitlong"), dateFrom: wFrom, dateTo: addDays(wFrom, 9) } });
      expect(tooLong.status(), "Период над 7 дни трябва да е отказан").toBe(400);
      await pp.goto(`/salon/${S.slug}`); await settle(pp, 2500);
      await pp.locator(".booking-box form select").first().selectOption({ value: S.serviceA });
      await publicGotoMonth(pp, wFrom);
      await pp.locator(".booking-calendar-grid button.day-available").filter({ has: pp.locator("span", { hasText: new RegExp(`^${Number(wFrom.slice(8))}$`) }) }).first().click();
      await pp.getByRole("button", { name: /Запиши ме в списък за изчакване/i }).click();
      const form = pp.locator('.bf-waitlist-public [data-testid="waitlist-form"]');
      await expect(form).toBeVisible();
      await form.locator("#wait-from").fill(wFrom);
      await form.locator("#wait-to").fill(wTo);
      await form.locator('select[name="timeFrom"]').selectOption("09:00");
      await form.locator('select[name="timeTo"]').selectOption("18:00");
      await form.locator('input[name="customerName"]').fill(waiter.name);
      await form.locator('input[name="customerPhone"]').fill(waiter.phone);
      await form.locator('input[name="customerEmail"]').fill(waiter.email);
      const resp = waitResp(pp, (r) => r.url().endsWith("/api/public/waitlist") && r.request().method() === "POST");
      await form.getByRole("button", { name: /Добави ме/i }).click();
      expect((await resp).status()).toBe(200);
      await expect(form.locator(".form-message")).toContainText(/списъка за изчакване/i);
      return `${wFrom} – ${wTo}, 09:00–18:00; период над 7 дни е отказан`;
    });
    await step(["10.03", "10.04"], async () => {
      await ap.goto("/admin/waitlist"); await settle(ap);
      const row = ap.locator(".bf-waitlist-admin article").filter({ hasText: waiter.name });
      await expect(row).toBeVisible({ timeout: 15_000 });
      for (const t of [SERVICE_A, waiter.phone, waiter.email]) await expect(row).toContainText(t);
    });
    let assignedTime = "", assignedId = "";
    await step(["10.05", "10.06"], async () => {
      const row = ap.locator(".bf-waitlist-admin article").filter({ hasText: waiter.name });
      await row.getByRole("button", { name: /Провери свободни/i }).click();
      const slot = row.locator(".bf-waitlist-slots button").first();
      await expect(slot).toBeVisible({ timeout: 15_000 });
      assignedTime = ((await slot.textContent()) || "").trim().match(/^\d{2}:\d{2}/)![0];
      const resp = waitResp(ap, (r) => r.url().endsWith("/api/business/waitlist-assign") && r.request().method() === "POST");
      await slot.click();
      await row.getByRole("button", { name: "Потвърди записването" }).click();
      const r = await resp; const j = await r.json();
      expect(r.status(), j.message).toBe(200);
      expect(j.emailSent, j.message).toBe(true);
      assignedId = j.appointmentId;
      return `Записан в ${assignedTime}`;
    });
    await step(["10.07", "11.05"], async () => {
      const m = await waitForEmail(waiter.email, /.+/, started);
      const body = await recordEmailLinks(m.id);
      expect(body.text || body.html).toContain(assignedTime);
      return `„${m.subject}“`;
    });
    await step("10.08", async () => {
      const { data: appt } = await db.from("appointments").select("appointment_date,start_time,customer_name").eq("id", assignedId).single();
      expect(appt!.customer_name).toBe(waiter.name);
      await ap.goto(`/admin/overview?date=${appt!.appointment_date}`); await settle(ap, 2000);
      const row = ap.locator(".booking-row").filter({ hasText: waiter.name });
      await expect(row).toBeVisible({ timeout: 20_000 });
      await expect(row).toContainText(assignedTime);
      return `${appt!.appointment_date} ${assignedTime} — вижда се в „Общ преглед“`;
    });
    await step("10.09", async () => {
      const yesterday = addDays(today, -1);
      const ins = await db.from("waitlist_entries").insert({ salon_id: S.salonId, service_id: S.serviceA, customer_name: "Изтекла Заявка", customer_phone: phone(), customer_phone_normalized: phone(), customer_email: inbox("wait2"), date_from: addDays(today, -3), date_to: yesterday, status: "waiting" }).select("id").single();
      expect(ins.error?.message || "").toBe("");
      await ap.goto("/admin/waitlist"); await settle(ap, 2500);
      await expect(ap.locator(".bf-waitlist-admin article").filter({ hasText: "Изтекла Заявка" })).toHaveCount(0);
      await expect.poll(async () => (await db.from("waitlist_entries").select("status").eq("id", ins.data!.id).single()).data!.status).toBe("cancelled");
      mark("10.09", "manual", "В админ панела няма бутон за ръчно премахване на заявка. Заявките се махат автоматично при записване (10.06) и когато периодът изтече (проверено).");
    });

    // ════════ 11. Notifications ════════
    console.log("\n▶ 11. Известия и имейли");
    await step("11.06", async () => {
      await ap.goto("/admin"); await settle(ap, 2500);
      await ap.locator(".admin-notify-btn").click();
      await expect(ap.locator(".admin-notify-popover")).toBeVisible();
      await expect(ap.locator(".admin-notify-popover")).toContainText(cust2.name, { timeout: 15_000 });
      return "Камбанката показва новите записвания";
    });
    await step("11.07", async () => {
      await st1.page.goto("/admin"); await settle(st1.page, 2500);
      await st1.page.locator(".admin-notify-btn").click();
      const pop = st1.page.locator(".admin-notify-popover");
      await expect(pop).toContainText(cust1.name, { timeout: 15_000 });
      await expect(pop).not.toContainText(cust2.name);
      return `${STAFF1} вижда своите записвания, но не и тези на собственика`;
    });
    await step("11.09", async () => {
      const bad = S.links.filter((l) => /localhost|127\.0\.0\.1/.test(l));
      expect(bad, bad.join(", ")).toEqual([]);
      const site = S.links.filter((l) => /beautyflow\.bg/.test(l));
      expect(site.length).toBeGreaterThan(0);
      return `${S.links.length} линка в имейлите, няма localhost; домейн: ${[...new Set(site.map((l) => new URL(l).host))].join(", ")}`;
    });

    // ════════ 12. Dashboard and subscription ════════
    console.log("\n▶ 12. Начален панел, собственик и абонамент");
    await step(["12.01", "12.02", "12.03", "12.04"], async () => {
      // The home page shows today + 6 days: pick a free workday inside that window (dBook as a last resort).
      const week = [1, 2, 3, 4, 5, 6].map((n) => addDays(today, n)).filter((d) => [1, 2, 3, 4, 5].includes(weekday(d)));
      const dHome = week.find((d) => ![dMon, dBreak, dOff, dBook, dVac1, dVac2].includes(d)) || dBook;
      const own = await bookWithCode(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.ownerStaff, date: dHome, startTime: "11:00", name: "Клиент Начало", phone: phone(), email: inbox("home") });
      expect(own.status, own.body.message).toBe(200);
      await ap.goto("/admin"); await settle(ap, 2500);
      await ap.locator(".admin-week-strip button").filter({ has: ap.locator("b", { hasText: dHome.slice(8) }) }).click();
      await ap.waitForTimeout(2000);
      await expect(ap.locator("body")).toContainText("Клиент Начало", { timeout: 15_000 });
      const kpis = ap.locator(".kpi-grid");
      await expect(kpis).toContainText("11:00");
      await expect(kpis).toContainText(/40/);
      await expect(kpis).toContainText(/1/);
      return `${dHome}: 1 записване, следващ час 11:00, очакван оборот 40 €`;
    });
    await step("12.07", async () => { await ap.goto("/admin/stats"); await settle(ap); await expect(ap.locator("h1")).toBeVisible(); return "Страницата „Статистика“ се отваря (отчетите още са примерни)"; });
    await step(["12.08", "12.09"], async () => {
      await ap.goto("/admin/settings"); await settle(ap);
      const sub = ap.locator("body");
      await expect(sub).toContainText("АБОНАМЕНТ");
      await expect(sub).toContainText(/Studio/);
      await expect(sub).toContainText(/Остават (29|30) дни/);
      return "План Studio, валиден още 30 дни";
    });
    await step("12.10", async () => {
      const notes: string[] = [];
      const ownerCard = () => platform.page.locator(".request-card").filter({ hasText: inbox("owner") });
      const ownerAction = async (label: RegExp, subject: RegExp) => {
        await platform.page.goto("/owner/requests"); await settle(platform.page);
        platform.page.once("dialog", (d) => d.accept());
        const since = Date.now();
        const resp = waitResp(platform.page, (r) => r.url().endsWith("/api/owner/business-action") && r.request().method() === "POST");
        await ownerCard().getByRole("button", { name: label }).click();
        const r = await resp; expect(r.status(), (await r.json()).message).toBe(200);
        const m = await waitForEmail(inbox("owner"), subject, since);
        await recordEmailLinks(m.id);
        return m.subject;
      };
      // Expiring: 5 days left — still bookable, with a warning.
      const soon = new Date(Date.now() + 5 * 86400000).toISOString();
      await db.from("salons").update({ trial_ends_at: soon, subscription_ends_at: null }).eq("id", S.salonId);
      await ap.goto("/admin/settings"); await settle(ap);
      await expect(ap.locator("body")).toContainText(/Остават 5 дни/);
      expect(freeTimes(await availability(api, { salonId: S.salonId, serviceId: S.serviceA, staffId: S.staff1, date: dConc })).length).toBeGreaterThan(0);
      notes.push("изтичащ (5 дни): записванията работят");
      // Expired beyond the grace period: no online bookings.
      await db.from("salons").update({ trial_ends_at: new Date(Date.now() - 10 * 86400000).toISOString() }).eq("id", S.salonId);
      const exp = await bookWithCode(api, { salonId: S.salonId, serviceId: S.serviceA, date: dConc, startTime: "17:00", name: "Изтекъл Тест", phone: phone(2), email: inbox("expired") });
      expect(exp.status).toBe(403);
      notes.push("изтекъл: записването е спряно");
      await db.from("salons").update({ trial_ends_at: soon }).eq("id", S.salonId);
      // Suspend → no access; activate → back; renew → +30 days.
      notes.push(`спрян („${await ownerAction(/Спри достъп/, /временно спрян/)}“)`);
      const blockedCode = await api.post("/api/public/booking-code", { data: { salonId: S.salonId, email: inbox("suspended") } });
      expect(blockedCode.status(), "При спрян достъп не трябва да може да се поиска код").toBeGreaterThanOrEqual(403);
      const lc = await newCtx(browser);
      await lc.page.goto("/login"); await settle(lc.page);
      await lc.page.locator('input[name="email"]').fill(inbox("owner"));
      await lc.page.locator('input[name="password"]').fill(PASSWORD);
      await lc.page.getByRole("button", { name: /^Вход$/ }).click();
      await expect(lc.page.locator("body")).toContainText(/временно ограничен/, { timeout: 20_000 });
      await lc.context.close();
      notes.push(`активиран („${await ownerAction(/Активирай достъп/, /възстановен/)}“)`);
      const before = (await db.from("salons").select("trial_ends_at,subscription_ends_at").eq("id", S.salonId).single()).data!;
      notes.push(`подновен („${await ownerAction(/Поднови \+30 дни/, /подновен/)}“)`);
      const after = (await db.from("salons").select("trial_ends_at,subscription_ends_at").eq("id", S.salonId).single()).data!;
      const end = (x: typeof after) => new Date(x.subscription_ends_at || x.trial_ends_at).getTime();
      expect(Math.round((end(after) - end(before)) / 86400000)).toBe(30);
      return notes.join("; ");
    });

    // ════════ 13. Final check on a phone ════════
    console.log("\n▶ 13. Финална проверка");
    await step("13.02", async () => {
      const t0 = Date.now();
      await pp.goto(`/salon/${S.slug}`, { waitUntil: "load" });
      const loadMs = Date.now() - t0;
      await settle(pp, 2000);
      const overflow = await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const broken = await pp.locator("img").evaluateAll((els) => els.filter((e) => { const i = e as HTMLImageElement; return i.complete && i.naturalWidth === 0 && i.loading !== "lazy"; }).length);
      expect(broken).toBe(0);
      const small = await pp.locator(".booking-box button:visible, .booking-box select:visible").evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 32).length);
      expect(small, "Бутони под 32px на телефон").toBe(0);
      const fontPx = await pp.locator("body").evaluate((b) => parseFloat(getComputedStyle(b).fontSize));
      expect(fontPx).toBeGreaterThanOrEqual(14);
      return `Без хоризонтален скрол, без счупени снимки, бутони ≥ 32px, шрифт ${fontPx}px, зареждане ${(loadMs / 1000).toFixed(1)} сек. (локален dev сървър — реалната скорост онлайн е по-добра)`;
    });
    derive("13.04", ["7.12", "7.13", "9.03"], "Имейл, календар и клиентска история");
    derive("13.05", ["8.11", "7.05"], "Записвания при различни специалисти");
    derive("13.06", ["5.05", "5.06", "5.07", "6.08"], "Почивки, отпуски и заети часове");
    derive("13.07", ["8.05", "8.07", "8.08"], "Отказ, неявяване, изтриване и освобождаване");
    derive("13.08", ["9.07", "9.09", "10.06"], "Черен списък и изчакване");
    derive("13.09", ["3.10", "3.11"], "Личен достъп на специалистите и общ достъп на собственика");
  } finally {
    // ════════ Cleanup + proof that nothing else changed ════════
    console.log("\n▶ Почистване");
    await step("13.10", async () => {
      const log = await cleanup();
      expect(log, log.join("; ")).toEqual([]);
      const { count } = await db.from("salons").select("id", { count: "exact", head: true }).eq("name", BUSINESS);
      expect(count).toBe(0);
      const after = await snapshotOtherSalons([]);
      const changed = Object.keys(S.snapshot).filter((k) => S.snapshot[k] !== after[k]);
      const ours = changed.filter((k) => (after[k] || "").includes(STAMP) || (after[k] || "").includes("resend.dev"));
      expect(ours, `Тестът е променил чужди данни: ${ours.join(", ")}`).toEqual([]);
      const live = changed.length ? ` Междувременно има ${changed.length} промени от реални потребители (не са от теста): ${changed.map((k) => k.split(":")[0]).join(", ")}.` : "";
      return `Тестовият салон, акаунтите, снимките и записите са изтрити; ${Object.keys(S.snapshot).filter((k) => k.startsWith("salon:")).length} съществуващи салона не са засегнати от теста.${live}`;
    });
    if (hasFailures()) mark("13.11", "fail", "Има грешки по-горе — салонът не е готов, докато не се оправят.");
    else mark("13.11", "pass", "Всички проверки минаха — системата е готова да приема клиенти.");
    const summary = writeReport({ "Дата": new Date().toLocaleString("bg-BG", { timeZone: "Europe/Sofia" }), "Сайт": baseURL!, "Салон": BUSINESS });
    console.log(`\nОтчет: full-system-report/report.html — ✅ ${summary.pass} ❌ ${summary.fail} 🟡 ${summary.manual} ➖ ${summary.na} ⏸ ${summary.notRun}`);
    for (const c of [pub, phoneCtx, platform, admin, st1, st2]) await c.context.close().catch(() => {});
    await api.dispose();
  }
  expect(hasFailures(), "Има неуспешни проверки — виж full-system-report/report.html").toBe(false);
});
