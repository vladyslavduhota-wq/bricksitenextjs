import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

// POST only, so a link or prefetch can never sign someone out.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const form = await request.formData();
  return NextResponse.redirect(new URL(safeNext(form.get("next")?.toString()), request.nextUrl.origin), 303);
}
