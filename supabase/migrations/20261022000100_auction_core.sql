-- Auction core: lots, bids, profiles, settings, outbox and audit log.
--
-- Rules that must never be broken live here, not in the app:
--   * bids are only created through place_bid(), which uses the database clock;
--   * a bid must beat the current price by at least the lot's step;
--   * a bid in the last N minutes extends the lot (anti-sniping);
--   * the same client_key never creates two bids.
-- Amounts are whole hryvnias.

-- ---------------------------------------------------------------- types

create type public.lot_status as enum ('draft', 'active', 'closed');
create type public.bid_status as enum ('valid', 'cancelled');
create type public.user_role as enum ('participant', 'moderator', 'admin');

-- ---------------------------------------------------------------- settings

create table public.settings (
  id boolean primary key default true check (id),
  goal_amount integer not null default 0 check (goal_amount >= 0),
  snipe_window_seconds integer not null default 300 check (snipe_window_seconds >= 0),
  snipe_extend_seconds integer not null default 300 check (snipe_extend_seconds >= 0),
  max_bid_amount integer not null default 1000000 check (max_bid_amount > 0),
  min_seconds_between_bids integer not null default 3 check (min_seconds_between_bids >= 0),
  donate_url text,
  stream_url text,
  final_published boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.settings default values;

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 100),
  phone text not null check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  display_name text check (display_name is null or char_length(btrim(display_name)) between 2 and 40),
  show_anonymously boolean not null default false,
  accepted_rules_at timestamptz not null,
  photo_consent boolean not null default false,
  locale text not null default 'uk' check (locale in ('uk', 'en')),
  role public.user_role not null default 'participant',
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- lots

create table public.lots (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_uk text not null check (char_length(btrim(title_uk)) > 0),
  title_en text not null default '',
  description_uk text not null default '',
  description_en text not null default '',
  start_price integer not null check (start_price > 0),
  bid_step integer not null default 100 check (bid_step > 0),
  ends_at timestamptz not null,
  status public.lot_status not null default 'draft',
  sort_order integer not null default 0,
  -- Position on the home-page "table of things": { x, y, rotate, scale }.
  showcase jsonb not null default '{}'::jsonb,
  -- Maintained by place_bid / cancel_bid only.
  current_amount integer,
  bid_count integer not null default 0,
  leading_bid_id uuid,
  winner_bid_id uuid,
  closed_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lot_images (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id) on delete cascade,
  path text not null,
  alt_uk text not null default '',
  alt_en text not null default '',
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index lot_images_lot_idx on public.lot_images (lot_id, sort_order);

-- ---------------------------------------------------------------- bids

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  amount integer not null check (amount > 0),
  -- Name shown in the public history, frozen at bid time; null = anonymous.
  public_name text,
  status public.bid_status not null default 'valid',
  client_key uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id),
  cancel_reason text,
  unique (user_id, client_key)
);
create index bids_lot_rank_idx on public.bids (lot_id, amount desc, created_at) where status = 'valid';
create index bids_user_time_idx on public.bids (user_id, created_at desc);

alter table public.lots
  add constraint lots_leading_bid_fk foreign key (leading_bid_id) references public.bids (id) on delete set null,
  add constraint lots_winner_bid_fk foreign key (winner_bid_id) references public.bids (id) on delete set null;

-- ---------------------------------------------------------------- donations, outbox, audit

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  amount integer not null check (amount > 0),
  note text,
  received_at timestamptz not null default now()
);

create table public.email_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('outbid', 'won', 'ending_soon')),
  lot_id uuid references public.lots (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  -- Stops the same "won" / "ending soon" mail being queued twice.
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0,
  last_error text
);
create index email_outbox_pending_idx on public.email_outbox (created_at) where sent_at is null;

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  table_name text not null,
  row_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_time_idx on public.audit_log (created_at desc);

-- ---------------------------------------------------------------- helpers

create function public.current_role_name() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_role_name() in ('moderator', 'admin'), false)
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_role_name() = 'admin', false)
$$;

