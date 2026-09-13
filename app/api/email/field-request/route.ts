import { NextResponse } from "next/server";
import {
  fieldRequestOwnerNotificationEmail,
  fieldRequestReceivedEmail,
} from "@/lib/email/fieldRequestEmails";
import { sendBeautyFlowEmail } from "@/lib/email/emailSender";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase().slice(0, 120);
    const fieldName = sanitizeText(body.fieldName, 80);
    const ownerName = sanitizeText(body.ownerName, 80);
    const city = sanitizeText(body.city, 120);
    const phone = String(body.phone || "").replace(/\D/g, "").slice(0, 10);
    const website = sanitizeUrl(body.website);
    const facebook = sanitizeUrl(body.facebook);
    const instagram = sanitizeUrl(body.instagram);
    const tiktok = sanitizeUrl(body.tiktok);
    const message = sanitizeText(body.message, 500) || null;

    if (!email || !fieldName) {
      return NextResponse.json(
        { ok: false, message: "Липсва email или име на салонто." },
        { status: 400 },
      );
    }

    const requesterTemplate = fieldRequestReceivedEmail(fieldName);
    const requesterResult = await sendBeautyFlowEmail({
      to: email,
      subject: requesterTemplate.subject,
      text: requesterTemplate.body,
      html: requesterTemplate.html,
    });

    const ownerEmail =
      process.env.BEAUTYFLOW_OWNER_EMAIL || "battlebooking@abv.bg";
    const ownerTemplate = fieldRequestOwnerNotificationEmail({
      fieldName,
      ownerName,
      city,
      phone,
      email,
      website,
      facebook,
      instagram,
      tiktok,
      message,
    });

    const ownerResult = await sendBeautyFlowEmail({
      to: ownerEmail,
      subject: ownerTemplate.subject,
      text: ownerTemplate.body,
      html: ownerTemplate.html,
    });

    const ok = Boolean(
      requesterResult.ok ||
        ownerResult.ok ||
        requesterResult.skipped ||
        ownerResult.skipped,
    );

    return NextResponse.json(
      {
        ok,
        requester: requesterResult,
        owner: ownerResult,
        message:
          requesterResult.ok && ownerResult.ok
            ? "Email-ите са изпратени успешно."
            : requesterResult.skipped || ownerResult.skipped
              ? "Email engine не е конфигуриран. Заявката е запазена."
              : "Заявката е запазена, но възникна проблем при изпращане на email.",
      },
      { status: ok ? 200 : 500 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Неочаквана грешка при изпращане на email.",
      },
      { status: 500 },
    );
  }
}


function sanitizeText(value: unknown, maxLength: number) {
  return String(value || "")
    .replace(/<\s*\/?\s*(script|iframe|object|embed|img|svg|link|meta|style)[^>]*>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function sanitizeUrl(value: unknown) {
  const raw = sanitizeText(value, 180);
  if (!raw) return null;
  const normalized = /^www\./i.test(raw) ? `https://${raw}` : raw;

  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return normalized;
  } catch {
    return null;
  }
}

