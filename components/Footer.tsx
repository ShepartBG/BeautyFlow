"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer bf-v230-footer bf-v257-footer">
      <div className="footer-inner">
        <div className="bf-v230-footer-brand">
          <img className="footer-logo" src="/beautyflow-logo-circle.webp" alt="BeautyFlow" />
          <div><strong>Beauty<span>Flow</span></strong><small>Bookings made beautiful</small></div>
        </div>
        <div className="bf-v230-footer-nav">
          <Link href="/">Начало</Link><Link href="/salons">Салони</Link><Link href="/how-it-works">Как работи</Link><Link href="/about">За нас</Link><Link href="/contact">Контакти</Link>
        </div>
        <div className="bf-v230-social"><span>f</span><span>◎</span><span>♪</span></div>
      </div>
      <div className="bf-v230-footer-bottom"><span>© 2026 BeautyFlow · ВЕЛКРОН ЕООД · ЕИК 208747091 · 0897047668. Всички права запазени.</span><div><Link href="/terms">Общи условия</Link><Link href="/privacy">Политика за поверителност</Link><Link href="/cookies">Бисквитки</Link><button type="button" className="bf-cookie-footer-button" onClick={() => window.dispatchEvent(new Event("beautyflow-open-cookie-settings"))}>Настройки за бисквитки</button></div></div>
    </footer>
  );
}
