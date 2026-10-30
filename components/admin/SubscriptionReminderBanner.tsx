"use client";
import { useState } from "react";
import { PAYMENT_IBAN, formatDateBG, reminderInfo } from "@/lib/beautyflow/subscriptionReminders";

type BusinessLike = { name: string; active?: boolean | null; plan_id?: string | null; subscription_status?: string | null; subscription_ends_at?: string | null; trial_ends_at?: string | null };

// Shown to the salon owner in the admin panel during the last 7 days of the subscription, and after it ends.
export default function SubscriptionReminderBanner({ business }: { business: BusinessLike }) {
  const [copied, setCopied] = useState(false);
  if (String(business.subscription_status || "").toLowerCase() === "suspended") return null;
  const info = reminderInfo({ ...business });
  if (!info || info.daysLeft > 7) return null;
  const expired = info.daysLeft < 0;
  const what = info.isTrial ? "Пробният период" : "Абонаментът";
  const when = expired ? `изтече на ${formatDateBG(info.endDate)}` : info.daysLeft === 0 ? "изтича днес" : info.daysLeft === 1 ? "изтича утре" : `изтича след ${info.daysLeft} дни (${formatDateBG(info.endDate)})`;
  async function copy() {
    try { await navigator.clipboard.writeText(PAYMENT_IBAN); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the IBAN stays selectable */ }
  }
  return (
    <section className={`bf-sub-reminder${expired || info.daysLeft <= 1 ? " is-urgent" : ""}`} role="status" data-testid="subscription-reminder">
      <div className="bf-sub-reminder-icon" aria-hidden="true">{expired ? "⏸" : "💳"}</div>
      <div className="bf-sub-reminder-body">
        <b>{what} {when}</b>
        <p>{expired
          ? "Клиентите временно не могат да запазват часове онлайн. Преведете сумата и ще подновим достъпа веднага щом плащането постъпи."
          : "За да не спират онлайн записванията, преведете месечната сума по сметката по-долу."}</p>
        <dl>
          <div><dt>Сума</dt><dd>{info.price} € · план {info.plan.name}</dd></div>
          <div><dt>IBAN</dt><dd><span className="bf-sub-iban">{PAYMENT_IBAN}</span> <button type="button" onClick={copy}>{copied ? "Копирано ✓" : "Копирай"}</button></dd></div>
          <div><dt>Основание</dt><dd>{business.name}</dd></div>
        </dl>
        <small>Ако вече сте платили — благодарим! Ще подновим абонамента, щом плащането постъпи.</small>
      </div>
    </section>
  );
}
