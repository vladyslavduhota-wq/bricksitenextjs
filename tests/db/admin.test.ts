import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { as, bid, createLot, createUser, lot, pool, setSettings, sql } from "./helpers";

beforeEach(() => setSettings({ min_seconds_between_bids: 0 }));
afterAll(() => pool.end());

describe("admin views", () => {
  it("show contacts to admins only and nothing to participants", async () => {
    const [admin, mod, a] = [await createUser({ role: "admin" }), await createUser({ role: "moderator" }), await createUser()];
    const lotId = await createLot();
    await bid(a, lotId, 1000);

    const asAdmin = await as(admin, "select email, phone from public.admin_users where id = $1", [a]);
    expect(asAdmin[0]!.email).toMatch(/@test\.local$/);
    expect(asAdmin[0]!.phone).toBe("+380501234567");

    expect(await as(mod, "select email, phone from public.admin_users where id = $1", [a])).toEqual([{ email: null, phone: null }]);
    expect(await as(mod, "select bidder_email from public.admin_bids where lot_id = $1", [lotId])).toEqual([{ bidder_email: null }]);

    for (const view of ["admin_users", "admin_bids", "admin_winners", "admin_audit"]) {
      expect(await as(a, `select * from public.${view}`)).toEqual([]);
    }
    expect(await as(mod, "select * from public.admin_winners")).toEqual([]);
    await expect(as(null, "select * from public.admin_users")).rejects.toThrow(/permission denied/);
  });

  it("lists each lot's leader with contacts for the winners export", async () => {
    const admin = await createUser({ role: "admin" });
    const [a, b] = [await createUser(), await createUser({ name: "Марія Коваль" })];
    const lotId = await createLot();
    await bid(a, lotId, 1000);
    await bid(b, lotId, 1200);
    const [row] = await as(admin, "select amount, full_name, phone, lot_status from public.admin_winners where lot_id = $1", [lotId]);
    expect(row).toEqual({ amount: 1200, full_name: "Марія Коваль", phone: "+380501234567", lot_status: "active" });
  });
});

describe("admin lot management", () => {
  it("closing a lot early fixes the current leader as winner and logs who did it", async () => {
    const admin = await createUser({ role: "admin" });
    const lotId = await createLot();
    const winning = await bid(await createUser(), lotId, 1000);

    await as(admin, "update public.lots set status = 'closed' where id = $1", [lotId]);

    expect(await lot(lotId)).toMatchObject({ status: "closed", winner_bid_id: winning.bid_id });
    const [log] = await as(admin, "select actor_id, action from public.admin_audit where row_id = $1 and new_data ->> 'status' = 'closed'", [lotId]);
    expect(log).toEqual({ actor_id: admin, action: "update" });
  });

  it("reopening a closed lot clears the winner", async () => {
    const admin = await createUser({ role: "admin" });
    const lotId = await createLot();
    await bid(await createUser(), lotId, 1000);
    await as(admin, "update public.lots set status = 'closed' where id = $1", [lotId]);
    await as(admin, "update public.lots set status = 'active', ends_at = now() + interval '1 day' where id = $1", [lotId]);
    expect(await lot(lotId)).toMatchObject({ status: "active", winner_bid_id: null });
  });

  it("lets admins delete only lots without bids", async () => {
    const admin = await createUser({ role: "admin" });
    const [empty, withBids] = [await createLot(), await createLot()];
    await bid(await createUser(), withBids, 1000);
    await as(admin, "delete from public.lots where id = any($1)", [[empty, withBids]]);
    const left = await sql<{ id: string }>("select id from public.lots where id = any($1)", [[empty, withBids]]);
    expect(left.map((r) => r.id)).toEqual([withBids]);
  });

  it("lets admins change settings and nobody else", async () => {
    const [admin, mod] = [await createUser({ role: "admin" }), await createUser({ role: "moderator" })];
    await as(mod, "update public.settings set goal_amount = 1");
    expect((await sql("select goal_amount from public.settings"))[0]).toEqual({ goal_amount: 0 });
    await as(admin, "update public.settings set goal_amount = 500000");
    expect((await sql("select goal_amount from public.settings"))[0]).toEqual({ goal_amount: 500000 });
    await sql("update public.settings set goal_amount = 0");
  });
});
