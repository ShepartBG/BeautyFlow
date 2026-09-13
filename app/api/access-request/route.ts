import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBeautyFlowEmail } from "@/lib/email/emailSender";
import {requestReceivedEmail,newRequestOwnerEmail} from "@/lib/email/templates";

const clean = (v: unknown, n = 160) =>
  String(v || "").replace(/[<>]/g, "").trim().slice(0, n);

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const ownerName = clean(b.ownerName, 80);
    const email = clean(b.email, 120).toLowerCase();
    const phone = clean(b.phone, 10);
    const businessName = clean(b.businessName, 100);
    const category = clean(b.category, 30);
    const city = clean(b.city, 80);
    const message = clean(b.message, 500);
    const requestedPlan = ["solo","studio","pro","premium"].includes(clean(b.requestedPlan,20)) ? clean(b.requestedPlan,20) : "solo";
    const website = clean(b.website, 120);
    const mathAnswer = Number(b.mathAnswer);
    const mathA = Number(b.mathA);
    const mathB = Number(b.mathB);
    const formStartedAt = Number(b.formStartedAt);

    if (website) return NextResponse.json({ message: "Заявката не премина проверката." }, { status: 400 });
    const expected = mathA + mathB;
    const elapsed = Date.now() - formStartedAt;
    if (!Number.isFinite(mathAnswer) || !Number.isFinite(mathA) || !Number.isFinite(mathB) || mathA < 3 || mathA > 8 || mathB < 2 || mathB > 7 || mathAnswer !== expected) return NextResponse.json({ message: "Грешен отговор на проверката срещу автоматични заявки." }, { status: 400 });
    if (!Number.isFinite(elapsed) || elapsed < 1800 || elapsed > 60 * 60 * 1000) return NextResponse.json({ message: "Заявката не премина автоматичната проверка. Опитай отново." }, { status: 400 });

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
    const phoneOk = /^0\d{9}$/.test(phone);
    const personOk = /^[A-Za-zА-Яа-яЁёІіЇїЄє\s.\-']{2,80}$/.test(ownerName);
    const cityOk = /^[A-Za-zА-Яа-яЁёІіЇїЄє\s.\-]{2,80}$/.test(city);
    if (!emailOk) return NextResponse.json({message:"Въведи валиден имейл адрес, например name@example.com."},{status:400});
    if (!phoneOk) return NextResponse.json({message:"Телефонът трябва да е български номер от 10 цифри и да започва с 0."},{status:400});
    if (!personOk) return NextResponse.json({message:"Името трябва да съдържа букви."},{status:400});
    if (!cityOk) return NextResponse.json({message:"Градът трябва да съдържа букви."},{status:400});

    if (!ownerName || !email || !phone || !businessName || !category || !city) {
      return NextResponse.json(
        { message: "Попълни всички задължителни полета." },
        { status: 400 },
      );
    }

    const db = getSupabaseAdmin();
    const { error } = await db.from("access_requests").insert({
      owner_name: ownerName,
      email,
      phone,
      business_name: businessName,
      category,
      city,
      message,
      requested_plan: requestedPlan,
      status: "pending",
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Вече има активна заявка с този email." },
          { status: 409 },
        );
      }
      throw error;
    }

    const ownerEmail =
      process.env.BEAUTYFLOW_OWNER_EMAIL || "battlebooking@abv.bg";

    const requesterTemplate=requestReceivedEmail({ownerName,businessName});
    const requesterResult = await sendBeautyFlowEmail({to:email,...requesterTemplate});

    const ownerTemplate=newRequestOwnerEmail({ownerName,businessName,email,phone,city,category});
    const ownerResult = await sendBeautyFlowEmail({to:ownerEmail,...ownerTemplate});

    const bothSent = requesterResult.ok && ownerResult.ok;
    let resultMessage = "Заявката е изпратена успешно. Изпратихме потвърждение на email-а Ви.";
    if (!bothSent) {
      resultMessage = requesterResult.ok
        ? "Заявката е записана. Имейлът до BeautyFlow не можа да бъде изпратен, но заявката е получена."
        : "Заявката е записана, но потвърдителният имейл не можа да бъде изпратен. Провери въведения имейл адрес.";
    }

    return NextResponse.json({
      ok: true,
      emailSent: bothSent,
      requesterEmailSent: requesterResult.ok,
      ownerEmailSent: ownerResult.ok,
      message: resultMessage,
    });
  } catch (e) {
    return NextResponse.json(
      { message: "Възникна техническа грешка при заявката. Опитай отново след малко." },
      { status: 500 },
    );
  }
}
