"use client";
import {useMemo,useState} from "react";
export default function ExpandableText({text,className="",lines=4}:{text:string;className?:string;lines?:number}){
 const[open,setOpen]=useState(false);const value=String(text||"").trim();
 const words=useMemo(()=>value.split(/\s+/).filter(Boolean).length,[value]);
 if(!value)return null;
 const canExpand=value.length>120||words>20;
 return <div className={`bf-expandable-text ${open?"is-open":"is-closed"} ${className}`}>
   <p style={!open?({WebkitLineClamp:lines} as React.CSSProperties):undefined}>{value}</p>
   {canExpand&&<button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?"Скрий":"Виж още"}</button>}
 </div>
}
