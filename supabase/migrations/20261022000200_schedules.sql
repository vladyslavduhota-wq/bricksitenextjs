-- pg_cron jobs. Supabase only: local DB tests skip this file.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('close-due-lots', '* * * * *', 'select public.close_due_lots()');
select cron.schedule('queue-ending-soon-emails', '* * * * *', 'select public.queue_ending_soon_emails()');
