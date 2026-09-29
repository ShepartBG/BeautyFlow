import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const rawSlug = new URL(req.url).searchParams.get("slug")?.trim() || "";
  let slug = rawSlug;
  try { if (slug.includes("%")) slug = decodeURIComponent(slug); } catch {
    return NextResponse.json({ message: "Невалиден адрес на салона." }, { status: 400 });
  }
  if (!slug || slug.length > 80 || !/^[\p{L}\p{N}-]+$/u.test(slug)) {
    return NextResponse.json({ message: "Невалиден адрес на салона." }, { status: 400 });
  }

  try {
    const db = getSupabaseAdmin();
    const { data: salon, error } = await db.from("salons")
      .select("id,name,slug,city,category,description,phone,address,map_location,facebook_url,instagram_url,tiktok_url,logo_url,cover_url,logo_position_x,logo_position_y,subscription_status,subscription_ends_at,trial_ends_at,active")
      .eq("slug", slug).eq("active", true).maybeSingle();
    if (error) throw error;
    if (!salon) return NextResponse.json({ message: "Бизнесът не е намерен." }, { status: 404 });

    const [services, staff, links, gallery] = await Promise.all([
      db.from("services").select("id,name,duration_min,buffer_min,price,image_url").eq("salon_id", salon.id).eq("active", true).order("name"),
      db.from("staff").select("id,name,title,avatar_url,bio,instagram_url,facebook_url").eq("salon_id", salon.id).eq("active", true).order("name"),
      db.from("staff_services").select("staff_id,service_id").eq("salon_id", salon.id),
      db.from("salon_gallery").select("id,image_url,sort_order").eq("salon_id", salon.id).order("sort_order").order("id"),
    ]);
    const failure = [services, staff, links, gallery].find(result => result.error);
    if (failure?.error) throw failure.error;
    return NextResponse.json({ salon, services: services.data || [], staff: staff.data || [], links: links.data || [], gallery: gallery.data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Public salon load failed", error);
    return NextResponse.json({ message: "Не успяхме да заредим салона. Опитай отново." }, { status: 500 });
  }
}
