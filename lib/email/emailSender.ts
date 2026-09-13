export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type SendEmailResult = {
  ok: boolean;
  skipped?: boolean;
  message: string;
  id?: string;
  status?: number;
  payload?: unknown;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "BeautyFlow <noreply@battlebooking.bg>";
const DEFAULT_REPLY_TO = "battlebooking@abv.bg";

export async function sendBeautyFlowEmail({
  to,
  subject,
  text,
  html,
}: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      message:
        "RESEND_API_KEY липсва. Email-ът не е изпратен, но заявката/статусът са запазени.",
    };
  }

  const from = process.env.RESEND_FROM_EMAIL || process.env.BEAUTYFLOW_EMAIL_FROM || DEFAULT_FROM;
  const replyTo = process.env.BEAUTYFLOW_EMAIL_REPLY_TO || process.env.BEAUTYFLOW_OWNER_EMAIL || DEFAULT_REPLY_TO;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
      reply_to: replyTo,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload,
      message:
        payload?.message ||
        payload?.error ||
        `Resend върна грешка: ${response.status}`,
    };
  }

  return {
    ok: true,
    status: response.status,
    payload,
    message: "Email-ът е изпратен успешно.",
    id: payload?.id,
  };
}
