import { ReactNode } from "react";
import PublicNav from "@/components/public/PublicNav";
import Footer from "@/components/Footer";

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <main className="bf-page-bg min-h-screen text-zinc-900">
      <div className="min-h-screen bg-white/30">
        <PublicNav />
        {children}
        <Footer />
      </div>
    </main>
  );
}
