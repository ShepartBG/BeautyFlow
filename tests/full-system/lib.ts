import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { CHECKLIST } from "./checklist";

// ── Environment ──────────────────────────────────────────────────────────────
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  ownerEmail: process.env.TEST_OWNER_EMAIL?.trim() || "",
  ownerPassword: process.env.TEST_OWNER_PASSWORD || "",
  platformInbox: process.env.BEAUTYFLOW_OWNER_EMAIL?.trim().toLowerCase() || "",
  resendReadKey: process.env.RESEND_USAGE_API_KEY || "",
  resendSendKey: process.env.RESEND_API_KEY || "",
};

export function assertEnvironment(baseURL: string) {
  const missing = Object.entries({
    NEXT_PUBLIC_SUPABASE_URL: env.supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: env.serviceKey,
    TEST_OWNER_EMAIL: env.ownerEmail,
    TEST_OWNER_PASSWORD: env.ownerPassword,
    RESEND_API_KEY: env.resendSendKey,
    RESEND_USAGE_API_KEY: env.resendReadKey,
  }).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`Липсват настройки: ${missing.join(", ")}`);
  if (/disabled/i.test(env.resendSendKey)) throw new Error("RESEND_API_KEY е изключен — пълният тест изисква реално изпращане на имейли.");
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(baseURL)) throw new Error("Пълният тест се пуска само срещу локален сървър.");
}

/** Refuses to run when the Resend daily quota is nearly used: the live site needs it for booking codes. */
export async function assertEmailQuota(minRemaining = 50) {
  const r = await fetch("https://api.resend.com/usage", { headers: { Authorization: `Bearer ${env.resendReadKey}` } });
  if (!r.ok) throw new Error(`Не успях да проверя квотата в Resend (${r.status}).`);
  const d = (await r.json()).emails?.daily || {};
  // Paid plans have no daily limit (limit: null).
  if (d.limit === null || d.limit === undefined) return { used: d.used ?? 0, limit: "без лимит", left: Infinity };
  const left = Number(d.limit) - Number(d.used);
  if (Number.isFinite(left) && left < minRemaining) {
    throw new Error(`Спрях теста: днес в Resend остават само ${Math.max(0, left)} имейла от ${d.limit}. Пълният тест праща около 35, а живият сайт има нужда от тях за кодовете при записване. Квотата се подновява в ${new Date(d.resets_at).toLocaleString("bg-BG", { timeZone: "Europe/Sofia" })}.`);
  }
  return { used: d.used, limit: d.limit, left };
}

export const db = createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// ── Dates (Europe/Sofia) ─────────────────────────────────────────────────────
export const pad = (n: number) => String(n).padStart(2, "0");
export function sofiaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
/** First date ≥ today+minDays that falls on one of the given weekdays (default Mon–Fri). */
export function nextWeekday(minDays: number, days = [1, 2, 3, 4, 5], skip: string[] = []) {
  for (let i = minDays; i < minDays + 60; i++) {
    const d = addDays(sofiaToday(), i);
    if (days.includes(weekday(d)) && !skip.includes(d)) return d;
  }
  throw new Error("Няма подходящ работен ден в следващите 60 дни.");
}
export const MONTHS: Record<string, number> = { "Януари": 1, "Февруари": 2, "Март": 3, "Април": 4, "Май": 5, "Юни": 6, "Юли": 7, "Август": 8, "Септември": 9, "Октомври": 10, "Ноември": 11, "Декември": 12 };

// ── Report ───────────────────────────────────────────────────────────────────
export type Status = "pass" | "fail" | "manual" | "na" | "not-run";
type Entry = { status: Status; note: string; at: string };
const results = new Map<string, Entry>();
const REPORT_DIR = path.join(process.cwd(), "full-system-report");

export function mark(id: string, status: Status, note = "") {
  if (!CHECKLIST.some((s) => s.items.some((i) => i.id === id))) throw new Error(`Непозната точка ${id}`);
  const prev = results.get(id);
  // A failure is never overwritten by a later pass of the same item.
  if (prev?.status === "fail" && status === "pass") return;
  results.set(id, { status, note, at: new Date().toISOString() });
  const icon = { pass: "✅", fail: "❌", manual: "🟡", na: "➖", "not-run": "⏸" }[status];
  console.log(`  ${icon} ${id} ${note}`);
}

/** Runs one checklist item. A failure is recorded; critical items stop the run. */
export async function step(id: string | string[], fn: () => Promise<string | void>, opts: { critical?: boolean } = {}) {
  const ids = Array.isArray(id) ? id : [id];
  const started = new Date().toISOString();
  try {
    const note = (await fn()) || "";
    // An item the step marked itself (e.g. "manual" or "na") keeps that status.
    ids.filter((i) => !(results.get(i)?.at && results.get(i)!.at >= started)).forEach((i) => mark(i, "pass", note));
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).split("\n").slice(0, 3).join(" ").slice(0, 400);
    ids.forEach((i) => mark(i, "fail", msg));
    if (opts.critical) throw e;
  }
}

