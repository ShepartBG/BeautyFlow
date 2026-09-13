import type { ReactNode } from "react";
import BFHeader from "./BFHeader";
import BFFooter from "./BFFooter";

export default function BFPublicShell({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return <main className="bf3 bf3-page"><BFHeader />{children}{footer && <BFFooter />}</main>;
}
