import {NextResponse} from "next/server";
import {requireBusinessUser} from "@/lib/beautyflow/businessAuth";
import {canCreateBeautyFlowBookings} from "@/lib/beautyflow/subscription";
import {sendBeautyFlowEmail} from "@/lib/email/emailSender";
import {waitlistAssignedEmail} from "@/lib/email/templates";
export async function POST(req:Request){
 const auth=await requireBusinessUser(req);if(!auth.ok)return NextResponse.json({message:auth.message},{status:auth.status});
 try{
  const body=await req.json(),id=String(body.id||""),date=String(body.date||""),time=String(body.time||"");
  if(!/^[0-9a-f-]{36}$/i.test(id)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return NextResponse.json({message:"Избери валидна дата и час."},{status:400});
  if(!canCreateBeautyFlowBookings(auth.business))return NextResponse.json({message:"Достъпът за записвания не е активен."},{status:403});
  const db=auth.admin;
  const{data:w,error:waitError}=await db.from("waitlist_entries").select("*").eq("id",id).eq("salon_id",auth.business.id).eq("status","waiting").maybeSingle();if(waitError)throw waitError;
  if(!w)return NextResponse.json({message:"Заявката вече не е активна."},{status:409});
  if(auth.role==="staff"&&(!auth.staffId||w.staff_id!==auth.staffId))return NextResponse.json({message:"Нямаш достъп до този запис в списъка."},{status:403});
  const staffId=auth.role==="staff"?auth.staffId!:String(body.staffId||w.staff_id||"");
  if(auth.role==="staff"&&auth.staffId!==staffId)return NextResponse.json({message:"Можеш да записваш клиенти само в своя график."},{status:403});
  if(!/^[0-9a-f-]{36}$/i.test(staffId))return NextResponse.json({message:"Избери час със специалист."},{status:400});
  const{data:appointmentId,error}=await db.rpc("beautyflow_assign_waitlist",{p_salon:auth.business.id,p_entry:id,p_staff:staffId,p_date:date,p_time:time});
  if(error)return NextResponse.json({message:error.message},{status:409});
  const[{data:service},{data:staff}]=await Promise.all([db.from("services").select("name").eq("id",w.service_id).maybeSingle(),db.from("staff").select("name").eq("id",staffId).maybeSingle()]);
  let emailSent=false;
  try{if(process.env.NODE_ENV!=="production"&&process.env.BEAUTYFLOW_E2E_MODE==="1")emailSent=true;
   else if(w.customer_email){const mail=await sendBeautyFlowEmail({to:w.customer_email,...waitlistAssignedEmail({customerName:w.customer_name,salonName:auth.business.name,serviceName:service?.name||"Услуга",date:date.split("-").reverse().join("."),time,staffName:staff?.name})});emailSent=mail.ok;if(!mail.ok)console.error("Waitlist email failed",mail.message)}
  }catch(error){console.error("Waitlist email failed",error)}
  return NextResponse.json({ok:true,appointmentId,emailSent,message:emailSent?"Клиентът е записан. Имейлът с часа е изпратен.":"Клиентът е записан, но имейлът не беше изпратен. Уведоми го директно."});
 }catch(error){console.error("Waitlist assignment failed",error);return NextResponse.json({message:error instanceof Error?error.message:(error as {message?:string})?.message||"Не успяхме да запишем клиента."},{status:500})}
}
