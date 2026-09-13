export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-full bg-white/10 ${className}`} />
  );
}

export function SkeletonBox({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-white/10 ${className}`} />
  );
}

export function BookingCardSkeleton() {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-white/75 p-4 backdrop-blur-xl sm:rounded-[2rem] sm:p-5">
      <div className="flex items-center gap-3">
        <SkeletonBox className="h-12 w-12 rounded-full" />
        <div className="min-w-0 flex-1">
          <SkeletonLine className="h-5 w-28" />
          <SkeletonLine className="mt-3 h-4 w-40" />
        </div>
      </div>
      <SkeletonLine className="mt-6 h-8 w-3/4" />
      <div className="mt-5 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <SkeletonBox className="h-20" />
        <SkeletonBox className="h-20" />
        <SkeletonBox className="h-20" />
        <SkeletonBox className="h-20" />
      </div>
      <SkeletonBox className="mt-5 h-12" />
    </article>
  );
}

export function FieldCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/75 backdrop-blur-xl">
      <SkeletonBox className="h-32 rounded-none" />
      <div className="p-5 pt-0">
        <div className="-mt-12 flex justify-center">
          <SkeletonBox className="h-24 w-24 rounded-full" />
        </div>
        <SkeletonLine className="mx-auto mt-6 h-4 w-24" />
        <SkeletonLine className="mx-auto mt-4 h-7 w-52" />
        <SkeletonLine className="mt-7 h-5 w-36" />
        <SkeletonLine className="mt-5 h-4 w-full" />
        <SkeletonLine className="mt-3 h-4 w-5/6" />
        <SkeletonBox className="mt-6 h-12" />
      </div>
    </article>
  );
}
