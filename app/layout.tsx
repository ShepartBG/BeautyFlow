import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { unstable_cache } from "next/cache";
import { optimizedDesignBackground } from "@/lib/optimizedDesignBackground";
import "./globals.css";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import PublicDesignLayer from "@/components/PublicDesignLayer";
import BulgarianFormGuard from "@/components/BulgarianFormGuard";
import GlobalPageLoader from "@/components/GlobalPageLoader";
import CookieBanner from "@/components/CookieBanner";
import ScrollResetOnRefresh from "@/components/ScrollResetOnRefresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BeautyFlow.bg | Онлайн резервации за салони и студиа",
  description: "BeautyFlow помага на салони, студиа и самостоятелни специалисти да приемат часове онлайн и да управляват календара си лесно.",
  icons: { icon: "/beautyflow-icon.png", shortcut: "/beautyflow-icon.png", apple: "/beautyflow-icon.png" },
};

type DesignSettings={background_url:string|null;background_position:string};

const getInitialDesign = unstable_cache(async ():Promise<DesignSettings> => {
  const fallback={background_url:"/brand/beautyflow-background.png",background_position:"center top"};
  try{
    const db=getSupabaseAdmin();
    const {data}=await db.from("platform_design_settings").select("background_url,background_position").eq("id",1).maybeSingle();
    return data?{
      background_url:data.background_url||fallback.background_url,
      background_position:data.background_position||"center top"
    }:fallback;
  }catch{return fallback}
}, ["beautyflow-initial-design"], { revalidate: 60, tags: ["beautyflow-design"] });

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const design=await getInitialDesign();
  const vars={
    "--bf-global-bg-image":design.background_url?`url("${optimizedDesignBackground(design.background_url).replace(/"/g,"%22")}")`:"none",
    "--bf-global-bg-position":design.background_position,
    "--bf-global-overlay":"0",
  } as CSSProperties;
  return <html lang="bg" style={vars}><body data-bf-design-loaded="1"><PublicDesignLayer/><BulgarianFormGuard/><ScrollResetOnRefresh/><GlobalPageLoader/><div className="bf-app-content">{children}</div><CookieBanner/></body></html>;
}
