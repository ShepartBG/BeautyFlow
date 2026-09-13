export function isUrlLocation(value?: string | null) {
  const cleanValue = String(value || "").trim().toLowerCase();
  return (
    cleanValue.startsWith("http://") ||
    cleanValue.startsWith("https://") ||
    cleanValue.startsWith("www.") ||
    cleanValue.includes("maps.app.goo.gl") ||
    cleanValue.includes("google.com/maps")
  );
}

export function normalizeLocationUrl(value: string) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return "#";
  if (cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
    return cleanValue;
  }
  return `https://${cleanValue}`;
}

export function shortLocationLabel(value?: string | null) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return "Локация";
  if (!isUrlLocation(cleanValue)) return cleanValue;
  return "Отвори в Maps";
}
