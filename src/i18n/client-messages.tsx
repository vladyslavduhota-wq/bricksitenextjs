import type { ReactNode } from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { getMessages } from "next-intl/server";

import type messages from "../../messages/uk.json";

// uk.json is the source of truth for namespace names.
type Namespace = keyof typeof messages;

/** What every page's client components need: the site bar and countdowns. */
export const BASE_NAMESPACES = ["common", "time"] as const satisfies Namespace[];

/**
 * Sends the browser only the message namespaces this route's client components read,
 * instead of the whole dictionary (legal texts, auth, admin-facing copy) on every page.
 */
export async function ClientMessages({ namespaces, children }: { namespaces: Namespace[]; children: ReactNode }) {
  const all = await getMessages();
  const keys = [...BASE_NAMESPACES, ...namespaces];
  const picked: AbstractIntlMessages = Object.fromEntries(keys.map((k) => [k, all[k]]));
  return <NextIntlClientProvider messages={picked}>{children}</NextIntlClientProvider>;
}
