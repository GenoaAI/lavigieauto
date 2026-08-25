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
    const gcalEmail = cookieStore.get("gcal_user_email")?.value;
    const gcalName = cookieStore.get("gcal_user_name")?.value;
    const gcalToken = cookieStore.get("gcal_access_token")?.value;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      return {
        isAuthenticated: true,
        userId: user.id,
        email: user.email || gcalEmail || "utilisateur@lavigieauto.com",
        name: user.user_metadata?.full_name || gcalName || user.email?.split("@")[0] || "Conducteur",
        picture: user.user_metadata?.avatar_url,
        googleConnected: Boolean(gcalToken),
      };
    }

    if (gcalEmail) {
      return {
        isAuthenticated: true,
        email: gcalEmail,
        name: gcalName || gcalEmail.split("@")[0],
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
export async function signInWithEmailAction(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/dashboard`,
      },
    });

    if (error) {
      // Fallback démo si SMTP non configuré
      const cookieStore = await cookies();
      cookieStore.set("gcal_user_email", email, { maxAge: 30 * 24 * 3600, path: "/" });
      cookieStore.set("gcal_user_name", email.split("@")[0], { maxAge: 30 * 24 * 3600, path: "/" });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur de connexion" };
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
