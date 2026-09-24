import {NextResponse} from "next/server";
import {getSupabaseAdmin} from "@/lib/supabaseAdmin";
import {sendBeautyFlowEmail} from "@/lib/email/emailSender";
import {customerBookingEmail,adminBookingEmail} from "@/lib/email/templates";
import {formatDateBG} from "@/lib/beautyflow/date";

const clean=(v:unknown,n=160)=>String(v||"").trim().slice(0,n);
function mapsUrl(v?:string|null){const x=String(v||"").trim();if(!x)return"";if(/^https?:\/\//i.test(x))return x;const m=x.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);return m?`https://www.google.com/maps?q=${encodeURIComponent(`${m[1]},${m[2]}`)}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x)}`}

export async function POST(req:Request){
 try{
  const b=await req.json(); const appointmentId=clean(b.appointmentId,60);
  if(!appointmentId)return NextResponse.json({message:"Липсва резервация."},{status:400});
  const db=getSupabaseAdmin();
  const {data:a,error}=await db.from("appointments").select("*").eq("id",appointmentId).maybeSingle();
  if(error||!a)return NextResponse.json({message:"Резервацията не е намерена."},{status:404});
  const [{data:salon},{data:service},{data:staff},{data:settings}]=await Promise.all([
   db.from("salons").select("name,owner_id,map_location,address").eq("id",a.salon_id).maybeSingle(),
   db.from("services").select("name").eq("id",a.service_id).maybeSingle(),
   a.staff_id?db.from("staff").select("name").eq("id",a.staff_id).maybeSingle():Promise.resolve({data:null}),
   db.from("booking_settings").select("notify_new_booking").eq("salon_id",a.salon_id).maybeSingle()
  ]);
  if(!salon||!service)return NextResponse.json({ok:true});
  const mapLink=mapsUrl((salon as any).map_location)||(/^https?:\/\//i.test(String((salon as any).address||""))?String((salon as any).address):"");
  const jobs:Promise<any>[]=[];
  if(a.customer_email){const t=customerBookingEmail({customerName:a.customer_name,salonName:salon.name,serviceName:service.name,date:formatDateBG(a.appointment_date),time:String(a.start_time).slice(0,5),mapUrl:mapLink||null});jobs.push(sendBeautyFlowEmail({to:a.customer_email,...t}))}
  if(settings?.notify_new_booking&&salon.owner_id){const owner=await db.auth.admin.getUserById(salon.owner_id);const ownerEmail=owner.data.user?.email;if(ownerEmail){const t=adminBookingEmail({salonName:salon.name,customerName:a.customer_name,phone:a.customer_phone,email:a.customer_email,serviceName:service.name,date:formatDateBG(a.appointment_date),time:String(a.start_time).slice(0,5),note:a.note});jobs.push(sendBeautyFlowEmail({to:ownerEmail,...t}))}}
  await Promise.allSettled(jobs);
  return NextResponse.json({ok:true,staffName:(staff as any)?.name||null});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Грешка при известяването."},{status:500})}
}
