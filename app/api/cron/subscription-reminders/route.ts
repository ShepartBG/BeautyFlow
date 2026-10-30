import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthSiteUrl } from "@/lib/authRedirect";
import { sendBeautyFlowEmail } from "@/lib/email/emailSender";
import { subscriptionReminderEmail, subscriptionRemindersSummaryEmail } from "@/lib/email/templates";
import { PAYMENT_IBAN, formatDateBG, reminderInfo, reminderStage, shouldRemind } from "@/lib/beautyflow/subscriptionReminders";

export const dynamic = "force-dynamic";

/*
  Daily job (Vercel Cron, see vercel.json): emails each salon owner 7, 3 and 1 day before the
  subscription/trial ends and on the last day, with the amount, IBAN and payment reference.
  Each reminder is logged in subscription_reminders, so it is sent only once.
  Query params (all require the cron secret):
    ?dry=1        list what would be sent, send nothing
    ?salonId=...  limit the run to one salon (used by the release test)
*/
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ message: "CRON_SECRET липсва." }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ message: "Нямате достъп." }, { status: 401 });

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const onlySalon = url.searchParams.get("salonId") || "";
  const db = getSupabaseAdmin();
  const site = getAuthSiteUrl(url.origin);

  let q = db.from("salons").select("id,name,owner_id,access_request_id,active,plan_id,subscription_status,subscription_ends_at,trial_ends_at");
  if (onlySalon) q = q.eq("id", onlySalon);
  const { data: salons, error } = await q;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const results: { salon: string; stage: string; daysLeft: number; status: string; sentTo?: string }[] = [];
  const summary: Parameters<typeof subscriptionRemindersSummaryEmail>[0] = [];

  for (const s of salons || []) {
    if (!shouldRemind(s)) continue;
    const info = reminderInfo(s);
    if (!info) continue;
    const stage = reminderStage(info.daysLeft);
    if (!stage) continue;

    const owner = s.owner_id ? (await db.auth.admin.getUserById(s.owner_id)).data.user : null;
    const to = owner?.email || "";
    if (!to) { results.push({ salon: s.name, stage, daysLeft: info.daysLeft, status: "no-owner-email" }); continue; }

    if (dry) {
      const { data: done } = await db.from("subscription_reminders").select("id").eq("salon_id", s.id).eq("period_end", info.endDate).eq("stage", stage).maybeSingle();
      results.push({ salon: s.name, stage, daysLeft: info.daysLeft, status: done ? "already-sent" : "would-send", sentTo: to });
      continue;
    }

    // Claim the reminder first; the unique key makes a second run the same day a no-op.
    const claim = await db.from("subscription_reminders").insert({ salon_id: s.id, period_end: info.endDate, stage, sent_to: to }).select("id").maybeSingle();
    if (claim.error) {
      results.push({ salon: s.name, stage, daysLeft: info.daysLeft, status: claim.error.code === "23505" ? "already-sent" : `error: ${claim.error.message}` });
      continue;
    }

    let ownerName = owner?.user_metadata?.owner_name as string | undefined;
    if (!ownerName && s.access_request_id) ownerName = (await db.from("access_requests").select("owner_name").eq("id", s.access_request_id).maybeSingle()).data?.owner_name || undefined;
    const mail = subscriptionReminderEmail({
      ownerName: ownerName || s.name, businessName: s.name, planName: info.plan.name, price: info.price,
      endDate: formatDateBG(info.endDate), daysLeft: info.daysLeft, isTrial: info.isTrial, iban: PAYMENT_IBAN, loginUrl: `${site}/login`,
    });
    const sent = await sendBeautyFlowEmail({ to, ...mail });
    // If sending failed, release the claim so tomorrow's run tries again.
    if (!sent.ok) await db.from("subscription_reminders").delete().eq("id", claim.data!.id);
    results.push({ salon: s.name, stage, daysLeft: info.daysLeft, status: sent.ok ? "sent" : `send-failed: ${sent.message}`, sentTo: to });
    summary.push({ businessName: s.name, planName: info.plan.name, price: info.price, endDate: formatDateBG(info.endDate), daysLeft: info.daysLeft, sentTo: to, ok: sent.ok });
  }

  // One daily summary to the platform owner (not for single-salon test runs).
  const platformInbox = process.env.BEAUTYFLOW_OWNER_EMAIL;
  if (!dry && !onlySalon && summary.length && platformInbox) await sendBeautyFlowEmail({ to: platformInbox, ...subscriptionRemindersSummaryEmail(summary) });

  return NextResponse.json({ ok: true, dry, checked: (salons || []).length, results });
}
