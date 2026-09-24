import{NextResponse}from"next/server";
import{getSupabaseAdmin}from"@/lib/supabaseAdmin";

async function context(req:Request,salonId:string){
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return{error:NextResponse.json({message:"Няма активна сесия."},{status:401})};
 const db=getSupabaseAdmin();
 const{data:u,error:ue}=await db.auth.getUser(token);
 if(ue||!u.user)return{error:NextResponse.json({message:"Невалидна сесия."},{status:401})};
 const[{data:salon},{data:member}]=await Promise.all([
  db.from("salons").select("owner_id").eq("id",salonId).maybeSingle(),
  db.from("business_members").select("staff_id,role,active").eq("salon_id",salonId).eq("user_id",u.user.id).eq("active",true).maybeSingle()
 ]);
 if(!salon||(salon.owner_id!==u.user.id&&!member))return{error:NextResponse.json({message:"Нямаш достъп."},{status:403})};
 return{db,user:u.user,member,isOwner:salon.owner_id===u.user.id};
}

export async function DELETE(req:Request){
 try{
  const body=await req.json().catch(()=>({}));
  const salonId=String(body.salonId||""),appointmentId=String(body.appointmentId||"");
  if(!salonId||!appointmentId)return NextResponse.json({message:"Липсват данни за часа."},{status:400});
  const c:any=await context(req,salonId);if(c.error)return c.error;
  let q=c.db.from("appointments").delete().eq("id",appointmentId).eq("salon_id",salonId);
  if(!c.isOwner&&c.member?.staff_id)q=q.eq("staff_id",c.member.staff_id);
  const{error}=await q;if(error)throw error;
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Не успяхме да изтрием часа."},{status:500})}
}

export async function PATCH(req:Request){
 try{
  const body=await req.json().catch(()=>({}));
  const salonId=String(body.salonId||""),appointmentId=String(body.appointmentId||""),status=String(body.status||"");
  const allowed=new Set(["confirmed","completed","late","cancelled","no_show"]);
  if(!salonId||!appointmentId||!allowed.has(status))return NextResponse.json({message:"Невалидни данни."},{status:400});
  const c:any=await context(req,salonId);if(c.error)return c.error;
  let find=c.db.from("appointments").select("id,staff_id,customer_name,customer_phone,customer_email,customer_phone_normalized").eq("id",appointmentId).eq("salon_id",salonId);
  if(!c.isOwner&&c.member?.staff_id)find=find.eq("staff_id",c.member.staff_id);
  const{data:a,error:fe}=await find.maybeSingle();if(fe)throw fe;if(!a)return NextResponse.json({message:"Часът не е намерен."},{status:404});
  const{error:ue}=await c.db.from("appointments").update({status}).eq("id",appointmentId).eq("salon_id",salonId);if(ue)throw ue;
  const normalized=String(a.customer_phone_normalized||a.customer_phone||"").replace(/[^0-9+]/g,"");
  const customerStatus=status==="completed"||status==="confirmed"?"regular":status;
  if(normalized)await c.db.from("salon_customers").upsert({salon_id:salonId,phone_normalized:normalized,customer_name:a.customer_name,customer_phone:a.customer_phone,customer_email:a.customer_email||null,status:customerStatus,updated_at:new Date().toISOString()},{onConflict:"salon_id,phone_normalized"});
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Не успяхме да запазим промяната."},{status:500})}
}
