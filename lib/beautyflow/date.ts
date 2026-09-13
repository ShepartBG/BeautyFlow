export function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateBG(value?: string | null) {
  if (!value) return "—";
  const raw = value.slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return value;
  return `${d}.${m}.${y}`;
}

export function partsFromIso(value?: string | null) {
  const fallback = isoToday();
  const raw = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
  const [year, month, day] = raw.split("-");
  return { year, month, day };
}

export function toIsoDate(year: string, month: string, day: string) {
  return `${year}-${month}-${day}`;
}
