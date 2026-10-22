"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { CaretLeft, CaretRight, ImageSquare } from "@phosphor-icons/react";
import { Bezel } from "@/components/ui";
import { photoUrl } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";
import type { PublicImage } from "@/lib/types";

export function Gallery({ images, title }: { images: PublicImage[]; title: string }) {
  const t = useTranslations("lot");
  const [i, setI] = useState(0);
  const go = (d: number) => setI((n) => (n + d + images.length) % images.length);

  if (!images.length) {
    return (
      <Bezel dark core="dot-grid-light grid aspect-[3/4] place-items-center bg-navy-deep text-primary-foreground/60">
        <span className="flex flex-col items-center gap-2 text-sm"><ImageSquare size={40} weight="light" /> {t("noPhoto")}</span>
      </Bezel>
    );
  }
  return (
    <div>
      <Bezel dark core="relative overflow-hidden bg-navy-deep">
        <div className="relative aspect-[3/4]" onKeyDown={(e) => (e.key === "ArrowLeft" ? go(-1) : e.key === "ArrowRight" ? go(1) : null)}>
          {images.map((img, k) => (
            <Image
              key={img.path}
              src={photoUrl(img.path)}
              alt={`${title}. ${t("photo", { n: k + 1, total: images.length })}`}
              fill
              priority={k === 0}
              sizes="(min-width: 1024px) 40rem, 100vw"
              className={cn("object-cover transition-opacity duration-500", k === i ? "opacity-100" : "opacity-0")}
              aria-hidden={k !== i}
            />
          ))}
          {images.length > 1 && (
            <>
              <button onClick={() => go(-1)} aria-label={t("prev")} className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-primary shadow-soft backdrop-blur transition active:scale-95"><CaretLeft weight="bold" /></button>
              <button onClick={() => go(1)} aria-label={t("next")} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-primary shadow-soft backdrop-blur transition active:scale-95"><CaretRight weight="bold" /></button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium tabular-nums text-primary">{i + 1} / {images.length}</span>
            </>
          )}
        </div>
      </Bezel>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, k) => (
            <button key={img.path} onClick={() => setI(k)} aria-label={t("photo", { n: k + 1, total: images.length })} aria-current={k === i} className={cn("relative h-20 w-16 shrink-0 overflow-hidden rounded-xl ring-2 transition", k === i ? "ring-accent" : "ring-transparent opacity-70 hover:opacity-100")}>
              <Image src={photoUrl(img.path)} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
