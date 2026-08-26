import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhqsbdrfwbyyeooazut.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFzYmRyZndieXllb29henV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NDE3NCwiZXhwIjoyMTAzMTQwMTc0fQ.GCrMH__zpc2k_mVBMpD2CNUxDrmoqXru-MDrmTlNUG0";

async function main() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: vehs } = await supabase.from("vehicules").select("*");
  const { data: docs } = await supabase.from("documents_sources").select("*").order("date_document", { ascending: false });

  console.log("=== 1. VÉHICULES EN LIGNE DANS SUPABASE ===");
  for (const v of vehs || []) {
    console.log(`• ID: ${v.id}`);
    console.log(`  Immatriculation: ${v.immatriculation}`);
    console.log(`  Modèle: ${v.marque} ${v.modele}`);
    console.log(`  KM Actuel: ${v.kilometrage_actuel} km\n`);
  }

  console.log("=== 2. DOCUMENTS EN LIGNE DANS SUPABASE ===");
  for (const d of docs || []) {
    const v = (vehs || []).find((veh) => veh.id === d.vehicule_id);
    console.log(`• [${d.date_document || "Sans date"}] ${d.nom_fichier}`);
    console.log(`  Type: ${d.file_type} | Montant: ${d.montant_ttc || 0} € | KM: ${d.kilometrage_document || "N/A"}`);
    console.log(`  Émetteur / Garage: "${d.emetteur || "N/A"}"`);
    console.log(`  Véhicule affecté: ${v ? `${v.marque} ${v.modele} (${v.immatriculation})` : d.vehicule_id}\n`);
  }
}

main().catch(console.error);
