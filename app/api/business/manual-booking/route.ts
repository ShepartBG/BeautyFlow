import { NextResponse } from "next/server";
import { requireBusinessUser } from "@/lib/beautyflow/businessAuth";
import { canCreateBeautyFlowBookings } from "@/lib/beautyflow/subscription";
import { toMinutes, fromMinutes } from "@/lib/beautyflow/time";
import { GET as availabilityGET } from "@/app/api/public/availability/route";

const clean = (v: unknown, n: number) => String(v || "").replace(/[<>]/g, "").trim().slice(0, n);
const phoneKey = (v: string) => v.replace(/[^0-9+]/g, "");

/*
  Manual booking from the business panel. The signed-in owner or specialist books only into their
  own schedule, with no email and no online-client limits. The chosen time must be one of the free
  slots the public availability code returns, and the insert uses the same atomic function as
  online bookings, so the same slot can never be taken twice.
*/
export async function POST(req: Request) {
  const auth = await requireBusinessUser(req);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  try {
    const b = await req.json();
    const serviceId = clean(b.serviceId, 60), date = clean(b.date, 10), startTime = clean(b.startTime, 5);
    const customerName = clean(b.customerName, 90), customerPhone = clean(b.customerPhone, 20), note = clean(b.note, 100) || null;
    const phone = phoneKey(customerPhone);
    if (!/^[0-9a-f-]{36}$/i.test(serviceId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return NextResponse.json({ message: "Избери услуга, ден и час." }, { status: 400 });
    if (customerName.length < 2) return NextResponse.json({ message: "Въведи името на клиента." }, { status: 400 });
    if (!/^0\d{9}$/.test(phone)) return NextResponse.json({ message: "Телефонът трябва да е български номер от 10 цифри и да започва с 0." }, { status: 400 });

    const db = auth.admin, salon = auth.business;
    if (!canCreateBeautyFlowBookings(salon)) return NextResponse.json({ message: "Абонаментът не е активен — записванията временно са спрени." }, { status: 403 });

    // Everyone books into their own schedule only.
    const { data: me } = await db.from("staff").select("id,name").eq("salon_id", salon.id).eq("user_id", auth.user.id).eq("active", true).is("deleted_at", null).maybeSingle();
    if (!me) return NextResponse.json({ message: "Нямаш активен график в този салон." }, { status: 403 });

    const { data: service } = await db.from("services").select("id,name,duration_min,buffer_min,price").eq("id", serviceId).eq("salon_id", salon.id).eq("active", true).maybeSingle();
    if (!service) return NextResponse.json({ message: "Услугата не е налична." }, { status: 409 });

    // Same free-slot computation the client sees (manual mode: no notice / advance limits).
    const avUrl = new URL("/api/public/availability", req.url);
    avUrl.search = new URLSearchParams({ salonId: salon.id, serviceId, staffId: me.id, date, manual: "1" }).toString();
    const avRes = await availabilityGET(new Request(avUrl, { headers: { authorization: req.headers.get("authorization") || "" } }));
    const av = await avRes.json();
    const free = (av.timeline || []).some((x: { time: string; status: string; staffId?: string }) => x.time === startTime && x.status === "available" && x.staffId === me.id);
    if (!free) return NextResponse.json({ message: "Този час вече не е свободен в твоя график. Избери друг." }, { status: 409 });

    const { data: flags } = await db.from("salon_customers").select("status").eq("salon_id", salon.id).eq("phone_normalized", phone).maybeSingle();
    if (flags?.status === "blacklist" && b.confirmBlacklist !== true) {
      return NextResponse.json({ blacklisted: true, message: "Този клиент е в черния списък. Сигурен ли си, че искаш да го запишеш?" }, { status: 409 });
    }

    const end = fromMinutes(Math.min(toMinutes(startTime) + Number(service.duration_min) + Number(service.buffer_min || 0), 1439));
    const { data: appointmentId, error } = await db.rpc("beautyflow_create_appointment_atomic", {
      p_salon: salon.id, p_service: service.id, p_staff: me.id, p_date: date, p_start: startTime, p_end: end,
      p_customer_name: customerName, p_customer_phone: phone, p_customer_phone_normalized: phone, p_customer_email: null, p_note: note, p_terms_accepted_at: null,
    });
    if (error || !appointmentId) {
      const msg = String(error?.message || "");
      return NextResponse.json({ message: /зает|occupied/i.test(msg) ? "Този час току-що беше зает. Избери друг." : `Не успяхме да запишем часа: ${msg || "неизвестна грешка"}` }, { status: 409 });
    }
    await db.from("appointments").update({ source: "manual" }).eq("id", appointmentId);

    // Customer history: create the customer or refresh their details, keeping any existing status.
    const now = new Date().toISOString();
    if (flags) await db.from("salon_customers").update({ customer_name: customerName, customer_phone: phone, updated_at: now }).eq("salon_id", salon.id).eq("phone_normalized", phone);
    else await db.from("salon_customers").insert({ salon_id: salon.id, phone_normalized: phone, customer_name: customerName, customer_phone: phone, status: "regular", updated_at: now });

    return NextResponse.json({ ok: true, appointmentId, service: service.name, price: service.price, date, time: startTime, staffName: me.name, salon: salon.name, message: "Часът е записан." });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Грешка при записването." }, { status: 500 });
  }
}
