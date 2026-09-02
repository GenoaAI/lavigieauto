import * as fs from "fs";
import * as path from "path";

export interface LoadedSkill {
  name: string;
  description: string;
  systemPrompt: string;
  prompt: string;
  version: string;
}

/**
 * Registre de secours embarqué des compétences LLM (Skills Markdown).
 * Garantit une résilience absolue en environnement Serverless (Vercel, AWS Lambda)
 * où les fichiers Markdown racine ne sont pas copiés dans le bundle Lambda isolé.
 */
export const EMBEDDED_SKILLS: Record<string, string> = {
  "invoice-parser": `---
name: invoice-parser
description: "Extraction exhaustive et structuration des factures d'ateliers mécaniques, concessions et garages automobiles français"
systemPrompt: "Tu es un expert d'extraction et d'analyse de factures d'ateliers mécaniques, concessions et garages automobiles français. Ne retourne jamais de champs vides si les données sont lisibles."
version: 1.0.0
---

# Instructions d'Extraction de Facture Atelier / Garage

Analyse scrupuleusement cette facture d'atelier ou de garage automobile.
Extrais l'ensemble des informations de facturation, de l'émetteur, du véhicule et le détail ligne par ligne des opérations réalisées :

1. **Informations Facture & Émetteur** :
   - \`invoiceNumber\` : Numéro de facture
   - \`invoiceDate\` : Date de facture / date d'intervention au format YYYY-MM-DD
   - \`garage.name\` : Nom de l'atelier, concession ou garage émetteur (ex: SARL GARAGE HELIERE C. & S., SPEEDY, BAZOCHE AUTOMOBILE)
   - \`garage.siret\` : Numéro SIRET (14 chiffres si visible)
   - \`garage.address\` : Adresse complète du garage

2. **Identification & Kilométrage Véhicule (ATTENTION AUX CONFUSIONS EN-TÊTE / VÉHICULE)** :
   - \`vehicle.licensePlate\` : Immatriculation (ex: FX-563-KZ, EC-301-JX, CS-318-YD)
   - \`vehicle.currentMileage\` : Kilométrage relevé au compteur lors du passage atelier (ex: 272448, 125789, 78800)
   - \`vehicle.make\` : Marque réelle du véhicule client (ex: RENAULT, PEUGEOT, SUZUKI, CITROEN, TOYOTA, VOLKSWAGEN)
   - \`vehicle.model\` : Modèle réel du véhicule (ex: CLIO, 208, 2008, 308, VITARA, ESPACE, CAPTUR)
   - \`vehicle.vin\` : Numéro de série VIN (17 caractères)
   - ⚠️ **RÈGLE CRITIQUE D'EXTRACTION DE LA MARQUE & DU MODÈLE** :
     * Ne JAMAIS confondre la marque du garage / concessionnaire émetteur (ex: en-tête "Agent PEUGEOT", "Concession RENAULT", "Garage CITROËN") avec la marque du véhicule client ! Si une facture émise par un garage Peugeot concerne un véhicule indiqué "CLIO", "RENAULT" ou "MEGANE", \`vehicle.make\` doit être "RENAULT" et \`vehicle.model\` doit être "CLIO", et NON "PEUGEOT".
     * Extrais STRICTEMENT la marque et le modèle à partir de la ligne de désignation du véhicule du client (ex: "Véhicule : ...", "Type : ...", "Désignation : ...", "Immat : ...").
     * Ne JAMAIS confondre une date ou une année (ex: 2008, 2018, 2020) ou un code postal avec un modèle de voiture sauf s'il s'agit explicitement du nom du modèle dans le bloc véhicule.

3. **Lignes d'Interventions et Pièces** :
   - Extrais chaque ligne avec sa désignation exacte (\`description\`), sa référence pièce (\`partNumber\`), sa catégorie normalisée (\`category\`), son code canonique d'opération (\`canonicalCode\`: DRAIN_OIL, AIR_FILTER, CABIN_FILTER, FUEL_FILTER, SPARK_PLUGS, GLOW_PLUGS, BRAKE_FLUID, COOLANT, BRAKE_PADS_FRONT, BRAKE_PADS_REAR, BRAKE_DISCS_FRONT, BRAKE_DISCS_REAR, ACCESSORY_BELT, TIMING_BELT, TIRES_FRONT, TIRES_REAR, BATTERY, CLUTCH, SUSPENSION_SHOCK, GEARBOX_OIL, AIR_CONDITIONING, WIPER_BLADES, TECHNICAL_INSPECTION_PREP, DIAGNOSTIC_ELECTRONIC, LABOR_ONLY, OTHER), son type d'action (\`actionType\`: REPLACE pour tout changement de pièce/fluide, INSPECT_ONLY pour tout contrôle/diagnostic/vérification sans changement, PACKAGE_SERVICE pour tout forfait révision globale, REPAIR, CLEAN, LABOR), sa quantité (\`quantity\`), son prix unitaire HT (\`unitPriceHT\`), son montant total TTC (\`totalTTC\`), et si c'est de la pièce ou de la main d'œuvre (\`isLabor\`, \`isPart\`).
   - RÈGLE IMPORTANTE : Un contrôle visuel ou un diagnostic (ex: "Contrôle freins", "Vérification niveaux") doit OBLIGATOIREMENT être taggé avec actionType="INSPECT_ONLY". Un remplacement de courroie (ex: "5PK915", "Courroie accessoires", "Kit distri") doit être taggé avec canonicalCode="ACCESSORY_BELT" ou "TIMING_BELT" et actionType="REPLACE".

4. **Totaux Financiers** :
   - \`totalHT\` : Montant total net Hors Taxes
   - \`totalVAT\` : Montant de la TVA
   - \`totalTTC\` : Montant total TTC net à payer

{{vehicleContext}}
{{rawTextContext}}
{{customPromptContext}}

Réponds STRICTEMENT au format JSON valide selon le schéma requis.
`,

  "technical-inspection-parser": `---
name: technical-inspection-parser
description: "Extraction et analyse réglementaire des procès-verbaux de contrôle technique automobile français (Norme UTAC / OTC)"
systemPrompt: "Tu es un expert en réglementation automobile française et analyse de procès-verbaux de contrôle technique (norme UTAC / OTC)."
version: 1.0.0
---

# Instructions d'Extraction de Procès-Verbal de Contrôle Technique

Analyse scrupuleusement ce Procès-Verbal de Contrôle Technique périodique (norme UTAC / OTC France).
Extrais toutes les données réglementaires du centre, du véhicule, du bilan global et la liste exhaustive des défaillances constatées :

1. **Identification du Centre & Visite** :
   - \`center.name\` : Nom ou raison sociale du centre agréé (ex: DEKRA, AUTOSUR, SECURITEST, SAS LE ROUX)
   - \`center.approvalNumber\` : Numéro d'agrément du centre
   - \`center.inspectionDate\` : Date du contrôle technique au format YYYY-MM-DD
   - \`center.nextInspectionDeadline\` : Date limite de validité ou du prochain contrôle

2. **Véhicule & Kilométrage Certifié** :
   - \`vehicle.licensePlate\` : Immatriculation relevée
   - \`vehicle.currentMileage\` : Kilométrage officiel certifié relevé au compteur
   - \`vehicle.vin\` : Numéro de série VIN
   - \`vehicle.make\` / \`vehicle.model\`

3. **Résultat Global & Bilan Réglementaire** :
   - \`inspectionResult.status\` : Résultat global (FAVORABLE si résultat A, DEFAVORABLE_POUR_DEFAILLANCES_MAJEURES si résultat S avec contre-visite sous 2 mois, DEFAVORABLE_POUR_DEFAILLANCES_CRITIQUES si résultat R avec interdiction de circuler dès minuit)
   - \`inspectionResult.isFavorable\` : true si résultat A favorable, false sinon

4. **Défaillances Relevées (Ligne par ligne)** :
   - Pour chaque défaillance constatée :
     * \`code\` : Code officiel UTAC (ex: 5.2.3.d.1, 1.1.13.a.2, 4.1.2.a.1)
     * \`label\` : Libellé textuel exact du défaut constaté
     * \`severity\` : Gravité réglementaire (\`MINOR\` pour défaillance mineure sans contre-visite, \`MAJOR\` pour défaillance majeure avec contre-visite sous 2 mois, \`CRITICAL\` pour défaillance critique)
     * \`location\` : Localisation (ex: AVG pour Avant Gauche, ARD pour Arrière Droit, etc.)
     * \`category\` : Sous-système mécanique impacté (BRAKES, STEERING, VISIBILITY, LIGHTING, SUSPENSION_TIRES, CHASSIS, OTHER)

{{vehicleContext}}
{{rawTextContext}}
{{customPromptContext}}

Réponds STRICTEMENT au format JSON valide selon le schéma requis.
`,

  "registration-card-parser": `---
name: registration-card-parser
description: "Extraction certifiée et normalisée des Certificats d'Immatriculation français (Cartes Grises SIV et FNI)"
systemPrompt: "Tu es un expert d'extraction de Certificats d'Immatriculation (Cartes Grises françaises SIV/FNI). Ne retourne jamais de champs vides si les valeurs sont visibles sur le document."
version: 1.0.0
---

# Instructions d'Extraction de Carte Grise

Analyse scrupuleusement ce Certificat d'Immatriculation (Carte Grise française).
Lis attentivement l'image ou le document fourni et extrais scrupuleusement chaque champ visible selon la nomenclature officielle :

- **licensePlate** : Numéro d'immatriculation officiel (Ligne A, ex: EC-301-JX, FX-563-KZ, GP-902-NY)
- **firstRegistrationDate** : Date de 1ère mise en circulation au format ISO 8601 YYYY-MM-DD (Ligne B, ex: 2016-05-24)
- **make** : Marque officielle du constructeur (Ligne D.1, ex: SUZUKI, RENAULT, PEUGEOT)
- **model** : Dénomination commerciale / Modèle (Ligne D.3, ex: VITARA, ESPACE, CLIO)
- **typeVariantVersion** : Type Variante Version TVV (Ligne D.2)
- **vin** : Numéro d'identification du véhicule à 17 caractères (Ligne E)
- **fuelType** : Type de carburant / Énergie (Ligne P.3, ex: ES pour Essence, GO pour Diesel, EH pour Hybride, EL pour Électrique)
- **fiscalPower** : Puissance administrative nationale en CV fiscaux (Ligne P.6, nombre entier)
- **powerKw** : Puissance nette maximale en kW (Ligne P.2)
- **cnit** : Numéro de réception type / CNIT (Ligne K)
- **co2Emissions** : Taux d'émission de CO2 en g/km (Ligne V.7)
- **ownerName** : Nom et prénom ou raison sociale du titulaire (Ligne C.1)

{{rawTextContext}}
{{customPromptContext}}

Réponds STRICTEMENT sous la forme d'un objet JSON valide respectant le schéma attendu.
`,

  "maintenance-book-parser": `---
name: maintenance-book-parser
description: "Extraction et numérisation des carnets d'entretien et tampons d'ateliers constructeur"
systemPrompt: "Tu es un ingénieur de maintenance automobile expert dans l'analyse des carnets d'entretien officiels et des grilles de révision d'usine."
version: 1.0.0
---

# Instructions d'Extraction de Carnet d'Entretien

Analyse ce carnet d'entretien ou cette grille périodique constructeur.
Extrais chaque tampon d'atelier certifié et chaque opération enregistrée :

1. **Identification du Véhicule** :
   - \`vehicle.make\` / \`vehicle.model\`
   - \`vehicle.licensePlate\`
   - \`vehicle.vin\`

2. **Tampons d'Atelier & Révisions Enregistrées** :
   - \`performedServices\` : Liste des interventions tamponnées avec \`date\`, \`mileage\`, \`garageName\`, \`operationsChecked\` et \`stampPresent\`.

3. **Plan Constructeur Prescrit** :
   - \`recommendedPlan\` : Périodicités d'usine relevées pour chaque organe (moteur, boîte, filtres, courroies, fluides).

{{vehicleContext}}
{{rawTextContext}}
{{customPromptContext}}

Réponds STRICTEMENT sous forme d'un objet JSON valide.
`,

  "manufacturer-plan-retriever": `---
name: manufacturer-plan-retriever
description: "Récupération du plan d'entretien officiel 100% complet et exhaustif pour tout véhicule selon les bases de données constructeurs après-vente"
systemPrompt: "Tu es un système expert en bases de données après-vente et documentation technique constructeur automobile officielle (équivalent Autodata, HaynesPro, carnets officiels d'usine). Réponds uniquement en JSON valide."
version: 1.0.0
---

# Cahier des Charges & Plan d'Entretien Officiel Constructeur (100% Exhaustif)

Tu es un ingénieur expert en documentation technique après-vente automobile constructeur.

Fournis 100% DES PRÉCONISATIONS OFFICIELLES DU CONSTRUCTEUR pour ce véhicule :
- **Marque** : {{make}}
- **Modèle** : {{model}}
- **Version / Finition** : {{version}}
- **Énergie / Motorisation** : {{fuelType}}
- **Année de mise en circulation** : {{year}}
- **VIN** : {{vin}}

Tu DOIS inclure uniquement les postes d'entretien officiels applicables au modèle selon le carnet d'entretien officiel d'usine (OEM) :
1. **Vidange huile moteur & filtre** (avec la norme d'huile officielle exacte : ex. Suzuki Genuine 0W-20 ECSTAR, Renault RN17 5W-30, PSA B71 2290/2297, VW 504.00/507.00, etc.)
2. **Filtre d'habitacle / filtre à pollen / anti-allergène** (tous les 12 à 24 mois selon carnet)
3. **Filtre à air moteur** (tous les 24 à 48 mois ou 30 000 à 60 000 km)
4. **Filtre à carburant** (Gazole avec purge d'eau décanteur / Essence externe si prévu au carnet)
5. **Purge complète du circuit de freinage** (DOT 4 / DOT 5.1 ESP - tous les 24 mois / 2 ans)
6. **Liquide de refroidissement** (LdR longue durée d'origine)
7. **Bougies d'allumage Iridium / Platine / Standard** (Essence) ou **Bougies de préchauffage** (Diesel)
8. **Courroie d'accessoires & galets tendeurs** (contrôle et/ou remplacement selon intervalle officiel)
9. **Distribution** :
   - Si moteur à **chaîne métallique** (ex: Suzuki M16A, K14C, Nissan HR16DE, BMW N47/B48, etc.) : marquer \`timingType: "chaine"\` et NE PAS générer d'opération périodique de remplacement de kit distribution.
   - Si moteur à **courroie synchrone** : marquer \`timingType: "courroie"\` avec l'intervalle kilométrique et temporel officiel.
10. **Vidange boîte de vitesses / pont / boîte de transfert** :
    - Boîte manuelle : indiquer uniquement si le constructeur préconise une vidange périodique (sinon contrôle niveau).
    - Boîte automatique (EDC, DSG, EAT, CVT) ou transmission intégrale 4x4 / AllGrip / AWD : inclure la vidange d'huile et filtre selon préconisation usine.
11. **Contrôle Technique réglementaire périodique** (UTAC / OTC à 4 ans puis tous les 2 ans)

### RÈGLE STRICTE SUR LA CLIMATISATION & FORFAITS COMMERCIAUX :
- Le circuit frigorifique de climatisation est un système thermodynamique hermétiquement scellé en usine.
- **NE JAMAIS inclure de recharge systématique de fluide frigorigène (R134a/R1234yf) ni de vidange de gaz périodique** dans le plan officiel constructeur, car il s'agit d'une opération corrective (sur panne thermique) et non d'une maintenance programmée au carnet.
- Seul le **filtre d'habitacle** et l'inspection de la **courroie d'entraînement du compresseur** relèvent du plan préventif périodique.

Réponds STRICTEMENT au format JSON respectant le schéma demandé.
`,
};

