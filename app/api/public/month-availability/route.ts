import{NextResponse}from"next/server";
import{getSupabaseAdmin}from"@/lib/supabaseAdmin";
import{toMinutes,overlaps}from"@/lib/beautyflow/time";
import{sofiaNow,localWallMinutes}from"@/lib/beautyflow/clock";
import{canCreateBeautyFlowBookings}from"@/lib/beautyflow/subscription";

function iso(y:number,m:number,d:number){return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
export async function GET(req:Request){
 try{
  const u=new URL(req.url),salonId=u.searchParams.get("salonId")||"",serviceId=u.searchParams.get("serviceId")||"",staffId=u.searchParams.get("staffId")||"",year=Number(u.searchParams.get("year")),month=Number(u.searchParams.get("month"));
  if(!salonId||!year||!month)return NextResponse.json({days:{}});
  const db=getSupabaseAdmin(),first=iso(year,month,1),lastDay=new Date(year,month,0).getDate(),last=iso(year,month,lastDay);
  const [{data:salon},{data:hours},{data:settings},{data:off},{data:staffRows},{data:staffHours},{data:staffOff},{data:serviceLinks},serviceResult,appsResult]=await Promise.all([
   db.from("salons").select("active,subscription_status,subscription_ends_at,trial_ends_at").eq("id",salonId).maybeSingle(),
   db.from("working_hours").select("weekday,enabled,start_time,end_time").eq("salon_id",salonId),
   db.from("booking_settings").select("slot_step_min,min_notice_hours,max_advance_days").eq("salon_id",salonId).maybeSingle(),
   db.from("time_off").select("off_date,all_day,start_time,end_time").eq("salon_id",salonId).gte("off_date",first).lte("off_date",last),
   db.from("staff").select("id").eq("salon_id",salonId).eq("active",true),
   db.from("staff_working_hours").select("staff_id,weekday,enabled,start_time,end_time").eq("salon_id",salonId),
   db.from("staff_time_off").select("staff_id,off_date,all_day,start_time,end_time").eq("salon_id",salonId).gte("off_date",first).lte("off_date",last),
   serviceId?db.from("staff_services").select("staff_id").eq("salon_id",salonId).eq("service_id",serviceId):Promise.resolve({data:[]}),
   serviceId?db.from("services").select("duration_min,buffer_min").eq("id",serviceId).eq("salon_id",salonId).eq("active",true).maybeSingle():Promise.resolve({data:null}),
   serviceId?db.from("appointments").select("appointment_date,start_time,end_time,staff_id,status").eq("salon_id",salonId).gte("appointment_date",first).lte("appointment_date",last).neq("status","cancelled"):Promise.resolve({data:[]})
  ]);
  if(!salon?.active||!canCreateBeautyFlowBookings(salon))return NextResponse.json({days:{},bookingUnavailable:true,message:"Онлайн записването временно не е достъпно."},{status:403});
  const service=(serviceResult as any).data,apps=(appsResult as any).data||[];if(serviceId&&!service)return NextResponse.json({days:{}});
  const linked=new Set((serviceLinks||[]).map((x:any)=>x.staff_id));let candidates=(staffRows||[]).filter((x:any)=>!serviceId||linked.size===0||linked.has(x.id));if(staffId)candidates=candidates.filter((x:any)=>x.id===staffId);
  const days:Record<string,"available"|"full"|"unavailable"|"blocked">={},step=Number(settings?.slot_step_min||15),now=sofiaNow(),minNotice=Math.max(Number(settings?.min_notice_hours||3)*60,180),maxDays=Number(settings?.max_advance_days||60);
  for(let d=1;d<=lastDay;d++){
   const date=iso(year,month,d),weekday=new Date(`${date}T12:00:00`).getDay(),diff=Math.floor((localWallMinutes(year,month,d)-localWallMinutes(now.year,now.month,now.day))/1440),salonWh=(hours||[]).find((h:any)=>h.weekday===weekday),salonOff=(off||[]).filter((x:any)=>x.off_date===date);
   if(diff<0||diff>maxDays||salonOff.some((x:any)=>x.all_day)){days[date]="unavailable";continue}
   const usableStaff=candidates.filter((st:any)=>{const own=(staffHours||[]).find((h:any)=>h.staff_id===st.id&&h.weekday===weekday);const wh=own||salonWh;return Boolean(wh?.enabled)&&!(staffOff||[]).some((x:any)=>x.staff_id===st.id&&x.off_date===date&&x.all_day)});
   const salonWorks=Boolean(salonWh?.enabled)||usableStaff.length>0;
   if(!salonWorks){days[date]="unavailable";continue}const dayLatestEnd=Math.max(Number(salonWh?.enabled?toMinutes(salonWh.end_time):0),...usableStaff.map((st:any)=>{const own=(staffHours||[]).find((h:any)=>h.staff_id===st.id&&h.weekday===weekday),wh=own||salonWh;return wh?.enabled?toMinutes(wh.end_time):0}));const latestLead=diff*1440+dayLatestEnd-(now.hour*60+now.minute);if(latestLead<minNotice){days[date]="blocked";continue}if(!service){days[date]="available";continue}
   const dur=Number(service.duration_min)+Number(service.buffer_min||0);let free=false;
   for(const st of usableStaff){const own=(staffHours||[]).find((h:any)=>h.staff_id===st.id&&h.weekday===weekday),wh=own||salonWh;if(!wh?.enabled)continue;const start=toMinutes(wh.start_time),end=toMinutes(wh.end_time),appointments=apps.filter((a:any)=>a.appointment_date===date&&(!a.staff_id||a.staff_id===st.id)).map((a:any)=>[toMinutes(a.start_time),toMinutes(a.end_time)] as [number,number]),blocks=[...salonOff.filter((x:any)=>!x.all_day&&x.start_time&&x.end_time),...(staffOff||[]).filter((x:any)=>x.staff_id===st.id&&x.off_date===date&&!x.all_day&&x.start_time&&x.end_time)].map((x:any)=>[toMinutes(x.start_time),toMinutes(x.end_time)] as [number,number]);
    for(let t=start;t+dur<=end;t+=step){const notice=diff*1440+t-(now.hour*60+now.minute)>=minNotice,fit=notice&&!appointments.some(([a,b])=>overlaps(t,t+dur,a,b))&&!blocks.some(([a,b])=>overlaps(t,t+dur,a,b));if(fit){free=true;break}}if(free)break;
   }
   days[date]=free?"available":"full";
  }
  return NextResponse.json({days,mode:serviceId?"service":"schedule"});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Грешка",days:{}},{status:500})}
}
