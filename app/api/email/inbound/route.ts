import {NextResponse} from "next/server";
import {Resend} from "resend";
export const runtime="nodejs";
export const maxDuration=60;
const aliases=new Set(["support@beautyflow.bg","info@beautyflow.bg"]);
export async function POST(req:Request){
 const apiKey=process.env.RESEND_API_KEY,secret=process.env.RESEND_INBOUND_WEBHOOK_SECRET;
 if(!apiKey||!secret)return NextResponse.json({message:"Inbound email is not configured."},{status:503});
 const resend=new Resend(apiKey);let event;
 try{event=resend.webhooks.verify({payload:await req.text(),headers:{id:req.headers.get("svix-id")||"",timestamp:req.headers.get("svix-timestamp")||"",signature:req.headers.get("svix-signature")||""},webhookSecret:secret})}
 catch{return NextResponse.json({message:"Invalid signature."},{status:400})}
 if(event.type!=="email.received")return NextResponse.json({ok:true,ignored:true});
 const destinations=[...(event.data.to||[]),...(event.data.cc||[]),...(event.data.bcc||[])];
 const addressed=destinations.some(value=>{const address=value.match(/<([^>]+)>/)?.[1]||value;return aliases.has(address.trim().toLowerCase())});
 if(!addressed)return NextResponse.json({ok:true,ignored:true});
 try{
  const{data,error}=await resend.emails.receiving.forward({emailId:event.data.email_id,to:"battlebooking@abv.bg",from:"BeautyFlow <noreply@beautyflow.bg>"},{idempotencyKey:`beautyflow-inbound-${event.data.email_id}`});
  if(error)throw new Error(error.message);
  return NextResponse.json({ok:true,id:data?.id});
 }catch(error){console.error("BeautyFlow inbound forwarding failed",error);return NextResponse.json({message:"Forwarding failed; retry required."},{status:502})}
}
