type Props = {
  loading: boolean;
  disabled?: boolean;
};

export default function SubmitButton({ loading, disabled }: Props) {
  return (
    <button
      disabled={loading || disabled}
      className="w-full rounded-2xl bg-pink-500 p-4 text-lg font-black text-black shadow-[0_0_30px_rgba(132,204,22,0.22)] transition hover:bg-pink-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:shadow-none"
    >
      {loading ? "Записване..." : "ЗАПИШИ СЕ"}
    </button>
  );
}
