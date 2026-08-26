import {
  parseTireDimension,
  estimateMountingCostPerTire,
  searchTireOffers,
  TIRE_MERCHANTS,
} from "../src/lib/tire-search/service";
import {
  tireSearchQuerySchema,
  tireOffersResponseSchema,
} from "../src/lib/security/schemas";
import { sanitizeTireDimension, sanitizePostalCode, sanitizeExternalUrl } from "../src/lib/security/sanitizer";

export async function testTireSearchService() {
  console.log("▶ [TEST] Comparateur Pneumatiques : Agrégation des Prix & Forfait Pose...");

  // 1. Test de sanitisation & sécurité
  const rawDim = "<div class='dim-box'><b>215 / 55 R17 94W</b></div>";
  const cleanedDim = sanitizeTireDimension(rawDim);
  if (cleanedDim.includes("<") || cleanedDim.includes(">") || cleanedDim !== "215 / 55 R17 94W") {
    throw new Error(`Sanitisation de dimension invalide : ${cleanedDim}`);
  }


  const sanitizedPostal = sanitizePostalCode("75015-extra");
  if (sanitizedPostal !== "75015") {
    throw new Error(`Code postal assaini invalide : ${sanitizedPostal}`);
  }

  const safeUrl = sanitizeExternalUrl("https://www.allopneus.com/trouver-des-pneus");
  const unsafeUrl = sanitizeExternalUrl("javascript:alert(1)");
  if (!safeUrl.startsWith("https://") || unsafeUrl !== "#") {
    throw new Error("Validation des URLs marchands défaillante.");
  }
  console.log("  ✔ Sanitisation et sécurité des entrées pneumatiques validées.");

  // 2. Test du parsing dimensionnel
  const parsed17 = parseTireDimension("215/55 R17 94W");
  if (parsed17.width !== 215 || parsed17.height !== 55 || parsed17.diameter !== 17 || parsed17.loadIndex !== "94" || parsed17.speedRating !== "W") {
    throw new Error(`Échec parsing 215/55 R17 94W : ${JSON.stringify(parsed17)}`);
  }

  const parsed18 = parseTireDimension("225/55R18 102V");
  if (parsed18.width !== 225 || parsed18.height !== 55 || parsed18.diameter !== 18) {
    throw new Error(`Échec parsing 225/55R18 : ${JSON.stringify(parsed18)}`);
  }
  console.log("  ✔ Analyse dimensionnelle (Largeur, Hauteur, Diamètre, Indices) validée.");

  // 3. Test du forfait pose et équilibrage selon taille de jante
  const cost15 = estimateMountingCostPerTire(15);
  const cost17 = estimateMountingCostPerTire(17);
  const cost18 = estimateMountingCostPerTire(18);
  if (cost15 > cost17 || cost17 > cost18) {
    throw new Error("Le coût de montage devrait être progressif selon le diamètre de jante.");
  }
  console.log(`  ✔ Forfaits pose & équilibrage validés (15": ${cost15}€, 17": ${cost17}€, 18": ${cost18}€).`);

  // 4. Test d'agrégation des offres pour 2 pneus (Suzuki Vitara 215/55 R17)
  const result2Pneus = await searchTireOffers({
    dimension: "215/55 R17 94W",
    quantity: 2,
  });

  if (!result2Pneus.success) {
    throw new Error(`Recherche 2 pneus a échoué: ${result2Pneus.error}`);
  }
  if (result2Pneus.offers.length !== 3) {
    throw new Error(`Attendu 3 meilleures offres, reçu : ${result2Pneus.offers.length}`);
  }

  // Vérifier le calcul mathématique du coût total
  for (const offer of result2Pneus.offers) {
    const expectedTiresSubtotal = Math.round(offer.unitPrice * 2 * 100) / 100;
    const expectedMountingTotal = Math.round(offer.mountingCostPerTire * 2 * 100) / 100;
    const expectedTotal = Math.round((expectedTiresSubtotal + expectedMountingTotal) * 100) / 100;

    if (Math.abs(offer.tiresSubtotal - expectedTiresSubtotal) > 0.01) {
      throw new Error(`Sous-total pneus incorrect pour ${offer.merchantName}: attendu ${expectedTiresSubtotal}, reçu ${offer.tiresSubtotal}`);
    }
    if (Math.abs(offer.mountingTotal - expectedMountingTotal) > 0.01) {
      throw new Error(`Sous-total montage incorrect pour ${offer.merchantName}: attendu ${expectedMountingTotal}, reçu ${offer.mountingTotal}`);
    }
    if (Math.abs(offer.totalPrice - expectedTotal) > 0.01) {
      throw new Error(`Prix total TTC incorrect pour ${offer.merchantName}: attendu ${expectedTotal}, reçu ${offer.totalPrice}`);
    }
    if (!offer.offerUrl || !offer.offerUrl.startsWith("https://")) {
      throw new Error(`URL directe manquante ou non sécurisée pour ${offer.merchantName}: ${offer.offerUrl}`);
    }
  }

  // Vérifier le tri ascendant strict par prix total
  if (result2Pneus.offers[0].totalPrice > result2Pneus.offers[1].totalPrice ||
      result2Pneus.offers[1].totalPrice > result2Pneus.offers[2].totalPrice) {
    throw new Error("Les offres ne sont pas correctement triées par prix total ascendant.");
  }
  if (!result2Pneus.offers[0].isBestPrice) {
    throw new Error("L'offre la moins chère doit avoir isBestPrice = true.");
  }
  console.log(`  ✔ Calcul mathématique 2 pneus validé (Meilleure offre : ${result2Pneus.offers[0].merchantName} à ${result2Pneus.offers[0].totalPrice}€ TTC tout compris).`);

  // 5. Test pour 4 pneus complets
  const result4Pneus = await searchTireOffers({
    dimension: "225/55 R18 102V",
    quantity: 4,
  });

  if (!result4Pneus.success || result4Pneus.offers.length === 0) {
    throw new Error("Recherche 4 pneus a échoué.");
  }
  const first4 = result4Pneus.offers[0];
  if (first4.quantity !== 4) {
    throw new Error(`Quantité attendue 4, reçu : ${first4.quantity}`);
  }
  if (first4.mountingTotal !== Math.round(first4.mountingCostPerTire * 4 * 100) / 100) {
    throw new Error(`Montage 4 pneus incorrect : ${first4.mountingTotal}`);
  }
  console.log(`  ✔ Calcul mathématique 4 pneus validé (Total : ${first4.totalPrice}€ avec ${first4.mountingTotal}€ de pose).`);

  // 6. Test de résilience et dégradation élégante en cas d'erreur / chaîne atypique
  const resultFallback = await searchTireOffers({
    dimension: "UNKNOWN_FORMAT_XYZ",
    quantity: 2,
  });

  if (!resultFallback.success || resultFallback.offers.length === 0) {
    throw new Error("La dégradation élégante doit renvoyer un jeu d'offres de secours sécurisé.");
  }
  console.log("  ✔ Résilience et dégradation élégante validées.");
}
