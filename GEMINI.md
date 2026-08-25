# RÈGLES DU PROJET LAVIGIEAUTO (AUTOCARE AI)

## 1. RÈGLE STRICTE : ZÉRO FAKE DATA & ZÉRO MOCK FALLBACK
* **Source Unique de Vérité** : Toutes les données affichées (véhicules, entretiens, kilométrages, factures, membres) proviennent **exclusivement de la base de données réelle (PostgreSQL / Supabase)**.
* **Interdiction des Données Artificielles** : Il est formellement interdit d'inventer, simuler ou injecter en dur des véhicules fictifs, des faux kilométrages ou des alertes inventées dans les Server Actions ou composants comme pseudo-fallback.
* **Gestion des États Vides** : Si la base ne contient aucun véhicule, renvoyer `[]` et afficher un état vide authentique invitant l'utilisateur à scanner son premier document.
* **Isolation du Seeding** : Les graines de test appartiennent exclusivement à `supabase/seed.sql`.

## 2. RÈGLES SERVER ACTIONS & APP ROUTER ("use server")
* Dans tout fichier portant la directive `"use server"`, **SEULES des fonctions `async`** peuvent être exportées.
* Aucune constante, objet ou tableau ne doit être exporté depuis un fichier `"use server"`.

## 3. PROTOCOLE DE DÉPLOIEMENT VERCEL
* Toujours inspecter le statut officiel du déploiement (`npx vercel ls` / `npx vercel inspect <url> --logs`) avant de confirmer la mise en ligne.
* Toujours vérifier le rendu HTTP réel (`read_url_content`) en direct sur le domaine de production.
