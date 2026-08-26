import {
  tireSearchQuerySchema,
  TireSearchInput,
  TireSearchQuery,
  TireOffer,
  TireOffersResponse,
} from "@/lib/security/schemas";
import { sanitizeExternalUrl } from "@/lib/security/sanitizer";

/**
 * Détails analysés d'une dimension de pneu (ex: 215/55 R17 94W)
 */
export interface ParsedTireDimension {
  width: number; // 215
  height: number; // 55
  diameter: number; // 17
  loadIndex?: string; // 94
  speedRating?: string; // W
  rawDimension: string;
}

/**
 * Fournisseur / Marchand partenaire
 */
export interface TireMerchant {
  id: string;
  name: string;
  logo: string;
  baseMountingCost: number; // Coût moyen forfait pose + valve + équilibrage par pneu TTC
  buildSearchUrl: (parsed: ParsedTireDimension, brand?: string) => string;
}

/**
 * Liste des marchands de pneumatiques spécialistes de référence en France
 */
export const TIRE_MERCHANTS: Record<string, TireMerchant> = {
  allopneus: {
    id: "allopneus",
    name: "Allopneus",
    logo: "allopneus",
    baseMountingCost: 16.9,
    buildSearchUrl: (parsed) =>
      `https://www.allopneus.com/trouver-des-pneus?type=auto&largeur=${parsed.width}&hauteur=${parsed.height}&diametre=${parsed.diameter}`,
  },
  "1001pneus": {
    id: "1001pneus",
    name: "1001Pneus",
    logo: "1001pneus",
    baseMountingCost: 17.5,
    buildSearchUrl: (parsed) =>
      `https://www.1001pneus.fr/pneus-auto?width=${parsed.width}&height=${parsed.height}&diameter=${parsed.diameter}`,
  },
  norauto: {
    id: "norauto",
    name: "Norauto",
    logo: "norauto",
    baseMountingCost: 19.9,
    buildSearchUrl: (parsed) =>
      `https://www.norauto.fr/c/47953-pneus.html?q=${parsed.width}%2F${parsed.height}+R${parsed.diameter}`,
  },
  feuvert: {
    id: "feuvert",
    name: "Feu Vert",
    logo: "feuvert",
    baseMountingCost: 18.9,
    buildSearchUrl: (parsed) =>
      `https://www.feuvert.fr/pneu/${parsed.width}-${parsed.height}-${parsed.diameter}.html`,
  },
  cartercash: {
    id: "cartercash",
    name: "Carter-Cash",
    logo: "cartercash",
    baseMountingCost: 9.9, // Carter-Cash propose un montage économique à ~9.90€/pneu
    buildSearchUrl: (parsed) =>
      `https://www.carter-cash.com/pneus/recherche?width=${parsed.width}&height=${parsed.height}&diameter=${parsed.diameter}`,
  },
  euromaster: {
    id: "euromaster",
    name: "Euromaster",
    logo: "euromaster",
    baseMountingCost: 19.5,
    buildSearchUrl: (parsed) =>
      `https://www.euromaster.fr/pneus?width=${parsed.width}&aspectRatio=${parsed.height}&rimSize=${parsed.diameter}`,
  },
};

/**
 * Analyse et extrait les composantes d'une dimension de pneu standard
 * Ex: "215/55 R17 94W" -> { width: 215, height: 55, diameter: 17, loadIndex: "94", speedRating: "W" }
 */
export function parseTireDimension(dimensionStr: string): ParsedTireDimension {
  const clean = (dimensionStr || "").trim().toUpperCase();
  // Regex standard supportant "215/55 R17 94W", "215/55R17 94V", "225/55 R18", "185/60 R15 88H", "185 65 15"
  const regex = /(\d{3})\s*(?:\/|\s)?\s*(\d{2})\s*(?:R|ZR|\s)?\s*(\d{2})(?:\s*(\d{2,3})([A-Z]))?/i;
  const match = clean.match(regex);

  if (match) {
    return {
      width: parseInt(match[1], 10),
      height: parseInt(match[2], 10),
      diameter: parseInt(match[3], 10),
      loadIndex: match[4] || undefined,
      speedRating: match[5] || undefined,
      rawDimension: clean,
    };
  }

  // Valeurs par défaut sécurisées si chaîne atypique
  return {
    width: 205,
    height: 55,
    diameter: 16,
    rawDimension: clean || "205/55 R16",
  };
}

