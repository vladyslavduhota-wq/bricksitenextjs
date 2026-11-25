import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { as, bid, bidError, createLot, createUser, errorOf, lot, manualBid, pool, setLive, setSettings, sql } from "./helpers";

beforeEach(() => setSettings({ min_seconds_between_bids: 0, max_bid_amount: 1_000_000 }));
afterAll(() => pool.end());

const reset = (uid: string | null) => as<{ n: number }>(uid, "select public.reset_show() as n");

describe("reset_show", () => {
  it("is for admins only and changes nothing for others", async () => {
    const lotId = await createLot();
    const [a, mod] = [await createUser(), await createUser({ role: "moderator" })];
    await bid(a, lotId, 1000);
    expect((await errorOf(reset(a))).code).toBe("forbidden");
    expect((await errorOf(reset(mod))).code).toBe("forbidden");
    expect((await errorOf(reset(null))).code).toMatch(/permission denied/);
    expect(await lot(lotId)).toMatchObject({ bid_count: 1, current_amount: 1000 });
  });

  it("clears the screen, cancels bids, reopens closed lots and leaves drafts alone", async () => {
    const [admin, a] = [await createUser({ role: "admin" }), await createUser()];
    const sold = await createLot();
    const draft = await createLot({ status: "draft", live: false });
    await setLive(sold);
    await bid(a, sold, 1000);
    await manualBid(admin, sold, 1200, "Олена Петренко");
    await sql("update public.lots set status = 'closed' where id = $1", [sold]);
    const open = await createLot();
    await bid(a, open, 1500);

    await reset(admin);

    expect(await sql("select current_lot_id from public.settings")).toEqual([{ current_lot_id: null }]);
    for (const id of [sold, open])
      expect(await lot(id)).toMatchObject({ status: "active", current_amount: null, bid_count: 0, leading_bid_id: null, winner_bid_id: null });
    expect((await lot(draft)).status).toBe("draft");
    const bids = await sql("select distinct status, cancelled_by from public.bids where lot_id = any($1)", [[sold, open]]);
    expect(bids).toEqual([{ status: "cancelled", cancelled_by: admin }]);
    expect((await bidError(a, open, 1000)).code).toBe("lot_not_live");
  });

  it("starts over from the start price and emails the real winner even if a rehearsal had one", async () => {
    const [admin, a, b] = [await createUser({ role: "admin" }), await createUser(), await createUser()];
    const lotId = await createLot({ startPrice: 500 });
    await bid(a, lotId, 5000);
    await sql("update public.lots set status = 'closed' where id = $1", [lotId]);
    await reset(admin);
    expect(await sql("select 1 from public.email_outbox where lot_id = $1", [lotId])).toEqual([]);

    await setLive(lotId);
    await bid(b, lotId, 500);
    await sql("update public.lots set status = 'closed' where id = $1", [lotId]);
    expect(await sql("select user_id from public.email_outbox where lot_id = $1 and kind = 'won'", [lotId])).toEqual([{ user_id: b }]);
  });
});
