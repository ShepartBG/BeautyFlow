import { NextResponse } from "next/server";
import { fieldRequestDecisionEmail } from "@/lib/email/fieldRequestEmails";
import { sendBeautyFlowEmail } from "@/lib/email/emailSender";
import type { FieldRequestStatus } from "@/lib/fieldRequests";

const allowedStatuses: FieldRequestStatus[] = [
  "payment_pending",
  "active",
  "suspended",
  "rejected",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const fieldName = String(body.fieldName || "").trim();
    const status = String(body.status || "") as FieldRequestStatus;

    if (!email || !fieldName || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, message: "Липсва email, име на салонто или валиден статус." },
        { status: 400 },
      );
    }

    const template = fieldRequestDecisionEmail(status, fieldName);
    const result = await sendBeautyFlowEmail({
      to: email,
      subject: template.subject,
      text: template.body,
      html: template.html,
    });

    return NextResponse.json(result, { status: result.ok || result.skipped ? 200 : 500 });
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
