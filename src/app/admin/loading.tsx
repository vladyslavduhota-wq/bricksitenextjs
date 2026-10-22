import { Bezel } from "@/components/ui";

const bar = "animate-pulse rounded-full bg-primary/[0.07]";

/** Shown instantly on every admin navigation while the server fetches data; the sidebar stays in place. */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Завантаження…</span>
      <div className="mb-8 space-y-3">
        <div className={`${bar} h-12 w-56 md:h-14`} />
        <div className={`${bar} h-4 w-80 max-w-full`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((k) => (
          <Bezel key={k} core="space-y-4 p-5">
            <div className={`${bar} h-3 w-20`} />
            <div className={`${bar} h-8 w-28`} />
          </Bezel>
        ))}
      </div>
      <Bezel className="mt-6" core="space-y-4 p-6">
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} className="flex items-center gap-4">
            <div className={`${bar} h-10 w-10 shrink-0`} />
            <div className={`${bar} h-4 flex-1`} />
            <div className={`${bar} h-4 w-20`} />
          </div>
        ))}
      </Bezel>
    </div>
  );
}
