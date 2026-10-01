import {NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {getSupabaseAdmin} from "@/lib/supabaseAdmin";
import {getResetPasswordRedirect} from "@/lib/authRedirect";
import {sendBeautyFlowEmail} from "@/lib/email/emailSender";
import {passwordRecoveryEmail} from "@/lib/email/templates";
export async function POST(req:Request){
 const accepted={ok:true,message:"Ако има профил с този имейл, ще получиш линк за нова парола."};
 try{
  const body=await req.json().catch(()=>null),email=String(body?.email||"").trim().toLowerCase();
  if(email.length>180||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({message:"Въведи валиден имейл."},{status:400});
  const db=getSupabaseAdmin();
  const ip=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const key=createHash("sha256").update(`${process.env.SUPABASE_SERVICE_ROLE_KEY}:${ip}`).digest("hex");
  const{data:allowed,error:rateError}=await db.rpc("beautyflow_allow_auth_email",{p_key:key});
  if(rateError)throw new Error("Проверката за изпращане на имейл не е налична.");
  if(!allowed)return NextResponse.json({message:"Твърде много заявки. Опитай отново след 15 минути."},{status:429});
  const{data,error}=await db.auth.admin.generateLink({type:"recovery",email,options:{redirectTo:getResetPasswordRedirect(new URL(req.url).origin)}});
  if(error){if(error.code==="user_not_found")return NextResponse.json(accepted);throw error}
  if(!data.properties?.action_link)throw new Error("Липсва линк за възстановяване.");
  const sent=await sendBeautyFlowEmail({to:email,...passwordRecoveryEmail({url:data.properties.action_link})});
  if(!sent.ok)throw new Error(sent.message);
  return NextResponse.json(accepted);
 }catch(error){console.error("BeautyFlow recovery email failed",error);return NextResponse.json({message:"Не успяхме да изпратим заявката. Опитай отново по-късно."},{status:503})}
}
