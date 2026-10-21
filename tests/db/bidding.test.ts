import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { as, bid, bidError, createLot, createUser, lot, pool, setSettings, sql } from "./helpers";

beforeEach(() => setSettings({ min_seconds_between_bids: 0, snipe_window_seconds: 300, snipe_extend_seconds: 300, max_bid_amount: 1_000_000 }));
afterAll(() => pool.end());

const secondsUntil = (d: Date) => (d.getTime() - Date.now()) / 1000;

describe("place_bid amounts", () => {
  it("accepts the start price as the first bid and nothing below it", async () => {
    const lotId = await createLot({ startPrice: 1000 });
    const a = await createUser();
    expect(await bidError(a, lotId, 999)).toEqual({ code: "amount_too_low", detail: "1000" });
    await bid(a, lotId, 1000);
    expect(await lot(lotId)).toMatchObject({ current_amount: 1000, bid_count: 1 });
  });

  it("requires the current price plus the lot's step", async () => {
    const lotId = await createLot({ startPrice: 1000, step: 250 });
    const [a, b] = [await createUser(), await createUser()];
    await bid(a, lotId, 1000);
    expect(await bidError(b, lotId, 1249)).toEqual({ code: "amount_too_low", detail: "1250" });
    await bid(b, lotId, 1250);
    expect((await lot(lotId)).current_amount).toBe(1250);
  });

  it("rejects bids above the admin's maximum", async () => {
    await setSettings({ max_bid_amount: 50_000 });
    const lotId = await createLot();
    expect(await bidError(await createUser(), lotId, 50_001)).toEqual({ code: "amount_too_high", detail: "50000" });
  });

  it("stops the leader from outbidding themselves", async () => {
    const lotId = await createLot();
    const a = await createUser();
    await bid(a, lotId, 1000);
    expect((await bidError(a, lotId, 2000)).code).toBe("already_leading");
  });
});

describe("place_bid eligibility", () => {
  it("rejects anonymous visitors, users without a profile and blocked users", async () => {
    const lotId = await createLot();
    expect((await bidError(null, lotId, 1000)).code).toMatch(/permission denied|not_authenticated/);

    const [noProfile] = await sql<{ id: string }>("insert into auth.users (email) values ($1) returning id", [`${randomUUID()}@test.local`]);
    expect((await bidError(noProfile!.id, lotId, 1000)).code).toBe("profile_required");

    expect((await bidError(await createUser({ blocked: true }), lotId, 1000)).code).toBe("user_blocked");
  });

  it("treats draft lots as missing", async () => {
    const lotId = await createLot({ status: "draft" });
    expect((await bidError(await createUser(), lotId, 1000)).code).toBe("lot_not_found");
  });

  it("closes on the server clock even before the cron job has run", async () => {
    const lotId = await createLot({ endsIn: "-1 second" });
    expect((await lot(lotId)).status).toBe("active");
    expect((await bidError(await createUser(), lotId, 1000)).code).toBe("lot_closed");
  });

  it("limits how often one person can bid", async () => {
    await setSettings({ min_seconds_between_bids: 30 });
    const [l1, l2] = [await createLot(), await createLot()];
    const a = await createUser();
    await bid(a, l1, 1000);
    expect(await bidError(a, l2, 1000)).toEqual({ code: "rate_limited", detail: "30" });
  });
});