export function writeReport(meta: Record<string, string>) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const sections = CHECKLIST.map((s) => ({
    title: s.title,
    items: s.items.map((i) => ({ ...i, ...(results.get(i.id) || { status: "not-run" as Status, note: "Не е стигнато до тази стъпка (виж първата грешка по-горе).", at: "" }) })),
  }));
  const all = sections.flatMap((s) => s.items);
  const count = (st: Status) => all.filter((i) => i.status === st).length;
  const summary = { pass: count("pass"), fail: count("fail"), manual: count("manual"), na: count("na"), notRun: count("not-run"), total: all.length };
  fs.writeFileSync(path.join(REPORT_DIR, "report.json"), JSON.stringify({ meta, summary, sections }, null, 2));

  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const badge = { pass: "✅ Минава", fail: "❌ Грешка", manual: "🟡 Ръчно", na: "➖ Неприложимо", "not-run": "⏸ Не е изпълнено" };
  const html = `<!doctype html><html lang="bg"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BeautyFlow пълен тест</title>
<style>body{font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif;margin:0;background:#f6f4f8;color:#1f1b26}main{max-width:1000px;margin:0 auto;padding:32px 16px}
h1{margin:0 0 4px}.meta{color:#6b6474;font-size:13px}.sum{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}.sum b{padding:8px 14px;border-radius:12px;background:#fff;border:1px solid #e3dde9}
section{margin-top:26px}h2{font-size:18px;margin:0 0 8px}table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}
td{padding:9px 12px;border-top:1px solid #eee8f2;vertical-align:top}td:first-child{width:52px;font-weight:700;color:#6b6474}td:nth-child(3){white-space:nowrap;font-weight:700}
.note{color:#6b6474;font-size:13px}.fail td{background:#fff2f1}.not-run td{background:#faf8fb;color:#8a8292}</style>
<main><h1>BeautyFlow — пълен системен тест</h1><p class="meta">${Object.entries(meta).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(" · ")}</p>
<div class="sum"><b>✅ ${summary.pass}</b><b>❌ ${summary.fail}</b><b>🟡 ${summary.manual}</b><b>➖ ${summary.na}</b><b>⏸ ${summary.notRun}</b><b>Общо ${summary.total}</b></div>
${sections.map((s) => `<section><h2>${esc(s.title)}</h2><table>${s.items.map((i) => `<tr class="${i.status}"><td>${i.id}</td><td>${esc(i.text)}<div class="note">${esc(i.note)}</div></td><td>${badge[i.status]}</td></tr>`).join("")}</table></section>`).join("")}
</main></html>`;
  fs.writeFileSync(path.join(REPORT_DIR, "report.html"), html);
  return summary;
}

// ── Resend (reading sent emails via the read-capable key) ───────────────────
export type SentEmail = { id: string; to: string[]; subject: string; created_at: string; last_event?: string };
async function resendGet(url: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${env.resendReadKey}` } });
    if (r.status === 429) { await new Promise((res) => setTimeout(res, 1200)); continue; }
    if (!r.ok) throw new Error(`Resend API ${r.status}`);
    return r.json();
  }
  throw new Error("Resend API rate limit");
}
/** Waits until an email to `to` whose subject matches appears after `since`. */
export async function waitForEmail(to: string, subject: RegExp, since: number, timeoutMs = 90_000): Promise<SentEmail> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const j = await resendGet("https://api.resend.com/emails?limit=100");
    const hit = (j.data as SentEmail[] | undefined)?.find((e) =>
      e.to.some((t) => t.toLowerCase() === to.toLowerCase()) && subject.test(e.subject) && new Date(e.created_at).getTime() >= since - 5_000);
    if (hit) return hit;
    await new Promise((res) => setTimeout(res, 2500));
  }
  throw new Error(`Не пристигна имейл до ${to.replace(/^(.{3}).*@/, "$1…@")} с тема ${subject}`);
}
export async function emailBody(id: string): Promise<{ html: string; text: string; subject: string }> {
  const j = await resendGet(`https://api.resend.com/emails/${id}`);
  return { html: j.html || "", text: j.text || "", subject: j.subject || "" };
}
export function linksIn(html: string) {
  return [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
}

// ── UI helpers ──────────────────────────────────────────────────────────────
export async function settle(page: Page, ms = 1200) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(ms);
}
export async function acceptCookies(page: Page) {
  await page.addInitScript(() => {
    try { localStorage.setItem("beautyflow-cookie-consent-v3", JSON.stringify({ necessary: true, analytics: false, marketing: false })); } catch { /* ignore */ }
  });
}
export async function login(page: Page, email: string, password: string, expectUrl = /\/(admin|owner)(?:\/|$)/) {
  await page.goto("/login");
  await settle(page);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /^Вход$/ }).click();
  await page.waitForURL(expectUrl, { timeout: 30_000 });
}
export async function chooseAdminDate(page: Page, iso: string, root: { locator: Page["locator"] } = page) {
  const [ty, tm, td] = iso.split("-").map(Number);
  await root.locator(".admin-date-trigger").first().click();
  const head = page.locator(".admin-date-head strong");
  await expect(head).toBeVisible({ timeout: 12_000 });
  for (let i = 0; i < 30; i++) {
    const [mn, yr] = (await head.innerText()).trim().split(/\s+/);
    const cm = MONTHS[mn], cy = Number(yr);
    if (cy === ty && cm === tm) break;
    const b = page.locator(".admin-date-head button");
    await (ty * 12 + tm > cy * 12 + cm ? b.last() : b.first()).click();
  }
  const day = page.locator(".admin-date-grid button").filter({ has: page.locator("b", { hasText: new RegExp(`^${td}$`) }) }).first();
  await expect(day).toBeVisible();
  await day.click();
  await page.waitForTimeout(800);
}
export async function publicGotoMonth(page: Page, iso: string) {
  const [ty, tm] = iso.split("-").map(Number);
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(350);
    const [mn, yr] = ((await page.locator(".booking-calendar-head strong").textContent()) || "").trim().split(/\s+/);
    const cm = MONTHS[mn], cy = Number(yr);
    if (cy === ty && cm === tm) return;
    const b = page.locator(".booking-calendar-head button");
    await (ty * 12 + tm > cy * 12 + cm ? b.last() : b.first()).click();
  }
  throw new Error(`Публичният календар не стигна до ${iso}`);
}

