import type { ReactNode } from "react";
import { ClientMessages } from "@/i18n/client-messages";

export default function Layout({ children }: { children: ReactNode }) {
  return <ClientMessages namespaces={["live", "lot"]}>{children}</ClientMessages>;
}