-- Supabase Realtime broadcast. A no-op where the realtime schema does not exist (local tests).
create function public.broadcast(p_event text, p_payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is not null then
    execute 'select realtime.send($1, $2, $3, false)' using p_payload, p_event, 'auction';
  end if;
end;
$$;

create function public.lot_public_payload(l public.lots) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'id', l.id, 'status', l.status, 'ends_at', l.ends_at,
    'current_amount', l.current_amount, 'bid_count', l.bid_count
  )
$$;

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger lots_touch before update on public.lots for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();

-- Closing a lot (by cron, by an admin, or by editing status) always fixes the winner.
create function public.lots_on_status_change() returns trigger
language plpgsql as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    new.closed_at := clock_timestamp();
    new.winner_bid_id := new.leading_bid_id;
  elsif new.status <> 'closed' and old.status = 'closed' then
    new.closed_at := null;
    new.winner_bid_id := null;
  end if;
  return new;
end;
$$;
create trigger lots_status_change before update of status on public.lots
  for each row execute function public.lots_on_status_change();

create function public.queue_winner_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' and new.winner_bid_id is not null then
    insert into public.email_outbox (user_id, kind, lot_id, payload, dedupe_key)
    select b.user_id, 'won', new.id, jsonb_build_object('amount', b.amount), 'won:' || new.id
    from public.bids b where b.id = new.winner_bid_id
    on conflict (dedupe_key) do nothing;
  end if;
  if row(new.status, new.ends_at, new.current_amount, new.bid_count) is distinct from row(old.status, old.ends_at, old.current_amount, old.bid_count) then
    perform public.broadcast('lot', public.lot_public_payload(new));
  end if;
  return null;
end;
$$;
create trigger lots_after_update after update on public.lots
  for each row execute function public.queue_winner_email();

