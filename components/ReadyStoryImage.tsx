"use client";
import {useEffect,useRef,useState} from "react";
export default function ReadyStoryImage({src,alt,priority=false}:{src:string;alt:string;priority?:boolean}){
 const ref=useRef<HTMLImageElement>(null),[status,setStatus]=useState<"loading"|"ready"|"error">("loading");
 useEffect(()=>{if(ref.current?.complete)setStatus(ref.current.naturalWidth?"ready":"error")},[src]);
 return <div className="bf-ready-story-image" aria-busy={status==="loading"}>
  <img ref={ref} src={src} alt={alt} loading={priority?"eager":"lazy"} fetchPriority={priority?"high":"auto"} decoding="async" onLoad={()=>setStatus("ready")} onError={()=>setStatus("error")} style={{opacity:status==="ready"?1:0}}/>
  {status!=="ready"&&<span className="bf-story-image-status" role="status">{status==="loading"?<><i aria-hidden="true"/>Зареждане на снимката…</>:"Снимката временно не е достъпна."}</span>}
 </div>
}
