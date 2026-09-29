import { persistentDesignUrl } from "@/lib/beautyflow/designMedia";
export function optimizedDesignBackground(url?: string | null): string {
  const persistent = persistentDesignUrl(url);
  if (!persistent || persistent === "/brand/beautyflow-background.png") return "/brand/beautyflow-background.webp";
  return persistent;
}
