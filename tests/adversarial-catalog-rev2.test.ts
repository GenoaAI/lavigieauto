import assert from "node:assert/strict";
import {
  detectVehicleFuelType,
  extractVehicleDinPower,
  deduceVehicleGearbox,
  resolveVehicleCatalogSpecs,
} from "@/lib/engine/vehicle-catalog";

export function runAdversarialCatalogRev2Tests() {
  console.log("=================================================");
  console.log("⚔️ [CHALLENGER 2 REV 2] INDEPENDENT ADVERSARIAL HARNESS");
  console.log("    Deep Stress Testing of Vehicle Catalog Specifications");
  console.log("=================================================\n");

  // ---------------------------------------------------------------------------
  // TEST SUITE 1: DIESEL FUEL TYPE RESOLUTION FROM VERSION STRINGS
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 1] Diesel Keyword Detection across versions without explicit fuel param...");
  const dieselCases = [
    { version: "1-5-bluehdi-100", model: "208-2", make: "Peugeot" },
    { version: "1.5 BlueHDi 130 S&S EAT8", model: "308", make: "Peugeot" },
    { version: "2.0 Blue-HDi 180", model: "508", make: "Peugeot" },
    { version: "1.5 dCi 90", model: "Clio 4", make: "Renault" },
    { version: "1-5-blue-dci-115", model: "Duster 2", make: "Dacia" },
    { version: "2.0 bluedci 200", model: "Espace 5", make: "Renault" },
    { version: "1.6 dCi 130", model: "Kadjar", make: "Renault" },
    { version: "1.6 TDI 115", model: "Golf 7", make: "Volkswagen" },
    { version: "2.0 TDI 150 DSG7", model: "Passat", make: "Volkswagen" },
    { version: "1.4 tdi 90", model: "Polo", make: "Volkswagen" },
    { version: "1.6 CRDi 115", model: "i30", make: "Hyundai" },
    { version: "2.0 HDi 136", model: "C4 Picasso", make: "Citroen" },
    { version: "1.6 BlueHDi 120", model: "C3 Aircross", make: "Citroen" },
    { version: "2.0 Diesel 150", model: "Mondeo", make: "Ford" },
    { version: "Gazole 110", model: "Megane", make: "Renault" },
  ];

  for (const c of dieselCases) {
    const fuel = detectVehicleFuelType(undefined, c.version, c.model);
    assert.equal(
      fuel,
      "diesel",
      `Échec détection diesel pour ${c.make} ${c.model} (${c.version}). Reçu: ${fuel}`
    );

    const specs = resolveVehicleCatalogSpecs({
      make: c.make,
      model: c.model,
      version: c.version,
    });
    assert.equal(
      specs.fuel,
      "diesel",
      `Échec resolveVehicleCatalogSpecs fuel pour ${c.make} ${c.model} (${c.version}). Reçu: ${specs.fuel}`
    );
  }
  console.log(`  ✔ ${dieselCases.length}/${dieselCases.length} motorisations Diesel résolues sans faute.`);

  // ---------------------------------------------------------------------------
  // TEST SUITE 2: HYBRIDE / PHEV RESOLUTION
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 2] Hybride & PHEV Detection across versions without explicit fuel param...");
  const hybridCases = [
    { version: "1.5 HSD 100", model: "Yaris", make: "Toyota" },
    { version: "1-8-hsd-136", model: "Auris", make: "Toyota" },
    { version: "1.5 Hybrid 116", model: "Yaris Cross", make: "Toyota" },
    { version: "2.0 Hybride 184", model: "Corolla", make: "Toyota" },
    { version: "1.6 E-Tech Hybride 140", model: "Clio 5", make: "Renault" },
    { version: "1.6 PHEV 225", model: "3008", make: "Peugeot" },
    { version: "1.4 TSI PHEV 204", model: "Golf GTE", make: "Volkswagen" },
  ];

  for (const c of hybridCases) {
    const fuel = detectVehicleFuelType(undefined, c.version, c.model);
    assert.equal(
      fuel,
      "hybride",
      `Échec détection hybride pour ${c.make} ${c.model} (${c.version}). Reçu: ${fuel}`
    );

    const specs = resolveVehicleCatalogSpecs({
      make: c.make,
      model: c.model,
      version: c.version,
    });
    assert.equal(
      specs.fuel,
      "hybride",
      `Échec resolveVehicleCatalogSpecs fuel pour ${c.make} ${c.model} (${c.version}). Reçu: ${specs.fuel}`
    );
  }
  console.log(`  ✔ ${hybridCases.length}/${hybridCases.length} motorisations Hybrides/PHEV résolues sans faute.`);

  // ---------------------------------------------------------------------------
  // TEST SUITE 3: ÉLECTRIQUE RESOLUTION
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 3] Électrique Detection across models and versions...");
  const elecCases = [
    { version: "e-208 GT 136 ch", model: "208-2", make: "Peugeot" },
    { version: "Electrique 136 ch", model: "e-2008", make: "Peugeot" },
    { version: "Zoe R110 52 kWh", model: "Zoe", make: "Renault" },
    { version: "EV 204 ch", model: "Niro EV", make: "Kia" },
    { version: "Electric 150 ch", model: "ID.3", make: "Volkswagen" },
  ];

  for (const c of elecCases) {
    const fuel = detectVehicleFuelType(undefined, c.version, c.model);
    assert.equal(
      fuel,
      "electrique",
      `Échec détection électrique pour ${c.make} ${c.model} (${c.version}). Reçu: ${fuel}`
    );

    const specs = resolveVehicleCatalogSpecs({
      make: c.make,
      model: c.model,
      version: c.version,
    });
    assert.equal(
      specs.fuel,
      "electrique",
      `Échec resolveVehicleCatalogSpecs fuel pour ${c.make} ${c.model} (${c.version}). Reçu: ${specs.fuel}`
    );
  }
  console.log(`  ✔ ${elecCases.length}/${elecCases.length} motorisations Électriques résolues sans faute.`);

  // ---------------------------------------------------------------------------
  // TEST SUITE 4: GPL / ECO-G RESOLUTION (Bicarburation mapped to essence)
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 4] GPL / Eco-G Detection (bicarburation conformément à GEMINI.md)...");
  const gplCases = [
    { version: "1.0 ECO-G 100 ch", model: "Sandero 3", make: "Dacia" },
    { version: "1-0-eco-g-100", model: "Jogger", make: "Dacia" },
    { version: "1.0 TCe 100 GPL", model: "Duster 2", make: "Dacia" },
    { version: "1.0 ECOG 100", model: "Clio 5", make: "Renault" },
  ];

  for (const c of gplCases) {
    const fuel = detectVehicleFuelType(undefined, c.version, c.model);
    assert.equal(
      fuel,
      "essence",
      `GPL doit être mappé sur essence au catalogue. Reçu: ${fuel}`
    );

    const specs = resolveVehicleCatalogSpecs({
      make: c.make,
      model: c.model,
      version: c.version,
    });
    assert.equal(
      specs.fuel,
      "essence",
      `resolveVehicleCatalogSpecs doit résoudre GPL en essence. Reçu: ${specs.fuel}`
    );
  }
  console.log(`  ✔ ${gplCases.length}/${gplCases.length} motorisations GPL/Eco-G résolues en essence.`);

  // ---------------------------------------------------------------------------
  // TEST SUITE 5: ESSENCE RESOLUTION
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 5] Essence Engine Resolution across puretech, tce, tsi, vvt, thp...");
  const petrolCases = [
    { version: "1.2 PureTech 82", model: "208", make: "Peugeot" },
    { version: "1.2 PureTech 100", model: "208-2", make: "Peugeot" },
    { version: "1.2 PureTech 130", model: "308", make: "Peugeot" },
    { version: "0.9 TCe 90", model: "Clio 4", make: "Renault" },
    { version: "1.3 TCe 140", model: "Captur", make: "Renault" },
    { version: "1.0 TSI 95", model: "Polo", make: "Volkswagen" },
    { version: "1.4 TSI 125", model: "Golf 7", make: "Volkswagen" },
    { version: "1.5 TSI 130", model: "Golf 7", make: "Volkswagen" },
    { version: "1.6 VVT 120", model: "Vitara", make: "Suzuki" },
    { version: "1.6 THP 200", model: "208 GTI", make: "Peugeot" },
    { version: "1.2 VTi 82", model: "C3", make: "Citroen" },
  ];

  for (const c of petrolCases) {
    const fuel = detectVehicleFuelType(undefined, c.version, c.model);
    assert.equal(
      fuel,
      "essence",
      `Échec détection essence pour ${c.make} ${c.model} (${c.version}). Reçu: ${fuel}`
    );
  }
  console.log(`  ✔ ${petrolCases.length}/${petrolCases.length} motorisations Essence résolues sans faute.`);

  // ---------------------------------------------------------------------------
  // TEST SUITE 6: DIN POWER EXTRACTION ACROSS BRANDS & EDGE CASES
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 6] Dynamic DIN Power Extraction across diverse version formats...");
  const powerCases = [
    { version: "1-5-bluehdi-100", expected: 100 },
    { version: "1.5 BlueHDi 100 ch", expected: 100 },
    { version: "1.2 PureTech 130 ch", expected: 130 },
    { version: "1.2 PureTech 82 ch", expected: 82 },
    { version: "1-0-eco-g-100", expected: 100 },
    { version: "0-9-tce-90", expected: 90 },
    { version: "1-4-tsi-125", expected: 125 },
    { version: "1.5 blue-dci-115", expected: 115 },
    { version: "2.0 Blue dCi 200 ch EDC", expected: 200 },
    { version: "1.6 VVT 120 ch 2WD", expected: 120 },
    { version: "1.6 16V 112 ch", expected: 112 },
    { version: "1.2 16V 75 ch", expected: 75 },
    { version: "2.0 TDI 150 ch DSG7", expected: 150 },
    { version: "1.5 HSD 100", expected: 100 },
    { version: "1.8 Hybride 140 ch", expected: 140 },
  ];

  for (const p of powerCases) {
    const din = extractVehicleDinPower(p.version);
    assert.equal(
      din,
      p.expected,
      `Puissance DIN erronée pour '${p.version}': attendu ${p.expected}, extrait ${din}`
    );
  }

  const kwCases = [
    { kw: 74, expected: 101 },
    { kw: 96, expected: 131 },
    { kw: 55, expected: 75 },
  ];
  for (const k of kwCases) {
    const din = extractVehicleDinPower(undefined, k.kw);
    assert.equal(
      din,
      k.expected,
      `Conversion kW (${k.kw}) -> DIN erronée: attendu ${k.expected}, calculé ${din}`
    );
  }
  console.log(`  ✔ ${powerCases.length} formats de version + ${kwCases.length} conversions kW validés.`);

  // ---------------------------------------------------------------------------
  // TEST SUITE 7: PEUGEOT MODELS NO LONGER FORCED TO ESSENCE OR 130 CH
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 7] Peugeot Model Verification (No forced essence, no forced 130 ch)...");

  // Peugeot 208-2 1-5-bluehdi-100
  const p208Diesel = resolveVehicleCatalogSpecs({
    make: "Peugeot",
    model: "208-2",
    version: "1-5-bluehdi-100",
  });
  assert.equal(p208Diesel.fuel, "diesel", "Peugeot 208-2 1-5-bluehdi-100 DOIT être diesel!");
  assert.equal(p208Diesel.dinPower, 100, "Peugeot 208-2 1-5-bluehdi-100 DOIT être 100 ch DIN!");
  assert.equal(p208Diesel.boiteVitesse, "manuelle");

  // Peugeot 208 1.2 PureTech 82
  const p208Pt82 = resolveVehicleCatalogSpecs({
    make: "Peugeot",
    model: "208",
    version: "1.2 PureTech 82",
  });
  assert.equal(p208Pt82.fuel, "essence");
  assert.equal(p208Pt82.dinPower, 82, "Peugeot 208 1.2 PureTech 82 DOIT être 82 ch DIN (non 130)!");

  // Peugeot 208 1.2 PureTech 100
  const p208Pt100 = resolveVehicleCatalogSpecs({
    make: "Peugeot",
    model: "208-2",
    version: "1.2 PureTech 100",
  });
  assert.equal(p208Pt100.fuel, "essence");
  assert.equal(p208Pt100.dinPower, 100, "Peugeot 208 1.2 PureTech 100 DOIT être 100 ch DIN!");

  // Peugeot 308 1.2 PureTech 130
  const p308Pt130 = resolveVehicleCatalogSpecs({
    make: "Peugeot",
    model: "308",
    version: "1.2 PureTech 130",
  });
  assert.equal(p308Pt130.fuel, "essence");
  assert.equal(p308Pt130.dinPower, 130);

  // Peugeot 308 1.5 BlueHDi 130
  const p308BlueHdi = resolveVehicleCatalogSpecs({
    make: "Peugeot",
    model: "308",
    version: "1.5 BlueHDi 130",
  });
  assert.equal(p308BlueHdi.fuel, "diesel", "Peugeot 308 BlueHDi DOIT être diesel!");
  assert.equal(p308BlueHdi.dinPower, 130);

  // Peugeot sans version explicite (doit utiliser le fallback 1.2 PureTech 130)
  const p308Default = resolveVehicleCatalogSpecs({
    make: "Peugeot",
    model: "308",
  });
  assert.equal(p308Default.fuel, "essence");
  assert.equal(p308Default.dinPower, 130);
  assert.equal(p308Default.version, "1.2 PureTech 130 ch Allure");

  console.log("  ✔ Tous les modèles Peugeot testés respectent leur motorisation authentique.");

  // ---------------------------------------------------------------------------
  // TEST SUITE 8: TRANSMISSION (boiteVitesse) IS NEVER UNDEFINED
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 8] Transmission Completeness (boiteVitesse NEVER undefined across catalog)...");
  const testMatrix = [
    { make: "Peugeot", model: "208", version: "1.2 PureTech 82" },
    { make: "Peugeot", model: "208-2", version: "1-5-bluehdi-100" },
    { make: "Peugeot", model: "308", version: "1.2 PureTech 130 EAT8" },
    { make: "Dacia", model: "Sandero-3", version: "1-0-eco-g-100" },
    { make: "Dacia", model: "Duster-2", version: "1-5-blue-dci-115" },
    { make: "Dacia", model: "Jogger", version: "1.6 Hybrid 140" },
    { make: "Renault", model: "Clio-4", version: "0-9-tce-90" },
    { make: "Renault", model: "Clio-4", version: "1.2 EDC 120" },
    { make: "Renault", model: "Espace-5", version: "2-0-blue-dci-200" },
    { make: "Suzuki", model: "Vitara", version: "1-6-vvt-120" },
    { make: "Suzuki", model: "Swift", version: "1.2 Dualjet CVT" },
    { make: "Citroen", model: "C3-3", version: "1-2-puretech-83" },
    { make: "Citroen", model: "C4-Picasso", version: "1-6-bluehdi-120" },
    { make: "Citroen", model: "C5 Aircross", version: "1.6 PureTech 180 EAT8" },
    { make: "Volkswagen", model: "Golf-7", version: "1-4-tsi-125" },
    { make: "Volkswagen", model: "Golf-7", version: "2.0 TDI 150 DSG7" },
    { make: "Volkswagen", model: "Polo", version: "1.0 TSI 95" },
    { make: "Toyota", model: "Yaris-3", version: "1-5-hsd-100" },
    { make: "Toyota", model: "Corolla", version: "1.8 Hybride 140 ch" },
    { make: "Toyota", model: "Aygo", version: "1.0 VVT-i 72" },
    { make: "Ford", model: "Focus", version: "1.0 EcoBoost 125" },
    { make: "BMW", model: "Serie 1", version: "118d 150 ch BVA" },
    { make: "Mercedes", model: "Classe A", version: "A200 163 ch 7G-DCT" },
    { make: "Audi", model: "A3", version: "35 TFSI 150 S-Tronic" },
    { make: "Tesla", model: "Model 3", version: "Propulsion 283 ch" },
    { make: undefined, model: undefined, version: undefined },
    { make: "Inconnu", model: "Prototype", version: "V8 450" },
  ];

  for (const item of testMatrix) {
    const specs = resolveVehicleCatalogSpecs(item);
    assert.ok(
      specs.boiteVitesse !== undefined,
      `boiteVitesse est undefined pour make=${item.make}, model=${item.model}, version=${item.version}`
    );
    assert.ok(
      specs.boiteVitesse === "manuelle" ||
        specs.boiteVitesse === "automatique" ||
        specs.boiteVitesse === "robotisee" ||
        specs.boiteVitesse === "variation_continue",
      `boiteVitesse a une valeur invalide: ${specs.boiteVitesse}`
    );
  }
  console.log(`  ✔ ${testMatrix.length}/${testMatrix.length} configurations ont une boîte de vitesses définie et valide.`);

  // ---------------------------------------------------------------------------
  // TEST SUITE 9: BOUNDARY & HOSTILE INPUT RESILIENCE
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 9] Boundary and Hostile Inputs Resilience...");
  const hostileSpecs = resolveVehicleCatalogSpecs({
    make: "'' OR 1=1 --",
    model: "injection_test",
    version: "   \t\n\r  ",
    fuel: "UNKNOWN_FUEL",
  });
  assert.equal(hostileSpecs.fuel, "essence", "Fuel fallback sur essence pour carburant inconnu.");
  assert.ok(hostileSpecs.boiteVitesse === "manuelle", "Boîte fallback sur manuelle.");
  assert.equal(hostileSpecs.imageUrl, null, "Zéro image fake pour marque inconnue.");

  const emptySpecs = resolveVehicleCatalogSpecs({});
  assert.equal(emptySpecs.fuel, "essence");
  assert.ok(emptySpecs.boiteVitesse === "manuelle");
  assert.equal(emptySpecs.imageUrl, null);

  console.log("  ✔ Entrées hostiles et vides absorbées avec dégradation sûre (Zéro fake data).");

  console.log("\n=================================================");
  console.log("🎉 TOUS LES TESTS DE RE-VÉRIFICATION SONT VALIDÉS AVEC SUCCÈS !");
  console.log("=================================================\n");
}

if (require.main === module) {
  try {
    runAdversarialCatalogRev2Tests();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ ÉCHEC DE LA SUITE DE RE-VÉRIFICATION :", err);
    process.exit(1);
  }
}

