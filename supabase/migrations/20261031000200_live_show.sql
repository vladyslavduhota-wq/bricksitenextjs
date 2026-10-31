-- Live show: lots are presented one at a time. The presenter puts a lot on air, closes it
-- (the winner is revealed) and moves on. Bids are accepted only on the lot that is on air.
-- Bids from the room or by phone are entered by an admin under the bidder's name.

-- ---------------------------------------------------------------- no more clocks

drop function public.close_due_lots();
drop function public.queue_ending_soon_emails();
alter table public.lots drop column reminder_sent_at;
alter table public.lots alter column ends_at drop not null;
alter table public.settings drop column snipe_window_seconds, drop column snipe_extend_seconds;

-- ---------------------------------------------------------------- the lot on air

alter table public.settings add column current_lot_id uuid references public.lots (id) on delete set null;
grant update (current_lot_id) on public.settings to authenticated;

-- Every browser switches lots when the presenter does.
create function public.broadcast_show() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.broadcast('show', jsonb_build_object('current_lot_id', new.current_lot_id));
  return null;
end;
$$;
create trigger settings_show after update of current_lot_id on public.settings
  for each row when (old.current_lot_id is distinct from new.current_lot_id) execute function public.broadcast_show();

-- ---------------------------------------------------------------- manual bids

alter table public.bids
  alter column user_id drop not null,
  add column bidder_name text check (bidder_name is null or char_length(btrim(bidder_name)) between 2 and 100),
  add column bidder_phone text check (bidder_phone is null or bidder_phone ~ '^\+?[0-9 ()-]{7,20}$'),
  add column entered_by uuid references public.profiles (id),
  add constraint bids_has_bidder check (user_id is not null or bidder_name is not null);
-- A retried admin form never creates the bid twice.
create unique index bids_manual_client_key on public.bids (entered_by, client_key) where user_id is null;

-- ---------------------------------------------------------------- bidding

-- "Taras Shevchenko" -> "Taras S.": the only name the public ever sees.
create function public.short_name(p_full text) returns text
language sql immutable as $$
  select case
    when split_part(btrim(p_full), ' ', 2) = '' then btrim(p_full)
    else split_part(btrim(p_full), ' ', 1) || ' ' || left(split_part(btrim(p_full), ' ', 2), 1) || '.'
  end
$$;

