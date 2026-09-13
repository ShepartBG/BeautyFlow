import { RegistrationErrors } from "@/utils/validators";

type Props = {
  freeRentalSets: number;
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

export default function ParticipationSelect({ freeRentalSets, errors }: Props) {
  return (
    <div>
      <select
        defaultValue=""
        name="participation_type"
        className={`w-full rounded-2xl border ${
          errors.participation_type ? "border-red-500" : "border-white/10"
        } bg-white/80 p-3.5 text-zinc-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-lime-400/20`}
        required
      >
        <option value="">Избери участие</option>
        {freeRentalSets > 0 && <option value="rental">Под наем</option>}
        <option value="own">Собствено оборудване</option>
      </select>
      <ErrorMessage message={errors.participation_type} />
    </div>
  );
}
