import {NextResponse} from "next/server";
import {requireBusinessUser} from "@/lib/beautyflow/businessAuth";
import {isValidSpecialtyTitle} from "@/lib/beautyflow/specialties";

export async function PATCH(req:Request){
 const auth=await requireBusinessUser(req);
 if(!auth.ok)return NextResponse.json({message:auth.message},{status:auth.status});
 try{
  const body=await req.json();
  const staffId=String(body.staffId||"");
  if(!staffId||(!auth.staffId&&auth.role!=="owner"))return NextResponse.json({message:"Липсва профил на специалист."},{status:400});
  const{data:staff}=await auth.admin.from("staff").select("id,user_id").eq("id",staffId).eq("salon_id",auth.business.id).maybeSingle();
  if(!staff||((auth.role!=="owner"||staff.user_id!==auth.user.id)&&auth.staffId!==staffId))return NextResponse.json({message:"Нямаш достъп до този профил."},{status:403});
  const name=String(body.name||"").trim().slice(0,90),title=String(body.title||"").trim();
  if(!name||!isValidSpecialtyTitle(title))return NextResponse.json({message:"Попълни име и специалност до 90 символа."},{status:400});
  if(typeof body.avatar_url==="string"){
   const storageOrigin=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://invalid.local").origin;
   let image:URL;try{image=new URL(body.avatar_url)}catch{return NextResponse.json({message:"Невалиден адрес на снимката."},{status:400})}
   if(image.origin!==storageOrigin||image.pathname!==`/storage/v1/object/public/salon-media/${auth.business.id}/staff/${staffId}.webp`)return NextResponse.json({message:"Снимката не принадлежи на този профил."},{status:400});
  }
  const patch={name,title,bio:String(body.bio||"").trim().slice(0,100),instagram_url:String(body.instagram_url||"").trim().slice(0,180),facebook_url:String(body.facebook_url||"").trim().slice(0,180),...(typeof body.avatar_url==="string"?{avatar_url:body.avatar_url}: {})};
  const{data,error}=await auth.admin.from("staff").update(patch).eq("id",staffId).eq("salon_id",auth.business.id).select("*").single();
  if(error)throw error;
  return NextResponse.json({ok:true,staff:data});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Не успяхме да запазим профила."},{status:500})}
}