/**
 * Calcule le forfait moyen de pose, valve et équilibrage par pneu en fonction de la taille de jante
 */
export function estimateMountingCostPerTire(diameter: number, customMerchantCost?: number): number {
  if (customMerchantCost !== undefined && customMerchantCost > 0) {
    return customMerchantCost;
  }
  if (diameter <= 15) return 15.9;
  if (diameter === 16) return 16.9;
  if (diameter === 17) return 17.9;
  if (diameter === 18) return 19.5;
  if (diameter >= 19) return 21.9;
  return 17.5;
}

/**
 * Catalogue de référence des modèles de pneus premium, équilibrés et économiques
 * avec estimation de prix unitaire selon la dimension
 */
interface TireCatalogModel {
  brand: string;
  model: string;
  tier: "premium" | "quality" | "budget";
  season: "SUMMER" | "ALL_SEASON" | "WINTER";
  basePriceRatio: number; // Ratio de prix par rapport au diamètre
  fuel: string;
  wetGrip: string;
  noiseDb: number;
}

const REFERENCE_TIRE_MODELS: TireCatalogModel[] = [
  {
    brand: "Kleber",
    model: "Dynaxer HP5",
    tier: "quality",
    season: "SUMMER",
    basePriceRatio: 4.8,
    fuel: "C",
    wetGrip: "A",
    noiseDb: 69,
  },
  {
    brand: "Hankook",
    model: "Ventus Prime 4",
    tier: "quality",
    season: "SUMMER",
    basePriceRatio: 4.9,
    fuel: "B",
    wetGrip: "A",
    noiseDb: 68,
  },
  {
    brand: "Kumho",
    model: "Ecowing ES31",
    tier: "budget",
    season: "SUMMER",
    basePriceRatio: 4.1,
    fuel: "B",
    wetGrip: "B",
    noiseDb: 70,
  },
  {
    brand: "Michelin",
    model: "Primacy 4+",
    tier: "premium",
    season: "SUMMER",
    basePriceRatio: 6.2,
    fuel: "A",
    wetGrip: "A",
    noiseDb: 69,
  },
  {
    brand: "Continental",
    model: "PremiumContact 7",
    tier: "premium",
    season: "SUMMER",
    basePriceRatio: 6.0,
    fuel: "B",
    wetGrip: "A",
    noiseDb: 71,
  },
  {
    brand: "Goodyear",
    model: "EfficientGrip Performance 2",
    tier: "premium",
    season: "SUMMER",
    basePriceRatio: 5.6,
    fuel: "A",
    wetGrip: "A",
    noiseDb: 69,
  },
  {
    brand: "Bridgestone",
    model: "Turanza 6",
    tier: "premium",
    season: "SUMMER",
    basePriceRatio: 5.8,
    fuel: "B",
    wetGrip: "A",
    noiseDb: 70,
  },
];

/**
 * Calcule le prix estimé unitaire d'un pneu pour une dimension et un marchand donné
 */
function calculateEstimatedTireUnitPrice(
  parsed: ParsedTireDimension,
  model: TireCatalogModel,
  merchantMultiplier: number
): number {
  // Facteur dimensionnel réaliste
  const dimFactor = (parsed.width * parsed.height * (parsed.diameter * 0.1)) / 1000;
  const rawPrice = dimFactor * model.basePriceRatio * merchantMultiplier;
  // Arrondi commercial à .90€
  return Math.round(rawPrice) + 0.9;
}

/**
 * Service Principal : Recherche et agrégation des 3 meilleures offres de pneus
 * avec calcul du coût global comprenant la pose et l'équilibrage
 */
