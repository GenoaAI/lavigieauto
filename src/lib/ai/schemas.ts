import { z } from 'zod';

/**
 * Standard Operation Categories for Automotive Maintenance
 */
export const MaintenanceCategoryEnum = z.enum([
  'DRAIN_OIL',                // Vidange huile moteur + filtre à huile
  'AIR_FILTER',               // Remplacement filtre à air
  'CABIN_FILTER',             // Remplacement filtre d'habitacle / pollen
  'FUEL_FILTER',              // Remplacement filtre à carburant (Gazole / Essence)
  'BRAKE_PADS_FRONT',         // Plaquettes de frein avant
  'BRAKE_PADS_REAR',          // Plaquettes de frein arrière
  'BRAKE_DISCS_FRONT',        // Disques + plaquettes avant
  'BRAKE_DISCS_REAR',         // Disques + plaquettes arrière
  'BRAKE_FLUID',              // Purge / Remplacement liquide de frein
  'COOLANT',                  // Remplacement / purge liquide de refroidissement
  'SPARK_PLUGS',              // Bougies d'allumage (Essence)
  'GLOW_PLUGS',               // Bougies de préchauffage (Diesel)
  'TIMING_BELT',              // Kit distribution + pompe à eau
  'ACCESSORY_BELT',           // Courroie d'accessoires / galets
  'TIRES_FRONT',              // Pneumatiques train avant
  'TIRES_REAR',               // Pneumatiques train arrière
  'BATTERY',                  // Batterie 12V / traction
  'CLUTCH',                   // Kit embrayage / volant moteur
  'SUSPENSION_SHOCK',         // Amortisseurs avant / arrière
  'GEARBOX_OIL',              // Vidange boîte de vitesses (manuelle ou auto)
  'AIR_CONDITIONING',         // Recharge / entretien climatisation
  'WIPER_BLADES',             // Balais d'essuie-glace
  'TECHNICAL_INSPECTION_PREP',// Pré-contrôle ou passage au contrôle technique
  'DIAGNOSTIC_ELECTRONIC',    // Diagnostic valise / recherche de panne
  'LABOR_ONLY',               // Main d'oeuvre générique
  'OTHER',                    // Autre intervention spécifique
]);

export type MaintenanceCategory = z.infer<typeof MaintenanceCategoryEnum>;

export const ActionTypeEnum = z.enum([
  'REPLACE',          // Remplacement d'une pièce ou d'un fluide
  'INSPECT_ONLY',      // Simple contrôle / diagnostic / vérification sans remplacement
  'REPAIR',           // Réparation / rénovation d'un composant
  'PACKAGE_SERVICE',  // Forfait révision globale couvrant plusieurs opérations
  'CLEAN',            // Nettoyage / dégraissage / traitement
  'LABOR',            // Main d'oeuvre pure
]);

export type ActionType = z.infer<typeof ActionTypeEnum>;

/**
 * Single invoice item / line
 */
export const InvoiceItemSchema = z.object({
  description: z.string().describe('Intitulé de la ligne tel que libellé sur la facture'),
  category: MaintenanceCategoryEnum.default('OTHER').describe('Catégorie normalisée d\'intervention'),
  canonicalCode: z.string().optional().describe('Code canonique d\'opération normalisée (ex: ACCESSORY_BELT_REPLACE, DRAIN_OIL, SPARK_PLUGS_REPLACE, AIR_FILTER_REPLACE, TIRES_REPLACE)'),
  actionType: ActionTypeEnum.default('REPLACE').optional().describe('Type d\'action réalisée : REPLACE, INSPECT_ONLY, REPAIR, PACKAGE_SERVICE, CLEAN, LABOR'),
  partNumber: z.string().optional().describe('Référence de la pièce détachée constructeur ou équipementier'),
  quantity: z.number().default(1).describe('Quantité facturée'),
  unitPriceHT: z.number().optional().describe('Prix unitaire Hors Taxes en euros'),
  vatRate: z.number().default(20).describe('Taux de TVA en pourcentage (ex: 20, 10, 5.5)'),
  totalTTC: z.number().describe('Montant total TTC pour cette ligne en euros'),
  isLabor: z.boolean().default(false).describe('Indique si la ligne correspond à de la main d\'oeuvre'),
  isPart: z.boolean().default(false).describe('Indique si la ligne correspond à une fourniture / pièce'),
}).passthrough();

/**
 * Full Workshop / Garage Invoice Extraction Schema
 */
