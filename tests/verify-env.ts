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
  console.log("1. Test de la clé Google Gemini API...");
  if (!geminiKey || geminiKey.includes("votre_cle")) {
    console.log("   ❌ GEMINI_API_KEY manquante ou non remplacée dans .env.local");
    allGood = false;
  } else {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const testModels = ["gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-pro-latest", "gemini-2.5-pro", "gemini-flash-latest"];
      for (const m of testModels) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const res = await model.generateContent("Ping test. Réponds: PONG");
          console.log(`   ✔ Succès avec '${m}' ->`, res.response.text().trim());
        } catch (err: any) {
          console.log(`   ⚠️ '${m}' en erreur:`, err.message);
        }
      }
    } catch (e: any) {
      console.log("   ❌ Erreur globale SDK Gemini :", e.message);
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
        console.log(`   ✔ Table vehicules OK : ${vehicules.map((v) => `${v.marque} ${v.modele} (${v.immatriculation} / ${v.kilometrage_actuel}km)`).join(", ")}`);
        
        const vitara = vehicules.find((v) => v.modele?.toLowerCase().includes("vitara") || v.immatriculation?.toUpperCase().includes("EC301JX"));
        if (vitara) {
          console.log(`\n   🔍 DÉTAIL SUZUKI VITARA (ID: ${vitara.id}) :`);
          const { data: docs } = await supabase.from("documents_sources").select("*").eq("vehicule_id", vitara.id).order("created_at", { ascending: false });
          console.log(`      Documents (${docs?.length || 0}) :`, docs?.map(d => `${d.nom_fichier} | ${d.date_document} | ${d.kilometrage_document}km | ${d.montant_ttc}€ | ${d.emetteur}`));

          const { data: lines } = await supabase.from("lignes_interventions").select("*").eq("vehicule_id", vitara.id).order("created_at", { ascending: false });
          console.log(`      Lignes interventions (${lines?.length || 0}) :`, lines?.map(l => `${l.date_intervention} | ${l.operation} | ${l.prix_total_ttc}€ | ${l.emetteur}`));
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
