export function optimizedDesignBackground(url?: string | null): string {
  if (!url || url === "/brand/beautyflow-background.png") return "/brand/beautyflow-background.webp";
  return url;
}
