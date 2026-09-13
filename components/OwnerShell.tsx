"use client";
import Link from "next/link";
import { useEffect,useRef,useState } from "react";
import { usePathname,useRouter } from "next/navigation";
import OwnerGuard from "@/components/auth/OwnerGuard";
import { supabase } from "@/lib/supabase";

const ownerItems=[["/owner","Обзор"],["/owner/requests","Заявки"],["/owner/businesses","Бизнеси"]];
const publicItems=[["/","Начална страница"],["/salons","Салони"],["/specialists","Специалисти"],["/how-it-works","Как работи"],["/about","За нас"],["/contact","Контакти"],["/register-salon","Заяви достъп"]];
export default function OwnerShell({children}:{children:React.ReactNode}){
 const p=usePathname();const r=useRouter();const[open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const fn=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};document.addEventListener("mousedown",fn);return()=>document.removeEventListener("mousedown",fn)},[]);
 async function out(){await supabase.auth.signOut();r.replace("/login")}
 return <OwnerGuard><main className="owner-page"><header className="owner-topbar"><Link href="/" className="owner-brand"><img src="/beautyflow-logo-circle.png" alt="BeautyFlow"/><span><strong>BeautyFlow</strong><small>PLATFORM OWNER</small></span></Link><div className="owner-menu-wrap" ref={ref}><button type="button" className={`owner-menu-trigger ${open?"active":""}`} onClick={()=>setOpen(v=>!v)}>☰ Меню</button>{open&&<div className="owner-menu-popover"><div className="owner-menu-head"><b>Owner меню</b><button type="button" onClick={()=>setOpen(false)}>×</button></div><small>УПРАВЛЕНИЕ</small>{ownerItems.map(([h,l])=><Link key={h} href={h} onClick={()=>setOpen(false)} className={p===h?"active":""}>{l}</Link>)}<div className="owner-menu-separator"/><small>ПУБЛИЧНИ СТРАНИЦИ</small>{publicItems.map(([h,l])=><Link key={h} href={h} onClick={()=>setOpen(false)}>{l}</Link>)}<button type="button" className="owner-menu-logout" onClick={out}>Изход</button></div>}</div></header><div className="owner-content">{children}</div></main></OwnerGuard>
}
