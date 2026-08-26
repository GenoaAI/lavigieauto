import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/integrations/google-calendar/client";
import { GoogleCalendarService } from "@/lib/integrations/google-calendar/service";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  const proto = req.headers.get("x-forwarded-proto") || (req.url.startsWith("https") ? "https" : "http");
  const host = req.headers.get("host") || "www.lavigieauto.com";
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

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

    const resolvedEmail = googleProfile.email || "charlesdeforges@gmail.com";
    const resolvedName = googleProfile.name || "Charles de Forges";

    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    const cookieStore = await cookies();
    const sessionEmail = cookieStore.get("gcal_user_email")?.value;
    const effectiveEmail = user?.email || sessionEmail || resolvedEmail;

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
        // L'utilisateur est déjà connecté (ex: avec user@yahoo.fr ou user@outlook.com) -> on associe Google Calendar à son profil
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
      } else if (resolvedEmail.toLowerCase() === "charlesdeforges@gmail.com" || effectiveEmail.toLowerCase() === "charlesdeforges@gmail.com") {
        // Foyer principal de référence Charles de Forges
        await (adminSupabase as any)
          .from("foyers")
          .update({
            nom: `Foyer ${resolvedName}`,
            metadata: {
              user_email: resolvedEmail,
              owner_name: resolvedName,
              calendar_synced: true,
              stripe_subscription_status: "active",
              plan: "foyer_multi_vehicules",
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", "11111111-1111-1111-1111-111111111111");

        await (adminSupabase as any)
          .from("foyer_members")
          .update({
            metadata: memberMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq("foyer_id", "11111111-1111-1111-1111-111111111111");
      } else {
        // Nouvel utilisateur distinct : recherche ou création de son propre foyer dédié
        const { data: existingFoyers } = await (adminSupabase as any)
          .from("foyers")
          .select("id, metadata");

        const userFoyer = (existingFoyers || []).find(
          (f: any) => (f.metadata as any)?.user_email?.toLowerCase() === effectiveEmail.toLowerCase()
        );

        if (userFoyer) {
          await (adminSupabase as any)
            .from("foyers")
            .update({
              nom: `Foyer ${resolvedName}`,
              metadata: {
                ...(userFoyer.metadata || {}),
                user_email: effectiveEmail,
                owner_name: resolvedName,
                calendar_synced: true,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", userFoyer.id);
        } else {
          // Nouveau Foyer vide pour le nouvel utilisateur
          const newFoyerId = crypto.randomUUID();
          await (adminSupabase as any)
            .from("foyers")
            .insert({
              id: newFoyerId,
              nom: `Foyer ${resolvedName}`,
              description: `Espace automobile personnel de ${resolvedName}`,
              metadata: {
                user_email: effectiveEmail,
                owner_name: resolvedName,
                calendar_synced: true,
                stripe_subscription_status: "none",
                plan: "foyer_decouverte",
              },
            });

          await (adminSupabase as any)
            .from("foyer_members")
            .insert({
              id: crypto.randomUUID(),
              foyer_id: newFoyerId,
              user_id: user?.id || `user-${crypto.randomUUID()}`,
              role: "owner",
              metadata: memberMetadata,
            });
        }
      }
    } catch (dbErr) {
      console.warn("Avertissement synchronisation base de données OAuth:", dbErr);
    }

    // 3. Mémoriser les jetons et profil dans les cookies de la session
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

    return NextResponse.redirect(new URL("/dashboard?calendar_connected=true&calendar_synced=true", origin));
  } catch (err: any) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(new URL(`/dashboard?error=oauth_failed&msg=${encodeURIComponent(err.message)}`, origin));
  }
}
