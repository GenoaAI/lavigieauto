import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/integrations/google-calendar/client";
import { GoogleCalendarService } from "@/lib/integrations/google-calendar/service";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_code", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

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

    const resolvedEmail = googleProfile.email || "charlesdeforges@gmail.com";
    const resolvedName = googleProfile.name || "Charles de Forges";

    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Initialiser le service Google Calendar et créer/récupérer l'agenda dédié
    const calendarService = new GoogleCalendarService(tokens.access_token);
    const calendarId = await calendarService.getOrCreateLaVigieAutoCalendar();

    // 2. Mémoriser les jetons et le profil en base de données
    const memberMetadata = {
      name: resolvedName,
      email: resolvedEmail,
      picture: googleProfile.picture,
      google_calendar_connected: true,
      google_calendar_id: calendarId,
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      last_synced_at: new Date().toISOString(),
    };

    if (user) {
      await (adminSupabase as any)
        .from("foyer_members")
        .update({
          metadata: memberMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    } else {
      // Mettre à jour le premier membre du foyer pour la démo
      await (adminSupabase as any)
        .from("foyer_members")
        .update({
          metadata: memberMetadata,
          updated_at: new Date().toISOString(),
        })
        .limit(1);
    }

    // Mettre à jour le foyer principal
    await (adminSupabase as any)
      .from("foyers")
      .update({
        nom: `Foyer ${resolvedName}`,
        metadata: {
          user_email: resolvedEmail,
          owner_name: resolvedName,
          calendar_synced: true,
        },
      })
      .limit(1);

    // 3. Mémoriser les jetons et profil dans les cookies de la session
    const cookieStore = await cookies();
    cookieStore.set("gcal_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600,
      path: "/",
    });

    cookieStore.set("gcal_user_email", resolvedEmail, {
      maxAge: 30 * 24 * 3600,
      path: "/",
    });

    cookieStore.set("gcal_user_name", resolvedName, {
      maxAge: 30 * 24 * 3600,
      path: "/",
    });

    if (googleProfile.picture) {
      cookieStore.set("gcal_user_picture", googleProfile.picture, {
        maxAge: 30 * 24 * 3600,
        path: "/",
      });
    }

    if (tokens.refresh_token) {
      cookieStore.set("gcal_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 3600,
        path: "/",
      });
    }

    cookieStore.set("gcal_calendar_id", calendarId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 3600,
      path: "/",
    });

    cookieStore.set("gcal_connected", "true", {
      maxAge: 30 * 24 * 3600,
      path: "/",
    });

    return NextResponse.redirect(new URL("/dashboard?calendar_connected=true&calendar_synced=true", req.url));
  } catch (err: any) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(new URL(`/dashboard?error=oauth_failed&msg=${encodeURIComponent(err.message)}`, req.url));
  }
}
