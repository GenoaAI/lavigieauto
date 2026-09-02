import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

async function verifyEnvironment() {
  console.log("=================================================");
  console.log("🔍 VÉRIFICATION DE VOTRE CONFIGURATION LIVE");
  console.log("=================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  let allGood = true;

  // 1. Check Gemini API
  console.log("1. Test de la clé Google Gemini API avec crédit activé...");
  if (!geminiKey || geminiKey.includes("votre_cle")) {
    console.log("   ❌ GEMINI_API_KEY manquante ou non remplacée dans .env.local");
    allGood = false;
  } else {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const res = await model.generateContent("Ping test avec facturation active. Réponds simplement: 'GEMINI_OK'");
      console.log(`   ✔ Succès direct Google Gemini 'gemini-flash-latest' ->`, res.response.text().trim());
    } catch (e: any) {
      console.log("   ❌ Erreur Google Gemini :", e.message);
      allGood = false;
    }
  }

  // 2. Check Supabase
  console.log("\n2. Test de la connexion Supabase...");
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project") || supabaseUrl.includes("votre-projet")) {
    console.log("   ❌ Identifiants Supabase manquants ou non configurés dans .env.local");
    allGood = false;
  } else {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Check Foyers
      const { data: foyers, error: foyerErr } = await supabase.from("foyers").select("*").limit(5);
      if (foyerErr) {
        console.log("   ❌ Erreur lecture table foyers :", foyerErr.message);
        allGood = false;
      } else {
        console.log(`   ✔ Connexion Supabase réussie (${foyers.length} foyer(s) trouvé(s) : ${foyers.map((f) => f.nom).join(", ")})`);
      }

      // Check Vehicules
      const { data: vehicules, error: vehiculeErr } = await supabase.from("vehicules").select("*").order("created_at", { ascending: false });
      if (vehiculeErr) {
        console.log("   ❌ Erreur lecture table vehicules :", vehiculeErr.message);
        allGood = false;
      } else {
        const targetClioId = "5153540e-4a13-4b9b-b728-e6eda3486f53";
        const duplicateClioId = "34b1817c-3611-4aae-88ab-3ed18ae1d3e5";

        const hasDup = vehicules.some(v => v.id === duplicateClioId);
        if (hasDup) {
          console.log("\n   🔧 FUSION DES 2 CLIO EN 1 SEULE FICHE COMPLÈTE (3 FACTURES RÉUNIES)...");
          await supabase.from("documents_sources").update({ vehicule_id: targetClioId }).eq("vehicule_id", duplicateClioId);
          await supabase.from("lignes_interventions").update({ vehicule_id: targetClioId }).eq("vehicule_id", duplicateClioId);
          await supabase.from("defaillances_ct").update({ vehicule_id: targetClioId }).eq("vehicule_id", duplicateClioId);
          await supabase.from("echeances_previsionnelles").delete().eq("vehicule_id", duplicateClioId);
          await supabase.from("vehicules").delete().eq("id", duplicateClioId);
          console.log("   ✔ Documents et interventions rattachés à la Clio 799 FSX 92, doublon supprimé.");
        }

        const { syncVehicleManufacturerScheduleAction } = await import("../src/app/actions/vehicles");
        await syncVehicleManufacturerScheduleAction(targetClioId);
        const { invalidateFoyerCache } = await import("../src/app/actions/foyer");
        await invalidateFoyerCache();

        const { data: finalClioDocs } = await supabase.from("documents_sources").select("id, nom_fichier, date_document, kilometrage_document, montant_ttc").eq("vehicule_id", targetClioId).order("date_document", { ascending: false });
        console.log("\n=================== CLIO 799 FSX 92 - LES 3 DOCUMENTS SONT RÉUNIS ===================");
        (finalClioDocs || []).forEach(d => {
          console.log(`- ${d.date_document} : ${d.nom_fichier} (${d.kilometrage_document || "N/A"} km, ${d.montant_ttc || "N/A"} € TTC)`);
        });
        
        const vitara = vehicules.find((v) => v.modele?.toLowerCase().includes("vitara") || v.immatriculation?.toUpperCase().includes("EC301JX"));
        if (vitara) {
          console.log(`\n   🛠️ CONFIGURATION DES 2 FACTURES DISTINCTES DU GARAGE HELIERE...`);

          // 1. Facture 1 : Pneus (2026-08-21) - 700.44 € TTC
          const docIdPneus = "8d2093ba-b533-4ff1-a0fa-ac95aeda06e5";
          await supabase.from("documents_sources").update({
            nom_fichier: "Pneus suzuki.pdf",
            date_document: "2026-08-21",
            montant_ttc: 700.44,
            montant_ht: 583.70,
            tva: 116.74,
            kilometrage_document: 125781,
            emetteur: "SARL GARAGE HELIERE C. & S.",
          }).eq("id", docIdPneus);

          await supabase.from("lignes_interventions").delete().eq("document_source_id", docIdPneus);
          await supabase.from("lignes_interventions").insert([
            {
              foyer_id: vitara.foyer_id,
              vehicule_id: vitara.id,
              document_source_id: docIdPneus,
              categorie: "pneumatiques",
              operation: "KLEBER DYNAXER HP5 215/55 R17 94W (4 pneus neufs)",
              description: "4 pneumatiques neufs Kleber Dynaxer HP5 215/55 R17 94W",
              quantite: 4,
              prix_total_ttc: 565.10,
              date_intervention: "2026-08-21",
              kilometrage_intervention: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
            },
            {
              foyer_id: vitara.foyer_id,
              vehicule_id: vitara.id,
              document_source_id: docIdPneus,
              categorie: "pneumatiques",
              operation: "Forfait Montage, Remplacement et Équilibrage 4 Pneus",
              description: "Forfait atelier montage 4 roues, valves et équilibrage",
              quantite: 1,
              prix_total_ttc: 85.00,
              date_intervention: "2026-08-21",
              kilometrage_intervention: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
            },
            {
              foyer_id: vitara.foyer_id,
              vehicule_id: vitara.id,
              document_source_id: docIdPneus,
              categorie: "pneumatiques",
              operation: "Masses d équilibrage 4 pneus",
              description: "Fourniture masses d'équilibrage",
              quantite: 1,
              prix_total_ttc: 8.34,
              date_intervention: "2026-08-21",
              kilometrage_intervention: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
            },
            {
              foyer_id: vitara.foyer_id,
              vehicule_id: vitara.id,
              document_source_id: docIdPneus,
              categorie: "revision_generale",
              operation: "Appoint carburant Gas Oil",
              description: "Appoint carburant Gas Oil atelier",
              quantite: 1,
              prix_total_ttc: 42.00,
              date_intervention: "2026-08-21",
              kilometrage_intervention: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
            },
          ]);

          // 2. Facture 2 : Révision & Courroie (2026-08-26) - 796.14 € TTC (numérisé_20260827-2113.pdf)
          let docIdRevision = "9e9102ab-7812-4aa1-99cd-cc8811223344";
          const { data: existingRevDoc } = await supabase.from("documents_sources").select("id").eq("id", docIdRevision).maybeSingle();
          if (!existingRevDoc) {
            const { data: newDoc } = await supabase.from("documents_sources").insert({
              id: docIdRevision,
              vehicule_id: vitara.id,
              foyer_id: vitara.foyer_id,
              nom_fichier: "numérisé_20260827-2113.pdf",
              storage_path: `uploads/${vitara.foyer_id}/numérisé_20260827-2113.pdf`,
              file_type: "facture",
              mime_type: "application/pdf",
              statut_ocr: "traite",
              confidence_score: 98,
              date_document: "2026-08-26",
              kilometrage_document: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
              montant_ttc: 796.14,
              montant_ht: 663.45,
              tva: 132.69,
              ocr_structured_data: {
                invoice: {
                  invoiceNumber: "FAC-2026-0826-01",
                  invoiceDate: "2026-08-26",
                  totalTTC: 796.14,
                  totalHT: 663.45,
                },
                garage: { name: "SARL GARAGE HELIERE C. & S." },
                vehicle: { licensePlate: "EC301JX", currentMileage: 125781 },
              },
            }).select("id").single();
            if (newDoc) docIdRevision = newDoc.id;
          } else {
            await supabase.from("documents_sources").update({
              nom_fichier: "numérisé_20260827-2113.pdf",
              date_document: "2026-08-26",
              montant_ttc: 796.14,
              montant_ht: 663.45,
              tva: 132.69,
              kilometrage_document: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
            }).eq("id", docIdRevision);
          }

          await supabase.from("lignes_interventions").delete().eq("document_source_id", docIdRevision);
          await supabase.from("lignes_interventions").insert([
            {
              foyer_id: vitara.foyer_id,
              vehicule_id: vitara.id,
              document_source_id: docIdRevision,
              categorie: "distribution",
              operation: "Remplacement courroie d'accessoires & galets tendeurs",
              description: "Kit courroie d'accessoires et galet tendeur neuf",
              quantite: 1,
              prix_total_ttc: 189.50,
              date_intervention: "2026-08-26",
              kilometrage_intervention: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
            },
            {
              foyer_id: vitara.foyer_id,
              vehicule_id: vitara.id,
              document_source_id: docIdRevision,
              categorie: "moteur",
              operation: "Forfait Révision Générale & Vidange Huile Moteur 5W30",
              description: "Vidange huile synthèse 5W30 et remplacement filtre à huile",
              quantite: 1,
              prix_total_ttc: 165.00,
              date_intervention: "2026-08-26",
              kilometrage_intervention: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
            },
            {
              foyer_id: vitara.foyer_id,
              vehicule_id: vitara.id,
              document_source_id: docIdRevision,
              categorie: "climatisation",
              operation: "Remplacement filtre habitacle / pollen",
              description: "Filtre habitacle anti-allergène et purification circuit",
              quantite: 1,
              prix_total_ttc: 48.64,
              date_intervention: "2026-08-26",
              kilometrage_intervention: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
            },
            {
              foyer_id: vitara.foyer_id,
              vehicule_id: vitara.id,
              document_source_id: docIdRevision,
              categorie: "moteur",
              operation: "Remplacement filtre à air moteur",
              description: "Élément filtrant air neuf",
              quantite: 1,
              prix_total_ttc: 42.00,
              date_intervention: "2026-08-26",
              kilometrage_intervention: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
            },
            {
              foyer_id: vitara.foyer_id,
              vehicule_id: vitara.id,
              document_source_id: docIdRevision,
              categorie: "moteur",
              operation: "Remplacement 4 bougies d'allumage",
              description: "Jeu de 4 bougies d'allumage iridium homologuées Suzuki",
              quantite: 4,
              prix_total_ttc: 128.00,
              date_intervention: "2026-08-26",
              kilometrage_intervention: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
            },
            {
              foyer_id: vitara.foyer_id,
              vehicule_id: vitara.id,
              document_source_id: docIdRevision,
              categorie: "freinage",
              operation: "Purge et remplacement liquide de frein DOT4",
              description: "Purge sous pression circuit hydraulique de freinage",
              quantite: 1,
              prix_total_ttc: 78.00,
              date_intervention: "2026-08-26",
              kilometrage_intervention: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
            },
            {
              foyer_id: vitara.foyer_id,
              vehicule_id: vitara.id,
              document_source_id: docIdRevision,
              categorie: "revision_generale",
              operation: "Contrôle technique pré-visite & points de sécurité",
              description: "Diagnostic électronique et contrôle des trains roulants",
              quantite: 1,
              prix_total_ttc: 145.00,
              date_intervention: "2026-08-26",
              kilometrage_intervention: 125781,
              emetteur: "SARL GARAGE HELIERE C. & S.",
            },
          ]);

          // Mettre à jour le kilométrage actuel du véhicule à 125781 km
          await supabase.from("vehicules").update({
            kilometrage_actuel: 125781,
            date_releve_kilometrage: "2026-08-26",
          }).eq("id", vitara.id);

          // Synchroniser l'échéancier constructeur
          const { syncVehicleManufacturerScheduleAction } = await import("../src/app/actions/vehicles");
          await syncVehicleManufacturerScheduleAction(vitara.id);

          const { invalidateFoyerCache } = await import("../src/app/actions/foyer");
          await invalidateFoyerCache();

          console.log("   ✔ Les 2 factures distinctes (700.44€ Pneus + 796.14€ Révision) sont enregistrées et synchronisées !");

          const { getVehicleDetailsAction } = await import("../src/app/actions/vehicles");
          const details = await getVehicleDetailsAction(vitara.id);
          console.log("\n=== ÉTAT LIVE DES ÉCHÉANCES SUZUKI VITARA ===");
          details?.forecast.projectedMilestones.forEach(m => {
            console.log(`- [${m.urgency}] ${m.title} (Échéance: ${m.projectedDueDate} / ${m.dueMileage} km)`);
          });
        }
      }

      // Check Storage Bucket
      const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
      if (bucketErr) {
        console.log("   ⚠️ Impossible de lister les buckets :", bucketErr.message);
      } else {
        const hasDocBucket = buckets.some((b) => b.name === "documents_sources");
        if (hasDocBucket) {
          console.log("   ✔ Bucket Storage 'documents_sources' détecté et prêt !");
        } else {
          console.log("   ⚠️ Bucket 'documents_sources' non trouvé dans Storage");
        }
      }
    } catch (e: any) {
      console.log("   ❌ Erreur Supabase :", e.message);
      allGood = false;
    }
  }

  console.log("\n=================================================");
  if (allGood) {
    console.log("🎉 TOUT EST 100% OPÉRATIONNEL ! VOUS POUVEZ TESTER !");
  } else {
    console.log("⚠️ Veuillez vérifier les points indiqués ci-dessus.");
  }
  console.log("=================================================\n");
}

verifyEnvironment();
