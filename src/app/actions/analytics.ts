"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getOptionalUserHouseholdContext } from "@/lib/security/auth-context";

// Schéma Zod interne non exporté (conforme Règle 3 GEMINI.md : seules des fonctions async sont exportées)
const microConversionZodSchema = z
  .object({
    eventType: z.string().optional(),
    event_type: z.string().optional(),
    brand: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    engine: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    visitorId: z.string().optional().nullable(),
    visitor_id: z.string().optional().nullable(),
    metadata: z.record(z.unknown()).optional().default({}),
  })
  .transform((data) => ({
    eventType: (data.eventType || data.event_type || "").trim(),
    brand: data.brand?.trim() || null,
    model: data.model?.trim() || null,
    engine: data.engine?.trim() || null,
    url: data.url?.trim() || null,
    visitorId: data.visitorId?.trim() || data.visitor_id?.trim() || null,
    metadata: data.metadata || {},
  }))
  .refine(
    (data) =>
      [
        "pdf_download_print",
        "lead_magnet_submit",
        "lead_magnet_cta_click",
        "dropzone_upload",
        "dropzone_completed",
        "conversion_cta",
      ].includes(data.eventType),
    {
      message:
        "Type d'événement invalide. Valeurs autorisées: pdf_download_print, lead_magnet_submit, lead_magnet_cta_click, dropzone_upload, dropzone_completed, conversion_cta",
    }
  );

export type MicroConversionInput = {
  eventType?: string;
  event_type?: string;
  brand?: string | null;
  model?: string | null;
  engine?: string | null;
  url?: string | null;
  visitorId?: string | null;
  visitor_id?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Enregistre une micro-conversion (téléchargement/impression carnet, dropzone OCR, CTA)
 * de manière déterministe dans la table PostgreSQL public.micro_conversions.
 */
export async function recordMicroConversionAction(rawInput: MicroConversionInput): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  try {
    const parseResult = microConversionZodSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(", ");
      return { success: false, error: errorMsg };
    }

    const { eventType, brand, model, engine, url, visitorId, metadata } = parseResult.data;

    // Rattachement optionnel au foyer de l'utilisateur s'il est déjà connecté
    const userContext = await getOptionalUserHouseholdContext();
    const foyerId = userContext?.foyerId || null;

    const adminSupabase = createAdminClient();
    const { data, error } = await (adminSupabase as any)
      .from("micro_conversions")
      .insert({
        event_type: eventType,
        brand,
        model,
        engine,
        url,
        visitor_id: visitorId,
        foyer_id: foyerId,
        metadata,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[MicroConversion] Erreur insertion base:", error.message);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      id: data?.id || undefined,
    };
  } catch (err: any) {
    console.error("[MicroConversion] Exception inattendue:", err?.message);
    return {
      success: false,
      error: err?.message || "Erreur interne lors de l'enregistrement de la micro-conversion.",
    };
  }
}
