"use client";
import { usePathname, useRouter } from "next/navigation";

export default function MobileBackButton(){
  const pathname=usePathname();
  const router=useRouter();
  if(pathname==="/" || pathname.startsWith("/admin")) return null;
  function goBack(){
    if(window.history.length>1) router.back();
    else router.push("/");
  }
  return <button type="button" className="mobile-back-button" onClick={goBack} aria-label="Назад" title="Назад">←</button>;
}
