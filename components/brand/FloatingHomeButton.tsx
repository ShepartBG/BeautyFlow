import BeautyFlowLogo from "@/components/brand/BeautyFlowLogo";

export default function FloatingHomeButton() {
  return (
    <div className="fixed bottom-4 left-4 z-50 hidden md:block">
      <div className="rounded-3xl border border-white/10 bg-white/80 p-2 backdrop-blur-2xl shadow-[0_0_35px_rgba(0,0,0,0.5)] transition hover:border-pink-400/30">
        <BeautyFlowLogo variant="mark" showText={false} />
      </div>
    </div>
  );
}