-- Shared by place_bid and admin_add_bid: the lot is already locked and confirmed on air.
create function public.accept_bid(
  p_lot public.lots, p_amount integer, p_user_id uuid, p_client_key uuid,
  p_bidder_name text, p_bidder_phone text, p_entered_by uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_max integer := (select max_bid_amount from public.settings);
  v_min integer := coalesce(p_lot.current_amount + p_lot.bid_step, p_lot.start_price);
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

-- Locks the lot and checks it can take bids right now.
create function public.lock_live_lot(p_lot_id uuid) returns public.lots
language plpgsql security definer set search_path = '' as $$
declare
  v_lot public.lots;
begin
  select * into v_lot from public.lots where id = p_lot_id for update;
  if not found or v_lot.status = 'draft' then
    raise exception 'lot_not_found' using errcode = 'P0001';
  end if;
  if v_lot.status = 'closed' then
    raise exception 'lot_closed' using errcode = 'P0001';
  end if;
  -- Read after the lock, so a lot taken off air a moment ago is seen as such.
  if v_lot.id is distinct from (select current_lot_id from public.settings) then
    raise exception 'lot_not_live' using errcode = 'P0001';
  end if;
  return v_lot;
end;
$$;

create or replace function public.place_bid(p_lot_id uuid, p_amount integer, p_client_key uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_bid public.bids;
  v_lot public.lots;
  v_pause integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'profile_required' using errcode = 'P0001';
  end if;
  if v_profile.is_blocked then
    raise exception 'user_blocked' using errcode = 'P0001';
  end if;

  -- A retried request returns the bid it already created.
  select * into v_bid from public.bids where user_id = v_uid and client_key = p_client_key;
  if found then
    select * into v_lot from public.lots where id = v_bid.lot_id;
    return jsonb_build_object('bid_id', v_bid.id, 'amount', v_bid.amount, 'lot', public.lot_public_payload(v_lot), 'duplicate', true);
  end if;

  v_lot := public.lock_live_lot(p_lot_id);

  select min_seconds_between_bids into v_pause from public.settings;
  if exists (select 1 from public.bids where user_id = v_uid and created_at > clock_timestamp() - make_interval(secs => v_pause)) then
    raise exception 'rate_limited' using errcode = 'P0001', detail = v_pause::text;
  end if;
  if exists (select 1 from public.bids where id = v_lot.leading_bid_id and user_id = v_uid) then
    raise exception 'already_leading' using errcode = 'P0001';
  end if;

  return public.accept_bid(v_lot, p_amount, v_uid, p_client_key, null, null, null);
end;
$$;

-- Bids from the room or by phone, entered by an admin. Same amount rules as online bids.
create function public.admin_add_bid(p_lot_id uuid, p_amount integer, p_name text, p_phone text, p_client_key uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(btrim(p_name), '');
  v_bid public.bids;
  v_lot public.lots;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_name is null or char_length(v_name) < 2 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  select * into v_bid from public.bids where entered_by = v_uid and client_key = p_client_key and user_id is null;
  if found then
    select * into v_lot from public.lots where id = v_bid.lot_id;
    return jsonb_build_object('bid_id', v_bid.id, 'amount', v_bid.amount, 'lot', public.lot_public_payload(v_lot), 'duplicate', true);
  end if;

  v_lot := public.lock_live_lot(p_lot_id);
  return public.accept_bid(v_lot, p_amount, null, p_client_key, v_name, nullif(btrim(p_phone), ''), v_uid);
end;
$$;

grant execute on function public.admin_add_bid(uuid, integer, text, text, uuid) to authenticated;
-- accept_bid, lock_live_lot and short_name stay internal: no grants.

-- The winner email goes only to winners with an account.
create or replace function public.queue_winner_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' and new.winner_bid_id is not null then
    insert into public.email_outbox (user_id, kind, lot_id, payload, dedupe_key)
    select b.user_id, 'won', new.id, jsonb_build_object('amount', b.amount), 'won:' || new.id
    from public.bids b where b.id = new.winner_bid_id and b.user_id is not null
    on conflict (dedupe_key) do nothing;
  end if;
  if row(new.status, new.ends_at, new.current_amount, new.bid_count) is distinct from row(old.status, old.ends_at, old.current_amount, old.bid_count) then
    perform public.broadcast('lot', public.lot_public_payload(new));
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------- sign-up without nickname, anonymity or photo consent

revoke insert (display_name, show_anonymously, photo_consent), update (display_name, show_anonymously, photo_consent) on public.profiles from authenticated;

-- ---------------------------------------------------------------- admin views with manual bidders

drop view public.admin_bids;
create view public.admin_bids with (security_invoker = false) as
  select
    b.id,
    b.lot_id,
    l.title_uk as lot_title,
    l.slug as lot_slug,
    b.amount,
    b.status,
    b.created_at,
    b.public_name,
    b.user_id,
    coalesce(p.full_name, b.bidder_name) as bidder_name,
    case when public.is_admin() then u.email end as bidder_email,
    case when public.is_admin() then coalesce(p.phone, b.bidder_phone) end as bidder_phone,
    coalesce(p.is_blocked, false) as bidder_blocked,
    b.user_id is null as is_manual,
    l.leading_bid_id = b.id as is_leading,
    b.cancelled_at,
    b.cancel_reason
  from public.bids b
  join public.lots l on l.id = b.lot_id
  left join public.profiles p on p.id = b.user_id
  left join auth.users u on u.id = b.user_id
  where public.is_staff();

drop view public.admin_winners;
create view public.admin_winners with (security_invoker = false) as
  select
    l.id as lot_id,
    l.title_uk as lot_title,
    l.slug as lot_slug,
    l.status as lot_status,
    l.closed_at,
    l.bid_count,
    b.amount,
    b.created_at as bid_at,
    coalesce(p.full_name, b.bidder_name) as full_name,
    u.email,
    coalesce(p.phone, b.bidder_phone) as phone,
    b.user_id is null as is_manual
  from public.lots l
  join public.bids b on b.id = coalesce(l.winner_bid_id, l.leading_bid_id)
  left join public.profiles p on p.id = b.user_id
  left join auth.users u on u.id = b.user_id
  where l.status <> 'draft' and public.is_admin();

grant select on public.admin_bids, public.admin_winners to authenticated;

-- ---------------------------------------------------------------- the winner reveal

-- Full name of each closed lot's winner, shown on the stream and the site when the lot ends.
-- Only closed lots: while bidding is open everyone appears as "Taras S.".
create view public.lot_winners with (security_invoker = false) as
  select l.id as lot_id, b.amount, coalesce(p.full_name, b.bidder_name) as winner_name
  from public.lots l
  join public.bids b on b.id = l.winner_bid_id
  left join public.profiles p on p.id = b.user_id
  where l.status = 'closed';

grant select on public.lot_winners to anon, authenticated;
