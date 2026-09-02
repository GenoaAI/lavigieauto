# RÈGLES DU PROJET LAVIGIEAUTO (AUTOCARE AI)

## 1. RÈGLE STRICTE : ZÉRO FAKE DATA & ZÉRO MOCK FALLBACK
* **Source Unique de Vérité** : Toutes les données affichées (véhicules, entretiens, kilométrages, factures, membres) proviennent **exclusivement de la base de données réelle (PostgreSQL / Supabase)**.
* **Interdiction des Données Artificielles** : Il est formellement interdit d'inventer, simuler ou injecter en dur des véhicules fictifs, des faux kilométrages ou des alertes inventées dans les Server Actions ou composants comme pseudo-fallback.
* **Gestion des États Vides** : Si la base ne contient aucun véhicule, renvoyer `[]` et afficher un état vide authentique invitant l'utilisateur à scanner son premier document.
* **Isolation du Seeding** : Les graines de test appartiennent exclusivement à `supabase/seed.sql`.

## 2. CLOISONNEMENT STRICT INTER-VÉHICULES (VEHICLE ISOLATION)
* **Priorité à la Vérité de la Plaque** : Une facture ou un contrôle technique portant une immatriculation identifiée doit obligatoirement être rattaché au véhicule correspondant à cette plaque, même si l'upload est déclenché depuis la fiche d'un autre véhicule.
* **Interdiction du Rattachement Aveugle** : Si aucune plaque n'est extraite d'un document, il est formellement interdit de l'affecter par défaut au premier véhicule du foyer si la marque ou le modèle ne concordent pas strictement.
* **Auto-Guérison Odométrique (Auto-Healing)** : Le kilométrage actuel d'un véhicule est strictement borné et dérivé du maximum réel de **ses propres documents certifiés**. Un document d'un véhicule tiers ne peut en aucun cas altérer l'odomètre ou l'échéancier d'un autre véhicule.
* **Isolation Totale des Échéanciers** : Les calculs de cycles, rythmes annuels, historiques d'interventions et alertes de maintenance sont hermétiquement cloisonnés par `vehicule_id`.

## 3. RÈGLES SERVER ACTIONS & APP ROUTER ("use server")
* Dans tout fichier portant la directive `"use server"`, **SEULES des fonctions `async`** peuvent être exportées.
* Aucune constante, objet ou tableau ne doit être exporté depuis un fichier `"use server"`.

## 4. DÉCOUPLAGE MÉTIER & CATALOGUE VÉHICULES
* Les règles de déduction des caractéristiques techniques (puissance, transmission, type de distribution, monte pneumatique, images officielles) sont centralisées dans `src/lib/engine/vehicle-catalog.ts`.
* Zéro logique de typage de motorisation hardcodée dans les Server Actions ou composants UI.

## 5. PROTOCOLE DE DÉPLOIEMENT VERCEL
* Toujours exécuter et valider l'intégralité des 31 suites de tests (`npm test` et `npx tsc --noEmit`) avant tout commit.
* Toujours inspecter le statut officiel du déploiement (`npx vercel ls` / `npx vercel inspect <url> --logs`) avant de confirmer la mise en ligne.
* Toujours vérifier le rendu HTTP réel (`read_url_content`) en direct sur le domaine de production.

## 6. RÈGLES DE SÉCURITÉ RED TEAM & AUTHENTIFICATION (ZERO TRUST)
* **Zéro Cookie Spoofing** : L'authentification repose exclusivement sur Supabase Auth (`supabase.auth.getUser()`). Il est strictement interdit d'utiliser des cookies non signés pour inférer l'identité de l'utilisateur.
* **Contrôle d'Accès BOLA/IDOR Obligatoire** : Toute Server Action ou route API manipulant un véhicule, document ou membre doit exécuter formellement `requireUserHouseholdContext()` et `assertVehicleOwnership(vehicleId, context.foyerId)`.
* **Isolation Storage Vault** : Toute génération d'URL signée (`getDocumentSignedUrlAction`) ou suppression de fichier physique doit vérifier l'appartenance de la ressource au foyer avant d'appeler l'API Storage.
* **Protection en Production** : Les endpoints de debug et de seed (`/api/seed`) doivent être strictement neutralisés en production (`404 Not Found`).
* **Headers de Sécurité Stricts** : Maintenir le middleware Next.js (`src/middleware.ts`) actif avec HSTS, CSP, X-Frame-Options: DENY et gestion sécurisée des sessions.
