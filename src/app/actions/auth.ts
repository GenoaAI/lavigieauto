"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signUpCredentialsSchema } from "@/lib/security/schemas";
import { ensureUserHousehold } from "@/lib/security/auth-context";

export interface CurrentUserSummary {
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
  name?: string;
  picture?: string;
  googleConnected: boolean;
}

export interface SignUpActionResult {
  success: boolean;
  error?: string;
  code?: "user_already_exists" | "weak_password" | "invalid_email" | "generic_error";
  requiresEmailConfirmation?: boolean;
  sessionCreated?: boolean;
  user?: any;
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
 * Inscription par Email et Mot de passe (avec auto-provisioning de foyer)
 */
export async function signUpWithPasswordAction(
  email: string,
  password: string,
  name?: string
): Promise<SignUpActionResult> {
  try {
    const parseResult = signUpCredentialsSchema.safeParse({ email, password, name });
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      const field = firstIssue.path[0];
      const code =
        field === "email"
          ? "invalid_email"
          : field === "password"
          ? "weak_password"
          : "generic_error";
      return {
        success: false,
        code,
        error: firstIssue.message,
      };
    }

    const cleanEmail = parseResult.data.email;
    const cleanPassword = parseResult.data.password;
    const cleanName = parseResult.data.name?.trim() || cleanEmail.split("@")[0];

    const supabase = await createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        data: {
          full_name: cleanName,
        },
        emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      const msg = error.message?.toLowerCase() || "";
      if (
        msg.includes("already registered") ||
        msg.includes("already in use") ||
        msg.includes("user already exists") ||
        error.status === 422 ||
        (error.status === 400 && msg.includes("already"))
      ) {
        return {
          success: false,
          code: "user_already_exists",
          error: "Un compte existe déjà avec cette adresse email. Veuillez vous connecter.",
        };
      }
      return {
        success: false,
        code: "generic_error",
        error: error.message || "Erreur lors de la création du compte.",
      };
    }

    // GoTrue anti-enumeration: status 200, but identities array is empty
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        success: false,
        code: "user_already_exists",
        error: "Un compte existe déjà avec cette adresse email. Veuillez vous connecter.",
      };
    }

    if (data?.user?.id) {
      try {
        await ensureUserHousehold(data.user);
      } catch (householdErr) {
        console.warn("Erreur auto-provisioning foyer lors de l'inscription:", householdErr);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/");

    return {
      success: true,
      sessionCreated: !!data?.session,
      requiresEmailConfirmation: !data?.session,
      user: data?.user,
    };
  } catch (err: any) {
    return {
      success: false,
      code: "generic_error",
      error: err.message || "Erreur lors de l'inscription.",
    };
  }
}

/**
 * Connexion par Email (Magic Link / OTP)
 */
export async function signInWithEmailAction(
  email: string,
  redirectToPath?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, error: "Adresse email invalide." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = await createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const safeNext =
      redirectToPath && redirectToPath.startsWith("/") && !redirectToPath.startsWith("//")
        ? redirectToPath
        : "/dashboard";

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
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
 * Connexion par Mot de passe
 */
export async function signInWithPasswordAction(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!email || !password) {
      return { success: false, error: "Veuillez saisir votre email et mot de passe." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      return { success: false, error: error.message || "Identifiants invalides." };
    }

    // Auto-liaison au foyer si premier passage
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        await ensureUserHousehold(user);
      }
    } catch (linkErr) {
      console.warn("Auto-link foyer error:", linkErr);
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur de connexion" };
  }
}

/**
 * Initialisation de la connexion Google OAuth (Supabase Auth)
 */
export async function signInWithGoogleAction(
  redirectToPath?: string
): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const safeNext =
      redirectToPath && redirectToPath.startsWith("/") && !redirectToPath.startsWith("//")
        ? redirectToPath
        : "/dashboard";

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
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
