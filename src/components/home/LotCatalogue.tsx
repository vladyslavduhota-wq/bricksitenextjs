"use client";

import Image, { getImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ImageSquare, X } from "@phosphor-icons/react";
import { LotPhotos } from "@/components/auction/LotPhotos";
import { Bezel, buttonClass } from "@/components/ui";
import { lotDescription, lotTitle } from "@/lib/lot-text";
import { photoUrl } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";
import type { PublicLot } from "@/lib/types";

const FIRST = 12;
// Phones start with four rows of two.
const FIRST_PHONE = 8;

const DIALOG_SIZES = "(min-width: 1024px) 28rem, (min-width: 768px) 45vw, 92vw";

/** Starts loading the dialog's photo as soon as the visitor points at or touches the card. */
function warm(lot: PublicLot) {
  const cover = lot.images[0];
  if (!cover) return;
  const { props } = getImageProps({ src: photoUrl(cover.path), alt: "", fill: true, sizes: DIALOG_SIZES });
  const img = new window.Image();
  img.sizes = props.sizes ?? "";
  img.srcset = props.srcSet ?? "";
}

/** Every lot to look through before the auction: photo and title, the story opens in a dialog. No prices here. */
export function LotCatalogue({ lots }: { lots: PublicLot[] }) {
  const t = useTranslations("lots");
  const locale = useLocale();
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<{ lot: PublicLot; preview?: string } | null>(null);
  if (!lots.length) return <p className="mt-12 text-primary-foreground/65">{t("empty")}</p>;
  return (
    <>
      <ul className="mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {(all ? lots : lots.slice(0, FIRST)).map((lot, k) => {
          const title = lotTitle(lot, locale);
          const cover = lot.images[0];
          return (
            <li key={lot.id} className={!all && k >= FIRST_PHONE ? "max-md:hidden" : undefined}>
              <button type="button" aria-haspopup="dialog" onPointerEnter={() => warm(lot)} onFocus={() => warm(lot)} onClick={(e) => setOpen({ lot, preview: e.currentTarget.querySelector("img")?.currentSrc })} className="group block h-full w-full rounded-[1.6rem] text-left outline-none transition-transform duration-500 ease-spring hover:-translate-y-1 focus-visible:ring-[3px] focus-visible:ring-accent">
                <Bezel dark className="h-full rounded-[1.6rem] p-1" core="overflow-hidden rounded-[1.35rem] bg-navy-deep">
                  <span className="dot-grid-light relative block aspect-square overflow-hidden bg-primary/40">
                    {cover ? (
                      <Image src={photoUrl(cover.path)} alt="" fill sizes="(min-width: 1024px) 18rem, (min-width: 768px) 30vw, 46vw" className="object-cover transition-transform duration-1000 ease-spring group-hover:scale-105" />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-primary-foreground/50"><ImageSquare size={32} weight="light" /></span>
                    )}
                  </span>
                  <span className="block p-3 text-[14px] font-bold leading-tight sm:p-5 sm:text-lg">{title}</span>
                </Bezel>
              </button>
            </li>
          );
        })}
      </ul>
      {!all && lots.length > FIRST_PHONE && (
        <div className={cn("mt-8 flex justify-center", lots.length <= FIRST && "md:hidden")}>
          <button type="button" onClick={() => setAll(true)} className={buttonClass("accent", "lg")}>{t("all", { n: lots.length })}</button>
        </div>
      )}
      {open && <LotDialog {...open} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Native dialog: focus trap, Escape and the backdrop come with it. */
function LotDialog({ lot, preview, onClose }: { lot: PublicLot; preview?: string; onClose: () => void }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = overflow; };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="lot-dialog-title"
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
      className="m-auto max-h-[92dvh] w-[min(60rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-[2rem] bg-card p-0 text-foreground shadow-soft backdrop:bg-primary/70"
    >
      <div className="relative grid gap-5 p-4 md:grid-cols-2 md:gap-8 md:p-6">
        <div className="h-[46dvh] min-w-0 md:h-[60dvh]"><LotPhotos images={lot.images} title={lotTitle(lot, locale)} sizes={DIALOG_SIZES} preview={preview || undefined} /></div>
        <div className="min-w-0 pb-3 md:pr-8 md:pt-12">
          <h3 id="lot-dialog-title" className="text-2xl font-bold tracking-tight text-primary md:text-4xl">{lotTitle(lot, locale)}</h3>
          {lotDescription(lot, locale) && <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{lotDescription(lot, locale)}</p>}
        </div>
        <button type="button" aria-label={t("close")} onClick={() => ref.current?.close()} className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-card/90 text-primary shadow-soft ring-1 ring-primary/10">
          <X weight="light" size={20} />
        </button>
      </div>
    </dialog>
  );
}
