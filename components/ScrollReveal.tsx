"use client";
import {useEffect} from "react";
export default function ScrollReveal(){
 useEffect(()=>{
  const nodes=[...document.querySelectorAll<HTMLElement>(".bf-cinematic-section,.bf-home-story,.bf-home-reminders,.bf-home-business-story")];
  nodes.forEach((el,i)=>{el.classList.add("bf-enter",i%2?"bf-enter-right":"bf-enter-left")});
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){(e.target as HTMLElement).classList.add("is-visible");io.unobserve(e.target)}}),{threshold:.12,rootMargin:"0px 0px -7% 0px"});
  nodes.forEach(el=>io.observe(el));
  return()=>io.disconnect();
 },[]);
 return null;
}
