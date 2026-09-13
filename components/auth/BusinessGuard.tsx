"use client";
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoadingScreen from "@/components/LoadingScreen";
import {beautyFlowAccessState,subscriptionEnd} from "@/lib/beautyflow/subscription";
type GuardState = "checking" | "allowed" | "grace" | "blocked";
type Upcoming={id:string;appointment_date:string;start_time:string;customer_name:string;services?:{name?:string}|null;staff?:{name?:string}|null};
export default function BusinessGuard({ children }: { children: ReactNode }) {
 const router=useRouter();const[state,setState]=useState<GuardState>("checking");const[message,setMessage]=useState("");const[endDate,setEndDate]=useState<string|null>(null);const[upcoming,setUpcoming]=useState<Upcoming[]>([]);
 useEffect(()=>{let mounted=true;(async()=>{const{data:sessionData}=await supabase.auth.getSession();if(!mounted)return;const user=sessionData.session?.user;if(!user){router.replace("/login");return}
 const{data:owner}=await supabase.from("platform_owners").select("user_id").eq("user_id",user.id).maybeSingle();if(!mounted)return;if(owner){router.replace("/owner");return}
 let salon:any=null;const{data:owned}=await supabase.from("salons").select("*").eq("owner_id",user.id).maybeSingle();if(owned)salon=owned;else{const{data:membership}=await supabase.from("business_members").select("salon_id,active").eq("user_id",user.id).eq("active",true).maybeSingle();if(!membership){setMessage("Няма BeautyFlow бизнес, свързан с този акаунт.");setState("blocked");return}const{data:memberSalon}=await supabase.from("salons").select("*").eq("id",membership.salon_id).maybeSingle();salon=memberSalon}
 if(!salon){setMessage("BeautyFlow бизнесът не е намерен.");setState("blocked");return}const access=beautyFlowAccessState(salon);setEndDate(subscriptionEnd(salon));
 if(access==="suspended"){setMessage("Достъпът е спрян от BeautyFlow. Свържи се с екипа ни за съдействие.");setState("blocked");return}
 if(access==="expired"){setMessage("Абонаментът е изтекъл. Данните ти се пазят, но админ панелът и новите записвания са заключени до подновяване.");setState("blocked");return}
 if(access==="expired_grace"){const today=new Date().toISOString().slice(0,10);const{data}=await supabase.from("appointments").select("id,appointment_date,start_time,customer_name,services(name),staff(name)").eq("salon_id",salon.id).gte("appointment_date",today).neq("status","cancelled").order("appointment_date").order("start_time").limit(40);if(mounted){setUpcoming((data||[]) as any);setState("grace")}return}
 setState("allowed")})().catch(()=>{setMessage("Не успяхме да проверим достъпа.");setState("blocked")});return()=>{mounted=false}},[router]);
 if(state==="checking")return <LoadingScreen/>;
 if(state==="grace")return <main className="bf-expired-access"><section><span>BEAUTYFLOW · ГРАТИСЕН ПЕРИОД</span><h1>Абонаментът е изтекъл.</h1><p>В следващите 7 дни можеш само да преглеждаш предстоящите си записвания. Нови часове, промени по бизнеса и достъпът на екипа са спрени до подновяване.</p>{endDate&&<small>Абонаментът е изтекъл на {new Date(endDate).toLocaleDateString("bg-BG")}.</small>}<div className="bf-expired-bookings">{upcoming.length?upcoming.map(x=><article key={x.id}><b>{new Date(x.appointment_date+"T12:00:00").toLocaleDateString("bg-BG")} · {String(x.start_time).slice(0,5)}</b><strong>{x.customer_name}</strong><em>{x.services?.name||"Услуга"}{x.staff?.name?` · ${x.staff.name}`:""}</em></article>):<p>Няма предстоящи записвания.</p>}</div><button className="btn btn-primary" onClick={async()=>{await supabase.auth.signOut();router.replace("/login")}}>Изход</button></section></main>;
 if(state==="blocked")return <main className="bf-expired-access"><section><span>BEAUTYFLOW ACCESS</span><h1>Достъпът е ограничен</h1><p>{message}</p>{endDate&&<small>Последна дата на достъп: {new Date(endDate).toLocaleDateString("bg-BG")}.</small>}<button onClick={async()=>{await supabase.auth.signOut();router.replace("/login")}} className="btn btn-primary">Към входа</button></section></main>;
 return <>{children}</>;
}
