import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import {
  ensureUserHousehold,
  type LeadAcquisitionData,
} from "@/lib/security/auth-context";
import {
  recordMicroConversionAction,
  type MicroConversionInput,
} from "@/app/actions/analytics";
import { POST as trackRoutePOST } from "@/app/api/analytics/track/route";

export async function testFullFunnelAttribution() {
  console.log("=================================================");
  console.log("🎯 [TEST] ATTRIBUTION FULL FUNNEL & PERSISTANCE DES MICRO-CONVERSIONS (M1)");
  console.log("=================================================\n");

  const originalFetch = global.fetch;

  try {
    // ==========================================
    // PARTIE 1 : EDGE MIDDLEWARE LEAD TAGGING
    // ==========================================
    console.log("▶ [TEST 1] Taggage Premier Contact Edge Middleware (lavigie_lead_source)...");

    // 1.1 Requête sur fiche d'entretien pSEO sans cookie existant -> Dépose du cookie
    const reqPseo = new NextRequest(
      "http://localhost:3000/entretien/dacia/sandero-2/0-9-tce-90"
    );
    const resPseo = await middleware(reqPseo);

    const leadCookie = resPseo.cookies.get("lavigie_lead_source");
    assert.ok(leadCookie, "Le cookie 'lavigie_lead_source' doit être positionné sur /entretien/:brand/:model/:engine.");
    assert.ok(leadCookie.value, "Le cookie 'lavigie_lead_source' doit contenir une valeur.");

    const parsedCookie = JSON.parse(leadCookie.value);
    assert.equal(parsedCookie.source, "seo_pseo", "La source doit être 'seo_pseo'.");
    assert.equal(parsedCookie.brand, "dacia", "La marque doit être extraite correctement.");
    assert.equal(parsedCookie.model, "sandero-2", "Le modèle doit être extrait correctement.");
    assert.equal(parsedCookie.engine, "0-9-tce-90", "La motorisation doit être extraite correctement.");
    assert.equal(
      parsedCookie.url,
      "/entretien/dacia/sandero-2/0-9-tce-90",
      "L'URL d'entrée doit correspondre au pathname de la requête."
    );
    assert.ok(parsedCookie.timestamp, "Un timestamp ISO doit être présent dans le cookie.");

    // 1.2 Requête avec trailing slash
    const reqSlash = new NextRequest(
      "http://localhost:3000/entretien/peugeot/208-2/1-5-bluehdi-100/"
    );
    const resSlash = await middleware(reqSlash);
    const leadCookieSlash = resSlash.cookies.get("lavigie_lead_source");
    assert.ok(leadCookieSlash, "Le cookie doit être positionné même avec un slash final.");
    const parsedSlash = JSON.parse(leadCookieSlash.value);
    assert.equal(parsedSlash.brand, "peugeot");
    assert.equal(parsedSlash.model, "208-2");
    assert.equal(parsedSlash.engine, "1-5-bluehdi-100");

    // 1.3 Préservation du Premier Contact (First-Touch Attribution)
    const existingAttribution = JSON.stringify({
      source: "seo_first_touch_campaign",
      brand: "renault",
      model: "clio-4",
      engine: "1-5-dci-90",
      url: "/entretien/renault/clio-4/1-5-dci-90",
      timestamp: "2026-09-01T10:00:00.000Z",
    });

    const reqExisting = new NextRequest(
      "http://localhost:3000/entretien/dacia/sandero-2/0-9-tce-90",
      {
        headers: {
          cookie: `lavigie_lead_source=${encodeURIComponent(existingAttribution)}`,
        },
      }
    );
    const resExisting = await middleware(reqExisting);
    const cookieAfterExisting = resExisting.cookies.get("lavigie_lead_source");
    assert.equal(
      cookieAfterExisting,
      undefined,
      "Le middleware ne doit pas réécrire le cookie d'attribution s'il existe déjà (règle du premier contact)."
    );

    // 1.4 Routes hors pSEO (hub marque, hub modèle, dashboard, racine) -> Pas de cookie lavigie_lead_source
    const nonPseoUrls = [
      "http://localhost:3000/",
      "http://localhost:3000/entretien",
      "http://localhost:3000/entretien/dacia",
      "http://localhost:3000/entretien/dacia/sandero",
      "http://localhost:3000/login",
    ];

    for (const url of nonPseoUrls) {
      const reqNonPseo = new NextRequest(url);
      const resNonPseo = await middleware(reqNonPseo);
      assert.equal(
        resNonPseo.cookies.get("lavigie_lead_source"),
        undefined,
        `La route ${url} ne doit pas déposer de cookie lavigie_lead_source.`
      );
    }

    // 1.5 Préservation des headers de sécurité
    assert.equal(resPseo.headers.get("X-Frame-Options"), "DENY");
    assert.equal(resPseo.headers.get("X-Content-Type-Options"), "nosniff");
    assert.ok(resPseo.headers.get("Content-Security-Policy"));

    console.log("  ✔ Edge Middleware certifié : attribution déterministe sur pSEO, respect first-touch et sécurité intacte.\n");

    // ==========================================
    // PARTIE 2 : PERSISTANCE ATTRIBUTION FOYER (ensureUserHousehold)
    // ==========================================
    console.log("▶ [TEST 2] Persistance de l'Attribution Marketing dans foyers.metadata...");

    // 2.1 Nouveau compte avec attribution lead explicite
    let recordedFoyerInsert: any = null;
    let recordedMemberUpsert: any = null;

    global.fetch = async (url: any, init: any) => {
      const u = url.toString();
      const method = init?.method || "GET";

      if (u.includes("foyer_members") && method === "GET") {
        return new Response(JSON.stringify(null), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (u.includes("foyers") && method === "GET") {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (u.includes("foyers") && method === "POST") {
        recordedFoyerInsert = JSON.parse(init.body);
        return new Response(JSON.stringify({ id: recordedFoyerInsert.id }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (u.includes("foyer_members") && method === "POST") {
        recordedMemberUpsert = JSON.parse(init.body);
        return new Response(JSON.stringify({}), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const leadAttribution: LeadAcquisitionData = {
      source: "seo_pseo",
      brand: "dacia",
      model: "sandero-3",
      engine: "1-0-eco-g-100",
      entry_url: "/entretien/dacia/sandero-3/1-0-eco-g-100",
      landing_time: "2026-09-14T11:00:00.000Z",
    };

    const provisionResult = await ensureUserHousehold(
      {
        id: "usr-lead-test-1",
        email: "dacia.fan@lavigieauto.com",
        user_metadata: { full_name: "Romain Test" },
      },
      leadAttribution
    );

    assert.ok(provisionResult.foyerId, "Un foyerId valide doit être retourné.");
    assert.equal(provisionResult.role, "owner", "L'utilisateur doit être 'owner'.");

    // Vérification de la persistance dans foyers.metadata
    assert.ok(recordedFoyerInsert, "Un insert dans public.foyers doit avoir été effectué.");
    assert.ok(
      recordedFoyerInsert.metadata.acquisition,
      "Le bloc metadata.acquisition doit être présent."
    );
    assert.equal(
      recordedFoyerInsert.metadata.acquisition.source,
      "seo_pseo",
      "La source dans acquisition doit être 'seo_pseo'."
    );
    assert.equal(
      recordedFoyerInsert.metadata.acquisition.brand,
      "dacia",
      "La marque du lead doit être enregistrée."
    );
    assert.equal(
      recordedFoyerInsert.metadata.acquisition.model,
      "sandero-3",
      "Le modèle du lead doit être enregistré."
    );
    assert.equal(
      recordedFoyerInsert.metadata.acquisition.engine,
      "1-0-eco-g-100",
      "La motorisation du lead doit être enregistrée."
    );
    assert.equal(
      recordedFoyerInsert.metadata.acquisition.entry_url,
      "/entretien/dacia/sandero-3/1-0-eco-g-100",
      "L'URL d'entrée doit être enregistrée."
    );
    assert.ok(
      recordedFoyerInsert.metadata.acquisition.converted_at,
      "La date de conversion ISO converted_at doit être présente."
    );

    // Champs de commodité de premier niveau pour requêtage direct
    assert.equal(recordedFoyerInsert.metadata.source, "seo_pseo");
    assert.equal(recordedFoyerInsert.metadata.lead_brand, "dacia");
    assert.equal(recordedFoyerInsert.metadata.lead_model, "sandero-3");
    assert.equal(recordedFoyerInsert.metadata.lead_engine, "1-0-eco-g-100");

    // 2.2 Rétro-propagation (Backfill) sur utilisateur existant sans attribution
    let recordedFoyerPatch: any = null;
    let patchTargetFoyerId: string | null = null;

    global.fetch = async (url: any, init: any) => {
      const u = url.toString();
      const method = init?.method || "GET";

      if (u.includes("foyer_members") && method === "GET") {
        return new Response(
          JSON.stringify({
            id: "fm-existing-legacy",
            foyer_id: "foyer-legacy-uuid-99",
            role: "owner",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (u.includes("foyers") && method === "GET") {
        return new Response(
          JSON.stringify({
            id: "foyer-legacy-uuid-99",
            metadata: {
              user_email: "ancien.utilisateur@lavigieauto.com",
              owner_name: "Ancien",
              // PAS de bloc acquisition
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (u.includes("foyers") && (method === "PATCH" || method === "PUT")) {
        recordedFoyerPatch = JSON.parse(init.body);
        patchTargetFoyerId = u;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const backfillResult = await ensureUserHousehold(
      {
        id: "usr-legacy-42",
        email: "ancien.utilisateur@lavigieauto.com",
      },
      {
        source: "seo_pseo",
        brand: "peugeot",
        model: "208-2",
        engine: "1-5-bluehdi-100",
        url: "/entretien/peugeot/208-2/1-5-bluehdi-100",
      }
    );

    assert.equal(backfillResult.foyerId, "foyer-legacy-uuid-99");
    assert.ok(recordedFoyerPatch, "Un PATCH de rétro-propagation doit avoir été envoyé.");
    assert.equal(
      recordedFoyerPatch.metadata.acquisition.brand,
      "peugeot",
      "L'attribution doit avoir été rétro-propagée."
    );

    // 2.3 Résilience & Self-Healing si cookie/données corrompues
    const safeResult = await ensureUserHousehold(
      {
        id: "usr-resilience-1",
        email: "test.resilient@lavigieauto.com",
      },
      null
    );
    assert.ok(safeResult.foyerId, "ensureUserHousehold doit réussir même sans données d'attribution.");

    console.log("  ✔ Persistance Foyers certifiée : metadata.acquisition normalisé, rétro-propagation et self-healing.\n");

    // ==========================================
    // PARTIE 3 : MICRO-CONVERSIONS SERVER ACTION & ROUTE
    // ==========================================
    console.log("▶ [TEST 3] Server Action & Route de Suivi des Micro-Conversions...");

    let recordedMicroConversion: any = null;

    global.fetch = async (url: any, init: any) => {
      const u = url.toString();
      const method = init?.method || "GET";

      if (u.includes("micro_conversions") && method === "POST") {
        recordedMicroConversion = JSON.parse(init.body);
        return new Response(
          JSON.stringify({ id: "mc-uuid-generated-123" }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    // 3.1 Événement valide : pdf_download_print
    const printEventResult = await recordMicroConversionAction({
      eventType: "pdf_download_print",
      brand: "dacia",
      model: "sandero",
      engine: "0-9-tce-90",
      url: "/entretien/dacia/sandero/0-9-tce-90",
      metadata: { method: "direct_print" },
    });

    assert.equal(printEventResult.success, true, "L'action doit renvoyer success: true.");
    assert.equal(printEventResult.id, "mc-uuid-generated-123");
    assert.ok(recordedMicroConversion, "Un insert dans public.micro_conversions doit avoir été exécuté.");
    assert.equal(recordedMicroConversion.event_type, "pdf_download_print");
    assert.equal(recordedMicroConversion.brand, "dacia");
    assert.equal(recordedMicroConversion.model, "sandero");
    assert.equal(recordedMicroConversion.engine, "0-9-tce-90");

    // 3.2 Tous les types d'événements autorisés
    const validEventTypes: Array<MicroConversionInput["eventType"]> = [
      "lead_magnet_submit",
      "dropzone_upload",
      "dropzone_completed",
      "conversion_cta",
    ];

    for (const evt of validEventTypes) {
      const res = await recordMicroConversionAction({
        eventType: evt,
        brand: "citroen",
        model: "c3",
      });
      assert.equal(res.success, true, `L'événement ${evt} doit être validé avec succès.`);
    }

    // 3.3 Rejet des événements invalides par Zod
    const invalidEventResult = await recordMicroConversionAction({
      eventType: "invalid_hacker_event" as any,
    });
    assert.equal(invalidEventResult.success, false, "Un type d'événement non autorisé doit être rejeté.");
    assert.ok(
      invalidEventResult.error?.includes("Type d'événement invalide"),
      "Le message d'erreur doit indiquer le rejet de validation Zod."
    );

    // 3.4 Route API /api/analytics/track (POST)
    let routeRecordedInsert: any = null;
    global.fetch = async (url: any, init: any) => {
      const u = url.toString();
      const method = init?.method || "GET";

      if (u.includes("micro_conversions") && method === "POST") {
        routeRecordedInsert = JSON.parse(init.body);
        return new Response(JSON.stringify({ id: "mc-from-route" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const trackReq = new NextRequest("http://localhost:3000/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "maintenance_conversion_cta_click",
        brand: "peugeot",
        model: "208-2",
        engine: "1-5-bluehdi-100",
        url: "http://localhost:3000/entretien/peugeot/208-2/1-5-bluehdi-100",
      }),
    });

    const trackRes = await trackRoutePOST(trackReq);
    assert.equal(trackRes.status, 200, "La route track doit répondre 200 OK.");
    const trackLeadCookie = trackRes.cookies.get("lavigie_lead_source");
    assert.ok(trackLeadCookie, "La route track doit poser le cookie d'attribution sur CTA click.");
    assert.ok(routeRecordedInsert, "La route track doit persister dans micro_conversions.");
    assert.equal(routeRecordedInsert.event_type, "conversion_cta");

    console.log("  ✔ Tracking certifié : validation Zod, insertion base PostgreSQL et rétrocompatibilité API.\n");

    // ==========================================
    // PARTIE 4 : VÉRIFICATION STATIQUE & INTÉGRITÉ DES FICHIERS
    // ==========================================
    console.log("▶ [TEST 4] Intégrité de la Migration SQL et Câblage UI...");

    // 4.1 Migration SQL 006_micro_conversions.sql
    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/006_micro_conversions.sql"
    );
    assert.ok(fs.existsSync(migrationPath), "Le fichier de migration 006_micro_conversions.sql doit exister.");
    const migrationSql = fs.readFileSync(migrationPath, "utf-8");

    assert.ok(migrationSql.includes("CREATE TABLE IF NOT EXISTS public.micro_conversions"));
    assert.ok(migrationSql.includes("event_type TEXT NOT NULL"));
    assert.ok(migrationSql.includes("metadata JSONB"));
    assert.ok(migrationSql.includes("ENABLE ROW LEVEL SECURITY"));
    assert.ok(migrationSql.includes("Allow anon and authenticated insert"));
    assert.ok(migrationSql.includes("idx_micro_conversions_created_at"));
    assert.ok(migrationSql.includes("idx_micro_conversions_event_type"));
    assert.ok(migrationSql.includes("idx_micro_conversions_brand_model"));

    // 4.2 Câblage MaintenancePrintActions.tsx
    const printActionsSrc = fs.readFileSync(
      path.join(process.cwd(), "src/components/maintenance/MaintenancePrintActions.tsx"),
      "utf-8"
    );
    assert.ok(
      printActionsSrc.includes("recordMicroConversionAction"),
      "MaintenancePrintActions doit importer recordMicroConversionAction."
    );
    assert.ok(
      printActionsSrc.includes("pdf_download_print"),
      "MaintenancePrintActions doit enregistrer l'événement pdf_download_print."
    );
    assert.ok(
      printActionsSrc.includes("lead_magnet_submit"),
      "MaintenancePrintActions doit enregistrer l'événement lead_magnet_submit."
    );

    // 4.3 Câblage MaintenanceDropzone.tsx
    const dropzoneSrc = fs.readFileSync(
      path.join(process.cwd(), "src/components/maintenance/MaintenanceDropzone.tsx"),
      "utf-8"
    );
    assert.ok(
      dropzoneSrc.includes("recordMicroConversionAction"),
      "MaintenanceDropzone doit importer recordMicroConversionAction."
    );
    assert.ok(
      dropzoneSrc.includes("dropzone_upload"),
      "MaintenanceDropzone doit enregistrer l'événement dropzone_upload."
    );
    assert.ok(
      dropzoneSrc.includes("dropzone_completed"),
      "MaintenanceDropzone doit enregistrer l'événement dropzone_completed."
    );
    assert.ok(
      dropzoneSrc.includes("conversion_cta"),
      "MaintenanceDropzone doit enregistrer l'événement conversion_cta."
    );

    console.log("  ✔ Fichiers statiques certifiés : migration SQL idempotente et déclencheurs UI conformes.\n");

    console.log("=================================================");
    console.log("🎉 SUITE D'ATTRIBUTION FULL FUNNEL VALIDÉE AVEC SUCCÈS (100% VERT) !");
    console.log("=================================================\n");
  } finally {
    global.fetch = originalFetch;
  }
}

// Permettre l'exécution directe du fichier via npx tsx
if (require.main === module) {
  testFullFunnelAttribution().catch((err) => {
    console.error("❌ ÉCHEC DU TEST :", err);
    process.exit(1);
  });
}
