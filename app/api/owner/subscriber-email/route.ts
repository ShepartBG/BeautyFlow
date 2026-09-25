import {NextResponse} from "next/server";
import {requirePlatformOwner} from "@/lib/ownerAuth";
import {sendBeautyFlowEmail} from "@/lib/email/emailSender";
import {ownerMessageEmail} from "@/lib/email/templates";

export async function POST(req:Request){
 const auth=await requirePlatformOwner(req);if(!auth.ok)return NextResponse.json({message:auth.message},{status:auth.status});
 try{
  const body=await req.json();const subject=String(body.subject||"").trim();const message=String(body.message||"").trim();const mode=body.mode==="all"?"all":"one";const id=String(body.id||"");
  if(!subject||!message)return NextResponse.json({message:"Попълни тема и съобщение."},{status:400});
  let q=auth.admin.from("access_requests").select("id,email,owner_name,business_name,status").not("email","is",null);
  if(mode==="all")q=q.eq("status","active");else q=q.eq("id",id);
  const{data,error}=await q;if(error)return NextResponse.json({message:error.message},{status:500});
  const recipients=(data||[]).filter((x:any)=>String(x.email||"").includes("@"));if(!recipients.length)return NextResponse.json({message:"Няма намерени получатели."},{status:400});
  let sent=0;const failed:string[]=[];
  for(const r of recipients as any[]){const name=String(r.owner_name||r.business_name||"клиент");const result=await sendBeautyFlowEmail({to:String(r.email),...ownerMessageEmail({ownerName:name,subject,message})});if(result.ok)sent++;else failed.push(`${r.email}: ${result.message}`)}
  return NextResponse.json({message:`Изпратени: ${sent} от ${recipients.length}.${failed.length?` Неуспешни: ${failed.length}.`:""}`,sent,total:recipients.length,failed});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Грешка при изпращане."},{status:500})}
}
