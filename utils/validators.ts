export type RegistrationErrors = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  age?: string;
  participation_type?: string;
};

const NAME_RE = /^[A-Za-zА-Яа-яЁёІіЇїЄєЪъЬь\s'-]{2,40}$/;

export function validateRegistrationForm(formData: FormData): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const phone = String(formData.get("phone") || "").replace(/\D/g, "");
  const age = Number(formData.get("age"));
  const participationType = String(formData.get("participation_type") || "");

  if (!NAME_RE.test(firstName)) errors.first_name = "Името трябва да съдържа само букви и да е поне 2 символа.";
  if (!NAME_RE.test(lastName)) errors.last_name = "Фамилията трябва да съдържа само букви и да е поне 2 символа.";
  if (!/^\d{10}$/.test(phone)) errors.phone = "Телефонът трябва да бъде точно 10 цифри.";
  if (!Number.isInteger(age) || age < 16 || age > 99) errors.age = "Възрастта трябва да бъде число между 16 и 99.";
  if (!["rental", "own"].includes(participationType)) errors.participation_type = "Избери тип участие.";

  return errors;
}

export function hasRegistrationErrors(errors: RegistrationErrors) {
  return Object.values(errors).some(Boolean);
}
