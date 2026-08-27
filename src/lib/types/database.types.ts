export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type FoyerRole = 'owner' | 'admin' | 'member';

export type EnergieType =
  | 'essence'
  | 'diesel'
  | 'hybride'
  | 'hybride_rechargeable'
  | 'electrique'
  | 'gpl'
  | 'ethanol_e85'
  | 'autre';

export type BoiteVitesseType =
  | 'manuelle'
  | 'automatique'
  | 'robotisee'
  | 'variation_continue';

export type UsageType =
  | 'quotidien'
  | 'secondaire'
  | 'professionnel'
  | 'loisir'
  | 'collection';

export type VehiculeStatut = 'actif' | 'vendu' | 'archive' | 'en_panne' | 'suspendu';

/**
 * Vérifie si le suivi d'un véhicule est suspendu / en pause
 */
export function isVehicleTrackingSuspended(v: any): boolean {
  if (!v) return false;
  return (
    v.statut === "suspendu" ||
    v.statut === "archive" ||
    v.metadata?.tracking_status === "suspendu" ||
    v.metadata?.tracking_paused === true
  );
}

/**
 * Résout un véhicule depuis une liste selon un identifiant (UUID ou immatriculation nettoyée/slug)
 */
export function resolveVehicleFromList<T extends { id?: string; immatriculation?: string | null }>(
  vehicles: T[],
  identifier: string
): T | null {
  if (!vehicles || vehicles.length === 0 || !identifier) return null;
  const rawQuery = decodeURIComponent(identifier || "").trim().toUpperCase();
  const cleanQuery = rawQuery.replace(/[\s-]/g, "");

  return (
    vehicles.find((v) => {
      const vId = (v.id || "").toUpperCase().trim();
      const vIdClean = vId.replace(/[\s-]/g, "");
      if (vId === rawQuery || vIdClean === cleanQuery) return true;
      if (v.immatriculation) {
        const vImm = v.immatriculation.trim().toUpperCase();
        const vClean = vImm.replace(/[\s-]/g, "");
        return vImm === rawQuery || vClean === cleanQuery;
      }
      return false;
    }) || null
  );
}

/**
 * Associe de façon résiliente un enregistrement enfant (facture, intervention, CT...)
 * à un véhicule, que la clé étrangère soit un UUID ou directement l'immatriculation.
 */
export function matchesVehicleId(
  recordVehiculeId: string | null | undefined,
  vehicle: { id?: string; immatriculation?: string | null }
): boolean {
  if (!recordVehiculeId || !vehicle) return false;
  const recRaw = recordVehiculeId.trim().toUpperCase();
  const recClean = recRaw.replace(/[\s-]/g, "");

  if (vehicle.id) {
    const vId = vehicle.id.trim().toUpperCase();
    const vIdClean = vId.replace(/[\s-]/g, "");
    if (recRaw === vId || recClean === vIdClean) return true;
  }

  if (vehicle.immatriculation) {
    const vPlate = vehicle.immatriculation.trim().toUpperCase();
    const vPlateClean = vPlate.replace(/[\s-]/g, "");
    if (recRaw === vPlate || recClean === vPlateClean) return true;
  }

  return false;
}

/**
 * Ajuste une date pour qu'elle tombe obligatoirement sur un jour ouvré (Lundi - Vendredi).
 * Les garages et centres de CT étant fermés le dimanche et le week-end,
 * toute échéance ou rendez-vous tombant un samedi ou dimanche est automatiquement décalé au lundi ouvré suivant.
 */
export function snapToBusinessDay(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDay(); // 0 = Dimanche, 6 = Samedi
  if (day === 0) {
    // Dimanche -> Lundi (+1 jour)
    d.setDate(d.getDate() + 1);
  } else if (day === 6) {
    // Samedi -> Lundi (+2 jours)
    d.setDate(d.getDate() + 2);
  }
  return d.toISOString().split("T")[0];
}

export type DocumentType =
  | 'facture'
  | 'controle_technique'
  | 'carte_grise'
  | 'devis'
  | 'carnet_entretien'
  | 'autre';

export type StatutOcr =
  | 'en_attente'
  | 'en_cours'
  | 'traite'
  | 'echec'
  | 'a_valider';

export type InterventionCategorie =
  | 'moteur'
  | 'freinage'
  | 'liaison_au_sol'
  | 'echappement'
  | 'distribution'
  | 'visibilite'
  | 'carrosserie'
  | 'pneumatiques'
  | 'electricite'
  | 'climatisation'
  | 'revision_generale'
  | 'transmission'
  | 'autre';