export const InvoiceExtractionSchema = z.object({
  garage: z.object({
    name: z.string().default('Atelier Professionnel').describe('Nom commercial ou raison sociale du garage / concessionnaire'),
    siret: z.string().optional().describe('Numéro SIRET à 14 chiffres du réparateur'),
    vatNumber: z.string().optional().describe('Numéro de TVA intracommunautaire'),
    address: z.string().optional().describe('Adresse complète du garage'),
    phone: z.string().optional().describe('Numéro de téléphone du garage'),
    email: z.string().optional().describe('Adresse email de contact'),
    brandNetwork: z.string().optional().describe('Réseau constructeur ou indépendant'),
  }).passthrough().default({ name: 'Atelier Professionnel' }),
  vehicle: z.object({
    licensePlate: z.string().optional().describe('Plaque d\'immatriculation du véhicule'),
    vin: z.string().optional().describe('Numéro de série VIN (17 caractères)'),
    make: z.string().optional().describe('Marque du véhicule'),
    model: z.string().optional().describe('Modèle du véhicule'),
    version: z.string().optional().describe('Motorisation ou finition'),
    currentMileage: z.number().optional().describe('Kilométrage relevé au compteur lors de l\'intervention'),
  }).passthrough().default({}),
  invoice: z.object({
    invoiceNumber: z.string().optional().describe('Numéro unique de facture'),
    invoiceDate: z.string().optional().describe('Date d\'émission de la facture au format YYYY-MM-DD'),
    paymentMethod: z.string().optional().describe('Moyen de paiement'),
    totalHT: z.number().optional().describe('Montant total net Hors Taxes en euros'),
    totalVAT: z.number().optional().describe('Montant total de la TVA en euros'),
    totalTTC: z.number().optional().describe('Montant total TTC réglé en euros'),
    currency: z.string().default('EUR').describe('Devise monétaire (EUR)'),
  }).passthrough().default({}),
  lineItems: z.array(InvoiceItemSchema).default([]).describe('Liste détaillée des pièces et opérations'),
  maintenanceRecap: z.object({
    oilGrade: z.string().optional().describe('Viscosité / norme de l\'huile utilisée si vidange'),
    oilQuantityLiters: z.number().optional().describe('Quantité d\'huile moteur facturée en litres'),
    nextRecommendedMileage: z.number().optional().describe('Kilométrage préconisé pour le prochain entretien'),
    nextRecommendedDate: z.string().optional().describe('Date préconisée pour le prochain entretien'),
    detectedOperations: z.array(MaintenanceCategoryEnum).default([]).describe('Ensemble des catégories d\'opérations couvertes'),
  }).passthrough().default({}),
  observations: z.array(z.string()).default([]).describe('Remarques du garagiste'),
}).passthrough();

/**
 * Technical Inspection (Contrôle Technique) Schema
 */
export const DefectCategoryEnum = z.enum([
  'IDENTIFICATION',
  'BRAKES',
  'STEERING',
  'VISIBILITY',
  'LIGHTING_ELECTRICAL',
  'AXLES_WHEELS_TIRES_SUSPENSION',
  'CHASSIS',
  'OTHER_EQUIPMENT',
  'NUISANCE_POLLUTION',
]);

export const DefectSeverityEnum = z.enum([
  'MINOR',
  'MAJOR',
  'CRITICAL',
]);

