export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** False until .env.local is filled in; public pages keep working without Supabase. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const LOTS_BUCKET = "lots";

export const photoUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/${LOTS_BUCKET}/${path}`;
