# ⚙️ Référence des Moteurs de Calcul — `src/lib/engine/`

Ce guide documente les 5 moteurs métiers au cœur de LaVigieAuto.

---

## 1. Moteur des Cycles & Télémétrie Kilométrique (`cycles.ts`)

### Rôle
Calcule le rythme de roulage réel d'un véhicule à partir de l'historique des relevés d'ateliers et projette les échéances constructeur au 1er terme échu.

### Fonctions Clés

#### `calculateMileagePace(readings, refDateInput?, vehicleFirstRegistration?)`
* **Entrées** :
  * `readings: MileageReading[]` — Liste des relevés datés certifiés par factures ou CT.
  * `refDateInput?: Date | string` — Date de référence de calcul (par défaut : aujourd'hui).
  * `vehicleFirstRegistration?: string` — Date de 1ère mise en circulation.
* **Sortie** : `MileagePaceResult`
  * `dailyKmRate` : Nombre moyen de kilomètres par jour.
  * `annualMileageKm` : Rythme annuel projeté en km/an.
  * `lastRecordedMileage` : Dernier kilométrage certifié connu.
  * `estimatedCurrentMileage` : Kilométrage estimé à ce jour.
  * `readingsCount` : Nombre de relevés exploités.
  * `daysSinceLastReading` : Jours écoulés depuis la dernière visite en atelier.

#### `projectMaintenanceSchedule(options)`
* Projette chaque échéance sur un double axe (Temps vs Kilomètres) et attribue un niveau d'urgence (`OK`, `UPCOMING`, `DUE_SOON`, `OVERDUE`, `CRITICAL`).

---

## 2. Moteur de Réconciliation Factures vs Échéances (`reconciliation.ts`)

### Rôle
Rapproche automatiquement chaque ligne de pièce et de main-d'œuvre facturée avec le calendrier prévisionnel des échéances pour clôturer les opérations effectuées.

### Fonctions Clés

#### `reconcileInvoiceWithSchedule(invoice, pendingMilestones)`
* **Entrées** :
  * `invoice: InvoiceExtraction` — Données extraites de la facture.
  * `pendingMilestones: ScheduledMilestone[]` — Liste des échéances en attente.
* **Sortie** : `ReconciliationSummary`
  * `matchedMilestones` : Échéances validées et clôturées avec score de confiance.
  * `unmatchedLines` : Interventions ponctuelles non prévues au carnet.
  * `unfulfilledPendingMilestones` : Échéances restant à réaliser.

---

## 3. Moteur du Score de Santé & Revente (`conformity-score.ts`)

### Rôle
Calcule l'indice de conformité constructeur sur 100% et la note globale (`A+`, `A`, `B`, `C`, `D`, `F`) ainsi que l'impact estimé sur le prix de revente d'occasion.

### Pondération de l'Audit :
1. **Respect des échéances temporelles et kilométriques** : 35%
2. **Authenticité et traçabilité des factures d'ateliers** : 20%
3. **État des organes de sécurité critiques** : 25%
4. **Historique et validité du Contrôle Technique** : 20%

---

## 4. Générateur du Kit Prêt-à-Réserver — Geste 1 (`reservation-kit.ts`)

### Rôle
Produit les éléments de communication et de négociation avant d'amener le véhicule chez le réparateur :
* Script téléphonique mot à mot.
* Modèle d'email formalisé avec références constructeur.
* Vulgarisation grand public des défaillances de contrôle technique.
* Checklist de contrôle avant de laisser les clés et lors de la reprise du véhicule.

---

## 5. Récupérateur en Ligne du Plan Constructeur Officiel (`manufacturer-retriever.ts`)

### Rôle
Interroge l'IA avec le contexte précis du véhicule (Marque, Modèle, Finition, Motorisation, Année, VIN) pour récupérer le carnet d'entretien constructeur officiel complet (viscosité d'huile homologuée, périodicités de vidange, filtres, bougies, kit de distribution), avec filtrage déterministe pour éradiquer toute fausse alerte (ex: recharge de climatisation ou courroie sur moteur à chaîne).

---

## 6. Moteur Prédictif des Pneumatiques (`tires.ts`)

### Rôle
Modélise l'usure physique de la bande de roulement en millimètres (`8.0 mm` neuf $\rightarrow$ `3.0 mm` alerte $\rightarrow$ `1.6 mm` témoin légal) pour le train avant et le train arrière selon le type de motricité (Traction, Propulsion, 4WD/AllGrip).

### Fonctions Clés
* `calculateVehicleTireAssessment(params)` : Déduit la monte pneumatique, la date et le kilométrage de la dernière monte, l'usure en millimètres, l'autonomie restante et la date d'échéance prévisionnelle.
* `findBestTireMatches(options)` : Recherche et compare les offres du marché avec estimation du coût de pose et équilibrage.

---

## 7. Moteur Prédictif du Freinage (`brakes.ts`)

### Rôle
Modélise l'usure physique des garnitures de plaquettes de frein (`12 mm` neuf AV / `10 mm` neuf AR $\rightarrow$ `4 mm` alerte $\rightarrow$ `2 mm` témoin critique), extrait les mesures réelles d'atelier (ex: `80% d'usure`), et applique la règle 2-pour-1 pour les disques.

### Fonctions Clés
* `calculateVehicleBrakeAssessment(params)` : Évalue l'épaisseur restante en millimètres sur l'essieu avant et arrière, l'indice de santé global sur 100%, l'état des disques (`OPTIMAL` vs `REPLACE_WITH_NEXT_PADS`), et produit le devis estimatif ainsi que le script garagiste.
* `extractBrakeWearMeasurements(invoices, inspections)` : Parseur par expressions régulières pour isoler les pourcentages d'usure notés par les techniciens sur les factures et les défaillances réglementaires au contrôle technique (`1.1.13.a.1`).

---

## 8. Catalogue Véhicules & Découplage Moteurs (`vehicle-catalog.ts`)

### Rôle
Fournit le référentiel pur pour déduire les puissances (DIN / kW / Fiscale), motorisations exactes, transmissions (BVM vs BVA EDC/EAT/DSG), types de distribution (chaîne vs courroie), consommations, rythmes kilométriques et visuels officiels.

### Fonctions Clés
* `resolveVehicleCatalogSpecs(params)` : Résolution robuste et pure des spécifications d'un véhicule sans effet de bord ni hardcoding.

---

## 9. Moteur de Résolution & Pondération Garages (`garage-resolver.ts`)

### Rôle
Analyse l'historique des documents sources pour identifier et recommander le garage habituel de confiance selon la récence des interventions, la marque du véhicule et le type d'opération requise.

