export const BEAUTY_SPECIALTIES = [
  "Барбър",
  "Фризьорски салон",
  "Маникюр",
  "Миглопластика",
  "Грим",
  "Масажи",
  "Козметика",
  "Татуировки",
  "Друго",
] as const;

export type BeautySpecialty = (typeof BEAUTY_SPECIALTIES)[number];

export function isBeautySpecialty(value: unknown): value is BeautySpecialty {
  return BEAUTY_SPECIALTIES.includes(String(value || "") as BeautySpecialty);
}

// Public job title: free text, bounded to the same limit as the profile input.
export function isValidSpecialtyTitle(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 90 && !/[\u0000-\u001f\u007f]/.test(value);
}
