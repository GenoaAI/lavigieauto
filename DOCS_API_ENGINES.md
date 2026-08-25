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
Interroge l'IA avec le contexte précis du véhicule (Marque, Modèle, Finition, Motorisation, Année, VIN) pour récupérer le carnet d'entretien constructeur officiel complet (viscosité d'huile homologuée, périodicités de vidange, filtres, bougies, kit de distribution).
