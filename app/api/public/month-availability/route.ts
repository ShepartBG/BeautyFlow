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
  const [{data:salon},{data:hours},{data:settings},{data:off},serviceResult,appsResult]=await Promise.all([
   db.from("salons").select("active,subscription_status,subscription_ends_at,trial_ends_at").eq("id",salonId).maybeSingle(),
   db.from("working_hours").select("weekday,enabled,start_time,end_time").eq("salon_id",salonId),
   db.from("booking_settings").select("slot_step_min,min_notice_hours,min_notice_minutes,max_advance_days").eq("salon_id",salonId).maybeSingle(),
   db.from("time_off").select("off_date,all_day,start_time,end_time").eq("salon_id",salonId).gte("off_date",first).lte("off_date",last),
   serviceId?db.from("services").select("duration_min,buffer_min").eq("id",serviceId).eq("salon_id",salonId).eq("active",true).maybeSingle():Promise.resolve({data:null}),
   serviceId?db.from("appointments").select("appointment_date,start_time,end_time,staff_id,status").eq("salon_id",salonId).gte("appointment_date",first).lte("appointment_date",last).neq("status","cancelled"):Promise.resolve({data:[]})
  ]);
  if(!salon?.active||!canCreateBeautyFlowBookings(salon))return NextResponse.json({days:{},bookingUnavailable:true,message:"Онлайн записването временно не е достъпно."},{status:403});
  const service=(serviceResult as any).data,apps=(appsResult as any).data||[];
  if(serviceId&&!service)return NextResponse.json({days:{}});
  const days:Record<string,"available"|"full"|"unavailable">={},step=15,now=sofiaNow(),minNotice=Number(settings?.min_notice_minutes??Math.max(Number(settings?.min_notice_hours||0)*60,180)),maxDays=settings?.max_advance_days||60;
  for(let d=1;d<=lastDay;d++){
   const date=iso(year,month,d),dt=new Date(`${date}T12:00:00`),diff=Math.floor((localWallMinutes(year,month,d)-localWallMinutes(now.year,now.month,now.day))/1440),wh=(hours||[]).find((h:any)=>h.weekday===dt.getDay()),offs=(off||[]).filter((x:any)=>x.off_date===date);
   if(diff<0||diff>maxDays||!wh?.enabled||offs.some((x:any)=>x.all_day)){days[date]="unavailable";continue}
   // Before a service is selected, show only the real working/non-working schedule configured by the owner.
   if(!service){days[date]="available";continue}
   const dur=service.duration_min+service.buffer_min,start=toMinutes(wh.start_time),end=toMinutes(wh.end_time),appointments=apps.filter((a:any)=>a.appointment_date===date&&(!staffId||!a.staff_id||a.staff_id===staffId)).map((a:any)=>[toMinutes(a.start_time),toMinutes(a.end_time)] as [number,number]),offBlocks=offs.filter((x:any)=>!x.all_day&&x.start_time&&x.end_time).map((x:any)=>[toMinutes(x.start_time),toMinutes(x.end_time)] as [number,number]);
   let free=0;for(let t=start;t<=end;t+=step){const past=diff===0&&t<now.hour*60+now.minute+minNotice,fit=!appointments.some(([a,b])=>overlaps(t,t+dur,a,b))&&!offBlocks.some(([a,b])=>overlaps(t,t+dur,a,b))&&!past;if(fit)free++}
   days[date]=free>0?"available":"full";
  }
  return NextResponse.json({days,mode:serviceId?"service":"schedule"});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Грешка",days:{}},{status:500})}
}
