"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setMessage("Невалиден email или парола.");
      setBusy(false);
      return;
    }

    // 1) Platform owner always goes to the central BeautyFlow owner panel.
    const { data: owner } = await supabase
      .from("platform_owners")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (owner) {
      router.replace("/owner");
      return;
    }

    // 2) Business owner or invited staff member.
    const { data: salon } = await supabase.from("salons").select("id,active").eq("owner_id", data.user.id).maybeSingle();
    if (salon) {
      if (!salon.active) { await supabase.auth.signOut(); setMessage("Достъпът до този BeautyFlow бизнес е временно ограничен."); setBusy(false); return; }
      router.replace("/admin"); return;
    }
    const { data: membership } = await supabase.from("business_members").select("salon_id,active").eq("user_id",data.user.id).eq("active",true).maybeSingle();
    if (!membership) { await supabase.auth.signOut(); setMessage("Няма активен BeautyFlow бизнес към този акаунт."); setBusy(false); return; }
    const { data: memberSalon } = await supabase.from("salons").select("active").eq("id",membership.salon_id).maybeSingle();
    if (!memberSalon?.active) { await supabase.auth.signOut(); setMessage("Достъпът до този BeautyFlow бизнес е временно ограничен."); setBusy(false); return; }
    router.replace("/admin");
  }

  return (
    <main className="page">
      <div className="bg-hero" />
      <div className="bg-soft" />
      <PublicNav />
      <section className="form-wrap">
        <div className="form-card bf-auth-card">
          <div className="badge">ВХОД</div>
          <h1 style={{ fontSize: 48, letterSpacing: "-.05em" }}>Вход в BeautyFlow</h1>
          <p style={{ marginTop: -10, marginBottom: 22, color: "#746b70" }}>
            Един вход за BeautyFlow Owner и за бизнес профили.
          </p>
          <form onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <input name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div className="field">
              <label>Парола</label>
              <input name="password" type="password" required placeholder="••••••••" />
            </div>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Вход..." : "Вход"}
            </button>
            {message && <p className="form-message">{message}</p>}
          </form>
          <p><Link href="/forgot-password">Забравена парола?</Link></p>
        </div>
      </section>
    </main>
  );
}
