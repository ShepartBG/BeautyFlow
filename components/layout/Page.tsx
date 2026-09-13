import { ReactNode } from "react";

type PageProps = {
  children: ReactNode;
};

export default function Page({ children }: PageProps) {
  return <main className="bf-page-bg min-h-screen text-zinc-900">{children}</main>;
}
