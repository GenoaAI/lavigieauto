"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Foyer, FoyerMember } from "@/lib/types/database.types";
import { EnrichedVehicle } from "./vehicles";
import { cookies } from "next/headers";

export interface FoyerOverviewResult {
  foyer: Foyer | null;
  role: string;
  vehicles: EnrichedVehicle[];
  members: FoyerMember[];
}

const DEFAULT_FOYER_ID = "11111111-1111-1111-1111-111111111111";

export const DEFAULT_VEHICLES_SEED: any[] = [
  {
    id: "33333333-3333-3333-3333-333333333333",
    foyer_id: DEFAULT_FOYER_ID,
    immatriculation: "EC-301-JX",
    vin: "TSMAYA21S00123456",
    marque: "Suzuki",
    modele: "Vitara",
    version: "1.6 VVT 120ch AllGrip Pack",
    annee_mise_en_circulation: 2016,
    date_premiere_immatriculation: "2016-06-15",
    kilometrage_actuel: 125789,
    date_releve_kilometrage: "2026-08-25",
    energie: "essence",
    boite_vitesse: "manuelle",
    usage_type: "quotidien",
    km_annuel_moyen: 15000,
    statut: "actif",
    metadata: {
      image_url: "/images/vehicles/suzuki-vitara-2016.jpg",
      tracking_status: "actif",
    },
    created_at: "2026-08-20T10:00:00Z",
    updated_at: "2026-08-25T10:00:00Z",
    echeances_previsionnelles: [
      {
        id: "ech-vit-1",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "33333333-3333-3333-3333-333333333333",
        type_echeance: "revision",
        libelle: "Vidange moteur 0W20 & Filtre à huile",
        description: "Vidange moteur synthèse 0W20, remplacement filtre à huile. Terme échu dépassé.",
        date_preconisee: "2026-08-22",
        km_preconise: 125789,
        date_limite: "2026-08-22",
        km_limite: 125789,
        statut: "en_retard",
        criticite: "haute",
        cout_estime_min: 140.0,
        cout_estime_max: 180.0,
        source_recommandation: "constructeur",
        created_at: "2026-08-20T10:00:00Z",
      },
      {
        id: "ech-vit-2",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "33333333-3333-3333-3333-333333333333",
        type_echeance: "allumage",
        libelle: "Remplacement des 4 bougies d'allumage",
        description: "Bougies Iridium d'origine. Préconisation constructeur à 120 000 km dépassée (+5 789 km).",
        date_preconisee: "2024-05-24",
        km_preconise: 120000,
        date_limite: "2024-05-24",
        km_limite: 120000,
        statut: "en_retard",
        criticite: "haute",
        cout_estime_min: 120.0,
        cout_estime_max: 160.0,
        source_recommandation: "constructeur",
        created_at: "2026-08-20T10:00:00Z",
      },
      {
        id: "ech-vit-3",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "33333333-3333-3333-3333-333333333333",
        type_echeance: "distribution",
        libelle: "Courroie d'accessoires & Galets",
        description: "Remplacement préventif courroie d'accessoires préconisé à 120 000 km.",
        date_preconisee: "2022-05-24",
        km_preconise: 120000,
        date_limite: "2022-05-24",
        km_limite: 120000,
        statut: "en_retard",
        criticite: "haute",
        cout_estime_min: 160.0,
        cout_estime_max: 220.0,
        source_recommandation: "constructeur",
        created_at: "2026-08-20T10:00:00Z",
      },
    ],
    audits_conformite: [
      {
        id: "aud-2",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "33333333-3333-3333-3333-333333333333",
        score_sante: 68,
        statut_ct_conforme: true,
        historique_complet: false,
        alertes_actives: 3,
        resume_synthetique: "⚠️ URGENT : 3 opérations en retard sur le Suzuki Vitara (Vidange, Bougies et Courroie accessoires). Prise de RDV atelier requise.",
        recommandations: ["Appeler le garage avec le Pack d'Urgence LaVigieAuto"],
        anomalies_detectees: ["Vidange 0W20 dépassée", "Bougies dépassées de 5 789 km", "Courroie accessoires dépassée"],
        date_audit: "2026-08-25T10:00:00Z",
        audit_par: "ia_vigie",
      },
    ],
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    foyer_id: DEFAULT_FOYER_ID,
    immatriculation: "FX-563-KZ",
    vin: "VF1RFC00865912345",
    marque: "Renault",
    modele: "Espace V",
    version: "Initiale Paris 1.8 TCe 225 EDC",
    annee_mise_en_circulation: 2021,
    date_premiere_immatriculation: "2021-04-12",
    kilometrage_actuel: 272448,
    date_releve_kilometrage: "2026-08-25",
    energie: "essence",
    boite_vitesse: "automatique",
    usage_type: "quotidien",
    km_annuel_moyen: 15000,
    statut: "actif",
    metadata: {
      image_url: "/images/vehicles/renault-espace-noir-etoile-2021.jpg",
      tracking_status: "actif",
    },
    created_at: "2026-08-20T10:00:00Z",
    updated_at: "2026-08-25T10:00:00Z",
    documents_sources: [
      {
        id: "44444444-4444-4444-4444-444444444444",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "22222222-2222-2222-2222-222222222222",
        nom_fichier: "facture_revision_260000.pdf",
        storage_path: "factures/espace_260k.pdf",
        file_type: "facture",
        date_document: "2025-08-18",
        kilometrage_document: 260000,
        emetteur: "Garage Renault des Lilas",
        montant_ttc: 410.0,
        statut_ocr: "traite",
        created_at: "2025-08-18T10:00:00Z",
        updated_at: "2025-08-18T10:00:00Z",
      },
    ],
    lignes_interventions: [
      {
        id: "int-1",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "22222222-2222-2222-2222-222222222222",
        document_source_id: "44444444-4444-4444-4444-444444444444",
        date_intervention: "2025-08-18",
        kilometrage_intervention: 260000,
        categorie: "revision_generale",
        operation: "Forfait Révision A + B",
        description: "Vidange huile RN17 FE 0W20 + filtre huile + filtre habitacle",
        prix_total_ttc: 245.0,
        created_at: "2025-08-18T10:00:00Z",
      },
    ],
    echeances_previsionnelles: [
      {
        id: "ech-1",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "22222222-2222-2222-2222-222222222222",
        type_echeance: "freinage",
        libelle: "Plaquettes de frein avant & Contrôle disques",
        description: "Contrôle & remplacement plaquettes de frein avant.",
        date_preconisee: "2027-03-15",
        km_preconise: 280000,
        date_limite: "2027-04-01",
        km_limite: 282000,
        statut: "a_venir",
        criticite: "moyenne",
        cout_estime_min: 140.0,
        cout_estime_max: 190.0,
        source_recommandation: "constructeur",
        created_at: "2026-08-20T10:00:00Z",
      },
      {
        id: "ech-2",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "22222222-2222-2222-2222-222222222222",
        type_echeance: "admission",
        libelle: "Remplacement du filtre à air moteur",
        description: "Remplacement élément filtrant air moteur.",
        date_preconisee: "2027-03-15",
        km_preconise: 280000,
        date_limite: "2027-04-01",
        km_limite: 282000,
        statut: "a_venir",
        criticite: "faible",
        cout_estime_min: 45.0,
        cout_estime_max: 65.0,
        source_recommandation: "constructeur",
        created_at: "2026-08-20T10:00:00Z",
      },
      {
        id: "ech-3",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "22222222-2222-2222-2222-222222222222",
        type_echeance: "revision",
        libelle: "Révision des 292 000 km & Vidange",
        description: "Vidange huile moteur synthèse RN17 FE 0W20 et filtres.",
        date_preconisee: "2027-08-23",
        km_preconise: 292448,
        date_limite: "2027-09-14",
        km_limite: 295000,
        statut: "a_venir",
        criticite: "moyenne",
        cout_estime_min: 240.0,
        cout_estime_max: 310.0,
        source_recommandation: "constructeur",
        created_at: "2026-08-20T10:00:00Z",
      },
    ],
    audits_conformite: [
      {
        id: "aud-1",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "22222222-2222-2222-2222-222222222222",
        score_sante: 96,
        statut_ct_conforme: true,
        historique_complet: true,
        alertes_actives: 0,
        resume_synthetique: "Carnet constructeur officiel 100% à jour. Éligible au Passeport Revente Certifié Grade A+.",
        recommandations: ["Pack atelier groupé prévu le 15 mars 2027 (Plaquettes + Filtre air)"],
        anomalies_detectees: [],
        date_audit: "2026-08-25T10:00:00Z",
        audit_par: "ia_vigie",
      },
    ],
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    foyer_id: DEFAULT_FOYER_ID,
    immatriculation: "1981-SJ-59",
    vin: "J1M177NA012345",
    marque: "Jeep",
    modele: "Cherokee",
    version: "Chief SJ 5.9L V8 Quadra-Trac",
    annee_mise_en_circulation: 1981,
    date_premiere_immatriculation: "1981-03-20",
    kilometrage_actuel: 148000,
    date_releve_kilometrage: "2026-08-25",
    energie: "essence",
    boite_vitesse: "automatique",
    usage_type: "collection",
    km_annuel_moyen: 3000,
    statut: "archive",
    metadata: {
      image_url: "/images/vehicles/jeep-cherokee-1981.jpg",
      tracking_status: "suspendu",
      tracking_paused: true,
    },
    created_at: "2026-08-20T10:00:00Z",
    updated_at: "2026-08-25T10:00:00Z",
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    foyer_id: DEFAULT_FOYER_ID,
    immatriculation: "CJ-1982-US",
    vin: "1JCCC87A0CT123456",
    marque: "Jeep",
    modele: "CJ-7",
    version: "4.2L 6 en ligne Renegade",
    annee_mise_en_circulation: 1982,
    date_premiere_immatriculation: "1982-05-10",
    kilometrage_actuel: 89000,
    date_releve_kilometrage: "2026-08-25",
    energie: "essence",
    boite_vitesse: "manuelle",
    usage_type: "collection",
    km_annuel_moyen: 2500,
    statut: "actif",
    metadata: {
      image_url: "/images/vehicles/jeep-cj.jpg",
      tracking_status: "actif",
    },
    created_at: "2026-08-20T10:00:00Z",
    updated_at: "2026-08-25T10:00:00Z",
  },
];

// Global In-Memory Fast Cache
let memoryCacheResult: FoyerOverviewResult | null = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

export async function getFoyerOverviewAction(): Promise<FoyerOverviewResult> {
  const now = Date.now();
  const cookieStore = await cookies();
  const userEmail = cookieStore.get("gcal_user_email")?.value || "charlesdeforges@gmail.com";
  const userName = cookieStore.get("gcal_user_name")?.value || "Charles de Forges";
  const userPicture = cookieStore.get("gcal_user_picture")?.value;

  const defaultFoyer: any = {
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

  const defaultMembers: any[] = [
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
    },
  ];

  // Return from in-memory cache if fresh (< 30s)
  if (memoryCacheResult && now - lastCacheTimestamp < CACHE_TTL_MS) {
    return memoryCacheResult;
  }

  // Fast resolution: default result ready immediately in 0ms
  const fallbackResult: FoyerOverviewResult = {
    foyer: defaultFoyer as Foyer,
    role: "owner",
    vehicles: DEFAULT_VEHICLES_SEED as EnrichedVehicle[],
    members: defaultMembers as FoyerMember[],
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
