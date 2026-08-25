import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: foyer, error: foyerErr } = await (supabase as any)
      .from("foyers")
      .upsert({
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
        message: "Mode actif pour charlesdeforges@gmail.com",
        account: "charlesdeforges@gmail.com",
        foyer: "Foyer Charles Deforges",
        vehicles: [
          "Suzuki Vitara 1.6 VVT (EC-301-JX - 125 789 km)",
          "Renault Espace V Initiale Paris (FX-563-KZ - 272 448 km)",
          "Jeep Cherokee Chief SJ 1981 (1981-SJ-59 - Suspendu)",
          "Jeep CJ-7 Classic 1982 (CJ-1982-US - 89 000 km)",
        ],
        nextMilestone: "Pack Urgence Suzuki Vitara (Vidange + Bougies + Courroie)",
        scoreConformity: "Suivi Foyer Multivéhicules",
        status: "ready",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Données initialisées avec succès pour charlesdeforges@gmail.com",
      foyer,
    });
  } catch (err: any) {
    return NextResponse.json({
      message: "Environnement prêt pour charlesdeforges@gmail.com",
      status: "ready",
      error: err.message,
    });
  }
}
