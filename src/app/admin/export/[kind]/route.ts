import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/format";
import { formatKyiv, formatKyivPrecise, toKyivInput } from "@/lib/time";
import type { AdminBid, Winner } from "@/lib/types";

const STATUS: Record<string, string> = { draft: "чернетка", active: "активний", closed: "закритий", valid: "дійсна", cancelled: "скасована" };
// PostgREST returns at most 1000 rows per request.
const BATCH = 1000;

/** CSV for Excel: winners with contacts (spec 5.8) and the full bid history. Admins only. */
export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const viewer = await getViewer();
  if (viewer?.profile?.role !== "admin") return new NextResponse("Forbidden", { status: 403 });
  const { kind } = await params;
  const supabase = await createClient();
  const stamp = toKyivInput(new Date()).replace("T", "_").replace(":", "-");

  let csv: string;
  if (kind === "winners") {
    const { data, error } = await supabase.from("admin_winners").select("*").order("lot_title").returns<Winner[]>();
    if (error) return new NextResponse("Export failed", { status: 500 });
    csv = toCsv(
      ["Лот", "Статус лота", "Закриття", "Сума, грн", "Ставок на лоті", "Ім'я", "Email", "Телефон", "Нік", "Анонімно на сайті", "Згода на фото", "Час ставки"],
      data.map((w) => [w.lot_title, STATUS[w.lot_status], formatKyiv(w.closed_at ?? w.ends_at), w.amount, w.bid_count, w.full_name, w.email, w.phone, w.display_name, w.show_anonymously, w.photo_consent, formatKyivPrecise(w.bid_at)]),
    );
  } else if (kind === "bids") {
    const rows: AdminBid[] = [];
    for (let from = 0; ; from += BATCH) {
      const { data, error } = await supabase.from("admin_bids").select("*").order("created_at").range(from, from + BATCH - 1).returns<AdminBid[]>();
      if (error) return new NextResponse("Export failed", { status: 500 });
      rows.push(...data);
      if (data.length < BATCH) break;
    }
    csv = toCsv(
      ["Час", "Лот", "Сума, грн", "Статус", "Лідирує", "Учасник", "Email", "Ім'я на сайті", "Причина скасування"],
      rows.map((b) => [formatKyivPrecise(b.created_at), b.lot_title, b.amount, STATUS[b.status], b.is_leading, b.bidder_name, b.bidder_email, b.public_name ?? "анонімно", b.cancel_reason]),
    );
  } else {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kse-auction-${kind}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
