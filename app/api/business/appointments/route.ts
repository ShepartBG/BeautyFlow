import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function context(req: Request, salonId: string) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: NextResponse.json({ message: "Няма активна сесия." }, { status: 401 }) };
  const db = getSupabaseAdmin();
  const { data: auth, error } = await db.auth.getUser(token);
  if (error || !auth.user) return { error: NextResponse.json({ message: "Невалидна сесия." }, { status: 401 }) };
  const [{ data: salon }, { data: member }] = await Promise.all([
    db.from("salons").select("owner_id").eq("id", salonId).maybeSingle(),
    db.from("business_members").select("staff_id,active").eq("salon_id", salonId).eq("user_id", auth.user.id).eq("active", true).maybeSingle(),
  ]);
  if (!salon || (salon.owner_id !== auth.user.id && !member)) {
    return { error: NextResponse.json({ message: "Нямаш достъп." }, { status: 403 }) };
  }
  return { db, user: auth.user, salon, member };
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const salonId = String(body.salonId || "");
    const appointmentId = String(body.appointmentId || "");
    if (!salonId || !appointmentId) return NextResponse.json({ message: "Липсва записване." }, { status: 400 });
    const ctx = await context(req, salonId);
    if ("error" in ctx) return ctx.error;
    const { error } = await ctx.db.from("appointments").delete().eq("id", appointmentId).eq("salon_id", salonId);
    if (error) throw error;
    return NextResponse.json({ ok: true, message: "Часът е изтрит и отново е свободен." });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Не успяхме да изтрием часа." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const salonId = String(body.salonId || "");
    const appointmentId = String(body.appointmentId || "");
    const status = String(body.status || "");
    const allowed = new Set(["confirmed", "completed", "cancelled", "no_show", "blacklist"]);
    if (!salonId || !appointmentId || !allowed.has(status)) return NextResponse.json({ message: "Невалидна промяна." }, { status: 400 });
    const ctx = await context(req, salonId);
    if ("error" in ctx) return ctx.error;
    const { data: appointment, error: readError } = await ctx.db.from("appointments").select("customer_name,customer_phone,customer_email,customer_phone_normalized").eq("id", appointmentId).eq("salon_id", salonId).maybeSingle();
    if (readError) throw readError;
    if (!appointment) return NextResponse.json({ message: "Записването не е намерено." }, { status: 404 });
    const { error: updateError } = await ctx.db.from("appointments").update({ status }).eq("id", appointmentId).eq("salon_id", salonId);
    if (updateError) throw updateError;
    const phone = String(appointment.customer_phone_normalized || appointment.customer_phone || "").replace(/[^0-9+]/g, "");
    if (phone) {
      const customerStatus = status === "completed" || status === "confirmed" ? "regular" : status;
      await ctx.db.from("salon_customers").upsert({
        salon_id: salonId,
        phone_normalized: phone,
        customer_name: appointment.customer_name,
        customer_phone: appointment.customer_phone,
        customer_email: appointment.customer_email || null,
        status: customerStatus,
        updated_at: new Date().toISOString(),
      }, { onConflict: "salon_id,phone_normalized" });
    }
    return NextResponse.json({ ok: true, message: "Промяната е запазена." });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Не успяхме да запазим промяната." }, { status: 500 });
  }
}
