"use client";

import { useState, useEffect, useCallback } from "react";

export const COLLAPSIBLE_TOGGLE_ALL_EVENT = "lavigieauto_toggle_all_sections";

export function getCollapsibleStorageKey(vehicleId?: string | null, moduleId?: string): string {
  const vScope = vehicleId && vehicleId.trim().length > 0 ? vehicleId.trim() : "global";
  const mScope = moduleId && moduleId.trim().length > 0 ? moduleId.trim() : "default";
  return `lavigieauto_section_${vScope}_${mScope}`;
}

export interface UseCollapsibleSectionOptions {
  vehicleId?: string;
  moduleId: string;
  defaultOpen?: boolean;
}

export interface UseCollapsibleSectionReturn {
  isOpen: boolean;
  isHydrated: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

export function useCollapsibleSection(
  optionsOrVehicleId: UseCollapsibleSectionOptions | string | undefined,
  moduleIdParam?: string | boolean,
  defaultOpenParam?: boolean
): UseCollapsibleSectionReturn {
  // Normalize options for object or positional parameter styles
  let vehicleId: string | undefined;
  let moduleId: string;
  let defaultOpen = true;

  if (typeof optionsOrVehicleId === "object" && optionsOrVehicleId !== null) {
    vehicleId = optionsOrVehicleId.vehicleId;
    moduleId = optionsOrVehicleId.moduleId;
    if (typeof optionsOrVehicleId.defaultOpen === "boolean") {
      defaultOpen = optionsOrVehicleId.defaultOpen;
    }
  } else {
    vehicleId = typeof optionsOrVehicleId === "string" ? optionsOrVehicleId : undefined;
    if (typeof moduleIdParam === "string") {
      moduleId = moduleIdParam;
      if (typeof defaultOpenParam === "boolean") {
        defaultOpen = defaultOpenParam;
      }
    } else {
      moduleId = "default";
      if (typeof moduleIdParam === "boolean") {
        defaultOpen = moduleIdParam;
      }
    }
  }

  const [isOpen, setIsOpenState] = useState<boolean>(defaultOpen);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const storageKey = getCollapsibleStorageKey(vehicleId, moduleId);

  // 1. Initial synchronization with localStorage after hydration (SSR-Safe)
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem(storageKey);
        if (saved !== null) {
          setIsOpenState(saved === "true");
        } else {
          setIsOpenState(defaultOpen);
        }
      }
    } catch {
      // Ignore localStorage access errors (e.g. private browsing mode)
    } finally {
      setIsHydrated(true);
    }
  }, [storageKey, defaultOpen]);

  // 2. Global Event Listener for "Tout Déplier / Tout Replier"
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleGlobalToggle = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<{ vehicleId?: string; open: boolean }>;
        if (!customEvent.detail || typeof customEvent.detail.open !== "boolean") return;

        const targetVehicleId = customEvent.detail.vehicleId;
        const matchesVehicle =
          !targetVehicleId ||
          targetVehicleId === "all" ||
          targetVehicleId === vehicleId ||
          (!vehicleId && targetVehicleId === "global");

        if (matchesVehicle) {
          const nextState = customEvent.detail.open;
          setIsOpenState(nextState);
          try {
            if (typeof window !== "undefined" && window.localStorage) {
              window.localStorage.setItem(storageKey, String(nextState));
            }
          } catch {
            // Ignore
          }
        }
      } catch {
        // Ignore malformed custom event
      }
    };

    window.addEventListener(COLLAPSIBLE_TOGGLE_ALL_EVENT, handleGlobalToggle);
    return () => {
      window.removeEventListener(COLLAPSIBLE_TOGGLE_ALL_EVENT, handleGlobalToggle);
    };
  }, [storageKey, vehicleId]);

  // 3. Setter function updating state and localStorage
  const setOpen = useCallback(
    (open: boolean) => {
      setIsOpenState(open);
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(storageKey, String(open));
        }
      } catch {
        // Ignore
      }
    },
    [storageKey]
  );

  // 4. Toggle function flipping state and updating localStorage
  const toggle = useCallback(() => {
    setIsOpenState((prev) => {
      const next = !prev;
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(storageKey, String(next));
        }
      } catch {
        // Ignore
      }
      return next;
    });
  }, [storageKey]);

  return {
    isOpen,
    isHydrated,
    toggle,
    setOpen,
  };
}
