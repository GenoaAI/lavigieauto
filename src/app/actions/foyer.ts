"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Foyer, FoyerMember, Garage } from "@/lib/types/database.types";
import { EnrichedVehicle } from "./vehicles";
import { DEFAULT_FOYER_ID, DEFAULT_VEHICLES_SEED, DEFAULT_GARAGES_SEED } from "@/config/foyer.seed";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { updateHouseholdNameSchema } from "@/lib/security/schemas";

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
    const cEmail = cookieStore.get("gcal_user_email")?.value;
    const cName = cookieStore.get("gcal_user_name")?.value;
    const cPic = cookieStore.get("gcal_user_picture")?.value;
    if (cEmail) userEmail = cEmail.trim();
    if (cName) userName = cName.trim();
    if (cPic) userPicture = cPic.trim();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      if (user.email) userEmail = user.email.trim();
      if (user.user_metadata?.full_name) userName = user.user_metadata.full_name;
      if (user.user_metadata?.avatar_url) userPicture = user.user_metadata.avatar_url;
    }
  } catch {
    // Safe fallback
  }

  // Par défaut, si aucun utilisateur connecté, on utilise le compte principal de démonstration
  if (!userEmail) {
    userEmail = "charlesdeforges@gmail.com";
    userName = "Charles de Forges";
  }

  const isCharlesDeForges = userEmail.toLowerCase() === "charlesdeforges@gmail.com";

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

      // Si enregistré en base de données comme archivé/suspendu
      if (
        v.statut === "suspendu" ||
        v.statut === "archive" ||
        (v.metadata as any)?.tracking_status === "suspendu" ||
        (v.metadata as any)?.tracking_paused === true
      ) {
        return {
          ...v,
          statut: "suspendu",
          metadata: {
            ...((v.metadata as any) || {}),
            tracking_status: "suspendu",
            tracking_paused: true,
          },
        };
      }

      return v;
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

  // Vérifier si un cache récent existe pour cet utilisateur
  const cacheKey = `${userEmail.toLowerCase()}_${cookieStore?.get("gcal_access_token")?.value ? "gcal" : "nogcal"}`;
  const now = Date.now();
  if (memoryCache && memoryCache.key === cacheKey && (now - memoryCache.timestamp) < MEMORY_CACHE_TTL_MS) {
    return {
      ...memoryCache.data,
      foyer: applyFoyerOverrides(memoryCache.data.foyer),
      vehicles: applyTrackingOverrides(memoryCache.data.vehicles),
    };
  }

  // 1. CAS DU FOYER PRINCIPAL CHARLES DE FORGES
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
        user_id: userId || "user-charles-1",
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

      const fetchedVehicles: EnrichedVehicle[] = rawVehicles.length > 0
        ? rawVehicles.map((v) => ({
            ...v,
            documents_sources: allDocs.filter((d) => d.vehicule_id === v.id),
            lignes_interventions: allLines.filter((l) => l.vehicule_id === v.id),
            defaillances_ct: allDefs.filter((d) => d.vehicule_id === v.id),
            echeances_previsionnelles: allEchs.filter((e) => e.vehicule_id === v.id),
            audits_conformite: allAudits.filter((a) => a.vehicule_id === v.id),
          }))
        : (DEFAULT_VEHICLES_SEED as EnrichedVehicle[]);

      const fetchedGarages = garagesRes?.data && garagesRes.data.length > 0 ? (garagesRes.data as Garage[]) : (DEFAULT_GARAGES_SEED as Garage[]);

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
        vehicles: DEFAULT_VEHICLES_SEED,
        members: defaultMembers,
        garages: DEFAULT_GARAGES_SEED as Garage[],
      };
      memoryCache = {
        key: cacheKey,
        data: fallbackResult,
        timestamp: Date.now(),
      };
      return {
        ...fallbackResult,
        foyer: applyFoyerOverrides(fallbackResult.foyer),
        vehicles: applyTrackingOverrides(DEFAULT_VEHICLES_SEED),
      };
    }
  }

  // 2. CAS D'UN NOUVEL UTILISATEUR DISTINCT (EX: caldf.web@gmail.com) -> RÈGLE STRICTE ZÉRO FAKE DATA
  const userFoyerNom = `Foyer ${userName || userEmail.split("@")[0]}`;
  const customFoyerId = `foyer-${userId || userEmail.replace(/[^a-zA-Z0-9]/g, "-")}`;

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
      calendar_synced: Boolean(cookieStore?.get("gcal_access_token")?.value),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const customMembers: FoyerMember[] = [
    {
      id: `mem-${userId || userEmail.replace(/[^a-zA-Z0-9]/g, "-")}`,
      foyer_id: customFoyerId,
      user_id: userId || `user-${userEmail.replace(/[^a-zA-Z0-9]/g, "-")}`,
      role: "owner",
      metadata: {
        name: userName || userEmail.split("@")[0],
        email: userEmail,
        picture: userPicture,
        google_calendar_connected: Boolean(cookieStore?.get("gcal_access_token")?.value),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  try {
    const adminSupabase = createAdminClient();
    const { data: allFoyers } = await (adminSupabase as any)
      .from("foyers")
      .select("*");

    const matchedFoyer = (allFoyers || []).find(
      (f: any) =>
        (f.metadata as any)?.user_email?.toLowerCase() === userEmail.toLowerCase() ||
        f.id === customFoyerId
    );

    if (matchedFoyer) {
      const [vehRes, docsRes, linesRes, defsRes, echsRes, auditsRes, garagesRes] = await Promise.all([
        (adminSupabase as any).from("vehicules").select("*").eq("foyer_id", matchedFoyer.id).order("created_at", { ascending: true }),
        (adminSupabase as any).from("documents_sources").select("*").eq("foyer_id", matchedFoyer.id).order("date_document", { ascending: false }),
        (adminSupabase as any).from("lignes_interventions").select("*").eq("foyer_id", matchedFoyer.id).order("date_intervention", { ascending: false }),
        (adminSupabase as any).from("defaillances_ct").select("*").eq("foyer_id", matchedFoyer.id),
        (adminSupabase as any).from("echeances_previsionnelles").select("*").eq("foyer_id", matchedFoyer.id),
        (adminSupabase as any).from("audits_conformite").select("*").eq("foyer_id", matchedFoyer.id),
        (adminSupabase as any).from("garages").select("*").eq("foyer_id", matchedFoyer.id).order("nom", { ascending: true }),
      ]);

      const rawVehicles = (vehRes?.data || []) as any[];
      const allDocs = (docsRes?.data || []) as any[];
      const allLines = (linesRes?.data || []) as any[];
      const allDefs = (defsRes?.data || []) as any[];
      const allEchs = (echsRes?.data || []) as any[];
      const allAudits = (auditsRes?.data || []) as any[];

      const fetchedVehicles: EnrichedVehicle[] = rawVehicles.map((v) => ({
        ...v,
        documents_sources: allDocs.filter((d) => d.vehicule_id === v.id),
        lignes_interventions: allLines.filter((l) => l.vehicule_id === v.id),
        defaillances_ct: allDefs.filter((d) => d.vehicule_id === v.id),
        echeances_previsionnelles: allEchs.filter((e) => e.vehicule_id === v.id),
        audits_conformite: allAudits.filter((a) => a.vehicule_id === v.id),
      }));

      const customResult: FoyerOverviewResult = {
        foyer: matchedFoyer as Foyer,
        role: "owner",
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

    // Aucun véhicule enregistré pour ce nouvel utilisateur -> STRICTEMENT []
    return {
      foyer: applyFoyerOverrides(customFoyer),
      role: "owner",
      vehicles: [],
      members: customMembers,
      garages: [],
    };
  } catch {
    // En cas d'erreur de connexion base, état vide authentique (Zéro Fake Data)
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
 * Server Action pour mettre à jour le nom d'un foyer / ménage
 */
export async function updateHouseholdNameAction(
  householdId: string,
  newName: string
): Promise<{ success: boolean; nom?: string; error?: string }> {
  try {
    const parseResult = updateHouseholdNameSchema.safeParse({
      householdId,
      newName,
    });

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || "Nom de foyer invalide.";
      return { success: false, error: firstError };
    }

    const { householdId: validId, newName: sanitizedName } = parseResult.data;

    // 1. Mettre à jour en base de données Supabase si possible
    try {
      const adminSupabase = createAdminClient();
      await (adminSupabase as any)
        .from("foyers")
        .update({
          nom: sanitizedName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", validId);
    } catch (dbErr) {
      console.warn("Mise à jour base Supabase foyer (fallback cookie activé):", dbErr);
    }

    // 2. Persister dans les cookies pour reflet immédiat
    try {
      const cookieStore = await cookies();
      cookieStore.set(`foyer_name_override_${validId}`, sanitizedName, {
        maxAge: 365 * 24 * 3600,
        path: "/",
        sameSite: "lax",
      });
      cookieStore.set("foyer_name_override", sanitizedName, {
        maxAge: 365 * 24 * 3600,
        path: "/",
        sameSite: "lax",
      });
    } catch {
      // Safe fallback
    }

    // 3. Invalider le cache mémoire et revalider les chemins Next.js
    await invalidateFoyerCache();
    try {
      revalidatePath("/");
      revalidatePath("/dashboard");
    } catch {
      // Fallback lorsque exécuté hors du request store Next.js (tests unitaires)
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
