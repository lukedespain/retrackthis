import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Exchanges the auth code from email links (password reset, confirm signup, etc.)
 * for a session cookie, then redirects to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const nextRaw = searchParams.get("next") ?? "/reset-password";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/reset-password";

  const redirect = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirect.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirect;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "recovery" | "signup" | "invite" | "magiclink" | "email",
      token_hash: tokenHash,
    });
    if (!error) return redirect;
  }

  const fail = new URL("/forgot-password", origin);
  fail.searchParams.set("error", "invalid_link");
  return NextResponse.redirect(fail);
}