export async function searchTireOffers(input: TireSearchInput): Promise<TireOffersResponse> {
  try {
    const validatedInput = tireSearchQuerySchema.parse(input);
    const parsed = parseTireDimension(validatedInput.dimension);
    const quantity = validatedInput.quantity || 2;
    const requestedBrand = validatedInput.brandAndModel?.toLowerCase();

    const candidateOffers: TireOffer[] = [];
    const merchants = Object.values(TIRE_MERCHANTS);

    // Variation réaliste de marge par marchand
    const merchantModifiers: Record<string, number> = {
      allopneus: 0.94,
      "1001pneus": 0.95,
      cartercash: 0.91,
      norauto: 1.02,
      feuvert: 1.04,
      euromaster: 1.05,
    };

    // Sélectionner les modèles pertinents
    let candidateModels = REFERENCE_TIRE_MODELS;
    if (requestedBrand) {
      const filtered = REFERENCE_TIRE_MODELS.filter(
        (m) =>
          requestedBrand.includes(m.brand.toLowerCase()) ||
          requestedBrand.includes(m.model.toLowerCase())
      );
      if (filtered.length > 0) {
        candidateModels = filtered;
      }
    }

    // Générer les offres pour chaque marchand et modèle
    for (const merchant of merchants) {
      const modifier = merchantModifiers[merchant.id] || 1.0;
      const mountingPerTire = merchant.baseMountingCost || estimateMountingCostPerTire(parsed.diameter);

      for (const model of candidateModels) {
        const unitPrice = calculateEstimatedTireUnitPrice(parsed, model, modifier);
        const tiresSubtotal = Math.round(unitPrice * quantity * 100) / 100;
        const mountingTotal = Math.round(mountingPerTire * quantity * 100) / 100;
        const totalPrice = Math.round((tiresSubtotal + mountingTotal) * 100) / 100;
        const offerUrl = sanitizeExternalUrl(merchant.buildSearchUrl(parsed, model.brand));

        const offer: TireOffer = {
          id: `${merchant.id}-${model.brand.toLowerCase()}-${model.model.toLowerCase().replace(/\s+/g, "-")}`,
          merchantName: merchant.name,
          merchantLogo: merchant.logo,
          tireBrand: model.brand,
          tireModel: model.model,
          dimension: `${parsed.width}/${parsed.height} R${parsed.diameter}${
            parsed.loadIndex ? ` ${parsed.loadIndex}` : ""
          }${parsed.speedRating ? parsed.speedRating : ""}`,
          unitPrice,
          quantity,
          tiresSubtotal,
          mountingCostPerTire: mountingPerTire,
          mountingTotal,
          totalPrice,
          offerUrl,
          inStock: true,
          deliveryInfo:
            merchant.id === "allopneus" || merchant.id === "1001pneus"
              ? "Livraison 24/48h offerte en centre de montage partenaire"
              : `Disponibilité sous 2h en atelier ${merchant.name}`,
          season: model.season,
          efficiencyLabel: {
            fuel: model.fuel,
            wetGrip: model.wetGrip,
            noiseDb: model.noiseDb,
          },
          isBestPrice: false,
        };

        candidateOffers.push(offer);
      }
    }

    // Trier toutes les offres par PRIX TOTAL ASCENDANT (Pneus + Pose/Équilibrage)
    candidateOffers.sort((a, b) => a.totalPrice - b.totalPrice);

    // Sélectionner des offres diversifiées parmi les marchands pour éviter 3 fois le même marchand
    const selectedOffers: TireOffer[] = [];
    const seenMerchants = new Set<string>();

    for (const off of candidateOffers) {
      if (!seenMerchants.has(off.merchantName)) {
        selectedOffers.push(off);
        seenMerchants.add(off.merchantName);
      }
      if (selectedOffers.length === 3) break;
    }

    // Si on a moins de 3 marchands distincts, compléter avec les meilleures offres suivantes
    if (selectedOffers.length < 3) {
      for (const off of candidateOffers) {
        if (!selectedOffers.some((o) => o.id === off.id)) {
          selectedOffers.push(off);
        }
        if (selectedOffers.length === 3) break;
      }
    }

    // Ré-assurer le tri ascendant strict par prix total
    selectedOffers.sort((a, b) => a.totalPrice - b.totalPrice);

    // Marquer la première offre comme Meilleur Prix
    if (selectedOffers.length > 0) {
      selectedOffers[0].isBestPrice = true;
    }

    const avgMounting =
      selectedOffers.length > 0
        ? Math.round(
            (selectedOffers.reduce((acc, o) => acc + o.mountingCostPerTire, 0) /
              selectedOffers.length) *
              10
          ) / 10
        : 17.5;

    return {
      success: true,
      dimension: validatedInput.dimension,
      quantity,
      offers: selectedOffers,
      totalOffersFound: candidateOffers.length,
      averageMountingCostPerTire: avgMounting,
      searchedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("[TireSearchService] Erreur lors de la recherche:", error);
    return {
      success: false,
      dimension: input?.dimension || "Dimensions Homologuées",
      quantity: input?.quantity || 2,
      offers: [],
      totalOffersFound: 0,
      averageMountingCostPerTire: 17.5,
      searchedAt: new Date().toISOString(),
      error: error.message || "Impossible de récupérer les offres pour le moment.",
    };
  }
}