export type NiveauGraviteCT = 'mineure' | 'majeure' | 'critique';

export type StatutResolutionDefaillance =
  | 'a_traiter'
  | 'repare'
  | 'ignore'
  | 'en_cours';

export type ResultatCT =
  | 'favorable'
  | 'defavorable_majeure'
  | 'defavorable_critique';

export type TypeEcheance =
  | 'controle_technique'
  | 'contre_visite'
  | 'revision'
  | 'courroie_distribution'
  | 'courroie_accessoire'
  | 'liquide_frein'
  | 'liquide_refroidissement'
  | 'plaquettes_frein'
  | 'disques_frein'
  | 'pneumatiques'
  | 'bougies'
  | 'filtre_habitacle'
  | 'filtre_air'
  | 'filtre_carburant'
  | 'batterie'
  | 'assurance'
  | 'freinage'
  | 'admission'
  | 'allumage'
  | 'distribution'
  | 'autre';

export type CriticiteEcheance = 'faible' | 'moyenne' | 'haute' | 'elevee' | 'critique';

export type StatutEcheance = 'a_venir' | 'en_retard' | 'effectue' | 'ignore';

export type SourceRecommandation =
  | 'constructeur'
  | 'ia_prevision'
  | 'ct'
  | 'reglementaire'
  | 'utilisateur';

