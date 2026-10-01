import {NextResponse} from "next/server";
import {requireBusinessOwner} from "@/lib/beautyflow/businessAuth";
import {beautyPlan} from "@/lib/beautyflow/plans";
import {isBeautySpecialty} from "@/lib/beautyflow/specialties";
import {getResetPasswordRedirect} from "@/lib/authRedirect";
import {sendBeautyFlowEmail} from "@/lib/email/emailSender";
import {staffInvitationEmail} from "@/lib/email/templates";
const clean=(v:unknown,n=160)=>String(v||"").replace(/[<>]/g,"").trim().slice(0,n);
export async function POST(req:Request){
 const auth=await requireBusinessOwner(req);if(!auth.ok)return NextResponse.json({message:auth.message},{status:auth.status});
 try{
  const b=await req.json(),salon=auth.business;
  const{count:recentInvites,error:logError}=await auth.admin.from("staff_invite_log").select("id",{count:"exact",head:true}).eq("salon_id",salon.id).gte("created_at",new Date(Date.now()-3600000).toISOString());
  if(logError)throw logError;if((recentInvites||0)>=10)return NextResponse.json({message:"Достигнат е лимитът за покани. Опитай отново след един час."},{status:429});
  let name=clean(b.name,90),title=clean(b.title,90),email=clean(b.email,160).toLowerCase(),staffId=clean(b.staffId,50),userId="";
  const redirectTo=getResetPasswordRedirect(new URL(req.url).origin);
  const e2e=process.env.NODE_ENV!=="production"&&process.env.BEAUTYFLOW_E2E_MODE==="1"&&Boolean(process.env.TEST_NEW_STAFF_PASSWORD);
  let link="";
  if(staffId){
   const{data:row,error}=await auth.admin.from("staff").select("id,name,user_id,deleted_at").eq("id",staffId).eq("salon_id",salon.id).eq("active",true).maybeSingle();
   if(error)throw error;if(!row||row.deleted_at||!row.user_id)return NextResponse.json({message:"Специалистът няма активен достъп."},{status:404});
   const{data:user,error:userError}=await auth.admin.auth.admin.getUserById(row.user_id);if(userError)throw userError;
   email=user.user?.email||"";name=row.name;userId=row.user_id;
  }else{
   if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!isBeautySpecialty(title))return NextResponse.json({message:"Попълни име, валиден имейл и специалност."},{status:400});
   const limit=Number((salon as any).staff_limit||beautyPlan((salon as any).plan_id).staffLimit);
   const{count,error:countError}=await auth.admin.from("staff").select("id",{count:"exact",head:true}).eq("salon_id",salon.id).eq("active",true);if(countError)throw countError;
   if((count||0)>=limit)return NextResponse.json({message:`Планът позволява до ${limit} активни специалисти.`},{status:409});
   for(let page=1;page<=100;page++){const{data,error}=await auth.admin.auth.admin.listUsers({page,perPage:100});if(error)throw error;const found=data.users.find(u=>u.email?.toLowerCase()===email);if(found){userId=found.id;break}if(data.users.length<100)break}
   if(userId){
    const{data:members,error}=await auth.admin.from("business_members").select("salon_id").eq("user_id",userId).eq("active",true);if(error)throw error;
    const{data:owned}=await auth.admin.from("salons").select("id").eq("owner_id",userId);
    if(members?.some(m=>m.salon_id!==salon.id)||owned?.length)return NextResponse.json({message:"Този имейл вече е свързан с друг бизнес или собственик."},{status:409});
    const{data:existing,error:existingError}=await auth.admin.from("staff").select("id,deleted_at").eq("user_id",userId).eq("salon_id",salon.id).maybeSingle();if(existingError)throw existingError;
    if(existing&&!existing.deleted_at)return NextResponse.json({message:"Специалистът вече е в екипа. Използвай „Изпрати покана отново“."},{status:409});
    if(existing){staffId=existing.id;const{error}=await auth.admin.from("staff").update({name,title,active:true,deleted_at:null}).eq("id",staffId);if(error)throw error}
   }else if(e2e){const{data,error}=await auth.admin.auth.admin.createUser({email,password:process.env.TEST_NEW_STAFF_PASSWORD,email_confirm:true});if(error)throw error;userId=data.user.id}
   else{const{data,error}=await auth.admin.auth.admin.generateLink({type:"invite",email,options:{redirectTo}});if(error)throw error;userId=data.user.id;link=data.properties.action_link}
   if(!staffId){const{data,error}=await auth.admin.from("staff").insert({salon_id:salon.id,user_id:userId,name,title,active:true,is_owner:false}).select("id").single();if(error)throw error;staffId=data.id}
   const{error:memberError}=await auth.admin.from("business_members").upsert({salon_id:salon.id,user_id:userId,staff_id:staffId,role:"staff",active:true},{onConflict:"salon_id,user_id"});if(memberError)throw memberError;
   const{data:services,error:servicesError}=await auth.admin.from("services").select("id").eq("salon_id",salon.id).eq("active",true);if(servicesError)throw servicesError;
   if(services?.length){const{error}=await auth.admin.from("staff_services").upsert(services.map(s=>({salon_id:salon.id,staff_id:staffId,service_id:s.id})),{onConflict:"staff_id,service_id"});if(error)throw error}
   const{data:hours,error:hoursError}=await auth.admin.from("working_hours").select("weekday,enabled,start_time,end_time").eq("salon_id",salon.id);if(hoursError)throw hoursError;
   if(hours?.length){const{error}=await auth.admin.from("staff_working_hours").upsert(hours.map(h=>({salon_id:salon.id,staff_id:staffId,...h})),{onConflict:"staff_id,weekday"});if(error)throw error}
  }
  if(!e2e){
   if(!link){const{data,error}=await auth.admin.auth.admin.generateLink({type:"recovery",email,options:{redirectTo}});if(error)throw error;link=data.properties.action_link}
   const mail=await sendBeautyFlowEmail({to:email,...staffInvitationEmail({url:link,name,salonName:salon.name})});
   if(!mail.ok)return NextResponse.json({ok:true,emailSent:false,staffId,message:`Специалистът е добавен, но имейлът не беше изпратен. Използвай „Изпрати покана отново“. ${mail.message}`});
  }
  const{error:recordError}=await auth.admin.from("staff_invite_log").insert({salon_id:salon.id,invited_email:email,invited_by:auth.user.id});if(recordError)throw recordError;
  return NextResponse.json({ok:true,emailSent:!e2e,staffId,message:e2e?"Тестовият специалист е добавен без изпращане на имейл.":`Поканата е изпратена до ${email}.`});
 }catch(error){console.error("BeautyFlow staff invitation failed",error);return NextResponse.json({message:error instanceof Error?error.message:(error as {message?:string})?.message||"Не успяхме да изпратим поканата. Провери екипа преди повторен опит."},{status:500})}
}
