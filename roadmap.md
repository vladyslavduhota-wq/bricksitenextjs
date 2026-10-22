# Roadmap (Next.js + Supabase rebuild)

Staging for the Rector's Office: 29.10. Public start: ~02.11. Final: 14.11.

- [x] Next.js app with UA/EN, prototype design ported (home, demo lot page, final page).
- [x] Database: lots, bids, profiles, settings, outbox, audit log, access rules.
- [x] `place_bid` with step, max amount, rate limit, anti-sniping, duplicate protection; closing and reminder jobs; tests.
- [ ] Supabase project in the EU; apply migrations; Storage bucket for lot photos.
- [x] Auth: email code or link + Google, optional Turnstile; onboarding (name, phone, nickname, anonymity, 18+, rules, photo consent); account page.
- [ ] Catalog and lot pages from the database; live updates; bid flow in 3 clicks.
- [x] Admin: overview with pre-launch checks, lots CRUD with photos, bids (cancel), participants (block, roles), settings, donations, CSV exports, audit log.
- [ ] Emails (Resend): outbid, won, ending in 1 hour.
- [x] Draft rules and privacy pages (final text from KSE's lawyer).
- [ ] Turnstile on bids, Plausible.
- [ ] Vercel (EU) staging deploy from this branch.
- [ ] Cross-browser check, load test (500 concurrent), security review.
- [ ] Final day: stream embed, big-screen counter, results page.
