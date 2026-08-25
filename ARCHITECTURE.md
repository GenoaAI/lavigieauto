# 🏗️ Architecture Technique — LaVigieAuto

Ce document détaille les choix d'architecture, le modèle de données relationnel, le pipeline d'ingestion multimodale par IA et les algorithmes de projection prédictive de LaVigieAuto.

---

## 1. Vue d'Ensemble des Flux

```mermaid
graph TD
    User([Conducteur / Utilisateur]) -->|Dépose Carte Grise / Facture / CT| Dropzone[Zone de Scan Multimodale]
    Dropzone --> Action[Server Action: processDocumentAction]
    
    Action --> GeminiPool[Pool Gemini avec Failover Automatique]
    GeminiPool -->|Extrait JSON Structuré| ZodSchemas[Validation Schémas Zod Bilingues]
    
    ZodSchemas --> Action
    Action -->|Update Données Véhicule| DB_Vehicules[(Table vehicules)]
    Action -->|Enregistre Justificatif| DB_Docs[(Table documents_sources)]
    Action -->|Enregistre Prestations| DB_Interventions[(Table lignes_interventions)]
    Action -->|Enregistre Défaillances| DB_Defaillances[(Table defaillances_ct)]
    
    Action --> EngineCycles[Moteur Cycles & Télémétrie]
    EngineCycles -->|Extrapole Rythme KM & Délais| DB_Echeances[(Table echeances_previsionnelles)]
    
    DB_Vehicules --> Dashboard[Tableau de bord Foyer]
    DB_Echeances --> KitRDV[Geste 1: Kit Prêt-à-Réserver]
    DB_Interventions --> PublicCert[Certificat Public Revente]
```

---

## 2. Modèle de Données Supabase (PostgreSQL)

Le modèle relationnel est structuré autour du concept de **Foyer multi-véhicules** :

```mermaid
erDiagram
    FOYERS ||--o{ FOYER_MEMBERS : "contient"
    FOYERS ||--o{ VEHICULES : "possede"
    VEHICULES ||--o{ DOCUMENTS_SOURCES : "recoit"
    VEHICULES ||--o{ LIGNES_INTERVENTIONS : "historise"
    VEHICULES ||--o{ DEFAILLANCES_CT : "enregistre"
    VEHICULES ||--o{ ECHEANCES_PREVISIONNELLES : "planifie"
    VEHICULES ||--o{ AUDITS_CONFORMITE : "evalue"

    VEHICULES {
        uuid id PK
        uuid foyer_id FK
        string immatriculation
        string vin
        string marque
        string modele
        string version
        int annee_mise_en_circulation
        date date_premiere_immatriculation
        int kilometrage_actuel
        date date_releve_kilometrage
        string energie
        int puissance_fiscale
        int km_annuel_moyen
    }

    DOCUMENTS_SOURCES {
        uuid id PK
        uuid vehicule_id FK
        string nom_fichier
        string file_type "facture | controle_technique | carte_grise"
        date date_document
        int kilometrage_document
        string emetteur
        decimal montant_ttc
        jsonb ocr_structured_data
    }

    LIGNES_INTERVENTIONS {
        uuid id PK
        uuid vehicule_id FK
        uuid document_source_id FK
        string categorie "moteur | freinage | pneumatiques | distribution | etc."
        string operation
        decimal prix_total_ttc
        date date_intervention
        int kilometrage_intervention
        string emetteur
    }

    DEFAILLANCES_CT {
        uuid id PK
        uuid vehicule_id FK
        string code_defaillance
        string libelle
        string niveau_gravite "mineure | majeure | critique"
        date date_ct
        jsonb metadata "vulgarisation IA, cout estime"
    }

    ECHEANCES_PREVISIONNELLES {
        uuid id PK
        uuid vehicule_id FK
        string type_echeance
        string libelle
        date date_preconisee
        int km_preconise
        string criticite "faible | moyenne | elevee | critique"
        string statut "a_venir | effectue | en_retard"
    }
```

