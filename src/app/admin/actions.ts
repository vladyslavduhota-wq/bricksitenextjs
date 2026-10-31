"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LOTS_BUCKET } from "@/lib/supabase/env";
import { slugify } from "@/lib/format";
import type { LotStatus, Role } from "@/lib/types";

// Every action below refreshes the whole site (revalidatePath("/", "layout")): admin pages and the cached public pages alike.
/** `next` carries a fresh request key after a manual bid succeeds, so its form starts over. */
export type ActionState = { ok?: string; error?: string; fields?: Record<string, string>; at?: number; next?: string };

const ok = (message: string): ActionState => ({ ok: message, at: Date.now() });
const fail = (message: string, fields?: Record<string, string>): ActionState => ({ error: message, fields, at: Date.now() });
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const int = (form: FormData, key: string) => {
  const raw = text(form, key).replace(/\s/g, "");
  return /^\d+$/.test(raw) ? Number(raw) : NaN;
};
const MAX_UAH = 100_000_000;

// ---------------------------------------------------------------- lots

const STATUSES: LotStatus[] = ["draft", "active", "closed"];

export async function saveLot(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = text(form, "id") || null;

  const values = {
    title_uk: text(form, "title_uk"),
    title_en: text(form, "title_en"),
    description_uk: text(form, "description_uk"),
    description_en: text(form, "description_en"),
    start_price: int(form, "start_price"),
    bid_step: int(form, "bid_step"),
    status: text(form, "status") as LotStatus,
    sort_order: Number.parseInt(text(form, "sort_order") || "0", 10),
    slug: slugify(text(form, "slug")) || slugify(text(form, "title_uk")),
  };

  const fields: Record<string, string> = {};
  if (!values.title_uk) fields.title_uk = "Вкажіть назву українською.";
  if (values.title_uk.length > 160 || values.title_en.length > 160) fields.title_uk = "Назва до 160 символів.";
  if (values.description_uk.length > 4000 || values.description_en.length > 4000) fields.description_uk = "Опис до 4000 символів.";
  if (!(values.start_price >= 0 && values.start_price <= MAX_UAH)) fields.start_price = "Ціле число гривень, від 0.";
  if (!(values.bid_step > 0 && values.bid_step <= MAX_UAH)) fields.bid_step = "Ціле число гривень, більше 0.";
  if (!STATUSES.includes(values.status)) fields.status = "Оберіть статус.";
  if (!Number.isFinite(values.sort_order)) values.sort_order = 0;
  if (!values.slug) fields.slug = "Адреса з латинських літер і цифр.";
  if (Object.keys(fields).length) return fail("Перевірте виділені поля.", fields);

  const row = values;

  if (id) {
    const { data: current } = await supabase.from("lots").select("bid_count, start_price").eq("id", id).single();
    if (!current) return fail("Лот не знайдено.");
    if (current.bid_count > 0 && current.start_price !== row.start_price) {
      return fail("На лот уже є ставки, стартову ціну змінити не можна.", { start_price: "Заблоковано: є ставки." });
    }
    const { error } = await supabase.from("lots").update(row).eq("id", id);
    if (error) return error.code === "23505" ? fail("Така адреса вже є в іншого лота.", { slug: "Адреса зайнята." }) : fail("Не вдалося зберегти лот.");
    revalidatePath("/", "layout");
    return ok("Лот збережено.");
  }

  const { data, error } = await supabase.from("lots").insert(row).select("id").single();
  if (error) return error.code === "23505" ? fail("Така адреса вже є в іншого лота.", { slug: "Адреса зайнята." }) : fail("Не вдалося створити лот.");
  revalidatePath("/", "layout");
  redirect(`/admin/lots/${data.id}?created=1`);
}

export async function closeLotNow(lotId: string, _?: ActionState, __?: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("lots").update({ status: "closed" }).eq("id", lotId).eq("status", "active").select("id");
  if (error || !data?.length) return fail("Не вдалося закрити лот. Можливо, він уже закритий.");
  revalidatePath("/", "layout");
  return ok("Лот закрито, переможця зафіксовано.");
}

export async function deleteLot(lotId: string, _?: ActionState, __?: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: images } = await supabase.from("lot_images").select("path").eq("lot_id", lotId);
  // The database refuses to delete a lot that has bids.
  const { data, error } = await supabase.from("lots").delete().eq("id", lotId).select("id");
  if (error || !data?.length) return fail("Видалити можна лише лот без ставок.");
  if (images?.length) await supabase.storage.from(LOTS_BUCKET).remove(images.map((i) => i.path));
  revalidatePath("/", "layout");
  redirect("/admin/lots");
}

