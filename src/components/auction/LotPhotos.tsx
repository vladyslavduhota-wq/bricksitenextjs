"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CaretLeft, CaretRight, ImageSquare } from "@phosphor-icons/react";
import { photoUrl } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";
import type { PublicImage } from "@/lib/types";

/**
 * Lot photos that fill whatever height the parent gives them and show the whole photo,
 * so the page fits one screen. `autoplay` cycles them for the stream; otherwise arrows.
 */
export function LotPhotos({ images, title, autoplay = false, className }: { images: PublicImage[]; title: string; autoplay?: boolean; className?: string }) {
  const t = useTranslations("lot");
  const [i, setI] = useState(0);
  const n = images.length;
  const go = (d: number) => setI((k) => (k + d + n) % n);

  useEffect(() => {
    if (!autoplay || n < 2) return;
    const id = setInterval(() => setI((k) => (k + 1) % n), 6000);
    return () => clearInterval(id);
  }, [autoplay, n]);

  return (
    <div className={cn("dot-grid-light relative h-full w-full overflow-hidden rounded-[1.75rem] bg-navy-deep", className)}>
      {n === 0 ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-primary-foreground/60"><ImageSquare size={40} weight="light" /> {t("noPhoto")}</span>
      ) : (
        images.map((img, k) => (
          <Image
            key={img.path}
            src={photoUrl(img.path)}
            alt={`${title}. ${t("photo", { n: k + 1, total: n })}`}
            fill
            priority={k === 0}
            sizes="(min-width: 1024px) 40vw, 100vw"
            className={cn("object-contain transition-opacity duration-700", k === (i % n) ? "opacity-100" : "opacity-0")}
            aria-hidden={k !== i % n}
          />
        ))
      )}
      {n > 1 && !autoplay && (
        <>
          <button onClick={() => go(-1)} aria-label={t("prev")} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-primary shadow-soft backdrop-blur transition active:scale-95"><CaretLeft weight="bold" /></button>
          <button onClick={() => go(1)} aria-label={t("next")} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-primary shadow-soft backdrop-blur transition active:scale-95"><CaretRight weight="bold" /></button>
        </>
      )}
      {n > 1 && (
        <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-background/80 px-2.5 py-1.5 backdrop-blur">
          {images.map((img, k) => (
            <span key={img.path} className={cn("h-1.5 rounded-full transition-all", k === i % n ? "w-5 bg-primary" : "w-1.5 bg-primary/30")} />
          ))}
        </span>
      )}
    </div>
  );
}
