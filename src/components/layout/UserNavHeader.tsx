"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LogOut, User, Sparkles, ChevronDown, CheckCircle2, Home, Pencil } from "lucide-react";
import { getCurrentUserAction, signOutAction, CurrentUserSummary } from "@/app/actions/auth";
import { getFoyerOverviewAction } from "@/app/actions/foyer";
import { FoyerNameEditor } from "@/components/foyer/FoyerNameEditor";
import { DEFAULT_FOYER_ID } from "@/config/foyer.seed";

export function UserNavHeader() {
  const [user, setUser] = useState<CurrentUserSummary | null>(null);
  const [foyerName, setFoyerName] = useState<string>("Foyer LaVigieAuto");
  const [foyerId, setFoyerId] = useState<string>(DEFAULT_FOYER_ID);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    getCurrentUserAction().then(setUser);
    getFoyerOverviewAction().then((overview) => {
      if (overview?.foyer) {
        setFoyerName(overview.foyer.nom || "Foyer LaVigieAuto");
        setFoyerId(overview.foyer.id || DEFAULT_FOYER_ID);
      }
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOutAction();
  };

  if (!user || !user.isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <FoyerNameEditor
          initialName={foyerName}
          householdId={foyerId}
          variant="header"
          className="hidden sm:inline-flex"
        />
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition"
        >
          Se connecter
        </Link>
        <Link
          href="/#scan-first"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/20 transition active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Scanner</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Badge éditable du Foyer dans le bandeau du haut */}
      <FoyerNameEditor
        initialName={foyerName}
        householdId={foyerId}
        variant="header"
        className="hidden md:inline-flex"
      />

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition shadow-sm"
        >
        {user.picture ? (
          <img src={user.picture} alt={user.name || "Profil"} className="w-7 h-7 rounded-lg object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
            {user.name ? user.name.charAt(0).toUpperCase() : "C"}
          </div>
        )}
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[120px]">{user.name}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[120px]">{user.email}</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 space-y-1">
          <div className="p-2.5 border-b border-slate-100 mb-1">
            <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
            {user.googleConnected && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Google Calendar lié
              </span>
            )}
          </div>

          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition"
          >
            <User className="w-4 h-4 text-slate-400" />
            <span>Mon Espace Foyer</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition text-left"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>{isLoggingOut ? "Déconnexion..." : "Se déconnecter"}</span>
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
