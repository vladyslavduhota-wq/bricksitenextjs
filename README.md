# KSE Rector's Charity Auction

Online charity auction of Tymofiy Brik's personal belongings. Next.js (App Router) + Supabase.

> This is the `nextjs-rebuild` branch. `main` is the Lovable prototype and stays untouched.

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

## Layout

- `src/app/[locale]` – pages
- `src/components` – UI; `preloader-source.ts` is the client's preloader, ported verbatim
- `messages/` – all copy, UA and EN
- `supabase/migrations` – schema, access rules, bidding functions, cron jobs
- `tests/db` – bidding and access-rule tests
