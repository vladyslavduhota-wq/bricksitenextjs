/** Header wordmark echoing the preloader: KSE letters + RECTOR / AUCTION stack. */
export function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2" aria-label="KSE Rector Auction">
      <span className={`grid h-9 place-items-center rounded-full bg-primary px-3 text-[13px] font-bold tracking-[0.12em] text-accent ${light ? "ring-1 ring-primary-foreground/25" : ""}`}>KSE</span>
      <span className="flex flex-col leading-[0.9]">
        <span className={`text-[13px] font-bold tracking-[0.14em] ${light ? "text-accent" : "text-primary"}`}>RECTOR</span>
        <span className={`text-[10px] font-medium tracking-[0.3em] ${light ? "text-primary-foreground/70" : "text-muted-foreground"}`}>AUCTION</span>
      </span>
    </span>
  );
}
