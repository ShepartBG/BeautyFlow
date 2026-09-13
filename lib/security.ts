import type { NextRequest } from "next/server";

export type RateLimitAction = "login_failed" | "password_reset";

export function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function checkRateLimit(_action: RateLimitAction, _ip: string) {
  return { allowed: true };
}

export async function consumeRateLimit(_action: RateLimitAction, _ip: string) {
  return { allowed: true };
}
