import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { as, bid, bidError, createLot, createUser, errorOf, lot, manualBid, pool, setLive, setSettings, sql } from "./helpers";

beforeEach(() => setSettings({ min_seconds_between_bids: 0, max_bid_amount: 1_000_000 }));
afterAll(() => pool.end());

describe("the lot on air", () => {
  it("accepts bids only on the lot the presenter is showing", async () => {
    const [onAir, queued] = [await createLot(), await createLot({ live: false })];
    const a = await createUser();
    expect((await bidError(a, queued, 1000)).code).toBe("lot_not_live");
    await bid(a, onAir, 1000);

    await setLive(null);
    expect((await bidError(await createUser(), onAir, 1100)).code).toBe("lot_not_live");
  });

  it("closing the lot fixes the winner and stops further bids", async () => {
    const lotId = await createLot();
    const [a, b, admin] = [await createUser(), await createUser(), await createUser({ role: "admin" })];
    await bid(a, lotId, 1000);
    const winning = await bid(b, lotId, 1100);

    await as(admin, "update public.lots set status = 'closed' where id = $1", [lotId]);

    expect(await lot(lotId)).toMatchObject({ status: "closed", winner_bid_id: winning.bid_id });
    expect((await bidError(a, lotId, 1200)).code).toBe("lot_closed");
    expect(await sql("select user_id from public.email_outbox where kind = 'won' and lot_id = $1", [lotId])).toEqual([{ user_id: b }]);
  });

  it("lets admins switch the lot on air and nobody else", async () => {
    const lotId = await createLot({ live: false });
    const [admin, mod] = [await createUser({ role: "admin" }), await createUser({ role: "moderator" })];
    await as(mod, "update public.settings set current_lot_id = $1", [lotId]);
    expect((await sql("select current_lot_id from public.settings"))[0]!.current_lot_id).not.toBe(lotId);
    await as(admin, "update public.settings set current_lot_id = $1", [lotId]);
    expect((await sql("select current_lot_id from public.settings"))[0]!.current_lot_id).toBe(lotId);
  });
});

