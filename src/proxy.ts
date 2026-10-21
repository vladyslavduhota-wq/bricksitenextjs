import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { refreshSession } from "./lib/supabase/session";

const intl = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // The admin panel (Ukrainian only) and auth callbacks are not localized.
  const { pathname } = request.nextUrl;
  const unlocalized = pathname.startsWith("/admin") || pathname.startsWith("/auth");
  return refreshSession(request, unlocalized ? NextResponse.next({ request }) : intl(request));
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
