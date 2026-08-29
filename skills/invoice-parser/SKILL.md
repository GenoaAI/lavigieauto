---
name: invoice-parser
description: "Extraction exhaustive et structuration des factures d'ateliers mécaniques, concessions et garages automobiles français"
systemPrompt: "Tu es un expert d'extraction et d'analyse de factures d'ateliers mécaniques, concessions et garages automobiles français. Ne retourne jamais de champs vides si les données sont lisibles."
version: 1.0.0
---

# Instructions d'Extraction de Facture Atelier / Garage

Analyse scrupuleusement cette facture d'atelier ou de garage automobile.
Extrais l'ensemble des informations de facturation, de l'émetteur, du véhicule et le détail ligne par ligne des opérations réalisées :

1. **Informations Facture & Émetteur** :
   - `invoiceNumber` : Numéro de facture
   - `invoiceDate` : Date de facture / date d'intervention au format YYYY-MM-DD
   - `garage.name` : Nom de l'atelier, concession ou garage émetteur (ex: SARL GARAGE HELIERE C. & S., SPEEDY, BAZOCHE AUTOMOBILE)
   - `garage.siret` : Numéro SIRET (14 chiffres si visible)
   - `garage.address` : Adresse complète du garage

2. **Identification & Kilométrage Véhicule** :
   - `vehicle.licensePlate` : Immatriculation (ex: FX-563-KZ, EC-301-JX)
   - `vehicle.currentMileage` : Kilométrage relevé au compteur lors du passage atelier (ex: 272448, 125789)
   - `vehicle.make` : Marque (ex: RENAULT, SUZUKI)
   - `vehicle.model` : Modèle (ex: ESPACE V, VITARA)
   - `vehicle.vin` : Numéro de série VIN (17 caractères)

3. **Lignes d'Interventions et Fournitures (`lineItems`)** :
   - Extrais chaque ligne avec sa désignation exacte (`description`), sa catégorie normalisée (`category`: DRAIN_OIL, AIR_FILTER, CABIN_FILTER, FUEL_FILTER, BRAKE_PADS_FRONT, BRAKE_PADS_REAR, BRAKE_DISCS_FRONT, BRAKE_DISCS_REAR, BRAKE_FLUID, COOLANT, SPARK_PLUGS, GLOW_PLUGS, TIMING_BELT, ACCESSORY_BELT, TIRES_FRONT, TIRES_REAR, BATTERY, CLUTCH, SUSPENSION_SHOCK, GEARBOX_OIL, AIR_CONDITIONING, WIPER_BLADES, TECHNICAL_INSPECTION_PREP, DIAGNOSTIC_ELECTRONIC, LABOR_ONLY, OTHER), sa quantité (`quantity`), son prix unitaire HT (`unitPriceHT`), son montant total TTC en euros (`totalTTC`), et booléens (`isLabor`, `isPart`).

4. **Totaux Financiers (`invoice`)** :
   - `totalHT` : Montant total net Hors Taxes (nombre réel)
   - `totalVAT` : Montant total de la TVA (nombre réel)
   - `totalTTC` : Montant total TTC net à payer (nombre réel impératif, jamais 0 si un montant est affiché)

{{vehicleContext}}
{{rawTextContext}}
{{customPromptContext}}

Réponds STRICTEMENT au format JSON valide selon le schéma requis.
