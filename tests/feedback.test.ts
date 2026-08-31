import { feedbackFormSchema } from "../src/lib/feedback/schema";
import { sendFeedbackAction } from "../src/app/actions/feedback";

export async function testFeedbackIntegration() {
  console.log("▶ [TEST] Système de Feedback & Intégration Webhook MicroKanban...");

  // 1. Validation du Schéma Zod (Cas Valide)
  const validPayload = {
    text: "Le bouton de scan de facture ne répond pas sur iPhone Safari.",
    image: {
      base64Data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      fileName: "screenshot.png",
    },
  };

  const parsedValid = feedbackFormSchema.safeParse(validPayload);
  if (!parsedValid.success) {
    throw new Error(`Échec de validation d'un payload valide : ${JSON.stringify(parsedValid.error.flatten())}`);
  }
  console.log("  ✔ Validation réussie d'un payload avec texte et image PNG valide.");

  // 2. Sécurité : Rejet strict des formats SVG/XML (Anti-XSS)
  const svgXssPayload = {
    text: "Tentative d'injection SVG",
    image: {
      base64Data: "data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+",
      fileName: "malicious.svg",
    },
  };

  const parsedSvg = feedbackFormSchema.safeParse(svgXssPayload);
  if (parsedSvg.success) {
    throw new Error("FAILLE : Le schéma a accepté une image SVG potentiellement malveillante !");
  }
  console.log("  ✔ Rejet strict du format SVG/XML (Protection XSS) validé.");

  // 3. Validation de la taille minimale du texte
  const tooShortPayload = {
    text: "a",
  };
  const parsedShort = feedbackFormSchema.safeParse(tooShortPayload);
  if (parsedShort.success) {
    throw new Error("FAILLE : Le schéma a accepté un texte trop court (< 3 caractères) !");
  }
  console.log("  ✔ Contrôle de la taille minimale du message validé.");

  // 4. Test d'exécution de la Server Action avec simulation réseau
  const originalFetch = global.fetch;
  const originalSecret = process.env.MICROKANBAN_API_SECRET;
  const originalExternalSecret = process.env.EXTERNAL_API_SECRET;
  let interceptedUrl = "";
  let interceptedHeaders: any = {};
  let interceptedBody: any = {};

  try {
    // 4a. Vérification du rejet sécurisé si aucune clé secrète n'est configurée
    delete process.env.MICROKANBAN_API_SECRET;
    delete process.env.EXTERNAL_API_SECRET;

    const missingSecretResult = await sendFeedbackAction("Test message sans configuration de clé API");
    if (missingSecretResult.success || !missingSecretResult.error?.includes("manquante")) {
      throw new Error("FAILLE : La Server Action aurait dû échouer lorsque la clé d'API MicroKanban est absente !");
    }
    console.log("  ✔ Rejet sécurisé confirmé lorsque MICROKANBAN_API_SECRET est absent.");

    // 4b. Configuration d'une clé de test pour valider l'appel webhook
    process.env.MICROKANBAN_API_SECRET = "test-microkanban-secret-key-mock";

    global.fetch = async (url: any, init?: any) => {
      interceptedUrl = url.toString();
      interceptedHeaders = init?.headers || {};
      interceptedBody = JSON.parse(init?.body || "{}");

      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          ticketsCreated: [
            {
              id: "ticket-mock-123",
              title: "[BUG] Correction bouton de scan iPhone Safari",
              type: "BUG",
            },
          ],
        }),
        text: async () => "OK",
      } as any;
    };

    const actionResult = await sendFeedbackAction(
      "Le bouton de scan de facture ne répond pas sur iPhone Safari.",
      {
        base64Data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        fileName: "screenshot.png",
      }
    );

    if (!actionResult.success) {
      throw new Error(`La Server Action a échoué : ${actionResult.error}`);
    }

    // Vérification de l'URL cible
    if (!interceptedUrl.includes("jira-like.vercel.app/api/webhooks/external-feedback") && !interceptedUrl.includes("/api/webhooks/external-feedback")) {
      throw new Error(`URL webhook inattendue : ${interceptedUrl}`);
    }

    // Vérification de la présence des en-têtes d'authentification
    const authHeader = interceptedHeaders["Authorization"] || interceptedHeaders["authorization"];
    const secretHeader = interceptedHeaders["x-api-secret"];
    if (!authHeader && !secretHeader) {
      throw new Error("En-tête d'authentification manquant dans la requête envoyée à MicroKanban !");
    }

    // Vérification de la charge utile (sourceApp & githubRepo conformes)
    if (interceptedBody.sourceApp !== "LaVigieAuto") {
      throw new Error(`sourceApp invalide : ${interceptedBody.sourceApp} (attendu: "LaVigieAuto")`);
    }
    if (interceptedBody.githubRepo !== "GenoaAI/lavigieauto") {
      throw new Error(`githubRepo invalide : ${interceptedBody.githubRepo} (attendu: "GenoaAI/lavigieauto")`);
    }
    if (!interceptedBody.text.includes("iPhone Safari")) {
      throw new Error("Le texte enrichi du feedback n'a pas été transmis correctement.");
    }

    console.log("  ✔ Server Action sendFeedbackAction validée avec headers d'authentification et payload conforme (sourceApp: LaVigieAuto, githubRepo: GenoaAI/lavigieauto).");
  } finally {
    global.fetch = originalFetch;
    if (originalSecret !== undefined) {
      process.env.MICROKANBAN_API_SECRET = originalSecret;
    } else {
      delete process.env.MICROKANBAN_API_SECRET;
    }
    if (originalExternalSecret !== undefined) {
      process.env.EXTERNAL_API_SECRET = originalExternalSecret;
    } else {
      delete process.env.EXTERNAL_API_SECRET;
    }
  }
}
