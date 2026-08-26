import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhqsbdrfwbyyeooazut.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFzYmRyZndieXllb29henV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NDE3NCwiZXhwIjoyMTAzMTQwMTc0fQ.GCrMH__zpc2k_mVBMpD2CNUxDrmoqXru-MDrmTlNUG0";

async function main() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: lines } = await supabase
    .from("lignes_interventions")
    .select("*")
    .eq("vehicule_id", "33333333-3333-3333-3333-333333333333");

  console.log("=== LIGNES D'INTERVENTIONS RÉELLES DE L'ESPACE V (FX-563-KZ) ===");
  for (const l of lines || []) {
    console.log(`• Date: ${l.date_intervention} | KM: ${l.kilometrage_intervention} | Opération: "${l.operation}" | Prix: ${l.prix_total_ttc} € | Émetteur: "${l.emetteur}"`);
  }
}

main().catch(console.error);
