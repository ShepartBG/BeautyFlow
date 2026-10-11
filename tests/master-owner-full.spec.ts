import{test,expect}from"@playwright/test";
import{createClient}from"@supabase/supabase-js";
import{isoToday}from"../lib/beautyflow/date";

const base=process.env.TEST_BASE_URL||"http://127.0.0.1:3000";
const local=/localhost|127\.0\.0\.1/.test(base);
const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,key=process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminEmail=process.env.TEST_ADMIN_EMAIL!;
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const stamp=Date.now().toString().slice(-8);
const phone=`08${stamp}`.slice(0,10);
const cname=`MASTER OWNER ${stamp}`;

async function ownerSalon(){
 const {data:u}=await db.auth.admin.listUsers({page:1,perPage:1000});
 const uid=u.users.find(x=>x.email?.toLowerCase()===adminEmail.toLowerCase())?.id;
 if(!uid)throw new Error("TEST_ADMIN_EMAIL auth user not found");
 const {data:s}=await db.from("staff").select("salon_id,id").eq("user_id",uid).eq("is_owner",true).is("deleted_at",null).limit(1).maybeSingle();
 if(!s)throw new Error("TEST_ADMIN_EMAIL is not mapped to an owner staff profile");
 return s;
}
async function futureWorkDate(salonId:string,staffId:string){
 const {data:h}=await db.from("staff_working_hours").select("weekday,enabled,start_time,end_time").eq("salon_id",salonId).eq("staff_id",staffId).eq("enabled",true);
 for(let add=8;add<30;add++){const d=new Date();d.setDate(d.getDate()+add);const iso=d.toISOString().slice(0,10),wd=d.getDay(),r=h?.find(x=>x.weekday===wd);if(r)return{date:iso,row:r}}
 throw new Error("No future enabled owner working day");
}
async function apiAvailability(page:any,salonId:string,serviceId:string,staffId:string,date:string){
 return await page.evaluate(async({salonId,serviceId,staffId,date})=>{const r=await fetch(`/api/public/availability?salonId=${salonId}&serviceId=${serviceId}&staffId=${staffId}&date=${date}`,{cache:"no-store"});return await r.json()},{salonId,serviceId,staffId,date});
}
test("MASTER FULL OWNER: every owner control and effect",async({page})=>{
 test.skip(!local,"Destructive master suite is local-only");
 test.setTimeout(240000);
 const own=await ownerSalon(),salonId=own.salon_id,staffId=own.id;
 const made:{service?:string;off?:string;appointment?:string}={};
 try{
  console.log("[FULL] ▶ SETTINGS / BOOKING RULES / SUBSCRIPTION SURFACE");
  await page.goto("/admin/settings");await expect(page.getByRole("heading",{name:"Настройки на бизнеса"})).toBeVisible();
  await expect(page.getByText("АБОНАМЕНТ",{exact:true})).toBeVisible();
  const settings=page.locator("form").first();
  const notice=settings.locator("select").first();await notice.selectOption("360");
  const notify=settings.locator('input[type="checkbox"]').last();const before=await notify.isChecked();await notify.evaluate((el:any)=>{el.checked=!el.checked;el.dispatchEvent(new Event("change",{bubbles:true}))});
  await settings.getByRole("button",{name:"Запази всички настройки"}).click();await expect(settings.locator(".form-message")).toContainText("запазени");
  let bs=(await db.from("booking_settings").select("*").eq("salon_id",salonId).single()).data;expect(bs.min_notice_hours).toBe(6);expect(bs.notify_new_booking).toBe(!before);
  await notice.selectOption("180");await notify.evaluate((el:any)=>{el.checked=before;el.dispatchEvent(new Event("change",{bubbles:true}))});await settings.getByRole("button",{name:"Запази всички настройки"}).click();
  console.log("[FULL] ✓ SETTINGS / BOOKING RULES / SUBSCRIPTION SURFACE");

  console.log("[FULL] ▶ SERVICE CREATE / BUFFER / EDIT / HIDE / SHOW");
  await page.goto("/admin/services");const add=page.locator("form").first();
  await add.locator('[name="name"]').fill(`FULL услуга ${stamp}`);await add.locator('[name="price"]').fill("37");await add.locator('[name="duration"]').fill("45");
  await add.locator('input[type="checkbox"]').check({force:true});await add.locator('[name="buffer"]').fill("15");await add.getByRole("button",{name:"Добави"}).click();await expect(page.getByText("Услугата е добавена.")).toBeVisible();
  let sv=(await db.from("services").select("*").eq("salon_id",salonId).eq("name",`FULL услуга ${stamp}`).single()).data;made.service=sv.id;expect(sv.buffer_min).toBe(15);
  const row=page.locator(".bf-service-manage-row").filter({hasText:`FULL услуга ${stamp}`});await row.getByRole("button",{name:"Редактирай"}).click();
  const ef=row.locator("form");const inputs=ef.locator("input");await inputs.nth(0).fill(`FULL редактирана ${stamp}`);await inputs.nth(1).fill("42");await inputs.nth(2).fill("50");await inputs.nth(3).fill("10");await ef.getByRole("button",{name:"Запази"}).click();await expect(page.getByText("Промените в услугата са запазени.")).toBeVisible();
  let edited=(await db.from("services").select("*").eq("id",made.service).single()).data;expect(edited.name).toContain("редактирана");expect(Number(edited.price)).toBe(42);expect(edited.duration_min).toBe(50);expect(edited.buffer_min).toBe(10);
  let erow=page.locator(".bf-service-manage-row").filter({hasText:`FULL редактирана ${stamp}`});await erow.getByRole("button",{name:"Активна"}).click();await expect.poll(async()=>((await db.from("services").select("active").eq("id",made.service).single()).data?.active)).toBe(false);
  await page.reload();erow=page.locator(".bf-service-manage-row").filter({hasText:`FULL редактирана ${stamp}`});await erow.getByRole("button",{name:"Скрита"}).click();await expect.poll(async()=>((await db.from("services").select("active").eq("id",made.service).single()).data?.active)).toBe(true);
  console.log("[FULL] ✓ SERVICE CREATE / BUFFER / EDIT / HIDE / SHOW");

  console.log("[FULL] ▶ 1-HOUR BREAK / REMOVE / PUBLIC AVAILABILITY EFFECT");
  const work=await futureWorkDate(salonId,staffId);await page.goto("/admin/schedule");
  const breakCard=page.locator(".dash-card").filter({hasText:"Почивка за конкретна дата"});const dateInput=breakCard.locator('input[type="date"]');if(await dateInput.count())await dateInput.fill(work.date);else await db.from("staff_time_off").delete().eq("salon_id",salonId).eq("staff_id",staffId).eq("off_date",work.date);
  const sels=breakCard.locator("select");await sels.nth(0).selectOption("13:00");await sels.nth(1).selectOption("14:00");await breakCard.locator('[name="note"]').fill(`FULL 1h ${stamp}`);await breakCard.getByRole("button",{name:"Добави почивка"}).click();
  await expect.poll(async()=>{const{data}=await db.from("staff_time_off").select("id").eq("salon_id",salonId).eq("staff_id",staffId).eq("note",`FULL 1h ${stamp}`).maybeSingle();made.off=data?.id;return!!data}).toBe(true);
  const av1=await apiAvailability(page,salonId,made.service!,staffId,work.date);const blocked=(av1.timeline||[]).filter((x:any)=>x.time>="13:00"&&x.time<"14:00");expect(blocked.some((x:any)=>x.status==="available")).toBe(false);
  const ex=page.locator(".manage-list>div").filter({hasText:`FULL 1h ${stamp}`});await ex.getByRole("button",{name:"Премахни"}).click();await expect.poll(async()=>((await db.from("staff_time_off").select("id").eq("id",made.off!).maybeSingle()).data)).toBeNull();
  const av2=await apiAvailability(page,salonId,made.service!,staffId,work.date);expect((av2.timeline||[]).filter((x:any)=>x.time>="13:00"&&x.time<"14:00").some((x:any)=>x.status==="available")).toBe(true);
  made.off=undefined;console.log("[FULL] ✓ 1-HOUR BREAK / REMOVE / PUBLIC AVAILABILITY EFFECT");

  console.log("[FULL] ▶ CUSTOMER / CALENDAR STATUSES / BLACKLIST");
  const slot=(av2.timeline||[]).find((x:any)=>x.status==="available");if(!slot)throw new Error("No available slot for owner status lifecycle");
  const endM=Number(slot.time.slice(0,2))*60+Number(slot.time.slice(3))+50;const end=`${String(Math.floor(endM/60)).padStart(2,"0")}:${String(endM%60).padStart(2,"0")}`;
  const ins=await db.from("appointments").insert({salon_id:salonId,service_id:made.service,staff_id:staffId,customer_name:cname,customer_phone:phone,customer_email:`full-${stamp}@example.com`,appointment_date:work.date,start_time:slot.time,end_time:end,status:"confirmed",note:`FULL note ${stamp}`}).select("id").single();if(ins.error)throw ins.error;made.appointment=ins.data.id;
  await page.goto(`/admin/calendar?date=${work.date}`);await page.locator('input[type="date"]').fill(work.date).catch(()=>{});await page.waitForTimeout(700);
  let ap=page.locator(".calendar-appointment").filter({hasText:cname});await expect(ap).toBeVisible();await expect(ap).toContainText(`FULL note ${stamp}`);
  await ap.getByRole("button",{name:"Закъснял"}).click();await ap.getByRole("button",{name:"Запази"}).click();await expect.poll(async()=>((await db.from("appointments").select("status").eq("id",made.appointment!).single()).data?.status)).toBe("late");
  await page.goto("/admin/customers");let card=page.locator(".customer-card").filter({hasText:cname});await expect(card).toContainText("Закъснявал");await card.getByRole("button",{name:"Черен списък"}).click();await expect.poll(async()=>((await db.from("salon_customers").select("status").eq("salon_id",salonId).eq("phone_normalized",phone).single()).data?.status)).toBe("blacklist");
  await page.reload();card=page.locator(".customer-card").filter({hasText:cname});await card.getByRole("button",{name:"Върни в редовни"}).click();await expect.poll(async()=>((await db.from("salon_customers").select("status").eq("salon_id",salonId).eq("phone_normalized",phone).single()).data?.status)).toBe("regular");
  await page.goto(`/admin/calendar?date=${work.date}`);await page.locator('input[type="date"]').fill(work.date).catch(()=>{});await page.waitForTimeout(700);ap=page.locator(".calendar-appointment").filter({hasText:cname});await ap.getByRole("button",{name:"Не дошъл"}).click();await ap.getByRole("button",{name:"Запази"}).click();await expect.poll(async()=>((await db.from("appointments").select("status").eq("id",made.appointment!).single()).data?.status)).toBe("no_show");
  console.log("[FULL] ✓ CUSTOMER / CALENDAR STATUSES / BLACKLIST");

  console.log("[FULL] ▶ PERSONAL START / BOOKINGS / OVERVIEW / DELETE FREES SLOT");
  await page.goto(`/admin?date=${work.date}`);await expect(page.getByText(cname)).toBeVisible();
  await page.goto(`/admin/bookings?date=${work.date}`);await page.locator('input[type="date"]').fill(work.date).catch(()=>{});await page.waitForTimeout(500);await expect(page.getByText(cname)).toBeVisible();
  await page.goto(`/admin/overview?date=${work.date}`);await expect(page.getByText(cname)).toBeVisible();
  page.once("dialog",d=>d.accept());await page.locator(".booking-row").filter({hasText:cname}).getByRole("button",{name:"Изтрий"}).click();await expect.poll(async()=>((await db.from("appointments").select("id").eq("id",made.appointment!).maybeSingle()).data)).toBeNull();made.appointment=undefined;
  const av3=await apiAvailability(page,salonId,made.service!,staffId,work.date);expect((av3.timeline||[]).some((x:any)=>x.time===slot.time&&x.status==="available")).toBe(true);
  console.log("[FULL] ✓ PERSONAL START / BOOKINGS / OVERVIEW / DELETE FREES SLOT");

  console.log("[FULL] ▶ STAFF LIMIT / STATS SURFACE / OWNER-ONLY SURFACES");
  await page.goto("/admin/staff");await expect(page.getByText("Текущ план")).toBeVisible();await expect(page.getByText(/Активни специалисти/)).toBeVisible();
  await page.goto("/admin/stats");await expect(page.getByRole("heading",{name:"Статистика"})).toBeVisible();
  await page.goto("/admin/waitlist");await expect(page.getByRole("heading",{name:/Списък|изчакване/i})).toBeVisible().catch(async()=>{await expect(page.locator("main")).toContainText(/изчакване/i)});
  console.log("[FULL] ✓ STAFF LIMIT / STATS SURFACE / OWNER-ONLY SURFACES");
 }finally{
  console.log("[FULL] ▶ CLEANUP");
  if(made.appointment)await db.from("appointments").delete().eq("id",made.appointment);
  await db.from("salon_customers").delete().eq("salon_id",salonId).eq("phone_normalized",phone);
  if(made.off)await db.from("staff_time_off").delete().eq("id",made.off);
  if(made.service)await db.from("services").delete().eq("id",made.service);
  console.log("[FULL] ✓ CLEANUP");
 }
});
