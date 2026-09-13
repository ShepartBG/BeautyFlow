"use client";

import { useEffect } from "react";

function fieldName(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const id = el.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent?.trim()) return label.textContent.trim();
  }
  const parentLabel = el.closest("label");
  if (parentLabel?.textContent?.trim()) return parentLabel.textContent.trim();
  const field = el.closest(".field");
  const label = field?.querySelector("label");
  return label?.textContent?.trim() || "Това поле";
}

function messageFor(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const v = el.validity;
  const name = fieldName(el);
  if (v.valueMissing) return `${name} е задължително поле.`;
  if (v.typeMismatch) {
    if (el instanceof HTMLInputElement && el.type === "email") return "Въведи валиден имейл адрес, например name@example.com.";
    if (el instanceof HTMLInputElement && el.type === "url") return "Въведи валиден интернет адрес.";
    return `Провери стойността в полето „${name}“.`;
  }
  if (v.patternMismatch) return el.title?.trim() || `Стойността в „${name}“ не е във валиден формат.`;
  if (v.tooShort) return `${name} трябва да съдържа поне ${el.getAttribute("minlength") || "необходимия брой"} знака.`;
  if (v.tooLong) return `${name} е прекалено дълго.`;
  if (v.rangeUnderflow) return `${name} трябва да е поне ${el.getAttribute("min")}.`;
  if (v.rangeOverflow) return `${name} трябва да е най-много ${el.getAttribute("max")}.`;
  if (v.stepMismatch) return `Въведи позволена стойност за „${name}“.`;
  if (v.badInput) return `Въведи валидна стойност за „${name}“.`;
  return `Провери полето „${name}“.`;
}

function fieldHost(el: Element){return el.closest(".field") || el.closest("label") || el.parentElement}
function clearError(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement){
  el.setCustomValidity("");el.classList.remove("bf-invalid-field");el.removeAttribute("aria-invalid");
  const host=fieldHost(el);host?.querySelector(":scope > .bf-validation-error")?.remove();
}
function showError(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement){
  clearError(el);const message=messageFor(el);el.setCustomValidity(message);el.classList.add("bf-invalid-field");el.setAttribute("aria-invalid","true");
  const host=fieldHost(el);if(host){const node=document.createElement("small");node.className="bf-validation-error";node.setAttribute("role","alert");node.textContent=`⚠ ${message}`;host.appendChild(node)}
}
function applyDefaultLimits(root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea").forEach(el => {
    if (!el.hasAttribute("maxlength")) {
      if (el instanceof HTMLTextAreaElement) el.maxLength = 1000;
      else if (["text", "search", "tel", "email", "url", "password"].includes(el.type)) el.maxLength = el.type === "password" ? 128 : el.type === "email" || el.type === "url" ? 180 : 140;
    }
    if(el instanceof HTMLInputElement && el.inputMode==="numeric"){
      el.addEventListener("input",()=>{if(el.type!=="number")el.value=el.value.replace(/\D/g,"").slice(0,el.maxLength>0?el.maxLength:32)},{passive:true});
    }
  });
}

export default function BulgarianFormGuard() {
  useEffect(() => {
    applyDefaultLimits();
    const observer = new MutationObserver(() => applyDefaultLimits());
    observer.observe(document.body, { childList: true, subtree: true });
    let focused=false;
    const onInvalid = (event: Event) => {
      const el = event.target;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
      event.preventDefault();showError(el);
      if(!focused){focused=true;requestAnimationFrame(()=>{el.scrollIntoView({behavior:"smooth",block:"center"});el.focus({preventScroll:true});setTimeout(()=>{focused=false},50)})}
    };
    const clear = (event: Event) => {
      const el = event.target;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) clearError(el);
    };
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", clear, true);
    document.addEventListener("change", clear, true);
    return () => {observer.disconnect();document.removeEventListener("invalid", onInvalid, true);document.removeEventListener("input", clear, true);document.removeEventListener("change", clear, true)};
  }, []);
  return null;
}
