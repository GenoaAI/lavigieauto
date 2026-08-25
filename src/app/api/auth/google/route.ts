import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthUrl } from "@/lib/integrations/google-calendar/client";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");

  const clientId = process.env.GOOGLE_CLIENT_ID;

  // Calcul dynamique de l'origine
  const proto = req.headers.get("x-forwarded-proto") || (req.url.startsWith("https") ? "https" : "http");
  const host = req.headers.get("host") || "www.lavigieauto.com";
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Si l'utilisateur est en mode simulation
  if (mode === "simulate") {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await (supabase as any)
          .from("foyer_members")
          .update({
            metadata: {
              google_calendar_connected: true,
              google_calendar_id: "primary",
              last_synced_at: new Date().toISOString(),
            },
          })
          .eq("user_id", user.id);
      }
    } catch {
      // Ignore
    }

    return NextResponse.redirect(
      new URL("/dashboard?calendar_connected=true&calendar_synced=true", origin)
    );
  }

  // Redirection officielle Google OAuth 2.0
  const oauthUrl = getGoogleOAuthUrl(redirectUri);
  return NextResponse.redirect(oauthUrl);
}
