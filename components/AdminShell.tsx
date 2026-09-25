"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import BusinessGuard from "@/components/auth/BusinessGuard";
import { supabase } from "@/lib/supabase";

const links = [
  ["/admin", "Табло"],
  ["/admin/calendar", "График"],
  ["/admin/bookings", "Записвания"],
  ["/admin/services", "Услуги"],
  ["/admin/staff", "Екип"],
  ["/admin/settings", "Настройки"],
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <BusinessGuard>
      <div className="admin-layout bf-admin-v13">
        <aside className="sidebar">
          <Link href="/" className="brand">
            <img className="brand-logo" src="/beautyflow-logo-circle.webp" alt="BeautyFlow" />
            <span className="brand-word">Beauty<span>Flow</span></span>
          </Link>
          <p className="sidebar-kicker">Бизнес панел</p>
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          <button onClick={logout} className="sidebar-preview" style={{ width: "100%", textAlign: "left", border: 0 }}>
            Изход →
          </button>
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </BusinessGuard>
  );
}