const SKILL_CACHE = new Map<string, { rawContent: string; frontmatter: Record<string, string>; body: string }>();

/**
 * Charge un prompt LLM externalisé au format Markdown depuis le dossier `skills/<skillName>/SKILL.md`
 * avec repli automatique vers le registre embarqué en environnement Serverless (Vercel).
 */
export function loadSkillPrompt(
  skillName: string,
  variables: Record<string, string | number | undefined | null> = {}
): LoadedSkill {
  let cached = SKILL_CACHE.get(skillName);

  if (!cached) {
    let fileContent = "";

    // Chemins potentiels selon l'environnement d'exécution
    const candidatePaths = [
      path.join(process.cwd(), "skills", skillName, "SKILL.md"),
      path.resolve(process.cwd(), "src", "skills", skillName, "SKILL.md"),
      path.resolve(__dirname, "../../skills", skillName, "SKILL.md"),
      path.resolve(__dirname, "../../../skills", skillName, "SKILL.md"),
      path.resolve(__dirname, "../../../../skills", skillName, "SKILL.md"),
      path.join(process.cwd(), "..", "skills", skillName, "SKILL.md"),
    ];

    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          fileContent = fs.readFileSync(p, "utf-8");
          if (fileContent) break;
        }
      } catch {
        // Ignorer et essayer le suivant
      }
    }

    // Repli immédiat sur le registre embarqué si introuvable sur le disque physique
    if (!fileContent && EMBEDDED_SKILLS[skillName]) {
      fileContent = EMBEDDED_SKILLS[skillName];
    }

    if (!fileContent) {
      throw new Error(`[SkillsLoader] Le fichier SKILL.md pour la compétence "${skillName}" est introuvable.`);
    }

    // Parsing du frontmatter YAML simple
    const frontmatter: Record<string, string> = {};
    let body = fileContent;

    const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (match) {
      const yamlBlock = match[1];
      body = match[2];

      yamlBlock.split("\n").forEach((line) => {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          let val = line.slice(colonIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          frontmatter[key] = val;
        }
      });
    }

    cached = { rawContent: fileContent, frontmatter, body };
    SKILL_CACHE.set(skillName, cached);
  }

  // Remplacement des variables dynamiques {{key}}
  let processedPrompt = cached.body;
  let processedSystemPrompt = cached.frontmatter.systemPrompt || "";

  Object.entries(variables).forEach(([key, val]) => {
    const stringVal = val !== undefined && val !== null ? String(val) : "";
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    processedPrompt = processedPrompt.replace(placeholder, stringVal);
    processedSystemPrompt = processedSystemPrompt.replace(placeholder, stringVal);
  });

  // Nettoyer d'éventuels placeholders non renseignés
  processedPrompt = processedPrompt.replace(/\{\{\s*[\w.-]+\s*\}\}/g, "").trim();

  return {
    name: cached.frontmatter.name || skillName,
    description: cached.frontmatter.description || "",
    systemPrompt: processedSystemPrompt,
    prompt: processedPrompt,
    version: cached.frontmatter.version || "1.0.0",
  };
}