export const TechnicalInspectionExtractionSchema = z.object({
  center: z.object({
    name: z.string().default('Centre Contrôle Technique Agréé').describe('Nom du centre de contrôle technique'),
    approvalNumber: z.string().optional().describe('Numéro d\'agrément préfectoral du centre'),
    inspectorName: z.string().optional().describe('Nom du contrôleur'),
    address: z.string().optional().describe('Adresse du centre de contrôle'),
    inspectionDate: z.string().optional().describe('Date du contrôle technique (YYYY-MM-DD)'),
  }).passthrough().default({ name: 'Centre Contrôle Technique Agréé' }),
  vehicle: z.object({
    licensePlate: z.string().optional().describe('Numéro d\'immatriculation relevé'),
    vin: z.string().optional().describe('Numéro VIN de série (17 caractères)'),
    make: z.string().optional().describe('Marque du véhicule'),
    model: z.string().optional().describe('Modèle du véhicule'),
    mileage: z.number().optional().describe('Kilométrage relevé au compteur'),
    firstRegistrationDate: z.string().optional().describe('Date de première mise en circulation'),
    fuelType: z.string().optional().describe('Énergie'),
  }).passthrough().default({}),
  inspectionResult: z.object({
    status: z.enum(['FAVORABLE', 'UNFAVORABLE_MAJOR', 'UNFAVORABLE_CRITICAL']).default('FAVORABLE'),
    expiryDate: z.string().optional().describe('Date de fin de validité du contrôle technique (YYYY-MM-DD)'),
    contraVisitDeadline: z.string().optional().describe('Date limite de contre-visite'),
  }).passthrough().default({ status: 'FAVORABLE' }),
  defects: z.array(
    z.object({
      code: z.string().default("N/A").describe('Code officiel de défaillance'),
      label: z.string().describe('Libellé exact de l\'anomalie'),
      severity: DefectSeverityEnum.default('MINOR'),
      category: DefectCategoryEnum.default('OTHER_EQUIPMENT'),
      location: z.string().optional(),
      detailedExplanation: z.string().optional(),
      estimatedRepairCostEur: z.number().optional(),
    }).passthrough()
  ).default([]),
  measurements: z.object({
    brakeEfficiencyPercent: z.number().optional(),
    co2EmissionsOrOpacity: z.string().optional(),
    suspensionDissymmetryPercent: z.number().optional(),
  }).passthrough().optional(),
}).passthrough();

/**
 * Carte Grise / Registration Certificate (Certificat d'Immatriculation) Schema
 * Tolérant et universel (supporte à la fois les libellés camelCase et les lettres officielles A, B, E, D.1, D.3, P.3, P.6)
 */
export const RegistrationCardExtractionSchema = z.object({
  licensePlate: z.string().optional().describe("Numéro d'immatriculation (Ligne A)"),
  firstRegistrationDate: z.string().optional().describe("Date de 1ère mise en circulation (Ligne B)"),
  make: z.string().optional().describe("Marque du véhicule (Ligne D.1)"),
  model: z.string().optional().describe("Dénomination commerciale (Ligne D.3)"),
  typeVariantVersion: z.string().optional().describe("Type Variante Version (Ligne D.2)"),
  vin: z.string().optional().describe("Numéro de série VIN (Ligne E)"),
  fuelType: z.string().optional().describe("Carburant / Énergie (Ligne P.3)"),
  fiscalPower: z.union([z.number(), z.string()]).optional().describe("Puissance fiscale en CV (Ligne P.6)"),
  powerKw: z.union([z.number(), z.string()]).optional().describe("Puissance en kW (Ligne P.2)"),
  cnit: z.string().optional().describe("Code CNIT (Ligne K)"),
  co2Emissions: z.union([z.number(), z.string()]).optional().describe("Émissions CO2 (Ligne V.7)"),
  ownerName: z.string().optional().describe("Titulaire (Ligne C.1)"),
  A: z.string().optional(),
  B: z.string().optional(),
  E: z.string().optional(),
  K: z.string().optional(),
  "C.1": z.string().optional(),
  "D.1": z.string().optional(),
  "D.2": z.string().optional(),
  "D.3": z.string().optional(),
  "P.2": z.union([z.number(), z.string()]).optional(),
  "P.3": z.string().optional(),
  "P.6": z.union([z.number(), z.string()]).optional(),
  "V.7": z.union([z.number(), z.string()]).optional(),
}).passthrough();

/**
 * Maintenance Book / Manufacturer Plan Schema
 */
export const MaintenanceBookExtractionSchema = z.object({
  vehicleTarget: z.object({
    make: z.string().optional(),
    model: z.string().optional(),
    engineType: z.string().optional(),
    fuelType: z.string().optional(),
  }).passthrough().default({}),
  recommendedOperations: z.array(
    z.object({
      category: MaintenanceCategoryEnum.default('OTHER'),
      intervalKm: z.number().int().positive().optional(),
      intervalMonths: z.number().int().positive().optional(),
      severeIntervalKm: z.number().int().positive().optional(),
      severeIntervalMonths: z.number().int().positive().optional(),
      mandatory: z.boolean().default(true),
      specifications: z.string().optional(),
    }).passthrough()
  ).default([]),
  historicalServices: z.array(
    z.object({
      date: z.string().optional(),
      mileage: z.number().int().positive().optional(),
      garageStampName: z.string().optional(),
      performedOperations: z.array(MaintenanceCategoryEnum).default([]),
    }).passthrough()
  ).default([]),
}).passthrough();
