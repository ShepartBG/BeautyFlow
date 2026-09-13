type Props = {
  rulesText?: string | null;
  onConfirm: () => void;
};

export default function RulesModal({ rulesText, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-700 bg-zinc-900 p-5 shadow-[0_0_55px_rgba(0,0,0,0.65)]">
        <h2 className="mb-4 text-2xl font-black text-pink-400">
          Инструктаж, правила и декларация
        </h2>

        <div className="bf-scrollbar h-[58vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-zinc-700 bg-white p-4 text-sm leading-6 text-zinc-200">
          {rulesText ||
            "Няма въведени правила за тази час. Свържете се с собственика."}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="mt-4 w-full rounded-2xl bg-pink-500 p-4 font-black text-black hover:bg-pink-400"
        >
          Разбрах и продължавам
        </button>
      </div>
    </div>
  );
}
