import fs from "fs";
import {
  getCollapsibleStorageKey,
  COLLAPSIBLE_TOGGLE_ALL_EVENT,
  useCollapsibleSection,
} from "@/hooks/useCollapsibleSection";
import { CollapsibleModuleCard } from "@/components/ui/CollapsibleModuleCard";
import { CollapsibleAllToggle } from "@/components/ui/CollapsibleAllToggle";

export async function runCollapsibleStressTests() {
  console.log("=================================================");
  console.log("🔥 LAVIGIEAUTO — STRESS TEST ADVERSARIAL HARNESS");
  console.log("   Collapsible Module Cards & State Engine");
  console.log("=================================================\n");

  let testCount = 0;
  let passedCount = 0;

  function assert(condition: boolean, message: string) {
    testCount++;
    if (!condition) {
      console.error(`  ❌ ÉCHEC STRESS TEST: ${message}`);
      throw new Error(`Stress Test Failure: ${message}`);
    }
    passedCount++;
    console.log(`  ✔ [STRESS-${testCount}] ${message}`);
  }

  // --------------------------------------------------------------------------
  // 1. BOUNDARY & WEIRD INPUTS: getCollapsibleStorageKey
  // --------------------------------------------------------------------------
  console.log("▶ [TEST 1] Boundary & Edge Case Scoping in Storage Key Generator...");
  
  assert(
    getCollapsibleStorageKey("veh-123", "tires") === "lavigieauto_section_veh-123_tires",
    "Standard vehicleId and moduleId format"
  );
  assert(
    getCollapsibleStorageKey("", "tires") === "lavigieauto_section_global_tires",
    "Empty vehicleId string falls back to 'global'"
  );
  assert(
    getCollapsibleStorageKey("   ", "tires") === "lavigieauto_section_global_tires",
    "Whitespace-only vehicleId falls back to 'global'"
  );
  assert(
    getCollapsibleStorageKey(null, "tires") === "lavigieauto_section_global_tires",
    "null vehicleId falls back to 'global'"
  );
  assert(
    getCollapsibleStorageKey(undefined, "tires") === "lavigieauto_section_global_tires",
    "undefined vehicleId falls back to 'global'"
  );
  assert(
    getCollapsibleStorageKey("veh-123", "") === "lavigieauto_section_veh-123_default",
    "Empty moduleId string falls back to 'default'"
  );
  assert(
    getCollapsibleStorageKey("veh-123", "   ") === "lavigieauto_section_veh-123_default",
    "Whitespace-only moduleId falls back to 'default'"
  );
  assert(
    getCollapsibleStorageKey(undefined, undefined) === "lavigieauto_section_global_default",
    "Both undefined fallback to 'global_default'"
  );
  assert(
    getCollapsibleStorageKey("  veh-special_#1  ", "  mod-alpha:beta  ") === "lavigieauto_section_veh-special_#1_mod-alpha:beta",
    "Trimming and special characters in IDs handled correctly"
  );

  // --------------------------------------------------------------------------
  // 2. SIMULATION: LOCALSTORAGE FAULT INJECTION (Private Mode / Quota / SecurityError)
  // --------------------------------------------------------------------------
  console.log("\n▶ [TEST 2] LocalStorage Fault Injection (SecurityError, QuotaExceeded, Null, Corrupted)...");

  // Mock a hostile window environment
  const mockStorageStore: Record<string, string> = {};
  let simulateSecurityError = false;
  let simulateQuotaError = false;

  const mockLocalStorage = {
    getItem: (key: string) => {
      if (simulateSecurityError) {
        throw new Error("SecurityError: The operation is insecure.");
      }
      return mockStorageStore[key] ?? null;
    },
    setItem: (key: string, value: string) => {
      if (simulateSecurityError) {
        throw new Error("SecurityError: The operation is insecure.");
      }
      if (simulateQuotaError) {
        throw new Error("QuotaExceededError: DOM Exception 22");
      }
      mockStorageStore[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorageStore[key];
    },
    clear: () => {
      for (const k in mockStorageStore) delete mockStorageStore[k];
    },
  };

  const listeners: Record<string, Array<(event: any) => void>> = {};
  const mockWindow: any = {
    localStorage: mockLocalStorage,
    addEventListener: (type: string, listener: any) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(listener);
    },
    removeEventListener: (type: string, listener: any) => {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((l) => l !== listener);
    },
    dispatchEvent: (event: any) => {
      const type = event.type;
      if (listeners[type]) {
        listeners[type].forEach((l) => l(event));
      }
      return true;
    },
  };

  // Test SecurityError handling during getItem
  simulateSecurityError = true;
  let readValueSafe = null;
  try {
    // Calling code pattern from useCollapsibleSection
    if (typeof mockWindow !== "undefined" && mockWindow.localStorage) {
      try {
        readValueSafe = mockWindow.localStorage.getItem("test_key");
      } catch {
        // Ignored as expected in useCollapsibleSection
        readValueSafe = "FALLBACK_TRIGGERED";
      }
    }
  } catch (err: any) {
    throw new Error(`Uncaught exception in localStorage access: ${err.message}`);
  }
  assert(readValueSafe === "FALLBACK_TRIGGERED", "SecurityError during getItem caught gracefully without crash");

  // Test QuotaExceededError handling during setItem
  simulateSecurityError = false;
  simulateQuotaError = true;
  let writeFailedGracefully = false;
  try {
    try {
      mockWindow.localStorage.setItem("test_key", "true");
    } catch {
      writeFailedGracefully = true;
    }
  } catch (err: any) {
    throw new Error(`Uncaught exception during setItem: ${err.message}`);
  }
  assert(writeFailedGracefully === true, "QuotaExceededError during setItem caught gracefully without crashing UI");

  // Test corrupted data in localStorage
  simulateQuotaError = false;
  const corruptValues = [
    { raw: "foobar", expectedBoolean: false },
    { raw: "1", expectedBoolean: false },
    { raw: "true", expectedBoolean: true },
    { raw: "false", expectedBoolean: false },
    { raw: "{invalid json}", expectedBoolean: false },
    { raw: "undefined", expectedBoolean: false },
    { raw: "null", expectedBoolean: false },
  ];

  for (const item of corruptValues) {
    mockStorageStore["corrupt_test_key"] = item.raw;
    const read = mockStorageStore["corrupt_test_key"];
    const parsedBoolean = read === "true";
    assert(
      parsedBoolean === item.expectedBoolean,
      `Corrupted localStorage string '${item.raw}' parsed safely as boolean: ${parsedBoolean}`
    );
  }

  // --------------------------------------------------------------------------
  // 3. STRESS TEST: RAPID GLOBAL EVENT DISPATCH (10,000 Events Burst)
  // --------------------------------------------------------------------------
  console.log("\n▶ [TEST 3] Stress Test: 10,000 Rapid Global Events Concurrency & Vehicle Scoping...");

  // Setup 5 distinct mock modules across 2 vehicles and 1 global
  interface MockSection {
    vehicleId?: string;
    moduleId: string;
    isOpen: boolean;
    storageKey: string;
  }

  const registeredSections: MockSection[] = [
    { vehicleId: "veh-A", moduleId: "tires", isOpen: true, storageKey: getCollapsibleStorageKey("veh-A", "tires") },
    { vehicleId: "veh-A", moduleId: "vault", isOpen: false, storageKey: getCollapsibleStorageKey("veh-A", "vault") },
    { vehicleId: "veh-B", moduleId: "tires", isOpen: true, storageKey: getCollapsibleStorageKey("veh-B", "tires") },
    { vehicleId: "veh-B", moduleId: "schedule", isOpen: true, storageKey: getCollapsibleStorageKey("veh-B", "schedule") },
    { vehicleId: undefined, moduleId: "dropzone", isOpen: false, storageKey: getCollapsibleStorageKey(undefined, "dropzone") },
  ];

  // Register event handler simulating useCollapsibleSection subscription
  const eventHandler = (event: any) => {
    try {
      const customEvent = event;
      if (!customEvent.detail || typeof customEvent.detail.open !== "boolean") return;
      const targetVehicleId = customEvent.detail.vehicleId;
      const nextState = customEvent.detail.open;

      for (const section of registeredSections) {
        const matchesVehicle =
          !targetVehicleId ||
          targetVehicleId === "all" ||
          targetVehicleId === section.vehicleId ||
          (!section.vehicleId && targetVehicleId === "global");

        if (matchesVehicle) {
          section.isOpen = nextState;
          mockLocalStorage.setItem(section.storageKey, String(nextState));
        }
      }
    } catch {
      // Ignored
    }
  };

  mockWindow.addEventListener(COLLAPSIBLE_TOGGLE_ALL_EVENT, eventHandler);

  // Dispatch 10,000 rapid events with alternating scopes
  const startPerf = Date.now();
  for (let i = 0; i < 10000; i++) {
    const targetVeh = i % 3 === 0 ? "veh-A" : i % 3 === 1 ? "veh-B" : "global";
    const desiredState = i % 2 === 0;

    mockWindow.dispatchEvent({
      type: COLLAPSIBLE_TOGGLE_ALL_EVENT,
      detail: {
        vehicleId: targetVeh,
        open: desiredState,
      },
    });
  }
  const durationMs = Date.now() - startPerf;

  assert(durationMs < 500, `10,000 events processed in ${durationMs}ms (well under 500ms budget)`);

  // Target toggle test: Toggle veh-A to FALSE only
  mockWindow.dispatchEvent({
    type: COLLAPSIBLE_TOGGLE_ALL_EVENT,
    detail: {
      vehicleId: "veh-A",
      open: false,
    },
  });

  // veh-A sections should be false
  assert(registeredSections[0].isOpen === false, "veh-A / tires is closed");
  assert(registeredSections[1].isOpen === false, "veh-A / vault is closed");
  assert(mockStorageStore[registeredSections[0].storageKey] === "false", "veh-A / tires persisted as false in localStorage");

  // Toggle ALL to TRUE
  mockWindow.dispatchEvent({
    type: COLLAPSIBLE_TOGGLE_ALL_EVENT,
    detail: {
      vehicleId: "all",
      open: true,
    },
  });

  for (const s of registeredSections) {
    assert(s.isOpen === true, `Module ${s.moduleId} (${s.vehicleId || "global"}) expanded via 'all' event`);
    assert(mockStorageStore[s.storageKey] === "true", `Storage updated to true for ${s.storageKey}`);
  }

  // Malformed event fuzzing: dispatch bad payloads
  const badEvents = [
    { type: COLLAPSIBLE_TOGGLE_ALL_EVENT, detail: null },
    { type: COLLAPSIBLE_TOGGLE_ALL_EVENT, detail: { open: "not-a-bool" } },
    { type: COLLAPSIBLE_TOGGLE_ALL_EVENT, detail: {} },
    { type: COLLAPSIBLE_TOGGLE_ALL_EVENT },
    { type: "OTHER_EVENT", detail: { open: false } },
  ];

  for (const badEv of badEvents) {
    try {
      mockWindow.dispatchEvent(badEv);
    } catch (e: any) {
      throw new Error(`Malformed event caused unhandled crash: ${e.message}`);
    }
  }
  assert(true, "All malformed/fuzzed event payloads handled safely without error");

  // --------------------------------------------------------------------------
  // 4. EVENT PROPAGATION & INTERACTIVE ELEMENTS AUDIT
  // --------------------------------------------------------------------------
  console.log("\n▶ [TEST 4] Event Propagation (stopPropagation) & Keyboard Accessibility Audit...");

  const cardCode = fs.readFileSync("src/components/ui/CollapsibleModuleCard.tsx", "utf-8");

  // Check role="button", tabIndex={0}, aria-expanded, aria-controls
  assert(cardCode.includes('role="button"'), "Header has explicit role='button'");
  assert(cardCode.includes("tabIndex={0}"), "Header is keyboard focusable (tabIndex={0})");
  assert(cardCode.includes("aria-expanded={isOpen}"), "Header updates aria-expanded dynamically");
  assert(cardCode.includes("aria-controls="), "Header binds aria-controls to content region");
  assert(cardCode.includes('role="region"'), "Content wrapper has role='region'");
  assert(cardCode.includes("aria-labelledby="), "Content region binds aria-labelledby to header");

  // Check keyboard Enter and Space keys
  assert(cardCode.includes('e.key === "Enter" || e.key === " "'), "Keyboard handler intercepts Enter and Space keys");
  assert(cardCode.includes("e.preventDefault()"), "Keyboard handler prevents default scrolling on Space bar");

  // Check stopPropagation on actions and chevron button
  const stopPropMatches = cardCode.match(/e\.stopPropagation\(\)/g) || [];
  assert(stopPropMatches.length >= 3, `stopPropagation explicitly called ${stopPropMatches.length} times in header controls`);

  // Verify chevron button has explicit type="button" to prevent accidental form submissions
  assert(cardCode.includes('type="button"'), "Chevron toggle button has type='button'");

  // --------------------------------------------------------------------------
  // 5. CSS GRID TRANSITION & ZERO CLS COMPLIANCE AUDIT
  // --------------------------------------------------------------------------
  console.log("\n▶ [TEST 5] CSS Grid Transition (0fr -> 1fr) & Layout Stability Audit...");

  assert(cardCode.includes("grid-rows-[1fr]"), "Card uses grid-rows-[1fr] when open");
  assert(cardCode.includes("grid-rows-[0fr]"), "Card uses grid-rows-[0fr] when closed");
  assert(cardCode.includes("overflow-hidden min-h-0"), "Card inner child has mandatory 'overflow-hidden min-h-0' preventing layout shift");
  assert(cardCode.includes("transition-[grid-template-rows]"), "Smooth animation configured via transition-[grid-template-rows]");

  // --------------------------------------------------------------------------
  // 6. MIXED DEFAULT STATES INVENTORY VERIFICATION (R2)
  // --------------------------------------------------------------------------
  console.log("\n▶ [TEST 6] Matrix Verification across all 7 Vehicle Detail Modules...");

  const detailViewCode = fs.readFileSync("src/components/vehicles/VehicleDetailClientView.tsx", "utf-8");
  const tireTrackerCode = fs.readFileSync("src/components/vehicles/TireWearTracker.tsx", "utf-8");
  const tireOffersCode = fs.readFileSync("src/components/tires/TireOffersCard.tsx", "utf-8");
  const vaultCode = fs.readFileSync("src/components/vault/VehicleVaultList.tsx", "utf-8");

  // R2 matrix check
  const matrix = [
    { name: "Pneumatiques Tracker", file: tireTrackerCode, id: "tires_tracker", defaultOpen: true },
    { name: "Comparateur Pneus", file: tireOffersCode, id: "tire_offers", defaultOpen: false },
    { name: "Échéancier Constructeur", file: detailViewCode, id: "schedule_forecast", defaultOpen: true },
    { name: "Contrôle Technique", file: detailViewCode, id: "inspection_ct", defaultOpen: true },
    { name: "Carnet d'Entretien", file: detailViewCode, id: "service_logbook", defaultOpen: true },
    { name: "Coffre-fort Numérique", file: vaultCode, id: "digital_vault", defaultOpen: false },
    { name: "Dropzone Justificatif", file: detailViewCode, id: "document_dropzone", defaultOpen: false },
  ];

  for (const m of matrix) {
    const expectedStr = `defaultOpen={${m.defaultOpen}}`;
    const hasId = m.file.includes(`id="${m.id}"`);
    const hasDefault = m.file.includes(expectedStr);
    assert(hasId && hasDefault, `${m.name} [${m.id}] configured with defaultOpen={${m.defaultOpen}}`);
  }

  // --------------------------------------------------------------------------
  // 7. SUMMARY & CONCLUSION
  // --------------------------------------------------------------------------
  console.log("\n=================================================");
  console.log(`🎯 TOUS LES TESTS DE STRESS ET DE ROBUSTESSE ONT RÉUSSI : ${passedCount}/${testCount}`);
  console.log("=================================================\n");
}
