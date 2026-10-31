-- Postgres lets PUBLIC execute every new function by default, and a per-schema default
-- (20261023000300) cannot take that away. The live-show functions were therefore callable by
-- anyone; accept_bid in particular would let a caller skip every check in place_bid.
-- Lock them, and change the global default so future functions start private.

revoke all on function
  public.accept_bid(public.lots, integer, uuid, uuid, text, text, uuid),
  public.lock_live_lot(uuid),
  public.short_name(text),
  public.broadcast_show(),
  public.admin_add_bid(uuid, integer, text, text, uuid)
from public, anon, authenticated;

-- The one new entry point: it checks is_admin() itself.
grant execute on function public.admin_add_bid(uuid, integer, text, text, uuid) to authenticated;

alter default privileges revoke execute on functions from public;