describe("manual bids", () => {
  it("records a bid from the room under the bidder's name", async () => {
    const lotId = await createLot();
    const admin = await createUser({ role: "admin" });
    const res = await manualBid(admin, lotId, 1000, "Ігор Коваленко", "+380501112233");

    expect(await lot(lotId)).toMatchObject({ current_amount: 1000, bid_count: 1, leading_bid_id: res.bid_id });
    const [row] = await sql("select user_id, public_name, bidder_name, bidder_phone, entered_by from public.bids where id = $1", [res.bid_id]);
    expect(row).toEqual({ user_id: null, public_name: "Ігор К.", bidder_name: "Ігор Коваленко", bidder_phone: "+380501112233", entered_by: admin });
  });

  it("follows the same amount rules as online bids", async () => {
    const lotId = await createLot({ startPrice: 1000, step: 100 });
    const admin = await createUser({ role: "admin" });
    await bid(await createUser(), lotId, 1000);
    expect(await errorOf(manualBid(admin, lotId, 1050, "Ігор Коваленко"))).toEqual({ code: "amount_too_low", detail: "1100" });
    await manualBid(admin, lotId, 1100, "Ігор Коваленко");
    // An online bidder must now beat the room.
    expect(await bidError(await createUser(), lotId, 1150)).toEqual({ code: "amount_too_low", detail: "1200" });
  });

  it("is admin-only, needs a name and only works on the lot on air", async () => {
    const [onAir, queued] = [await createLot(), await createLot({ live: false })];
    const [admin, mod, a] = [await createUser({ role: "admin" }), await createUser({ role: "moderator" }), await createUser()];
    expect((await errorOf(manualBid(mod, onAir, 1000, "Ігор Коваленко"))).code).toBe("forbidden");
    expect((await errorOf(manualBid(a, onAir, 1000, "Ігор Коваленко"))).code).toBe("forbidden");
    expect((await errorOf(manualBid(admin, onAir, 1000, " "))).code).toBe("name_required");
    expect((await errorOf(manualBid(admin, queued, 1000, "Ігор Коваленко"))).code).toBe("lot_not_live");
  });

  it("never records the same form twice", async () => {
    const lotId = await createLot();
    const admin = await createUser({ role: "admin" });
    const key = randomUUID();
    const first = await manualBid(admin, lotId, 1000, "Ігор Коваленко", null, key);
    const retry = await manualBid(admin, lotId, 1000, "Ігор Коваленко", null, key);
    expect(retry).toMatchObject({ bid_id: first.bid_id, duplicate: true });
    expect((await lot(lotId)).bid_count).toBe(1);
  });

  it("emails the online bidder it outbids, and nobody when the room is outbid", async () => {
    const lotId = await createLot();
    const [a, admin] = [await createUser(), await createUser({ role: "admin" })];
    await bid(a, lotId, 1000);
    await manualBid(admin, lotId, 1100, "Ігор Коваленко");
    await bid(await createUser(), lotId, 1200);
    const mails = await sql("select user_id from public.email_outbox where kind = 'outbid' and lot_id = $1", [lotId]);
    expect(mails).toEqual([{ user_id: a }]);
  });

  it("can be cancelled like any bid", async () => {
    const lotId = await createLot();
    const admin = await createUser({ role: "admin" });
    const first = await bid(await createUser(), lotId, 1000);
    const manual = await manualBid(admin, lotId, 1100, "Ігор Коваленко");
    await as(admin, "select public.cancel_bid($1, 'mistake')", [manual.bid_id]);
    expect(await lot(lotId)).toMatchObject({ current_amount: 1000, leading_bid_id: first.bid_id });
  });

  it("shows room bidders in the admin views, with the phone for admins only", async () => {
    const lotId = await createLot();
    const [admin, mod] = [await createUser({ role: "admin" }), await createUser({ role: "moderator" })];
    await manualBid(admin, lotId, 1000, "Ігор Коваленко", "+380501112233");
    expect(await as(admin, "select bidder_name, bidder_phone, is_manual from public.admin_bids where lot_id = $1", [lotId]))
      .toEqual([{ bidder_name: "Ігор Коваленко", bidder_phone: "+380501112233", is_manual: true }]);
    expect(await as(mod, "select bidder_phone from public.admin_bids where lot_id = $1", [lotId])).toEqual([{ bidder_phone: null }]);
  });
});

describe("the winner reveal", () => {
  it("shows the winner's full name once the lot is closed, and not before", async () => {
    const lotId = await createLot();
    const admin = await createUser({ role: "admin" });
    await bid(await createUser({ name: "Олена Петренко" }), lotId, 1000);
    expect(await as(null, "select * from public.lot_winners where lot_id = $1", [lotId])).toEqual([]);

    await as(admin, "update public.lots set status = 'closed' where id = $1", [lotId]);
    expect(await as(null, "select winner_name, amount from public.lot_winners where lot_id = $1", [lotId])).toEqual([{ winner_name: "Олена Петренко", amount: 1000 }]);
  });

  it("works for room winners, who also appear in the winners export with their phone", async () => {
    const lotId = await createLot();
    const admin = await createUser({ role: "admin" });
    await manualBid(admin, lotId, 1000, "Ігор Коваленко", "+380501112233");
    await as(admin, "update public.lots set status = 'closed' where id = $1", [lotId]);

    expect(await as(null, "select winner_name from public.lot_winners where lot_id = $1", [lotId])).toEqual([{ winner_name: "Ігор Коваленко" }]);
    expect(await as(admin, "select full_name, phone, email, is_manual from public.admin_winners where lot_id = $1", [lotId]))
      .toEqual([{ full_name: "Ігор Коваленко", phone: "+380501112233", email: null, is_manual: true }]);
    expect(await sql("select count(*)::int as n from public.email_outbox where kind = 'won' and lot_id = $1", [lotId])).toEqual([{ n: 0 }]);
  });
});
