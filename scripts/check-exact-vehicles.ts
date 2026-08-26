import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhqsbdrfwbyyeooazut.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFzYmRyZndieXllb29henV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NDE3NCwiZXhwIjoyMTAzMTQwMTc0fQ.GCrMH__zpc2k_mVBMpD2CNUxDrmoqXru-MDrmTlNUG0";

async function checkVitaraAndEspaceData() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Requête exacte effectuée par getFoyerOverviewAction
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
    console.log(`Documents (${v.documents_sources?.length || 0}) :`);
    (v.documents_sources || []).forEach((d: any) => {
      console.log(`  - [DOC] ${d.date_document} | ${d.file_type} | ${d.emetteur} | ${d.nom_fichier}`);
    });
    console.log(`Lignes d'interventions (${v.lignes_interventions?.length || 0}) :`);
    (v.lignes_interventions || []).slice(0, 10).forEach((l: any) => {
      console.log(`  - [LIGNE] ${l.date_intervention} | ${l.operation} | ${l.prix_total_ttc} € | Émetteur: ${l.emetteur}`);
    });
  }
}

checkVitaraAndEspaceData().catch(console.error);
