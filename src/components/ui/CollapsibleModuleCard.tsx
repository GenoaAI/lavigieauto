"use client";

import React, { useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { useCollapsibleSection } from "@/hooks/useCollapsibleSection";

export { useCollapsibleSection, getCollapsibleStorageKey } from "@/hooks/useCollapsibleSection";

export interface CollapsibleModuleCardProps {
  /** Unique module identifier for storage key scoping (e.g. "tires_tracker", "schedule_forecast") */
  id: string;
  /** Vehicle identifier for per-vehicle persistence */
  vehicleId?: string;
  /** Card primary title */
  title: string;
  /** Optional subtitle or descriptive text */
  subtitle?: string;
  /** Optional leading icon element */
  icon?: React.ReactNode;
  /** Tailwind background and text classes for the icon container (e.g. "bg-amber-50 text-amber-600") */
  iconBgColor?: string;
  /** Permanent synthetic badge rendered in header, visible in both open & closed states */
  badge?: React.ReactNode;
  /** Action buttons rendered in header (protected with stopPropagation) */
  actions?: React.ReactNode;
  /** Default open state on first visit (defaults to true) */
  defaultOpen?: boolean;
  /** Controlled open state (optional) */
  isOpen?: boolean;
  /** Controlled toggle callback (optional) */
  onToggle?: (isOpen: boolean) => void;
  /** Additional classes for outer card container */
  className?: string;
  /** Additional classes for card header */
  headerClassName?: string;
  /** Additional classes for card body */
  bodyClassName?: string;
  /** Content displayed when card is unfolded */
  children: React.ReactNode;
}

export function CollapsibleModuleCard({
  id,
  vehicleId,
  title,
  subtitle,
  icon,
  iconBgColor = "bg-slate-100 text-slate-700",
  badge,
  actions,
  defaultOpen = true,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  children,
}: CollapsibleModuleCardProps) {
  // Use internal hook if uncontrolled, otherwise follow controlled props
  const isControlled = typeof controlledIsOpen === "boolean";
  const internalHook = useCollapsibleSection({
    vehicleId,
    moduleId: id,
    defaultOpen,
  });

  const isOpen = isControlled ? controlledIsOpen : internalHook.isOpen;

  const handleHeaderToggle = useCallback(() => {
    if (isControlled) {
      controlledOnToggle?.(!controlledIsOpen);
    } else {
      internalHook.toggle();
    }
  }, [isControlled, controlledIsOpen, controlledOnToggle, internalHook]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleHeaderToggle();
      }
    },
    [handleHeaderToggle]
  );

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm transition-shadow hover:shadow-md ${className}`}
      data-module-id={id}
      data-open={isOpen}
    >
      {/* Clickable Header */}
      <div
        id={`collapsible-header-${id}`}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${id}`}
        onClick={handleHeaderToggle}
        onKeyDown={handleKeyDown}
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl p-1 -m-1 ${headerClassName}`}
      >
        {/* Left: Icon + Title + Subtitle */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          {icon && (
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105 ${iconBgColor}`}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors truncate">
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Permanent Badge + Actions Slot + Animated Chevron */}
        <div
          className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0 flex-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Permanent Informative Summary Badge (Visible opened & closed) */}
          {badge && (
            <div className="flex items-center">
              {badge}
            </div>
          )}

          {/* Action buttons slot (clicks protected via stopPropagation) */}
          {actions && (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          )}

          {/* Animated Toggle Chevron Button */}
          <button
            type="button"
            aria-label={isOpen ? `Replier ${title}` : `Déplier ${title}`}
            onClick={(e) => {
              e.stopPropagation();
              handleHeaderToggle();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-300 ease-in-out ${
                isOpen ? "rotate-180 text-indigo-600" : "text-slate-400"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Pure CSS Grid Transition Container (0fr -> 1fr) for Zero CLS */}
      <div
        id={`collapsible-content-${id}`}
        role="region"
        aria-labelledby={`collapsible-header-${id}`}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        {/* Direct child wrapper with overflow-hidden & min-h-0 is mandatory for CLS = 0 */}
        <div className="overflow-hidden min-h-0">
          <div className={bodyClassName || "pt-5 border-t border-slate-100 mt-3"}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollapsibleModuleCard;
