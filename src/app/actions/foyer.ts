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

const DEFAULT_VEHICLES_SEED: any[] = [
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
    kilometrage_actuel: 58400,
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
        nom_fichier: "facture_revision_45000.pdf",
        storage_path: "factures/espace_45k.pdf",
        file_type: "facture",
        date_document: "2025-09-14",
        kilometrage_document: 45200,
        emetteur: "Garage Renault des Lilas",
        montant_ttc: 345.5,
        statut_ocr: "traite",
        created_at: "2025-09-14T10:00:00Z",
        updated_at: "2025-09-14T10:00:00Z",
      },
    ],
    lignes_interventions: [
      {
        id: "int-1",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "22222222-2222-2222-2222-222222222222",
        document_source_id: "44444444-4444-4444-4444-444444444444",
        date_intervention: "2025-09-14",
        kilometrage_intervention: 45200,
        categorie: "revision_generale",
        operation: "Forfait Révision A + B",
        description: "Vidange huile RN17 FE 0W20 + filtre huile + filtre habitacle",
        prix_total_ttc: 245.0,
        created_at: "2025-09-14T10:00:00Z",
      },
      {
        id: "int-2",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "22222222-2222-2222-2222-222222222222",
        document_source_id: "44444444-4444-4444-4444-444444444444",
        date_intervention: "2025-09-14",
        kilometrage_intervention: 45200,
        categorie: "freinage",
        operation: "Liquide de frein",
        description: "Purge & remplacement liquide de frein DOT4 ISO Classe 6",
        prix_total_ttc: 65.0,
        created_at: "2025-09-14T10:00:00Z",
      },
    ],
    echeances_previsionnelles: [
      {
        id: "ech-1",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "22222222-2222-2222-2222-222222222222",
        type_echeance: "revision",
        libelle: "Révision des 60 000 km & Filtres",
        description: "Vidange huile synthèse RN17 FE 0W20, remplacement filtre à huile, filtre habitacle et bougies d'allumage.",
        date_preconisee: "2027-08-23",
        km_preconise: 60000,
        date_limite: "2027-09-14",
        km_limite: 62000,
        statut: "a_venir",
        criticite: "moyenne",
        cout_estime_min: 260.0,
        cout_estime_max: 340.0,
        source_recommandation: "constructeur",
        created_at: "2026-08-20T10:00:00Z",
      },
      {
        id: "ech-2",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "22222222-2222-2222-2222-222222222222",
        type_echeance: "distribution",
        libelle: "Contrôle Courroie d'Accessoires",
        description: "Contrôle tension et état de la courroie d'accessoires et galets.",
        date_preconisee: "2027-08-23",
        km_preconise: 60000,
        date_limite: "2027-09-14",
        km_limite: 62000,
        statut: "a_venir",
        criticite: "moyenne",
        cout_estime_min: 90.0,
        cout_estime_max: 140.0,
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
        recommandations: ["Prochaine visite préconisée le 23 août 2027"],
        anomalies_detectees: [],
        date_audit: "2026-08-25T10:00:00Z",
        audit_par: "ia_vigie",
      },
    ],
  },
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
    kilometrage_actuel: 58400,
    date_releve_kilometrage: "2026-08-25",
    energie: "essence",
    boite_vitesse: "manuelle",
    usage_type: "secondaire",
    km_annuel_moyen: 11000,
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
        libelle: "Entretien Annuel Suzuki & Vidange",
        description: "Vidange moteur 5W30 C2, filtre à huile et contrôles de sécurité 4x4 AllGrip.",
        date_preconisee: "2027-06-15",
        km_preconise: 65000,
        date_limite: "2027-07-01",
        km_limite: 68000,
        statut: "a_venir",
        criticite: "moyenne",
        cout_estime_min: 190.0,
        cout_estime_max: 250.0,
        source_recommandation: "constructeur",
        created_at: "2026-08-20T10:00:00Z",
      },
    ],
    audits_conformite: [
      {
        id: "aud-2",
        foyer_id: DEFAULT_FOYER_ID,
        vehicule_id: "33333333-3333-3333-3333-333333333333",
        score_sante: 94,
        statut_ct_conforme: true,
        historique_complet: true,
        alertes_actives: 0,
        resume_synthetique: "Véhicule fiable en parfait état. Suivi préventif exemplaire.",
        recommandations: [],
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

export async function getFoyerOverviewAction(): Promise<FoyerOverviewResult> {
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

  try {
    const adminSupabase = createAdminClient();

    // 1. Récupérer ou insérer le foyer
    const { data: dbFoyer } = await (adminSupabase as any)
      .from("foyers")
      .select("*")
      .limit(1)
      .maybeSingle();

    // 2. Récupérer les véhicules
    const { data: dbVehicles, error: vehErr } = await (adminSupabase as any)
      .from("vehicules")
      .select(`
        *,
        documents_sources (*),
        lignes_interventions (*),
        defaillances_ct (*),
        echeances_previsionnelles (*),
        audits_conformite (*)
      `)
      .order("created_at", { ascending: true });

    if (!vehErr && dbVehicles && dbVehicles.length > 0) {
      return {
        foyer: (dbFoyer || defaultFoyer) as Foyer,
        role: "owner",
        vehicles: dbVehicles as EnrichedVehicle[],
        members: defaultMembers as FoyerMember[],
      };
    }

    // 3. Si la base est encore vierge, persister la flotte du foyer automatiquement
    try {
      await (adminSupabase as any).from("foyers").upsert(defaultFoyer);
      for (const v of DEFAULT_VEHICLES_SEED) {
        const { documents_sources, lignes_interventions, echeances_previsionnelles, audits_conformite, ...vehData } = v;
        await (adminSupabase as any).from("vehicules").upsert(vehData);
      }
    } catch {
      // Ignore background seeding errors
    }

    return {
      foyer: defaultFoyer as Foyer,
      role: "owner",
      vehicles: DEFAULT_VEHICLES_SEED as EnrichedVehicle[],
      members: defaultMembers as FoyerMember[],
    };
  } catch {
    return {
      foyer: defaultFoyer as Foyer,
      role: "owner",
      vehicles: DEFAULT_VEHICLES_SEED as EnrichedVehicle[],
      members: defaultMembers as FoyerMember[],
    };
  }
}
