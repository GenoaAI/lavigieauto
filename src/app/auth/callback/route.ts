import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserHousehold } from "@/lib/security/auth-context";

/**
 * Route de callback d'authentification Supabase (Magic Link & OAuth).
 * Échange le code PKCE contre une session utilisateur et effectue l'auto-liaison au foyer.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id) {
          await ensureUserHousehold(user);
        }
      } catch (linkErr) {
        console.warn("Erreur auto-provisioning foyer dans auth callback:", linkErr);
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";

      if (isLocal) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}