-- Audit: everything staff or the system (cron, service role) changes. Participants' own edits are not logged.
create function public.audit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is not null and not public.is_staff() then
    return null;
  end if;
  insert into public.audit_log (actor_id, action, table_name, row_id, old_data, new_data)
  values (
    v_actor, lower(tg_op), tg_table_name,
    coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id'),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end;
$$;
create trigger lots_audit after insert or update or delete on public.lots for each row execute function public.audit_change();
create trigger lot_images_audit after insert or update or delete on public.lot_images for each row execute function public.audit_change();
create trigger settings_audit after update on public.settings for each row execute function public.audit_change();
create trigger donations_audit after insert or update or delete on public.donations for each row execute function public.audit_change();
create trigger profiles_audit after update of role, is_blocked on public.profiles for each row execute function public.audit_change();
create trigger bids_audit after update of status on public.bids for each row execute function public.audit_change();

-- ---------------------------------------------------------------- bidding

create function public.place_bid(p_lot_id uuid, p_amount integer, p_client_key uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz;
  v_profile public.profiles;
  v_settings public.settings;
  v_lot public.lots;
  v_prev public.bids;
  v_bid public.bids;
  v_min integer;
  v_name text;
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

  select * into v_settings from public.settings;

  -- Serialises all bids on this lot.
  select * into v_lot from public.lots where id = p_lot_id for update;
  if not found or v_lot.status = 'draft' then
    raise exception 'lot_not_found' using errcode = 'P0001';
  end if;

  -- clock_timestamp, not now(): now() is when the transaction began, possibly before waiting for the lock.
  v_now := clock_timestamp();
  if v_lot.status = 'closed' or v_now >= v_lot.ends_at then
    raise exception 'lot_closed' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.bids
    where user_id = v_uid and created_at > v_now - make_interval(secs => v_settings.min_seconds_between_bids)
  ) then
    raise exception 'rate_limited' using errcode = 'P0001', detail = v_settings.min_seconds_between_bids::text;
  end if;

  if v_lot.leading_bid_id is not null then
    select * into v_prev from public.bids where id = v_lot.leading_bid_id;
    if v_prev.user_id = v_uid then
      raise exception 'already_leading' using errcode = 'P0001';
    end if;
  end if;

  v_min := coalesce(v_lot.current_amount + v_lot.bid_step, v_lot.start_price);
  if p_amount is null or p_amount < v_min then
    raise exception 'amount_too_low' using errcode = 'P0001', detail = v_min::text;
  end if;
  if p_amount > v_settings.max_bid_amount then
    raise exception 'amount_too_high' using errcode = 'P0001', detail = v_settings.max_bid_amount::text;
  end if;

  -- Nickname if set, otherwise "Taras S." rather than a full name.
  if not v_profile.show_anonymously then
    v_name := nullif(btrim(v_profile.display_name), '');
    if v_name is null then
      v_name := split_part(btrim(v_profile.full_name), ' ', 1);
      if split_part(btrim(v_profile.full_name), ' ', 2) <> '' then
        v_name := v_name || ' ' || left(split_part(btrim(v_profile.full_name), ' ', 2), 1) || '.';
      end if;
    end if;
  end if;

  insert into public.bids (lot_id, user_id, amount, public_name, client_key, created_at)
  values (p_lot_id, v_uid, p_amount, v_name, p_client_key, v_now)
  returning * into v_bid;

  update public.lots set
    current_amount = p_amount,
    bid_count = bid_count + 1,
    leading_bid_id = v_bid.id,
    ends_at = case
      when ends_at - v_now <= make_interval(secs => v_settings.snipe_window_seconds)
        then greatest(ends_at, v_now + make_interval(secs => v_settings.snipe_extend_seconds))
      else ends_at
    end
  where id = p_lot_id
  returning * into v_lot;

  if v_prev.id is not null then
    insert into public.email_outbox (user_id, kind, lot_id, payload)
    values (v_prev.user_id, 'outbid', p_lot_id, jsonb_build_object('amount', p_amount, 'your_amount', v_prev.amount));
  end if;

  perform public.broadcast('bid', jsonb_build_object(
    'lot_id', p_lot_id, 'id', v_bid.id, 'amount', v_bid.amount, 'public_name', v_bid.public_name, 'created_at', v_bid.created_at
  ));

  return jsonb_build_object('bid_id', v_bid.id, 'amount', v_bid.amount, 'lot', public.lot_public_payload(v_lot), 'duplicate', false);
end;
$$;

-- Recomputes price, count and leader from the valid bids that remain.
create function public.recalculate_lot(p_lot_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_lead public.bids;
begin
  select * into v_lead from public.bids
  where lot_id = p_lot_id and status = 'valid'
  order by amount desc, created_at asc
  limit 1;

  update public.lots set
    current_amount = v_lead.amount,
    leading_bid_id = v_lead.id,
    bid_count = (select count(*) from public.bids where lot_id = p_lot_id and status = 'valid'),
    winner_bid_id = case when status = 'closed' then v_lead.id else winner_bid_id end
  where id = p_lot_id;
end;
$$;

create function public.cancel_bid(p_bid_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_bid public.bids;
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select * into v_bid from public.bids where id = p_bid_id;
  if not found then
    raise exception 'bid_not_found' using errcode = 'P0001';
  end if;
  perform 1 from public.lots where id = v_bid.lot_id for update;

  update public.bids
  set status = 'cancelled', cancelled_at = clock_timestamp(), cancelled_by = auth.uid(), cancel_reason = nullif(btrim(p_reason), '')
  where id = p_bid_id and status = 'valid';

  perform public.recalculate_lot(v_bid.lot_id);
end;
$$;

create function public.set_user_blocked(p_user_id uuid, p_blocked boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  update public.profiles set is_blocked = p_blocked where id = p_user_id and role = 'participant';
end;
$$;

create function public.set_user_role(p_user_id uuid, p_role public.user_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_change_own_role' using errcode = 'P0001';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

-- Run every minute by pg_cron. place_bid checks ends_at itself, so a late run never lets a bid in.
create function public.close_due_lots() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  update public.lots set status = 'closed'
  where status = 'active' and ends_at <= clock_timestamp();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Run every minute by pg_cron: "ends in about an hour" to everyone who bid on the lot.
create function public.queue_ending_soon_emails() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  with due as (
    update public.lots set reminder_sent_at = clock_timestamp()
    where status = 'active' and reminder_sent_at is null
      and ends_at > clock_timestamp() and ends_at <= clock_timestamp() + interval '1 hour'
    returning id, ends_at
  )
  insert into public.email_outbox (user_id, kind, lot_id, payload, dedupe_key)
  select distinct b.user_id, 'ending_soon', due.id, jsonb_build_object('ends_at', due.ends_at), 'ending_soon:' || due.id || ':' || b.user_id
  from due join public.bids b on b.lot_id = due.id and b.status = 'valid'
  on conflict (dedupe_key) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------- public read models

-- Public bid history without user ids. Runs with the owner's rights on purpose:
-- participants cannot read other people's rows in bids, only these columns.
create view public.bid_history with (security_invoker = false) as
  select b.id, b.lot_id, b.amount, b.public_name, b.created_at
  from public.bids b
  join public.lots l on l.id = b.lot_id
  where b.status = 'valid' and l.status <> 'draft';

create view public.auction_stats with (security_invoker = false) as
  select
    coalesce((select sum(current_amount) from public.lots where status <> 'draft'), 0)
      + coalesce((select sum(amount) from public.donations), 0) as total_raised,
    (select goal_amount from public.settings) as goal_amount,
    (select count(*) from public.lots where status <> 'draft') as lot_count,
    (select coalesce(sum(bid_count), 0) from public.lots where status <> 'draft') as bid_count,
    (select max(ends_at) from public.lots where status = 'active') as last_ends_at;

-- ---------------------------------------------------------------- access

alter table public.settings enable row level security;
alter table public.profiles enable row level security;
alter table public.lots enable row level security;
alter table public.lot_images enable row level security;
alter table public.bids enable row level security;
alter table public.donations enable row level security;
alter table public.email_outbox enable row level security;
alter table public.audit_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- settings
grant select on public.settings to anon, authenticated;
grant update (goal_amount, snipe_window_seconds, snipe_extend_seconds, max_bid_amount, min_seconds_between_bids, donate_url, stream_url, final_published)
  on public.settings to authenticated;
create policy settings_read on public.settings for select using (true);
create policy settings_admin on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- profiles: people manage their own row, but never their role or block flag.
grant select on public.profiles to authenticated;
grant insert (id, full_name, phone, display_name, show_anonymously, accepted_rules_at, photo_consent, locale) on public.profiles to authenticated;
grant update (full_name, phone, display_name, show_anonymously, photo_consent, locale) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff());
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- lots: everyone reads published lots; admins edit content, never prices or leaders.
grant select on public.lots to anon, authenticated;
grant insert (slug, title_uk, title_en, description_uk, description_en, start_price, bid_step, ends_at, status, sort_order, showcase)
  on public.lots to authenticated;
grant update (slug, title_uk, title_en, description_uk, description_en, start_price, bid_step, ends_at, status, sort_order, showcase)
  on public.lots to authenticated;
grant delete on public.lots to authenticated;
create policy lots_read on public.lots for select using (status <> 'draft' or public.is_admin());
create policy lots_admin_insert on public.lots for insert to authenticated with check (public.is_admin());
create policy lots_admin_update on public.lots for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy lots_admin_delete on public.lots for delete to authenticated using (public.is_admin() and bid_count = 0);

-- lot images
grant select on public.lot_images to anon, authenticated;
grant insert, update, delete on public.lot_images to authenticated;
create policy lot_images_read on public.lot_images for select
  using (exists (select 1 from public.lots l where l.id = lot_id and (l.status <> 'draft' or public.is_admin())));
create policy lot_images_admin on public.lot_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- bids: own rows and staff only. Writes go through the functions above.
grant select on public.bids to authenticated;
create policy bids_read on public.bids for select to authenticated using (user_id = auth.uid() or public.is_staff());

-- donations: admins only; the public sees the total through auction_stats.
grant select, insert, update, delete on public.donations to authenticated;
create policy donations_admin on public.donations for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- audit log: admins read, nobody writes directly.
grant select on public.audit_log to authenticated;
create policy audit_admin_read on public.audit_log for select to authenticated using (public.is_admin());

-- email_outbox: service role only (no grants to anon / authenticated).

grant select on public.bid_history, public.auction_stats to anon, authenticated;

grant execute on function public.place_bid(uuid, integer, uuid) to authenticated;
grant execute on function public.cancel_bid(uuid, text) to authenticated;
grant execute on function public.set_user_blocked(uuid, boolean) to authenticated;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;
-- Called from RLS policies, so every role that reads those tables needs execute.
grant execute on function public.is_staff(), public.is_admin(), public.current_role_name() to anon, authenticated;