// ---------------------------------------------------------------- photos

export async function addPhoto(lotId: string, path: string, width: number, height: number): Promise<ActionState> {
  await requireAdmin();
  if (!path.startsWith(`${lotId}/`)) return fail("Невірний шлях до фото.");
  const supabase = await createClient();
  const { data: last } = await supabase.from("lot_images").select("sort_order").eq("lot_id", lotId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("lot_images").insert({ lot_id: lotId, path, width, height, sort_order: (last?.sort_order ?? -1) + 1 });
  if (error) {
    await supabase.storage.from(LOTS_BUCKET).remove([path]);
    return fail("Не вдалося додати фото.");
  }
  revalidatePath("/", "layout");
  return ok("Фото додано.");
}

export async function reorderPhotos(lotId: string, ids: string[]): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const results = await Promise.all(ids.map((id, i) => supabase.from("lot_images").update({ sort_order: i }).eq("id", id).eq("lot_id", lotId)));
  if (results.some((r) => r.error)) return fail("Не вдалося змінити порядок.");
  revalidatePath("/", "layout");
  return ok("Порядок збережено.");
}

export async function deletePhoto(imageId: string, _?: ActionState, __?: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("lot_images").delete().eq("id", imageId).select("lot_id, path").single();
  if (error || !data) return fail("Не вдалося видалити фото.");
  await supabase.storage.from(LOTS_BUCKET).remove([data.path]);
  revalidatePath("/", "layout");
  return ok("Фото видалено.");
}

// ---------------------------------------------------------------- bids and people

export async function cancelBid(bidId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_bid", { p_bid_id: bidId, p_reason: text(form, "reason") });
  if (error) return fail("Не вдалося скасувати ставку.");
  revalidatePath("/", "layout");
  return ok("Ставку скасовано, ціну лота перераховано.");
}

export async function setBlocked(userId: string, blocked: boolean, _?: ActionState, __?: FormData): Promise<ActionState> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_blocked", { p_user_id: userId, p_blocked: blocked });
  if (error) return fail("Не вдалося змінити статус учасника.");
  revalidatePath("/", "layout");
  return ok(blocked ? "Учасника заблоковано." : "Учасника розблоковано.");
}

export async function setRole(userId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const role = text(form, "role") as Role;
  if (!["participant", "moderator", "admin"].includes(role)) return fail("Оберіть роль.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role });
  if (error) return fail(error.message === "cannot_change_own_role" ? "Свою роль змінити не можна." : "Не вдалося змінити роль.");
  revalidatePath("/", "layout");
  return ok("Роль змінено.");
}

// ---------------------------------------------------------------- settings and donations

const url = (value: string) => {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
};

export async function saveSettings(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const values = {
    goal_amount: int(form, "goal_amount"),
    max_bid_amount: int(form, "max_bid_amount"),
    min_seconds_between_bids: int(form, "min_seconds_between_bids"),
    donate_url: url(text(form, "donate_url")),
    stream_url: url(text(form, "stream_url")),
    final_published: form.get("final_published") === "on",
  };
  const fields: Record<string, string> = {};
  if (!(values.goal_amount >= 0 && values.goal_amount <= MAX_UAH)) fields.goal_amount = "Ціле число гривень.";
  if (!(values.max_bid_amount > 0 && values.max_bid_amount <= MAX_UAH)) fields.max_bid_amount = "Ціле число гривень, більше 0.";
  if (!(values.min_seconds_between_bids >= 0 && values.min_seconds_between_bids <= 3600)) fields.min_seconds_between_bids = "Від 0 до 3600 секунд.";
  if (values.donate_url === undefined) fields.donate_url = "Повне посилання, що починається з https://";
  if (values.stream_url === undefined) fields.stream_url = "Повне посилання, що починається з https://";
  if (Object.keys(fields).length) return fail("Перевірте виділені поля.", fields);

  const supabase = await createClient();
  const { error } = await supabase.from("settings").update(values).eq("id", true);
  if (error) return fail("Не вдалося зберегти налаштування.");
  revalidatePath("/", "layout");
  return ok("Налаштування збережено.");
}

export async function addDonation(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const amount = int(form, "amount");
  if (!(amount > 0 && amount <= MAX_UAH)) return fail("Вкажіть суму в гривнях.", { amount: "Ціле число, більше 0." });
  const supabase = await createClient();
  const { error } = await supabase.from("donations").insert({ amount, note: text(form, "note").slice(0, 200) || null });
  if (error) return fail("Не вдалося додати донат.");
  revalidatePath("/", "layout");
  return ok("Донат додано до лічильника.");
}

export async function deleteDonation(id: string, _?: ActionState, __?: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("donations").delete().eq("id", id);
  if (error) return fail("Не вдалося видалити донат.");
  revalidatePath("/", "layout");
  return ok("Донат видалено.");
}

// ---------------------------------------------------------------- the live show

/** Puts a lot on air. A closed lot shows its winner again. */
export async function showLot(lotId: string, _?: ActionState, __?: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: target } = await supabase.from("lots").select("status").eq("id", lotId).maybeSingle();
  if (!target || target.status === "draft") return fail("Чернетку не можна показати: спершу зробіть лот активним.");
  const { error } = await supabase.from("settings").update({ current_lot_id: lotId }).eq("id", true);
  if (error) return fail("Не вдалося показати лот.");
  revalidatePath("/", "layout");
  return ok("Лот в ефірі.");
}

