import {test,expect,Browser,Page} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";
import sharp from "sharp";
import {settle} from "./helpers";

const MONTHS:Record<string,number>={"Януари":1,"Февруари":2,"Март":3,"Април":4,"Май":5,"Юни":6,"Юли":7,"Август":8,"Септември":9,"Октомври":10,"Ноември":11,"Декември":12};
async function dateFromCalendar(page:Page){const heading=(await page.locator(".booking-calendar-head strong").innerText()).trim().split(/\s+/);const day=Number((await page.locator(".booking-calendar-grid button.selected span").innerText()).trim());return `${heading[1]}-${String(MONTHS[heading[0]]).padStart(2,"0")}-${String(day).padStart(2,"0")}`}
async function chooseAdminDay(page:Page,date:string){const [year,month,day]=date.split("-").map(Number);await page.locator(".admin-date-trigger").click();const head=page.locator(".admin-date-head strong");for(let i=0;i<30;i++){const[m,y]=(await head.innerText()).trim().split(/\s+/);if(Number(y)===year&&MONTHS[m]===month)break;await page.locator(".admin-date-head button").nth(year*12+month>Number(y)*12+MONTHS[m]?1:0).click()}await page.locator(".admin-date-grid button").filter({has:page.locator("b",{hasText:new RegExp(`^${day}$`)})}).first().click()}

