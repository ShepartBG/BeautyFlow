import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const PAGE_SIZE=12;

export async function GET(req:Request){
  try{
    const params=new URL(req.url).searchParams;
    const page=Math.max(1,Math.min(1000,Math.trunc(Number(params.get("page"))||1)));
    const category=params.get("category")||"all";
    const search=(params.get("q")||"").replace(/[,()%_"'\\]/g," ").trim().slice(0,80);
    const db = getSupabaseAdmin();
    let query=db
      .from("salons")
      .select("id,name,slug,city,category,description,logo_url,cover_url,logo_position_x,logo_position_y,active,subscription_status,onboarding_completed,created_at",{count:"exact"})
      .eq("active",true);
    if(category!=="all"&&/^[a-z0-9_-]{1,40}$/.test(category))query=query.eq("category",category);
    if(search)query=query.or(`name.ilike.%${search}%,city.ilike.%${search}%,description.ilike.%${search}%`);
    const {data,error,count}=await query.order("created_at",{ascending:false}).order("id",{ascending:false}).range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1);
    if(error) throw error;
    return NextResponse.json({salons:data||[],total:count||0,page,pageSize:PAGE_SIZE},{headers:{"Cache-Control":"no-store"}});
  }catch(e){
    return NextResponse.json({salons:[],message:e instanceof Error?e.message:"Грешка при зареждане на салоните."},{status:500});
  }
}
