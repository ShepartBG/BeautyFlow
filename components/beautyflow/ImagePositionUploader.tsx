"use client";

import {useEffect,useRef,useState} from "react";
import {supabase} from "@/lib/supabase";

type Kind="logo"|"cover";

type Props={
  kind:Kind;
  salonId:string;
  url:string|null|undefined;
  x:number;
  y:number;
  onChange:(value:{url:string;x:number;y:number})=>void;
};

export default function ImagePositionUploader({kind,salonId,url,x,y,onChange}:Props){
  const inputRef=useRef<HTMLInputElement|null>(null);
  const boxRef=useRef<HTMLDivElement|null>(null);
  const [preview,setPreview]=useState(url||"");
  const [pos,setPos]=useState({x:Number.isFinite(x)?x:50,y:Number.isFinite(y)?y:50});
  const posRef=useRef(pos);
  const [uploading,setUploading]=useState(false);
  const [message,setMessage]=useState("");
  const drag=useRef<{sx:number;sy:number;x:number;y:number}|null>(null);

  useEffect(()=>{setPreview(url||"")},[url]);
  useEffect(()=>{const n={x:Number.isFinite(x)?x:50,y:Number.isFinite(y)?y:50};setPos(n);posRef.current=n},[x,y]);

  function emit(next:{x:number;y:number},nextUrl=preview){
    setPos(next);posRef.current=next;if(nextUrl)onChange({url:nextUrl,x:next.x,y:next.y});
  }

  function pointerDown(e:React.PointerEvent<HTMLDivElement>){
    if(!preview)return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current={sx:e.clientX,sy:e.clientY,x:pos.x,y:pos.y};
  }
  function pointerMove(e:React.PointerEvent<HTMLDivElement>){
    if(!drag.current||!boxRef.current)return;
    const r=boxRef.current.getBoundingClientRect();
    const dx=(e.clientX-drag.current.sx)/Math.max(r.width,1)*100;
    const dy=(e.clientY-drag.current.sy)/Math.max(r.height,1)*100;
    const next={x:Math.max(0,Math.min(100,drag.current.x-dx)),y:Math.max(0,Math.min(100,drag.current.y-dy))};
    setPos(next);posRef.current=next;
  }
  function pointerUp(){if(drag.current){drag.current=null;emit(posRef.current)}}

  async function upload(file:File){
    if(!file.type.startsWith("image/")){setMessage("Избери изображение.");return}
    if(file.size>8*1024*1024){setMessage("Снимката трябва да е до 8 MB.");return}
    setUploading(true);setMessage("");
    const local=URL.createObjectURL(file);setPreview(local);setPos({x:50,y:50});posRef.current={x:50,y:50};
    try{
      const {data:s}=await supabase.auth.getSession();
      const token=s.session?.access_token;if(!token)throw new Error("Сесията е изтекла. Влез отново.");
      const fd=new FormData();fd.append("file",file);fd.append("salonId",salonId);fd.append("kind",kind);
      const r=await fetch("/api/business/media",{method:"POST",headers:{Authorization:`Bearer ${token}`},body:fd});
      const j=await r.json();if(!r.ok)throw new Error(j.message||"Грешка при качване.");
      URL.revokeObjectURL(local);setPreview(j.url);setPos({x:50,y:50});posRef.current={x:50,y:50};onChange({url:j.url,x:50,y:50});setMessage("Снимката е качена. Намести я с плъзгане и запази профила.");
    }catch(e){setMessage(e instanceof Error?e.message:"Грешка при качване.")}
    finally{setUploading(false)}
  }

  const isLogo=kind==="logo";
  return <div className={`media-editor ${isLogo?"media-logo":"media-cover"}`}>
    <div className="media-editor-head"><div><b>{isLogo?"Лого / снимка за лице":"Фон / корица"}</b><small>{isLogo?"Квадратна снимка. Плъзни, за да наместиш лицето/логото.":"Плъзни снимката, докато основният обект е точно на желаното място."}</small></div><button type="button" className="btn btn-light" onClick={()=>inputRef.current?.click()} disabled={uploading}>{uploading?"Качване...":"Качи снимка"}</button></div>
    <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f);e.currentTarget.value=""}}/>
    <div ref={boxRef} className="media-position-box" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      {preview?<img draggable={false} src={preview} alt="Преглед" style={{objectPosition:`${pos.x}% ${pos.y}%`}}/>:<div className="media-empty">Няма качена снимка</div>}
      {preview&&<div className="media-position-hint">↕ плъзни снимката за точно наместване</div>}
    </div>
    {preview&&<div className="media-editor-actions"><button type="button" className="text-btn" onClick={()=>emit({x:50,y:50})}>Центрирай</button><span>Позиция: {Math.round(pos.x)}% / {Math.round(pos.y)}%</span></div>}
    {message&&<p className="media-message">{message}</p>}
  </div>
}
