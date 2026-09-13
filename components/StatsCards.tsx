type Props = {
  totalPlayers: number;
  rentalPlayers: number;
  ownPlayers: number;
  freeRentalSets: number;
};

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/80 p-4 text-center backdrop-blur-xl">
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 text-4xl font-black tracking-tight text-zinc-900">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-black  tracking-[0.2em] text-zinc-500">
        {label}
      </div>
    </div>
  );
}

export default function StatsCards({
  totalPlayers,
  rentalPlayers,
  ownPlayers,
  freeRentalSets,
}: Props) {
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard icon="👥" value={totalPlayers} label="Общо" />
      <StatCard icon="🎒" value={rentalPlayers} label="Под наем" />
      <StatCard icon="🔫" value={ownPlayers} label="Собствено" />
      <StatCard icon="✅" value={freeRentalSets} label="Свободни" />
    </section>
  );
}
