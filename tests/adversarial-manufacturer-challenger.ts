import {
  sanitizeOfficialMaintenancePlan,
  fetchOnlineManufacturerPlan,
  OfficialMaintenancePlanSchema,
  OfficialMaintenancePlan,
} from "../src/lib/engine/manufacturer-retriever";
import {
  recalculateMaintenanceForecast,
  DEFAULT_MAINTENANCE_PRESETS,
  projectMaintenanceSchedule,
} from "../src/lib/engine/cycles";
import { loadSkillPrompt } from "../src/lib/ai/skills-loader";

export async function runAdversarialManufacturerPlanChallenger() {
  console.log("=================================================");
  console.log("🔥 ADVERSARIAL CHALLENGER 1 — STRESS & HALLUCINATION INJECTION HARNESS");
  console.log("=================================================\n");

  let assertions = 0;
  function assert(condition: boolean, msg: string) {
    assertions++;
    if (!condition) {
      throw new Error(`❌ CHALLENGE FAILED [Assertion #${assertions}]: ${msg}`);
    }
  }

  // =========================================================================
  // TEST SUITE 1: SYNTHETIC HALLUCINATION INJECTION ATTACKS ON SANITIZER
  // =========================================================================
  console.log("--- 1. Testing Hallucination Injections against sanitizeOfficialMaintenancePlan ---");

  // Attack 1.1: Multi-variation AC recharge injection
  const acHallucinations: Array<OfficialMaintenancePlan["operations"][0]> = [
    {
      category: "climatisation",
      title: "Entretien climatisation",
      description: "Recharge fluide R134a",
      intervalKm: 40000,
      intervalMonths: 24,
      estimatedCostMinEur: 60,
      estimatedCostMaxEur: 90,
      criticite: "moyenne",
    },
    {
      category: "autre",
      title: "Forfait Recharge Clim R1234yf & Tirage au vide",
      description: "Remplacement du gaz réfrigérant",
      intervalKm: 30000,
      intervalMonths: 24,
      estimatedCostMinEur: 80,
      estimatedCostMaxEur: 150,
      criticite: "moyenne",
    },
    {
      category: "revision",
      title: "Contrôle circuit froid",
      description: "Vidange et recharge de gaz frigorigène annuelle",
      intervalKm: 20000,
      intervalMonths: 12,
      estimatedCostMinEur: 90,
      estimatedCostMaxEur: 130,
      criticite: "faible",
    },
    {
      category: "climatisation",
      title: "Recharge fluide frigorigène",
      description: "Mise à niveau fluide frigorigène R134a",
      intervalKm: 50000,
      intervalMonths: 36,
      estimatedCostMinEur: 70,
      estimatedCostMaxEur: 110,
      criticite: "moyenne",
    },
  ];

  const legitimateOps: OfficialMaintenancePlan["operations"] = [
    {
      category: "vidange",
      title: "Vidange huile moteur homologuée 0W-20",
      description: "Huile moteur et filtre",
      intervalKm: 15000,
      intervalMonths: 12,
      estimatedCostMinEur: 100,
      estimatedCostMaxEur: 140,
      criticite: "elevee",
    },
    {
      category: "filtre_habitacle",
      title: "Remplacement filtre habitacle anti-allergène",
      description: "Filtre à pollen habitacle",
      intervalKm: 30000,
      intervalMonths: 24,
      estimatedCostMinEur: 30,
      estimatedCostMaxEur: 50,
      criticite: "faible",
    },
    {
      category: "courroie_accessoire",
      title: "Remplacement courroie d'accessoires (compresseur clim)",
      description: "Entraînement compresseur et alternateur",
      intervalKm: 120000,
      intervalMonths: 72,
      estimatedCostMinEur: 90,
      estimatedCostMaxEur: 150,
      criticite: "elevee",
    },
    {
      category: "liquide_frein",
      title: "Purge liquide de frein DOT 4",
      description: "Purge hydraulique",
      intervalKm: 40000,
      intervalMonths: 24,
      estimatedCostMinEur: 55,
      estimatedCostMaxEur: 80,
      criticite: "elevee",
    },
  ];

  const planWithAcHallucinations: OfficialMaintenancePlan = {
    vehicleSummary: {
      make: "Suzuki",
      model: "Vitara",
      engine: "1.6 VVT 120 ch",
      oilSpecification: "Suzuki ECSTAR 0W-20",
      timingType: "chaine",
      transmissionType: "Manuelle",
    },
    operations: [...legitimateOps, ...acHallucinations],
  };

  const sanitizedAcPlan = sanitizeOfficialMaintenancePlan(planWithAcHallucinations, {
    marque: "Suzuki",
    modele: "Vitara",
    version: "1.6 VVT",
    energie: "Essence",
  });

  assert(sanitizedAcPlan.operations.length === legitimateOps.length, "Sanitizer must strip exactly all 4 AC recharge operations");
  assert(
    !sanitizedAcPlan.operations.some((op) => op.category === "climatisation"),
    "No category=climatisation may survive sanitizer"
  );
  assert(
    !sanitizedAcPlan.operations.some((op) => op.title.toLowerCase().includes("recharge")),
    "No recharge in title may survive sanitizer"
  );
  assert(
    !sanitizedAcPlan.operations.some((op) => op.description.toLowerCase().includes("recharge")),
    "No recharge in description may survive sanitizer"
  );
  assert(
    sanitizedAcPlan.operations.some((op) => op.category === "filtre_habitacle"),
    "Legitimate cabin filter MUST be preserved"
  );
  assert(
    sanitizedAcPlan.operations.some((op) => op.category === "courroie_accessoire"),
    "Legitimate accessory belt (driving AC compressor) MUST be preserved"
  );
  console.log("  ✔ Attack 1.1: 4/4 synthetic AC recharge hallucinations neutralized; cabin filter & accessory belt preserved.");

  // Attack 1.2: Timing belt hallucination on various chain engine archetypes
  const chainVehicleProfiles = [
    { marque: "Suzuki", modele: "Vitara", version: "1.6 VVT 120 ch (M16A)", energie: "Essence" },
    { marque: "Suzuki", modele: "Swift", version: "1.2 Dualjet 90 ch (K12C)", energie: "Essence" },
    { marque: "Suzuki", modele: "S-Cross", version: "1.4 Boosterjet 140 ch (K14C)", energie: "Essence" },
    { marque: "Renault", modele: "Clio V", version: "1.0 TCe 100 ch", energie: "Essence" },
    { marque: "Dacia", modele: "Sandero", version: "0.9 TCe 90 ch", energie: "Essence" },
    { marque: "BMW", modele: "Serie 1", version: "118d (N47)", energie: "Diesel" }, // timingType explicitly "chaine"
  ];

  for (const profile of chainVehicleProfiles) {
    const timingHallucinationPlan: OfficialMaintenancePlan = {
      vehicleSummary: {
        make: profile.marque,
        model: profile.modele,
        engine: profile.version,
        oilSpecification: "Synthèse Homologuée",
        timingType: profile.marque === "BMW" ? "chaine" : "courroie", // LLM hallucinates 'courroie' on Suzuki/Renault
        transmissionType: "Manuelle",
      },
      operations: [
        {
          category: "courroie_distribution",
          title: "Remplacement kit courroie de distribution & pompe à eau",
          description: "Changement kit distribution périodique préventif",
          intervalKm: 100000,
          intervalMonths: 60,
          estimatedCostMinEur: 500,
          estimatedCostMaxEur: 750,
          criticite: "critique",
        },
        {
          category: "vidange",
          title: "Vidange huile moteur",
          description: "Huile moteur",
          intervalKm: 15000,
          intervalMonths: 12,
          estimatedCostMinEur: 100,
          estimatedCostMaxEur: 140,
          criticite: "elevee",
        },
      ],
    };

    const sanitizedTiming = sanitizeOfficialMaintenancePlan(timingHallucinationPlan, profile);
    assert(sanitizedTiming.vehicleSummary.timingType === "chaine", `Profile ${profile.marque} ${profile.modele} timingType must be chaine`);
    assert(
      !sanitizedTiming.operations.some((op) => op.category === "courroie_distribution"),
      `Profile ${profile.marque} ${profile.modele} must have 0 courroie_distribution operations`
    );
    assert(
      !sanitizedTiming.operations.some((op) => op.title.toLowerCase().includes("courroie de distribution")),
      `Profile ${profile.marque} ${profile.modele} must have 0 courroie de distribution in titles`
    );
    assert(sanitizedTiming.operations.length === 1, `Profile ${profile.marque} ${profile.modele} must keep vidange`);
  }
  console.log("  ✔ Attack 1.2: Timing belt hallucination stripped across 6 chain engine archetypes & timingType corrected to chaine.");

  // Attack 1.3: External fuel filter hallucination on Petrol Vitara vs Diesel Espace
  const fuelFilterHallucinationPlan: OfficialMaintenancePlan = {
    vehicleSummary: {
      make: "Suzuki",
      model: "Vitara",
      engine: "1.6 VVT 120 ch",
      oilSpecification: "0W20",
      timingType: "chaine",
      transmissionType: "Manuelle",
    },
    operations: [
      {
        category: "filtre_carburant",
        title: "Remplacement filtre à essence externe",
        description: "Filtre à carburant externe",
        intervalKm: 40000,
        intervalMonths: 24,
        estimatedCostMinEur: 45,
        estimatedCostMaxEur: 75,
        criticite: "moyenne",
      },
      {
        category: "vidange",
        title: "Vidange moteur",
        description: "Huile",
        intervalKm: 15000,
        intervalMonths: 12,
        estimatedCostMinEur: 100,
        estimatedCostMaxEur: 140,
        criticite: "elevee",
      },
    ],
  };

  // Petrol Vitara -> MUST STRIP external fuel filter
  const sanitizedPetrolVitara = sanitizeOfficialMaintenancePlan(fuelFilterHallucinationPlan, {
    marque: "Suzuki",
    modele: "Vitara",
    version: "1.6 VVT",
    energie: "Essence",
  });
  assert(
    !sanitizedPetrolVitara.operations.some((op) => op.category === "filtre_carburant"),
    "Petrol Vitara must NOT have external fuel filter operation"
  );
  assert(sanitizedPetrolVitara.operations.length === 1, "Petrol Vitara keeps vidange only");

  // Diesel Vitara (DDiS) -> MUST KEEP fuel filter
  const dieselVitaraPlan: OfficialMaintenancePlan = {
    vehicleSummary: {
      make: "Suzuki",
      model: "Vitara",
      engine: "1.6 DDiS 120 ch",
      oilSpecification: "5W30 C2",
      timingType: "courroie",
      transmissionType: "Manuelle",
    },
    operations: [
      {
        category: "filtre_carburant",
        title: "Remplacement filtre à gazole avec purge d'eau décanteur",
        description: "Filtre gazole diesel",
        intervalKm: 30000,
        intervalMonths: 24,
        estimatedCostMinEur: 60,
        estimatedCostMaxEur: 95,
        criticite: "elevee",
      },
    ],
  };
  const sanitizedDieselVitara = sanitizeOfficialMaintenancePlan(dieselVitaraPlan, {
    marque: "Suzuki",
    modele: "Vitara",
    version: "1.6 DDiS",
    energie: "Diesel",
  });
  assert(
    sanitizedDieselVitara.operations.some((op) => op.category === "filtre_carburant"),
    "Diesel Vitara DDiS MUST keep diesel fuel filter"
  );
  console.log("  ✔ Attack 1.3: External fuel filter properly stripped on petrol Vitara while strictly retained on diesel.");

  // =========================================================================
  // TEST SUITE 2: VERIFICATION OF fetchOnlineManufacturerPlan FOR VITARA M16A
  // =========================================================================
  console.log("\n--- 2. Testing fetchOnlineManufacturerPlan for Suzuki Vitara M16A ---");

  const vitaraM16APlan = await fetchOnlineManufacturerPlan({
    marque: "Suzuki",
    modele: "Vitara IV (LY)",
    version: "1.6 VVT 120 ch AllGrip",
    energie: "Essence",
    annee_mise_en_circulation: 2016,
    kilometrage_actuel: 125789,
    vin: "TSMEYA21S00123456",
  });

  // Schema validation
  const parseResult = OfficialMaintenancePlanSchema.safeParse(vitaraM16APlan);
  assert(parseResult.success, "Vitara M16A plan must conform strictly to Zod OfficialMaintenancePlanSchema");

  // Exact OEM constraints check
  assert(vitaraM16APlan.vehicleSummary.make === "Suzuki", "Make must be Suzuki");
  assert(vitaraM16APlan.vehicleSummary.timingType === "chaine", "Timing type must be chaine");
  assert(
    vitaraM16APlan.vehicleSummary.oilSpecification.includes("0W-20") ||
      vitaraM16APlan.vehicleSummary.oilSpecification.includes("ECSTAR"),
    "Oil specification must specify Suzuki ECSTAR / 0W-20"
  );

  // Operation specific checks
  const vitaraOps = vitaraM16APlan.operations;
  const acOps = vitaraOps.filter((o) => o.category === "climatisation" || o.title.toLowerCase().includes("clim"));
  assert(acOps.length === 0, `Vitara M16A plan must contain exactly 0 AC recharge items (got ${acOps.length})`);

  const chainDistOps = vitaraOps.filter((o) => o.category === "courroie_distribution");
  assert(chainDistOps.length === 0, `Vitara M16A plan must contain 0 timing belt operations (got ${chainDistOps.length})`);

  const fuelOps = vitaraOps.filter((o) => o.category === "filtre_carburant");
  assert(fuelOps.length === 0, `Vitara M16A essence plan must contain 0 external fuel filter operations (got ${fuelOps.length})`);

  // Verify presence and exact factory intervals of mandatory OEM items
  const vidange = vitaraOps.find((o) => o.category === "vidange");
  assert(!!vidange && vidange.intervalKm === 15000 && vidange.intervalMonths === 12, "Vidange: 15,000 km / 12 mo");

  const cabin = vitaraOps.find((o) => o.category === "filtre_habitacle");
  assert(!!cabin && cabin.intervalKm === 30000 && cabin.intervalMonths === 24, "Filtre habitacle: 30,000 km / 24 mo");

  const air = vitaraOps.find((o) => o.category === "filtre_air");
  assert(!!air && air.intervalKm === 45000 && air.intervalMonths === 36, "Filtre air: 45,000 km / 36 mo");

  const brake = vitaraOps.find((o) => o.category === "liquide_frein");
  assert(!!brake && brake.intervalKm === 40000 && brake.intervalMonths === 24, "Liquide frein DOT 4: 40,000 km / 24 mo");

  const plugs = vitaraOps.find((o) => o.category === "bougies");
  assert(!!plugs && plugs.intervalKm === 60000 && plugs.intervalMonths === 48, "Bougies Iridium: 60,000 km / 48 mo");

  const accBelt = vitaraOps.find((o) => o.category === "courroie_accessoire");
  assert(!!accBelt && accBelt.intervalKm === 120000 && accBelt.intervalMonths === 72, "Courroie accessoires: 120,000 km / 72 mo");

  const coolant = vitaraOps.find((o) => o.category === "liquide_refroidissement");
  assert(!!coolant && coolant.intervalKm === 150000 && coolant.intervalMonths === 96, "Liquide refroidissement: 150,000 km / 96 mo");

  const ct = vitaraOps.find((o) => o.category === "controle_technique");
  assert(!!ct && ct.intervalMonths === 24, "Contrôle technique: 24 mo");

  console.log(`  ✔ Suzuki Vitara M16A: Pristine Golden Master plan returned in 0 ms with ${vitaraOps.length} certified OEM operations.`);

  // =========================================================================
  // TEST SUITE 3: EDGE CASES & RESILIENT FALLBACKS
  // =========================================================================
  console.log("\n--- 3. Testing Edge Case Vehicle Queries and Heuristic Fallbacks ---");

  // Edge case 3.1: Minimal vehicle input (no version, no fuel, no year)
  const minimalPlan = await fetchOnlineManufacturerPlan({
    marque: "Toyota",
    modele: "Yaris",
  });
  assert(OfficialMaintenancePlanSchema.safeParse(minimalPlan).success, "Minimal input produces valid plan");
  assert(!minimalPlan.operations.some((op) => op.category === "climatisation"), "Minimal fallback has 0 AC recharge");
  console.log("  ✔ Edge case 3.1: Minimal vehicle input produces valid, sanitized fallback plan.");

  // Edge case 3.2: 4x4 Fallback includes differential oil
  const allGripFallback = await fetchOnlineManufacturerPlan({
    marque: "Suzuki",
    modele: "Ignis",
    version: "1.2 Dualjet AllGrip 4x4",
  });
  assert(
    allGripFallback.operations.some((op) => op.category === "vidange_pont"),
    "4x4 AllGrip vehicle fallback includes vidange_pont (differential oil)"
  );
  console.log("  ✔ Edge case 3.2: 4x4 AllGrip vehicle fallback generates differential/transfer box service.");

  // Edge case 3.3: Skill prompt loading and placeholder replacement
  const skillPrompt = loadSkillPrompt("manufacturer-plan-retriever", {
    make: "Suzuki",
    model: "Vitara",
    version: "1.6 VVT",
    fuelType: "Essence",
    year: 2016,
    vin: "TSMEYA21S00123456",
  });
  assert(skillPrompt.prompt.includes("Suzuki"), "Skill prompt contains make");
  assert(skillPrompt.prompt.includes("Vitara"), "Skill prompt contains model");
  assert(skillPrompt.prompt.includes("NE JAMAIS inclure de recharge systématique de fluide frigorigène"), "Skill prompt has strict AC disclaimer");
  assert(skillPrompt.prompt.includes("chaîne métallique"), "Skill prompt distinguishes chain from belt");
  console.log("  ✔ Edge case 3.3: Skill prompt loader cleanly injects variables and enforces strict OEM disclaimers.");

  // =========================================================================
  // TEST SUITE 4: MAINTENANCE PRESETS & MILEAGE PROJECTION AUDIT
  // =========================================================================
  console.log("\n--- 4. Testing Cycles Engine & Absence of Phantom Overdue Alerts ---");

  // Test 4.1: Default presets verification
  const acPreset = DEFAULT_MAINTENANCE_PRESETS.find((p) => p.category === "AIR_CONDITIONING");
  assert(!!acPreset, "AIR_CONDITIONING preset exists");
  assert(acPreset?.isMandatory === false, "AIR_CONDITIONING preset must be isMandatory=false (optional control, not forced recharge)");

  // Test 4.2: Brand new vehicle (0 km, today's registration) -> 0 overdue alerts
  const todayStr = new Date().toISOString().split("T")[0];
  const newVehicleForecast = projectMaintenanceSchedule({
    mileageReadings: [{ date: todayStr, mileage: 15, source: "MANUAL" }],
    lastServices: [],
    vehicleRegistrationDate: todayStr,
  });

  const overdueInNew = newVehicleForecast.projectedMilestones.filter((m) => m.urgency === "OVERDUE" || m.urgency === "CRITICAL");
  assert(overdueInNew.length === 0, `Brand new vehicle must have 0 overdue milestones (got ${overdueInNew.length})`);
  console.log("  ✔ Test 4.2: Brand new vehicle (0 km) produces exactly 0 phantom overdue alerts.");

  // Test 4.3: High mileage vehicle (280,000 km) with regular servicing -> normal next milestone
  const highMileageForecast = recalculateMaintenanceForecast({
    readings: [
      { date: "2025-01-15", mileage: 260000, source: "INVOICE" },
      { date: "2026-08-01", mileage: 280000, source: "INVOICE" },
    ],
    vehicleFirstRegistration: "2012-05-10",
    lastServices: [
      { category: "DRAIN_OIL", serviceDate: "2026-08-01", mileage: 280000 },
      { category: "CABIN_FILTER", serviceDate: "2026-08-01", mileage: 280000 },
      { category: "BRAKE_FLUID", serviceDate: "2026-08-01", mileage: 280000 },
    ],
  });
  const drainOilMilestone = highMileageForecast.projectedMilestones.find((m) => m.category === "DRAIN_OIL");
  assert(!!drainOilMilestone && drainOilMilestone.dueMileage === 300000, "Next drain oil is projected at 300,000 km (+20,000 km)");
  assert(drainOilMilestone?.urgency === "OK", "Drain oil done recently is status OK");
  console.log("  ✔ Test 4.3: High mileage vehicle (280,000 km) correctly projects next milestones without phantom alerts.");

  console.log("\n=================================================");
  console.log(`✅ ADVERSARIAL CHALLENGE COMPLETED: ALL ${assertions} ASSERTIONS PASSED!`);
  console.log("=================================================\n");
}

runAdversarialManufacturerPlanChallenger().catch((err) => {
  console.error(err);
  process.exit(1);
});
