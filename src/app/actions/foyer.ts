"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Foyer, FoyerMember } from "@/lib/types/database.types";
import { EnrichedVehicle } from "./vehicles";

export interface FoyerOverviewResult {
  foyer: Foyer | null;
  role: string;
  vehicles: EnrichedVehicle[];
  members: FoyerMember[];
}

export async function getFoyerOverviewAction(): Promise<FoyerOverviewResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let foyerId: string | null = null;
  let foyerData: Foyer | null = null;
  let role = "owner";

  if (user) {
    const { data: membership } = await (supabase as any)
      .from("foyer_members")
      .select("foyer_id, role, foyers (*)")
      .eq("user_id", user.id)
      .single();

    if (membership?.foyer_id) {
      foyerId = membership.foyer_id;
      foyerData = membership.foyers as Foyer;
      role = membership.role;
    }
  }

  // Mode local / démo : charger le foyer principal
  const adminSupabase = createAdminClient();

  if (!foyerId) {
    const { data: defaultFoyer } = await (adminSupabase as any)
      .from("foyers")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (defaultFoyer) {
      foyerId = defaultFoyer.id;
      foyerData = defaultFoyer as Foyer;
    }
  }

  if (!foyerId) {
    return {
      foyer: null,
      role: "owner",
      vehicles: [],
      members: [],
    };
  }

  const { data: vehicles } = await (adminSupabase as any)
    .from("vehicules")
    .select(`
      *,
      documents_sources (*),
      lignes_interventions (*),
      defaillances_ct (*),
      echeances_previsionnelles (*),
      audits_conformite (*)
    `)
    .eq("foyer_id", foyerId)
    .order("created_at", { ascending: true });

  const { data: members } = await (adminSupabase as any)
    .from("foyer_members")
    .select("*")
    .eq("foyer_id", foyerId);

  return {
    foyer: foyerData,
    role,
    vehicles: (vehicles || []) as EnrichedVehicle[],
    members: (members || []) as FoyerMember[],
  };
}
