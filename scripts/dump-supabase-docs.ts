import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhqsbdrfwbyyeooazut.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFzYmRyZndieXllb29henV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NDE3NCwiZXhwIjoyMTAzMTQwMTc0fQ.GCrMH__zpc2k_mVBMpD2CNUxDrmoqXru-MDrmTlNUG0";

async function dump() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: vehs } = await supabase.from("vehicules").select("id, immatriculation, marque, modele");
  const { data: docs } = await supabase.from("documents_sources").select("*").order("date_document", { ascending: false });
  const { data: lines } = await supabase.from("lignes_interventions").select("*").order("date_intervention", { ascending: false });

  console.log("=== VÉHICULES EN LIGNE SUR SUPABASE ===");
  for (const v of (vehs || [])) {
    console.log(`- ID: ${v.id} | Immatriculation: ${v.immatriculation} | ${v.marque} ${v.modele}`);
  }

  console.log("\n=== DOCUMENTS SOURCES EN LIGNE (TOTAL: " + (docs?.length || 0) + ") ===");
  for (const d of (docs || [])) {
    const v = (vehs || []).find((veh) => veh.id === d.vehicule_id);
    console.log(`- Date: ${d.date_document || "N/A"} | KM: ${d.kilometrage_document || "N/A"} | Type: ${d.file_type} | Émetteur: "${d.emetteur || "N/A"}" | Montant: ${d.montant_ttc || 0} € | Fichier: ${d.nom_fichier} | Véhicule: ${v?.marque || ""} ${v?.modele || ""} (${v?.immatriculation || d.vehicule_id})`);
  }

  console.log("\n=== LIGNES D'INTERVENTIONS EN LIGNE (TOTAL: " + (lines?.length || 0) + ") ===");
  for (const l of (lines || [])) {
    const v = (vehs || []).find((veh) => veh.id === l.vehicule_id);
    console.log(`- Date: ${l.date_intervention} | KM: ${l.kilometrage_intervention} | Opération: "${l.operation}" | Émetteur: "${l.emetteur}" | Total TTC: ${l.prix_total_ttc} € | Véhicule: ${v?.marque || ""} ${v?.modele || ""} (${v?.immatriculation || l.vehicule_id})`);
  }
}

dump().catch(console.error);
