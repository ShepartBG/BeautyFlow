"use client";
import { useEffect, useMemo, useState } from "react";
import OwnerShell from "@/components/OwnerShell";
import { supabase } from "@/lib/supabase";
import {beautyFlowAccessState,accessDays} from "@/lib/beautyflow/subscription";

type RequestRow = {
  id:string; owner_name:string; email:string; phone:string; business_name:string; category:string; city:string;
  message?:string|null; requested_plan?:string|null; status:"pending"|"active"|"rejected"|"suspended"; created_at:string; reviewed_at?:string|null;
};

const labels:Record<string,string>={pending:"Нова",active:"Активна",rejected:"Отказана",suspended:"Спряна",expired:"Изтекъл",expired_grace:"Гратисен период",expiring:"Изтича скоро"};

export default function Requests(){
 const[list,setList]=useState<RequestRow[]>([]); const[salonsByRequest,setSalonsByRequest]=useState<Record<string,any>>({}); const[msg,setMsg]=useState(""); const[setupUrl,setSetupUrl]=useState(""); const[busy,setBusy]=useState<string|null>(null); const[mail,setMail]=useState<{mode:"all"|"one";id?:string;name?:string}|null>(null); const[mailSubject,setMailSubject]=useState(""); const[mailBody,setMailBody]=useState(""); const[mailBusy,setMailBusy]=useState(false);
 async function load(){const[{data,error},{data:salons}]=await Promise.all([supabase.from("access_requests").select("*").order("created_at",{ascending:false}),supabase.from("salons").select("id,access_request_id,active,subscription_status,subscription_ends_at,trial_ends_at")]);if(error)setMsg(error.message);setList((data||[]) as RequestRow[]);const map:Record<string,any>={};for(const x of salons||[])if(x.access_request_id)map[x.access_request_id]=x;setSalonsByRequest(map)}
 useEffect(()=>{load()},[]);
 const stats=useMemo(()=>({all:list.length,pending:list.filter(x=>x.status==="pending").length,active:list.filter(x=>x.status==="active").length,suspended:list.filter(x=>x.status==="suspended").length}),[list]);
 async function api(path:string,payload:any){
  setBusy(payload.id);setMsg("Обработка...");setSetupUrl("");
  const{data:{session}}=await supabase.auth.getSession();
  const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session?.access_token}`},body:JSON.stringify(payload)});
  const j=await r.json();setMsg(j.message||"");if(j.setupUrl)setSetupUrl(j.setupUrl);setBusy(null);await load();
 }

 async function sendMail(){
  if(!mail)return;setMailBusy(true);setMsg("Изпращане...");const{data:{session}}=await supabase.auth.getSession();const r=await fetch("/api/owner/subscriber-email",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session?.access_token}`},body:JSON.stringify({mode:mail.mode,id:mail.id,subject:mailSubject,message:mailBody})});const j=await r.json();setMsg(j.message||"");setMailBusy(false);if(r.ok){setMail(null);setMailSubject("");setMailBody("")}}
 async function decide(id:string,decision:string){await api("/api/owner/request-decision",{id,decision})}
 async function action(id:string,actionName:string){
  const destructive=actionName==="delete"; const text=destructive?"Сигурен ли си? Това ще изтрие заявката, свързания бизнес и тестовия Auth акаунт.":actionName==="suspend"?"Сигурен ли си, че искаш да спреш достъпа?":null;
  if(text&&!confirm(text))return;
  await api("/api/owner/business-action",{id,action:actionName});
 }
 return <OwnerShell>
  <div className="owner-title"><div><span>ACCESS REQUESTS</span><h1>Заявки</h1><p>Централен контрол за одобрение, спиране, активиране, подновяване и изтриване на бизнес достъп.</p></div></div>
  <div className="owner-request-tools"><button className="btn btn-dark" onClick={()=>setMail({mode:"all",name:"всички активни абонати"})}>Изпрати email до всички активни</button><small>За маркетингови кампании използвай само получатели с валидно маркетингово съгласие. Този бутон е за служебна комуникация.</small></div><div className="owner-stats"><div><b>{stats.all}</b><span>Всички</span></div><div><b>{stats.pending}</b><span>Нови</span></div><div><b>{stats.active}</b><span>Активни</span></div><div><b>{stats.suspended}</b><span>Спрени</span></div></div>
  {msg&&<div className="owner-notice">{msg}{setupUrl&&<div className="owner-email-fallback"><b>Линк за задаване на парола:</b><input readOnly value={setupUrl}/><button className="btn btn-light" onClick={()=>navigator.clipboard.writeText(setupUrl)}>Копирай линка</button></div>}</div>}
  <div className="request-list">{list.length===0?<div className="empty-state"><h2>Няма заявки.</h2></div>:list.map(x=>{const salon=salonsByRequest[x.id];const effective=x.status==="active"&&salon?beautyFlowAccessState(salon):x.status;const days=salon?accessDays(salon):null;return <div className="request-card" key={x.id}>
   <div className="request-main"><div className="request-avatar">{x.business_name.slice(0,1)}</div><div><div className="request-topline"><span className={`status-pill status-${effective}`}>{labels[effective]||effective}</span>{effective==="expiring"&&days!==null&&<span className="owner-expiry-note">{days} дни</span>}{effective==="expired_grace"&&<span className="owner-expiry-note">само преглед</span>}<span>{new Date(x.created_at).toLocaleString("bg-BG")}</span></div><h3>{x.business_name}</h3><p>{x.owner_name} · {x.category} · {x.city}</p></div></div>
   <div className="request-details"><span>✉️ {x.email}</span><span>📞 {x.phone}</span><span>📍 {x.city}</span><span>План: {x.requested_plan||"solo"}</span><span>{x.message||"Без описание"}</span></div>
   <div className="request-actions bb-actions"><button disabled={busy===x.id} className="btn btn-mail" onClick={()=>setMail({mode:"one",id:x.id,name:x.business_name})}>Email</button>
    {x.status==="pending"&&<><button disabled={busy===x.id} className="btn btn-dark" onClick={()=>decide(x.id,"approve")}>✅ Одобри</button><button disabled={busy===x.id} className="btn btn-light" onClick={()=>decide(x.id,"reject")}>Откажи</button></>}
    {x.status==="rejected"&&<button disabled={busy===x.id} className="btn btn-dark" onClick={()=>decide(x.id,"approve")}>✅ Одобри</button>}
    {x.status==="active"&&<><button disabled={busy===x.id} className="btn btn-renew" onClick={()=>action(x.id,"renew")}>🔄 Поднови +30 дни</button><button disabled={busy===x.id} className="btn btn-suspend" onClick={()=>action(x.id,"suspend")}>⏸ Спри достъп</button></>}
    {x.status==="suspended"&&<><button disabled={busy===x.id} className="btn btn-activate" onClick={()=>action(x.id,"activate")}>▶ Активирай достъп</button><button disabled={busy===x.id} className="btn btn-renew" onClick={()=>action(x.id,"renew")}>🔄 Поднови +30 дни</button></>}
    <button disabled={busy===x.id} className="btn btn-delete" onClick={()=>action(x.id,"delete")}>🗑 Изтрий</button>
   </div>
  </div>})}</div>
 {mail&&<div className="owner-mail-overlay" onMouseDown={()=>setMail(null)}><div className="owner-mail-modal" onMouseDown={e=>e.stopPropagation()}><button className="owner-mail-close" onClick={()=>setMail(null)}>×</button><span>EMAIL CENTER</span><h2>{mail.mode==="all"?"До всички активни абонати":`До ${mail.name}`}</h2><label>Тема<input value={mailSubject} onChange={e=>setMailSubject(e.target.value)} placeholder="Важна информация от BeautyFlow"/></label><label>Съобщение<textarea rows={8} value={mailBody} onChange={e=>setMailBody(e.target.value)} placeholder="Напиши съобщението..."/></label><button className="btn btn-dark" disabled={mailBusy||!mailSubject.trim()||!mailBody.trim()} onClick={sendMail}>{mailBusy?"Изпращане...":"Изпрати email"}</button></div></div>}</OwnerShell>
}
