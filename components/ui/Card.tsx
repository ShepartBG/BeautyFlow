import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-pink-400/20 bg-white/75 p-5 shadow-[0_0_35px_rgba(0,0,0,.45)] backdrop-blur-xl before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,rgba(132,204,22,.09),transparent_58%)] ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
