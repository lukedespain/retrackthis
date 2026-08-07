import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client (Server Components, Route Handlers) using the anon key
// plus the caller's session cookies — respects RLS as that specific user.
export function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render — middleware refreshes the
          // session cookie on the request instead, so this is safe to ignore.
        }
      },
    },
  });
}

// Resolves the signed-in user's id from the session cookie, or null.
// Route handlers use this instead of trusting a client-supplied user id.
export async function getSessionUserId() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
