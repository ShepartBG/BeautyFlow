"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import RegistrationFields from "./RegistrationFields";
import ParticipationSelect from "./ParticipationSelect";
import RulesSection from "./RulesSection";
import SubmitButton from "./SubmitButton";
import {
  RegistrationErrors,
  validateRegistrationForm,
  hasRegistrationErrors,
} from "@/utils/validators";

type Props = {
  loading: boolean;
  freeRentalSets: number;
  rulesRead: boolean;
  acceptedRules: boolean;
  acceptedPrivacy: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onOpenRules: () => void;
  onAcceptedRulesChange: (value: boolean) => void;
  onAcceptedPrivacyChange: (value: boolean) => void;
};

export default function RegistrationForm({
  loading,
  freeRentalSets,
  rulesRead,
  acceptedRules,
  acceptedPrivacy,
  onSubmit,
  onOpenRules,
  onAcceptedRulesChange,
  onAcceptedPrivacyChange,
}: Props) {
  const [errors, setErrors] = useState<RegistrationErrors>({});

  function handleLocalSubmit(e: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const validationErrors = validateRegistrationForm(formData);

    setErrors(validationErrors);

    if (hasRegistrationErrors(validationErrors)) {
      e.preventDefault();
      return;
    }

    onSubmit(e);
  }

  return (
    <Card className="space-y-3 p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black  tracking-[0.28em] text-pink-300">
            Registration
          </p>
          <h2 className="mt-1 text-3xl font-black tracking-tight">
            Запиши се
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Попълни данните, прочети инструктажа и запази кода.
          </p>
          <p className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-xs font-bold leading-5 text-yellow-100">
            ⚠️ Важно: При невалиден телефонен номер регистрацията няма да се счита за запазена. Собственикът може да използва телефона за потвърждение при нужда.
          </p>
        </div>

        <div className="hidden rounded-2xl border border-pink-400/20 bg-pink-400/10 px-4 py-3 text-center sm:block">
          <p className="text-[10px] font-black  tracking-[0.2em] text-zinc-500">
            Свободни
          </p>
          <p className="text-3xl font-black text-pink-300">{freeRentalSets}</p>
        </div>
      </div>

      <form noValidate onSubmit={handleLocalSubmit} className="space-y-3">
        <RegistrationFields errors={errors} />
        <ParticipationSelect freeRentalSets={freeRentalSets} errors={errors} />
        <RulesSection
          rulesRead={rulesRead}
          acceptedRules={acceptedRules}
          acceptedPrivacy={acceptedPrivacy}
          onOpenRules={onOpenRules}
          onAcceptedRulesChange={onAcceptedRulesChange}
          onAcceptedPrivacyChange={onAcceptedPrivacyChange}
        />
        <SubmitButton
          loading={loading}
          disabled={!rulesRead || !acceptedRules || !acceptedPrivacy}
        />
      </form>
    </Card>
  );
}
