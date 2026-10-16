import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthSiteUrl } from "@/lib/authRedirect";
import { buildIcs } from "@/lib/beautyflow/calendarEvent";

export const dynamic = "force-dynamic";

function mapsUrl(v?: string | null) {
  const x = String(v || "").trim();
  if (!x) return "";
  if (/^https?:\/\//i.test(x)) return x;
  const m = x.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
  return m ? `https://www.google.com/maps?q=${encodeURIComponent(`${m[1]},${m[2]}`)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x)}`;
}

// Calendar file (.ics) for a booked appointment, opened from the booking confirmation.
// The appointment id is an unguessable UUID; the file holds no customer personal data.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ message: "Невалидна резервация." }, { status: 400 });
  try {
    const db = getSupabaseAdmin();
    const { data: a } = await db.from("appointments").select("id,salon_id,service_id,staff_id,appointment_date,start_time,status").eq("id", id).maybeSingle();
    if (!a || a.status === "cancelled") return NextResponse.json({ message: "Резервацията не е намерена." }, { status: 404 });
    const [{ data: salon }, { data: service }, { data: staff }] = await Promise.all([
      db.from("salons").select("name,slug,address,city,map_location").eq("id", a.salon_id).maybeSingle(),
      db.from("services").select("name,duration_min").eq("id", a.service_id).maybeSingle(),
      a.staff_id ? db.from("staff").select("name").eq("id", a.staff_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (!salon || !service) return NextResponse.json({ message: "Резервацията не е намерена." }, { status: 404 });
    const map = mapsUrl(salon.map_location) || mapsUrl([salon.address, salon.city].filter(Boolean).join(", "));
    const ics = buildIcs({
      uid: a.id,
      date: String(a.appointment_date).slice(0, 10),
      time: String(a.start_time).slice(0, 5),
      minutes: Number(service.duration_min) || 60,
      title: `${service.name} · ${salon.name}`,
      description: [staff?.name ? `Специалист: ${staff.name}` : "", map ? `Карта: ${map}` : "", "Записано през BeautyFlow"].filter(Boolean).join("\n"),
      location: [salon.address, salon.city].filter(Boolean).join(", "),
      url: `${getAuthSiteUrl(new URL(req.url).origin)}/salon/${encodeURIComponent(salon.slug)}`,
    });
    const file = `BeautyFlow-${String(a.appointment_date).slice(0, 10)}-${String(a.start_time).slice(0, 5).replace(":", "")}.ics`;
    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${file}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Грешка при създаването на календарния файл." }, { status: 500 });
  }
}
