"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const links = [
  ["/", "Начало"],
  ["/salons", "Салони"],
  ["/how-it-works", "Как работи"],
  ["/about", "За нас"],
  ["/contact", "Контакти"],
] as const;

export default function BFHeader() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user) return;
        const { data: owner } = await supabase
          .from("platform_owners")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (alive) setPanel(owner ? "/owner" : "/admin");
      } finally {
        if (alive) setAuthReady(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function logout() {
    setOpen(false);
    await supabase.auth.signOut();
    setPanel(null);
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="bf3-header">
      <div className="bf3-header-inner">
        <Link href="/" className="bf3-brand" onClick={() => setOpen(false)} aria-label="BeautyFlow начало">
          <img src="/beautyflow-logo-circle.png" alt="" />
          <span><b>Beauty<span>Flow</span></b><small>Bookings made beautiful</small></span>
        </Link>

        <nav className={`bf3-main-nav ${open ? "is-open" : ""}`} aria-label="Основна навигация">
          {links.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={pathname === href ? "active" : ""}>{label}</Link>
          ))}
          <div className="bf3-mobile-account">
            {authReady && (panel ? <>
              <Link href={panel} onClick={() => setOpen(false)}>Панел</Link>
              <button type="button" onClick={logout}>Изход</button>
            </> : <>
              <Link href="/login" onClick={() => setOpen(false)}>Вход</Link>
              <Link href="/register-salon" onClick={() => setOpen(false)}>Заяви достъп</Link>
            </>)}
          </div>
        </nav>

        <div className="bf3-account-actions">
          {authReady && (panel ? <>
            <Link href={panel} className="bf3-account-link">Панел</Link>
            <button type="button" className="bf3-button bf3-button-dark bf3-button-small" onClick={logout}>Изход</button>
          </> : <>
            <Link href="/login" className="bf3-account-link">Вход</Link>
            <Link href="/register-salon" className="bf3-button bf3-button-dark bf3-button-small">За бизнеса</Link>
          </>)}
          <button type="button" className={`bf3-menu ${open ? "active" : ""}`} aria-label="Меню" aria-expanded={open} onClick={() => setOpen(v => !v)}>
            <span/><span/><span/>
          </button>
        </div>
      </div>
    </header>
  );
}
