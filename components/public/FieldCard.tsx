import Link from "next/link";
import FieldLogoFrame from "@/components/brand/FieldLogoFrame";

const DEFAULT_LOGO = "/beautyflow-real-logo-transparent.png";

type Props = {
  name: string;
  location: string;
  description: string;
  href: string;
  status?: string;
  image?: string;
  logo?: string;
  logoFit?: "contain" | "cover";
  logoScale?: number;
  logoX?: number;
  logoY?: number;
};

export default function FieldCard({
  name,
  location,
  description,
  href,
  status = "Активно",
  image = "",
  logo = DEFAULT_LOGO,
  logoFit = "contain",
  logoScale = 1,
  logoX = 0,
  logoY = 0,
}: Props) {
  const hasCustomImage = Boolean(
    image && !image.includes("beautyflow-bg") && !image.includes("beautyflow-bg"),
  );

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/75 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#95c900]/45 hover:shadow-[0_0_55px_rgba(149,201,0,0.14)]">
      <div
        className="relative h-28 bg-[radial-gradient(circle_at_top,rgba(149,201,0,0.16),transparent_48%),rgba(255,255,255,0.03)] sm:h-32"
        style={
          hasCustomImage
            ? { backgroundImage: `linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.74)), url('${image}')` }
            : undefined
        }
      >
        <div className="absolute left-4 top-4 rounded-full border border-[#95c900]/35 bg-white/75 px-3 py-1 text-xs font-black  tracking-[0.12em] text-[#ec4899] backdrop-blur-md">
          {status}
        </div>
      </div>

      <div className="relative p-5 pt-0">
        <div className="-mt-12 flex justify-center">
          <div className="rounded-full border border-[#95c900]/30 bg-white/80 p-1 shadow-[0_0_35px_rgba(0,0,0,.6)]">
            <FieldLogoFrame
              src={logo}
              alt={name}
              size="lg"
              fit={logoFit}
              scale={logoScale}
              x={logoX}
              y={logoY}
            />
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs font-black  tracking-[0.22em] text-[#ec4899]/80">
            Салон
          </p>
          <h3 className="mx-auto mt-2 max-w-[18rem] text-2xl font-black leading-tight text-zinc-900">
            {name}
          </h3>
        </div>

        <p className="mt-5 text-sm font-bold text-[#c5df68]">📍 {location}</p>
        <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-500">
          {description}
        </p>

        <Link
          href={href}
          prefetch
          className="mt-5 block rounded-2xl border border-[#95c900]/30 bg-[#95c900]/10 px-4 py-3 text-center font-black text-[#ec4899] transition hover:bg-[#95c900] hover:text-black"
        >
          Виж салонто
        </Link>
      </div>
    </article>
  );
}