// Explicitly isolated: TEST_DEEP_SALON_SLUG must point to a disposable salon.
test("deep: second specialist, independent same-time bookings and waitlists",async({page,browser}:{page:Page,browser:Browser})=>{
 test.setTimeout(300_000);
 const slug=process.env.TEST_DEEP_SALON_SLUG,staffPassword=process.env.TEST_NEW_STAFF_PASSWORD;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 expect(slug&&staffPassword&&url&&key,"Set TEST_DEEP_SALON_SLUG, TEST_NEW_STAFF_PASSWORD and Supabase test credentials").toBeTruthy();
 expect(process.env.TEST_BASE_URL||"http://127.0.0.1:3000").toMatch(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/);
 const db=createClient(url!,key!,{auth:{persistSession:false,autoRefreshToken:false}});
 const{data:salon}=await db.from("salons").select("*").eq("slug",slug!).single();expect(salon).toBeTruthy();
 const{data:ownerStaff}=await db.from("staff").select("id,user_id").eq("salon_id",salon!.id).eq("is_owner",true).single();expect(ownerStaff).toBeTruthy();
 const adminEmail=(process.env.TEST_ADMIN_EMAIL||"").trim();
 expect(adminEmail,"Set TEST_ADMIN_EMAIL for the authenticated Playwright owner").toBeTruthy();
 const{data:adminAuth}=await db.auth.admin.listUsers({page:1,perPage:1000});
 const adminUser=adminAuth.users.find(u=>(u.email||"").toLowerCase()===adminEmail.toLowerCase());
 expect(adminUser,"TEST_ADMIN_EMAIL "+adminEmail+" was not found in Supabase Auth").toBeTruthy();
 expect(ownerStaff!.user_id,"Owner staff for TEST_DEEP_SALON_SLUG="+slug+" has no linked user_id").toBe(adminUser!.id);
 const{data:services}=await db.from("services").select("id,name").eq("salon_id",salon!.id).eq("active",true).limit(1);
 expect(services?.length,"Add an active service to the disposable test salon").toBeGreaterThan(0);
 const{data:ownerHours}=await db.from("staff_working_hours").select("*").eq("staff_id",ownerStaff!.id);
 const stamp=Date.now();const email=`e2e-staff-${stamp}@example.com`,name=`E2E специалист ${stamp}`;
 let staffId="",userId="";const appointments:string[]=[],waitIds:string[]=[],uploaded:string[]=[];
 const context=await browser.newContext();const staffPage=await context.newPage();
 try{
  await page.goto("/admin/schedule");await settle(page);
  for(const row of await page.locator(".hours-row").all()){await row.locator('input[type="checkbox"]').check();await row.locator("select").first().selectOption("09:00");await row.locator("select").last().selectOption("17:00")}
  await page.getByRole("button",{name:"Запази целия седмичен график"}).click();
  await expect(page.locator(".bf-week-save .form-message")).toContainText("запазен");
  await page.goto("/admin/staff");await settle(page);
  const invite=page.locator(".dash-card form").first();
  await invite.locator('[name="name"]').fill(name);
  await invite.locator('[name="title"]').fill("Фризьор");
  await invite.locator('[name="email"]').fill(email);
  const response=page.waitForResponse(r=>r.url().endsWith("/api/business/staff/invite")&&r.request().method()==="POST");
  await invite.getByRole("button",{name:"Изпрати покана"}).click();
  expect((await response).status()).toBe(200);
  const{data:staff}=await db.from("staff").select("id,user_id").eq("salon_id",salon!.id).eq("name",name).single();expect(staff).toBeTruthy();staffId=staff!.id;userId=staff!.user_id;
  await expect(page.locator(".bf-staff-service-matrix article").filter({hasText:name})).toBeVisible();
  const linked=await db.from("staff_services").select("service_id").eq("staff_id",staffId).eq("service_id",services![0].id).maybeSingle();expect(linked.data).toBeTruthy();

  await staffPage.goto("/login");await settle(staffPage);await staffPage.locator('input[name="email"]').fill(email);await staffPage.locator('input[name="password"]').fill(staffPassword!);
  await staffPage.getByRole("button",{name:/^Вход$/}).click();await staffPage.waitForURL(/\/admin(?:\/|$)/);
  await staffPage.goto("/admin/my-profile");await settle(staffPage);
  await staffPage.locator('textarea[name="bio"]').fill("Автоматичен тест за специалист и лично представяне.");
  const avatar=await sharp({create:{width:500,height:500,channels:3,background:"#76569a"}}).jpeg().toBuffer();
  await staffPage.locator('input[name="photo"]').setInputFiles({name:"specialist-e2e.jpg",mimeType:"image/jpeg",buffer:avatar});
  const photoResponse=staffPage.waitForResponse(r=>r.url().endsWith("/api/business/media")&&r.request().method()==="POST");
  await staffPage.getByRole("button",{name:"Запази профила"}).click();
  const photoResult=await(await photoResponse).json();if(photoResult.path)uploaded.push(photoResult.path);
  await expect(staffPage.locator(".form-message").last()).toContainText("успешно");
  await staffPage.goto("/admin/schedule");await settle(staffPage);
  for(const row of await staffPage.locator(".hours-row").all()){await row.locator('input[type="checkbox"]').check();await row.locator("select").first().selectOption("09:00");await row.locator("select").last().selectOption("17:00")}
  await staffPage.getByRole("button",{name:"Запази целия седмичен график"}).click();
  await expect(staffPage.locator(".bf-week-save .form-message")).toContainText("запазен");

  async function book(staff:string,customer:string,phone:string,firstTime?:string,firstDate?:string){
   const visitor=await browser.newContext();const publicPage=await visitor.newPage();
   try{await publicPage.goto(`/salon/${slug}`);await settle(publicPage);
    await publicPage.locator(".booking-box form select").first().selectOption(services![0].id);
    await publicPage.locator(".booking-box form select").nth(1).selectOption(staff);
    let date="";
    const slots=publicPage.locator(".timeline-grid button.available");
    if(firstDate){
     const [year,month,day]=firstDate.split("-").map(Number);
     for(let i=0;i<12;i++){const[m,y]=(await publicPage.locator(".booking-calendar-head strong").innerText()).trim().split(/\s+/);if(Number(y)===year&&MONTHS[m]===month)break;await publicPage.locator(".booking-calendar-head button").last().click()}
     const targetDay=publicPage.locator(".booking-calendar-grid button.day-available").filter({has:publicPage.locator("span",{hasText:new RegExp(`^${day}$`)})}).first();
     await expect(targetDay,`Target date ${firstDate} is not available for the second specialist`).toBeVisible();
     await targetDay.click();date=await dateFromCalendar(publicPage);
    }else{
     let found=false;
     for(let monthTry=0;monthTry<4&&!found;monthTry++){
      const days=publicPage.locator(".booking-calendar-grid button.day-available:not([disabled])");
      const count=await days.count();
      for(let i=0;i<count;i++){
       await days.nth(i).click();
       await publicPage.waitForTimeout(350);
       if(await slots.first().isVisible().catch(()=>false)){date=await dateFromCalendar(publicPage);found=true;break}
      }
      if(!found)await publicPage.locator(".booking-calendar-head button").last().click();
     }
     expect(found,"No public day with a real bookable slot was found in the next 4 months").toBeTruthy();
    }
    const chosen=firstTime?slots.filter({has:publicPage.locator("b",{hasText:new RegExp(`^${firstTime}$`)})}).first():slots.first();
    await expect(chosen,"Both specialists must offer the same hour").toBeVisible({timeout:15000});const time=(await chosen.locator("b").innerText()).trim();await chosen.click();
    await publicPage.locator('[name="customerName"]').fill(customer);await publicPage.locator('[name="customerPhone"]').fill(phone);await publicPage.locator('[name="customerEmail"]').fill(`e2e-${stamp}-${staff.slice(0,6)}@example.com`);
    await publicPage.locator('[name="acceptedTerms"]').check();
    const code=publicPage.waitForResponse(r=>r.url().endsWith("/api/public/booking-code")&&r.request().method()==="POST");await publicPage.getByRole("button",{name:"Запиши час"}).click();const codeJson=await(await code).json();expect(codeJson.testCode).toMatch(/^\d{6}$/);
    await publicPage.locator(".bf-booking-code-card input").fill(codeJson.testCode);
    const response=publicPage.waitForResponse(r=>r.url().endsWith("/api/public/book")&&r.request().method()==="POST");await publicPage.getByTestId("confirm-booking-code").click();const bookResponse=await response;expect(bookResponse.status()).toBe(200);appointments.push((await bookResponse.json()).appointmentId);
    await expect(publicPage.locator(".booking-success")).toContainText("РЕЗЕРВАЦИЯТА Е УСПЕШНА");
    return {date,time};
   }finally{await visitor.close()}
  }
  const booking1=await book(ownerStaff!.id,`E2E owner ${stamp}`,`089${String(stamp).slice(-7)}`);
  const booking2=await book(staffId,`E2E staff ${stamp}`,`088${String(stamp).slice(-7)}`,booking1.time,booking1.date);
  expect(booking2).toEqual(booking1);
  await page.goto("/admin/calendar");await settle(page);await chooseAdminDay(page,booking1.date);
  await expect(page.locator(".calendar-appointment").filter({hasText:`E2E owner ${stamp}`})).toBeVisible();
  await staffPage.goto("/admin/calendar");await settle(staffPage);await chooseAdminDay(staffPage,booking1.date);
  await expect(staffPage.locator(".calendar-appointment").filter({hasText:`E2E staff ${stamp}`})).toBeVisible();

  for(const staff of [ownerStaff!.id,staffId]){
   const visitor=await browser.newContext();const publicPage=await visitor.newPage();
   try{await publicPage.goto(`/salon/${slug}`);await settle(publicPage);
    await publicPage.locator(".booking-box form select").first().selectOption(services![0].id);await publicPage.locator(".booking-box form select").nth(1).selectOption(staff);
    let days=publicPage.locator(".booking-calendar-grid button.day-available:not([disabled])");
    for(let i=0;i<4&&(await days.count())<2;i++){await publicPage.locator(".booking-calendar-head button").last().click();days=publicPage.locator(".booking-calendar-grid button.day-available:not([disabled])")}
    expect(await days.count(),"Waitlist test needs a future available day").toBeGreaterThan(1);
    const day=days.nth(1);await expect(day).toBeVisible();await day.click();
    await publicPage.getByRole("button",{name:/Запиши ме в списък за изчакване/}).click();
    const form=publicPage.locator('[data-testid="waitlist-form"]');
    await form.locator('[name="customerName"]').fill(`E2E wait ${staff.slice(0,6)} ${stamp}`);
    await form.locator('[name="customerPhone"]').fill(`087${String(stamp+(staff===staffId?1:0)).slice(-7)}`);
    await form.locator('[name="customerEmail"]').fill(`wait-${stamp}-${staff.slice(0,6)}@example.com`);
    const response=publicPage.waitForResponse(r=>r.url().endsWith("/api/public/waitlist")&&r.request().method()==="POST");await form.getByRole("button",{name:"Добави ме"}).click();expect((await response).status()).toBe(200);
   }finally{await visitor.close()}
  }
  const{data:waits}=await db.from("waitlist_entries").select("id").eq("salon_id",salon!.id).like("customer_name",`E2E wait % ${stamp}`);waitIds.push(...(waits||[]).map(x=>x.id));expect(waitIds).toHaveLength(2);
  await page.goto("/admin/waitlist");await settle(page);
  const ownerTestRows=page.locator(".bf-waitlist-admin article").filter({hasText:String(stamp)});
  await expect(ownerTestRows).toHaveCount(2);
  await staffPage.goto("/admin/waitlist");await settle(staffPage);
  const staffTestRows=staffPage.locator(".bf-waitlist-admin article").filter({hasText:String(stamp)});
  await expect(staffTestRows).toHaveCount(1);
  const row=ownerTestRows.first();
  const checkDay=row.getByRole("combobox",{name:"Ден за проверка"});
  const options=await checkDay.locator("option").allTextContents();
  expect(options.length,"Waitlist must offer at least one day to check").toBeGreaterThan(0);
  if(options.length>1)await checkDay.selectOption({index:options.length-1});
  await row.getByRole("button",{name:"Провери свободни"}).click();
  await expect(row.locator(".bf-waitlist-slots button").first()).toBeVisible({timeout:15000});
  await row.locator(".bf-waitlist-slots button").first().click();await row.getByRole("button",{name:"Потвърди записването"}).click();
  await expect(ownerTestRows).toHaveCount(1);
  const{data:assigned}=await db.from("waitlist_entries").select("appointment_id").in("id",waitIds).eq("status","booked").maybeSingle();
  if(assigned?.appointment_id)appointments.push(assigned.appointment_id);
  page.once("dialog",d=>d.accept());await ownerTestRows.first().getByRole("button",{name:"Премахни"}).click();
  await expect(ownerTestRows).toHaveCount(0);
 }finally{
  await context.close();
  const{data:unfinishedWaits}=await db.from("waitlist_entries").select("id,appointment_id").eq("salon_id",salon!.id).like("customer_name",`E2E wait % ${stamp}`);
  for(const wait of unfinishedWaits||[]){if(!waitIds.includes(wait.id))waitIds.push(wait.id);if(wait.appointment_id&&!appointments.includes(wait.appointment_id))appointments.push(wait.appointment_id)}
  if(waitIds.length)await db.from("waitlist_entries").delete().in("id",waitIds);
  if(appointments.length)await db.from("appointments").delete().in("id",appointments);
  if(!staffId){const{data:leftover}=await db.from("staff").select("id,user_id").eq("salon_id",salon!.id).eq("name",name).maybeSingle();staffId=leftover?.id||"";userId=leftover?.user_id||""}
  if(staffId){await db.from("staff_services").delete().eq("staff_id",staffId);await db.from("staff_working_hours").delete().eq("staff_id",staffId);await db.from("business_members").delete().eq("staff_id",staffId);await db.from("staff").delete().eq("id",staffId)}
  await db.from("staff_invite_log").delete().eq("salon_id",salon!.id).eq("invited_email",email);
  if(userId)await db.auth.admin.deleteUser(userId);
  if(uploaded.length)await db.storage.from("salon-media").remove(uploaded);
  await db.from("staff_working_hours").delete().eq("staff_id",ownerStaff!.id);
  if(ownerHours?.length)await db.from("staff_working_hours").insert(ownerHours);
 }
});
