import { formatBgDate } from "@/lib/subscription";
import type { FieldRequestStatus } from "@/lib/fieldRequests";

export type EmailTemplate = {
  subject: string;
  body: string;
  html: string;
};

export type FieldRequestOwnerDetails = {
  fieldName: string;
  ownerName: string;
  city: string;
  phone: string;
  email: string;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  message?: string | null;
};

type ApprovalDetails = {
  loginUrl?: string;
  resetUrl?: string | null;
  subscriptionValidUntil?: string | null;
  graceUntil?: string | null;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://beautyflow.bg";
const CONTACT_EMAIL = "beautyflow@abv.bg";
const CONTACT_PHONE = "0897 047 668";
const BRAND_GREEN = "#95c900";
const BRAND_GREEN_LIGHT = "#ec4899";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function footerText() {
  return `Ако имате въпроси или се нуждаете от съдействие, можете да се свържете с нас:
Email: ${CONTACT_EMAIL}
Телефон: ${CONTACT_PHONE}
Сайт: ${SITE_URL}

Поздрави,
Екипът на BeautyFlow
Your Battle. Our Mission.`;
}

function buildText(mainBody: string) {
  return `${mainBody.trim()}

${footerText()}`;
}

function buildEmailHtml({
  title,
  intro,
  body,
  ctaLabel,
  ctaUrl,
}: {
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const paragraphs = body
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        `<p style="margin:0 0 14px;color:#d4d4d8;font-size:15px;line-height:1.7;">${escapeHtml(line)}</p>`,
    )
    .join("");

  const cta = ctaLabel && ctaUrl
    ? `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;margin:12px 0 20px;background:${BRAND_GREEN};color:#050505;text-decoration:none;font-weight:900;padding:14px 18px;border-radius:16px;">${escapeHtml(ctaLabel)}</a>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#050505;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border:1px solid rgba(149,201,0,.28);border-radius:28px;overflow:hidden;background:#0b0b0b;">
          <tr><td style="padding:28px;background:linear-gradient(135deg,rgba(149,201,0,.2),rgba(0,0,0,0));">
            <p style="margin:0;color:${BRAND_GREEN_LIGHT};font-size:12px;font-weight:900;letter-spacing:.22em;text-transform:;">BeautyFlow</p>
            <h1 style="margin:10px 0 0;font-size:32px;line-height:1.05;color:#ffffff;">${escapeHtml(title)}</h1>
            <p style="margin:14px 0 0;color:#d4d4d8;font-size:16px;line-height:1.6;">${escapeHtml(intro)}</p>
          </td></tr>
          <tr><td style="padding:28px;">
            ${paragraphs}
            ${cta}
            <div style="margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,.12);">
              <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.7;">Ако имате въпроси или се нуждаете от съдействие, можете да се свържете с нас:<br><strong style="color:#ffffff;">Email:</strong> ${escapeHtml(CONTACT_EMAIL)}<br><strong style="color:#ffffff;">Телефон:</strong> ${escapeHtml(CONTACT_PHONE)}<br><strong style="color:#ffffff;">Сайт:</strong> ${escapeHtml(SITE_URL)}</p>
              <p style="margin:16px 0 0;color:#a1a1aa;font-size:13px;line-height:1.6;">Поздрави,<br><strong style="color:#ffffff;">Екипът на BeautyFlow</strong><br><span style="color:${BRAND_GREEN_LIGHT};font-weight:700;">Your Battle. Our Mission.</span></p>
              <p style="margin:14px 0 0;color:#71717a;font-size:12px;line-height:1.6;">Този email е изпратен автоматично от BeautyFlow.</p>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function fieldRequestReceivedEmail(fieldName: string): EmailTemplate {
  const safeName = fieldName || "Вашето салон";
  const mainBody = `Здравейте,

Благодарим Ви, че заявихте достъп до BeautyFlow за ${safeName}.

Получихме Вашата заявка и нашият екип ще я разгледа възможно най-скоро.

След одобрение получавате 1 месец безплатен тестов достъп, за да проверите дали BeautyFlow е удобен за Вашето салон.`;

  return {
    subject: "Получихме заявката Ви за BeautyFlow ✅",
    body: buildText(mainBody),
    html: buildEmailHtml({
      title: "Получихме заявката Ви",
      intro: `Заявката за ${safeName} е приета за преглед.`,
      body: mainBody,
    }),
  };
}

export function fieldRequestOwnerNotificationEmail(details: FieldRequestOwnerDetails): EmailTemplate {
  const adminUrl = `${SITE_URL.replace(/\/$/, "")}/admin/requests`;
  const rows = [
    `Салон: ${details.fieldName}`,
    `Собственик: ${details.ownerName}`,
    `Локация: ${details.city}`,
    `Телефон: ${details.phone}`,
    `Email: ${details.email}`,
    details.website ? `Website: ${details.website}` : "",
    details.facebook ? `Facebook: ${details.facebook}` : "",
    details.instagram ? `Instagram: ${details.instagram}` : "",
    details.tiktok ? `TikTok: ${details.tiktok}` : "",
    details.message ? `Описание: ${details.message}` : "Описание: няма",
  ].filter(Boolean);

  const mainBody = `Нова заявка за достъп до BeautyFlow.

${rows.join("\n")}

Можеш да я прегледаш от Owner панела:
${adminUrl}`;

  return {
    subject: `Нова заявка за достъп: ${details.fieldName}`,
    body: buildText(mainBody),
    html: buildEmailHtml({
      title: "Нова заявка за достъп",
      intro: `${details.fieldName} изпрати заявка към BeautyFlow.`,
      body: mainBody,
      ctaLabel: "Отвори заявките",
      ctaUrl: adminUrl,
    }),
  };
}

export function fieldRequestDecisionEmail(
  status: FieldRequestStatus,
  fieldName: string,
  approval?: ApprovalDetails,
): EmailTemplate {
  const safeName = fieldName || "Вашето салон";
  const loginUrl = approval?.loginUrl || `${SITE_URL.replace(/\/$/, "")}/login`;

  if (status === "active") {
    const resetLine = approval?.resetUrl
      ? `За да зададете парола, отворете този линк: ${approval.resetUrl}`
      : `Можете да влезете от: ${loginUrl}`;

    const mainBody = `Здравейте,

Поздравления! Вашата заявка за достъп до BeautyFlow за ${safeName} беше одобрена.

Активиран е 1 месец безплатен тестов достъп.

Валидност на тестовия достъп: до ${formatBgDate(approval?.subscriptionValidUntil)}.

След тази дата имате 7 дни гратисен срок за подновяване на плащането: до ${formatBgDate(approval?.graceUntil)}.

${resetLine}

Очакваме с нетърпение да работим заедно.`;

    return {
      subject: "Вашият BeautyFlow акаунт е одобрен ✅",
      body: buildText(mainBody),
      html: buildEmailHtml({
        title: "Акаунтът Ви е одобрен",
        intro: `${safeName} вече има активиран BeautyFlow достъп.`,
        body: mainBody,
        ctaLabel: approval?.resetUrl ? "Задай парола" : "Вход в BeautyFlow",
        ctaUrl: approval?.resetUrl || loginUrl,
      }),
    };
  }

  if (status === "payment_pending") {
    const mainBody = `Здравейте,

Вашата заявка за ${safeName} е прегледана успешно и преминава към следваща стъпка.

Към момента очакваме финално потвърждение и активиране на достъпа.`;

    return {
      subject: "Заявката Ви за BeautyFlow преминава към следваща стъпка",
      body: buildText(mainBody),
      html: buildEmailHtml({ title: "Заявката преминава към следваща стъпка", intro: `${safeName} е прегледано от екипа на BeautyFlow.`, body: mainBody }),
    };
  }

  if (status === "rejected") {
    const mainBody = `Здравейте,

Благодарим Ви, че проявихте интерес към BeautyFlow.

След преглед на подадената информация за ${safeName}, на този етап не можем да активираме достъп за Вашето салон.

При промяна на обстоятелствата или при допълнителна информация, винаги можете да се свържете с нас.`;

    return {
      subject: "Отговор относно заявката Ви за BeautyFlow",
      body: buildText(mainBody),
      html: buildEmailHtml({ title: "Отговор относно заявката Ви", intro: `Прегледахме заявката за ${safeName}.`, body: mainBody }),
    };
  }

  if (status === "suspended") {
    const mainBody = `Здравейте,

Достъпът до BeautyFlow за ${safeName} е временно спрян.

За повече информация и съдействие можете да се свържете с нашия екип.`;

    return {
      subject: "BeautyFlow: достъпът е временно спрян",
      body: buildText(mainBody),
      html: buildEmailHtml({ title: "Достъпът е временно спрян", intro: `Достъпът за ${safeName} е временно спрян.`, body: mainBody }),
    };
  }

  return fieldRequestReceivedEmail(safeName);
}
