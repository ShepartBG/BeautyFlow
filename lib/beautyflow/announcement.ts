// Temporary salon announcement shown on the public profile and in the salon list.
export type AnnouncementType = "info" | "prices" | "closed" | "promo";
export type SalonAnnouncement = { type: AnnouncementType; text: string; until: string | null };

export const ANNOUNCEMENT_TYPES: { value: AnnouncementType; label: string; icon: string }[] = [
  { value: "info", label: "Информация", icon: "ℹ️" },
  { value: "prices", label: "Промяна в цените", icon: "💶" },
  { value: "closed", label: "Почивка / затворено", icon: "🌙" },
  { value: "promo", label: "Промоция", icon: "✨" },
];
export const ANNOUNCEMENT_MAX = 280;

export const announcementMeta = (type: string) => ANNOUNCEMENT_TYPES.find((t) => t.value === type) || ANNOUNCEMENT_TYPES[0];

export function sofiaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Returns the announcement if it has text and has not expired (the "until" day is still shown). */
export function activeAnnouncement(row: { announcement_text?: string | null; announcement_type?: string | null; announcement_until?: string | null } | null | undefined, today = sofiaToday()): SalonAnnouncement | null {
  const text = String(row?.announcement_text || "").trim();
  if (!text) return null;
  const until = row?.announcement_until ? String(row.announcement_until).slice(0, 10) : null;
  if (until && until < today) return null;
  return { type: announcementMeta(String(row?.announcement_type || "info")).value, text, until };
}
