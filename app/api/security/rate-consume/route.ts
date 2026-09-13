import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, getClientIp, RateLimitAction } from "@/lib/security";

const allowedActions: RateLimitAction[] = ["login_failed", "password_reset"];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const action = body?.action as RateLimitAction;
  if (!allowedActions.includes(action)) return NextResponse.json({ error: "Невалидно ограничение." }, { status: 400 });
  await consumeRateLimit(action, getClientIp(request));
  return NextResponse.json({ ok: true });
}