export interface Database {
  public: {
    Tables: {
      foyers: {
        Row: {
          id: string;
          nom: string;
          description: string | null;
          metadata?: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      foyer_members: {
        Row: {
          id: string;
          foyer_id: string;
          user_id: string;
          role: FoyerRole;
          metadata?: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          foyer_id: string;
          user_id: string;
          role?: FoyerRole;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          foyer_id?: string;
          user_id?: string;
          role?: FoyerRole;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'foyer_members_foyer_id_fkey';
            columns: ['foyer_id'];
            referencedRelation: 'foyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'foyer_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };

      vehicules: {
        Row: {
          id: string;
          foyer_id: string;
          immatriculation: string;
          vin: string | null;
          marque: string;
          modele: string;
          version: string | null;
          annee_mise_en_circulation: number | null;
          date_premiere_immatriculation: string | null;
          kilometrage_actuel: number;
          date_releve_kilometrage: string;
          energie: EnergieType | null;
          puissance_fiscale: number | null;
          puissance_din: number | null;
          critair: number | null;
          boite_vitesse: BoiteVitesseType | null;
          usage_type: UsageType;
          km_annuel_moyen: number;
          statut: VehiculeStatut;
          image_url: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          foyer_id: string;
          immatriculation: string;
          vin?: string | null;
          marque: string;
          modele: string;
          version?: string | null;
          annee_mise_en_circulation?: number | null;
          date_premiere_immatriculation?: string | null;
          kilometrage_actuel?: number;
          date_releve_kilometrage?: string;
          energie?: EnergieType | null;
          puissance_fiscale?: number | null;
          puissance_din?: number | null;
          critair?: number | null;
          boite_vitesse?: BoiteVitesseType | null;
          usage_type?: UsageType;
          km_annuel_moyen?: number;
          statut?: VehiculeStatut;
          image_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          foyer_id?: string;
          immatriculation?: string;
          vin?: string | null;
          marque?: string;
          modele?: string;
          version?: string | null;
          annee_mise_en_circulation?: number | null;
          date_premiere_immatriculation?: string | null;
          kilometrage_actuel?: number;
          date_releve_kilometrage?: string;
          energie?: EnergieType | null;
          puissance_fiscale?: number | null;
          puissance_din?: number | null;
          critair?: number | null;
          boite_vitesse?: BoiteVitesseType | null;
          usage_type?: UsageType;
          km_annuel_moyen?: number;
          statut?: VehiculeStatut;
          image_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicules_foyer_id_fkey';
            columns: ['foyer_id'];
            referencedRelation: 'foyers';
            referencedColumns: ['id'];
          }
        ];
      };

      garages: {
        Row: {
          id: string;
          foyer_id: string;
          nom: string;
          adresse: string | null;
          telephone: string | null;
          email: string | null;
          marque: string | null;
          siret: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          foyer_id: string;
          nom: string;
          adresse?: string | null;
          telephone?: string | null;
          email?: string | null;
          marque?: string | null;
          siret?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          foyer_id?: string;
          nom?: string;
          adresse?: string | null;
          telephone?: string | null;
          email?: string | null;
          marque?: string | null;
          siret?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'garages_foyer_id_fkey';
            columns: ['foyer_id'];
            referencedRelation: 'foyers';
            referencedColumns: ['id'];
          }
        ];
      };

      documents_sources: {
        Row: {
          id: string;
          foyer_id: string;
          vehicule_id: string | null;
          garage_id: string | null;
          nom_fichier: string;
          storage_path: string;
          file_type: DocumentType;
          mime_type: string | null;
          taille_octets: number | null;
          date_document: string | null;
          kilometrage_document: number | null;
          emetteur: string | null;
          montant_ht: number | null;
          tva: number | null;
          montant_ttc: number | null;
          statut_ocr: StatutOcr;
          ocr_raw_text: string | null;
          ocr_structured_data: Json;
          confidence_score: number | null;
          erreurs_ocr: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          foyer_id: string;
          vehicule_id?: string | null;
          garage_id?: string | null;
          nom_fichier: string;
          storage_path: string;
          file_type: DocumentType;
          mime_type?: string | null;
          taille_octets?: number | null;
          date_document?: string | null;
          kilometrage_document?: number | null;
          emetteur?: string | null;
          montant_ht?: number | null;
          tva?: number | null;
          montant_ttc?: number | null;
          statut_ocr?: StatutOcr;
          ocr_raw_text?: string | null;
          ocr_structured_data?: Json;
          confidence_score?: number | null;
          erreurs_ocr?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          foyer_id?: string;
          vehicule_id?: string | null;
          garage_id?: string | null;
          nom_fichier?: string;
          storage_path?: string;
          file_type?: DocumentType;
          mime_type?: string | null;
          taille_octets?: number | null;
          date_document?: string | null;
          kilometrage_document?: number | null;
          emetteur?: string | null;
          montant_ht?: number | null;
          tva?: number | null;
          montant_ttc?: number | null;
          statut_ocr?: StatutOcr;
          ocr_raw_text?: string | null;
          ocr_structured_data?: Json;
          confidence_score?: number | null;
          erreurs_ocr?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_sources_foyer_id_fkey';
            columns: ['foyer_id'];
            referencedRelation: 'foyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_sources_vehicule_id_fkey';
            columns: ['vehicule_id'];
            referencedRelation: 'vehicules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_sources_garage_id_fkey';
            columns: ['garage_id'];
            referencedRelation: 'garages';
            referencedColumns: ['id'];
          }
        ];
      };

      lignes_interventions: {
        Row: {
          id: string;
          foyer_id: string;
          vehicule_id: string;
          document_source_id: string | null;
          garage_id: string | null;
          categorie: InterventionCategorie;
          operation: string;
          description: string | null;
          quantite: number;
          prix_unitaire_ht: number | null;
          prix_total_ht: number | null;
          tva_taux: number | null;
          prix_total_ttc: number | null;
          reference_piece: string | null;
          date_intervention: string;
          kilometrage_intervention: number | null;
          garantie_mois: number | null;
          emetteur: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          foyer_id: string;
          vehicule_id: string;
          document_source_id?: string | null;
          garage_id?: string | null;
          categorie: InterventionCategorie;
          operation: string;
          description?: string | null;
          quantite?: number;
          prix_unitaire_ht?: number | null;
          prix_total_ht?: number | null;
          tva_taux?: number | null;
          prix_total_ttc?: number | null;
          reference_piece?: string | null;
          date_intervention: string;
          kilometrage_intervention?: number | null;
          garantie_mois?: number | null;
          emetteur?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          foyer_id?: string;
          vehicule_id?: string;
          document_source_id?: string | null;
          garage_id?: string | null;
          categorie: InterventionCategorie;
          operation?: string;
          description?: string | null;
          quantite?: number;
          prix_unitaire_ht?: number | null;
          prix_total_ht?: number | null;
          tva_taux?: number | null;
          prix_total_ttc?: number | null;
          reference_piece?: string | null;
          date_intervention?: string;
          kilometrage_intervention?: number | null;
          garantie_mois?: number | null;
          emetteur?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lignes_interventions_foyer_id_fkey';
            columns: ['foyer_id'];
            referencedRelation: 'foyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lignes_interventions_vehicule_id_fkey';
            columns: ['vehicule_id'];
            referencedRelation: 'vehicules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lignes_interventions_document_source_id_fkey';
            columns: ['document_source_id'];
            referencedRelation: 'documents_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lignes_interventions_garage_id_fkey';
            columns: ['garage_id'];
            referencedRelation: 'garages';
            referencedColumns: ['id'];
          }
        ];
      };

      defaillances_ct: {
        Row: {
          id: string;
          foyer_id: string;
          vehicule_id: string;
          document_source_id: string;
          code_defaillance: string | null;
          libelle: string;
          niveau_gravite: NiveauGraviteCT;
          localisation: string | null;
          statut_resolution: StatutResolutionDefaillance;
          ligne_intervention_resolution_id: string | null;
          date_ct: string;
          kilometrage_ct: number | null;
          resultat_ct: ResultatCT | null;
          date_limite_contre_visite: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          foyer_id: string;
          vehicule_id: string;
          document_source_id: string;
          code_defaillance?: string | null;
          libelle: string;
          niveau_gravite: NiveauGraviteCT;
          localisation?: string | null;
          statut_resolution?: StatutResolutionDefaillance;
          ligne_intervention_resolution_id?: string | null;
          date_ct: string;
          kilometrage_ct?: number | null;
          resultat_ct?: ResultatCT | null;
          date_limite_contre_visite?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          foyer_id?: string;
          vehicule_id?: string;
          document_source_id?: string;
          code_defaillance?: string | null;
          libelle?: string;
          niveau_gravite?: NiveauGraviteCT;
          localisation?: string | null;
          statut_resolution?: StatutResolutionDefaillance;
          ligne_intervention_resolution_id?: string | null;
          date_ct?: string;
          kilometrage_ct?: number | null;
          resultat_ct?: ResultatCT | null;
          date_limite_contre_visite?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'defaillances_ct_foyer_id_fkey';
            columns: ['foyer_id'];
            referencedRelation: 'foyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'defaillances_ct_vehicule_id_fkey';
            columns: ['vehicule_id'];
            referencedRelation: 'vehicules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'defaillances_ct_document_source_id_fkey';
            columns: ['document_source_id'];
            referencedRelation: 'documents_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'defaillances_ct_ligne_intervention_resolution_id_fkey';
            columns: ['ligne_intervention_resolution_id'];
            referencedRelation: 'lignes_interventions';
            referencedColumns: ['id'];
          }
        ];
      };

