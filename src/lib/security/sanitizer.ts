/**
 * Module d'assainissement et de sécurisation des entrées utilisateur (Anti-XSS & injection)
 */

/**
 * Nettoie une chaîne de caractères en supprimant les balises HTML,
 * les scripts potentiellement malveillants et les caractères de contrôle.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    // Supprimer les balises HTML/XML (ex: <script>, <img onerror=...>, etc.)
    .replace(/<[^>]*>?/gm, "")
    // Supprimer les caractères de contrôle non imprimables
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    // Normaliser les espaces consécutifs
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Assainit un nom de foyer / véhicule en préservant les accents, apostrophes et tirets courants
 */
export function sanitizeHouseholdName(input: string): string {
  return sanitizeString(input);
}
