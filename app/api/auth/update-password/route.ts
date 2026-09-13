import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Липсва активна auth сесия от линка." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const password = String(body.password || "");

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, message: "Паролата трябва да бъде поне 6 символа." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData.user?.id) {
      return NextResponse.json(
        { ok: false, message: "Линкът не създаде валидна сесия. Заяви нов линк." },
        { status: 401 },
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { password },
    );

    if (updateError) {
      return NextResponse.json(
        { ok: false, message: "Supabase не прие новата парола: " + updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Неочаквана грешка при смяна на парола.",
      },
      { status: 500 },
    );
  }
}
