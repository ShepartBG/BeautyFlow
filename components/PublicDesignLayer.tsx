"use client";
import { useEffect,useMemo,useState } from "react";
import {usePathname} from "next/navigation";
import {optimizedDesignBackground} from "@/lib/optimizedDesignBackground";
import {createPortal} from "react-dom";

type Frame={id:string;x:number;y:number;width:number;height:number;media_url?:string;media_type?:"image"|"video";layer?:"background"|"behind"|"front";animation?:string;fit?:"cover"|"contain";media_x?:number;media_y?:number;media_scale?:number;shape?:"rounded"|"pill"|"cut"|"organic"|"soft"|"torn";design_height?:number};
type DesignSettings={background_url?:string|null;background_position?:string|null;overlay_opacity?:number|null;page_frames?:Record<string,Frame[]>};
function pageKey(path:string){if(path==="/")return"home";if(path.startsWith("/salons"))return"salons";if(path.startsWith("/how-it-works"))return"how";if(path.startsWith("/about"))return"about";if(path.startsWith("/contact"))return"contact";if(path.startsWith("/register-salon"))return"access";if(path.startsWith("/login"))return"login";if(path.startsWith("/admin"))return"admin";if(path.startsWith("/owner"))return"owner";return""}
export default function PublicDesignLayer(){
  const path=usePathname();const[design,setDesign]=useState<DesignSettings>({});const[target,setTarget]=useState<HTMLElement|null>(null);
  useEffect(()=>{const pick=()=>setTarget((document.querySelector(".bf-app-content > main")||document.querySelector(".bf-app-content > .page")||document.querySelector(".bf-app-content")) as HTMLElement|null);pick();const t=setTimeout(pick,0);return()=>clearTimeout(t)},[path]);
  useEffect(()=>{let alive=true;const apply=(j:DesignSettings,updateBackground=true)=>{if(!alive)return;setDesign(j);try{localStorage.setItem("bf_platform_design_cache",JSON.stringify(j))}catch{}const root=document.documentElement;if(updateBackground)root.style.setProperty("--bf-global-bg-image",`url("${optimizedDesignBackground(j.background_url).replace(/"/g,"%22")}")`);root.style.setProperty("--bf-global-bg-position",j.background_position||"center top");root.style.setProperty("--bf-global-overlay","0");document.body.dataset.bfDesignLoaded="1"};
  try{const cached=localStorage.getItem("bf_platform_design_cache");if(cached)apply(JSON.parse(cached),false)}catch{}
  const load=async()=>{try{const r=await fetch("/api/public/design",{cache:"no-store"});if(!r.ok)return;apply(await r.json() as DesignSettings)}catch{}};load();
  const onDesign=(e:Event)=>{const d=(e as CustomEvent<DesignSettings>).detail;if(d)apply(d);else load()};window.addEventListener("bf-design-updated",onDesign as EventListener);window.addEventListener("storage",onDesign as EventListener);return()=>{alive=false;window.removeEventListener("bf-design-updated",onDesign as EventListener);window.removeEventListener("storage",onDesign as EventListener)}},[]);
  const frames=useMemo(()=>design.page_frames?.[pageKey(path)]||[],[design,path]);
  if(typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("bfEditor")==="1")return null;
  if(!target||!frames.length)return null;
  const content=<>{["background","behind","front"].map(layer=><div key={layer} className={`bf-runtime-frame-layer bf-layer-${layer}`} aria-hidden="true">{frames.filter(f=>(f.layer||"behind")===layer&&f.media_url).map(f=>{const basis=Math.max(600,Number(f.design_height)||2200);return <div key={f.id} className={`bf-runtime-frame shape-${f.shape||"rounded"} anim-${f.animation||"none"}`} style={{left:`${f.x}%`,top:`${(f.y/100)*basis}px`,width:`${f.width}%`,height:`${(f.height/100)*basis}px`}}>{f.media_type==="video"?<video src={f.media_url} preload="none" autoPlay muted loop playsInline style={{objectFit:f.fit||"cover",objectPosition:`${f.media_x??50}% ${f.media_y??50}%`,transform:`scale(${(f.media_scale??100)/100})`}}/>:<img src={f.media_url} alt="" loading="lazy" decoding="async" draggable={false} style={{objectFit:f.fit||"cover",objectPosition:`${f.media_x??50}% ${f.media_y??50}%`,transform:`scale(${(f.media_scale??100)/100})`}}/>}</div>})}</div>)}</>;
  return createPortal(content,target);
}
