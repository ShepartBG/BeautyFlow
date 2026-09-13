export function toMinutes(v:string){const [h,m]=v.slice(0,5).split(":").map(Number);return h*60+m}
export function fromMinutes(v:number){const h=Math.floor(v/60),m=v%60;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`}
export function addMinutes(v:string,n:number){return fromMinutes(toMinutes(v)+n)}
export function overlaps(a1:number,a2:number,b1:number,b2:number){return a1<b2 && b1<a2}
