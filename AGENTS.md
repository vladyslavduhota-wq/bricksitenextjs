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
- Preloader is ported verbatim from the client's kse-preloader HTML (src/components/preloader-source.ts) and run once via new Function; why: keeps the original animation intact.
- Preloader completion is tracked separately from startup and restored after hydration; why: client navigation back home must not replay or leave the screen blocked.
- First-screen layout uses breakpoint-based fixed typography and separate motion wrappers for portrait and gavel; why: avoid text overflow and competing CSS/scroll transforms.
- Moving text uses measured pixel travel independent of scroll velocity; why: preserve readable, stable movement at every screen width.