---

## 3. Pipeline d'Ingestion & Résilience IA Multi-Modèles

### A. Tolérance Bilingue & Normalisation des Données
Le système accepte nativement les formats hétérogènes générés par les logiciels de garages français et les codes d'immatriculation :
* **Cartes Grises françaises SIV/FNI** : Clés officielles reconnues (`A`, `B`, `D.1`, `D.2`, `D.3`, `E`, `P.3`, `P.6`, `K`, `V.7`) et mappées sur `licensePlate`, `vin`, `firstRegistrationDate`, etc.
* **Factures d'ateliers** : Support des variantes `prestations[]`, `operations[]`, `lignes_facture[]` et `lineItems[]`.
* **PV de Contrôle Technique** : Support des listes `defects[]` et des sous-groupes `defaillances.mineures / majeures / critiques`.

### B. Failover Automatique (Anti-Quota 429)
Pour éviter tout blocage lié aux quotas de l'API Google Gemini, `GeminiLLMProvider` utilise un pool ordonné de modèles réactifs :
1. `gemini-3.5-flash` (Principal haute performance)
2. `gemini-flash-latest` (Fallback 1)
3. `gemini-3.5-flash-lite` (Fallback 2 léger)
4. `gemini-3.7-flash` (Fallback 3)

Si un modèle renvoie une erreur `HTTP 429` (Quota dépassé), `HTTP 404` ou un timeout, le fournisseur bascule automatiquement et de manière transparente sur le modèle suivant.

---

## 4. Algorithmes Prédictifs

### A. Calcul Dynamique du Rythme Kilométrique (`cycles.ts`)
* **Multi-Factures (2+ relevés)** : Calcul exact du delta de kilomètres divisé par le delta de jours entre chaque passage en atelier certifié.
* **Mono-Relevé (1 document ou CT)** : Extrapolation précise calculée depuis la date de 1ère mise en circulation du véhicule (`date_premiere_immatriculation`) jusqu'à la date du relevé.
* **Projection à date** : Calcul en temps réel du kilométrage estimé du jour :  
  $$\text{Kilométrage Estimé} = \text{Dernier Relevé} + (\text{Jours écoulés} \times \text{Rythme journalier})$$

### B. Planification au 1er Terme Échu
Chaque échéance constructeur est projetée sur un axe bidirectionnel (Kilomètres vs Temps) :
* L'échéance se déclenche dès que le premier des deux seuils est atteint ($\min(\text{Date cible par km}, \text{Date cible par temps})$).

---

## 5. Coffre-fort Documentaire (`vehicle-vault`)

Le stockage physique des justificatifs numérisés (factures, contrôles techniques, cartes grises) est entièrement découplé et sécurisé :

### A. Configuration Centralisée (`config/storage.config.ts`)
* **Bucket Privé** : `vehicle-vault` (taille max : 15 Mo, formats : PDF, JPEG, PNG, WEBP, HEIC).
* **Nomenclature Déterministe** :
  $$\{user\_id\}/\{vehicle\_id\}/\{folder\}/\{date\}\_\{immat\}\_\{type\}\_\{km\}km\_\{entity\}.\{ext\}$$
  *Exemple :* `user-123/veh-456/invoices/2026-08-21_EC-301-JX_invoice_125789km_garage-heliere.pdf`

### B. Sécurité & Politiques RLS (Row-Level Security)
* Les utilisateurs accèdent exclusivement à leur propre dossier utilisateur (`storage.foldername(name)[1] = auth.uid()`).
* La prévisualisation et le téléchargement s'effectuent via **URLs signées temporaires** (durée : 1 heure) générées à la demande sans jamais exposer le bucket en accès public.
* Les acheteurs potentiels peuvent consulter les justificatifs scellés directement depuis le Passeport / Certificat Public de Revente (`/v/[public_token]`).
