import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import {
  signUpCredentialsSchema,
  signInCredentialsSchema,
} from "@/lib/security/schemas";
import { signUpWithPasswordAction } from "@/app/actions/auth";
import {
  ensureUserHousehold,
  requireUserHouseholdContext,
} from "@/lib/security/auth-context";
import { initializeContextualVehicleAction } from "@/app/actions/vehicles";
import { resolveVehicleCatalogSpecs } from "@/lib/engine/vehicle-catalog";
import { middleware } from "@/middleware";

export async function testAuthOnboardingFunnel() {
  console.log("=================================================");
  console.log("🚀 [TEST] PARCOURS D'ACQUISITION, INSCRIPTION SÉCURISÉE & AUTO-PROVISIONING ANTI-BOLA");
  console.log("=================================================\n");

  const originalFetch = global.fetch;
  const nextCache = require("next/cache");
  const originalRevalidatePath = nextCache.revalidatePath;
  // Neutraliser l'invariant revalidatePath hors contexte SSR pendant les tests
  nextCache.revalidatePath = () => {};

  try {
    // ==========================================
    // PARTIE 1 : SCHÉMAS DE VALIDATION ZOD
    // ==========================================
    console.log("▶ [TEST 1] Schémas Zod (signUpCredentialsSchema & signInCredentialsSchema)...");

    // 1.1 Inscription : Entrées valides
    const validSignUpFull = signUpCredentialsSchema.safeParse({
      email: "  Conducteur.Test@LaVigieAuto.com  ",
      password: "SuperSecretPassword123!",
      name: "  Jean Dupont  ",
    });
    assert.equal(validSignUpFull.success, true, "L'inscription valide complète doit être acceptée.");
    if (validSignUpFull.success) {
      assert.equal(validSignUpFull.data.email, "conducteur.test@lavigieauto.com", "L'email doit être normalisé en minuscules et trimé.");
      assert.equal(validSignUpFull.data.name, "Jean Dupont", "Le nom doit être trimé.");
      assert.equal(validSignUpFull.data.password, "SuperSecretPassword123!", "Le mot de passe doit être préservé.");
    }

    const validSignUpMinimal = signUpCredentialsSchema.safeParse({
      email: "conducteur@lavigieauto.com",
      password: "Minimum8Chars",
    });
    assert.equal(validSignUpMinimal.success, true, "L'inscription sans nom doit être acceptée.");
    if (validSignUpMinimal.success) {
      assert.equal(validSignUpMinimal.data.name, undefined, "Le nom doit être facultatif (undefined).");
    }

    // 1.2 Inscription : Rejet des adresses email invalides
    const invalidEmails = [
      "",
      "   ",
      "notanemail",
      "conducteur@",
      "@lavigieauto.com",
      "conducteur@domain",
      "conducteur@.com",
      "a".repeat(250) + "@longdomain.com", // > 255 caractères
    ];
    for (const email of invalidEmails) {
      const parsed = signUpCredentialsSchema.safeParse({
        email,
        password: "ValidPassword123",
      });
      assert.equal(parsed.success, false, `L'email invalide "${email}" aurait dû être rejeté par Zod.`);
    }

    // 1.3 Inscription : Bornes strictes du mot de passe (min 8, max 72 caractères pour bcrypt)
    // Moins de 8 caractères
    const shortPassword = signUpCredentialsSchema.safeParse({
      email: "conducteur@lavigieauto.com",
      password: "Pass123", // 7 caractères
    });
    assert.equal(shortPassword.success, false, "Un mot de passe de 7 caractères doit être rejeté.");

    // Exactement 8 caractères (borne minimale)
    const minPassword = signUpCredentialsSchema.safeParse({
      email: "conducteur@lavigieauto.com",
      password: "Pass1234", // 8 caractères
    });
    assert.equal(minPassword.success, true, "Un mot de passe de 8 caractères doit être accepté.");

    // Exactement 72 caractères (borne maximale bcrypt)
    const maxPassword = signUpCredentialsSchema.safeParse({
      email: "conducteur@lavigieauto.com",
      password: "P".repeat(72),
    });
    assert.equal(maxPassword.success, true, "Un mot de passe de 72 caractères doit être accepté.");

    // 73 caractères (dépassement borne max)
    const tooLongPassword = signUpCredentialsSchema.safeParse({
      email: "conducteur@lavigieauto.com",
      password: "P".repeat(73),
    });
    assert.equal(tooLongPassword.success, false, "Un mot de passe de 73 caractères doit être rejeté.");

    // 1.4 Inscription : Borne du nom (max 100 caractères)
    const maxName = signUpCredentialsSchema.safeParse({
      email: "conducteur@lavigieauto.com",
      password: "Pass123456",
      name: "A".repeat(100),
    });
    assert.equal(maxName.success, true, "Un nom de 100 caractères doit être accepté.");

    const tooLongName = signUpCredentialsSchema.safeParse({
      email: "conducteur@lavigieauto.com",
      password: "Pass123456",
      name: "A".repeat(101),
    });
    assert.equal(tooLongName.success, false, "Un nom de 101 caractères doit être rejeté.");

    // 1.5 Connexion : Schéma signInCredentialsSchema
    const validSignIn = signInCredentialsSchema.safeParse({
      email: "  UTILISATEUR@domain.fr ",
      password: "some-password",
    });
    assert.equal(validSignIn.success, true, "La connexion valide doit être acceptée.");
    if (validSignIn.success) {
      assert.equal(validSignIn.data.email, "utilisateur@domain.fr", "L'email de connexion doit être normalisé.");
    }

    const invalidSignInEmptyPassword = signInCredentialsSchema.safeParse({
      email: "valid@domain.fr",
      password: "",
    });
    assert.equal(invalidSignInEmptyPassword.success, false, "La connexion avec mot de passe vide doit être rejetée.");

    console.log("  ✔ Schémas Zod certifiés : normalisation email, bornes password [8-72], max name 100 et typage strict.\n");

    // ==========================================
    // PARTIE 2 : SERVER ACTION signUpWithPasswordAction
    // ==========================================
    console.log("▶ [TEST 2] Server Action signUpWithPasswordAction (Validation & Détection Doublon)...");

    // 2.1 Rejet Zod direct sur email invalide
    const actionInvalidEmail = await signUpWithPasswordAction("bad-email", "Password1234");
    assert.equal(actionInvalidEmail.success, false, "L'action doit échouer sur un email invalide.");
    assert.equal(actionInvalidEmail.code, "invalid_email", "Le code d'erreur doit être 'invalid_email'.");
    assert.ok(actionInvalidEmail.error?.includes("valide"), "Le message d'erreur doit guider l'utilisateur.");

    // 2.2 Rejet Zod direct sur mot de passe trop court
    const actionShortPassword = await signUpWithPasswordAction("user@lavigieauto.com", "short");
    assert.equal(actionShortPassword.success, false, "L'action doit échouer sur un mot de passe trop court.");
    assert.equal(actionShortPassword.code, "weak_password", "Le code d'erreur doit être 'weak_password'.");

    // 2.3 Rejet Zod direct sur mot de passe trop long
    const actionLongPassword = await signUpWithPasswordAction("user@lavigieauto.com", "a".repeat(73));
    assert.equal(actionLongPassword.success, false, "L'action doit échouer sur un mot de passe > 72 caractères.");
    assert.equal(actionLongPassword.code, "weak_password", "Le code d'erreur doit être 'weak_password'.");

    // 2.4 Détection d'un compte déjà existant (Supabase 422 / already in use)
    global.fetch = async (url: any) => {
      const u = url.toString();
      if (u.includes("signup")) {
        return new Response(
          JSON.stringify({ message: "User already registered", status: 422 }),
          { status: 422, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const actionDuplicate422 = await signUpWithPasswordAction("deja_inscrit@lavigieauto.com", "ValidPass1234");
    assert.equal(actionDuplicate422.success, false, "L'action doit refuser un compte existant (422).");
    assert.equal(actionDuplicate422.code, "user_already_exists", "Le code d'erreur doit être 'user_already_exists'.");
    assert.ok(actionDuplicate422.error?.includes("existe déjà"), "Le message d'erreur doit inviter à la connexion.");

    // 2.5 Détection GoTrue anti-énumération (Statut 200 avec tableau identities vide)
    global.fetch = async (url: any) => {
      const u = url.toString();
      if (u.includes("signup")) {
        return new Response(
          JSON.stringify({
            id: "user-enum-id",
            email: "enum@lavigieauto.com",
            identities: [], // Empty identities = already registered in GoTrue
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const actionDuplicateAntiEnum = await signUpWithPasswordAction("enum@lavigieauto.com", "ValidPass1234");
    assert.equal(actionDuplicateAntiEnum.success, false, "L'action doit détecter les doublons GoTrue anti-énumération.");
    assert.equal(actionDuplicateAntiEnum.code, "user_already_exists", "Le code d'erreur doit être 'user_already_exists'.");

    // 2.6 Succès d'inscription avec création de session
    global.fetch = async (url: any) => {
      const u = url.toString();
      if (u.includes("signup")) {
        return new Response(
          JSON.stringify({
            access_token: "jwt-token-active",
            token_type: "bearer",
            expires_in: 3600,
            refresh_token: "refresh-token-123",
            user: {
              id: "new-user-uuid-1",
              email: "nouvel_inscrit@lavigieauto.com",
              identities: [{ id: "ident-1" }],
              user_metadata: { full_name: "Paul Martin" },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (u.includes("foyer_members") || u.includes("foyers")) {
        return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const actionSuccess = await signUpWithPasswordAction("nouvel_inscrit@lavigieauto.com", "ValidPass1234", "Paul Martin");
    assert.equal(actionSuccess.success, true, "L'action d'inscription réussie doit renvoyer success: true.");
    assert.equal(actionSuccess.sessionCreated, true, "La session doit être marquée comme créée.");
    assert.equal(actionSuccess.requiresEmailConfirmation, false, "La confirmation email ne doit pas être requise si la session est active.");
    assert.equal(actionSuccess.user?.id, "new-user-uuid-1", "L'utilisateur retourné doit correspondre au payload.");

    console.log("  ✔ Server Action signUpWithPasswordAction certifiée : validation, détection doublon (422 + anti-enum) et succès nominal.\n");

    // ==========================================
    // PARTIE 3 : AUTO-PROVISIONING FOYER ANTI-BOLA
    // ==========================================
    console.log("▶ [TEST 3] Auto-Provisioning Anti-BOLA (ensureUserHousehold & requireUserHouseholdContext)...");

    // 3.1 Rejet si l'identifiant utilisateur est absent
    await assert.rejects(
      async () => {
        await ensureUserHousehold({ id: "" });
      },
      /Identifiant utilisateur requis/,
      "ensureUserHousehold doit lever une exception si l'id utilisateur est vide."
    );

    // 3.2 Création physique d'un nouveau foyer avec UUID natif et affiliation owner
    let recordedFoyerInsert: any = null;
    let recordedMemberUpsert: any = null;

    global.fetch = async (url: any, init: any) => {
      const u = url.toString();
      const method = init?.method || "GET";

      if (u.includes("foyer_members") && method === "GET") {
        // Utilisateur non affilié initialement
        return new Response(JSON.stringify(null), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes("foyers") && method === "GET") {
        // Aucun foyer existant pour cet email
        return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes("foyers") && method === "POST") {
        recordedFoyerInsert = JSON.parse(init.body);
        return new Response(JSON.stringify({ id: recordedFoyerInsert.id }), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes("foyer_members") && method === "POST") {
        recordedMemberUpsert = JSON.parse(init.body);
        return new Response(JSON.stringify({}), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const provisionResult = await ensureUserHousehold({
      id: "usr-auto-test-42",
      email: "sophie.durand@lavigieauto.com",
      user_metadata: { full_name: "Sophie Durand" },
    });

    assert.ok(provisionResult.foyerId, "Un foyerId doit être retourné.");
    assert.equal(provisionResult.role, "owner", "Le rôle initial de l'utilisateur doit être 'owner'.");

    // Vérification de la structure du foyer inséré
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    assert.ok(uuidRegex.test(recordedFoyerInsert.id), "L'ID du foyer créé doit être un UUID natif valide.");
    assert.equal(recordedFoyerInsert.nom, "Foyer Sophie Durand", "Le nom du foyer doit être généré à partir du nom du propriétaire.");
    assert.equal(recordedFoyerInsert.metadata.user_email, "sophie.durand@lavigieauto.com", "L'email doit être stocké dans les métadonnées du foyer.");
    assert.equal(recordedFoyerInsert.metadata.auto_provisioned, true, "Le tag auto_provisioned doit être activé.");
    assert.equal(recordedFoyerInsert.metadata.plan, "foyer_decouverte", "Le plan initial doit être 'foyer_decouverte'.");

    // Vérification de l'affiliation membre insérée
    assert.equal(recordedMemberUpsert.user_id, "usr-auto-test-42", "Le membre doit être lié à l'ID utilisateur.");
    assert.equal(recordedMemberUpsert.foyer_id, recordedFoyerInsert.id, "Le membre doit être lié à l'UUID du foyer créé.");
    assert.equal(recordedMemberUpsert.role, "owner", "Le rôle de l'affiliation doit être 'owner'.");

    // 3.3 Idempotence : un utilisateur déjà rattaché ne déclenche aucun nouvel insert
    let insertAttempts = 0;
    global.fetch = async (url: any, init: any) => {
      const u = url.toString();
      const method = init?.method || "GET";

      if (u.includes("foyer_members") && method === "GET") {
        return new Response(
          JSON.stringify({ id: "fm-existing-1", foyer_id: "existing-foyer-uuid", role: "owner" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (method === "POST") {
        insertAttempts++;
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const idempotentResult = await ensureUserHousehold({
      id: "usr-auto-test-42",
      email: "sophie.durand@lavigieauto.com",
    });
    assert.equal(idempotentResult.foyerId, "existing-foyer-uuid", "Le foyerId existant doit être résolu immédiatement.");
    assert.equal(idempotentResult.role, "owner", "Le rôle existant doit être préservé.");
    assert.equal(insertAttempts, 0, "Aucun insert SQL ne doit être exécuté lors d'un appel idempotent.");

    // 3.4 Résolution non-bloquante de requireUserHouseholdContext()
    const resolvedContext = await requireUserHouseholdContext();
    assert.ok(resolvedContext.userId, "requireUserHouseholdContext doit résoudre l'ID utilisateur.");
    assert.ok(resolvedContext.foyerId, "requireUserHouseholdContext doit résoudre le foyerId sans lever d'exception.");
    assert.equal(resolvedContext.role, "owner", "Le rôle doit être résolu.");

    console.log("  ✔ Auto-provisioning Anti-BOLA certifié : création UUID natif, rôle 'owner', idempotence et résolution non-bloquante.\n");

    // ==========================================
    // PARTIE 4 : INITIALISATION CONTEXTUELLE DU VÉHICULE
    // ==========================================
    console.log("▶ [TEST 4] Initialisation Contextuelle du Véhicule (initializeContextualVehicleAction)...");

    // 4.1 Vérification des entrées obligatoires
    const emptyVeh1 = await initializeContextualVehicleAction({ brand: "", model: "" });
    assert.equal(emptyVeh1.success, false, "L'initialisation doit échouer si marque et modèle sont vides.");
    assert.equal(emptyVeh1.error, "Marque et modèle obligatoires.");

    const emptyVeh2 = await initializeContextualVehicleAction({ brand: "Peugeot", model: "" });
    assert.equal(emptyVeh2.success, false, "L'initialisation doit échouer si le modèle est vide.");

    const emptyVeh3 = await initializeContextualVehicleAction({ brand: "", model: "208" });
    assert.equal(emptyVeh3.success, false, "L'initialisation doit échouer si la marque est vide.");

    // 4.2 Résolution des caractéristiques via le catalogue centralisé (GEMINI.md Règle 4)
    const renaultSpecs = resolveVehicleCatalogSpecs({
      make: "renault",
      model: "espace",
    });
    assert.equal(renaultSpecs.fuel, "diesel", "L'Espace 2.0 Blue dCi doit être résolu en diesel.");
    assert.equal(renaultSpecs.dinPower, 200, "La puissance DIN de l'Espace doit être de 200 ch.");
    assert.equal(renaultSpecs.boiteVitesse, "automatique", "La boîte de vitesses de l'Espace doit être automatique.");
    assert.equal(renaultSpecs.annualKm, 15000, "Le kilométrage annuel de l'Espace doit être de 15 000 km.");

    const vitaraSpecs = resolveVehicleCatalogSpecs({
      make: "suzuki",
      model: "vitara",
    });
    assert.equal(vitaraSpecs.fuel, "essence", "Le Suzuki Vitara 1.6 VVT doit être résolu en essence.");
    assert.equal(vitaraSpecs.dinPower, 120, "La puissance DIN du Vitara doit être de 120 ch.");
    assert.equal(vitaraSpecs.boiteVitesse, "manuelle", "La boîte du Vitara doit être manuelle.");

    const peugeotSpecs = resolveVehicleCatalogSpecs({
      make: "peugeot",
      model: "208-2",
      version: "1-5-bluehdi-100",
    });
    assert.equal(peugeotSpecs.dinPower, 100, "La puissance DIN catalogue Peugeot doit être résolue (100 ch pour 1.5 BlueHDi).");
    assert.equal(peugeotSpecs.annualKm, 12000, "Le kilométrage annuel Peugeot doit être résolu.");

    // 4.3 Insertion réelle dans public.vehicules avec immatriculation 'NOUVEAU' (GEMINI.md Règle 1)
    let recordedVehicleInsert: any = null;
    global.fetch = async (url: any, init: any) => {
      const u = url.toString();
      const method = init?.method || "GET";

      if (u.includes("vehicules") && method === "GET") {
        // Aucun véhicule dans le foyer
        return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes("vehicules") && method === "POST") {
        recordedVehicleInsert = JSON.parse(init.body);
        return new Response(
          JSON.stringify({ id: "veh-contextual-uuid-777" }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    const initResult = await initializeContextualVehicleAction({
      brand: "Peugeot",
      model: "208-2",
      engine: "1-5-bluehdi-100",
      src: "seo_landing",
    });

    assert.equal(initResult.success, true, "L'action d'initialisation de véhicule doit réussir.");
    assert.equal(initResult.vehicleId, "veh-contextual-uuid-777", "L'identifiant du véhicule créé doit être retourné.");

    // Validation des attributs du véhicule inséré
    assert.equal(recordedVehicleInsert.immatriculation, "NOUVEAU", "L'immatriculation initiale doit être 'NOUVEAU'.");
    assert.equal(recordedVehicleInsert.statut, "actif", "Le statut initial doit être 'actif'.");
    assert.equal(recordedVehicleInsert.marque, "Peugeot", "La marque doit être formatée.");
    assert.equal(recordedVehicleInsert.modele, "208 2", "Le modèle doit être formaté sans tirets.");
    assert.equal(recordedVehicleInsert.version, "1-5-bluehdi-100", "La version moteur doit être conservée.");
    assert.equal(recordedVehicleInsert.kilometrage_actuel, 0, "Le kilométrage initial doit être 0.");
    assert.equal(recordedVehicleInsert.metadata.source, "seo_landing", "La source d'acquisition doit être tracée.");
    assert.equal(recordedVehicleInsert.metadata.created_via, "seo_landing_conversion", "Le tag de conversion SEO doit être présent.");

    // 4.4 Idempotence anti-duplication : si le véhicule existe déjà, pas de ré-insertion
    let vehicleInsertCount = 0;
    global.fetch = async (url: any, init: any) => {
      const u = url.toString();
      const method = init?.method || "GET";

      if (u.includes("vehicules") && method === "GET") {
        return new Response(
          JSON.stringify([
            {
              id: "veh-contextual-uuid-777",
              marque: "Peugeot",
              modele: "208 2",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (u.includes("vehicules") && method === "POST") {
        vehicleInsertCount++;
        return new Response(JSON.stringify({ id: "duplicate-id" }), { status: 201 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    };

    const duplicateResult = await initializeContextualVehicleAction({
      brand: "peugeot",
      model: "208-2",
      engine: "1-5-bluehdi-100",
      src: "seo_landing",
    });

    assert.equal(duplicateResult.success, true, "L'appel idempotent doit réussir.");
    assert.equal(duplicateResult.vehicleId, "veh-contextual-uuid-777", "L'identifiant du véhicule existant doit être renvoyé.");
    assert.equal(vehicleInsertCount, 0, "Aucune ré-insertion ne doit être effectuée pour un véhicule déjà présent.");

    console.log("  ✔ Initialisation contextuelle certifiée : specs catalogue, immatriculation 'NOUVEAU', traçabilité SEO et idempotence anti-duplication.\n");

    // ==========================================
    // PARTIE 5 : PRÉSERVATION DES PARAMÈTRES PAR LE MIDDLEWARE
    // ==========================================
    console.log("▶ [TEST 5] Préservation des Paramètres de Redirection par le Middleware...");

    // 5.1 Redirection d'un visiteur non authentifié depuis une landing SEO
    const reqSeo = new NextRequest(
      "http://localhost:3000/dashboard?brand=peugeot&model=208-2&engine=1-5-bluehdi-100&src=seo_landing"
    );
    const resSeo = await middleware(reqSeo);

    assert.equal(resSeo.status, 307, "Le middleware doit émettre une redirection HTTP 307 pour un accès non authentifié.");
    const locationSeo = resSeo.headers.get("location");
    assert.ok(locationSeo, "L'en-tête de redirection Location doit être présent.");

    const parsedSeoLocation = new URL(locationSeo!);
    assert.equal(parsedSeoLocation.pathname, "/login", "La cible de redirection doit être /login.");
    assert.equal(parsedSeoLocation.searchParams.get("brand"), "peugeot", "Le paramètre 'brand' doit être préservé.");
    assert.equal(parsedSeoLocation.searchParams.get("model"), "208-2", "Le paramètre 'model' doit être préservé.");
    assert.equal(parsedSeoLocation.searchParams.get("engine"), "1-5-bluehdi-100", "Le paramètre 'engine' doit être préservé.");
    assert.equal(parsedSeoLocation.searchParams.get("src"), "seo_landing", "Le paramètre 'src' doit être préservé.");
    assert.equal(
      parsedSeoLocation.searchParams.get("redirect_to"),
      "/dashboard?brand=peugeot&model=208-2&engine=1-5-bluehdi-100&src=seo_landing",
      "Le paramètre 'redirect_to' doit conserver l'URL relative complète avec sa query string."
    );

    // 5.2 Redirection depuis le Lead Magnet modal (Dacia Jogger GPL)
    const reqLeadMagnet = new NextRequest(
      "http://localhost:3000/dashboard?brand=dacia&model=jogger&engine=1-0-eco-g-100&src=lead_magnet_modal"
    );
    const resLeadMagnet = await middleware(reqLeadMagnet);
    const parsedLeadLocation = new URL(resLeadMagnet.headers.get("location")!);

    assert.equal(parsedLeadLocation.searchParams.get("brand"), "dacia");
    assert.equal(parsedLeadLocation.searchParams.get("model"), "jogger");
    assert.equal(parsedLeadLocation.searchParams.get("engine"), "1-0-eco-g-100");
    assert.equal(parsedLeadLocation.searchParams.get("src"), "lead_magnet_modal");
    assert.equal(
      parsedLeadLocation.searchParams.get("redirect_to"),
      "/dashboard?brand=dacia&model=jogger&engine=1-0-eco-g-100&src=lead_magnet_modal"
    );

    // 5.3 Redirection simple sans query params
    const reqSimple = new NextRequest("http://localhost:3000/dashboard");
    const resSimple = await middleware(reqSimple);
    const parsedSimpleLocation = new URL(resSimple.headers.get("location")!);

    assert.equal(parsedSimpleLocation.pathname, "/login");
    assert.equal(parsedSimpleLocation.searchParams.get("redirect_to"), "/dashboard");
    assert.equal(parsedSimpleLocation.searchParams.get("brand"), null);

    // 5.4 Vérification des Headers de Sécurité (Red Team)
    const reqPublic = new NextRequest("http://localhost:3000/entretien");
    const resPublic = await middleware(reqPublic);

    assert.equal(resPublic.headers.get("X-Frame-Options"), "DENY", "Le header X-Frame-Options doit être 'DENY'.");
    assert.equal(resPublic.headers.get("X-Content-Type-Options"), "nosniff", "Le header X-Content-Type-Options doit être 'nosniff'.");
    assert.ok(resPublic.headers.get("Content-Security-Policy"), "Le header Content-Security-Policy doit être actif.");

    console.log("  ✔ Middleware certifié : transmission exhaustive des query params (brand, model, engine, src), mémorisation redirect_to et headers de sécurité.\n");

    // ==========================================
    // PARTIE 6 : VÉRIFICATION DE L'INTÉGRATION UI & UX CONVERSIONS
    // ==========================================
    console.log("▶ [TEST 6] Intégrité de l'Expérience Utilisateur (/login & Lead Magnet)...");

    // 6.1 Page /login : Vérification de la présence de Suspense, onglets dual-mode, et graceful switch
    const loginSrc = fs.readFileSync(path.join(process.cwd(), "src/app/login/page.tsx"), "utf-8");
    assert.ok(loginSrc.includes("Suspense"), "LoginPage doit être encapsulé dans un <Suspense> boundary.");
    assert.ok(loginSrc.includes("LoginLoadingSkeleton"), "LoginPage doit définir un skeleton de chargement.");
    assert.ok(loginSrc.includes("Créer mon compte"), "LoginPage doit comporter l'onglet 'Créer mon compte'.");
    assert.ok(loginSrc.includes("Se connecter"), "LoginPage doit comporter l'onglet 'Se connecter'.");
    assert.ok(loginSrc.includes("user_already_exists"), "LoginPage doit gérer le code d'erreur 'user_already_exists'.");
    assert.ok(loginSrc.includes("Se connecter avec ce compte"), "LoginPage doit proposer le basculement en 1 clic vers connexion.");
    assert.ok(loginSrc.includes("signUpWithPasswordAction"), "LoginPage doit connecter signUpWithPasswordAction.");
    assert.ok(loginSrc.includes("sessionStorage"), "LoginPage doit synchroniser avec sessionStorage.");

    // 6.2 MaintenancePrintActions : Modale Lead Magnet et préservation de window.print()
    const printActionsSrc = fs.readFileSync(path.join(process.cwd(), "src/components/maintenance/MaintenancePrintActions.tsx"), "utf-8");
    assert.ok(printActionsSrc.includes("Recevoir le carnet officiel"), "Le titre de la modale Lead Magnet doit être présent.");
    assert.ok(printActionsSrc.includes("rappels révision à J-30"), "La mention des rappels révision à J-30 doit être présente.");
    assert.ok(printActionsSrc.includes("signInWithGoogleAction"), "L'action Google OAuth 1-clic doit être câblée.");
    assert.ok(printActionsSrc.includes("Imprimer directement sans email"), "L'option d'impression directe sans email doit être préservée.");
    assert.ok(printActionsSrc.includes("window.print()"), "L'appel window.print() direct doit être garanti.");
    assert.ok(printActionsSrc.includes("print:hidden"), "Les modales et boutons doivent être masqués à l'impression via print:hidden.");

    // 6.3 MaintenanceDropzone : Transmission des paramètres d'acquisition
    const dropzoneSrc = fs.readFileSync(path.join(process.cwd(), "src/components/maintenance/MaintenanceDropzone.tsx"), "utf-8");
    assert.ok(dropzoneSrc.includes("lavigie_selected_vehicle"), "MaintenanceDropzone doit mémoriser le véhicule dans sessionStorage.");
    assert.ok(dropzoneSrc.includes("/dashboard"), "MaintenanceDropzone doit pointer vers /dashboard avec query params.");

    // 6.4 Auth Callback : Auto-provisioning lors de l'échange OAuth
    const callbackSrc = fs.readFileSync(path.join(process.cwd(), "src/app/auth/callback/route.ts"), "utf-8");
    assert.ok(callbackSrc.includes("ensureUserHousehold"), "auth/callback/route.ts doit invoquer ensureUserHousehold.");

    console.log("  ✔ Composants UI & UX certifiés : /login (Suspense, onglets, contextualisation, switch doublon), Lead Magnet (OAuth 1-clic, email, print direct) et Auth Callback.\n");

    console.log("=================================================");
    console.log("🎉 SUITE COMPLÈTE DU PARCOURS D'ACQUISITION VALIDÉE AVEC SUCCÈS (100% VERT) !");
    console.log("=================================================\n");
  } finally {
    // Restauration garantie des fonctions et mocks globaux
    global.fetch = originalFetch;
    nextCache.revalidatePath = originalRevalidatePath;
  }
}
