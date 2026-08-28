"use client";

import React, { useState, useCallback } from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { COLLAPSIBLE_TOGGLE_ALL_EVENT } from "@/hooks/useCollapsibleSection";

export interface CollapsibleAllToggleProps {
  vehicleId?: string;
  className?: string;
  onToggleAll?: (open: boolean) => void;
}

export function CollapsibleAllToggle({
  vehicleId,
  className = "",
  onToggleAll,
}: CollapsibleAllToggleProps) {
  const [allExpanded, setAllExpanded] = useState<boolean>(false);

  const handleToggle = useCallback(() => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);

    // Dispatch global custom event (lavigieauto_toggle_all_sections)
    if (typeof window !== "undefined") {
      const event = new CustomEvent(COLLAPSIBLE_TOGGLE_ALL_EVENT, {
        detail: {
          vehicleId: vehicleId || "global",
          open: nextState,
        },
      });
      window.dispatchEvent(event);
    }

    onToggleAll?.(nextState);
  }, [allExpanded, vehicleId, onToggleAll]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={allExpanded ? "Tout replier les sections" : "Tout déplier les sections"}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 shadow-xs transition-all active:scale-95 ${className}`}
    >
      {allExpanded ? (
        <>
          <ChevronsDownUp className="w-3.5 h-3.5 text-indigo-600" />
          <span>Tout replier</span>
        </>
      ) : (
        <>
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
          <span>Tout déplier</span>
        </>
      )}
    </button>
  );
}

export default CollapsibleAllToggle;
