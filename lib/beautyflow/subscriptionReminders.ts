// Automatic "payment due" reminders before a salon's subscription (or trial) ends.
import { beautyPlan } from "@/lib/beautyflow/plans";
import { subscriptionEnd } from "@/lib/beautyflow/subscription";

/** Bank account for subscription payments. The payment reference is the salon's name. */
export const PAYMENT_IBAN = "BG08FINV91501017847366";

export type ReminderStage = "day7" | "day3" | "day1" | "day0";

const sofiaDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const dayNumber = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;

type SalonLike = { active?: boolean | null; subscription_status?: string | null; subscription_ends_at?: string | null; trial_ends_at?: string | null; plan_id?: string | null; name: string };

/** Whole calendar days (Europe/Sofia) until the end date: 0 = ends today, negative = already ended. */
export function reminderInfo(salon: SalonLike, now = new Date()) {
  const end = subscriptionEnd(salon);
  if (!end) return null;
  const endDate = sofiaDate(new Date(end));
  const daysLeft = dayNumber(endDate) - dayNumber(sofiaDate(now));
  const plan = beautyPlan(salon.plan_id);
  const isTrial = String(salon.subscription_status || "").toLowerCase() === "trial" || (!salon.subscription_ends_at && !!salon.trial_ends_at);
  return { endDate, daysLeft, plan, price: plan.price, isTrial, reference: salon.name };
}

/**
 * The reminder due today. Stages are ranges, not exact days, so a missed daily run still sends
 * the right reminder the next day (e.g. 6 days left → the 7-day reminder if it was not sent yet).
 */
export function reminderStage(daysLeft: number): ReminderStage | null {
  if (daysLeft < 0 || daysLeft > 7) return null;
  if (daysLeft === 0) return "day0";
  if (daysLeft === 1) return "day1";
  if (daysLeft <= 3) return "day3";
  return "day7";
}

export function shouldRemind(salon: SalonLike) {
  return salon.active !== false && String(salon.subscription_status || "").toLowerCase() !== "suspended";
}

export const formatDateBG = (iso: string) => iso.split("-").reverse().join(".");
