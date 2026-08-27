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
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
      const listRes = await fetch(listUrl);
      if (listRes.ok) {
        const listJson = await listRes.json();
        const models = (listJson.models || []).map((m: any) => m.name.replace("models/", ""));
        console.log("   📋 Modèles autorisés sur votre clé Google API :", models.slice(0, 10).join(", "));
        
        // Tester le 1er modèle supportant generateContent
        const supported = (listJson.models || []).find((m: any) => m.supportedGenerationMethods?.includes("generateContent"));
        if (supported) {
          const modName = supported.name.replace("models/", "");
          const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modName}:generateContent?key=${geminiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Ping test. Reponds uniquement PONG" }] }] }),
          });
          if (testRes.ok) {
            console.log(`   ✔ Test de génération réussi avec '${modName}' !`);
          } else {
            console.log(`   ⚠️ Test de génération échoué sur '${modName}' (HTTP ${testRes.status})`);
          }
        }
      } else {
        console.log(`   ❌ Impossible de lister les modèles (HTTP ${listRes.status})`);
      }
    } catch (e: any) {
      console.log("   ❌ Erreur listage modèles :", e.message);
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
      const { data: vehicules, error: vehiculeErr } = await supabase.from("vehicules").select("*").limit(5);
      if (vehiculeErr) {
        console.log("   ❌ Erreur lecture table vehicules :", vehiculeErr.message);
        allGood = false;
      } else {
        console.log(`   ✔ Table vehicules OK : ${vehicules.map((v) => `${v.marque} ${v.modele} (${v.immatriculation})`).join(", ")}`);
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
