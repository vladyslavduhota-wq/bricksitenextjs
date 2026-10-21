"use client";

import type { ComponentProps } from "react";
import { inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";

/** A <select> inside a GET filter form that applies itself on change. Works without JS via the form's button. */
export function AutoSubmitSelect({ className, ...props }: ComponentProps<"select">) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} className={cn(inputClass, "h-11 py-0 pr-10", className)} />;
}
