"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type OwnerState = "checking" | "allowed" | "blocked";

export default function OwnerGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<OwnerState>("checking");

  useEffect(() => {
    let mounted = true;

    async function checkOwner() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;

      const user = sessionData.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: owner, error } = await supabase
        .from("platform_owners")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error || !owner) {
        setState("blocked");
        return;
      }

      setState("allowed");
    }

    checkOwner();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (state === "checking") {
    return (
      <div className="rounded-[2rem] border border-pink-400/15 bg-white/75 p-8 text-center backdrop-blur-xl">
        <p className="text-xs font-black tracking-[0.3em] text-pink-300">Owner Security</p>
        <h2 className="mt-3 text-3xl font-black">Проверявам owner достъпа...</h2>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div className="rounded-[2rem] border border-red-400/25 bg-white/75 p-8 text-center backdrop-blur-xl">
        <p className="text-xs font-black tracking-[0.3em] text-red-300">Access blocked</p>
        <h2 className="mt-3 text-3xl font-black">Нямаш BeautyFlow Owner достъп.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500">
          Тази секция е достъпна само за централния BeautyFlow Owner акаунт.
        </p>
        <button
          onClick={() => router.replace("/login")}
          className="mt-6 rounded-2xl bg-pink-500 px-5 py-3 font-black text-black hover:bg-pink-400"
        >
          Към входа
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
