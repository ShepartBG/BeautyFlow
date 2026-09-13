import type { Appointment, BeautyService, BookingSettings, TimeOff, WorkingDay } from "./types";

function toMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function toClock(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

export function getAvailableSlots(args: {
  date: string;
  service: BeautyService;
  workingHours: WorkingDay[];
  appointments: Appointment[];
  timeOff: TimeOff[];
  settings: BookingSettings;
  now?: Date;
}) {
  const { date, service, workingHours, appointments, timeOff, settings } = args;
  const dateObj = new Date(`${date}T12:00:00`);
  const weekday = dateObj.getDay();
  const dayConfig = workingHours.find((d) => d.day === weekday);
  if (!dayConfig?.enabled) return [];

  const allDayOff = timeOff.some((t) => t.date === date && t.allDay);
  if (allDayOff) return [];

  const start = toMinutes(dayConfig.start);
  const end = toMinutes(dayConfig.end);
  const occupied = appointments
    .filter((a) => a.date === date && a.status !== "cancelled")
    .map((a) => [toMinutes(a.start), toMinutes(a.end)] as const);

  const partialOff = timeOff
    .filter((t) => t.date === date && !t.allDay && t.start && t.end)
    .map((t) => [toMinutes(t.start!), toMinutes(t.end!)] as const);

  const result: string[] = [];
  const blockLength = service.durationMin + service.bufferMin;
  const now = args.now ?? new Date();
  const noticeCutoff = now.getTime() + settings.minNoticeHours * 60 * 60 * 1000;
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + settings.maxAdvanceDays);
  if (dateObj.getTime() > maxDate.getTime()) return [];

  for (let candidate = start; candidate + blockLength <= end; candidate += settings.slotStepMin) {
    const candidateEnd = candidate + blockLength;
    const conflict = occupied.some(([s, e]) => overlaps(candidate, candidateEnd, s, e));
    const blocked = partialOff.some(([s, e]) => overlaps(candidate, candidateEnd, s, e));
    if (conflict || blocked) continue;

    const candidateDate = new Date(`${date}T${toClock(candidate)}:00`);
    if (candidateDate.getTime() < noticeCutoff) continue;
    result.push(toClock(candidate));
  }

  return result;
}

export function appointmentEnd(start: string, service: BeautyService) {
  return toClock(toMinutes(start) + service.durationMin + service.bufferMin);
}
