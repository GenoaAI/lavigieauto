import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Route de callback d'authentification Supabase (Magic Link & OAuth).
 * Échange le code PKCE contre une session utilisateur et effectue l'auto-liaison au foyer.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id && user.email) {
          const adminSupabase = createAdminClient();
          const cleanEmail = user.email.toLowerCase().trim();

          // Vérifier si le membre est déjà rattaché
          const { data: existingMember } = await (adminSupabase as any)
            .from("foyer_members")
            .select("id, foyer_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!existingMember) {
            // Recherche par email dans les foyers existants
            const { data: foyers } = await (adminSupabase as any)
              .from("foyers")
              .select("id, metadata");

            const matchedFoyer = (foyers || []).find(
              (f: any) =>
                (f.metadata as any)?.user_email?.toLowerCase() === cleanEmail
            );

            if (matchedFoyer) {
              await (adminSupabase as any)
                .from("foyer_members")
                .upsert(
                  {
                    user_id: user.id,
                    foyer_id: matchedFoyer.id,
                    role: "owner",
                  },
                  { onConflict: "foyer_id,user_id" }
                );
            }
          }
        }
      } catch (linkErr) {
        console.warn("Erreur auto-liaison foyer dans auth callback:", linkErr);
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
