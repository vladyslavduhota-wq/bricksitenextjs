-- "Start from scratch": after a rehearsal, everything goes back to before the first lot, in one transaction.
-- Bids are cancelled rather than deleted, so the history and the audit log keep them. Donations stay.

create function public.reset_show() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_bids integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  -- Off air first: a bid waiting for one of the locks below then sees that its lot is not live.
  update public.settings set current_lot_id = null where id;
  perform 1 from public.lots where status <> 'draft' order by id for update;

  update public.bids set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now(), cancel_reason = 'Показ почато спочатку'
  where status = 'valid';
  get diagnostics v_bids = row_count;

  update public.lots set status = 'active' where status = 'closed';
  update public.lots set current_amount = null, leading_bid_id = null, bid_count = 0
  where bid_count > 0 or leading_bid_id is not null or current_amount is not null;

  -- Rehearsal mail must not go out, and an old "won" row would keep the real winner's mail from being queued.
  delete from public.email_outbox where kind = 'won' or sent_at is null;
  return v_bids;
end;
$$;

revoke all on function public.reset_show() from public, anon, authenticated;
grant execute on function public.reset_show() to authenticated; -- checks is_admin() itself
