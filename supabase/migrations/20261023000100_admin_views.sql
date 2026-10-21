-- Read models for the admin panel.
-- They run with the owner's rights (to reach auth.users for emails), so each one
-- filters on the caller's role itself. Contacts (email, phone) are admin-only:
-- moderators may only review and block (spec, section 4).

create view public.admin_users with (security_invoker = false) as
  select
    p.id,
    p.full_name,
    p.display_name,
    case when public.is_admin() then u.email end as email,
    case when public.is_admin() then p.phone end as phone,
    p.show_anonymously,
    p.photo_consent,
    p.locale,
    p.role,
    p.is_blocked,
    p.created_at,
    (select count(*) from public.bids b where b.user_id = p.id and b.status = 'valid') as bid_count,
    (select max(b.created_at) from public.bids b where b.user_id = p.id) as last_bid_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_staff();

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
    p.full_name as bidder_name,
    case when public.is_admin() then u.email end as bidder_email,
    p.is_blocked as bidder_blocked,
    l.leading_bid_id = b.id as is_leading,
    b.cancelled_at,
    b.cancel_reason
  from public.bids b
  join public.lots l on l.id = b.lot_id
  join public.profiles p on p.id = b.user_id
  join auth.users u on u.id = b.user_id
  where public.is_staff();

-- Current leader of every published lot: the winners once lots are closed.
create view public.admin_winners with (security_invoker = false) as
  select
    l.id as lot_id,
    l.title_uk as lot_title,
    l.slug as lot_slug,
    l.status as lot_status,
    l.ends_at,
    l.closed_at,
    l.bid_count,
    b.amount,
    b.created_at as bid_at,
    p.full_name,
    p.display_name,
    u.email,
    p.phone,
    p.show_anonymously,
    p.photo_consent
  from public.lots l
  join public.bids b on b.id = coalesce(l.winner_bid_id, l.leading_bid_id)
  join public.profiles p on p.id = b.user_id
  join auth.users u on u.id = b.user_id
  where l.status <> 'draft' and public.is_admin();

-- Audit entries with the actor's name. Rows of audit_log are already admin-only.
create view public.admin_audit with (security_invoker = false) as
  select a.id, a.created_at, a.action, a.table_name, a.row_id, a.old_data, a.new_data, a.actor_id, p.full_name as actor_name
  from public.audit_log a
  left join public.profiles p on p.id = a.actor_id
  where public.is_admin();

grant select on public.admin_users, public.admin_bids, public.admin_winners, public.admin_audit to authenticated;
