import { z } from "zod";
import {
  sanitizeHouseholdName,
  sanitizeString,
  sanitizeTireDimension,
  sanitizePostalCode,
} from "./sanitizer";

/**
 * Schéma de validation pour la mise à jour du nom de foyer / ménage
 */
export const updateHouseholdNameSchema = z.object({
  householdId: z
    .string({
      required_error: "L'identifiant du foyer est requis.",
    })
    .min(1, "L'identifiant du foyer ne peut pas être vide.")
    .trim(),
  newName: z
    .string({
      required_error: "Le nom du foyer est requis.",
    })
    .trim()
    .transform((val) => sanitizeHouseholdName(val))
    .refine((val) => val.length >= 2, {
      message: "Le nom du foyer doit comporter au moins 2 caractères.",
    })
    .refine((val) => val.length <= 50, {
      message: "Le nom du foyer ne peut pas dépasser 50 caractères.",
    }),
});

export type UpdateHouseholdNameInput = z.infer<typeof updateHouseholdNameSchema>;

// Alias pour compatibilité
export const updateFoyerNameSchema = updateHouseholdNameSchema;
export type UpdateFoyerNameInput = UpdateHouseholdNameInput;

/**
 * Schéma de validation pour l'invitation d'un membre / conducteur dans le foyer
 * Accepte TOUT fournisseur d'email valide sans restriction de domaine (Yahoo, Outlook, Gmail, Orange, iCloud, Proton, etc.)
 */
export const inviteHouseholdMemberSchema = z.object({
  householdId: z
    .string({
      required_error: "L'identifiant du foyer est requis.",
    })
    .min(1, "L'identifiant du foyer ne peut pas être vide.")
    .trim(),
  email: z
    .string({
      required_error: "L'adresse email est requise.",
    })
    .trim()
    .toLowerCase()
    .email("Veuillez saisir une adresse email valide (ex: contact@yahoo.fr, nom@outlook.com, etc.).")
    .max(255, "L'adresse email ne peut pas dépasser 255 caractères."),
  role: z
    .enum(["admin", "member"], {
      errorMap: () => ({ message: "Le rôle doit être 'admin' ou 'member'." }),
    })
    .default("member"),
});

export type InviteHouseholdMemberInput = z.infer<typeof inviteHouseholdMemberSchema>;

/**
 * Schéma de validation pour la requête de recherche d'offres de pneumatiques
 */
export const tireSearchQuerySchema = z.object({
  dimension: z
    .string({
      required_error: "La dimension du pneu est requise.",
    })
    .trim()
    .min(3, "Dimension trop courte.")
    .max(60, "Dimension trop longue.")
    .transform((val): string => sanitizeTireDimension(val)),
  brandAndModel: z
    .string()
    .optional()
    .transform((val): string | undefined => (val ? sanitizeString(val) : undefined)),
  quantity: z
    .union([z.literal(2), z.literal(4), z.literal(1)])
    .default(2),
  postalCode: z
    .string()
    .optional()
    .transform((val): string | undefined => (val ? sanitizePostalCode(val) : undefined)),
  vehicleMake: z
    .string()
    .optional()
    .transform((val): string | undefined => (val ? sanitizeString(val) : undefined)),
  vehicleModel: z
    .string()
    .optional()
    .transform((val): string | undefined => (val ? sanitizeString(val) : undefined)),
  season: z
    .enum(["ALL", "SUMMER", "WINTER", "ALL_SEASON"])
    .default("ALL"),
});

export type TireSearchInput = z.input<typeof tireSearchQuerySchema>;
export type TireSearchQuery = z.infer<typeof tireSearchQuerySchema>;

/**
 * Schéma pour une offre de pneumatique individuelle avec détail du coût de pose
 */
export const tireOfferSchema = z.object({
  id: z.string(),
  merchantName: z.string(),
  merchantLogo: z.string().optional(),
  tireBrand: z.string(),
  tireModel: z.string(),
  dimension: z.string(),
  unitPrice: z.number().positive(),
  quantity: z.number().int().positive(),
  tiresSubtotal: z.number().nonnegative(),
  mountingCostPerTire: z.number().nonnegative(),
  mountingTotal: z.number().nonnegative(),
  totalPrice: z.number().positive(),
  offerUrl: z.string().url(),
  inStock: z.boolean().default(true),
  deliveryInfo: z.string().default("Livraison en centre de montage ou à domicile"),
  season: z.enum(["SUMMER", "ALL_SEASON", "WINTER"]).default("SUMMER"),
  efficiencyLabel: z
    .object({
      fuel: z.string().optional(),
      wetGrip: z.string().optional(),
      noiseDb: z.number().optional(),
    })
    .optional(),
  isBestPrice: z.boolean().optional(),
});

export type TireOffer = z.infer<typeof tireOfferSchema>;

/**
 * Schéma de réponse complète pour la recherche de pneus
 */
export const tireOffersResponseSchema = z.object({
  success: z.boolean(),
  dimension: z.string(),
  quantity: z.number().int().positive(),
  offers: z.array(tireOfferSchema).max(3),
  totalOffersFound: z.number().int().nonnegative(),
  averageMountingCostPerTire: z.number().nonnegative(),
  searchedAt: z.string(),
  error: z.string().optional(),
});

export type TireOffersResponse = z.infer<typeof tireOffersResponseSchema>;

/**
 * Schéma de validation pour la suspension / réactivation d'une alerte d'échéance d'entretien
 */
export const updateMilestoneAlertStatusSchema = z
  .object({
    vehicleId: z
      .string({
        required_error: "L'identifiant du véhicule est requis.",
      })
      .refine((val) => val.trim().length > 0, {
        message: "L'identifiant du véhicule ne peut pas être vide.",
      }),
    milestoneId: z
      .string({
        required_error: "L'identifiant de l'échéance est requis.",
      })
      .refine((val) => val.trim().length > 0, {
        message: "L'identifiant de l'échéance ne peut pas être vide.",
      }),
    status: z
      .enum(["actif", "ignore", "suspendu", "muted", "a_venir", "en_retard"], {
        errorMap: () => ({ message: "Le statut doit être valide." }),
      })
      .optional(),
    is_active_alert: z.boolean().optional(),
    isActiveAlert: z.boolean().optional(),
    muted: z.boolean().optional(),
    ignored: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.is_active_alert !== undefined ||
      data.isActiveAlert !== undefined ||
      data.muted !== undefined ||
      data.ignored !== undefined,
    {
      message: "Au moins un paramètre d'état (status, is_active_alert, muted ou ignored) doit être spécifié.",
    }
  );

export type UpdateMilestoneAlertStatusInput = z.infer<typeof updateMilestoneAlertStatusSchema>;

// Alias pour compatibilité
export const toggleMilestoneAlertStatusSchema = updateMilestoneAlertStatusSchema;
export type ToggleMilestoneAlertStatusInput = UpdateMilestoneAlertStatusInput;

export const updateEcheanceAlertStatusSchema = updateMilestoneAlertStatusSchema;
export type UpdateEcheanceAlertStatusInput = UpdateMilestoneAlertStatusInput;

