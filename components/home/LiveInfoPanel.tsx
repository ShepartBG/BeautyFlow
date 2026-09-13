type Props = {
  totalPlayers: number;
  rentalPlayers: number;
  ownPlayers: number;
  freeRentalSets: number;
  location: string;
  ownPrice?: string;
  rentalPrice?: string;
  phone?: string;
};

export default function LiveInfoPanel({
  totalPlayers,
  rentalPlayers,
  ownPlayers,
  freeRentalSets,
  location,
  ownPrice = "10€",
  rentalPrice = "25€",
  phone,
}: Props) {
  return (
    <aside className="rounded-[2rem] border border-pink-400/20 bg-white/75 p-4 shadow-[0_0_35px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:sticky lg:top-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black  tracking-[0.28em] text-zinc-500">
            Battle Status
          </p>
          <h3 className="mt-1 text-2xl font-black text-zinc-900">Live Info</h3>
        </div>

        <span className="rounded-full border border-pink-400/30 bg-pink-400/10 px-3 py-1 text-xs font-black text-pink-300">
          ОТВОРЕНО
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 lg:grid-cols-2">
        <SmallStat label="Свободни" value={freeRentalSets} highlight />
        <SmallStat label="Записани" value={totalPlayers} />
        <SmallStat label="Под наем" value={rentalPlayers} />
        <SmallStat label="Собствено" value={ownPlayers} />
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-[10px] font-black  tracking-[0.22em] text-zinc-500">
          Такса
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm font-black">
          <div className="rounded-xl bg-white/50 p-3">
            {ownPrice}
            <span className="mt-1 block text-xs font-bold text-zinc-500">
              Собствено
            </span>
          </div>
          <div className="rounded-xl bg-white/50 p-3">
            {rentalPrice}
            <span className="mt-1 block text-xs font-bold text-zinc-500">
              Под наем
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-pink-400/20 bg-pink-400/10 p-4">
        <p className="text-xs text-zinc-500">Локация</p>
        <p className="mt-1 text-sm font-black text-pink-200">📍 {location}</p>
        {phone && <p className="mt-2 text-sm font-bold text-zinc-900">☎ {phone}</p>}
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-zinc-600">
        <p className="font-black text-zinc-900">Преди записване:</p>
        <p className="mt-2">1. Попълни данните.</p>
        <p>2. Прочети инструктажа.</p>
        <p>3. Приеми условията и запази кода.</p>
      </div>
    </aside>
  );
}

function SmallStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${highlight ? "text-pink-300" : "text-zinc-900"}`}>
        {value}
      </p>
    </div>
  );
}
