import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthUrl } from "@/lib/integrations/google-calendar/client";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");

  // Calcul dynamique de l'origine
  const proto = req.headers.get("x-forwarded-proto") || (req.url.startsWith("https") ? "https" : "http");
  const host = req.headers.get("host") || "www.lavigieauto.com";
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Mode simulation : uniquement en développement local
  if (mode === "simulate" && process.env.NODE_ENV !== "production") {
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

  // Génération d'un jeton anti-CSRF aléatoire
  const state = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  // Redirection officielle Google OAuth 2.0 avec state
  const oauthUrl = getGoogleOAuthUrl(redirectUri, state);
  return NextResponse.redirect(oauthUrl);
}
