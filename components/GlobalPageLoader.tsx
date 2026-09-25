"use client";
import{useEffect,useRef,useState}from"react";
import{usePathname}from"next/navigation";
import LoadingScreen from"@/components/LoadingScreen";
export default function GlobalPageLoader(){
 const pathname=usePathname(),[visible,setVisible]=useState(false),started=useRef(0),safety=useRef<number|null>(null),previousPath=useRef(pathname);
 useEffect(()=>{if(!visible)return;let cancelled=false;let frame=0;const check=()=>{if(cancelled)return;const elapsed=Date.now()-started.current;const pageStillLoading=Boolean(document.querySelector(".bf-app-content .loading-screen"));const arrived=pathname!==previousPath.current;if(arrived&&elapsed>=350&&!pageStillLoading){window.setTimeout(()=>{if(!cancelled){previousPath.current=pathname;setVisible(false)}},90);return}if(elapsed>10000){previousPath.current=pathname;setVisible(false);return}frame=requestAnimationFrame(check)};frame=requestAnimationFrame(check);return()=>{cancelled=true;cancelAnimationFrame(frame)}},[pathname,visible]);
 useEffect(()=>{const click=(e:MouseEvent)=>{if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const a=(e.target as Element|null)?.closest("a[href]") as HTMLAnchorElement|null;if(!a||a.target==="_blank"||a.hasAttribute("download"))return;const u=new URL(a.href,location.href);if(u.origin!==location.origin||(u.pathname===location.pathname&&u.search===location.search))return;previousPath.current=location.pathname;started.current=Date.now();setVisible(true);if(safety.current)window.clearTimeout(safety.current);safety.current=window.setTimeout(()=>setVisible(false),10500)};document.addEventListener("click",click,true);return()=>{document.removeEventListener("click",click,true);if(safety.current)window.clearTimeout(safety.current)}},[]);
 if(!visible)return null;return <div className="global-loading-overlay"><LoadingScreen/></div>
}
