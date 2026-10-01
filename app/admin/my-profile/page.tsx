"use client";
import {useEffect,useState} from "react";
import AdminShell from "@/components/admin/AdminShell";
import LoadingScreen from "@/components/LoadingScreen";
import {useBusiness} from "@/lib/beautyflow/useBusiness";
import {supabase} from "@/lib/supabase";
import {uploadMedia} from "@/lib/beautyflow/uploadMedia";

export default function MyProfile(){
 const{business,loading:businessLoading,staffId}=useBusiness();
 const[row,setRow]=useState<any>(null),[loading,setLoading]=useState(true);
 const[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[bioChars,setBioChars]=useState(0);
 useEffect(()=>{let alive=true;if(!business||!staffId){setLoading(false);return}setLoading(true);
  supabase.from("staff").select("*").eq("id",staffId).eq("salon_id",business.id).maybeSingle().then(({data,error})=>{
   if(!alive)return;setRow(data);setBioChars(String(data?.bio||"").length);if(error)setMsg(error.message);setLoading(false);
  });return()=>{alive=false};
 },[business?.id,staffId]);

 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!row||!business||busy)return;
  const form=e.currentTarget;setBusy(true);setMsg("");
  try{
   const f=new FormData(form),file=f.get("photo");
   const{data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Сесията е изтекла. Влез отново.");
   let avatarUrl:string|undefined;
   if(file instanceof File&&file.size){
    const fd=new FormData();fd.append("file",file);fd.append("salonId",business.id);fd.append("kind","staff");fd.append("entityId",row.id);
    const result=await uploadMedia(fd,session.access_token);
    avatarUrl=result.url;
   }
   const patch={staffId:row.id,name:String(f.get("name")||"").trim(),title:String(f.get("title")||"").trim(),bio:String(f.get("bio")||"").trim(),instagram_url:String(f.get("instagram_url")||"").trim(),facebook_url:String(f.get("facebook_url")||"").trim(),...(avatarUrl?{avatar_url:avatarUrl}:{})};
   const response=await fetch("/api/business/staff/profile",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(patch)});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.staff)throw new Error(result.message||"Профилът не беше запазен.");
   setRow(result.staff);setBioChars(String(result.staff.bio||"").length);
   const input=form.elements.namedItem("photo") as HTMLInputElement|null;if(input)input.value="";
   setMsg(avatarUrl?"Профилът и снимката са запазени успешно.":"Профилът е запазен успешно.");
  }catch(error){setMsg(error instanceof Error?error.message:"Не успяхме да запазим профила.")}
  finally{setBusy(false)}
 }

 if(businessLoading||loading)return <LoadingScreen title="Зареждане..." subtitle="Зареждаме профила ти"/>;
 return <AdminShell><header className="dash-header"><div><span className="eyebrow">МОЯТ ПРОФИЛ</span><h1>Профил на специалист</h1><p>Тези данни помагат на клиентите да разберат с какво се занимаваш и къде могат да видят работата ти.</p></div></header>{!row?<section className="dash-card"><p>Профилът на специалист още не е свързан с този акаунт.</p>{msg&&<p className="form-message" role="alert">{msg}</p>}</section>:<section className="dash-card form-wide"><form onSubmit={save}><div className="form-grid"><div className="field"><label>Име</label><input name="name" defaultValue={row.name||""} maxLength={90} required/></div><div className="field"><label>Специалност</label><input name="title" defaultValue={row.title||""} maxLength={90} placeholder="Напр. Фризьор, Маникюрист, Масажист" required/><small className="field-help">Напиши своята специалност · до 90 символа.</small></div></div><div className="field"><label>Кратко представяне</label><textarea name="bio" defaultValue={row.bio||""} maxLength={100} placeholder="Разкажи накратко за опита и начина си на работа." onInput={e=>setBioChars(e.currentTarget.value.length)}/><small className="field-help">До 100 символа · {bioChars} / 100. Описанието се показва в публичния профил.</small></div><div className="form-grid"><div className="field"><label>Instagram</label><input name="instagram_url" defaultValue={row.instagram_url||""} maxLength={180}/></div><div className="field"><label>Facebook</label><input name="facebook_url" defaultValue={row.facebook_url||""} maxLength={180}/></div></div><div className="field"><label>Снимка</label><input name="photo" type="file" accept="image/*,.heic,.heif,.avif"/></div>{row.avatar_url&&<img src={row.avatar_url} alt="Текуща снимка на специалиста" style={{width:86,height:86,objectFit:"cover",borderRadius:18}}/>}<button className="btn btn-primary" disabled={busy} aria-busy={busy}>{busy?"Запазване на профила и снимката...":"Запази профила"}</button>{busy&&<p className="form-message" role="status">Изчакай, докато приключи качването и записът.</p>}{msg&&<p className="form-message" role="status">{msg}</p>}</form></section>}</AdminShell>
}
