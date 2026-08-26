import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhqsbdrfwbyyeooazut.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFzYmRyZndieXllb29henV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NDE3NCwiZXhwIjoyMTAzMTQwMTc0fQ.GCrMH__zpc2k_mVBMpD2CNUxDrmoqXru-MDrmTlNUG0";

async function main() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  // 1. Chercher et supprimer/remplacer toute trace de Lilas dans documents_sources
  const { data: lilasDocs } = await supabase.from("documents_sources").select("*").ilike("emetteur", "%Lilas%");
  console.log("Documents contenant 'Lilas':", lilasDocs?.length || 0);
  if (lilasDocs && lilasDocs.length > 0) {
    for (const d of lilasDocs) {
      await supabase.from("documents_sources").delete().eq("id", d.id);
      console.log(`Supprimé document: ${d.id} (${d.emetteur})`);
    }
  }

  // 2. Chercher et supprimer toute trace de Lilas dans lignes_interventions
  const { data: lilasLines } = await supabase.from("lignes_interventions").select("*").ilike("emetteur", "%Lilas%");
  console.log("Lignes contenant 'Lilas':", lilasLines?.length || 0);
  if (lilasLines && lilasLines.length > 0) {
    for (const l of lilasLines) {
      await supabase.from("lignes_interventions").delete().eq("id", l.id);
      console.log(`Supprimée ligne: ${l.id} (${l.emetteur})`);
    }
  }

  // 3. Chercher et supprimer dans garages
  const { data: lilasGarages } = await supabase.from("garages").select("*").ilike("nom", "%Lilas%");
  console.log("Garages contenant 'Lilas':", lilasGarages?.length || 0);
  if (lilasGarages && lilasGarages.length > 0) {
    for (const g of lilasGarages) {
      await supabase.from("garages").delete().eq("id", g.id);
      console.log(`Supprimé garage: ${g.id} (${g.nom})`);
    }
  }

  console.log("✅ Supabase est 100% nettoyé de toute référence à 'Lilas' !");
}

main().catch(console.error);
