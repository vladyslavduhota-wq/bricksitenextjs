-- Lots may start at 0 ₴. The first bid must then be at least one step (bids of 0 are not allowed).

alter table public.lots drop constraint lots_start_price_check;
alter table public.lots add constraint lots_start_price_check check (start_price >= 0);

create or replace function public.accept_bid(
  p_lot public.lots, p_amount integer, p_user_id uuid, p_client_key uuid,
  p_bidder_name text, p_bidder_phone text, p_entered_by uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_max integer := (select max_bid_amount from public.settings);
  -- A lot can start at 0; its first bid is then at least one step.
  v_min integer := coalesce(p_lot.current_amount + p_lot.bid_step, greatest(p_lot.start_price, p_lot.bid_step));
  v_prev public.bids;
  v_bid public.bids;
  v_lot public.lots;
begin
  if p_amount is null or p_amount < v_min then
    raise exception 'amount_too_low' using errcode = 'P0001', detail = v_min::text;
  end if;
  if p_amount > v_max then
    raise exception 'amount_too_high' using errcode = 'P0001', detail = v_max::text;
  end if;
  if p_lot.leading_bid_id is not null then
    select * into v_prev from public.bids where id = p_lot.leading_bid_id;
  end if;

  insert into public.bids (lot_id, user_id, amount, public_name, client_key, bidder_name, bidder_phone, entered_by, created_at)
  values (
    p_lot.id, p_user_id, p_amount,
    public.short_name(coalesce(p_bidder_name, (select full_name from public.profiles where id = p_user_id))),
    p_client_key, p_bidder_name, p_bidder_phone, p_entered_by, clock_timestamp()
  )
  returning * into v_bid;

  update public.lots set current_amount = p_amount, bid_count = bid_count + 1, leading_bid_id = v_bid.id
  where id = p_lot.id
  returning * into v_lot;

  -- Only people with an account get the "outbid" email.
  if v_prev.user_id is not null and v_prev.user_id is distinct from p_user_id then
    insert into public.email_outbox (user_id, kind, lot_id, payload)
    values (v_prev.user_id, 'outbid', p_lot.id, jsonb_build_object('amount', p_amount, 'your_amount', v_prev.amount));
  end if;

  perform public.broadcast('bid', jsonb_build_object(
    'lot_id', p_lot.id, 'id', v_bid.id, 'amount', v_bid.amount, 'public_name', v_bid.public_name, 'created_at', v_bid.created_at
  ));
  return jsonb_build_object('bid_id', v_bid.id, 'amount', v_bid.amount, 'lot', public.lot_public_payload(v_lot), 'duplicate', false);
end;
$$;
