"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Foyer, FoyerMember, Garage } from "@/lib/types/database.types";
import { EnrichedVehicle } from "./vehicles";
import { DEFAULT_FOYER_ID, DEFAULT_VEHICLES_SEED, DEFAULT_GARAGES_SEED } from "@/config/foyer.seed";
import { cookies } from "next/headers";

export interface FoyerOverviewResult {
  foyer: Foyer | null;
  role: string;
  vehicles: EnrichedVehicle[];
  members: FoyerMember[];
  garages: Garage[];
}

export async function invalidateFoyerCache(): Promise<void> {
  // Invalidation sans état global partagé
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
      const dbQueryPromise = Promise.all([
        (adminSupabase as any)
          .from("foyers")
          .select("*")
          .eq("id", DEFAULT_FOYER_ID)
          .maybeSingle(),
        (adminSupabase as any)
          .from("vehicules")
          .select(`
            *,
            documents_sources (*),
            lignes_interventions (*),
            defaillances_ct (*),
            echeances_previsionnelles (*),
            audits_conformite (*)
          `)
          .eq("foyer_id", DEFAULT_FOYER_ID)
          .order("created_at", { ascending: true }),
        (adminSupabase as any)
          .from("garages")
          .select("*")
          .eq("foyer_id", DEFAULT_FOYER_ID)
          .order("nom", { ascending: true }),
      ]);

      const [foyerRes, vehRes, garagesRes] = await dbQueryPromise;
      const fetchedGarages = garagesRes?.data && garagesRes.data.length > 0 ? (garagesRes.data as Garage[]) : (DEFAULT_GARAGES_SEED as Garage[]);
      const fetchedVehicles = vehRes?.data && vehRes.data.length > 0 ? (vehRes.data as EnrichedVehicle[]) : (DEFAULT_VEHICLES_SEED as EnrichedVehicle[]);

      return {
        foyer: (foyerRes?.data || defaultFoyer) as Foyer,
        role: "owner",
        vehicles: applyTrackingOverrides(fetchedVehicles),
        members: defaultMembers,
        garages: fetchedGarages,
      };
    } catch {
      return {
        foyer: defaultFoyer,
        role: "owner",
        vehicles: applyTrackingOverrides(DEFAULT_VEHICLES_SEED),
        members: defaultMembers,
        garages: DEFAULT_GARAGES_SEED as Garage[],
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
      user_id: userId || `user-${userEmail}`,
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
      const [vehRes, garagesRes] = await Promise.all([
        (adminSupabase as any)
          .from("vehicules")
          .select(`
            *,
            documents_sources (*),
            lignes_interventions (*),
            defaillances_ct (*),
            echeances_previsionnelles (*),
            audits_conformite (*)
          `)
          .eq("foyer_id", matchedFoyer.id)
          .order("created_at", { ascending: true }),
        (adminSupabase as any)
          .from("garages")
          .select("*")
          .eq("foyer_id", matchedFoyer.id)
          .order("nom", { ascending: true }),
      ]);

      return {
        foyer: matchedFoyer as Foyer,
        role: "owner",
        vehicles: applyTrackingOverrides((vehRes.data || []) as EnrichedVehicle[]),
        members: customMembers,
        garages: (garagesRes.data || []) as Garage[],
      };
    }

    // Aucun véhicule enregistré pour ce nouvel utilisateur -> STRICTEMENT []
    return {
      foyer: customFoyer,
      role: "owner",
      vehicles: [],
      members: customMembers,
      garages: [],
    };
  } catch {
    // En cas d'erreur de connexion base, état vide authentique (Zéro Fake Data)
    return {
      foyer: customFoyer,
      role: "owner",
      vehicles: [],
      members: customMembers,
      garages: [],
    };
  }
}
