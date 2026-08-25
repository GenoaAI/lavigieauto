"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { Foyer, FoyerMember } from "@/lib/types/database.types";
import { EnrichedVehicle } from "./vehicles";
import { DEFAULT_FOYER_ID, DEFAULT_VEHICLES_SEED } from "@/config/foyer.seed";
import { cookies } from "next/headers";

export interface FoyerOverviewResult {
  foyer: Foyer | null;
  role: string;
  vehicles: EnrichedVehicle[];
  members: FoyerMember[];
}

// Global In-Memory Fast Cache
let memoryCacheResult: FoyerOverviewResult | null = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

export async function getFoyerOverviewAction(): Promise<FoyerOverviewResult> {
  const now = Date.now();
  let userEmail = "charlesdeforges@gmail.com";
  let userName = "Charles de Forges";
  let userPicture: string | undefined = undefined;

  try {
    const cookieStore = await cookies();
    const cEmail = cookieStore.get("gcal_user_email")?.value;
    const cName = cookieStore.get("gcal_user_name")?.value;
    const cPic = cookieStore.get("gcal_user_picture")?.value;
    if (cEmail) userEmail = cEmail;
    if (cName) userName = cName;
    if (cPic) userPicture = cPic;
  } catch {
    // Safe fallback when cookies are unavailable
  }

  const defaultFoyer: Foyer = {
    id: DEFAULT_FOYER_ID,
    nom: `Foyer ${userName}`,
    description: "Flotte automobile familiale LaVigieAuto",
    metadata: {
      user_email: userEmail,
      owner_name: userName,
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
      user_id: "user-charles-1",
      role: "owner",
      metadata: {
        name: userName,
        email: userEmail,
        picture: userPicture,
        google_calendar_connected: true,
      },
      created_at: "2026-08-20T10:00:00Z",
      updated_at: "2026-08-20T10:00:00Z",
    },
  ];

  // Return from in-memory cache if fresh (< 30s)
  if (memoryCacheResult && now - lastCacheTimestamp < CACHE_TTL_MS) {
    return memoryCacheResult;
  }

  // Fast resolution: default result ready immediately in 0ms
  const fallbackResult: FoyerOverviewResult = {
    foyer: defaultFoyer,
    role: "owner",
    vehicles: DEFAULT_VEHICLES_SEED,
    members: defaultMembers,
  };

  try {
    const adminSupabase = createAdminClient();

    // Query DB with a 600ms fast timeout to prevent Vercel slow cold-starts
    const dbQueryPromise = Promise.all([
      (adminSupabase as any).from("foyers").select("*").limit(1).maybeSingle(),
      (adminSupabase as any).from("vehicules").select(`
        *,
        documents_sources (*),
        lignes_interventions (*),
        defaillances_ct (*),
        echeances_previsionnelles (*),
        audits_conformite (*)
      `).order("created_at", { ascending: true }),
    ]);

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 600));

    const raceResult: any = await Promise.race([dbQueryPromise, timeoutPromise]);

    if (raceResult && Array.isArray(raceResult)) {
      const [foyerRes, vehRes] = raceResult;
      if (!vehRes.error && vehRes.data && vehRes.data.length > 0) {
        const liveResult: FoyerOverviewResult = {
          foyer: (foyerRes.data || defaultFoyer) as Foyer,
          role: "owner",
          vehicles: vehRes.data as EnrichedVehicle[],
          members: defaultMembers as FoyerMember[],
        };
        memoryCacheResult = liveResult;
        lastCacheTimestamp = now;
        return liveResult;
      }
    }

    memoryCacheResult = fallbackResult;
    lastCacheTimestamp = now;
    return fallbackResult;
  } catch {
    memoryCacheResult = fallbackResult;
    lastCacheTimestamp = now;
    return fallbackResult;
  }
}
