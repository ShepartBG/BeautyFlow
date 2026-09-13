type Props = {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fit?: "contain" | "cover";
  scale?: number;
  x?: number;
  y?: number;
};

export default function FieldLogoFrame({
  src = "/beautyflow-real-logo-transparent.png",
  alt = "Field logo",
  size = "md",
  className = "",
  fit = "contain",
  scale = 1,
  x = 0,
  y = 0,
}: Props) {
  const sizes = {
    sm: "h-12 w-12 p-1.5",
    md: "h-20 w-20 p-2",
    lg: "h-32 w-32 p-2.5 md:h-36 md:w-36",
    xl: "h-52 w-52 p-3 sm:h-60 sm:w-60",
  };

  const safeScale = Number.isFinite(scale) ? Math.min(Math.max(scale, 0.55), 2.6) : 1;
  const safeX = Number.isFinite(x) ? Math.min(Math.max(x, -60), 60) : 0;
  const safeY = Number.isFinite(y) ? Math.min(Math.max(y, -60), 60) : 0;

  return (
    <div
      className={`relative flex ${sizes[size]} shrink-0 items-center justify-center overflow-hidden rounded-full border border-pink-400/25 bg-white/35 shadow-[0_0_38px_rgba(149,201,0,.14)] backdrop-blur-xl ${className}`}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(149,201,0,.14),transparent_58%)]" />
      <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/10" />
      <img
        src={src}
        alt={alt}
        className={`relative z-10 h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"} drop-shadow-[0_0_14px_rgba(0,0,0,.45)]`}
        style={{
          transform: `translate(${safeX}%, ${safeY}%) scale(${safeScale})`,
          transformOrigin: "center",
        }}
      />
    </div>
  );
}
