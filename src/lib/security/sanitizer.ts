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

/**
 * Assainit une dimension de pneumatique (ex: "215/55 R17 94W" ou "225/55R18")
 */
export function sanitizeTireDimension(input: string): string {
  const cleaned = sanitizeString(input);
  // Ne conserver que les caractères valides pour une dimension de pneu (chiffres, lettres, /, espaces, tirets)
  return cleaned.replace(/[^a-zA-Z0-9\/\s\-]/g, "").trim().toUpperCase();
}

/**
 * Assainit un code postal (5 chiffres pour la France)
 */
export function sanitizePostalCode(input?: string): string {
  if (!input) return "";
  const cleaned = sanitizeString(input).replace(/\D/g, "");
  return cleaned.slice(0, 5);
}

/**
 * Vérifie et assainit une URL externe pour s'assurer qu'elle est sécurisée (http ou https uniquement)
 */
export function sanitizeExternalUrl(url: string): string {
  if (!url || typeof url !== "string") return "#";
  const trimmed = url.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  return "#";
}
