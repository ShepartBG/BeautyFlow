import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id)) {
    return NextResponse.json({ message: "Невалиден адрес на специалиста." }, { status: 400 });
  }
  try {
    const db = getSupabaseAdmin();
    const { data: specialist, error } = await db.from("staff")
      .select("id,salon_id,name,title,bio,avatar_url,instagram_url,facebook_url")
      .eq("id", id).eq("active", true).maybeSingle();
    if (error) throw error;
    if (!specialist) return NextResponse.json({ message: "Специалистът не е намерен." }, { status: 404 });
    const { data: salon, error: salonError } = await db.from("salons")
      .select("id,name,slug,city,category,logo_url,active")
      .eq("id", specialist.salon_id).eq("active", true).maybeSingle();
    if (salonError) throw salonError;
    if (!salon) return NextResponse.json({ message: "Специалистът не е намерен." }, { status: 404 });
    const { data: links, error: linksError } = await db.from("staff_services")
      .select("service_id").eq("staff_id", specialist.id).eq("salon_id", salon.id);
    if (linksError) throw linksError;
    const ids = (links || []).map(link => link.service_id);
    let services: { id: string; name: string; duration_min: number; price: number }[] = [];
    if (ids.length) {
      const result = await db.from("services").select("id,name,duration_min,price")
        .eq("salon_id", salon.id).eq("active", true).in("id", ids).order("name");
      if (result.error) throw result.error;
      services = result.data || [];
    }
    return NextResponse.json({ specialist, salon, services }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Public specialist load failed", error);
    return NextResponse.json({ message: "Не успяхме да заредим специалиста." }, { status: 500 });
  }
}