// ── Public API helpers (same endpoints the website uses) ────────────────────
export async function availability(request: APIRequestContext, q: { salonId: string; serviceId: string; staffId?: string; date: string }) {
  const p = new URLSearchParams({ salonId: q.salonId, serviceId: q.serviceId, date: q.date, ...(q.staffId ? { staffId: q.staffId } : {}) });
  const r = await request.get(`/api/public/availability?${p}`);
  expect(r.status(), "availability API").toBe(200);
  return (await r.json()) as { timeline?: { time: string; status: string; staffId?: string }[]; message?: string };
}
export async function monthAvailability(request: APIRequestContext, q: { salonId: string; serviceId: string; staffId?: string; month: string }) {
  const [y, m] = q.month.split("-");
  const p = new URLSearchParams({ salonId: q.salonId, serviceId: q.serviceId, year: String(Number(y)), month: String(Number(m)), ...(q.staffId ? { staffId: q.staffId } : {}) });
  const r = await request.get(`/api/public/month-availability?${p}`);
  expect(r.status(), "month-availability API").toBe(200);
  return ((await r.json()).days || {}) as Record<string, string>;
}
export const freeTimes = (a: { timeline?: { time: string; status: string }[] }) => (a.timeline || []).filter((x) => x.status === "available").map((x) => x.time);

/** Requests a booking code by email and reads it back from the sent email. */
export async function bookingCode(request: APIRequestContext, salonId: string, email: string) {
  const since = Date.now();
  const r = await request.post("/api/public/booking-code", { data: { salonId, email } });
  const j = await r.json();
  if (r.status() !== 200) return { status: r.status(), message: j.message as string, code: "", verificationId: "" };
  expect(j.testCode, "Сървърът не трябва да връща тестов код в реален режим").toBeUndefined();
  const mail = await waitForEmail(email, /код за потвърждение: \d{6}/, since);
  const code = mail.subject.match(/(\d{6})/)![1];
  return { status: 200, message: j.message as string, code, verificationId: j.verificationId as string, mailId: mail.id };
}
export async function apiBook(request: APIRequestContext, b: { salonId: string; serviceId: string; staffId?: string; date: string; startTime: string; name: string; phone: string; email: string; note?: string; verificationId?: string; code?: string; acceptedTerms?: boolean }) {
  const r = await request.post("/api/public/book", {
    data: {
      salonId: b.salonId, serviceId: b.serviceId, staffId: b.staffId || "", date: b.date, startTime: b.startTime,
      customerName: b.name, customerPhone: b.phone, customerEmail: b.email, note: b.note || "",
      acceptedTerms: b.acceptedTerms ?? true, verificationId: b.verificationId || "", verificationCode: b.code || "",
    },
  });
  return { status: r.status(), body: await r.json() };
}
/** Books through the public API with a real emailed code. */
export async function bookWithCode(request: APIRequestContext, b: Parameters<typeof apiBook>[1]) {
  const c = await bookingCode(request, b.salonId, b.email);
  expect(c.status, `booking-code: ${c.message}`).toBe(200);
  const res = await apiBook(request, { ...b, verificationId: c.verificationId, code: c.code });
  if (res.status === 200) await request.post("/api/public/booking-notify", { data: { appointmentId: res.body.appointmentId } });
  return res;
}

/** Marks an item from the results of other items (summary checks in section 13). */
export function derive(id: string, deps: string[], note: string) {
  const st = deps.map((d) => results.get(d)?.status || "not-run");
  if (st.every((s) => s === "pass" || s === "na")) mark(id, "pass", note);
  else mark(id, "fail", `Зависи от ${deps.filter((_, i) => st[i] !== "pass" && st[i] !== "na").join(", ")}`);
}
export const hasFailures = () => [...results.values()].some((r) => r.status === "fail");
