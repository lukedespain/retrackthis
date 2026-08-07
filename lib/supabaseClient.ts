import { createBrowserClient } from "@supabase/ssr";

// Browser-safe client using the anon key — cookie-based session so the
// server (middleware, route handlers) sees the same session.
export const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
