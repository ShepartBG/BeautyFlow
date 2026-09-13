import Link from "next/link";

export default function BFFooter() {
  return (
    <footer className="bf3-footer">
      <div className="bf3-footer-top">
        <Link href="/" className="bf3-footer-brand">
          <img src="/beautyflow-logo-circle.png" alt="" />
          <span><b>Beauty<span>Flow</span></b><small>Bookings made beautiful</small></span>
        </Link>
        <nav>
          <Link href="/">Начало</Link><Link href="/salons">Салони</Link><Link href="/how-it-works">Как работи</Link><Link href="/about">За нас</Link><Link href="/contact">Контакти</Link>
        </nav>
        <div className="bf3-social" aria-label="Социални мрежи"><span>f</span><span>◎</span><span>♪</span></div>
      </div>
      <div className="bf3-footer-bottom">
        <span>© 2026 BeautyFlow. Всички права запазени.</span>
        <div><Link href="/terms">Общи условия</Link><Link href="/privacy">Политика за поверителност</Link></div>
      </div>
    </footer>
  );
}
