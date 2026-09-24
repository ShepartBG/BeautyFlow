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
