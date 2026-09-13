import { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
};

export default function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: Props) {
  const variants = {
    primary: "bg-pink-500 text-black hover:bg-pink-400 shadow-[0_0_28px_rgba(132,204,22,0.18)]",
    secondary: "border border-white/10 bg-white/[0.05] text-zinc-900 hover:bg-white/[0.08]",
    danger: "bg-red-600 text-zinc-900 hover:bg-red-500",
  };

  return (
    <button
      {...props}
      className={`rounded-2xl px-4 py-3 font-black transition disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
