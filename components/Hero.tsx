import FieldLogoFrame from "@/components/brand/FieldLogoFrame";
import { isUrlLocation, normalizeLocationUrl, shortLocationLabel } from "@/utils/location";

type HeroProps = {
  title: string;
  date: string;
  time: string;
  location: string;
  description?: string | null;
  fieldName?: string;
  fieldLogo?: string;
  backgroundUrl?: string;
  phone?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  logoFit?: "contain" | "cover";
  logoScale?: number;
  logoX?: number;
  logoY?: number;
};

export default function Hero({
  title,
  date,
  time,
  location,
  description,
  fieldName = "Beauty Field BeautyFlow",
  fieldLogo = "/beautyflow-logo.png",
  backgroundUrl = "/beautyflow-bg.jpg",
  phone = "",
  facebook = "",
  instagram = "",
  tiktok = "",
  logoFit = "contain",
  logoScale = 1,
  logoX = 0,
  logoY = 0,
}: HeroProps) {
  const hasSocials = Boolean(facebook || instagram || tiktok || phone);

  return (
    <section className="group relative overflow-hidden rounded-[1.75rem] border border-pink-400/20 bg-white/75 p-4 sm:rounded-[2.4rem] shadow-[0_0_60px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-6">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-55 transition duration-700 group-hover:scale-[1.02]"
        style={{ backgroundImage: `url('${backgroundUrl}')` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_26%,rgba(132,204,22,0.22),transparent_32%),linear-gradient(115deg,rgba(0,0,0,0.92),rgba(0,0,0,0.64),rgba(0,0,0,0.88))]" />
      <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-pink-400/10 blur-3xl transition duration-700 group-hover:bg-pink-400/16" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-lime-400/50 to-transparent" />

      <div className="relative z-10 grid gap-4 md:grid-cols-[0.38fr_1.62fr] md:items-center">
        <div className="flex items-center justify-center md:justify-start">
          <FieldLogoFrame src={fieldLogo} alt={fieldName} size="lg" fit={logoFit} scale={logoScale} x={logoX} y={logoY} />
        </div>

        <div className="text-center md:text-left">
          <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-pink-400/25 bg-pink-400/10 px-4 py-1 text-[10px] font-black  tracking-[0.28em] text-pink-300 md:mx-0">
            <span className="h-2 w-2 rounded-full bg-pink-400 shadow-[0_0_12px_rgba(132,204,22,0.8)]" />
            BeautyFlow Premium
          </div>

          <p className="text-[9px] font-black  tracking-[0.30em] sm:text-[10px] sm:tracking-[0.42em] text-zinc-500">
            {fieldName}
          </p>

          <h1 className="mt-2 text-[2.15rem] font-black  leading-[0.92] tracking-tight text-zinc-900 sm:text-4xl md:text-5xl">
            {title}
          </h1>

          {description?.trim() && (
            <div className="mt-4 max-w-2xl rounded-2xl border border-pink-400/20 bg-white/70 p-4 text-left backdrop-blur-md">
              <p className="text-[10px] font-black  tracking-[0.22em] text-pink-300">
                📝 Описание на часта
              </p>
              <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-zinc-200">
                {description}
              </p>
            </div>
          )}

          {hasSocials && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
              {phone && <SocialPill href={`tel:${phone}`} label="Телефон" icon="☎" />}
              <SocialPill href={facebook} label="Facebook" icon="ⓕ" />
              <SocialPill href={instagram} label="Instagram" icon="◎" />
              <SocialPill href={tiktok} label="TikTok" icon="♪" />
            </div>
          )}

          <div className="mt-5 grid gap-2 text-left sm:grid-cols-3">
            <InfoPill label="Дата" value={`📅 ${date}`} />
            <InfoPill label="Час" value={`🕒 ${time}`} />
            <InfoPill label="Локация" value={location} isLocation />
          </div>
        </div>
      </div>
    </section>
  );
}

function normalizeUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("tel:")) return url;
  return `https://${url}`;
}

function SocialPill({ href, label, icon }: { href: string; label: string; icon: string }) {
  const normalized = normalizeUrl(href);
  if (!normalized) return null;
  return (
    <a
      href={normalized}
      target={normalized.startsWith("tel:") ? undefined : "_blank"}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-pink-400/25 bg-white/40 px-3 py-2 text-[10px] font-black  tracking-[0.14em] text-pink-300 transition hover:bg-pink-400 hover:text-black"
    >
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[11px] normal-case">
        {icon}
      </span>
      {label}
    </a>
  );
}

function InfoPill({
  label,
  value,
  isLocation = false,
}: {
  label: string;
  value: string;
  isLocation?: boolean;
}) {
  const locationIsUrl = isLocation && isUrlLocation(value);

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-md">
      <p className="text-[10px] font-black  tracking-[0.22em] text-zinc-500">
        {label}
      </p>
      {locationIsUrl ? (
        <a
          href={normalizeLocationUrl(value)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex max-w-full items-center gap-1 text-base font-black text-[#ec4899] underline-offset-4 hover:underline"
        >
          📍 {shortLocationLabel(value)}
        </a>
      ) : (
        <p className="mt-1 break-words text-base font-black text-zinc-900">
          {isLocation ? `📍 ${shortLocationLabel(value)}` : value}
        </p>
      )}
    </div>
  );
}
