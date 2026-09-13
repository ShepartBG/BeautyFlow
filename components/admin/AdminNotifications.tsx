"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase";
import {useBusiness} from "@/lib/beautyflow/useBusiness";

type FeedItem={id:string;customer_name:string;appointment_date:string;start_time:string;created_at?:string;services?:{name?:string}|null};

export default function AdminNotifications(){
  const {business,staffId,isOwner}=useBusiness();
  const [open,setOpen]=useState(false);
  const [items,setItems]=useState<FeedItem[]>([]);
  const [unread,setUnread]=useState(0);
  const ref=useRef<HTMLDivElement>(null);
  async function load(){
    if(!business)return;
    let q=supabase.from("appointments")
      .select("id,customer_name,appointment_date,start_time,created_at,services(name)")
      .eq("salon_id",business.id).order("created_at",{ascending:false}).limit(12);
    if(!isOwner&&staffId)q=q.eq("staff_id",staffId);
    const {data}=await q;
    setItems((data||[]) as any);
  }
  useEffect(()=>{load()},[business,staffId,isOwner]);
  useEffect(()=>{
    if(!business)return;
    const ch=supabase.channel(`beautyflow-admin-feed-${business.id}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"appointments",filter:`salon_id=eq.${business.id}`},(payload:any)=>{if(!isOwner&&staffId&&payload?.new?.staff_id!==staffId)return;setUnread(v=>v+1);load()})
      .subscribe();
    return()=>{supabase.removeChannel(ch)};
  },[business]);
  useEffect(()=>{const close=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[]);
  const fmt=(d:string)=>{const x=new Date(`${d}T12:00:00`);return x.toLocaleDateString("bg-BG",{day:"2-digit",month:"2-digit"})};
  const badge=useMemo(()=>Math.min(unread,99),[unread]);
  return <div className="admin-notify" ref={ref}>
    <button type="button" className="admin-notify-btn" aria-label="Известия" onClick={()=>{setOpen(v=>!v);setUnread(0)}}>🔔{badge>0&&<b>{badge}</b>}</button>
    {open&&<div className="admin-notify-popover">
      <div className="admin-notify-head"><div><strong>Live feed</strong><span>Записвания в реално време</span></div><button onClick={()=>setOpen(false)}>×</button></div>
      <div className="admin-notify-list">{items.length===0?<p>Все още няма записвания.</p>:items.map(x=><Link key={x.id} href={`/admin/bookings`} onClick={()=>setOpen(false)}><i className="feed-dot">●</i><div className="admin-notify-main"><b>👤 {x.customer_name}</b><span>✂️ {x.services?.name||"Резервация"}</span></div><div className="admin-notify-when"><strong>📅 {fmt(x.appointment_date)}</strong><em>🕒 {String(x.start_time).slice(0,5)}</em></div></Link>)}</div>
      <Link className="admin-notify-all" href="/admin/bookings" onClick={()=>setOpen(false)}>Виж всички записвания →</Link>
    </div>}
  </div>
}
