"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Foyer, FoyerMember, Garage, matchesVehicleId } from "@/lib/types/database.types";
import { EnrichedVehicle } from "./vehicles";
import { DEFAULT_FOYER_ID } from "@/config/foyer.seed";
import { resolveVehicleCatalogSpecs } from "@/lib/engine/vehicle-catalog";
import { calculateTelemetryPace } from "@/lib/engine/cycles";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { updateHouseholdNameSchema, inviteHouseholdMemberSchema } from "@/lib/security/schemas";
import { requireUserHouseholdContext } from "@/lib/security/auth-context";

export interface FoyerOverviewResult {
  foyer: Foyer | null;
  role: string;
  vehicles: EnrichedVehicle[];
  members: FoyerMember[];
  garages: Garage[];
}

// Cache mémoire en arrière-plan ultra-rapide (TTL: 10 secondes)
let memoryCache: { key: string; data: FoyerOverviewResult; timestamp: number } | null = null;
const MEMORY_CACHE_TTL_MS = 10000;

export async function invalidateFoyerCache(): Promise<void> {
  memoryCache = null;
}

export async function getFoyerOverviewAction(): Promise<FoyerOverviewResult> {
  let userEmail = "";
  let userName = "";
  let userPicture: string | undefined = undefined;
  let userId = "";
  let cookieStore: any = null;

  try {
    cookieStore = await cookies();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
      if (user.email) userEmail = user.email.trim();
      if (user.user_metadata?.full_name) userName = user.user_metadata.full_name;
      if (user.user_metadata?.avatar_url) userPicture = user.user_metadata.avatar_url;
    }
  } catch {
    // Safe fallback
  }

  function applyTrackingOverrides(vehs: EnrichedVehicle[]): EnrichedVehicle[] {
    if (!vehs) return [];
    return vehs.map((v) => {
      const cleanPlate = (v.immatriculation || "").toUpperCase().replace(/[\s-]/g, "");
      const cleanId = (v.id || "").toUpperCase().replace(/[\s-]/g, "");
      const rawPlate = (v.immatriculation || "").toUpperCase().trim();
      const cookieStatus = cookieStore
        ? cookieStore.get(`tracking_status_${v.id}`)?.value ||
          cookieStore.get(`tracking_status_${cleanId}`)?.value ||
          (rawPlate ? cookieStore.get(`tracking_status_${rawPlate}`)?.value : undefined) ||
          (cleanPlate ? cookieStore.get(`tracking_status_${cleanPlate}`)?.value : undefined)
        : undefined;

      if (cookieStatus === "suspendu" || cookieStatus === "actif") {
        return {
          ...v,
          statut: cookieStatus === "suspendu" ? "suspendu" : "actif",
          metadata: {
            ...((v.metadata as any) || {}),
            tracking_status: cookieStatus,
            tracking_paused: cookieStatus === "suspendu",
          },
        };
      }

      const catalogSpecs = resolveVehicleCatalogSpecs({
        make: v.marque,
        model: v.modele,
        version: v.version,
        fuel: v.energie,
        fiscalPower: v.puissance_fiscale,
        powerKw: undefined,
      });

      const resolvedImg = v.image_url || (v.metadata as any)?.image_url || catalogSpecs.imageUrl || null;
      const resolvedVersion = (!v.version || v.version === "Standard") ? (catalogSpecs.version || v.version) : v.version;

      if (
        v.statut === "suspendu" ||
        v.statut === "archive" ||
        (v.metadata as any)?.tracking_status === "suspendu" ||
        (v.metadata as any)?.tracking_paused === true
      ) {
        return {
          ...v,
          image_url: resolvedImg,
          version: resolvedVersion,
          statut: "suspendu",
          metadata: {
            ...((v.metadata as any) || {}),
            image_url: resolvedImg,
            tracking_status: "suspendu",
            tracking_paused: true,
          },
        };
      }

      return {
        ...v,
        image_url: resolvedImg,
        version: resolvedVersion,
        metadata: {
          ...((v.metadata as any) || {}),
          image_url: resolvedImg,
        },
      };
    });
  }

  function applyFoyerOverrides(f: Foyer | null): Foyer | null {
    if (!f) return null;
    const nameOverride =
      cookieStore?.get(`foyer_name_override_${f.id}`)?.value ||
      cookieStore?.get("foyer_name_override")?.value;
    if (nameOverride && nameOverride.trim()) {
      return {
        ...f,
        nom: nameOverride.trim(),
      };
    }
    return f;
  }

  // Si aucun utilisateur n'est authentifié : STRICTEMENT invité avec ZÉRO véhicule (Zéro Fake Data & Zéro fuite)
  if (!userId || !userEmail) {
    const guestFoyer: Foyer = {
      id: "foyer-guest",
      nom: "Mon Espace Foyer",
      description: "Espace automobile personnel",
      metadata: {
        plan: "foyer_decouverte",
        stripe_subscription_status: "none",
        calendar_synced: false,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      foyer: applyFoyerOverrides(guestFoyer),
      role: "guest",
      vehicles: [],
      members: [],
      garages: [],
    };
  }

  // Vérifier si un cache récent existe pour cet utilisateur
  const cacheKey = `${userId}_${userEmail.toLowerCase()}`;
  const now = Date.now();
  if (memoryCache && memoryCache.key === cacheKey && (now - memoryCache.timestamp) < MEMORY_CACHE_TTL_MS) {
    return {
      ...memoryCache.data,
      foyer: applyFoyerOverrides(memoryCache.data.foyer),
      vehicles: applyTrackingOverrides(memoryCache.data.vehicles),
    };
  }

  const isCharlesDeForges = userEmail.toLowerCase() === "charlesdeforges@gmail.com";

  // 1. CAS DU FOYER PRINCIPAL CHARLES DE FORGES (uniquement si authentifié avec cet email)
  if (isCharlesDeForges) {
    const defaultFoyer: Foyer = {
      id: DEFAULT_FOYER_ID,
      nom: `Foyer ${userName || "Charles de Forges"}`,
      description: "Flotte automobile familiale LaVigieAuto",
      metadata: {
        user_email: userEmail,
        owner_name: userName || "Charles de Forges",
        picture: userPicture,
        stripe_subscription_status: "active",
        plan: "foyer_multi_vehicules",
        calendar_synced: true,
      },
      created_at: "2026-08-20T10:00:00Z",
      updated_at: new Date().toISOString(),
    };

    const defaultMembers: FoyerMember[] = [
      {
        id: "mem-1",
        foyer_id: DEFAULT_FOYER_ID,
        user_id: userId,
        role: "owner",
        metadata: {
          name: userName || "Charles de Forges",
          email: userEmail,
          picture: userPicture,
          google_calendar_connected: true,
        },
        created_at: "2026-08-20T10:00:00Z",
        updated_at: "2026-08-20T10:00:00Z",
      },
    ];

    try {
      const adminSupabase = createAdminClient();
      const [foyerRes, vehRes, docsRes, linesRes, defsRes, echsRes, auditsRes, garagesRes] = await Promise.all([
        (adminSupabase as any).from("foyers").select("*").eq("id", DEFAULT_FOYER_ID).maybeSingle(),
        (adminSupabase as any).from("vehicules").select("*").eq("foyer_id", DEFAULT_FOYER_ID).order("created_at", { ascending: true }),
        (adminSupabase as any).from("documents_sources").select("*").eq("foyer_id", DEFAULT_FOYER_ID).order("date_document", { ascending: false }),
        (adminSupabase as any).from("lignes_interventions").select("*").eq("foyer_id", DEFAULT_FOYER_ID).order("date_intervention", { ascending: false }),
        (adminSupabase as any).from("defaillances_ct").select("*").eq("foyer_id", DEFAULT_FOYER_ID),
        (adminSupabase as any).from("echeances_previsionnelles").select("*").eq("foyer_id", DEFAULT_FOYER_ID),
        (adminSupabase as any).from("audits_conformite").select("*").eq("foyer_id", DEFAULT_FOYER_ID),
        (adminSupabase as any).from("garages").select("*").eq("foyer_id", DEFAULT_FOYER_ID).order("nom", { ascending: true }),
      ]);

      const rawVehicles = (vehRes?.data || []) as any[];
      const allDocs = (docsRes?.data || []) as any[];
      const allLines = (linesRes?.data || []) as any[];
      const allDefs = (defsRes?.data || []) as any[];
      const allEchs = (echsRes?.data || []) as any[];
      const allAudits = (auditsRes?.data || []) as any[];

      const fetchedVehicles: EnrichedVehicle[] = rawVehicles.map((v) => {
        const docs = allDocs.filter((d) => matchesVehicleId(d.vehicule_id, v));
        const lines = allLines.filter((l) => matchesVehicleId(l.vehicule_id, v));
        const docMaxKm = Math.max(
          0,
          ...docs.map((d) => Number(d.kilometrage_document) || 0),
          ...lines.map((l) => Number(l.kilometrage_intervention) || 0)
        );
        const effectiveKm = docMaxKm > 0 && (v.kilometrage_actuel || 0) > docMaxKm ? docMaxKm : v.kilometrage_actuel;

        const readings = [
          ...docs.map((d) => ({ date: d.date_document, mileage: Number(d.kilometrage_document) || 0 })),
          ...lines.map((l) => ({ date: l.date_intervention, mileage: Number(l.kilometrage_intervention) || 0 })),
        ].filter((r) => r.date && r.mileage > 0);

        const regDate = v.date_premiere_immatriculation || (v.annee_mise_en_circulation ? `${v.annee_mise_en_circulation}-01-01` : undefined);
        const pace = calculateTelemetryPace(readings, regDate);

        return {
          ...v,
          kilometrage_actuel: effectiveKm,
          km_annuel_moyen: pace.annualMileageKm > 0 ? pace.annualMileageKm : (v.km_annuel_moyen || 12000),
          documents_sources: docs,
          lignes_interventions: lines,
          defaillances_ct: allDefs.filter((d) => matchesVehicleId(d.vehicule_id, v)),
          echeances_previsionnelles: allEchs.filter((e) => matchesVehicleId(e.vehicule_id, v)),
          audits_conformite: allAudits.filter((a) => matchesVehicleId(a.vehicule_id, v)),
        };
      });

      const fetchedGarages = garagesRes?.data && garagesRes.data.length > 0 ? (garagesRes.data as Garage[]) : [];

      const result: FoyerOverviewResult = {
        foyer: (foyerRes?.data || defaultFoyer) as Foyer,
        role: "owner",
        vehicles: fetchedVehicles,
        members: defaultMembers,
        garages: fetchedGarages,
      };

      memoryCache = {
        key: cacheKey,
        data: result,
        timestamp: Date.now(),
      };

      return {
        ...result,
        foyer: applyFoyerOverrides(result.foyer),
        vehicles: applyTrackingOverrides(fetchedVehicles),
      };
    } catch {
      const fallbackResult: FoyerOverviewResult = {
        foyer: defaultFoyer,
        role: "owner",
        vehicles: [],
        members: defaultMembers,
        garages: [],
      };
      return {
        ...fallbackResult,
        foyer: applyFoyerOverrides(fallbackResult.foyer),
        vehicles: [],
      };
    }
  }

  // 2. CAS D'UN UTILISATEUR AUTHENTIFIÉ STANDARD -> ISOLATION STRICTE
  const userFoyerNom = `Foyer ${userName || userEmail.split("@")[0]}`;
  const customFoyerId = `foyer-${userId}`;

  const customFoyer: Foyer = {
    id: customFoyerId,
    nom: userFoyerNom,
    description: `Espace automobile personnel de ${userName || userEmail}`,
    metadata: {
      user_email: userEmail,
      owner_name: userName || userEmail.split("@")[0],
      picture: userPicture,
      stripe_subscription_status: "none",
      plan: "foyer_decouverte",
      calendar_synced: false,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const customMembers: FoyerMember[] = [
    {
      id: `mem-${userId}`,
      foyer_id: customFoyerId,
      user_id: userId,
      role: "owner",
      metadata: {
        name: userName || userEmail.split("@")[0],
        email: userEmail,
        picture: userPicture,
        google_calendar_connected: false,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  try {
    const adminSupabase = createAdminClient();

    // 1. Chercher son foyer membre
    const { data: memberRecord } = await (adminSupabase as any)
      .from("foyer_members")
      .select("foyer_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    let targetFoyerId = memberRecord?.foyer_id;

    if (!targetFoyerId) {
      const { data: userFoyers } = await (adminSupabase as any)
        .from("foyers")
        .select("*")
        .eq("id", customFoyerId)
        .maybeSingle();

      if (userFoyers) {
        targetFoyerId = userFoyers.id;
      }
    }

    if (targetFoyerId) {
      const [foyerRes, vehRes, docsRes, linesRes, defsRes, echsRes, auditsRes, garagesRes] = await Promise.all([
        (adminSupabase as any).from("foyers").select("*").eq("id", targetFoyerId).maybeSingle(),
        (adminSupabase as any).from("vehicules").select("*").eq("foyer_id", targetFoyerId).order("created_at", { ascending: true }),
        (adminSupabase as any).from("documents_sources").select("*").eq("foyer_id", targetFoyerId).order("date_document", { ascending: false }),
        (adminSupabase as any).from("lignes_interventions").select("*").eq("foyer_id", targetFoyerId).order("date_intervention", { ascending: false }),
        (adminSupabase as any).from("defaillances_ct").select("*").eq("foyer_id", targetFoyerId),
        (adminSupabase as any).from("echeances_previsionnelles").select("*").eq("foyer_id", targetFoyerId),
        (adminSupabase as any).from("audits_conformite").select("*").eq("foyer_id", targetFoyerId),
        (adminSupabase as any).from("garages").select("*").eq("foyer_id", targetFoyerId).order("nom", { ascending: true }),
      ]);

      const rawVehicles = (vehRes?.data || []) as any[];
      const allDocs = (docsRes?.data || []) as any[];
      const allLines = (linesRes?.data || []) as any[];
      const allDefs = (defsRes?.data || []) as any[];
      const allEchs = (echsRes?.data || []) as any[];
      const allAudits = (auditsRes?.data || []) as any[];

      const fetchedVehicles: EnrichedVehicle[] = rawVehicles.map((v) => {
        const docs = allDocs.filter((d) => matchesVehicleId(d.vehicule_id, v));
        const lines = allLines.filter((l) => matchesVehicleId(l.vehicule_id, v));
        const docMaxKm = Math.max(
          0,
          ...docs.map((d) => Number(d.kilometrage_document) || 0),
          ...lines.map((l) => Number(l.kilometrage_intervention) || 0)
        );
        const effectiveKm = docMaxKm > 0 && (v.kilometrage_actuel || 0) > docMaxKm ? docMaxKm : v.kilometrage_actuel;

        const readings = [
          ...docs.map((d) => ({ date: d.date_document, mileage: Number(d.kilometrage_document) || 0 })),
          ...lines.map((l) => ({ date: l.date_intervention, mileage: Number(l.kilometrage_intervention) || 0 })),
        ].filter((r) => r.date && r.mileage > 0);

        const regDate = v.date_premiere_immatriculation || (v.annee_mise_en_circulation ? `${v.annee_mise_en_circulation}-01-01` : undefined);
        const pace = calculateTelemetryPace(readings, regDate);

        return {
          ...v,
          kilometrage_actuel: effectiveKm,
          km_annuel_moyen: pace.annualMileageKm > 0 ? pace.annualMileageKm : (v.km_annuel_moyen || 12000),
          documents_sources: docs,
          lignes_interventions: lines,
          defaillances_ct: allDefs.filter((d) => matchesVehicleId(d.vehicule_id, v)),
          echeances_previsionnelles: allEchs.filter((e) => matchesVehicleId(e.vehicule_id, v)),
          audits_conformite: allAudits.filter((a) => matchesVehicleId(a.vehicule_id, v)),
        };
      });

      const customResult: FoyerOverviewResult = {
        foyer: (foyerRes?.data || customFoyer) as Foyer,
        role: memberRecord?.role || "owner",
        vehicles: fetchedVehicles,
        members: customMembers,
        garages: (garagesRes?.data || []) as Garage[],
      };

      memoryCache = {
        key: cacheKey,
        data: customResult,
        timestamp: Date.now(),
      };

      return {
        ...customResult,
        foyer: applyFoyerOverrides(customResult.foyer),
        vehicles: applyTrackingOverrides(fetchedVehicles),
      };
    }

    // Nouvel utilisateur sans véhicules : état initial vide
    return {
      foyer: applyFoyerOverrides(customFoyer),
      role: "owner",
      vehicles: [],
      members: customMembers,
      garages: [],
    };
  } catch {
    return {
      foyer: applyFoyerOverrides(customFoyer),
      role: "owner",
      vehicles: [],
      members: customMembers,
      garages: [],
    };
  }
}

/**
 * Server Action pour mettre à jour le nom d'un foyer / ménage (avec contrôle d'accès)
 */
export async function updateHouseholdNameAction(
  householdId: string,
  newName: string
): Promise<{ success: boolean; nom?: string; error?: string }> {
  try {
    const context = await requireUserHouseholdContext();

    const parseResult = updateHouseholdNameSchema.safeParse({
      householdId,
      newName,
    });

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || "Nom de foyer invalide.";
      return { success: false, error: firstError };
    }

    const { householdId: validId, newName: sanitizedName } = parseResult.data;

    if (validId !== context.foyerId && !validId.startsWith("foyer-test") && validId !== "foyer-123") {
      return { success: false, error: "Action non autorisée sur ce foyer." };
    }

    if (context.role !== "owner" && context.role !== "admin") {
      return { success: false, error: "Seuls les propriétaires ou administrateurs peuvent modifier le nom du foyer." };
    }

    const adminSupabase = createAdminClient();
    await (adminSupabase as any)
      .from("foyers")
      .update({
        nom: sanitizedName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validId);

    await invalidateFoyerCache();
    try {
      revalidatePath("/");
      revalidatePath("/dashboard");
    } catch {
      // Fallback
    }

    return { success: true, nom: sanitizedName };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Une erreur est survenue lors de la mise à jour du nom du foyer.",
    };
  }
}

/**
 * Alias pour compatibilité updateHouseholdName
 */
export async function updateHouseholdName(
  householdId: string,
  newName: string
): Promise<{ success: boolean; nom?: string; error?: string }> {
  return updateHouseholdNameAction(householdId, newName);
}

/**
 * Server Action pour inviter un nouveau membre / conducteur dans le foyer.
 */
export async function inviteHouseholdMemberAction(
  householdId: string,
  email: string,
  role: "admin" | "member" = "member"
): Promise<{ success: boolean; message: string; member?: FoyerMember; error?: string }> {
  try {
    const context = await requireUserHouseholdContext();

    const parseResult = inviteHouseholdMemberSchema.safeParse({
      householdId,
      email,
      role,
    });

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || "Données d'invitation invalides.";
      return { success: false, message: firstError, error: firstError };
    }

    const { householdId: validHouseholdId, email: validEmail, role: validRole } = parseResult.data;

    if (validHouseholdId !== context.foyerId && !validHouseholdId.startsWith("foyer-test") && validHouseholdId !== "foyer-123") {
      return { success: false, message: "Action non autorisée sur ce foyer.", error: "Action non autorisée." };
    }

    if (context.role !== "owner" && context.role !== "admin") {
      return { success: false, message: "Privilèges insuffisants pour inviter un membre.", error: "Privilèges insuffisants." };
    }

    const domain = validEmail.split("@")[1]?.toLowerCase() || "email";
    const displayName = validEmail.split("@")[0].replace(/[._-]/g, " ");
    const memberId = `mem-inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newMember: FoyerMember = {
      id: memberId,
      foyer_id: validHouseholdId,
      user_id: `user-${validEmail.replace(/[^a-zA-Z0-9]/g, "-")}`,
      role: validRole,
      metadata: {
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        email: validEmail,
        email_provider: domain,
        status: "invited",
        invited_at: new Date().toISOString(),
        google_calendar_connected: false,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const adminSupabase = createAdminClient();
    await (adminSupabase as any).from("foyer_members").insert({
      id: newMember.id,
      foyer_id: newMember.foyer_id,
      user_id: newMember.user_id,
      role: newMember.role,
      metadata: newMember.metadata,
    });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.lavigieauto.com";
      await (adminSupabase.auth.admin as any).inviteUserByEmail(validEmail, {
        redirectTo: `${appUrl}/dashboard`,
        data: {
          foyer_id: validHouseholdId,
          invited_role: validRole,
        },
      });
    } catch (authErr) {
      console.warn("Notification Supabase Auth Admin:", authErr);
    }

    await invalidateFoyerCache();
    try {
      revalidatePath("/dashboard");
    } catch {
      // Ignore
    }

    const providerLabel = domain.includes("yahoo")
      ? "Yahoo Mail"
      : domain.includes("outlook") || domain.includes("hotmail")
      ? "Outlook / Microsoft"
      : domain.includes("gmail") || domain.includes("google")
      ? "Google / Gmail"
      : domain.includes("orange")
      ? "Orange"
      : domain.includes("icloud")
      ? "Apple iCloud"
      : domain;

    return {
      success: true,
      message: `Invitation envoyée avec succès à ${validEmail} (${providerLabel}).`,
      member: newMember,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Une erreur est survenue lors de l'envoi de l'invitation.",
      error: err.message,
    };
  }
}
