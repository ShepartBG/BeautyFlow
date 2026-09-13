export type BulgarianHoliday={name:string;short:string};

function pad(n:number){return String(n).padStart(2,"0")}
function isoDate(d:Date){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function addDays(d:Date,n:number){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()+n);return x}

// Orthodox Easter calculation (Gregorian date, valid for the years used by BeautyFlow).
function orthodoxEaster(year:number){
 const a=year%4,b=year%7,c=year%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7;
 const julianMonth=Math.floor((d+e+114)/31),julianDay=(d+e+114)%31+1;
 const julian=new Date(year,julianMonth-1,julianDay);
 return addDays(julian,13);
}

export function bulgarianHolidays(year:number){
 const out:Record<string,BulgarianHoliday>={};
 const put=(month:number,day:number,name:string,short=name)=>{out[`${year}-${pad(month)}-${pad(day)}`]={name,short}};
 put(1,1,"Нова година","Нова година");
 put(3,3,"Национален празник на България","3 март");
 put(5,1,"Ден на труда","1 май");
 put(5,6,"Гергьовден · Ден на храбростта и Българската армия","Гергьовден");
 put(5,24,"Ден на светите братя Кирил и Методий, на българската азбука, просвета и култура","24 май");
 put(9,6,"Съединението на България","Съединението");
 put(9,22,"Независимостта на България","Независимостта");
 put(12,24,"Бъдни вечер","Бъдни вечер");
 put(12,25,"Рождество Христово","Коледа");
 put(12,26,"Втори ден на Рождество Христово","Коледа");
 const easter=orthodoxEaster(year);
 out[isoDate(addDays(easter,-2))]={name:"Разпети петък",short:"Разпети петък"};
 out[isoDate(addDays(easter,-1))]={name:"Велика събота",short:"Велика събота"};
 out[isoDate(easter)]={name:"Великден",short:"Великден"};
 out[isoDate(addDays(easter,1))]={name:"Великден · понеделник",short:"Великден"};
 return out;
}
