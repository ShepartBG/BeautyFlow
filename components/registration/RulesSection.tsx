type RulesSectionProps = {
  rulesRead: boolean;
  acceptedRules: boolean;
  acceptedPrivacy: boolean;
  onOpenRules: () => void;
  onAcceptedRulesChange: (value: boolean) => void;
  onAcceptedPrivacyChange: (value: boolean) => void;
};

export default function RulesSection({
  rulesRead,
  acceptedRules,
  acceptedPrivacy,
  onOpenRules,
  onAcceptedRulesChange,
  onAcceptedPrivacyChange,
}: RulesSectionProps) {
  return (
    <div className="rounded-2xl border border-pink-400/25 bg-pink-400/10 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pink-400/20 text-base">
          📄
        </div>

        <div className="flex-1">
          <p className="font-black text-pink-300">Задължителен инструктаж</p>
          <p className="mt-0.5 text-xs leading-5 text-zinc-500">
            Отвори правилата, после чекни приемането.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenRules}
        className="mt-3 w-full rounded-2xl bg-pink-500 p-3 font-black text-black transition hover:bg-pink-400"
      >
        {rulesRead ? "ИНСТРУКТАЖЪТ Е ПРОЧЕТЕН ✅" : "ПРОЧЕТИ ИНСТРУКТАЖА"}
      </button>

      <div className="mt-3 space-y-3">
        <label className="flex items-start gap-3 text-sm text-zinc-600">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-lime-500"
            disabled={!rulesRead}
            checked={acceptedRules}
            onChange={(e) => onAcceptedRulesChange(e.target.checked)}
          />

          <span>
            Прочетох и приемам инструктажа за безопасност.
            {!rulesRead && (
              <span className="block text-xs text-zinc-500">
                Полето се отключва след отваряне на инструктажа.
              </span>
            )}
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-zinc-600">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-lime-500"
            checked={acceptedPrivacy}
            onChange={(e) => onAcceptedPrivacyChange(e.target.checked)}
          />

          <span>
            Съгласен съм личните ми данни да бъдат обработвани за записване за тази час.
            <span className="mt-1 block text-xs text-zinc-500">
              Данните се обработват съгласно <a className="text-pink-300 underline" href="/privacy" target="_blank">Политиката за поверителност</a>, а използването на платформата е съгласно <a className="text-pink-300 underline" href="/terms" target="_blank">Общите условия</a>.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
