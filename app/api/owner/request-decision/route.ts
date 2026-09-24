import { NextResponse } from "next/server";
import crypto from "crypto";
import { requirePlatformOwner } from "@/lib/ownerAuth";
import { sendBeautyFlowEmail } from "@/lib/email/emailSender";
import {approvedEmail,rejectedEmail} from "@/lib/email/templates";

function slugify(v:string){return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9а-я]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,55)||"beauty-business";}

export async function POST(req:Request){
 const auth=await requirePlatformOwner(req); if(!auth.ok)return NextResponse.json({message:auth.message},{status:auth.status});
 try{
  const body=await req.json(); const id=String(body.id||""); const decision=String(body.decision||"");
  if(!id||!["approve","reject"].includes(decision))return NextResponse.json({message:"Невалидна заявка."},{status:400});
  const {data:rRaw,error:rErr}=await auth.admin.from("access_requests").select("*").eq("id",id).maybeSingle();
  const r=rRaw as any;
  if(rErr||!r)return NextResponse.json({message:"Заявката не е намерена."},{status:404});
  if(r.status!=="pending")return NextResponse.json({message:"Заявката вече е обработена."},{status:409});

  if(decision==="reject"){
    const {error}=await auth.admin.from("access_requests").update({status:"rejected",reviewed_at:new Date().toISOString()}).eq("id",id); if(error)throw error;
    const mail=await sendBeautyFlowEmail({to:r.email,...rejectedEmail({ownerName:r.owner_name,businessName:r.business_name})});
    return NextResponse.json({ok:true,emailSent:mail.ok,message:mail.ok?"Заявката е отказана и е изпратен email.":`Заявката е отказана, но email НЕ е изпратен: ${mail.message}`});
  }

  let userId:string|undefined;
  const tempPassword=crypto.randomBytes(24).toString("base64url")+"A1!";
  const created=await auth.admin.auth.admin.createUser({email:r.email,password:tempPassword,email_confirm:true,user_metadata:{owner_name:r.owner_name}});
  if(created.data.user)userId=created.data.user.id;
  if(!userId){const users=await auth.admin.auth.admin.listUsers({page:1,perPage:1000});userId=users.data.users.find((u:any)=>u.email?.toLowerCase()===String(r.email).toLowerCase())?.id;}
  if(!userId)throw new Error(created.error?.message||"Не успях да създам потребителя.");

  let slug=slugify(r.business_name);
  const existing=await auth.admin.from("salons").select("id").eq("slug",slug).maybeSingle();
  if(existing.data)slug=`${slug}-${crypto.randomBytes(2).toString("hex")}`;
  const planId=["solo","studio","pro","premium"].includes(String(r.requested_plan||""))?String(r.requested_plan):"solo";
  const planLimits:any={solo:1,studio:3,pro:7,premium:15};
  const {data:salon,error:salonErr}=await auth.admin.from("salons").insert({owner_id:userId,access_request_id:r.id,name:r.business_name,slug,city:r.city,category:r.category,description:r.message||null,active:true,onboarding_completed:false,phone:r.phone||null,plan_id:planId,staff_limit:planLimits[planId]}).select("id,slug").single();
  if(salonErr&&salonErr.code!=="23505")throw salonErr;
  if(salon?.id){
    await auth.admin.from("booking_settings").upsert({salon_id:salon.id,slot_step_min:15,min_notice_hours:3,max_advance_days:60,notify_new_booking:false},{onConflict:"salon_id"});
    const {data:ownerStaff}=await auth.admin.from("staff").insert({salon_id:salon.id,user_id:userId,name:r.owner_name||r.business_name,title:"Собственик / специалист",active:true,is_owner:true}).select("id").single();
    if(ownerStaff?.id)await auth.admin.from("business_members").upsert({salon_id:salon.id,user_id:userId,staff_id:ownerStaff.id,role:"owner",active:true},{onConflict:"salon_id,user_id"});
  }
  await auth.admin.from("access_requests").update({status:"active",reviewed_at:new Date().toISOString()}).eq("id",id);

  const site=(process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin).replace(/\/$/,"");
  const link=await auth.admin.auth.admin.generateLink({type:"recovery",email:r.email,options:{redirectTo:`${site}/reset-password`}});
  if(link.error)throw new Error(`Не успях да генерирам линк за парола: ${link.error.message}`);
  const resetUrl=link.data.properties?.action_link||`${site}/forgot-password`;
  const mail=await sendBeautyFlowEmail({to:r.email,...approvedEmail({ownerName:r.owner_name,businessName:r.business_name,resetUrl})});

  if(!mail.ok){
    return NextResponse.json({ok:true,emailSent:false,setupUrl:resetUrl,message:`Салонът е одобрен, но email НЕ е изпратен: ${mail.message}. Линкът за парола е показан отдолу, за да може да го тестваш ръчно.`});
  }
  return NextResponse.json({ok:true,emailSent:true,message:"Одобрено. Салонът е създаден и email-ът за задаване на парола е изпратен.",salon});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Грешка при обработката."},{status:500});}
}
