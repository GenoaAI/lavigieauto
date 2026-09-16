import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { MaintenanceMobileStickyBar } from "@/components/maintenance/MaintenanceMobileStickyBar";

export async function testMobileStickyBarSuite() {
  console.log("▶ [TEST] Validation de la Mobile Sticky Bar pSEO (R3 / Milestone M3)...");

  // 1. Validation de l'export du composant React
  assert.equal(
    typeof MaintenanceMobileStickyBar,
    "function",
    "Le composant MaintenanceMobileStickyBar doit être une fonction exportée."
  );
  console.log("  ✔ MaintenanceMobileStickyBar exporté en tant que composant React valide.");

  // 2. Validation du fichier source et directives
  const filePath = path.resolve("src/components/maintenance/MaintenanceMobileStickyBar.tsx");
  assert.ok(fs.existsSync(filePath), "Le fichier MaintenanceMobileStickyBar.tsx doit exister.");
  const source = fs.readFileSync(filePath, "utf-8");

  assert.ok(
    source.includes('"use client"') || source.includes("'use client'"),
    "MaintenanceMobileStickyBar doit être un Client Component ('use client')."
  );
  assert.ok(
    source.includes("md:hidden"),
    "La sticky bar doit être strictement masquée sur desktop (md:hidden)."
  );
  assert.ok(
    source.includes("print:hidden"),
    "La sticky bar doit être strictement masquée à l'impression (print:hidden)."
  );
  assert.ok(
    source.includes("safe-area-inset-bottom"),
    "La sticky bar doit intégrer le padding safe-area iOS (env(safe-area-inset-bottom,0px))."
  );
  assert.ok(
    source.includes("z-30"),
    "La sticky bar doit être positionnée à z-30 (sous les éléments z-40 pour éviter les collisions)."
  );
  console.log("  ✔ Directives Client, classes responsive md:hidden, print:hidden et safe-area certifiées.");

  // 3. Validation de la détection de défilement et anti-collision clavier
  assert.ok(
    source.includes("280"),
    "La sticky bar doit être visible lors d'un défilement suffisant (seuil scrollY > 280px)."
  );
  assert.ok(
    source.includes("focusin") && source.includes("focusout"),
    "La sticky bar doit écouter focusin et focusout pour masquer la barre lors de la saisie."
  );
  assert.ok(
    source.includes("visualViewport"),
    "La sticky bar doit écouter le redimensionnement du visualViewport pour gérer le clavier virtuel."
  );
  console.log("  ✔ Détection scrollY > 280px et anti-collision clavier virtuel (focusin/out + visualViewport) validées.");

  // 4. Validation des Call-To-Action (CTAs) et cibles tactiles
  assert.ok(
    source.includes("min-h-[44px]"),
    "Les boutons d'action doivent respecter la taille tactile minimale recommandée (>= 44px)."
  );
  assert.ok(
    source.includes("Carnet PDF"),
    "Le CTA 'Carnet PDF' doit être présent."
  );
  assert.ok(
    source.includes("Alerte Révision"),
    "Le CTA 'Alerte Révision' doit être présent."
  );
  assert.ok(
    source.includes("window.print()"),
    "Le CTA Carnet PDF doit déclencher l'impression via window.print()."
  );
  assert.ok(
    source.includes("rappel-revision"),
    "Le CTA Alerte Révision doit pointer vers le conteneur #rappel-revision."
  );
  assert.ok(
    source.includes("scrollIntoView"),
    "Le CTA Alerte Révision doit utiliser scrollIntoView pour un défilement fluide."
  );
  assert.ok(
    source.includes("ring-4"),
    "Le CTA Alerte Révision doit appliquer un effet visuel de mise en valeur (highlight)."
  );
  assert.ok(
    source.includes("recordMicroConversionAction"),
    "Les CTAs doivent tracer les micro-conversions via recordMicroConversionAction."
  );
  assert.ok(
    source.includes("pdf_download_print"),
    "Le clic PDF doit tracer l'événement pdf_download_print."
  );
  assert.ok(
    source.includes("lead_magnet_cta_click"),
    "Le clic Alerte Révision doit tracer l'événement lead_magnet_cta_click."
  );
  console.log("  ✔ 2 CTAs ergonomiques (>= 44px), smooth scroll #rappel-revision, print et télémétrie certifiés.");

  // 5. Validation de l'intégration dans src/app/entretien/[brand]/[model]/[engine]/page.tsx
  const pagePath = path.resolve("src/app/entretien/[brand]/[model]/[engine]/page.tsx");
  assert.ok(fs.existsSync(pagePath), "Le fichier page.tsx des fiches motorisation doit exister.");
  const pageSource = fs.readFileSync(pagePath, "utf-8");

  assert.ok(
    pageSource.includes("MaintenanceMobileStickyBar"),
    "page.tsx doit importer et monter MaintenanceMobileStickyBar."
  );
  assert.ok(
    pageSource.includes("<MaintenanceMobileStickyBar"),
    "page.tsx doit rendre la balise <MaintenanceMobileStickyBar."
  );
  assert.ok(
    pageSource.includes("brand={data.brand}"),
    "page.tsx doit transmettre brand={data.brand} à MaintenanceMobileStickyBar."
  );
  assert.ok(
    pageSource.includes("model={data.model}"),
    "page.tsx doit transmettre model={data.model} à MaintenanceMobileStickyBar."
  );
  assert.ok(
    pageSource.includes("engine={data.engine}"),
    "page.tsx doit transmettre engine={data.engine} à MaintenanceMobileStickyBar."
  );
  console.log("  ✔ Intégration dans la page de fiche d'entretien certifiée avec props brand, model, engine.");
}
