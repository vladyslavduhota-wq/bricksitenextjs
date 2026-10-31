import type { ReactNode } from "react";
import { ClientMessages } from "@/i18n/client-messages";

// Only the copy this section's client components read reaches the browser.
export default function Layout({ children }: { children: ReactNode }) {
  return <ClientMessages namespaces={["live", "lot", "bid"]}>{children}</ClientMessages>;
}
