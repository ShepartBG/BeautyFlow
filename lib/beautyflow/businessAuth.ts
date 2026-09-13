import {getSupabaseAdmin} from "@/lib/supabaseAdmin";
export async function requireBusinessUser(req:Request){
 const auth=req.headers.get("authorization")||"";const token=auth.startsWith("Bearer ")?auth.slice(7):"";
 if(!token)return{ok:false as const,status:401,message:"Няма активна сесия."};
 const admin=getSupabaseAdmin();const{data:u,error}=await admin.auth.getUser(token);
 if(error||!u.user)return{ok:false as const,status:401,message:"Невалидна сесия."};
 const{data:owned}=await admin.from("salons").select("*").eq("owner_id",u.user.id).maybeSingle();
 if(owned)return{ok:true as const,user:u.user,admin,business:owned,role:"owner" as const,staffId:null as string|null};
 const{data:membership}=await admin.from("business_members").select("salon_id,role,staff_id,active").eq("user_id",u.user.id).eq("active",true).maybeSingle();
 if(!membership)return{ok:false as const,status:403,message:"Нямаш достъп до BeautyFlow бизнес."};
 const{data:business}=await admin.from("salons").select("*").eq("id",membership.salon_id).maybeSingle();
 if(!business?.active)return{ok:false as const,status:403,message:"Достъпът до този бизнес е ограничен."};
 return{ok:true as const,user:u.user,admin,business,role:membership.role==="owner"?"owner" as const:"staff" as const,staffId:membership.staff_id||null};
}
export async function requireBusinessOwner(req:Request){const a=await requireBusinessUser(req);if(!a.ok)return a;if(a.role!=="owner"&&a.business.owner_id!==a.user.id)return{ok:false as const,status:403,message:"Само собственикът на салона може да извърши това действие."};return{...a,role:"owner" as const}}
