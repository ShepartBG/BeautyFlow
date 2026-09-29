"use client";
import {useState} from "react";
import PublicNav from "@/components/PublicNav";
import {supabase} from "@/lib/supabase";
export default function Forgot(){
 const[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setMsg("");
  try{const f=new FormData(e.currentTarget),email=String(f.get("email")||"");
   const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/reset-password`});
   setMsg(error?error.message:"Изпратихме линк, ако имейлът съществува.");
  }catch{setMsg("Не успяхме да изпратим заявката. Опитай отново.")}
  finally{setBusy(false)}
 }
 return <main className="page"><PublicNav/><section className="form-wrap"><div className="form-card"><div className="badge">RESET</div><h1>Забравена парола</h1><form onSubmit={submit}><div className="field"><label>Имейл</label><input name="email" type="email" required/></div><button className="btn btn-primary" disabled={busy}>{busy?"Изпращане...":"Изпрати линк"}</button>{msg&&<p className="form-message" role="status">{msg}</p>}</form></div></section></main>
}
