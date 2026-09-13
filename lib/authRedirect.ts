const PRODUCTION_SITE_URL = "https://www.beautyflow.bg";

function cleanUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function isLocalUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  } catch {
    return false;
  }
}

export function getAuthSiteUrl(candidate?: string | null) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (envUrl && !isLocalUrl(envUrl)) {
    return cleanUrl(envUrl);
  }

  if (candidate && !isLocalUrl(candidate)) {
    return cleanUrl(candidate);
  }

  return PRODUCTION_SITE_URL;
}

export function getResetPasswordRedirect(candidate?: string | null) {
  return `${getAuthSiteUrl(candidate)}/reset-password`;
}
