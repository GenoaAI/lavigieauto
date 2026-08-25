# 🚗 LaVigieAuto — La Vigie Automobile Intelligente

> **L'assistant prédictif d'entretien automobile pour tout le foyer familial.**  
> Fini les carnets d'entretien perdus, les pièces changées trop tôt ou les garanties constructeur sautées. LaVigieAuto synchronise tous vos véhicules, planifie les échéances au premier terme échu (temps vs kilomètres réels), modélise l'usure de vos pneumatiques, génère vos kits de réservation et certifie l'historique lors de la revente.

---

## 🌟 La Proposition de Valeur : Les 2 Gestes du Conducteur

LaVigieAuto repose sur un principe d'ergonomie **zéro charge mentale** :

1. **Geste 1 — Avant l'atelier : Le Kit Prêt-à-Réserver**
   * L'IA analyse les échéances officielles constructeur et la télémétrie kilométrique.
   * Génère instantanément un script téléphonique et un modèle d'email pré-rempli avec les références exactes (norme d'huile, pièces, défaillances de CT à corriger).
2. **Geste 2 — Après l'atelier : Le Scan Reconciliateur (Carte Grise / Facture / CT)**
   * Déposez la photo ou le PDF de votre justificatif (Carte Grise ANTS, Facture d'atelier ou PV de Contrôle Technique).
   * L'IA extrait les lignes de pièces, la main-d'œuvre et le kilométrage, clôture les échéances réalisées, met à jour le rythme de roulage et recalcule votre score de santé.

---

## 🚀 Modules & Moteurs d'Intelligence Métier

### 1. 🛞 Moteur Prédictif & Sécurité des Pneumatiques (`src/lib/engine/tires.ts`)
* **Découpage par essieu** : Suivi distinct du **Train Avant** (traction/direction : ~40 000 km) et du **Train Arrière** (stabilité : ~60 000 km).
* **Sculpture résiduelle en millimètres** : De **8.0 mm (neuf)** au **témoin légal d'usure 1.6 mm** *(zone d'alerte sécurité pluie à 3.0 mm)*.
* **Résolution automatique des montes homologuées** : Attribution dynamique des dimensions constructeur selon le modèle (*Clio III : 185/60 R15*, *Vitara : 215/55 R17*, *Espace V : 225/55 R18*).
* **Kit Devis Pneus 1 Clic** : Script téléphonique et commande immédiate.

### 2. 📈 Moteur de Télémétrie Kilométrique & Cycles (`src/lib/engine/cycles.ts`)
* Calcul dynamique du rythme journalier ($\text{km/jour}$) et annuel ($\text{km/an}$) à partir des dates et odomètres de factures.
* Projection prédictive des échéances kilométriques au premier terme échu (km vs temps).

### 3. 🛡️ Calculateur du Score de Conformité & Revente (`src/lib/engine/conformity-score.ts`)
* Audit automatique de conformité constructeur : Attribution d'une note sur 100% (**A+ Exemplaire**).
* Calcul du bonus de valeur à la revente certifiée (+10%).

### 4. 🗄️ Coffre-fort Numérique Décentralisé (`src/lib/storage/vault-service.ts`)
* Stockage chiffré des pièces justificatives sur Supabase Storage.
* Nomenclature prédictive normalisée : `AAAA-MM-JJ_IMMAT_TYPE_KM_GARAGE.pdf`.
* URLs signées sécurisées temporaires sans exposition de clés publiques.

### 5. 📑 Certificat Public de Revente Numérisé (`/v/[public_token]`)
* Page publique infalsifiable pour la revente entre particuliers.
* Export PDF haute définition avec feuille de style CSS d'impression A4.

---

## 🛠️ Stack Technique

* **Framework** : [Next.js 15 (App Router)](https://nextjs.org/) + React 19 + TypeScript (Mode Strict)
* **Styling & UI** : Tailwind CSS + Lucide Icons + Print CSS optimisé A4
* **Base de Données & Auth** : PostgreSQL hébergé sur [Supabase](https://supabase.com/)
* **Intelligence Artificielle** : [Google Gemini Flash](https://ai.google.dev/) avec pool de résilience et basculement automatique anti-quota
* **Validation de Données** : [Zod 3](https://zod.dev/) pour les schémas d'extraction et les types d'ingestion
* **Monétisation & Quotas** : [Stripe](https://stripe.com/) (Facturation dégressive multi-véhicules)

---

## 🧪 Tests & Vérification

Pour exécuter l'ensemble des 8 suites de tests d'intégration :
```bash
npm test
```

Pour vérifier l'intégrité du typage TypeScript :
```bash
npm run typecheck
```

---

## 📁 Structure du Projet

```
autocare/
├── src/
│   ├── app/                      # Routes Next.js App Router
│   │   ├── actions/              # Server Actions (documents, vehicles, foyer, vault)
│   │   ├── dashboard/            # Espace Foyer & Fiches Véhicules
│   │   ├── v/[public_token]/     # Certificat Public de Revente & Export PDF
│   │   ├── page.tsx              # Landing page avec zone de scan interactive
│   ├── components/               # Composants UI
│   │   ├── layout/               # Sidebar sticky & repliable (DashboardSidebar)
│   │   ├── scanner/              # Dropzone d'upload et analyse IA dynamique
│   │   ├── vehicles/             # TireWearTracker, ReservationKitModal
│   │   ├── vault/                # VehicleVaultList (Filtres, téléchargement)
│   │   └── certificate/          # Barre d'export PDF et partage
│   └── lib/
│       ├── ai/                   # Fournisseurs LLM, schémas Zod & Registre
│       ├── engine/               # 6 Moteurs métier (Tires, Cycles, Score, Kit, etc.)
│       ├── storage/              # Service de coffre-fort documentaire
│       └── types/                # Définitions TypeScript Supabase & Métier
└── tests/                        # 8 suites de tests automatisés
```
