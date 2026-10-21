# Roadmap (Next.js + Supabase rebuild)

Staging for the Rector's Office: 29.10. Public start: ~02.11. Final: 14.11.

- [x] Next.js app with UA/EN, Lovable design ported (home, demo lot page, final page).
- [x] Database: lots, bids, profiles, settings, outbox, audit log, access rules.
- [x] `place_bid` with step, max amount, rate limit, anti-sniping, duplicate protection; closing and reminder jobs; tests.
- [ ] Supabase project in the EU; apply migrations; Storage bucket for lot photos.
- [ ] Auth: email code + Google; onboarding (name, phone, 18+, rules, photo consent).
- [ ] Catalog and lot pages from the database; live updates; bid flow in 3 clicks.
- [ ] Admin: lots CRUD with photos, bids and users, cancel/block, change closing time, CSV/Excel export, audit log.
- [ ] Emails (Resend): outbid, won, ending in 1 hour.
- [ ] Turnstile, Plausible, rules and privacy pages.
- [ ] Vercel (EU) staging deploy from this branch.
- [ ] Cross-browser check, load test (500 concurrent), security review.
- [ ] Final day: stream embed, big-screen counter, results page.
