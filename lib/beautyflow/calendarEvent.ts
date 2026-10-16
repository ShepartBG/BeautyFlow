// Calendar export for a booked appointment: a valid iCalendar file (Apple/Outlook/Android)
// and a Google Calendar link. Appointment times are Europe/Sofia wall-clock times.

export type CalendarEvent = {
  uid: string;
  date: string; // YYYY-MM-DD (Sofia)
  time: string; // HH:MM (Sofia)
  minutes: number;
  title: string;
  description?: string;
  location?: string;
  url?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Converts a Europe/Sofia wall-clock time to a UTC Date (handles summer/winter time). */
export function sofiaToUtc(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(new Date(guess)).map((p) => [p.type, p.value]),
  );
  const asSofia = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
  return new Date(guess - (asSofia - guess));
}

const utcStamp = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** RFC 5545 lines are limited to 75 octets; continuation lines start with a space. */
function fold(line: string) {
  const bytes = new TextEncoder();
  if (bytes.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (bytes.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ch; } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function eventTimes(e: CalendarEvent) {
  const start = sofiaToUtc(e.date, e.time);
  const end = new Date(start.getTime() + Math.max(15, e.minutes || 60) * 60_000);
  return { start, end };
}

export function buildIcs(e: CalendarEvent) {
  const { start, end } = eventTimes(e);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BeautyFlow//Booking//BG",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@beautyflow.bg`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    e.location ? `LOCATION:${esc(e.location)}` : "",
    e.url ? `URL:${e.url}` : "",
    "STATUS:CONFIRMED",
    // Reminders: the day before and two hours before.
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`Утре: ${e.title}`)}`, "TRIGGER:-P1D", "END:VALARM",
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`След 2 часа: ${e.title}`)}`, "TRIGGER:-PT2H", "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(e: CalendarEvent) {
  const { start, end } = eventTimes(e);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${utcStamp(start)}/${utcStamp(end)}`,
    details: [e.description, e.url].filter(Boolean).join("\n"),
    location: e.location || "",
    ctz: "Europe/Sofia",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
