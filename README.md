# KSE Rector's Charity Auction

Online charity auction of Tymofiy Brik's personal belongings. Next.js (App Router) + Supabase.

> Developed on `nextjs-rebuild`, mirrored to `main` in vladyslavduhota-wq/bricksitenextjs.

## Run locally

```sh
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev
```

UA is served at `/`, EN at `/en`.

## Database

Migrations are in `supabase/migrations`. The bidding rules (minimum step, anti-sniping, closing on server time, rate limit, duplicate protection) are all inside the `place_bid()` function.

Tests run the migrations against a throwaway local Postgres database and exercise them as real `anon` / `authenticated` users:

```sh
npm test
```

By default they use `postgres://localhost:5432/brik_auction_test`; set `TEST_DATABASE_URL` to change it. The database name must end in `_test` because it is dropped on every run.

## Connecting Supabase

1. Fill in `.env.local` (see the notes in it).
2. Apply the migrations in `supabase/migrations` in order (SQL editor or `psql "$SUPABASE_DB_URL" -f …`).
3. Database → Extensions: enable `pg_cron` if the schedules migration could not.
4. Authentication → URL Configuration: Site URL = your site, and add `http://localhost:3000/auth/callback` plus the production `/auth/callback` to Redirect URLs.
5. Authentication → Emails → Magic Link: paste `supabase/templates/magic_link.html` (it contains both the code and the link).
6. Authentication → Sign In / Providers → Google: add the Google OAuth client ID and secret.
7. Optional bot check: create a Cloudflare Turnstile site, put its secret in Authentication → Attack Protection, and its site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
8. Make the first admin after they have signed in once:
   ```sql
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'name@kse.org.ua');
   ```
   Further admins and moderators are assigned in Admin → Учасники.

## Roles

- **Participant**: bids, edits their own profile.
- **Moderator**: sees bids and participants (without contacts), cancels bids, blocks participants.
- **Admin**: everything, including lots, photos, settings, donations, CSV exports with contacts, and the audit log.

## Layout

- `src/app/[locale]` – pages
- `src/components` – UI; `preloader-source.ts` is the client's preloader, ported verbatim
- `messages/` – all copy, UA and EN
- `supabase/migrations` – schema, access rules, bidding functions, cron jobs
- `tests/db` – bidding and access-rule tests
