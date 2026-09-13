type DividerProps = {
  className?: string;
};

export default function Divider({ className = "" }: DividerProps) {
  return (
    <div
      className={`
        my-6
        h-px
        w-full
        bg-gradient-to-r
        from-transparent
        via-green-500/40
        to-transparent
        ${className}
      `}
    />
  );
}