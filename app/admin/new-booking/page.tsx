"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import LoadingScreen from "@/components/LoadingScreen";
import BookingMonthCalendar from "@/components/beautyflow/BookingMonthCalendar";
import { useBusiness } from "@/lib/beautyflow/useBusiness";
import { isoToday } from "@/lib/beautyflow/date";
import { supabase } from "@/lib/supabase";

type Service = { id: string; name: string; duration_min: number; buffer_min: number; price: number };
type Slot = { time: string; status: string; staffId?: string };
type Done = { service: string; date: string; time: string; staffName: string; salon: string; price: number; customer: string; phone: string };

const addDaysIso = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const bgDate = (iso: string) => iso.split("-").reverse().join(".");
const token = async () => (await supabase.auth.getSession()).data.session?.access_token || "";

// Manual booking: the owner or a specialist books a client into their OWN schedule, with the same
// free slots the client sees online, without email and without the online-client limits.
export default function NewBooking() {
  const { business, loading: businessLoading, staffId } = useBusiness();
  const [authToken, setAuthToken] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(isoToday());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMsg, setSlotsMsg] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [blacklistWarning, setBlacklistWarning] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => { token().then(setAuthToken); }, []);

  // Services this person performs (same rule as the public page: unlinked services are for everyone).
  useEffect(() => {
    if (!business || !staffId) { if (!businessLoading) setLoading(false); return; }
    (async () => {
      setLoading(true);
      const [{ data: s }, { data: links }] = await Promise.all([
        supabase.from("services").select("id,name,duration_min,buffer_min,price").eq("salon_id", business.id).eq("active", true).order("name"),
        supabase.from("staff_services").select("staff_id,service_id").eq("salon_id", business.id),
      ]);
      const byService = new Map<string, Set<string>>();
      for (const l of links || []) { if (!byService.has(l.service_id)) byService.set(l.service_id, new Set()); byService.get(l.service_id)!.add(l.staff_id); }
      setServices(((s || []) as Service[]).filter((x) => !byService.has(x.id) || byService.get(x.id)!.has(staffId)));
      setLoading(false);
    })();
  }, [business?.id, staffId, businessLoading]);

  // Free slots for the chosen day — the exact public availability, in manual mode.
  useEffect(() => {
    if (!business || !staffId || !serviceId || !date || !authToken) { setSlots([]); return; }
    const ctrl = new AbortController();
    setSlotsLoading(true); setSlotsMsg(""); setTime("");
    const qs = new URLSearchParams({ salonId: business.id, serviceId, staffId, date, manual: "1" });
    fetch(`/api/public/availability?${qs}`, { headers: { Authorization: `Bearer ${authToken}` }, cache: "no-store", signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { const free = (j.timeline || []).filter((x: Slot) => x.status === "available"); setSlots(free); setSlotsMsg(free.length ? "" : j.message || "Няма свободни часове в твоя график за този ден."); })
      .catch((e) => { if (e?.name !== "AbortError") setSlotsMsg("Не успяхме да заредим свободните часове."); })
      .finally(() => setSlotsLoading(false));
    return () => ctrl.abort();
  }, [business?.id, staffId, serviceId, date, authToken, refresh]);

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);

  async function submit(e?: React.FormEvent, confirmBlacklist = false) {
    e?.preventDefault();
    if (busy || !serviceId || !time) return;
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/business/manual-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ serviceId, date, startTime: time, customerName: name, customerPhone: phone, note, confirmBlacklist }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409 && j.blacklisted) { setBlacklistWarning(j.message); return; }
      if (!r.ok) { setMsg(j.message || "Не успяхме да запишем часа."); if (r.status === 409) setSlots((v) => v.filter((x) => x.time !== time)); return; }
      setBlacklistWarning("");
      setDone({ service: j.service, date: j.date, time: j.time, staffName: j.staffName, salon: j.salon, price: Number(j.price), customer: name.trim(), phone: phone.trim() });
    } finally { setBusy(false); }
  }

  function startOver() {
    // Keep the chosen service and day; reload the free slots (the booked one is gone now).
    setDone(null); setTime(""); setName(""); setPhone(""); setNote(""); setMsg(""); setBlacklistWarning("");
    setRefresh((n) => n + 1);
  }

  if (businessLoading || loading) return <LoadingScreen title="Зареждане..." subtitle="Зареждаме твоя график" />;

  return (
    <AdminShell>
      <header className="dash-header">
        <div>
          <span className="eyebrow">РЪЧНО ЗАПИСВАНЕ</span>
          <h1>Ново записване</h1>
          <p>Запиши клиент в своя график — същите свободни часове, които вижда и клиентът онлайн. Без имейл и без код за потвърждение.</p>
        </div>
      </header>

      {!staffId ? (
        <section className="dash-card"><p>Нямаш активен график в този салон, затова не можеш да записваш часове.</p></section>
      ) : services.length === 0 ? (
        <section className="dash-card"><p>Нямаш зададени услуги. Добави услуга или помоли собственика да ти я зададе в „Екип“.</p></section>
      ) : (
        <section className="dash-card bf-manual-booking">
          <form onSubmit={submit} className="bf-manual-form" data-testid="manual-booking-form">
            <div className="field">
              <label htmlFor="mb-service">Услуга</label>
              <select id="mb-service" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setTime(""); }} required>
                <option value="">Избери услуга</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.duration_min} мин. · {Number(s.price)} €</option>)}
              </select>
            </div>

            {serviceId && <>
              <div className="field">
                <label>Ден</label>
                <BookingMonthCalendar value={date} onChange={(v) => { setDate(v); setTime(""); }} minDate={isoToday()} maxDate={addDaysIso(isoToday(), 365)} salonId={business!.id} serviceId={serviceId} staffId={staffId} authToken={authToken} />
              </div>
              <div className="field">
                <label>Свободни часове за {bgDate(date)}</label>
                {slotsLoading ? <p className="field-help">Зареждане на свободните часове...</p> : slots.length ? (
                  <div className="timeline-grid bf-manual-slots">
                    {slots.map((s) => <button type="button" key={s.time} className={`available${time === s.time ? " selected" : ""}`} aria-pressed={time === s.time} onClick={() => setTime(s.time)}><b>{s.time}</b></button>)}
                  </div>
                ) : <p className="field-help">{slotsMsg || "Няма свободни часове в твоя график за този ден."}</p>}
              </div>
            </>}

            {time && <>
              <div className="form-grid">
                <div className="field"><label htmlFor="mb-name">Име на клиента</label><input id="mb-name" name="customerName" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={90} autoComplete="off" /></div>
                <div className="field"><label htmlFor="mb-phone">Телефон</label><input id="mb-phone" name="customerPhone" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="0888123456" autoComplete="off" /></div>
              </div>
              <div className="field"><label htmlFor="mb-note">Бележка (по желание)</label><textarea id="mb-note" name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} rows={2} /></div>
              <div className="bf-manual-summary"><b>{service?.name}</b> · {bgDate(date)} · {time} · {service?.duration_min} мин. · {Number(service?.price)} €</div>
              <button className="btn btn-primary" disabled={busy}>{busy ? "Записване..." : "Запиши часа"}</button>
            </>}
            {msg && <p className="form-message" role="alert">{msg}</p>}
          </form>
        </section>
      )}

      {blacklistWarning && (
        <div className="bf-manual-modal" role="dialog" aria-modal="true" aria-label="Клиент в черния списък">
          <div className="bf-manual-modal-card bf-manual-warning">
            <div className="booking-success-icon" aria-hidden="true">!</div>
            <h2>Клиент в черния списък</h2>
            <p>{blacklistWarning}</p>
            <div className="bf-manual-modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => submit(undefined, true)} disabled={busy}>Да, запиши го</button>
              <button type="button" className="btn btn-light" onClick={() => setBlacklistWarning("")}>Отказ</button>
            </div>
          </div>
        </div>
      )}

      {done && (
        <div className="bf-manual-modal" role="dialog" aria-modal="true" aria-label="Часът е запазен">
          <div className="bf-manual-modal-card booking-success" data-testid="manual-booking-success">
            <div className="booking-success-icon">✓</div>
            <span className="badge">РЕЗЕРВАЦИЯТА Е УСПЕШНА</span>
            <h2>Часът е запазен.</h2>
            <p>Направи снимка на екрана и я изпрати на клиента.</p>
            <dl>
              <div><dt>Салон</dt><dd>{done.salon}</dd></div>
              <div><dt>Клиент</dt><dd>{done.customer}</dd></div>
              <div><dt>Услуга</dt><dd>{done.service}</dd></div>
              <div><dt>Дата</dt><dd>{bgDate(done.date)}</dd></div>
              <div><dt>Час</dt><dd>{done.time}</dd></div>
              <div><dt>Специалист</dt><dd>{done.staffName}</dd></div>
              <div><dt>Цена</dt><dd>{done.price} €</dd></div>
            </dl>
            <div className="bf-manual-modal-actions">
              <button type="button" className="btn btn-primary" onClick={startOver}>Ново записване</button>
              <Link className="btn btn-light" href="/admin/calendar">Към календара</Link>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
