import { NextResponse } from "next/server";
import { requireBusinessOwner } from "@/lib/beautyflow/businessAuth";
import { ANNOUNCEMENT_MAX, ANNOUNCEMENT_TYPES, sofiaToday } from "@/lib/beautyflow/announcement";

// Shown to salon owners if the announcement migration has not been applied yet.
const MISSING_COLUMNS = "Тази функция още се активира. Опитай отново малко по-късно.";
const isMissingColumn = (e: { code?: string; message?: string } | null) => !!e && (e.code === "42703" || e.code === "PGRST204" || /announcement_/.test(e.message || ""));

// Saves (POST) or clears (DELETE) the salon's temporary announcement. Owner only.
export async function POST(req: Request) {
  const auth = await requireBusinessOwner(req);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  try {
    const b = await req.json();
    const text = String(b.text || "").replace(/[<>]/g, "").trim();
    const type = String(b.type || "info");
    const until = b.until ? String(b.until).slice(0, 10) : null;
    if (!text) return NextResponse.json({ message: "Напиши текста на съобщението." }, { status: 400 });
    if (text.length > ANNOUNCEMENT_MAX) return NextResponse.json({ message: `Съобщението може да е до ${ANNOUNCEMENT_MAX} знака.` }, { status: 400 });
    if (!ANNOUNCEMENT_TYPES.some((t) => t.value === type)) return NextResponse.json({ message: "Избери вид на съобщението." }, { status: 400 });
    if (until && (!/^\d{4}-\d{2}-\d{2}$/.test(until) || until < sofiaToday())) return NextResponse.json({ message: "Датата „Показвай до“ трябва да е днес или по-късно." }, { status: 400 });
    const { error } = await auth.admin.from("salons").update({ announcement_text: text, announcement_type: type, announcement_until: until }).eq("id", auth.business.id);
    if (isMissingColumn(error)) return NextResponse.json({ message: MISSING_COLUMNS }, { status: 503 });
    if (error) throw error;
    return NextResponse.json({ ok: true, message: "Съобщението е публикувано. Клиентите го виждат в профила на салона." });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Не успяхме да запазим съобщението." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireBusinessOwner(req);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const { error } = await auth.admin.from("salons").update({ announcement_text: null, announcement_type: null, announcement_until: null }).eq("id", auth.business.id);
  if (isMissingColumn(error)) return NextResponse.json({ message: MISSING_COLUMNS }, { status: 503 });
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: "Съобщението е премахнато." });
}
