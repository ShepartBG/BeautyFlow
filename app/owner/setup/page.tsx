"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const OWNER_EMAIL="battlebooking@abv.bg";
export default function OwnerSetup(){
 const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage("");const f=new FormData(e.currentTarget);const password=String(f.get("password")||"");const confirm=String(f.get("confirm")||"");if(password.length<8){setMessage("Паролата трябва да е поне 8 символа.");setBusy(false);return;}if(password!==confirm){setMessage("Паролите не съвпадат.");setBusy(false);return;}const {data,error}=await supabase.auth.signUp({email:OWNER_EMAIL,password,options:{emailRedirectTo:`${window.location.origin}/login`}});if(error){setMessage(error.message);setBusy(false);return;}setMessage(data.session?"Owner акаунтът е създаден. Вече можеш да влезеш.":"Провери battlebooking@abv.bg за потвърждение от Supabase, след което влез като Owner.");setBusy(false);}
 return <main className="owner-auth-page"><div className="owner-auth-card"><img src="/beautyflow-logo-circle.webp" alt="BeautyFlow"/><div className="badge">ЕДНОКРАТНА НАСТРОЙКА</div><h1>Създай Owner акаунт</h1><p>Това е само за <strong>{OWNER_EMAIL}</strong>. След първия успешен setup използвай общия BeautyFlow вход.</p><form onSubmit={submit}><div className="field"><label>Owner email</label><input value={OWNER_EMAIL} disabled/></div><div className="field"><label>Нова парола</label><input name="password" type="password" minLength={8} required/></div><div className="field"><label>Повтори паролата</label><input name="confirm" type="password" minLength={8} required/></div><button className="btn btn-primary" disabled={busy}>{busy?"Създаване...":"Създай Owner акаунт"}</button>{message&&<p className="form-message">{message}</p>}</form><small><Link href="/login">Назад към входа</Link></small></div></main>
}
