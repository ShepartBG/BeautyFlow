import FieldLogoFrame from "@/components/brand/FieldLogoFrame";

type Props = {
  code: string;
  fieldName?: string;
  fieldLogo?: string;
  logoFit?: "contain" | "cover";
  logoScale?: number;
  logoX?: number;
  logoY?: number;
};

export default function SuccessScreen({
  code,
  fieldName = "Beauty Field BeautyFlow",
  fieldLogo = "/beautyflow-logo.png",
  logoFit = "contain",
  logoScale = 1,
  logoX = 0,
  logoY = 0,
}: Props) {
  return (
    <main className="flex min-h-[72vh] items-center justify-center p-6 text-zinc-900">
      <div className="w-full max-w-md rounded-[2rem] border border-[#95c900]/40 bg-white/80 p-8 text-center shadow-[0_0_45px_rgba(149,201,0,0.16)] backdrop-blur-xl">
        <div className="flex justify-center">
          <FieldLogoFrame
            src={fieldLogo}
            alt={fieldName}
            size="lg"
            fit={logoFit}
            scale={logoScale}
            x={logoX}
            y={logoY}
          />
        </div>

        <p className="mt-5 text-xs font-black  tracking-[0.24em] text-zinc-500">
          {fieldName}
        </p>

        <h1 className="mt-2 text-3xl font-black text-[#ec4899]">
          Успешна регистрация!
        </h1>

        <p className="mt-4 text-zinc-600">Запази този код:</p>

        <div className="mt-4 rounded-2xl border border-zinc-700 bg-white p-5 text-5xl font-black">
          {code}
        </div>
      </div>
    </main>
  );
}
