import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { localePrefixOf, safeNext } from "@/lib/auth";

/**
 * Every way of signing in ends here:
 *  - ?code=…        Google (OAuth, PKCE)
 *  - ?token_hash=…  the link in the sign-in email (works in any browser)
 *  - nothing        the code was already verified in the browser
 * New users go on to fill in their profile.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const prefix = localePrefixOf(next);
  const supabase = await createClient();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: (url.searchParams.get("type") as EmailOtpType) ?? "email" })
      : { error: null };

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (error || !userId) {
    return NextResponse.redirect(new URL(`${prefix}/login?error=link&next=${encodeURIComponent(next)}`, url.origin));
  }

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  const target = profile ? next : `${prefix}/welcome?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(target, url.origin));
}
