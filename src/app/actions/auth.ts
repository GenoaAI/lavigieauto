"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface CurrentUserSummary {
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
  name?: string;
  picture?: string;
  googleConnected: boolean;
}

/**
 * Récupère l'utilisateur connecté ou la session active
 */
export async function getCurrentUserAction(): Promise<CurrentUserSummary> {
  try {
    const cookieStore = await cookies();
    const gcalToken = cookieStore.get("gcal_access_token")?.value;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return {
        isAuthenticated: true,
        userId: user.id,
        email: user.email || "utilisateur@lavigieauto.com",
        name:
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Conducteur",
        picture: user.user_metadata?.avatar_url,
        googleConnected: Boolean(gcalToken),
      };
    }

    return {
      isAuthenticated: false,
      googleConnected: false,
    };
  } catch (err) {
    console.warn("Erreur getCurrentUserAction:", err);
    return { isAuthenticated: false, googleConnected: false };
  }
}

/**
 * Connexion par Email (Magic Link / OTP)
 */
export async function signInWithEmailAction(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, error: "Adresse email invalide." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = await createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      return { success: false, error: error.message || "Impossible d'envoyer l'email de connexion." };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur de connexion" };
  }
}

/**
 * Initialisation de la connexion Google OAuth (Supabase Auth)
 */
export async function signInWithGoogleAction(): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (error || !data?.url) {
      return { error: error?.message || "Impossible d'initialiser l'authentification Google." };
    }

    return { url: data.url };
  } catch (err: any) {
    return { error: err.message || "Erreur d'authentification Google." };
  }
}

/**
 * Déconnexion complète : purge les cookies de session et la session Supabase
 */
export async function signOutAction(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (
        c.name.startsWith("gcal_") ||
        c.name.startsWith("tracking_status_") ||
        c.name.startsWith("sb-")
      ) {
        cookieStore.delete(c.name);
      }
    }
    cookieStore.delete("gcal_access_token");
    cookieStore.delete("gcal_refresh_token");
    cookieStore.delete("gcal_calendar_id");
    cookieStore.delete("gcal_user_email");
    cookieStore.delete("gcal_user_name");
    cookieStore.delete("gcal_user_picture");
    cookieStore.delete("gcal_synced_vehicles");
  } catch (err) {
    console.warn("Erreur signOutAction:", err);
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/login?logged_out=true");
}
