export const BEAUTY_CATEGORIES = [
  { value: "barber", label: "Барбър" },
  { value: "hair", label: "Фризьорски салон" },
  { value: "nails", label: "Маникюр" },
  { value: "lashes", label: "Мигли" },
  { value: "makeup", label: "Грим" },
  { value: "massage", label: "Масажи" },
  { value: "cosmetics", label: "Козметика" },
  { value: "tattoo", label: "Татуировки" },
  { value: "other", label: "Друго" },
] as const;
export function categoryLabel(value?: string | null) {
  return BEAUTY_CATEGORIES.find(x => x.value === value)?.label || "Красота и грижа";
}
