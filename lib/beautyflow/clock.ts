export function sofiaNow(){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Sofia",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
 const get=(t:string)=>Number(parts.find(p=>p.type===t)?.value||0);
 return {year:get("year"),month:get("month"),day:get("day"),hour:get("hour"),minute:get("minute")};
}
export function localWallMinutes(y:number,m:number,d:number,h=0,min=0){return Math.floor(Date.UTC(y,m-1,d,h,min)/60000)}
export function parseIsoDate(v:string){const [y,m,d]=v.split("-").map(Number);return {year:y,month:m,day:d}}
export function parseTime(v:string){const [hour,minute]=v.split(":").map(Number);return {hour,minute}}
export function minutesUntilSofia(date:string,time:string){const n=sofiaNow(),d=parseIsoDate(date),t=parseTime(time);return localWallMinutes(d.year,d.month,d.day,t.hour,t.minute)-localWallMinutes(n.year,n.month,n.day,n.hour,n.minute)}
