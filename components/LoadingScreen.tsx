"use client";
export default function LoadingScreen(_props:{title?:string;subtitle?:string}={}){
 return <div className="loading-screen bf-cinematic-loader" role="status" aria-live="polite" aria-label="BeautyFlow зарежда">
   <div className="loading-box bf-loader-clean bf-loader-premium">
     <div className="bf-loader-orbit"><img className="bf-loader-exact-logo" src="/beautyflow-logo-circle.png" alt="BeautyFlow"/><span className="bf-loader-scissor-orbit" aria-hidden="true"><span><svg viewBox="0 0 24 24" role="presentation"><path d="M9.64 7.64 5.5 3.5A2.12 2.12 0 1 0 4 7.12c.55 0 1.06-.2 1.45-.53l3.18 3.18L6 12.4A2.13 2.13 0 1 0 7.6 14l2.04-2.04 1.86 1.86L18.5 21H21l-11.36-11.36ZM4 5.5a.62.62 0 1 1 0-1.25.62.62 0 0 1 0 1.25Zm0 10a.62.62 0 1 1 0-1.25.62.62 0 0 1 0 1.25ZM13.41 10.59 21 3h-2.5l-6.34 6.34 1.25 1.25Z"/></svg></span></span></div>
     <div className="bf-loader-word">BEAUTY<span>FLOW</span></div><div className="bf-loader-progress"><i/></div><p>Зареждане...</p>
   </div>
 </div>
}
