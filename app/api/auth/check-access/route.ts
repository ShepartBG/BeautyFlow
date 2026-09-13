import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isOwnerEmail } from "@/lib/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getToken(request: Request) {
  return (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

function getPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase public env липсва.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function normalizeStatus(row: any) {
  return String(row?.access_status || row?.status || "").toLowerCase().trim();
}

function isAllowedStatus(row: any) {
  const status = normalizeStatus(row);
  return status === "active" || status === "approved" || status === "trial" || status === "payment_pending";
}

function isSuspendedStatus(row: any) {
  const status = normalizeStatus(row);
  return status === "suspended" || status === "restricted" || status === "blocked" || status === "expired";
}

function isOutOfGrace(row: any) {
  const graceUntil = row?.grace_until || row?.subscription_valid_until || row?.access_valid_until;
  if (!graceUntil) return false;
  return new Date().toISOString().slice(0, 10) > String(graceUntil).slice(0, 10);
}

async function findFieldRequestByEmail(email: string) {
  const admin = getSupabaseAdmin();

  return admin
    .from("field_requests")
    .select("id,email,status,access_status,subscription_valid_until,grace_until,access_blocked_reason,field_id,organization_id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function findOrganizerByEmail(email: string) {
  try {
    const admin = getSupabaseAdmin();

    return await admin
      .from("organizers")
      .select("id,email,status,access_status,subscription_valid_until,grace_until,access_blocked_reason,field_id,organization_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  } catch {
    return { data: null, error: null };
  }
}

export async function GET(request: Request) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ ok: false, allowed: false, message: "Липсва login token." }, { status: 401 });
    }

    const publicClient = getPublicClient();
    const { data: userData, error: userError } = await publicClient.auth.getUser(token);
    const email = userData.user?.email?.trim().toLowerCase() || "";

    if (userError || !email) {
      return NextResponse.json({ ok: false, allowed: false, message: "Невалидна login сесия." }, { status: 401 });
    }

    if (isOwnerEmail(email)) {
      return NextResponse.json({ ok: true, allowed: true, message: "" });
    }

    const requestResult = await findFieldRequestByEmail(email);
    let profile = requestResult.data;
    let profileError = requestResult.error;

    if (!profile) {
      const organizerResult = await findOrganizerByEmail(email);
      profile = organizerResult.data;
      profileError = organizerResult.error;
    }

    if (profileError) {
      return NextResponse.json(
        { ok: false, allowed: false, message: profileError.message || "Грешка при проверка на достъпа." },
        { status: 500 },
      );
    }

    if (!profile) {
      return NextResponse.json({
        ok: true,
        allowed: false,
        message: "Няма активен BeautyFlow достъп за този email. Ако смяташ, че има грешка, свържи се с BeautyFlow.",
      });
    }

    if (isSuspendedStatus(profile) || isOutOfGrace(profile)) {
      return NextResponse.json({
        ok: true,
        allowed: false,
        message:
          profile.access_blocked_reason ||
          "Достъпът Ви е временно ограничен. За повече информация се свържете с BeautyFlow.",
      });
    }

    if (!isAllowedStatus(profile)) {
      return NextResponse.json({
        ok: true,
        allowed: false,
        message: "Акаунтът Ви все още не е активиран. Моля, изчакайте одобрение от BeautyFlow.",
      });
    }

    return NextResponse.json({ ok: true, allowed: true, message: "" });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        allowed: false,
        message: error instanceof Error ? error.message : "Неочаквана грешка при проверка на достъпа.",
      },
      { status: 500 },
    );
  }
}
