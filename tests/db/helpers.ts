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

type LotOpts = { startPrice?: number; step?: number; endsIn?: string; status?: "draft" | "active" | "closed" };

export async function createLot(opts: LotOpts = {}) {
  const [lot] = await sql<{ id: string }>(
    `insert into public.lots (slug, title_uk, start_price, bid_step, ends_at, status)
     values ($1, 'Тестовий лот', $2, $3, now() + $4::interval, $5) returning id`,
    [`lot-${randomUUID().slice(0, 8)}`, opts.startPrice ?? 1000, opts.step ?? 100, opts.endsIn ?? "1 day", opts.status ?? "active"],
  );
  return lot!.id;
}

export async function bid(uid: string, lotId: string, amount: number, key: string = randomUUID()) {
  const [row] = await as<{ r: { bid_id: string; amount: number; duplicate: boolean; lot: { ends_at: string; current_amount: number } } }>(
    uid,
    "select public.place_bid($1, $2, $3) as r",
    [lotId, amount, key],
  );
  return row!.r;
}

/** Resolves to the error code place_bid raised, e.g. "amount_too_low". */
export async function bidError(uid: string | null, lotId: string, amount: number) {
  try {
    await as(uid, "select public.place_bid($1, $2, $3)", [lotId, amount, randomUUID()]);
  } catch (e) {
    const err = e as { message: string; detail?: string };
    return { code: err.message, detail: err.detail };
  }
  throw new Error("expected place_bid to fail");
}

export async function lot(id: string) {
  const [row] = await sql<{ status: string; current_amount: number | null; bid_count: number; ends_at: Date; leading_bid_id: string | null; winner_bid_id: string | null }>(
    "select * from public.lots where id = $1",
    [id],
  );
  return row!;
}

export const setSettings = (values: Record<string, number>) =>
  sql(`update public.settings set ${Object.keys(values).map((k, i) => `${k} = $${i + 1}`).join(", ")}`, Object.values(values));
