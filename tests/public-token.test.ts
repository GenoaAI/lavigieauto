import { getVehicleDetailsAction } from "@/app/actions/vehicles";
import * as fs from "fs";
import * as path from "path";

export async function testPublicTokenAndZeroFakeData() {
  console.log("▶ [TEST] Certificat Public de Revente & Règle Strict Zéro Fake Data (/v/[public_token])...");

  // 1. Test de non-existence : un token inconnu doit retourner null
  const nonExistentResult = await getVehicleDetailsAction("unknown-token-999999");
  if (nonExistentResult !== null) {
    throw new Error("getVehicleDetailsAction doit renvoyer null pour un identifiant inconnu.");
  }
  console.log("  ✔ Résolution de token inconnu renvoie null (pas de données artificielles injectées).");

  // 2. Test d'inspection du code source de la page publique pour garantir l'absence de fake data fallback
  const pagePath = path.resolve(process.cwd(), "src/app/v/[public_token]/page.tsx");
  const sourceCode = fs.readFileSync(pagePath, "utf-8");

  if (sourceCode.includes("22222222-2222-2222-2222-222222222222")) {
    throw new Error("La page /v/[public_token] contient encore l'UUID d'un véhicule de secours fictif hardcodé !");
  }

  if (sourceCode.includes("EC301JX")) {
    throw new Error("La page /v/[public_token] contient encore une immatriculation hardcodée !");
  }

  if (!sourceCode.includes("notFound()")) {
    throw new Error("La page /v/[public_token] doit invoquer notFound() en l'absence de véhicule valide.");
  }

  console.log("  ✔ Absence totale d'objet véhicule fictif de secours confirmée dans /v/[public_token]/page.tsx.");
  console.log("  ✔ Invalidation 404 propre via notFound() confirmée.");
}

if (process.argv[1]?.includes("public-token.test")) {
  testPublicTokenAndZeroFakeData()
    .then(() => console.log("🎉 Test public token validé !"))
    .catch((err) => {
      console.error("❌ Échec :", err);
      process.exit(1);
    });
}
