"use client";
import{useEffect,useMemo,useState}from"react";
import{bulgarianHolidays}from"@/lib/beautyflow/bulgarianHolidays";

const MONTHS=["Януари","Февруари","Март","Април","Май","Юни","Юли","Август","Септември","Октомври","Ноември","Декември"];
const DAYS=["Пн","Вт","Ср","Чт","Пт","Сб","Нд"];
type DayStatus="available"|"full"|"unavailable"|"blocked";
function iso(y:number,m:number,d:number){return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function parse(v:string){const[a,b,c]=v.split("-").map(Number);return new Date(a||new Date().getFullYear(),(b||1)-1,c||1)}
function startOfDay(d:Date){return new Date(d.getFullYear(),d.getMonth(),d.getDate())}

export default function BookingMonthCalendar({value,onChange,minDate,maxDate,salonId,serviceId,staffId}:{value:string;onChange:(v:string)=>void;minDate?:string;maxDate?:string;salonId?:string;serviceId?:string;staffId?:string}){
 const selected=parse(value),[view,setView]=useState(()=>new Date(selected.getFullYear(),selected.getMonth(),1)),[statuses,setStatuses]=useState<Record<string,DayStatus>>({}),[loading,setLoading]=useState(false),[loadError,setLoadError]=useState("");
 const min=minDate?startOfDay(parse(minDate)):null,max=maxDate?startOfDay(parse(maxDate)):null,holidays=useMemo(()=>bulgarianHolidays(view.getFullYear()),[view]);
 const cells=useMemo(()=>{const y=view.getFullYear(),m=view.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0),mondayIndex=(first.getDay()+6)%7,out:(number|null)[]=[];for(let i=0;i<mondayIndex;i++)out.push(null);for(let d=1;d<=last.getDate();d++)out.push(d);while(out.length%7)out.push(null);return out},[view]);
 const canPrev=!min||new Date(view.getFullYear(),view.getMonth()+1,0)>=new Date(min.getFullYear(),min.getMonth(),1),canNext=!max||new Date(view.getFullYear(),view.getMonth()+1,1)<=new Date(max.getFullYear(),max.getMonth()+1,0);
 function move(delta:number){setView(v=>new Date(v.getFullYear(),v.getMonth()+delta,1))}
 useEffect(()=>{if(!salonId){setStatuses({});setLoadError("");return}const ctrl=new AbortController();setLoading(true);setLoadError("");const qs=new URLSearchParams({salonId,year:String(view.getFullYear()),month:String(view.getMonth()+1)});if(serviceId)qs.set("serviceId",serviceId);if(staffId)qs.set("staffId",staffId);fetch(`/api/public/month-availability?${qs}`,{signal:ctrl.signal}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.message||"Календарът не можа да се зареди.");setStatuses(j.days||{})}).catch(e=>{if(e?.name!=="AbortError"){setStatuses({});setLoadError(e instanceof Error?e.message:"Календарът не можа да се зареди.")}}).finally(()=>setLoading(false));return()=>ctrl.abort()},[salonId,serviceId,staffId,view]);
 return <div className="booking-calendar" aria-label="Избери дата">
  <div className="booking-calendar-head"><button type="button" onClick={()=>move(-1)} disabled={!canPrev}>←</button><strong>{MONTHS[view.getMonth()]} {view.getFullYear()}</strong><button type="button" onClick={()=>move(1)} disabled={!canNext}>→</button></div>
  <div className="booking-calendar-month-legend"><span className="month-free">{serviceId?"Има свободни часове":"Работен ден"}</span>{serviceId&&<span className="month-full">Напълно зает</span>}<span className="month-blocked">Извън срока</span><span className="month-off">Неработен</span><span className="month-holiday">Празник</span></div>
  <div className="booking-calendar-week">{DAYS.map(x=><span key={x}>{x}</span>)}</div>
  <div className={`booking-calendar-grid ${loading?"is-loading":""}`}>{cells.map((day,i)=>{if(!day)return <span className="calendar-empty" key={`e${i}`}/>;const current=new Date(view.getFullYear(),view.getMonth(),day),dateIso=iso(view.getFullYear(),view.getMonth(),day),rangeDisabled=!!((min&&current<min)||(max&&current>max)),active=value===dateIso,today=dateIso===iso(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()),status=statuses[dateIso],holiday=holidays[dateIso],disabled=rangeDisabled||status==="unavailable"||status==="blocked";return <button type="button" key={dateIso} disabled={disabled} className={`${active?"selected ":""}${today?"today ":""}${holiday?"holiday ":""}${status?`day-${status}`:"day-unknown"}`} onClick={()=>onChange(dateIso)} title={[holiday?.name,status==="available"?(serviceId?"Има свободни часове":"Работен ден"):status==="full"?"Всички часове са заети":status==="unavailable"?"Неработен ден":status==="blocked"?"Не може да се запише според срока за предварително записване":""].filter(Boolean).join(" · ")}><span>{day}</span>{holiday&&<small>{holiday.short}</small>}<i/></button>})}</div>
  {loadError&&<p className="calendar-hint bf-calendar-error">{loadError} Обнови страницата или избери услугата отново.</p>}{!serviceId&&<p className="calendar-hint">Календарът вече следва реалния работен график. Избери услуга, за да видиш кои работни дни имат свободен час за нея.</p>}
 </div>
}
