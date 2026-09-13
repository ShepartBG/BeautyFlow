import Input from "@/components/ui/Input";
import { RegistrationErrors } from "@/utils/validators";

type Props = {
  errors: RegistrationErrors;
};

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      ⚠️ {message}
    </p>
  );
}

export default function RegistrationFields({ errors }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Input
          name="first_name"
          error={!!errors.first_name}
          placeholder="Име / First name"
          required
          onInput={(e) => {
            e.currentTarget.value = e.currentTarget.value.replace(
              /[^A-Za-zА-Яа-яЁё]/g,
              ""
            );
          }}
        />
        <ErrorMessage message={errors.first_name} />
      </div>

      <div>
        <Input
          name="last_name"
          error={!!errors.last_name}
          placeholder="Фамилия / Last name"
          required
          onInput={(e) => {
            e.currentTarget.value = e.currentTarget.value.replace(
              /[^A-Za-zА-Яа-яЁё]/g,
              ""
            );
          }}
        />
        <ErrorMessage message={errors.last_name} />
      </div>

      <div>
        <Input
          name="phone"
          error={!!errors.phone}
          placeholder="Телефон / Phone"
          inputMode="numeric"
          required
          onInput={(e) => {
            e.currentTarget.value = e.currentTarget.value
              .replace(/\D/g, "")
              .slice(0, 10);
          }}
        />
        <ErrorMessage message={errors.phone} />
      </div>

      <div>
        <Input
          name="age"
          error={!!errors.age}
          placeholder="Възраст / Age"
          type="number"
          min="16"
          max="60"
          required
        />
        <ErrorMessage message={errors.age} />
      </div>
    </div>
  );
}