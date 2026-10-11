import {test,expect,Page,Browser} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";
import sharp from "sharp";
import {settle,watchPage} from "./helpers";

const ownerEmail=process.env.TEST_OWNER_EMAIL?.trim()||"";
const ownerPassword=process.env.TEST_OWNER_PASSWORD||"";
const newAdminPassword=process.env.TEST_NEW_ADMIN_PASSWORD||"";
const staffPassword=process.env.TEST_NEW_STAFF_PASSWORD||"";

async function fresh(browser:Browser){const context=await browser.newContext();const page=await context.newPage();return{context,page}}
async function login(page:Page,email:string,password:string){
 await page.goto("/login");await settle(page);
 await page.locator('input[name="email"]').fill(email);await page.locator('input[name="password"]').fill(password);
 await page.getByRole("button",{name:/^Вход$/}).click();await page.waitForURL(/\/(admin|owner)(?:\/|$)/,{timeout:25000});
}
async function stage(name:string,fn:()=>Promise<void>){console.log(`\n[MASTER] ▶ ${name}`);await fn();console.log(`[MASTER] ✓ ${name}`)}
const local=()=>expect(process.env.TEST_BASE_URL||"http://127.0.0.1:3000","MASTER test is LOCAL ONLY").toMatch(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/);

test("MASTER: real customer lifecycle from access request to working salon",async({browser})=>{
 test.setTimeout(600_000);local();
 expect(ownerEmail,"TEST_OWNER_EMAIL missing").not.toBe("");expect(ownerPassword,"TEST_OWNER_PASSWORD missing").not.toBe("");
 expect(newAdminPassword,"TEST_NEW_ADMIN_PASSWORD missing").not.toBe("");expect(staffPassword,"TEST_NEW_STAFF_PASSWORD missing").not.toBe("");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 expect(url&&key,"Supabase service credentials missing (.env.local)").toBeTruthy();
 const db=createClient(url!,key!,{auth:{persistSession:false,autoRefreshToken:false}});
 const stamp=Date.now().toString(),short=stamp.slice(-6);
 const email=`master-owner-${stamp}@example.com`, business=`MASTER BeautyFlow ${short}`, slugExpected="";
 const service=`MASTER услуга ${short}`, phone=`088${stamp.slice(-7)}`;
 const uploaded:string[]=[]; let salonId="", ownerStaffId="";
 const owner=await fresh(browser), admin=await fresh(browser);
 const photo=await sharp({create:{width:900,height:700,channels:3,background:"#835f9a"}}).jpeg({quality:78}).toBuffer();
 const file=(name:string)=>({name,mimeType:"image/jpeg",buffer:photo});
 try{
  await stage("ACCESS REQUEST",async()=>{
   const p=await fresh(browser);const verify=watchPage(p.page);
   await p.page.goto("/register-salon");await settle(p.page);const f=p.page.locator("form");
   await f.locator('[name="ownerName"]').fill("MASTER Owner");
   await f.locator('[name="email"]').fill(email);await f.locator('[name="phone"]').fill(phone);
   await f.locator('[name="businessName"]').fill(business);await f.locator('[name="category"]').selectOption({index:1});
   await f.locator('[name="city"]').fill("Козлодуй");await f.locator('[name="message"]').fill("MASTER автоматичен lifecycle тест.");
   const q=await f.locator(".bf-human-check label").innerText(),m=q.match(/(\d+)\s*\+\s*(\d+)/);expect(m).toBeTruthy();
   await p.page.waitForTimeout(1900);await f.locator('[name="mathAnswer"]').fill(String(+m![1]+ +m![2]));
   const resp=p.page.waitForResponse(r=>r.url().endsWith("/api/access-request")&&r.request().method()==="POST");
   await f.getByRole("button",{name:"Изпрати заявка"}).click();expect((await resp).ok()).toBeTruthy();await verify();await p.context.close();
  });
  await stage("OWNER APPROVAL",async()=>{
   await login(owner.page,ownerEmail,ownerPassword);await owner.page.goto("/owner/requests");await settle(owner.page);
   const card=owner.page.locator(".request-card").filter({hasText:email});await expect(card).toBeVisible();
   owner.page.once("dialog",d=>d.accept());const resp=owner.page.waitForResponse(r=>r.url().endsWith("/api/owner/request-decision")&&r.request().method()==="POST");
   await card.getByRole("button",{name:/Одобри/}).click();expect((await resp).ok()).toBeTruthy();
  });
  await stage("NEW OWNER LOGIN",async()=>{
   await login(admin.page,email,newAdminPassword);await expect(admin.page.locator("body")).toContainText(business);
   const {data:s}=await db.from("salons").select("id,slug").eq("email",email).maybeSingle();
   const salon=s|| (await db.from("salons").select("id,slug").eq("name",business).single()).data;
   expect(salon).toBeTruthy();salonId=salon!.id;
   const {data:st}=await db.from("staff").select("id").eq("salon_id",salonId).eq("is_owner",true).single();ownerStaffId=st!.id;
  });
  admin.page.on("response",async r=>{if(r.url().endsWith("/api/business/media")&&r.ok()){const j=await r.json().catch(()=>null);if(j?.path)uploaded.push(j.path)}});
  await stage("SALON SETTINGS + LINKS + LOCATION",async()=>{
   await admin.page.goto("/admin/settings");await settle(admin.page);const f=admin.page.locator("form").first();
   await f.locator('[name="city"]').fill("Козлодуй");await f.locator('[name="phone"]').fill("0891234567");
   await f.locator('[name="address"]').fill("ул. MASTER тест 1");
   await f.locator('[name="map_location"]').fill("43.7786, 23.7217");
   await f.locator('[name="description"]').fill("MASTER профил: автоматична проверка на всички основни функции.");
   await f.locator('[name="facebook_url"]').fill("https://facebook.com/beautyflow.master.test");
   await f.locator('[name="instagram_url"]').fill("https://instagram.com/beautyflow.master.test");
   await f.locator('[name="tiktok_url"]').fill("https://tiktok.com/@beautyflow.master.test");
   await f.locator("select").first().selectOption("180");
   const toggle=f.locator('input[type="checkbox"]').last();if(!(await toggle.isChecked()))await toggle.evaluate((el:any)=>{el.checked=true;el.dispatchEvent(new Event("change",{bubbles:true}))});
   await f.getByRole("button",{name:"Запази всички настройки"}).click();await expect(f.locator(".form-message")).toContainText("запазени");
   const {data:s}=await db.from("salons").select("map_location,facebook_url,instagram_url,tiktok_url,onboarding_completed").eq("id",salonId).single();
   expect(s?.map_location).toContain("43.7786");expect(s?.facebook_url).toContain("facebook.com");expect(s?.onboarding_completed).toBe(true);
  });
  await stage("LOGO + COVER + GALLERY",async()=>{
   await admin.page.locator('.media-logo input[type="file"]').setInputFiles(file("master-logo.jpg"));
   await expect(admin.page.locator(".media-logo .media-message")).toContainText(/запазена|качена/,{timeout:30000});
   await admin.page.locator('.media-cover input[type="file"]').setInputFiles(file("master-cover.jpg"));
   await expect(admin.page.locator(".media-cover .media-message")).toContainText(/запазена|качена/,{timeout:30000});
   await admin.page.locator(".bf-gallery-add input").setInputFiles([file("gallery-1.jpg"),file("gallery-2.jpg"),file("gallery-3.jpg")]);
   await expect(admin.page.locator(".bf-gallery-admin-grid img")).toHaveCount(3,{timeout:90000});
  });
  await stage("OWNER SPECIALIST PROFILE",async()=>{
   await admin.page.goto("/admin/my-profile");await settle(admin.page);
   await admin.page.locator('input[name="title"]').fill("MASTER стилист");
   await admin.page.locator('textarea[name="bio"]').fill("MASTER описание на собственик специалист.");
   await admin.page.locator('input[name="instagram_url"]').fill("https://instagram.com/master.owner");
   await admin.page.locator('input[name="facebook_url"]').fill("https://facebook.com/master.owner");
   await admin.page.locator('input[name="photo"]').setInputFiles(file("owner.jpg"));
   await admin.page.getByRole("button",{name:"Запази профила"}).click();
   await expect(admin.page.locator(".form-message").last()).toContainText(/успешно|запазен/i,{timeout:30000});
  });
  await stage("SERVICE CREATE + IMAGE",async()=>{
   await admin.page.goto("/admin/services");await settle(admin.page);
   const f=admin.page.locator("form").first();await f.locator('[name="name"]').fill(service);
   await f.locator('[name="price"]').fill("35");await f.locator('[name="duration"]').fill("45");
   const image=f.locator('input[type="file"]');if(await image.count())await image.setInputFiles(file("service.jpg"));
   await f.getByRole("button",{name:"Добави",exact:true}).click();
   await expect(admin.page.locator(".bf-service-manage-row").filter({hasText:service})).toBeVisible({timeout:30000});
  });
  await stage("OWNER SCHEDULE + BREAK + DAY OFF",async()=>{
   await admin.page.goto("/admin/schedule");await settle(admin.page);
   const rows=admin.page.locator(".hours-row");for(let i=0;i<await rows.count();i++){const cb=rows.nth(i).locator('input[type="checkbox"]');if(!(await cb.isChecked()))await cb.check()}
   await admin.page.getByRole("button",{name:"Запази целия седмичен график"}).click();
   await expect(admin.page.getByRole("status")).toContainText("запазен");
   const tomorrow=new Date(Date.now()+86400000*8).toISOString().slice(0,10);
   await db.from("staff_time_off").insert({salon_id:salonId,staff_id:ownerStaffId,off_date:tomorrow,all_day:true,note:"MASTER отпуск"});
   await admin.page.reload();await settle(admin.page);await expect(admin.page.locator(".manage-list")).toContainText("MASTER отпуск");
  });
  await stage("INVITE UP TO 3 SPECIALISTS + SERVICES + PROFILES + SCHEDULES",async()=>{
   await admin.page.goto("/admin/staff");await settle(admin.page);
   const {data:sal}=await db.from("salons").select("staff_limit,plan_id").eq("id",salonId).single();
   const limit=Math.max(1,Number(sal?.staff_limit||4));const existing=(await db.from("staff").select("id").eq("salon_id",salonId).is("deleted_at",null)).data?.length||1;
   const count=Math.min(3,Math.max(0,limit-existing));
    if(count===0){console.log(`[MASTER] ℹ Current plan staff_limit=${limit}, existing=${existing}; specialist invite stage skipped because the approved plan has no free specialist slot.`);return;}
   for(let i=1;i<=count;i++){
    const em=`master-staff-${i}-${stamp}@example.com`,name=`MASTER специалист ${i}`;
    const form=admin.page.locator(".dash-card form").first();await form.locator('[name="name"]').fill(name);await form.locator('[name="title"]').fill(`Специалист ${i}`);await form.locator('[name="email"]').fill(em);
    const rr=admin.page.waitForResponse(r=>r.url().endsWith("/api/business/staff/invite")&&r.request().method()==="POST");
    await form.getByRole("button",{name:"Изпрати покана"}).click();expect((await rr).ok()).toBeTruthy();
    const {data:st}=await db.from("staff").select("id").eq("salon_id",salonId).eq("email",em).maybeSingle();
    const staff=st||(await db.from("staff").select("id").eq("salon_id",salonId).eq("name",name).single()).data;expect(staff).toBeTruthy();
    const matrix=admin.page.locator(".bf-staff-service-matrix article").filter({hasText:name});await expect(matrix).toBeVisible();
    const svc=matrix.locator('input[type="checkbox"]').first();if(!(await svc.isChecked()))await svc.check();
    const sp=await fresh(browser);await login(sp.page,em,staffPassword);
    await sp.page.goto("/admin/my-profile");await settle(sp.page);await sp.page.locator('textarea[name="bio"]').fill(`MASTER bio специалист ${i}`);
    await sp.page.locator('input[name="instagram_url"]').fill(`https://instagram.com/master.staff${i}`);
    await sp.page.locator('input[name="photo"]').setInputFiles(file(`staff-${i}.jpg`));await sp.page.getByRole("button",{name:"Запази профила"}).click();
    await expect(sp.page.locator(".form-message").last()).toContainText(/успешно|запазен/i,{timeout:30000});
    await sp.page.goto("/admin/schedule");await settle(sp.page);await sp.page.getByRole("button",{name:"Запази целия седмичен график"}).click();
    await expect(sp.page.getByRole("status")).toContainText("запазен");await sp.context.close();
   }
  });
  await stage("PUBLIC PROFILE + LOCATION/SOCIAL LINKS + MEDIA",async()=>{
   const {data:s}=await db.from("salons").select("slug").eq("id",salonId).single();expect(s?.slug).toBeTruthy();
   const p=await fresh(browser);await p.page.goto(`/salon/${s!.slug}`);await settle(p.page);
   await expect(p.page.locator("body")).toContainText(business);await expect(p.page.locator("body")).toContainText("MASTER профил");
   await expect(p.page.locator('a[href*="facebook.com"]')).toHaveCount(1);await expect(p.page.locator('a[href*="instagram.com"]')).toHaveCount(1);
   await expect(p.page.locator('a[href*="google.com"],a[href*="maps"]')).toHaveCount(1);
   await expect(p.page.locator(".bf-salon-gallery-public img, .bf-salon-gallery-public button")).not.toHaveCount(0);
   await p.context.close();
  });
  await stage("OWNER PAGES + OVERVIEW + WAITLIST SURFACES",async()=>{
   for(const path of ["/admin","/admin/calendar","/admin/bookings","/admin/overview","/admin/customers","/admin/waitlist","/admin/stats"]){await admin.page.goto(path);await settle(admin.page);await expect(admin.page.locator("body")).not.toContainText(/Application error|Internal Server Error/)}
  });
  console.log("\n[MASTER] Core onboarding, media, links, services, schedules, team and public profile PASSED.");
  console.log("[MASTER] Booking concurrency + waitlist assignment remain covered by deep-team-booking.spec.ts and waitlist-full.spec.ts in npm run test:master.");
 }finally{
  console.log("\n[MASTER] ▶ CLEANUP");
  try{
   if(salonId){
    const {data:staff}=await db.from("staff").select("id,user_id").eq("salon_id",salonId);
    const ids=(staff||[]).map(x=>x.id),users=(staff||[]).map(x=>x.user_id).filter(Boolean);
    for(const table of ["waitlist_entries","appointments","staff_time_off","staff_working_hours","staff_services","salon_gallery","services","salon_customers","booking_settings","business_members"]){
     try{await db.from(table).delete().eq("salon_id",salonId)}catch{}
    }
    try{await db.from("staff_invite_log").delete().eq("salon_id",salonId)}catch{}
    try{await db.from("staff").delete().eq("salon_id",salonId)}catch{}
    try{await db.from("salons").delete().eq("id",salonId)}catch{}
    for(const u of users)try{await db.auth.admin.deleteUser(u)}catch{}
    if(uploaded.length)try{await db.storage.from("salon-media").remove(uploaded)}catch{}
   }
   const {data:auth}=await db.auth.admin.listUsers({page:1,perPage:1000});
   for(const u of auth.users.filter(u=>(u.email||"").includes(stamp)))try{await db.auth.admin.deleteUser(u.id)}catch{}
   try{await db.from("access_requests").delete().eq("email",email)}catch{}
  }catch(e){console.warn("[MASTER] cleanup warning",e)}
  await admin.context.close().catch(()=>{});await owner.context.close().catch(()=>{});
  console.log("[MASTER] ✓ CLEANUP");
 }
});
