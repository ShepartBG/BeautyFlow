"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
export type Business = { id:string; name:string; slug:string; city:string|null; category:string|null; description:string|null; active:boolean; onboarding_completed?:boolean; phone?:string|null; address?:string|null; map_location?:string|null; facebook_url?:string|null; instagram_url?:string|null; tiktok_url?:string|null; logo_url?:string|null; cover_url?:string|null; logo_position_x?:number|null; logo_position_y?:number|null; cover_position_x?:number|null; cover_position_y?:number|null; plan_id?:string|null; staff_limit?:number|null; subscription_status?:string|null; subscription_ends_at?:string|null; trial_ends_at?:string|null; };
export type BusinessRole="owner"|"staff";
type Cached={business:Business;role:BusinessRole;staffId:string|null};
function cachedBusiness():Cached|null{
 if(typeof window==="undefined")return null;
 try{const raw=sessionStorage.getItem("beautyflow:business-cache-v266");return raw?JSON.parse(raw):null}catch{return null}
}
export function useBusiness(){
 const initial=cachedBusiness();
 const [business,setBusinessState]=useState<Business|null>(initial?.business||null);
 const [role,setRole]=useState<BusinessRole>(initial?.role||"owner");
 const [staffId,setStaffId]=useState<string|null>(initial?.staffId||null);
 const [loading,setLoading]=useState(!initial);
 function setBusiness(next:Business|null){setBusinessState(next);if(typeof window!=="undefined"){try{if(next)sessionStorage.setItem("beautyflow:business-cache-v266",JSON.stringify({business:next,role,staffId}));else sessionStorage.removeItem("beautyflow:business-cache-v266")}catch{}}}
 useEffect(()=>{let alive=true;(async()=>{
   const {data:u}=await supabase.auth.getUser();
   if(!u.user){if(alive){setBusinessState(null);setLoading(false)};try{sessionStorage.removeItem("beautyflow:business-cache-v266")}catch{};return;}
   const {data:owned}=await supabase.from("salons").select("*").eq("owner_id",u.user.id).maybeSingle();
   if(owned){if(alive){setBusinessState(owned as Business);setRole("owner");const{data:ownerStaff}=await supabase.from("staff").select("id").eq("salon_id",owned.id).eq("user_id",u.user.id).maybeSingle();const sid=ownerStaff?.id||null;setStaffId(sid);setLoading(false);try{sessionStorage.setItem("beautyflow:business-cache-v266",JSON.stringify({business:owned,role:"owner",staffId:sid}))}catch{}}return;}
   const {data:membership}=await supabase.from("business_members").select("salon_id,role,staff_id,active").eq("user_id",u.user.id).eq("active",true).maybeSingle();
   if(!membership){if(alive){setBusinessState(null);setLoading(false)};return;}
   const {data}=await supabase.from("salons").select("*").eq("id",membership.salon_id).maybeSingle();
   if(alive){const next=(data as Business)||null;const nextRole:BusinessRole=membership.role==="owner"?"owner":"staff";setBusinessState(next);setRole(nextRole);setStaffId(membership.staff_id||null);setLoading(false);try{next?sessionStorage.setItem("beautyflow:business-cache-v266",JSON.stringify({business:next,role:nextRole,staffId:membership.staff_id||null})):sessionStorage.removeItem("beautyflow:business-cache-v266")}catch{}}
 })();return()=>{alive=false}},[]);
 return {business,loading,setBusiness,role,staffId,isOwner:role==="owner"};
}