describe("place_bid reliability", () => {
  it("never creates two bids for the same request", async () => {
    const lotId = await createLot();
    const a = await createUser();
    const key = randomUUID();
    const first = await bid(a, lotId, 1000, key);
    const retry = await bid(a, lotId, 1000, key);
    expect(retry).toMatchObject({ bid_id: first.bid_id, duplicate: true });
    expect((await lot(lotId)).bid_count).toBe(1);
  });

  it("lets exactly one of many simultaneous equal bids win", async () => {
    const lotId = await createLot({ startPrice: 1000 });
    const users = await Promise.all(Array.from({ length: 15 }, () => createUser()));
    const results = await Promise.allSettled(users.map((u) => bid(u, lotId, 1000)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const errors = results.flatMap((r) => (r.status === "rejected" ? [(r.reason as Error).message] : []));
    expect(new Set(errors)).toEqual(new Set(["amount_too_low"]));
    expect(await lot(lotId)).toMatchObject({ current_amount: 1000, bid_count: 1 });
  });

  it("keeps the highest amount when different bids race", async () => {
    const lotId = await createLot({ startPrice: 1000, step: 100 });
    const users = await Promise.all(Array.from({ length: 10 }, () => createUser()));
    await Promise.allSettled(users.map((u, i) => bid(u, lotId, 1000 + i * 100)));
    const [top] = await sql<{ max: number }>("select max(amount) as max from public.bids where lot_id = $1", [lotId]);
    const state = await lot(lotId);
    expect(state.current_amount).toBe(top!.max);
    const [leader] = await sql<{ amount: number }>("select amount from public.bids where id = $1", [state.leading_bid_id]);
    expect(leader!.amount).toBe(top!.max);
  });
});

describe("anti-sniping", () => {
  it("extends a lot to five minutes from now when bid on in its last five minutes", async () => {
    const lotId = await createLot({ endsIn: "2 minutes" });
    await bid(await createUser(), lotId, 1000);
    expect(secondsUntil((await lot(lotId)).ends_at)).toBeGreaterThan(295);
  });

  it("leaves lots with more time alone", async () => {
    const lotId = await createLot({ endsIn: "30 minutes" });
    const before = (await lot(lotId)).ends_at;
    await bid(await createUser(), lotId, 1000);
    expect((await lot(lotId)).ends_at).toEqual(before);
  });

  it("uses the admin's window and extension", async () => {
    await setSettings({ snipe_window_seconds: 600, snipe_extend_seconds: 120 });
    const lotId = await createLot({ endsIn: "1 minute" });
    await bid(await createUser(), lotId, 1000);
    const left = secondsUntil((await lot(lotId)).ends_at);
    expect(left).toBeGreaterThan(115);
    expect(left).toBeLessThan(125);
  });
});

describe("closing", () => {
  it("closes due lots, fixes the winner and queues one 'won' email", async () => {
    const lotId = await createLot({ endsIn: "1 hour" });
    const [a, b] = [await createUser(), await createUser()];
    await bid(a, lotId, 1000);
    const winning = await bid(b, lotId, 1100);
    await sql("update public.lots set ends_at = now() - interval '1 second' where id = $1", [lotId]);

    await sql("select public.close_due_lots()");
    await sql("select public.close_due_lots()");

    expect(await lot(lotId)).toMatchObject({ status: "closed", winner_bid_id: winning.bid_id });
    const mails = await sql("select user_id from public.email_outbox where kind = 'won' and lot_id = $1", [lotId]);
    expect(mails).toEqual([{ user_id: b }]);
  });

  it("queues an 'outbid' email to the previous leader", async () => {
    const lotId = await createLot();
    const [a, b] = [await createUser(), await createUser()];
    await bid(a, lotId, 1000);
    await bid(b, lotId, 1100);
    const mails = await sql("select user_id, payload from public.email_outbox where kind = 'outbid' and lot_id = $1", [lotId]);
    expect(mails).toEqual([{ user_id: a, payload: { amount: 1100, your_amount: 1000 } }]);
  });

  it("reminds every bidder once when a lot has an hour left", async () => {
    const lotId = await createLot({ endsIn: "50 minutes" });
    const [a, b] = [await createUser(), await createUser()];
    await bid(a, lotId, 1000);
    await bid(b, lotId, 1100);
    await sql("select public.queue_ending_soon_emails()");
    await sql("select public.queue_ending_soon_emails()");
    const mails = await sql<{ user_id: string }>("select user_id from public.email_outbox where kind = 'ending_soon' and lot_id = $1", [lotId]);
    expect(mails.map((m) => m.user_id).sort()).toEqual([a, b].sort());
  });
});

describe("staff actions", () => {
  it("lets staff cancel a bid and restores the previous leader", async () => {
    const lotId = await createLot();
    const [a, b, mod] = [await createUser(), await createUser(), await createUser({ role: "moderator" })];
    const first = await bid(a, lotId, 1000);
    const second = await bid(b, lotId, 1500);

    await expect(as(a, "select public.cancel_bid($1, 'nope')", [second.bid_id])).rejects.toThrow("forbidden");
    await as(mod, "select public.cancel_bid($1, 'suspicious')", [second.bid_id]);

    expect(await lot(lotId)).toMatchObject({ current_amount: 1000, bid_count: 1, leading_bid_id: first.bid_id });
    const [log] = await sql("select actor_id, table_name from public.audit_log where row_id = $1", [second.bid_id]);
    expect(log).toEqual({ actor_id: mod, table_name: "bids" });
  });

  it("lets staff block participants but not change roles", async () => {
    const [mod, a] = [await createUser({ role: "moderator" }), await createUser()];
    await as(mod, "select public.set_user_blocked($1, true)", [a]);
    expect((await bidError(a, await createLot(), 1000)).code).toBe("user_blocked");
    await expect(as(mod, "select public.set_user_role($1, 'admin')", [a])).rejects.toThrow("forbidden");
  });
});

describe("access rules", () => {
  it("hides bidders' ids and other people's bids", async () => {
    const lotId = await createLot();
    const [a, b] = [await createUser({ name: "Олена Петренко" }), await createUser({ anonymous: true })];
    await bid(a, lotId, 1000);
    await bid(b, lotId, 1100);

    await expect(as(null, "select * from public.bids")).rejects.toThrow(/permission denied/);
    expect(await as(a, "select user_id from public.bids where lot_id = $1", [lotId])).toEqual([{ user_id: a }]);

    const history = await as(null, "select * from public.bid_history where lot_id = $1 order by amount", [lotId]);
    expect(history.map((h) => h.public_name)).toEqual(["Олена П.", null]);
    expect(Object.keys(history[0]!)).not.toContain("user_id");
  });

  it("does not show draft lots to the public", async () => {
    const lotId = await createLot({ status: "draft" });
    expect(await as(null, "select id from public.lots where id = $1", [lotId])).toEqual([]);
    const admin = await createUser({ role: "admin" });
    expect(await as(admin, "select id from public.lots where id = $1", [lotId])).toHaveLength(1);
  });

  it("blocks direct writes that would skip the bidding rules", async () => {
    const lotId = await createLot();
    const [a, admin] = [await createUser(), await createUser({ role: "admin" })];
    await expect(as(a, "insert into public.bids (lot_id, user_id, amount, client_key) values ($1, $2, 999999, gen_random_uuid())", [lotId, a])).rejects.toThrow(/permission denied/);
    await expect(as(admin, "update public.lots set current_amount = 5 where id = $1", [lotId])).rejects.toThrow(/permission denied/);
    await expect(as(a, "update public.profiles set role = 'admin' where id = $1", [a])).rejects.toThrow(/permission denied/);
    // A participant's content edit is filtered out by RLS rather than erroring.
    await as(a, "update public.lots set title_uk = 'hacked' where id = $1", [lotId]);
    expect((await sql("select title_uk from public.lots where id = $1", [lotId]))[0]).toEqual({ title_uk: "Тестовий лот" });
  });

  it("counts current top bids and donations in the public total", async () => {
    const before = Number((await as(null, "select total_raised from public.auction_stats"))[0]!.total_raised);
    const lotId = await createLot();
    await bid(await createUser(), lotId, 1000);
    await bid(await createUser(), lotId, 1500);
    await sql("insert into public.donations (amount) values (200)");
    const after = Number((await as(null, "select total_raised from public.auction_stats"))[0]!.total_raised);
    expect(after - before).toBe(1700);
  });
});
