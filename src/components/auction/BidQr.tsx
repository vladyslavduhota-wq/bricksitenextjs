import type { Qr } from "@/lib/qr";
import { cn } from "@/lib/utils";

/** Scan-to-bid card for the stream: black on white so phone cameras read it off compressed video. */
export function BidQr({ qr, label, className }: { qr: Qr; label: string; className?: string }) {
  return (
    <figure className={cn("shrink-0 rounded-[1.25rem] bg-white p-[1vmin] text-center text-primary", className)}>
      <svg viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" role="img" aria-label={label} className="block w-full">
        <path d={qr.path} fill="#000" />
      </svg>
      <figcaption className="pb-[0.8vmin] text-[clamp(0.8rem,2vmin,1.6rem)] font-bold leading-tight">{label}</figcaption>
    </figure>
  );
}
