import { randomUUID } from "node:crypto";
import pg from "pg";
import { testDatabaseUrl } from "./env";

export const pool = new pg.Pool({ connectionString: testDatabaseUrl(), max: 30 });

/** Superuser query: fixtures and assertions that bypass access rules. */
export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []) {
  return (await pool.query<T>(text, params)).rows;
}

/** Runs a query the way Supabase would for a signed-in user (or anon when uid is null), in its own transaction. */
export async function as<T extends pg.QueryResultRow = pg.QueryResultRow>(uid: string | null, text: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${uid ? "authenticated" : "anon"}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(uid ? { sub: uid, role: "authenticated" } : { role: "anon" })]);
    const res = await client.query<T>(text, params);
    await client.query("commit");
    return res.rows;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

type UserOpts = { name?: string; role?: "participant" | "moderator" | "admin"; blocked?: boolean; anonymous?: boolean; nickname?: string };

export async function createUser(opts: UserOpts = {}) {
  const [user] = await sql<{ id: string }>("insert into auth.users (email) values ($1) returning id", [`${randomUUID()}@test.local`]);
  await sql(
    `insert into public.profiles (id, full_name, phone, display_name, show_anonymously, accepted_rules_at, role, is_blocked)
     values ($1, $2, '+380501234567', $3, $4, now(), $5, $6)`,
    [user!.id, opts.name ?? "Тарас Шевченко", opts.nickname ?? null, opts.anonymous ?? false, opts.role ?? "participant", opts.blocked ?? false],
  );
  return user!.id;
}

type LotOpts = { startPrice?: number; step?: number; status?: "draft" | "active" | "closed"; live?: boolean };

/** A lot, put on air by default (bids are only accepted on the lot on air). */
export async function createLot(opts: LotOpts = {}) {
  const [lot] = await sql<{ id: string }>(
    `insert into public.lots (slug, title_uk, start_price, bid_step, status)
     values ($1, 'Тестовий лот', $2, $3, $4) returning id`,
    [`lot-${randomUUID().slice(0, 8)}`, opts.startPrice ?? 1000, opts.step ?? 100, opts.status ?? "active"],
  );
  if (opts.live ?? true) await setLive(lot!.id);
  return lot!.id;
}

/** Puts a lot on air, or takes everything off air with null. */
export const setLive = (lotId: string | null) => sql("update public.settings set current_lot_id = $1", [lotId]);

type BidResult = { bid_id: string; amount: number; duplicate: boolean; lot: { current_amount: number } };

export async function bid(uid: string, lotId: string, amount: number, key: string = randomUUID()) {
  const [row] = await as<{ r: BidResult }>(
    uid,
    "select public.place_bid($1, $2, $3) as r",
    [lotId, amount, key],
  );
  return row!.r;
}

/** A bid an admin enters for someone in the room or on the phone. */
export async function manualBid(adminId: string, lotId: string, amount: number, name: string, phone: string | null = null, key: string = randomUUID()) {
  const [row] = await as<{ r: BidResult }>(adminId, "select public.admin_add_bid($1, $2, $3, $4, $5) as r", [lotId, amount, name, phone, key]);
  return row!.r;
}

/** Resolves to the error code a query raised, e.g. "amount_too_low". */
export async function errorOf(run: Promise<unknown>) {
  try {
    await run;
  } catch (e) {
    const err = e as { message: string; detail?: string };
    return { code: err.message, detail: err.detail };
  }
  throw new Error("expected the query to fail");
}

export const bidError = (uid: string | null, lotId: string, amount: number) =>
  errorOf(as(uid, "select public.place_bid($1, $2, $3)", [lotId, amount, randomUUID()]));

export async function lot(id: string) {
  const [row] = await sql<{ status: string; current_amount: number | null; bid_count: number; leading_bid_id: string | null; winner_bid_id: string | null }>(
    "select * from public.lots where id = $1",
    [id],
  );
  return row!;
}

export const setSettings = (values: Record<string, number>) =>
  sql(`update public.settings set ${Object.keys(values).map((k, i) => `${k} = $${i + 1}`).join(", ")}`, Object.values(values));
