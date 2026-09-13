export function isValidName(value: string) {
  const nameRegex = /^[A-Za-zА-Яа-яЁё]+$/;
  return nameRegex.test(value.trim());
}

export function isValidPhone(value: string) {
  return /^[0-9]{10}$/.test(value.trim());
}

export function isValidAge(value: string) {
  const age = Number(value);
  return !!age && age >= 16 && age <= 60;
}

export function isValidParticipationType(value: string) {
  return value === "rental" || value === "own";
}