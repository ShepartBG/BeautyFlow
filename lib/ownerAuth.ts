import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function requirePlatformOwner(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return { ok: false as const, status: 401, message: "Липсва сесия." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { ok: false as const, status: 500, message: "Supabase env липсва." };

  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return { ok: false as const, status: 401, message: "Невалидна сесия." };

  const admin = getSupabaseAdmin();
  const { data: owner, error: ownerError } = await admin
    .from("platform_owners")
    .select("user_id,email")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (ownerError || !owner) return { ok: false as const, status: 403, message: "Нямате Owner достъп." };
  return { ok: true as const, user: data.user, admin };
}
