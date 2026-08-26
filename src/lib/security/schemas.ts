import { z } from "zod";
import { sanitizeHouseholdName } from "./sanitizer";

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
