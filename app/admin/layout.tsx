import type {ReactNode} from "react";
import BusinessGuard from "@/components/auth/BusinessGuard";

export default function AdminLayout({children}:{children:ReactNode}){
  return <BusinessGuard>{children}</BusinessGuard>;
}
