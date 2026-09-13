export const FREE_TRIAL_DAYS = 30;
export const GRACE_DAYS = 7;

export type AccessStatus = "pending" | "payment_pending" | "active" | "suspended" | "rejected";

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatBgDate(value?: string | null) {
  if (!value) return "няма дата";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function buildTrialDates(now = new Date()) {
  const validUntil = addDays(now, FREE_TRIAL_DAYS);
  const graceUntil = addDays(validUntil, GRACE_DAYS);

  return {
    trialStartedAt: now.toISOString(),
    subscriptionValidUntil: toDateOnly(validUntil),
    graceUntil: toDateOnly(graceUntil),
  };
}

export function isAccessExpired(status: AccessStatus, graceUntil?: string | null) {
  if (status === "suspended" || status === "rejected") return true;
  if (status !== "active") return true;
  if (!graceUntil) return false;

  const today = toDateOnly(new Date());
  return today > graceUntil;
}
