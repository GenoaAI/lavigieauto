import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhqsbdrfwbyyeooazut.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFzYmRyZndieXllb29henV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NDE3NCwiZXhwIjoyMTAzMTQwMTc0fQ.GCrMH__zpc2k_mVBMpD2CNUxDrmoqXru-MDrmTlNUG0";

import { syncVehicleManufacturerScheduleAction } from "@/app/actions/vehicles";

import { fetchOnlineManufacturerPlan } from "@/lib/engine/manufacturer-retriever";

import { getVehicleDetailsAction } from "@/app/actions/vehicles";

async function checkVitaraAndEspaceData() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: vehicles, error: vehError } = await supabase
    .from("vehicules")
    .select(`
      *,
      documents_sources (*),
      lignes_interventions (*),
      defaillances_ct (*),
      echeances_previsionnelles (*),
      audits_conformite (*)
    `)
    .order("created_at", { ascending: true });

  console.log("Erreur SQL:", vehError);
  console.log("Nombre de véhicules récupérés de Supabase:", vehicles?.length);

  for (const v of vehicles || []) {
    console.log(`\n========================================`);
    console.log(`VÉHICULE: ${v.marque} ${v.modele} (${v.immatriculation}) - ID: ${v.id}`);
    console.log(`Kilométrage certifié: ${v.kilometrage_actuel} km (relevé le ${v.date_releve_kilometrage})`);
    console.log(`Documents (${v.documents_sources?.length || 0})`);
    console.log(`Lignes d'interventions (${v.lignes_interventions?.length || 0})`);
    console.log(`Échéances prévisionnelles (${v.echeances_previsionnelles?.length || 0}) :`);
    (v.echeances_previsionnelles || []).slice(0, 5).forEach((e: any) => {
      console.log(`  - [${e.statut}] ${e.libelle} (${e.type_echeance}) | Date: ${e.date_preconisee} / Limite: ${e.date_limite} / ${e.km_preconise} km`);
    });
  }
}

checkVitaraAndEspaceData().catch(console.error);

