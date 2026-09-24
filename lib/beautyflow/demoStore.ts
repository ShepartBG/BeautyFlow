"use client";

import type { BeautyFlowDemoState } from "./types";

const KEY = "beautyflow-demo-v1";

const initialState: BeautyFlowDemoState = {
  business: {
    name: "Beauty Studio Demo",
    city: "Козлодуй",
    category: "Миглопластика и красота",
    description: "Демо профил за тестване на BeautyFlow booking системата.",
  },
  services: [
    { id: "lashes-full", name: "Пълен комплект миглопластика", durationMin: 90, bufferMin: 0, price: 80, active: true, category: "Миглопластика" },
    { id: "lashes-refill", name: "Поддръжка на миглопластика", durationMin: 30, bufferMin: 0, price: 40, active: true, category: "Миглопластика" },
    { id: "haircut", name: "Подстригване", durationMin: 45, bufferMin: 0, price: 35, active: true, category: "Фризьор" },
  ],
  workingHours: [
    { day: 0, enabled: false, start: "09:00", end: "18:00" },
    { day: 1, enabled: true, start: "09:00", end: "18:00" },
    { day: 2, enabled: true, start: "09:00", end: "18:00" },
    { day: 3, enabled: true, start: "09:00", end: "18:00" },
    { day: 4, enabled: true, start: "09:00", end: "18:00" },
    { day: 5, enabled: true, start: "09:00", end: "18:00" },
    { day: 6, enabled: false, start: "09:00", end: "14:00" },
  ],
  settings: { slotStepMin: 30, minNoticeHours: 1, maxAdvanceDays: 60 },
  timeOff: [],
  appointments: [],
};

export function loadDemoState(): BeautyFlowDemoState {
  if (typeof window === "undefined") return initialState;
  const raw = localStorage.getItem(KEY);
  if (!raw) return structuredClone(initialState);
  try {
    return { ...structuredClone(initialState), ...JSON.parse(raw) } as BeautyFlowDemoState;
  } catch {
    return structuredClone(initialState);
  }
}

export function saveDemoState(state: BeautyFlowDemoState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("beautyflow-demo-change"));
}

export function resetDemoState() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("beautyflow-demo-change"));
}

export function demoStateSeed() {
  return structuredClone(initialState);
}
