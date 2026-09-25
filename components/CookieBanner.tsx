"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "beautyflow-cookie-consent-v3";
type Consent = { necessary: true; analytics: boolean; marketing: boolean; savedAt: string; version: 3 };

export default function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try { setOpen(!localStorage.getItem(CONSENT_KEY)); } catch { setOpen(true); }
    const reopen = () => { setSettings(true); setOpen(true); };
    window.addEventListener("beautyflow-open-cookie-settings", reopen);
    return () => window.removeEventListener("beautyflow-open-cookie-settings", reopen);
  }, []);

  function save(analyticsValue: boolean, marketingValue: boolean) {
    const consent: Consent = { necessary: true, analytics: analyticsValue, marketing: marketingValue, savedAt: new Date().toISOString(), version: 3 };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
      window.dispatchEvent(new CustomEvent("beautyflow-consent-changed", { detail: consent }));
    } catch {}
    setOpen(false); setSettings(false);
  }

  if (!open) return null;

  return (
    <div className="bf-cookie-overlay" role="presentation">
      <section className="bf-cookie-modal" role="dialog" aria-modal="true" aria-labelledby="bf-cookie-title" aria-describedby="bf-cookie-description">
        <div className="bf-cookie-brand"><img src="/beautyflow-logo-circle.png" alt="" /><span>BeautyFlow</span></div>
        <span className="bf-cookie-kicker">ПОВЕРИТЕЛНОСТ И БИСКВИТКИ</span>
        <h2 id="bf-cookie-title">Вашият избор е важен</h2>
        <p id="bf-cookie-description">Използваме строго необходимите технологии, за да работят сигурно входът, резервациите и основните функции на BeautyFlow. Незадължителните технологии се използват само след Ваш избор.</p>

        {settings && <div className="bf-cookie-settings">
          <div className="bf-cookie-setting"><div><strong>Необходими</strong><small>Сигурност, сесия, основни функции и запазване на избора Ви.</small></div><span className="bf-cookie-required">Винаги активни</span></div>
          <label className="bf-cookie-setting"><div><strong>Аналитични</strong><small>Помагат да разбираме как се използва сайтът. В момента BeautyFlow не активира такива технологии.</small></div><input type="checkbox" checked={analytics} onChange={e=>setAnalytics(e.target.checked)} /><i /></label>
          <label className="bf-cookie-setting"><div><strong>Маркетингови</strong><small>За персонализирана реклама и измерване на кампании. В момента BeautyFlow не активира такива технологии.</small></div><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)} /><i /></label>
        </div>}

        <div className="bf-cookie-actions">
          <button type="button" className="bf-cookie-secondary" onClick={() => save(false, false)}>Само необходимите</button>
          {settings ? <button type="button" className="bf-cookie-primary" onClick={() => save(analytics, marketing)}>Запази избора</button> : <button type="button" className="bf-cookie-primary" onClick={() => save(true, true)}>Приемам всички</button>}
        </div>
        <div className="bf-cookie-links">
          <button type="button" onClick={() => setSettings(v => !v)}>{settings ? "Скрий настройките" : "Настройки"}</button>
          <span>•</span><Link href="/cookies">Политика за бисквитките</Link><span>•</span><Link href="/privacy">Поверителност</Link>
        </div>
      </section>
    </div>
  );
}
