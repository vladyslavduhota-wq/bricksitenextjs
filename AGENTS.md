<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Branch `nextjs-rebuild`
- This branch is the Next.js + Supabase rebuild. Never merge it into `main`: Lovable syncs `main`, and a different framework there breaks the Lovable editor.
- Bidding rules live in Postgres (`supabase/migrations`), in `place_bid()`. The app never decides whether a bid is valid or a lot is closed; why: server time is the only source of truth and bids must not be lost or duplicated.
- Every change to bidding SQL needs a test in `tests/db` (`npm test`, uses a local Postgres database ending in `_test`).
- All public-site text goes in `messages/uk.json` and `messages/en.json`; Ukrainian is the default locale at `/`, English at `/en`. The admin panel (`/admin`) is Ukrainian only, with text inline; why: only the Rector's Office uses it.
- Build screens from `src/components/ui.tsx` (Bezel, buttons, fields, badges) and, in admin, `src/components/admin/kit.tsx`; why: one visual language across site, login and admin.
- Admin authorization is enforced twice: server actions call `requireAdmin`/`requireStaff`, and RLS plus the `admin_*` views enforce it again in Postgres. Contacts (email, phone) are admin-only; moderators only review and block.
- Preloader is ported verbatim from the client's kse-preloader HTML (src/components/preloader-source.ts) and run once via new Function; why: keeps the original animation intact.
- Preloader completion is tracked separately from startup and restored after hydration; why: client navigation back home must not replay or leave the screen blocked.
- First-screen layout uses breakpoint-based fixed typography and separate motion wrappers for portrait and gavel; why: avoid text overflow and competing CSS/scroll transforms.
- Moving text uses measured pixel travel independent of scroll velocity; why: preserve readable, stable movement at every screen width.
