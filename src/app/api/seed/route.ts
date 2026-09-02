import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  // Sécurisation stricte : désactivation totale en environnement de production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Endpoint de seed désactivé en environnement de production." },
      { status: 404 }
    );
  }

  try {
    const supabase = createAdminClient();

    const { data: foyer, error: foyerErr } = await (supabase as any)
      .from("foyers")
      .upsert({
        id: "11111111-1111-1111-1111-111111111111",
        nom: "Foyer Charles Deforges",
        description: "Compte principal LaVigieAuto Foyer Multi-Véhicules",
        metadata: {
          stripe_subscription_status: "active",
          plan: "foyer_multi_vehicules",
          calendar_synced: true,
          user_email: "charlesdeforges@gmail.com",
        },
      })
      .select()
      .single();

    if (foyerErr) {
      return NextResponse.json({
        success: false,
        error: foyerErr.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Données de développement initialisées avec succès.",
      foyer,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
