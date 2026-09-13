"use client";

import { useEffect, useState } from "react";

const COOKIE_KEY = "beautyflow-cookie-consent-v1";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(COOKIE_KEY));
  }, []);

  function saveConsent(value: "necessary" | "all") {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ value, acceptedAt: new Date().toISOString() }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-4xl rounded-[1.5rem] border border-pink-400/25 bg-white/90 p-4 shadow-[0_0_60px_rgba(0,0,0,.7)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black  tracking-[0.18em] text-pink-300">Бисквитки</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Използваме нужни бисквитки/локално съхранение за работата на сайта. Аналитични или маркетинг бисквитки се използват само след съгласие.
          </p>
          <a href="/cookies" className="mt-2 inline-block text-sm font-bold text-pink-300 hover:text-zinc-900">
            Политика за бисквитките
          </a>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => saveConsent("necessary")}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-900 hover:bg-white/10"
          >
            Само нужните
          </button>
          <button
            type="button"
            onClick={() => saveConsent("all")}
            className="rounded-2xl bg-pink-500 px-4 py-3 text-sm font-black text-black hover:bg-pink-400"
          >
            Приемам
          </button>
        </div>
      </div>
    </div>
  );
}
