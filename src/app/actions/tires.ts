"use server";

import {
  tireSearchQuerySchema,
  TireSearchQuery,
  TireOffersResponse,
} from "@/lib/security/schemas";
import { searchTireOffers } from "@/lib/tire-search/service";
import { getVehicleDetailsAction } from "@/app/actions/vehicles";

/**
 * Server Action : Recherche et comparaison des 3 meilleures offres de pneumatiques
 * avec calcul automatique du coût total incluant forfait pose & équilibrage.
 */
export async function searchTireOffersAction(
  query: Partial<TireSearchQuery>
): Promise<TireOffersResponse> {
  try {
    const validated = tireSearchQuerySchema.parse({
      dimension: query.dimension || "205/55 R16",
      brandAndModel: query.brandAndModel,
      quantity: query.quantity ?? 2,
      postalCode: query.postalCode,
      vehicleMake: query.vehicleMake,
      vehicleModel: query.vehicleModel,
      season: query.season ?? "ALL",
    });

    const result = await searchTireOffers(validated);
    return result;
  } catch (error: any) {
    console.error("[TiresAction] Erreur searchTireOffersAction:", error);
    return {
      success: false,
      dimension: query.dimension || "Dimensions Homologuées",
      quantity: query.quantity ?? 2,
      offers: [],
      totalOffersFound: 0,
      averageMountingCostPerTire: 17.5,
      searchedAt: new Date().toISOString(),
      error: error.message || "Paramètres de recherche invalides.",
    };
  }
}

/**
 * Server Action : Récupère automatiquement les meilleures offres adaptées au véhicule
 * en fonction de sa dimension homologuée détectée ou de son essieu.
 */
export async function getVehicleTireOffersAction(
  vehicleId: string,
  options?: {
    axle?: "FRONT" | "REAR";
    quantity?: 2 | 4;
  }
): Promise<TireOffersResponse> {
  try {
    const details = await getVehicleDetailsAction(vehicleId);
    const quantity = options?.quantity ?? 2;

    if (!details) {
      // Fallback générique si le véhicule n'est pas trouvé
      return await searchTireOffersAction({
        dimension: "205/55 R16",
        quantity,
      });
    }

    const axle = options?.axle ?? "FRONT";
    const axleData = axle === "FRONT" ? details.tires.frontAxle : details.tires.rearAxle;
    const dimension = axleData?.dimension || details.tires.recommendedDimension || "205/55 R16";
    const brandAndModel = axleData?.brandAndModel;

    return await searchTireOffers({
      dimension,
      brandAndModel,
      quantity,
      vehicleMake: details.vehicle.marque,
      vehicleModel: details.vehicle.modele,
      season: "ALL",
    });
  } catch (error: any) {
    console.error("[TiresAction] Erreur getVehicleTireOffersAction:", error);
    return {
      success: false,
      dimension: "Dimensions Homologuées",
      quantity: options?.quantity ?? 2,
      offers: [],
      totalOffersFound: 0,
      averageMountingCostPerTire: 17.5,
      searchedAt: new Date().toISOString(),
      error: error.message || "Erreur lors de la récupération des offres pour ce véhicule.",
    };
  }
}