      echeances_previsionnelles: {
        Row: {
          id: string;
          foyer_id: string;
          vehicule_id: string;
          type_echeance: TypeEcheance;
          libelle: string;
          description: string | null;
          date_preconisee: string | null;
          km_preconise: number | null;
          date_limite: string | null;
          km_limite: number | null;
          criticite: CriticiteEcheance;
          statut: StatutEcheance;
          cout_estime_min: number | null;
          cout_estime_max: number | null;
          ligne_intervention_realisee_id: string | null;
          source_recommandation: SourceRecommandation;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          foyer_id: string;
          vehicule_id: string;
          type_echeance: TypeEcheance;
          libelle: string;
          description?: string | null;
          date_preconisee?: string | null;
          km_preconise?: number | null;
          date_limite?: string | null;
          km_limite?: number | null;
          criticite?: CriticiteEcheance;
          statut?: StatutEcheance;
          cout_estime_min?: number | null;
          cout_estime_max?: number | null;
          ligne_intervention_realisee_id?: string | null;
          source_recommandation?: SourceRecommandation;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          foyer_id?: string;
          vehicule_id?: string;
          type_echeance?: TypeEcheance;
          libelle?: string;
          description?: string | null;
          date_preconisee?: string | null;
          km_preconise?: number | null;
          date_limite?: string | null;
          km_limite?: number | null;
          criticite?: CriticiteEcheance;
          statut?: StatutEcheance;
          cout_estime_min?: number | null;
          cout_estime_max?: number | null;
          ligne_intervention_realisee_id?: string | null;
          source_recommandation?: SourceRecommandation;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'echeances_previsionnelles_foyer_id_fkey';
            columns: ['foyer_id'];
            referencedRelation: 'foyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'echeances_previsionnelles_vehicule_id_fkey';
            columns: ['vehicule_id'];
            referencedRelation: 'vehicules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'echeances_previsionnelles_ligne_intervention_realisee_id_fkey';
            columns: ['ligne_intervention_realisee_id'];
            referencedRelation: 'lignes_interventions';
            referencedColumns: ['id'];
          }
        ];
      };

      audits_conformite: {
        Row: {
          id: string;
          foyer_id: string;
          vehicule_id: string;
          score_sante: number;
          statut_ct_conforme: boolean;
          historique_complet: boolean;
          alertes_actives: number;
          resume_synthetique: string | null;
          recommandations: Json;
          anomalies_detectees: Json;
          date_audit: string;
          audit_par: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          foyer_id: string;
          vehicule_id: string;
          score_sante: number;
          statut_ct_conforme?: boolean;
          historique_complet?: boolean;
          alertes_actives?: number;
          resume_synthetique?: string | null;
          recommandations?: Json;
          anomalies_detectees?: Json;
          date_audit?: string;
          audit_par?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          foyer_id?: string;
          vehicule_id?: string;
          score_sante?: number;
          statut_ct_conforme?: boolean;
          historique_complet?: boolean;
          alertes_actives?: number;
          resume_synthetique?: string | null;
          recommandations?: Json;
          anomalies_detectees?: Json;
          date_audit?: string;
          audit_par?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audits_conformite_foyer_id_fkey';
            columns: ['foyer_id'];
            referencedRelation: 'foyers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audits_conformite_vehicule_id_fkey';
            columns: ['vehicule_id'];
            referencedRelation: 'vehicules';
            referencedColumns: ['id'];
          }
        ];
      };

      app_config: {
        Row: {
          id: string;
          key: string;
          value: Json;
          description: string | null;
          category: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          description?: string | null;
          category?: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          description?: string | null;
          category?: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_foyer_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      is_foyer_member: {
        Args: {
          lookup_foyer_id: string;
        };
        Returns: boolean;
      };
      is_foyer_admin: {
        Args: {
          lookup_foyer_id: string;
        };
        Returns: boolean;
      };
      is_foyer_owner: {
        Args: {
          lookup_foyer_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      foyer_role: FoyerRole;
      energie_type: EnergieType;
      boite_vitesse_type: BoiteVitesseType;
      usage_type: UsageType;
      vehicule_statut: VehiculeStatut;
      document_type: DocumentType;
      statut_ocr: StatutOcr;
      intervention_categorie: InterventionCategorie;
      niveau_gravite_ct: NiveauGraviteCT;
      statut_resolution_defaillance: StatutResolutionDefaillance;
      resultat_ct: ResultatCT;
      type_echeance: TypeEcheance;
      criticite_echeance: CriticiteEcheance;
      statut_echeance: StatutEcheance;
      source_recommandation: SourceRecommandation;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ============================================================================
// CONVENIENCE SHORTCUT TYPE ALIASES
// ============================================================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Foyer = Tables<'foyers'>;
export type FoyerMember = Tables<'foyer_members'>;
export type Vehicule = Tables<'vehicules'>;
export type Garage = Tables<'garages'>;
export type DocumentSource = Tables<'documents_sources'>;
export type LigneIntervention = Tables<'lignes_interventions'>;
export type DefaillanceCT = Tables<'defaillances_ct'>;
export type EcheancePrevisionnelle = Tables<'echeances_previsionnelles'>;
export type AuditConformite = Tables<'audits_conformite'>;
export type AppConfig = Tables<'app_config'>;

// ============================================================================
// CONFIGURATION PAYLOAD INTERFACES
// ============================================================================

export interface DelaisControleTechniqueConfig {
  premier_ct_mois: number;
  periodicite_ct_mois: number;
  delai_contre_visite_jours: number;
  delai_rappel_anticipation_jours: number;
  delai_rappel_urgent_jours: number;
  tolerance_depassement_jours: number;
  amende_forfaitaire_defaut_ct_euros: number;
}

export interface SeuilMaintenanceItem {
  km_intervalle: number;
  mois_intervalle: number;
  tolerance_km: number;
  cout_moyen_estime_min: number;
  cout_moyen_estime_max: number;
}

export type SeuilsMaintenanceConfig = Record<string, SeuilMaintenanceItem>;

export interface PalierTarifaire {
  vehicule_index: number;
  label: string;
  prix_ttc_mois: number;
  prix_ttc_an: number;
}

export interface PackTarifaire {
  code: string;
  label: string;
  prix_ttc_mois: number;
  prix_ttc_an: number;
  vehicules_max: number;
}

export interface TarificationDegressiveConfig {
  devise: string;
  essai_gratuit_jours: number;
  paliers_mensuels: PalierTarifaire[];
  packs_speciaux: PackTarifaire[];
  fonctionnalites_incluses: string[];
}

export interface CriteresScoreSanteConfig {
  poids_total: number;
  criteres: Record<string, { poids: number; description: string }>;
  penalites: Record<string, number>;
  seuils_etat: Record<
    string,
    { min: number; max: number; couleur: string }
  >;
}

export interface PromptsIaExtractionConfig {
  system_instruction_facture: string;
  system_instruction_ct: string;
  system_instruction_carte_grise: string;
}
