"use client";
import { useMemo } from "react";
import { partsFromIso, toIsoDate } from "@/lib/beautyflow/date";

const MONTHS = [
  "Януари","Февруари","Март","Април","Май","Юни",
  "Юли","Август","Септември","Октомври","Ноември","Декември"
];

function daysInMonth(year:number, month:number){ return new Date(year, month, 0).getDate(); }

export default function BgDateInput({
  value,
  onChange,
  name,
  required = false,
  className = "",
  minYear,
  maxYear,
}: {
  value: string;
  onChange: (value:string)=>void;
  name?: string;
  required?: boolean;
  className?: string;
  minYear?: number;
  maxYear?: number;
}) {
  const now = new Date();
  const p = partsFromIso(value);
  const selectedYear = Number(p.year);
  const selectedMonth = Number(p.month);
  const selectedDay = Number(p.day);
  const from = minYear ?? now.getFullYear() - 1;
  const to = maxYear ?? now.getFullYear() + 5;
  const years = useMemo(()=>Array.from({length: Math.max(1,to-from+1)},(_,i)=>from+i),[from,to]);
  const maxDay = daysInMonth(selectedYear, selectedMonth);

  function setPart(next:{year?:number;month?:number;day?:number}){
    const y = next.year ?? selectedYear;
    const m = next.month ?? selectedMonth;
    const md = daysInMonth(y,m);
    const d = Math.min(next.day ?? selectedDay, md);
    onChange(toIsoDate(String(y),String(m).padStart(2,"0"),String(d).padStart(2,"0")));
  }

  return <div className={`bg-date ${className}`.trim()}>
    {name && <input type="hidden" name={name} value={value} required={required}/>} 
    <select aria-label="Ден" value={selectedDay} onChange={e=>setPart({day:Number(e.target.value)})}>
      {Array.from({length:maxDay},(_,i)=>i+1).map(d=><option key={d} value={d}>{String(d).padStart(2,"0")}</option>)}
    </select>
    <select aria-label="Месец" value={selectedMonth} onChange={e=>setPart({month:Number(e.target.value)})}>
      {MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
    </select>
    <select aria-label="Година" value={selectedYear} onChange={e=>setPart({year:Number(e.target.value)})}>
      {years.map(y=><option key={y} value={y}>{y}</option>)}
    </select>
  </div>
}
