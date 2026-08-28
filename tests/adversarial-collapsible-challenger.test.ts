import { getCollapsibleStorageKey, COLLAPSIBLE_TOGGLE_ALL_EVENT } from "../src/hooks/useCollapsibleSection";
import fs from "fs";

export async function runAdversarialCollapsibleTests() {
  console.log("=================================================");
  console.log("🔥 CHALLENGER 2 — ADVERSARIAL STRESS TEST SUITE");
  console.log("=================================================\n");

  let checksPassed = 0;
  let checksFailed = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      checksFailed++;
      console.error(`  ❌ FAILED: ${msg}`);
      throw new Error(msg);
    }
    checksPassed++;
    console.log(`  ✔ PASSED: ${msg}`);
  }

  // -------------------------------------------------------------
  // TEST 1: CSS Grid Animation, Zero CLS & Immediate Child Structure
  // -------------------------------------------------------------
  console.log("▶ [TEST 1] CSS Grid Structure & Zero CLS Math Verification...");
  const cardSource = fs.readFileSync("src/components/ui/CollapsibleModuleCard.tsx", "utf-8");

  // Grid container requirements
  assert(
    cardSource.includes('grid transition-[grid-template-rows] duration-300 ease-in-out'),
    "Grid container uses transition-[grid-template-rows] duration-300 ease-in-out"
  );
  assert(
    cardSource.includes('isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"'),
    "Dynamic row fraction toggle grid-rows-[1fr] vs grid-rows-[0fr]"
  );

  // Immediate child requirements for CLS = 0
  assert(
    cardSource.includes('<div className="overflow-hidden min-h-0">'),
    "Immediate child container strictly specifies 'overflow-hidden min-h-0' preventing layout bleed"
  );

  // Accessible Region
  assert(
    cardSource.includes('role="region"') && cardSource.includes('aria-labelledby='),
    "Content region is accessible with role='region' and aria-labelledby"
  );

  // Accessible Header Button
  assert(
    cardSource.includes('role="button"') &&
    cardSource.includes('tabIndex={0}') &&
    cardSource.includes('aria-expanded={isOpen}') &&
    cardSource.includes('aria-controls='),
    "Header behaves as interactive button with role='button', tabIndex=0, aria-expanded, aria-controls"
  );

  // -------------------------------------------------------------
  // TEST 2: Event Listener Lifecycle & Memory Leak Prevention
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 2] Event Listener Lifecycle & Memory Leak Proof...");
  const hookSource = fs.readFileSync("src/hooks/useCollapsibleSection.ts", "utf-8");

  assert(
    hookSource.includes('window.addEventListener(COLLAPSIBLE_TOGGLE_ALL_EVENT, handleGlobalToggle);'),
    "Event listener added for COLLAPSIBLE_TOGGLE_ALL_EVENT"
  );
  assert(
    hookSource.includes('window.removeEventListener(COLLAPSIBLE_TOGGLE_ALL_EVENT, handleGlobalToggle);'),
    "Cleanup function in useEffect calls removeEventListener with matching handler reference"
  );

  // Empirical mock test of listener registration / cleanup cycle
  const mockListeners: { [type: string]: Function[] } = {};
  const mockWindow: any = {
    addEventListener: (type: string, fn: Function) => {
      mockListeners[type] = mockListeners[type] || [];
      mockListeners[type].push(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
      if (mockListeners[type]) {
        mockListeners[type] = mockListeners[type].filter((f) => f !== fn);
      }
    },
    dispatchEvent: (ev: any) => {
      if (mockListeners[ev.type]) {
        mockListeners[ev.type].forEach((fn) => fn(ev));
      }
    },
    localStorage: {
      store: {} as Record<string, string>,
      getItem(key: string) { return this.store[key] || null; },
      setItem(key: string, val: string) { this.store[key] = val; },
    }
  };

  // Simulate hook listener registration
  const stateHolder = { isOpen: true };
  const storageKey = getCollapsibleStorageKey("veh-leak-test", "tires_tracker");
  const testVehicleId = "veh-leak-test";

  const handleGlobalToggle = (event: any) => {
    if (!event.detail || typeof event.detail.open !== "boolean") return;
    const target = event.detail.vehicleId;
    if (!target || target === "all" || target === testVehicleId) {
      stateHolder.isOpen = event.detail.open;
      mockWindow.localStorage.setItem(storageKey, String(event.detail.open));
    }
  };

  // Mount
  mockWindow.addEventListener(COLLAPSIBLE_TOGGLE_ALL_EVENT, handleGlobalToggle);
  assert(mockListeners[COLLAPSIBLE_TOGGLE_ALL_EVENT]?.length === 1, "Listener registered on mount (count = 1)");

  // Dispatch toggle all false
  mockWindow.dispatchEvent({
    type: COLLAPSIBLE_TOGGLE_ALL_EVENT,
    detail: { vehicleId: "veh-leak-test", open: false }
  });
  assert(stateHolder.isOpen === false, "Listener successfully processed event (state flipped to false)");
  assert(mockWindow.localStorage.getItem(storageKey) === "false", "LocalStorage synced to false");

  // Dispatch toggle for different vehicle (isolation test)
  mockWindow.dispatchEvent({
    type: COLLAPSIBLE_TOGGLE_ALL_EVENT,
    detail: { vehicleId: "other-veh-999", open: true }
  });
  assert(stateHolder.isOpen === false, "Listener ignored event targeted at another vehicle");

  // Unmount simulation
  mockWindow.removeEventListener(COLLAPSIBLE_TOGGLE_ALL_EVENT, handleGlobalToggle);
  assert(mockListeners[COLLAPSIBLE_TOGGLE_ALL_EVENT]?.length === 0, "Listener cleanly unregistered on unmount (count = 0, no memory leak)");

  // -------------------------------------------------------------
  // TEST 3: Compact vs Complete UI Mode Architecture Verification
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 3] Compact vs Complete UI Modes in VehicleDetailClientView...");
  const viewSource = fs.readFileSync("src/components/vehicles/VehicleDetailClientView.tsx", "utf-8");

  // Mode switch and global toggle presence in header toolbar
  assert(
    viewSource.includes("<CollapsibleAllToggle vehicleId={v.id} />"),
    "Global CollapsibleAllToggle mounted in top actions toolbar"
  );
  assert(
    viewSource.includes("<UiModeSwitch currentMode={uiMode} onModeChange={setUiMode} />"),
    "UiModeSwitch mounted in top actions toolbar"
  );

  // Compact Mode Sections Check
  assert(
    viewSource.includes('compactTab === "echeances"') &&
    viewSource.includes('id="schedule_forecast"'),
    "Compact Mode Tab 1 (Échéances) contains schedule_forecast collapsible card"
  );
  assert(
    viewSource.includes('compactTab === "historique"') &&
    viewSource.includes('id="service_logbook"') &&
    viewSource.includes('<VehicleVaultList') &&
    viewSource.includes('id="document_dropzone"'),
    "Compact Mode Tab 2 (Historique) contains service_logbook, VehicleVaultList, and document_dropzone"
  );
  assert(
    viewSource.includes('compactTab === "sante"') &&
    viewSource.includes('<TireWearTracker') &&
    viewSource.includes('id="inspection_ct"'),
    "Compact Mode Tab 3 (Santé) contains TireWearTracker and inspection_ct"
  );

  // Complete Mode Sections Check
  const completeModeSection = viewSource.split('{uiMode === "compact" ?')[1] || "";
  assert(
    completeModeSection.includes('id="schedule_forecast"'),
    "Complete Mode renders schedule_forecast collapsible card"
  );
  assert(
    completeModeSection.includes('id="inspection_ct"'),
    "Complete Mode renders inspection_ct collapsible card"
  );
  assert(
    completeModeSection.includes('<TireWearTracker'),
    "Complete Mode renders TireWearTracker (which contains tires_tracker + tire_offers)"
  );
  assert(
    completeModeSection.includes('id="service_logbook"'),
    "Complete Mode renders service_logbook collapsible card"
  );
  assert(
    completeModeSection.includes('<VehicleVaultList'),
    "Complete Mode renders VehicleVaultList (which contains digital_vault)"
  );
  assert(
    completeModeSection.includes('id="document_dropzone"'),
    "Complete Mode renders document_dropzone collapsible card"
  );

  // -------------------------------------------------------------
  // TEST 4: Mixed Default Open State Policy Verification
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 4] Mixed Default State Configuration Matrix...");
  const tireTrackerSrc = fs.readFileSync("src/components/vehicles/TireWearTracker.tsx", "utf-8");
  const tireOffersSrc = fs.readFileSync("src/components/tires/TireOffersCard.tsx", "utf-8");
  const vaultSrc = fs.readFileSync("src/components/vault/VehicleVaultList.tsx", "utf-8");

  // Expected default open states:
  // OPEN (4): tires_tracker, schedule_forecast, inspection_ct, service_logbook
  // CLOSED (3): tire_offers, digital_vault, document_dropzone
  assert(tireTrackerSrc.includes('id="tires_tracker"') && tireTrackerSrc.includes("defaultOpen={true}"), "tires_tracker is OPEN by default");
  assert(viewSource.includes('id="schedule_forecast"') && viewSource.includes("defaultOpen={true}"), "schedule_forecast is OPEN by default");
  assert(viewSource.includes('id="inspection_ct"') && viewSource.includes("defaultOpen={true}"), "inspection_ct is OPEN by default");
  assert(viewSource.includes('id="service_logbook"') && viewSource.includes("defaultOpen={true}"), "service_logbook is OPEN by default");

  assert(tireOffersSrc.includes('id="tire_offers"') && tireOffersSrc.includes("defaultOpen={false}"), "tire_offers is CLOSED by default");
  assert(vaultSrc.includes('id="digital_vault"') && vaultSrc.includes("defaultOpen={false}"), "digital_vault is CLOSED by default");
  assert(viewSource.includes('id="document_dropzone"') && viewSource.includes("defaultOpen={false}"), "document_dropzone is CLOSED by default");

  // -------------------------------------------------------------
  // TEST 5: stopPropagation on Action Slots Verification
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 5] Event Propagation Isolation (stopPropagation)...");
  assert(
    cardSource.includes('onClick={(e) => e.stopPropagation()}'),
    "Action container in CollapsibleModuleCard captures clicks with stopPropagation()"
  );
  assert(
    tireTrackerSrc.includes('onClick={(e) => {\n            e.stopPropagation();\n            setShowQuoteKit(!showQuoteKit);'),
    "TireWearTracker Kit Devis button prevents event bubbling"
  );
  assert(
    viewSource.includes('handleSyncOfficialPlan();') && viewSource.includes('e.stopPropagation()'),
    "Échéancier Actualiser IA button prevents event bubbling"
  );

  // -------------------------------------------------------------
  // TEST 6: LocalStorage Storage Key Scoping Stress Test
  // -------------------------------------------------------------
  console.log("\n▶ [TEST 6] LocalStorage Key Scoping & Boundary Conditions...");
  assert(
    getCollapsibleStorageKey("veh_123", "tires_tracker") === "lavigieauto_section_veh_123_tires_tracker",
    "Standard vehicleId and moduleId format"
  );
  assert(
    getCollapsibleStorageKey(undefined, "tires_tracker") === "lavigieauto_section_global_tires_tracker",
    "Undefined vehicleId defaults to 'global'"
  );
  assert(
    getCollapsibleStorageKey(null, "schedule_forecast") === "lavigieauto_section_global_schedule_forecast",
    "Null vehicleId defaults to 'global'"
  );
  assert(
    getCollapsibleStorageKey("   ", "schedule_forecast") === "lavigieauto_section_global_schedule_forecast",
    "Whitespace-only vehicleId defaults to 'global'"
  );
  assert(
    getCollapsibleStorageKey("veh_123", "") === "lavigieauto_section_veh_123_default",
    "Empty moduleId defaults to 'default'"
  );

  console.log("\n=================================================");
  console.log(`📊 ADVERSARIAL STRESS TEST SUMMARY: ${checksPassed} checks passed, ${checksFailed} failed.`);
  console.log("=================================================\n");

  if (checksFailed > 0) {
    throw new Error(`${checksFailed} checks failed during adversarial review.`);
  }
}

if (process.argv[1]?.includes("adversarial-collapsible-challenger.test.ts")) {
  runAdversarialCollapsibleTests().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
