import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/integrations/google-calendar/client";
import { GoogleCalendarService } from "@/lib/integrations/google-calendar/service";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const proto = req.headers.get("x-forwarded-proto") || (req.url.startsWith("https") ? "https" : "http");
  const host = req.headers.get("host") || "www.lavigieauto.com";
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  const cookieStore = await cookies();
  const savedState = cookieStore.get("gcal_oauth_state")?.value;

  // Validation anti-CSRF
  if (savedState && (!state || state !== savedState)) {
    cookieStore.delete("gcal_oauth_state");
    return NextResponse.redirect(new URL("/dashboard?error=invalid_oauth_state", origin));
  }
  cookieStore.delete("gcal_oauth_state");

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_code", origin));
  }

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Récupérer le profil Google (Nom, Email, Photo)
    let googleProfile: { email?: string; name?: string; picture?: string } = {};
    try {
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (profileRes.ok) {
        googleProfile = await profileRes.json();
      }
    } catch (profileErr) {
      console.warn("Impossible de récupérer le profil Google:", profileErr);
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    const resolvedEmail = googleProfile.email || user?.email || "utilisateur@lavigieauto.com";
    const resolvedName = googleProfile.name || user?.user_metadata?.full_name || "Conducteur";
    const effectiveEmail = user?.email || resolvedEmail;

    // 1. Initialiser le service Google Calendar et créer/récupérer l'agenda dédié
    const calendarService = new GoogleCalendarService(tokens.access_token);
    const calendarId = await calendarService.getOrCreateLaVigieAutoCalendar();

    // 2. Mémoriser les jetons et le profil en base de données avec isolation stricte du Foyer
    const memberMetadata = {
      name: user?.user_metadata?.full_name || resolvedName,
      email: effectiveEmail,
      google_email: resolvedEmail,
      picture: user?.user_metadata?.avatar_url || googleProfile.picture,
      google_calendar_connected: true,
      google_calendar_id: calendarId,
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      last_synced_at: new Date().toISOString(),
    };

    try {
      if (user?.id) {
        // L'utilisateur est connecté -> association à son profil foyer
        const { data: existingMember } = await (adminSupabase as any)
          .from("foyer_members")
          .select("id, foyer_id, metadata")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingMember) {
          await (adminSupabase as any)
            .from("foyer_members")
            .update({
              metadata: {
                ...(existingMember.metadata || {}),
                ...memberMetadata,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingMember.id);

          await (adminSupabase as any)
            .from("foyers")
            .update({
              metadata: {
                calendar_synced: true,
                google_calendar_connected: true,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingMember.foyer_id);
        }
      }
    } catch (dbErr) {
      console.warn("Avertissement synchronisation base de données OAuth:", dbErr);
    }

    // 3. Mémoriser les jetons et profil dans les cookies sécurisés
    cookieStore.set("gcal_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600,
      path: "/",
    });

    if (tokens.refresh_token) {
      cookieStore.set("gcal_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 3600,
        path: "/",
      });
    }

    cookieStore.set("gcal_calendar_id", calendarId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 3600,
      path: "/",
    });

    cookieStore.set("gcal_connected", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 3600,
      path: "/",
    });

    return NextResponse.redirect(new URL("/dashboard?calendar_connected=true&calendar_synced=true", origin));
  } catch (err: any) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(new URL(`/dashboard?error=oauth_failed&msg=${encodeURIComponent(err.message)}`, origin));
  }
}
