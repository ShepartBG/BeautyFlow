// Blob URLs exist only in the tab that created them. They cannot be saved as
// permanent platform assets or reused by another visitor/browser.
export function persistentDesignUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const url = value.trim();
  return ((url.startsWith("/") && !url.startsWith("//")) || /^https?:\/\//i.test(url)) ? url : undefined;
}

export function sanitizeDesignFrames<T extends { media_url?: string }>(frames: Record<string, T[]> | null | undefined): Record<string, T[]> {
  if (!frames || typeof frames !== "object") return {};
  return Object.fromEntries(Object.entries(frames).map(([page, list]) => [page,
    Array.isArray(list) ? list.map(frame => ({ ...frame, media_url: persistentDesignUrl(frame.media_url) })) : [],
  ]));
}
