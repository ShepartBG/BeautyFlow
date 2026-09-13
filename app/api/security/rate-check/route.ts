import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, RateLimitAction } from "@/lib/security";

const allowedActions: RateLimitAction[] = ["login_failed", "password_reset"];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const action = body?.action as RateLimitAction;
  if (!allowedActions.includes(action)) return NextResponse.json({ error: "Невалидно ограничение." }, { status: 400 });
  const result = await checkRateLimit(action, getClientIp(request));
  if (!result.allowed) return NextResponse.json({ allowed: false, error: "Твърде много опити. Опитай пак по-късно." }, { status: 429 });
  return NextResponse.json({ allowed: true });
}
