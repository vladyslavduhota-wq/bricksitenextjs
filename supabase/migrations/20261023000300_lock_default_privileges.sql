-- Supabase grants anon and authenticated every privilege on new objects in public by default,
-- so the admin views from the previous migration were open to visitors (empty, but grantable).
-- Lock them down and stop the defaults: from now on every object is private until a migration grants it.

revoke all on public.admin_users, public.admin_bids, public.admin_winners, public.admin_audit from anon, authenticated;
grant select on public.admin_users, public.admin_bids, public.admin_winners, public.admin_audit to authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
