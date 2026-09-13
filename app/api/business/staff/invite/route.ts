import {NextResponse} from "next/server";
import {requireBusinessOwner} from "@/lib/beautyflow/businessAuth";
import {beautyPlan} from "@/lib/beautyflow/plans";
import {isBeautySpecialty} from "@/lib/beautyflow/specialties";
const clean=(v:unknown,n=160)=>String(v||"").replace(/[<>]/g,"").trim().slice(0,n);
export async function POST(req:Request){
 const auth=await requireBusinessOwner(req);if(!auth.ok)return NextResponse.json({message:auth.message},{status:auth.status});
 try{const b=await req.json();const name=clean(b.name,90),title=clean(b.title,90),email=clean(b.email,160).toLowerCase();if(!name||!email||!email.includes("@"))return NextResponse.json({message:"Попълни име и валиден имейл."},{status:400});if(!isBeautySpecialty(title))return NextResponse.json({message:"Избери специалност от позволения списък."},{status:400});
 const salon=auth.business as any;const plan=beautyPlan(salon.plan_id);const limit=Number(salon.staff_limit||plan.staffLimit);const{count}=await auth.admin.from("staff").select("id",{count:"exact",head:true}).eq("salon_id",salon.id).eq("active",true);if((count||0)>=limit)return NextResponse.json({message:`План ${plan.name} позволява до ${limit} активни специалисти. За още хора е нужен по-висок план.`},{status:409});
 const since=new Date(Date.now()-60*60*1000).toISOString();const{count:recentInvites}=await auth.admin.from("staff_invite_log").select("id",{count:"exact",head:true}).eq("salon_id",salon.id).gte("created_at",since);if((recentInvites||0)>=10)return NextResponse.json({message:"Временно ограничихме новите покани. Опитай отново след малко."},{status:429});
 const{data:existing}=await auth.admin.from("business_members").select("id,active").eq("salon_id",salon.id).eq("user_id",auth.user.id).maybeSingle();void existing;
 const origin=new URL(req.url).origin;let invitedUserId:string|null=null;
 const{data:invite,error:inviteError}=await auth.admin.auth.admin.inviteUserByEmail(email,{redirectTo:`${origin}/reset-password`});
 if(inviteError){const{data:list}=await auth.admin.auth.admin.listUsers({page:1,perPage:1000});const found=list?.users?.find((u:any)=>String(u.email||"").toLowerCase()===email);if(!found)return NextResponse.json({message:inviteError.message},{status:409});invitedUserId=found.id}else invitedUserId=invite.user?.id||null;
 if(!invitedUserId)return NextResponse.json({message:"Не успяхме да създадем поканата."},{status:500});
 const[{data:otherMembership},{data:ownedSalon}]=await Promise.all([auth.admin.from("business_members").select("salon_id,active").eq("user_id",invitedUserId).eq("active",true).maybeSingle(),auth.admin.from("salons").select("id").eq("owner_id",invitedUserId).maybeSingle()]);
 if((otherMembership&&otherMembership.salon_id!==salon.id)||(ownedSalon&&ownedSalon.id!==salon.id))return NextResponse.json({message:"Този email вече е свързан с друг BeautyFlow салон."},{status:409});
 const{data:existingStaff}=await auth.admin.from("staff").select("id,active").eq("salon_id",salon.id).eq("user_id",invitedUserId).maybeSingle();if(existingStaff)return NextResponse.json({message:existingStaff.active?"Този специалист вече е част от екипа.":"Този специалист вече съществува. Активирай го от списъка, вместо да изпращаш нова покана."},{status:409});
 const{data:staff,error:staffError}=await auth.admin.from("staff").insert({salon_id:salon.id,user_id:invitedUserId,name,title,active:true,is_owner:false}).select("id").single();if(staffError)return NextResponse.json({message:staffError.message},{status:409});
 const{error:memberError}=await auth.admin.from("business_members").upsert({salon_id:salon.id,user_id:invitedUserId,staff_id:staff.id,role:"staff",active:true},{onConflict:"salon_id,user_id"});if(memberError)return NextResponse.json({message:memberError.message},{status:500});
 const{data:services}=await auth.admin.from("services").select("id").eq("salon_id",salon.id).eq("active",true);if(services?.length)await auth.admin.from("staff_services").upsert(services.map((s:any)=>({salon_id:salon.id,staff_id:staff.id,service_id:s.id})),{onConflict:"staff_id,service_id"});
 const{data:hours}=await auth.admin.from("working_hours").select("weekday,enabled,start_time,end_time").eq("salon_id",salon.id);if(hours?.length)await auth.admin.from("staff_working_hours").upsert(hours.map((h:any)=>({salon_id:salon.id,staff_id:staff.id,...h})),{onConflict:"staff_id,weekday"});
 await auth.admin.from("staff_invite_log").insert({salon_id:salon.id,invited_email:email,invited_by:auth.user.id});
 return NextResponse.json({ok:true,message:`Поканата е изпратена до ${email}.`});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Грешка при поканата."},{status:500})}
}
