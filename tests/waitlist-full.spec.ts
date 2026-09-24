import { test, expect, Page } from "@playwright/test";
import { settle, watchPage } from "./helpers";

const MONTHS: Record<string, number> = {
  "Януари": 1, "Февруари": 2, "Март": 3, "Април": 4,
  "Май": 5, "Юни": 6, "Юли": 7, "Август": 8,
  "Септември": 9, "Октомври": 10, "Ноември": 11, "Декември": 12,
};
const pad = (n:number) => String(n).padStart(2,"0");

async function selectedPublicDate(page:Page){
  const h=((await page.locator(".booking-calendar-head strong").textContent())||"").trim();
  const [m,y]=h.split(/\s+/);
  const day=Number(((await page.locator(".booking-calendar-grid button.selected span").first().textContent())||"").trim());
  if(!MONTHS[m]||!Number(y)||!day) throw new Error(`Не успях да разчета публичната дата: ${h}`);
  return `${y}-${pad(MONTHS[m])}-${pad(day)}`;
}

async function chooseAdminDate(page:Page,iso:string){
  const [ty,tm,td]=iso.split("-").map(Number);
  const trigger=page.locator(".admin-date-trigger");
  await expect(trigger).toBeVisible({timeout:15000});
  await trigger.click();
  const head=page.locator(".admin-date-head strong");
  await expect(head).toBeVisible({timeout:10000});
  for(let i=0;i<30;i++){
    const h=((await head.textContent())||"").trim();
    const [mn,yr]=h.split(/\s+/); const cm=MONTHS[mn],cy=Number(yr);
    if(!cm||!cy) throw new Error(`Не успях да разчета админ календара: ${h}`);
    if(cy===ty&&cm===tm) break;
    const buttons=page.locator(".admin-date-head button");
    await ((ty*12+tm)>(cy*12+cm)?buttons.last():buttons.first()).click();
    await expect(head).toBeVisible();
  }
  const day=page.locator(".admin-date-grid button").filter({has:page.locator("b",{hasText:new RegExp(`^${td}$`)})}).first();
  await expect(day).toBeVisible(); await day.click(); await page.waitForTimeout(700);
}

test("waitlist -> admin -> assign slot -> calendar -> cleanup", async ({page})=>{
  test.setTimeout(90_000);
  const slug=process.env.TEST_SALON_SLUG?.trim();
  if(!slug) throw new Error("Добави TEST_SALON_SLUG в .env.test.local");
  const verify=watchPage(page);
  const stamp=Date.now().toString();
  const name=`E2E Waitlist ${stamp.slice(-6)}`;
  const phone=`088${stamp.slice(-7)}`;
  const email=`wait-${stamp}@example.com`;

  await page.goto(`/salon/${encodeURIComponent(slug)}`); await settle(page);
  const service=page.locator(".booking-box form select").first();
  await expect(service).toBeVisible();
  expect(await service.locator("option").count()).toBeGreaterThan(1);
  await service.selectOption({index:1});
  const serviceName=((await service.locator("option:checked").textContent())||"").split("·")[0].trim();

  let day=page.locator(".booking-calendar-grid button.day-available:not([disabled])").first();
  for(let i=0;i<6;i++){
    await page.waitForTimeout(700);
    if(await day.isVisible().catch(()=>false)) break;
    const next=page.locator(".booking-calendar-head button").last();
    if(!(await next.isEnabled().catch(()=>false))) break;
    await next.click();
  }
  await expect(day,"Няма подходящ ден за waitlist теста.").toBeVisible();
  await day.click();
  const date=await selectedPublicDate(page);

  await page.getByRole("button",{name:/Запиши ме в списък за изчакване/i}).click();
  const form=page.locator('.bf-waitlist-public [data-testid="waitlist-form"]');
  await expect(form).toBeVisible();
  await expect(form.locator('input[aria-readonly="true"]')).toHaveValue(serviceName);
  await form.locator('select[name="timeFrom"]').selectOption("00:00");
  await form.locator('select[name="timeTo"]').selectOption("23:30");
  await form.locator('input[name="customerName"]').fill(name);
  await form.locator('input[name="customerPhone"]').fill(phone);
  await form.locator('input[name="customerEmail"]').fill(email);
  const waitResponse=page.waitForResponse(r=>r.url().endsWith("/api/public/waitlist")&&r.request().method()==="POST");
  await form.getByRole("button",{name:/Добави ме/i}).click();
  const wr=await waitResponse; const wj=await wr.json().catch(()=>({}));
  expect(wr.status(),`waitlist API: ${JSON.stringify(wj)}`).toBe(200);
  expect(wj.ok).toBe(true);
  await expect(form.locator(".form-message")).toContainText(/списъка за изчакване/i);

  await page.goto("/admin/waitlist"); await settle(page);
  const row=page.locator(".bf-waitlist-admin article").filter({hasText:name}).first();
  await expect(row,"Заявката не се появи в Админ → Изчакване.").toBeVisible({timeout:15000});
  await expect(row).toContainText(serviceName);
  await expect(row).toContainText(phone);
  await expect(row).toContainText(email);

  const availResponse=page.waitForResponse(r=>r.url().includes("/api/public/availability?")&&r.request().method()==="GET");
  await row.getByRole("button",{name:/Провери свободни/i}).click();
  expect((await availResponse).status()).toBe(200);
  const slot=row.locator(".bf-waitlist-slots button").first();
  await expect(slot,"Админът не получи свободен час за waitlist клиента.").toBeVisible({timeout:15000});
  const slotText=((await slot.textContent())||"").trim();
  const time=(slotText.match(/^\d{2}:\d{2}/)||[])[0];
  expect(time,"Не успях да разчета свободния час.").toBeTruthy();

  page.once("dialog",async d=>{ expect(d.type()).toBe("confirm"); await d.accept(); });
  const assignResponse=page.waitForResponse(r=>r.url().endsWith("/api/business/waitlist-assign")&&r.request().method()==="POST");
  await slot.click();
  const ar=await assignResponse; const aj=await ar.json().catch(()=>({}));
  expect(ar.status(),`waitlist-assign API: ${JSON.stringify(aj)}`).toBe(200);
  expect(aj.ok).toBe(true);
  await expect(page.locator(".bf-waitlist-admin article").filter({hasText:name})).toHaveCount(0,{timeout:15000});

  await page.goto("/admin/calendar"); await settle(page); await chooseAdminDate(page,date);
  const appointment=page.locator(".calendar-appointment").filter({hasText:name}).first();
  await expect(appointment,"Waitlist клиентът не се появи в календара след назначаване.").toBeVisible({timeout:15000});
  await expect(appointment).toContainText(serviceName);
  await expect(appointment).toContainText(time);

  page.once("dialog",async d=>{ await d.accept(); });
  await appointment.getByRole("button",{name:"Изтрий часа"}).click();
  await expect(appointment).toHaveCount(0,{timeout:15000});
  await verify();
});
