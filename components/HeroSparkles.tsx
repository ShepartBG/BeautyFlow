"use client";
import { useEffect, useRef } from "react";

// Decorative violet sparkles floating up through the home hero. Purely visual:
// pointer-events are off, it pauses off-screen and never runs with reduced motion.
export default function HeroSparkles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type P = { x: number; y: number; r: number; vy: number; vx: number; life: number; max: number; hue: number };
    let w = 0, h = 0, raf = 0, running = true;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (initial: boolean): P => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: 0.7 + Math.random() * 1.9,
      vy: 0.25 + Math.random() * 0.75,
      vx: (Math.random() - 0.5) * 0.3,
      life: 0,
      max: 260 + Math.random() * 300,
      hue: 262 + Math.random() * 40, // violet → lilac/pink
    });
    resize();
    const parts = Array.from({ length: Math.round(Math.min(46, w / 26)) }, () => spawn(true));

    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        p.life++;
        p.y -= p.vy;
        p.x += p.vx + Math.sin((p.life + p.max) / 34) * 0.3;
        const t = p.life / p.max;
        const a = Math.max(0, Math.min(1, t * 4) * (1 - t));
        ctx.fillStyle = `hsla(${p.hue}, 90%, 72%, ${a * 0.18})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsla(${p.hue}, 100%, 88%, ${a * 0.85})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        if (p.life > p.max || p.y < -10) Object.assign(p, spawn(false));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const visibility = new IntersectionObserver(([entry]) => {
      const was = running;
      running = entry.isIntersecting;
      if (running && !was) raf = requestAnimationFrame(tick);
    });
    visibility.observe(canvas);
    window.addEventListener("resize", resize);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      visibility.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="bfm-sparkles" aria-hidden="true" />;
}
