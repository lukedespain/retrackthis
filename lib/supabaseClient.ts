import { createBrowserClient } from "@supabase/ssr";
import { DEMO_MODE, DEMO_USER_ID } from "@/lib/demoMode";

// Browser-safe client using the anon key - cookie-based session so the
// server (middleware, route handlers) sees the same session.
export const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Demo Mode (Preview deployments only, see lib/demoMode.ts): patches just
// enough of the client auth surface so pages that gate UI on
// `getSession`/`onAuthStateChange` render as signed in, without a real
// Supabase project.
if (DEMO_MODE) {
  const fakeSession = {
    user: { id: DEMO_USER_ID, email: "alex@example.com" },
    access_token: "mock",
    expires_at: 9999999999,
  } as unknown as import("@supabase/supabase-js").Session;

  supabaseClient.auth.getSession = async () => ({ data: { session: fakeSession }, error: null }) as never;
  supabaseClient.auth.onAuthStateChange = ((callback: (event: string, session: unknown) => void) => {
    callback("SIGNED_IN", fakeSession);
    return { data: { subscription: { unsubscribe() {} } } };
  }) as never;
  supabaseClient.auth.signOut = async () => ({ error: null }) as never;
}
