import Link from "next/link";

export default function PublicNav() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="BeautyFlow начало">
          <img className="brand-logo" src="/beautyflow-logo-circle.png" alt="BeautyFlow" />
          <span className="brand-word">Beauty<span>Flow</span></span>
        </Link>

        <nav className="nav-links" aria-label="Основна навигация">
          <Link href="/">Начало</Link>
          <Link href="/salons">Салони</Link>
          <Link href="/how-it-works">Как работи</Link>
          <Link href="/about">За платформата</Link>
          <Link href="/contact">Контакти</Link>
        </nav>

        <div className="nav-actions">
          <Link href="/login" className="btn btn-light">Вход</Link>
          <Link href="/register-salon" className="btn btn-primary">Заяви достъп</Link>
        </div>
      </div>
    </header>
  );
}
