import { createClient } from "@supabase/supabase-js";
import { DEFAULT_VEHICLES_SEED, DEFAULT_GARAGES_SEED } from "../src/config/foyer.seed";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhqsbdrfwbyyeooazut.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFzYmRyZndieXllb29henV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NDE3NCwiZXhwIjoyMTAzMTQwMTc0fQ.GCrMH__zpc2k_mVBMpD2CNUxDrmoqXru-MDrmTlNUG0";

async function compareLocalAndOnline() {
  console.log("================================================================================");
  console.log("🔍 AUDIT COMPARATIF SYSTÉMATIQUE : DOCUMENTS & DONNÉES LOCAL vs EN LIGNE (SUPABASE)");
  console.log("================================================================================\n");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Fetch Online Supabase Data
  console.log("🌐 Connexion à Supabase Production (" + supabaseUrl + ")...");
  
  const [foyersRes, vehRes, docsRes, linesRes, garagesRes, storageRes] = await Promise.all([
    supabase.from("foyers").select("*"),
    supabase.from("vehicules").select("*"),
    supabase.from("documents_sources").select("*"),
    supabase.from("lignes_interventions").select("*"),
    supabase.from("garages").select("*"),
    supabase.storage.from("documents").list(),
  ]);

  console.log("\n--- 1. ÉTAT DE LA BASE EN LIGNE (SUPABASE) ---");
  console.log(`• Foyers en ligne : ${foyersRes.data?.length || 0}`);
  (foyersRes.data || []).forEach((f) => {
    console.log(`  - [Foyer] id: ${f.id} | nom: "${f.nom}" | email: ${(f.metadata as any)?.user_email || "N/A"}`);
  });

  console.log(`\n• Véhicules en ligne : ${vehRes.data?.length || 0}`);
  (vehRes.data || []).forEach((v) => {
    console.log(`  - [Véhicule] id: ${v.id} | immat: ${v.immatriculation} | ${v.marque} ${v.modele} (${v.kilometrage_actuel} km) | foyer_id: ${v.foyer_id}`);
  });

  console.log(`\n• Documents scannés / sources en ligne : ${docsRes.data?.length || 0}`);
  if (docsRes.data && docsRes.data.length > 0) {
    docsRes.data.forEach((d) => {
      console.log(`  - [Doc] id: ${d.id} | fichier: ${d.nom_fichier} | type: ${d.file_type} | date: ${d.date_document} | km: ${d.kilometrage_document} | émetteur: "${d.emetteur}" | garage_id: ${d.garage_id} | vehicule_id: ${d.vehicule_id}`);
      if (d.ocr_structured_data) {
        console.log(`    -> OCR Garage : ${JSON.stringify((d.ocr_structured_data as any).garage || (d.ocr_structured_data as any).center || "N/A")}`);
      }
    });
  } else {
    console.log("  ⚠️ Aucun document trouvé dans la table documents_sources en ligne.");
  }

  console.log(`\n• Interventions / Factures détaillées en ligne : ${linesRes.data?.length || 0}`);
  (linesRes.data || []).forEach((l) => {
    console.log(`  - [Ligne] id: ${l.id} | date: ${l.date_intervention} | km: ${l.kilometrage_intervention} | op: "${l.operation}" | émetteur: "${l.emetteur}" | total: ${l.prix_total_ttc} € | vehicule_id: ${l.vehicule_id}`);
  });

  console.log(`\n• Garages enregistrés en ligne : ${garagesRes.data?.length || 0}`);
  (garagesRes.data || []).forEach((g) => {
    console.log(`  - [Garage] id: ${g.id} | nom: "${g.nom}" | tél: ${g.telephone || "N/A"} | adresse: ${g.adresse || "N/A"} | marque: ${g.marque || "N/A"} | siret: ${g.siret || "N/A"}`);
  });

  console.log(`\n• Fichiers physiques dans Supabase Storage (bucket "documents") : ${storageRes.data?.length || 0}`);
  (storageRes.data || []).forEach((s) => {
    console.log(`  - [Fichier Storage] nom: ${s.name} | taille: ${s.metadata?.size} octets`);
  });

  // 2. Local Data
  console.log("\n================================================================================");
  console.log("💻 --- 2. ÉTAT DES DONNÉES EN LOCAL (FOYER.SEED.TS) ---");
  console.log("================================================================================\n");

  console.log(`• Véhicules en local : ${DEFAULT_VEHICLES_SEED.length}`);
  DEFAULT_VEHICLES_SEED.forEach((v) => {
    console.log(`  - [Véhicule Local] id: ${v.id} | immat: ${v.immatriculation} | ${v.marque} ${v.modele} (${v.kilometrage_actuel} km)`);
    console.log(`    -> Documents sources (${v.documents_sources?.length || 0}) :`);
    (v.documents_sources || []).forEach((d) => {
      console.log(`       * [Doc Local] id: ${d.id} | fichier: ${d.nom_fichier} | type: ${d.file_type} | date: ${d.date_document} | km: ${d.kilometrage_document} | émetteur: "${d.emetteur}"`);
    });
    console.log(`    -> Interventions (${v.lignes_interventions?.length || 0}) :`);
    (v.lignes_interventions || []).forEach((l) => {
      console.log(`       * [Intervention Local] id: ${l.id} | date: ${l.date_intervention} | km: ${l.kilometrage_intervention} | op: "${l.operation}" | ${l.prix_total_ttc} €`);
    });
  });

  console.log(`\n• Garages en local : ${DEFAULT_GARAGES_SEED.length}`);
  DEFAULT_GARAGES_SEED.forEach((g) => {
    console.log(`  - [Garage Local] id: ${g.id} | nom: "${g.nom}" | tél: ${g.telephone || "N/A"} | siret: ${g.siret || "N/A"}`);
  });

  console.log("\n================================================================================");
  console.log("📊 --- 3. RAPPORT DE DIFFÉRENCE & SYNCHRONISATION REQUISE ---");
  console.log("================================================================================\n");

  const onlineDocsCount = docsRes.data?.length || 0;
  const localDocsCount = DEFAULT_VEHICLES_SEED.reduce((acc, v) => acc + (v.documents_sources?.length || 0), 0);

  console.log(`• Nombre total de documents : ${onlineDocsCount} en ligne vs ${localDocsCount} en local`);
  
  if (onlineDocsCount === 0 && localDocsCount > 0) {
    console.log("👉 LA BASE EN LIGNE (SUPABASE) N'A PAS ENCORE REÇU LES DOCUMENTS DU FOYER LOCAL.");
    console.log("👉 Pour synchroniser la base en ligne avec les documents réels : exécuter le script de synchronisation / seed.");
  } else if (onlineDocsCount > 0) {
    console.log("👉 La base en ligne contient déjà des documents sources.");
  }
}

compareLocalAndOnline().catch((err) => {
  console.error("❌ Erreur lors de la comparaison:", err);
});
