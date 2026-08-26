import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhqsbdrfwbyyeooazut.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFzYmRyZndieXllb29henV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NDE3NCwiZXhwIjoyMTAzMTQwMTc0fQ.GCrMH__zpc2k_mVBMpD2CNUxDrmoqXru-MDrmTlNUG0";

async function main() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: foyers } = await supabase.from("foyers").select("*");
  const { data: vehs } = await supabase.from("vehicules").select("id, foyer_id, immatriculation");
  const { data: docs } = await supabase.from("documents_sources").select("id, foyer_id, vehicule_id, emetteur");
  
  console.log("Foyers:", foyers);
  console.log("Vehicules:", vehs);
  console.log("Docs:", docs);
}

main().catch(console.error);
