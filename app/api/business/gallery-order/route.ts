import { NextResponse } from "next/server";
import { requireBusinessOwner } from "@/lib/beautyflow/businessAuth";

// Saves the order of the salon gallery. Only the salon owner can reorder, and only their own photos.
export async function POST(req: Request) {
  const auth = await requireBusinessOwner(req);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  try {
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.map((x: unknown) => String(x)) : [];
    if (!ids.length || ids.length > 10 || new Set(ids).size !== ids.length || ids.some((id: string) => !/^[0-9a-f-]{36}$/i.test(id))) {
      return NextResponse.json({ message: "Невалидна подредба." }, { status: 400 });
    }
    const salonId = auth.business.id;
    const { data: rows, error } = await auth.admin.from("salon_gallery").select("id").eq("salon_id", salonId);
    if (error) throw error;
    const own = new Set((rows || []).map((r) => r.id));
    if (ids.length !== own.size || ids.some((id: string) => !own.has(id))) {
      return NextResponse.json({ message: "Галерията е променена. Обнови страницата и опитай отново." }, { status: 409 });
    }
    const results = await Promise.all(ids.map((id: string, index: number) =>
      auth.admin.from("salon_gallery").update({ sort_order: index }).eq("id", id).eq("salon_id", salonId)));
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
    return NextResponse.json({ ok: true, message: "Подредбата е запазена." });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Не успяхме да запазим подредбата." }, { status: 500 });
  }
}
