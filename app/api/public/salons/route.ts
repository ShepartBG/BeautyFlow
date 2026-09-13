import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(){
  try{
    const db = getSupabaseAdmin();
    const {data,error}=await db
      .from("salons")
      .select("id,name,slug,city,category,description,logo_url,cover_url,logo_position_x,logo_position_y,cover_position_x,cover_position_y,active,subscription_status,onboarding_completed,created_at")
      .eq("active",true)
      .order("created_at",{ascending:false});
    if(error) throw error;
    return NextResponse.json({salons:data||[]},{headers:{"Cache-Control":"no-store"}});
  }catch(e){
    return NextResponse.json({salons:[],message:e instanceof Error?e.message:"Грешка при зареждане на салоните."},{status:500});
  }
}
