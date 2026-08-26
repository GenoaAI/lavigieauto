"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { feedbackFormSchema, type FeedbackResult } from "@/lib/feedback/schema";

/**
 * Server Action pour envoyer un feedback utilisateur vers l'API Webhook MicroKanban.
 * Conforme aux règles strictes :
 * - Uniquement des fonctions async exportées
 * - Zéro fake data
 * - Intégration transparente avec le pipeline de création de tickets MicroKanban
 */
export async function sendFeedbackAction(
  rawText: string,
  imagePayload?: { base64Data: string; fileName: string }
): Promise<FeedbackResult> {
  const parsed = feedbackFormSchema.safeParse({
    text: rawText,
    image: imagePayload?.base64Data ? imagePayload : undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Données de feedback invalides.",
    };
  }

  const { text, image } = parsed.data;

  // 1. Récupération de l'utilisateur connecté (si disponible)
  let userEmail = "Utilisateur non connecté";
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userEmail = user.email || "Utilisateur sans email";
      userId = user.id;
    }
  } catch (err) {
    console.warn("[FEEDBACK] Impossible de récupérer l'utilisateur connecté:", err);
  }

  // 2. Traitement et upload de l'image (si présente)
  let imageUrl: string | undefined = undefined;

  if (image?.base64Data) {
    try {
      const match = image.base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1].toLowerCase();
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");
        const ext = mimeType.split("/")[1] || "png";
        const filename = `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

        const adminSupabase = createAdminClient();
        const { error: uploadError } = await adminSupabase.storage
          .from("feedback-images")
          .upload(filename, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicUrlData } = adminSupabase.storage
            .from("feedback-images")
            .getPublicUrl(filename);
          imageUrl = publicUrlData?.publicUrl;
        } else {
          // Si le bucket feedback-images n'existe pas, on passe l'image en data URI
          console.warn("[FEEDBACK] Storage upload warning (fallback to direct URL/base64):", uploadError.message);
          imageUrl = image.base64Data;
        }
      }
    } catch (storageErr) {
      console.warn("[FEEDBACK] Erreur lors du téléversement de l'image vers Supabase Storage:", storageErr);
      imageUrl = image.base64Data;
    }
  }

  // 3. Construction du message enrichi avec contexte utilisateur & URL de la session
  const enrichedText = `[Émis par : ${userEmail}${userId ? ` (ID: ${userId})` : ""}]
Application : LaVigieAuto

${text}`;

  // 4. Appel du Webhook MicroKanban
  const webhookUrl =
    process.env.MICROKANBAN_API_URL ||
    "https://jira-like.vercel.app/api/webhooks/external-feedback";
  const apiSecret =
    process.env.MICROKANBAN_API_SECRET ||
    process.env.EXTERNAL_API_SECRET ||
    "edfgjKhK6izYheVDz8RtGTNuoAJWFdr6";

  if (!apiSecret) {
    console.error("[FEEDBACK] MICROKANBAN_API_SECRET non défini.");
    return {
      success: false,
      error: "Configuration serveur incomplète : clé d'API MicroKanban manquante.",
    };
  }

  const payload = {
    text: enrichedText,
    sourceApp: "LaVigieAuto",
    githubRepo: "GenoaAI/lavigieauto",
    imageUrl,
  };

  try {
    const authHeader = apiSecret.startsWith("Bearer ")
      ? apiSecret
      : `Bearer ${apiSecret}`;
    const rawSecret = apiSecret.replace(/^Bearer\s+/i, "").trim();

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        "x-api-secret": rawSecret,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[FEEDBACK] Échec du webhook MicroKanban (${response.status}):`,
        errorText
      );
      return {
        success: false,
        error: `Erreur lors de la transmission à MicroKanban (HTTP ${response.status}).`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: "Merci ! Votre feedback a bien été envoyé et transmis à MicroKanban.",
      ticketsCreated: data.ticketsCreated || [],
    };
  } catch (err) {
    console.error("[FEEDBACK] Erreur réseau lors de l'appel du webhook:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Erreur réseau lors de l'envoi du feedback.",
    };
  }
}