/** Closes the lot on air: bidding stops and everyone sees the winner. */
export async function finishLot(_?: ActionState, __?: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: s } = await supabase.from("settings").select("current_lot_id").single();
  if (!s?.current_lot_id) return fail("Зараз жоден лот не в ефірі.");
  const { data, error } = await supabase.from("lots").update({ status: "closed" }).eq("id", s.current_lot_id).eq("status", "active").select("id");
  if (error || !data?.length) return fail("Лот уже завершено.");
  revalidatePath("/", "layout");
  return ok("Лот завершено, переможця показано.");
}

/** The next active lot in show order after the one on air; none left ends the show. */
export async function nextLot(_?: ActionState, __?: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: s }, { data: queue }] = await Promise.all([
    supabase.from("settings").select("current_lot_id").single(),
    supabase.from("lots").select("id, status").neq("status", "draft").order("sort_order").order("created_at"),
  ]);
  const list = queue ?? [];
  const from = list.findIndex((l) => l.id === s?.current_lot_id);
  const next = list.slice(from + 1).find((l) => l.status === "active") ?? list.find((l) => l.status === "active" && l.id !== s?.current_lot_id);
  const { error } = await supabase.from("settings").update({ current_lot_id: next?.id ?? null }).eq("id", true);
  if (error) return fail("Не вдалося перейти до наступного лота.");
  revalidatePath("/", "layout");
  return ok(next ? "Наступний лот в ефірі." : "Активних лотів більше немає: показуємо екран очікування.");
}

/** Takes everything off air: viewers see the waiting screen. */
export async function pauseShow(_?: ActionState, __?: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("settings").update({ current_lot_id: null }).eq("id", true);
  if (error) return fail("Не вдалося поставити паузу.");
  revalidatePath("/", "layout");
  return ok("Пауза: глядачі бачать екран очікування.");
}

const BID_ERRORS: Record<string, string> = {
  amount_too_low: "Сума замала. Мінімальна ставка зараз {min}.",
  amount_too_high: "Сума більша за максимальну в налаштуваннях.",
  lot_not_live: "Цей лот зараз не в ефірі.",
  lot_closed: "Лот уже завершено.",
  lot_not_found: "Лот не знайдено.",
  name_required: "Вкажіть ім'я учасника.",
  forbidden: "Додавати ставки можуть лише адміністратори.",
};

/** A bid from the room or by phone, under the bidder's name. */
export async function addManualBid(lotId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = text(form, "name").replace(/\s+/g, " ");
  const phone = text(form, "phone");
  const amount = int(form, "amount");
  const fields: Record<string, string> = {};
  if (name.length < 2) fields.name = "Ім'я та прізвище.";
  if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone)) fields.phone = "Наприклад +380 50 123 45 67.";
  if (!(amount > 0)) fields.amount = "Ціле число гривень.";
  // The same key on a retry, so a resent form never adds the bid twice; a new one after success.
  const key = text(form, "client_key");
  if (Object.keys(fields).length) return { ...fail("Перевірте виділені поля.", fields), next: key };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_add_bid", { p_lot_id: lotId, p_amount: amount, p_name: name, p_phone: phone || null, p_client_key: key });
  if (error) {
    const message = (BID_ERRORS[error.message] ?? "Не вдалося додати ставку.").replace("{min}", `${error.details} ₴`);
    return { ...fail(message, error.message === "amount_too_low" ? { amount: message } : undefined), next: key };
  }
  revalidatePath("/", "layout");
  return { ...ok(`Ставку ${amount} ₴ від «${name}» додано.`), next: crypto.randomUUID() };
}
