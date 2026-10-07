"use client";
import{useEffect,useState}from"react";
import OwnerShell from"@/components/OwnerShell";
import{supabase}from"@/lib/supabase";

type EmailPeriod={used?:number;limit?:number;remaining?:number;resetsAt?:string};type Usage={daily?:EmailPeriod;monthly?:EmailPeriod;plan?:string;error?:string};

export default function Owner(){
 const[k,setK]=useState({pending:0,active:0,total:0});
 const[email,setEmail]=useState<Usage|null>(null);
 const[emailLoading,setEmailLoading]=useState(true);
 useEffect(()=>{Promise.all([supabase.from("access_requests").select("id",{count:"exact",head:true}).eq("status","pending"),supabase.from("salons").select("id",{count:"exact",head:true}).eq("active",true),supabase.from("salons").select("id",{count:"exact",head:true})]).then(([a,b,c])=>setK({pending:a.count||0,active:b.count||0,total:c.count||0}))},[]);
 useEffect(()=>{let alive=true;(async()=>{try{const{data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error("Няма активна owner сесия.");const r=await fetch("/api/owner/email-usage",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||"Не успяхме да заредим Resend usage.");const emails=j.usage?.emails||j.emails||j.data?.emails||{};const parse=(x:any):EmailPeriod=>{const used=Number(x?.used??x?.usage??x?.sent??NaN);const limit=x?.limit===null?undefined:Number(x?.limit??x?.quota??NaN);const remaining=Number.isFinite(limit)&&Number.isFinite(used)?Math.max(0,limit-used):Number(x?.remaining??NaN);return{used:Number.isFinite(used)?used:undefined,limit:Number.isFinite(limit)?limit:undefined,remaining:Number.isFinite(remaining)?remaining:undefined,resetsAt:x?.resets_at?String(x.resets_at):undefined}};if(alive)setEmail({daily:parse(emails.daily||{}),monthly:parse(emails.monthly||{}),plan:"Resend"})}catch(e){if(alive)setEmail({error:e instanceof Error?e.message:"Не успяхме да заредим имейл статистиката."})}finally{if(alive)setEmailLoading(false)}})();return()=>{alive=false}},[]);
 const low=(email?.daily?.remaining!==undefined&&email?.daily?.limit!==undefined&&email.daily.limit>0&&email.daily.remaining/email.daily.limit<=.2)||(email?.monthly?.remaining!==undefined&&email?.monthly?.limit!==undefined&&email.monthly.limit>0&&email.monthly.remaining/email.monthly.limit<=.2);const reset=(v?:string)=>{if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString("bg-BG",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})};
 return <OwnerShell>
  <div className="owner-title"><div><span>PLATFORM OVERVIEW</span><h1>BeautyFlow Owner</h1><p>Централно управление на платформата.</p></div></div>
  <div className="owner-kpi-big"><div><span>Чакащи заявки</span><b>{k.pending}</b></div><div><span>Активни бизнеси</span><b>{k.active}</b></div><div><span>Всички бизнеси</span><b>{k.total}</b></div></div>
  <section className={`bf-owner-email-card ${low?"is-low":""}`}>
   <div><span className="eyebrow">EMAIL OPERATIONS · RESEND</span><h2>Имейл капацитет</h2><p>Следи лимита преди да повлияе на кодовете за потвърждение и известията.</p></div>
   {emailLoading?<strong>Зареждане...</strong>:email?.error?<div className="bf-owner-email-error"><b>Няма данни</b><small>{email.error}</small></div>:<><h3 style={{margin:"0",color:"#fff"}}>Днес</h3><div className="bf-owner-email-stats"><div><span>Изпратени</span><b>{email?.daily?.used??"—"}</b></div><div><span>Остават</span><b>{email?.daily?.remaining??"—"}</b></div><div><span>Лимит</span><b>{email?.daily?.limit??"—"}</b></div><div><span>Нулира се</span><b style={{fontSize:"15px"}}>{reset(email?.daily?.resetsAt)}</b></div></div><h3 style={{margin:"2px 0 0",color:"#fff"}}>Този месец</h3><div className="bf-owner-email-stats"><div><span>Използвани</span><b>{email?.monthly?.used??"—"}</b></div><div><span>Остават</span><b>{email?.monthly?.remaining??"—"}</b></div><div><span>Лимит</span><b>{email?.monthly?.limit??"—"}</b></div><div><span>Нулира се</span><b style={{fontSize:"15px"}}>{reset(email?.monthly?.resetsAt)}</b></div></div></>}
   {low&&<div className="bf-owner-email-warning">⚠ Имейл капацитетът е под 20%. Провери Resend преди да се изчерпи.</div>}
  </section>
  <div className="owner-notice">От „Бизнеси“ виждаш плана, месечната такса, активните специалисти и валидността на всеки салон на едно място.</div>
 </OwnerShell>
}