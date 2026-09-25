import { NextResponse } from "next/server";
import { requirePlatformOwner } from "@/lib/ownerAuth";
import { sendBeautyFlowEmail } from "@/lib/email/emailSender";
import { accessStatusEmail } from "@/lib/email/templates";

function addDaysIso(base: string | null | undefined, days: number) {
  const now = new Date();
  const current = base ? new Date(base) : now;
  const start = Number.isNaN(current.getTime()) || current < now ? now : current;
  start.setDate(start.getDate() + days);
  return start.toISOString();
}

export async function POST(req: Request) {
  const auth = await requirePlatformOwner(req);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  try {
    const body = await req.json();
    const requestId = String(body.id || "");
    const action = String(body.action || "");
    if (!requestId || !["suspend", "activate", "renew", "delete", "set-plan"].includes(action)) {
      return NextResponse.json({ message: "Невалидно действие." }, { status: 400 });
    }

    const { data: requestRow, error: reqErr } = await auth.admin
      .from("access_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (reqErr || !requestRow) return NextResponse.json({ message: "Заявката не е намерена." }, { status: 404 });

    const r = requestRow as any;
    const { data: salon } = await auth.admin
      .from("salons")
      .select("id,owner_id,name,active,subscription_status,subscription_ends_at,trial_ends_at")
      .eq("access_request_id", requestId)
      .maybeSingle();

    if (action === "set-plan") {
      const planId=String(body.planId||"");
      const plans:any={solo:{limit:1},studio:{limit:3},pro:{limit:7},premium:{limit:15}};
      if(!plans[planId]) return NextResponse.json({message:"Невалиден BeautyFlow план."},{status:400});
      if(!salon?.id) return NextResponse.json({message:"Към тази заявка още няма създаден бизнес."},{status:409});
      const {count}=await auth.admin.from("staff").select("id",{count:"exact",head:true}).eq("salon_id",salon.id).eq("active",true);
      if((count||0)>plans[planId].limit) return NextResponse.json({message:`Първо деактивирай специалисти. Този план позволява до ${plans[planId].limit}.`},{status:409});
      const {error}=await auth.admin.from("salons").update({plan_id:planId,staff_limit:plans[planId].limit}).eq("id",salon.id);
      if(error) throw error;
      return NextResponse.json({ok:true,message:"Планът е променен успешно."});
    }

    if (action === "delete") {
      if (salon?.id) {
        const { error: salonDeleteErr } = await auth.admin.from("salons").delete().eq("id", salon.id);
        if (salonDeleteErr) throw salonDeleteErr;
      }
      if (salon?.owner_id) {
        const { error: userDeleteErr } = await auth.admin.auth.admin.deleteUser(salon.owner_id);
        if (userDeleteErr) throw userDeleteErr;
      }
      const { error: requestDeleteErr } = await auth.admin.from("access_requests").delete().eq("id", requestId);
      if (requestDeleteErr) throw requestDeleteErr;
      return NextResponse.json({ ok: true, message: "Заявката и свързаният тестов бизнес са изтрити." });
    }

    if (!salon?.id) {
      return NextResponse.json({ message: "Към тази заявка още няма създаден бизнес." }, { status: 409 });
    }

    if (action === "suspend") {
      const { error } = await auth.admin.from("salons").update({ active: false, subscription_status: "suspended" }).eq("id", salon.id);
      if (error) throw error;
      await auth.admin.from("access_requests").update({ status: "suspended", reviewed_at: new Date().toISOString() }).eq("id", requestId);
      const mail = await sendBeautyFlowEmail({to:r.email,...accessStatusEmail({ownerName:r.owner_name||r.business_name,businessName:r.business_name,status:"suspend"})});
      return NextResponse.json({ ok: true, message: mail.ok ? "Достъпът е спрян и е изпратен email." : `Достъпът е спрян. Email грешка: ${mail.message}` });
    }

    if (action === "activate") {
      const { error } = await auth.admin.from("salons").update({ active: true, subscription_status: "active" }).eq("id", salon.id);
      if (error) throw error;
      await auth.admin.from("access_requests").update({ status: "active", reviewed_at: new Date().toISOString() }).eq("id", requestId);
      const mail = await sendBeautyFlowEmail({to:r.email,...accessStatusEmail({ownerName:r.owner_name||r.business_name,businessName:r.business_name,status:"activate"})});
      return NextResponse.json({ ok: true, message: mail.ok ? "Достъпът е активиран и е изпратен email." : `Достъпът е активиран. Email грешка: ${mail.message}` });
    }

    const nextEnd = addDaysIso(salon.subscription_ends_at || salon.trial_ends_at, 30);
    const { error } = await auth.admin
      .from("salons")
      .update({ active: true, subscription_status: "active", subscription_ends_at: nextEnd })
      .eq("id", salon.id);
    if (error) throw error;
    await auth.admin.from("access_requests").update({ status: "active", reviewed_at: new Date().toISOString() }).eq("id", requestId);
    const mail = await sendBeautyFlowEmail({to:r.email,...accessStatusEmail({ownerName:r.owner_name||r.business_name,businessName:r.business_name,status:"renew",until:new Date(nextEnd).toLocaleDateString("bg-BG")})});
    return NextResponse.json({ ok: true, subscriptionEndsAt: nextEnd, message: mail.ok ? "Подновено с +30 дни и е изпратен email." : `Подновено с +30 дни. Email грешка: ${mail.message}` });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Грешка при действието." }, { status: 500 });
  }
}
