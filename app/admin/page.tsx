"use client";
import{useEffect,useMemo,useState}from"react";
import Link from"next/link";
import AdminShell from"@/components/admin/AdminShell";
import{useBusiness}from"@/lib/beautyflow/useBusiness";
import{supabase}from"@/lib/supabase";
import LoadingScreen from"@/components/LoadingScreen";
import{accessDays}from"@/lib/beautyflow/subscription";

function isoLocal(d=new Date()){const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)}
function addDays(base:Date,n:number){const d=new Date(base);d.setDate(d.getDate()+n);return d}
const bgDay=(d:Date)=>d.toLocaleDateString("bg-BG",{weekday:"short"}).replace(".","");
const fullDate=(d:Date)=>d.toLocaleDateString("bg-BG",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

export default function Admin(){
 const{business,loading:businessLoading,staffId,isOwner}=useBusiness();
 const[today]=useState(()=>new Date());const[date,setDate]=useState(()=>isoLocal());const[apps,setApps]=useState<any[]>([]);const[loading,setLoading]=useState(true);
 const week=useMemo(()=>Array.from({length:7},(_,i)=>addDays(today,i)),[today]);
 async function load(target=date){if(!business)return;setLoading(true);let q=supabase.from("appointments").select("*,services(name,price),staff(name)").eq("salon_id",business.id).eq("appointment_date",target).neq("status","cancelled").order("start_time");if(!isOwner&&staffId)q=q.eq("staff_id",staffId);const{data}=await q;setApps(data||[]);setLoading(false)}
 useEffect(()=>{load()},[business,date,staffId,isOwner]);
 useEffect(()=>{if(!business)return;const ch=supabase.channel(`admin-home-${business.id}`).on("postgres_changes",{event:"*",schema:"public",table:"appointments",filter:`salon_id=eq.${business.id}`},(payload:any)=>{const touched=payload?.new?.appointment_date||payload?.old?.appointment_date;if(touched===date)load(date)}).subscribe();return()=>{supabase.removeChannel(ch)}},[business,date]);
 if(businessLoading||(business&&loading))return <LoadingScreen title="Зареждане..." subtitle="Подготвяме графика"/>;
 const revenue=apps.reduce((s,a)=>s+Number(a.services?.price||0),0),now=new Date().toTimeString().slice(0,5),isToday=date===isoLocal(),next=apps.find(a=>!isToday||a.start_time?.slice(0,5)>=now);
 return <AdminShell>
  <header className="dash-header dash-live-header"><div><span className="eyebrow">BUSINESS OVERVIEW</span><h1>Здравей, {business?.name||"BeautyFlow"}</h1><p><strong>{isToday?apps.length:`${apps.length}`}</strong> {isToday?"записани за днес":"записани за избрания ден"} <span className="admin-live-scale">📈 Live</span> · <span>{fullDate(new Date(`${date}T12:00:00`))}</span></p></div></header>
  <div className="admin-week-strip">{week.map(d=>{const val=isoLocal(d),active=val===date;return <button key={val} className={active?"active":""} onClick={()=>setDate(val)}><small>{bgDay(d)}</small><b>{String(d.getDate()).padStart(2,"0")}</b></button>})}<Link href="/admin/calendar" className="admin-week-calendar">Отвори календар →</Link></div>
  <div className="kpi-grid"><div><span>{isToday?"Клиенти днес":"Клиенти"}</span><strong>{apps.length}</strong></div><div><span>Следващ час</span><strong>{next?.start_time?.slice(0,5)||"—"}</strong></div><div><span>Очакван оборот</span><strong>{revenue.toFixed(0)} €</strong></div><div><span>Статус</span><strong>{business?.active?"Активен":"Спрян"}</strong>{business?.active&&<small className="bf-access-remaining">{accessDays(business)===null?"Срокът не е зададен":accessDays(business)!<0?"Срокът е изтекъл":`Остават ${accessDays(business)} дни`}</small>}</div></div>
  <section className="dash-section"><div className="section-title"><h2>{isToday?"Днешен график":`График · ${new Date(`${date}T12:00:00`).toLocaleDateString("bg-BG",{day:"2-digit",month:"2-digit"})}`}</h2><Link href={`/admin/calendar?date=${date}`}>Отвори календар →</Link></div>{apps.length===0?<div className="dash-empty">Няма записвания за тази дата.</div>:<div className="timeline admin-live-timeline">{apps.map(a=><div key={a.id}><time>🕒 {a.start_time.slice(0,5)}</time><section><b>👤 {a.customer_name}</b><span>✂️ {a.services?.name}{a.staff?.name?` · ${a.staff.name}`:""}</span></section><strong>{Number(a.services?.price||0).toFixed(0)} €</strong></div>)}</div>}</section>
 </AdminShell>
}
