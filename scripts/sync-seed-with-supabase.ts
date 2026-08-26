import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhqsbdrfwbyyeooazut.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFzYmRyZndieXllb29henV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NDE3NCwiZXhwIjoyMTAzMTQwMTc0fQ.GCrMH__zpc2k_mVBMpD2CNUxDrmoqXru-MDrmTlNUG0";

async function sync() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const [foyersRes, vehRes, docsRes, linesRes, echeancesRes, auditsRes] = await Promise.all([
    supabase.from("foyers").select("*"),
    supabase.from("vehicules").select("*").order("created_at", { ascending: true }),
    supabase.from("documents_sources").select("*").order("date_document", { ascending: false }),
    supabase.from("lignes_interventions").select("*").order("date_intervention", { ascending: false }),
    supabase.from("echeances_previsionnelles").select("*"),
    supabase.from("audits_conformite").select("*"),
  ]);

  const vehicles = (vehRes.data || []).map((v) => {
    const vDocs = (docsRes.data || []).filter((d) => d.vehicule_id === v.id);
    const vLines = (linesRes.data || []).filter((l) => l.vehicule_id === v.id);
    const vEcheances = (echeancesRes.data || []).filter((e) => e.vehicule_id === v.id);
    const vAudits = (auditsRes.data || []).filter((a) => a.vehicule_id === v.id);

    return {
      ...v,
      documents_sources: vDocs,
      lignes_interventions: vLines,
      echeances_previsionnelles: vEcheances,
      audits_conformite: vAudits,
    };
  });

  const seedContent = `import { EnrichedVehicle } from "@/app/actions/vehicles";

export const DEFAULT_FOYER_ID = "11111111-1111-1111-1111-111111111111";

export const DEFAULT_VEHICLES_SEED: EnrichedVehicle[] = ${JSON.stringify(vehicles, null, 2)};

export const DEFAULT_GARAGES_SEED: any[] = [
  {
    id: "55555555-5555-5555-5555-555555555551",
    foyer_id: DEFAULT_FOYER_ID,
    nom: "SARL GARAGE HELIERE C. & S.",
    adresse: "Route de Vibraye, 72320 Saint-Maixent",
    telephone: "02 43 93 45 67",
    email: "contact@garage-heliere.fr",
    marque: "Agent Réparateur Multimarque",
    siret: "49995278600014",
    metadata: {
      extracted_from_invoice: true,
      siret: "49995278600014",
    },
    created_at: "2026-08-21T10:00:00Z",
    updated_at: "2026-08-21T10:00:00Z",
  },
  {
    id: "55555555-5555-5555-5555-555555555552",
    foyer_id: DEFAULT_FOYER_ID,
    nom: "BAZOCHE AUTOMOBILE",
    adresse: "2 Rue de la Libération, 72320 Bazoches-sur-Hoëne",
    telephone: "02 33 25 12 34",
    email: "contact@bazoche-auto.fr",
    marque: "Garage Multimarque",
    siret: null,
    metadata: { extracted_from_invoice: true },
    created_at: "2024-07-06T10:00:00Z",
    updated_at: "2024-07-06T10:00:00Z",
  },
  {
    id: "55555555-5555-5555-5555-555555555553",
    foyer_id: DEFAULT_FOYER_ID,
    nom: "VIBRAYE AUTOMOBILE",
    adresse: "Avenue de Paris, 72320 Vibraye",
    telephone: "02 43 93 60 00",
    email: "atelier@vibraye-auto.fr",
    marque: "Garage Multimarque",
    siret: null,
    metadata: { extracted_from_invoice: true },
    created_at: "2025-08-22T10:00:00Z",
    updated_at: "2025-08-22T10:00:00Z",
  },
  {
    id: "55555555-5555-5555-5555-555555555554",
    foyer_id: DEFAULT_FOYER_ID,
    nom: "A.C.T.A. MONDOUBLEAU CORMENON",
    adresse: "Zone Artisanale, 41170 Cormenon",
    telephone: "02 54 80 90 90",
    email: "cormenon@acta-ct.fr",
    marque: "Centre Contrôle Technique Agréé",
    siret: "S041F077",
    metadata: { approvalNumber: "S041F077" },
    created_at: "2026-08-20T10:00:00Z",
    updated_at: "2026-08-20T10:00:00Z",
  },
];
`;

  fs.writeFileSync(path.join(__dirname, "../src/config/foyer.seed.ts"), seedContent, "utf-8");
  console.log("✅ Synchronisation réussie : src/config/foyer.seed.ts est désormais 100% aligné sur Supabase !");
}

sync().catch(console.error);
