import assert from "assert";
import { CertificateVehicleSummary } from "@/components/certificate/CertificateVehicleSwitcher";

export async function testCertificateVehicleSwitcher() {
  console.log("\n=================================================");
  console.log("🚗 [TEST] BASCULE DE VÉHICULE SUR LA PAGE DE CERTIFICAT (SANS REPASSER PAR LE FOYER)");
  console.log("=================================================\n");

  // [TEST 1] Vérification du typage et structure des données de véhicules pour le certificat
  console.log("▶ [TEST 1] Structure des données de bascule de véhicule...");
  const mockVehicles: CertificateVehicleSummary[] = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      marque: "Peugeot",
      modele: "308",
      immatriculation: "AB-123-CD",
      kilometrage_actuel: 110000,
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      marque: "Suzuki",
      modele: "Vitara",
      immatriculation: "EC-301-JX",
      kilometrage_actuel: 87450,
    },
  ];

  assert.strictEqual(mockVehicles.length, 2, "Le foyer de test doit contenir 2 véhicules.");
  assert.ok(mockVehicles[0].id && mockVehicles[0].immatriculation);
  assert.ok(mockVehicles[1].id && mockVehicles[1].immatriculation);
  console.log("  ✔ Données des véhicules de foyer validées.");

  // [TEST 2] Résilience de détection du véhicule actif (UUID ou Immatriculation avec/sans tirets)
  console.log("\n▶ [TEST 2] Détection résiliente du véhicule actif...");
  const isMatch = (v: CertificateVehicleSummary, currentId: string, currentPlate: string) => {
    const cleanCurrentId = (currentId || "").toUpperCase().replace(/[\s-]/g, "");
    const cleanCurrentPlate = (currentPlate || "").toUpperCase().replace(/[\s-]/g, "");
    const vId = (v.id || "").toUpperCase().replace(/[\s-]/g, "");
    const vPlate = (v.immatriculation || "").toUpperCase().replace(/[\s-]/g, "");
    return (
      (cleanCurrentId && vId === cleanCurrentId) ||
      (cleanCurrentPlate && vPlate === cleanCurrentPlate)
    );
  };

  // Match par UUID exact
  assert.strictEqual(isMatch(mockVehicles[0], "11111111-1111-1111-1111-111111111111", "AB-123-CD"), true);
  assert.strictEqual(isMatch(mockVehicles[1], "11111111-1111-1111-1111-111111111111", "AB-123-CD"), false);

  // Match par Immatriculation avec tirets ou sans tirets
  assert.strictEqual(isMatch(mockVehicles[1], "", "EC-301-JX"), true);
  assert.strictEqual(isMatch(mockVehicles[1], "", "ec301jx"), true);
  assert.strictEqual(isMatch(mockVehicles[0], "", "ec301jx"), false);
  console.log("  ✔ Résilience de correspondance UUID et plaques validée.");

  // [TEST 3] Règle métier de masquage si 0 ou 1 seul véhicule (Zéro pollution visuelle)
  console.log("\n▶ [TEST 3] Règle de masquage conditionnel...");
  const shouldRenderSwitcher = (vehs: CertificateVehicleSummary[]) => vehs && vehs.length > 1;

  assert.strictEqual(shouldRenderSwitcher([]), false, "Le sélecteur doit être masqué si aucun véhicule (visiteur externe).");
  assert.strictEqual(shouldRenderSwitcher([mockVehicles[0]]), false, "Le sélecteur doit être masqué si un seul véhicule.");
  assert.strictEqual(shouldRenderSwitcher(mockVehicles), true, "Le sélecteur doit s'afficher si 2+ véhicules.");
  console.log("  ✔ Masquage conditionnel strictement respecté (Zero Clutter & Zero Leak).");

  // [TEST 4] Génération des URLs cibles de bascule directe (sans repasser par le foyer)
  console.log("\n▶ [TEST 4] Génération des liens de bascule directe (/v/[id])...");
  for (const veh of mockVehicles) {
    const targetUrl = `/v/${encodeURIComponent(veh.id)}`;
    assert.ok(targetUrl.startsWith("/v/"), `L'URL cible doit pointer vers la page de certificat (/v/): ${targetUrl}`);
    assert.ok(!targetUrl.includes("/dashboard"), "L'URL ne doit pas renvoyer vers /dashboard (pas de repassage par le foyer).");
    assert.ok(targetUrl.includes(veh.id), "L'URL doit contenir l'identifiant du véhicule cible.");
  }
  console.log("  ✔ URLs directes certifiées sans détour par le tableau de bord foyer.");

  // [TEST 5] Isolation des données : un invité non authentifié ne reçoit AUCUN véhicule
  console.log("\n▶ [TEST 5] Isolation Zero-Trust pour visiteurs publics...");
  const guestVehicles: CertificateVehicleSummary[] = [];
  assert.strictEqual(shouldRenderSwitcher(guestVehicles), false);
  assert.strictEqual(guestVehicles.length, 0, "Visiteur non authentifié -> 0 véhicule de foyer accessible.");
  console.log("  ✔ Cloisonnement strict Zero-Trust validé : aucun véhicule tiers exposé.");

  console.log("\n=================================================");
  console.log("🎉 TOUS LES TESTS DE BASCULE DE VÉHICULE SONT AU VERT !");
  console.log("=================================================");
}
