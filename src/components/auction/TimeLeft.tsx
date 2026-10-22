"use client";

import { useTranslations } from "next-intl";
import { useServerNow } from "./live";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/** Live countdown on server time: "2 д 14 год", "1 год 05 хв", then "04:59" in the final hour. */
export function TimeLeft({ endsAt, closed = false, className, urgentClassName }: { endsAt: string; closed?: boolean; className?: string; urgentClassName?: string }) {
  const t = useTranslations("time");
  const now = useServerNow();
  // Nothing before the clock starts, so server and client HTML match.
  if (now == null) return <span className={className} aria-hidden>&nbsp;</span>;
  const ms = new Date(endsAt).getTime() - now;
  if (closed || ms <= 0) return <span className={className}>{t("ended")}</span>;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const text = d ? `${d} ${t("d")} ${h} ${t("h")}` : h ? `${h} ${t("h")} ${pad(m)} ${t("m")}` : `${pad(m)}:${pad(s % 60)}`;
  return <span className={cn("tabular-nums", className, s < 300 && urgentClassName)}>{text}</span>;
}
