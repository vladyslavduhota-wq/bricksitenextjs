"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, ImageSquare, Trash, UploadSimple } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { LOTS_BUCKET, photoUrl } from "@/lib/supabase/env";
import { Badge, Notice } from "@/components/ui";
import { cn } from "@/lib/utils";
import { addPhoto, deletePhoto, reorderPhotos } from "@/app/admin/actions";
import { ConfirmAction } from "./ConfirmAction";
import type { LotImage } from "@/lib/types";

const MAX_SIDE = 2000;

/** Shrinks big camera photos before upload; WebP where the browser can encode it, JPEG otherwise (older Safari). */
async function prepare(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = Object.assign(document.createElement("canvas"), { width, height });
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const encode = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  let blob = await encode("image/webp", 0.86);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.88);
  if (!blob) throw new Error("encode");
  return { blob, width, height, ext: blob.type === "image/webp" ? "webp" : "jpg" };
}

export function PhotoManager({ lotId, title, images }: { lotId: string; title: string; images: LotImage[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [moving, startMove] = useTransition();

  async function upload(files: File[]) {
    const list = files.filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setError(null);
    setProgress({ done: 0, total: list.length });
    const supabase = createClient();
    for (const [i, file] of list.entries()) {
      try {
        const { blob, width, height, ext } = await prepare(file);
        const path = `${lotId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(LOTS_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
        if (upErr) throw upErr;
        const res = await addPhoto(lotId, path, width, height);
        if (res.error) throw new Error(res.error);
      } catch {
        setError(`Не вдалося завантажити «${file.name}». Спробуйте ще раз або інший файл.`);
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    if (input.current) input.current.value = "";
  }

  const move = (from: number, to: number) => {
    const ids = images.map((i) => i.id);
    ids.splice(to, 0, ids.splice(from, 1)[0]!);
    startMove(async () => {
      const res = await reorderPhotos(lotId, ids);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div>
      {images.length > 0 && (
        <ul className={cn("mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3", moving && "opacity-60")}>
          {images.map((img, k) => (
            <li key={img.id} className="group relative overflow-hidden rounded-2xl bg-navy-deep ring-1 ring-primary/10">
              <div className="relative aspect-[4/5]">
                <Image src={photoUrl(img.path)} alt={`${title}, фото ${k + 1}`} fill sizes="(min-width: 1024px) 14rem, 45vw" className="object-cover" />
              </div>
              {k === 0 && <Badge tone="accent" className="absolute left-2 top-2">Обкладинка</Badge>}
              <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 rounded-full bg-background/90 p-1 shadow-soft backdrop-blur">
                <div className="flex">
                  <button type="button" aria-label="Перемістити ліворуч" disabled={k === 0 || moving} onClick={() => move(k, k - 1)} className="grid h-8 w-8 place-items-center rounded-full text-primary hover:bg-primary/5 disabled:opacity-30"><ArrowLeft /></button>
                  <button type="button" aria-label="Перемістити праворуч" disabled={k === images.length - 1 || moving} onClick={() => move(k, k + 1)} className="grid h-8 w-8 place-items-center rounded-full text-primary hover:bg-primary/5 disabled:opacity-30"><ArrowRight /></button>
                </div>
                <ConfirmAction action={deletePhoto.bind(null, img.id)} variant="quiet" size="sm" className="h-8 w-8 px-0 text-destructive" tone="danger" title="Видалити фото?" description="Фото зникне з сайту назавжди." confirmLabel="Видалити">
                  <Trash aria-label="Видалити фото" />
                </ConfirmAction>
              </div>
            </li>
          ))}
        </ul>
      )}

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void upload([...e.dataTransfer.files]); }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition",
          dragging ? "border-accent bg-accent-soft" : "border-primary/15 hover:border-primary/30 hover:bg-primary/[0.02]",
          progress && "pointer-events-none opacity-70",
        )}
      >
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="sr-only" onChange={(e) => void upload([...(e.target.files ?? [])])} />
        {progress ? <UploadSimple size={28} weight="light" className="animate-pulse text-primary" /> : <ImageSquare size={28} weight="light" className="text-primary" />}
        <span className="font-medium text-primary">{progress ? `Завантажуємо ${progress.done} з ${progress.total}…` : "Додати фото"}</span>
        <span className="text-xs text-muted-foreground">Перетягніть сюди або оберіть. Перше фото стає обкладинкою; великі фото зменшуються до {MAX_SIDE}px.</span>
      </label>
      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
    </div>
  );
}
