// Building blocks shared by the site, login and admin, so every screen speaks the same visual language:
// double-bezel cards, pill buttons, soft rings, navy + cyan.
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** `core` styles the inner plate; it is white unless `core` sets another background. */
export function Bezel({ children, className = "", core = "", dark = false }: { children: ReactNode; className?: string; core?: string; dark?: boolean }) {
  return (
    <div className={cn("rounded-[2.25rem] p-1.5 ring-1", dark ? "bg-primary-foreground/5 ring-primary-foreground/10" : "bg-primary/[0.04] ring-primary/10", className)}>
      <div className={cn("h-full rounded-[calc(2.25rem-0.375rem)] bg-card shadow-[inset_0_1px_1px_color-mix(in_oklab,var(--primary-foreground)_40%,transparent)]", core)}>
        {children}
      </div>
    </div>
  );
}

type ButtonVariant = "primary" | "accent" | "ghost" | "danger" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90",
  accent: "bg-accent text-accent-foreground shadow-soft hover:brightness-95",
  ghost: "text-primary ring-1 ring-primary/15 hover:bg-primary/5",
  danger: "bg-destructive/10 text-destructive ring-1 ring-destructive/20 hover:bg-destructive/15",
  quiet: "text-primary hover:bg-primary/5",
};
const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

export const buttonClass = (variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") =>
  cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition duration-300 ease-spring",
    "outline-none focus-visible:ring-[3px] focus-visible:ring-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" {...props} className={buttonClass(variant, size, className)} />;
}

export const inputClass = cn(
  "w-full rounded-2xl bg-card px-4 py-3 text-base text-foreground ring-1 ring-primary/15 transition placeholder:text-muted-foreground/70",
  "outline-none focus:ring-2 focus:ring-accent disabled:bg-muted disabled:text-muted-foreground read-only:bg-muted read-only:text-muted-foreground",
  "aria-[invalid=true]:ring-destructive/60",
);

export function Field({ label, hint, error, children, className }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-sm font-medium text-primary">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs text-destructive">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

/** A real checkbox with the site's look: big tap target, cyan when on. */
export function Check({ children, className, ...props }: ComponentProps<"input"> & { children: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl p-3 text-sm leading-relaxed text-foreground transition hover:bg-primary/[0.03]", className)}>
      <span className="relative mt-0.5 grid h-5 w-5 shrink-0 place-items-center">
        <input
          type="checkbox"
          {...props}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md bg-card ring-1 ring-primary/25 transition checked:bg-accent checked:ring-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        />
        <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute h-3.5 w-3.5 opacity-0 transition peer-checked:opacity-100">
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}

type BadgeTone = "accent" | "primary" | "muted" | "danger" | "outline";
const TONES: Record<BadgeTone, string> = {
  accent: "bg-accent text-accent-foreground",
  primary: "bg-primary text-primary-foreground",
  muted: "bg-muted text-muted-foreground",
  danger: "bg-destructive/10 text-destructive",
  outline: "text-primary ring-1 ring-primary/20",
};

export function Badge({ tone = "muted", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium leading-none", TONES[tone], className)}>{children}</span>;
}

/** Small uppercase label used across the site for eyebrows and table heads. */
export const microLabel = "text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground";

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const cls = { info: "bg-accent-soft text-primary ring-primary/10", error: "bg-destructive/10 text-destructive ring-destructive/20", success: "bg-accent/30 text-primary ring-primary/10" }[tone];
  return <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-2xl px-4 py-3 text-sm ring-1", cls)}>{children}</div>;
}
