import Link from "next/link";

type Props = {
  compact?: boolean;
  variant?: "navbar" | "hero" | "mark";
  className?: string;
  showText?: boolean;
};

export default function BeautyFlowLogo({
  compact = false,
  variant = "navbar",
  className = "",
  showText = variant === "navbar",
}: Props) {
  const isHero = variant === "hero";
  const isMark = variant === "mark";

  const markSize = isHero
    ? "h-28 w-28 sm:h-40 sm:w-40 md:h-52 md:w-52"
    : compact || isMark
      ? "h-11 w-11 sm:h-14 sm:w-14"
      : "h-11 w-11 sm:h-12 sm:w-12";

  return (
    <Link
      href="/"
      className={`group inline-flex min-w-0 max-w-full items-center gap-2 overflow-visible ${className}`}
      aria-label="BeautyFlow начало"
    >
      <span
        className={`${markSize} relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_16px_50px_rgba(236,72,153,0.28)] ring-1 ring-white/50 transition duration-300 group-hover:scale-[1.04]`}
      >
        <img
          src="/beautyflow-logo-circle.png"
          alt="BeautyFlow"
          className="h-full w-full object-cover"
        />
      </span>

      {showText && (
        <span className="min-w-0 truncate whitespace-nowrap text-sm font-black tracking-tight text-zinc-900 transition group-hover:text-pink-600 sm:text-base lg:text-xl">
          Beauty<span className="text-pink-500">Flow</span>
        </span>
      )}
    </Link>
  );
}
