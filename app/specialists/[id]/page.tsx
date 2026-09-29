"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";

type Specialist = { name: string; title: string | null; bio: string | null; avatar_url: string | null; instagram_url: string | null; facebook_url: string | null };
type Salon = { name: string; slug: string; city: string | null; logo_url: string | null };
type Service = { id: string; name: string; duration_min: number; price: number };
type Profile = { specialist: Specialist; salon: Salon; services: Service[] };

function socialUrl(value: string) { return /^https?:\/\//i.test(value) ? value : `https://${value}`; }

export default function SpecialistProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/public/specialist?id=${encodeURIComponent(id)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.message || "Не успяхме да заредим специалиста."); return body as Profile; })
      .then(data => { setProfile(data); setMessage(""); })
      .catch(error => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Не успяхме да заредим специалиста."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  if (loading) return <LoadingScreen title="Зареждане..." subtitle="Подготвяме профила на специалиста" />;
  if (!profile) return <main className="page"><PublicNav /><div className="empty-state standalone"><h2>{message || "Специалистът не е намерен."}</h2><Link href="/specialists">Към специалистите</Link></div><Footer /></main>;

  const { specialist, salon, services } = profile;
  return <main className="page"><PublicNav />
    <section className="container bf-specialist-profile">
      <Link className="bf-specialist-back" href="/specialists">← Всички специалисти</Link>
      <article className="bf-specialist-profile-card">
        <div className="bf-specialist-profile-photo">{specialist.avatar_url ? <img src={specialist.avatar_url} alt={`Снимка на ${specialist.name}`} /> : <span>{specialist.name.slice(0, 1)}</span>}</div>
        <div className="bf-specialist-profile-content">
          <span className="eyebrow">BEAUTYFLOW СПЕЦИАЛИСТ</span>
          <h1>{specialist.name}</h1>
          <p className="bf-specialist-profile-title">{specialist.title || "Специалист"}</p>
          <p className="bf-specialist-profile-salon">{salon.name}{salon.city ? ` · ${salon.city}` : ""}</p>
          {specialist.bio && <section className="bf-specialist-profile-bio"><h2>За мен</h2><p>{specialist.bio}</p></section>}
          {services.length > 0 && <section className="bf-specialist-profile-services"><h2>Услуги</h2><div>{services.map(service => <div key={service.id}><strong>{service.name}</strong><span>{service.duration_min} мин. · {Number(service.price).toFixed(2)} €</span></div>)}</div></section>}
          {(specialist.instagram_url || specialist.facebook_url) && <nav className="bf-specialist-profile-social" aria-label="Социални профили">{specialist.instagram_url && <a href={socialUrl(specialist.instagram_url)} target="_blank" rel="noopener noreferrer">Instagram ↗</a>}{specialist.facebook_url && <a href={socialUrl(specialist.facebook_url)} target="_blank" rel="noopener noreferrer">Facebook ↗</a>}</nav>}
          <div className="bf-specialist-profile-actions"><Link className="btn btn-primary" href={`/salon/${encodeURIComponent(salon.slug)}`}>Запази час</Link><Link className="btn btn-light" href={`/salon/${encodeURIComponent(salon.slug)}`}>Виж салона</Link></div>
        </div>
      </article>
    </section><Footer />
  </main>;
}
