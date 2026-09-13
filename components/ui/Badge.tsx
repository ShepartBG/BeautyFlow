import { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  className?: string;
};

export default function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        rounded-full
        border
        border-green-500/30
        bg-green-500/10
        px-3
        py-1
        text-xs
        font-black
        
        tracking-[0.25em]
        text-green-400
        ${className}
      `}
    >
      {children}
    </span>
  );
}