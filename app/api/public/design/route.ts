import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
const fallback={background_url:"/brand/beautyflow-background.png",background_position:"center top",overlay_opacity:0,page_frames:{}};
export async function GET(){
 try{
   const db=getSupabaseAdmin();
   const {data,error}=await db.from("platform_design_settings").select("background_url,background_position,page_frames").eq("id",1).maybeSingle();
   if(error||!data)return NextResponse.json(fallback);
   return NextResponse.json({...fallback,...data,overlay_opacity:0,page_frames:data.page_frames||{}});
 }catch{return NextResponse.json(fallback)}
}
