-- Lots are now closed by the presenter during the live show, not by a clock.
-- Supabase only (pg_cron): local DB tests skip this file. Runs before the live-show migration,
-- which drops the functions these jobs call.
select cron.unschedule('close-due-lots');
select cron.unschedule('queue-ending-soon-emails');
