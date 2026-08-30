"use client";

import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { FoyerMember, Vehicule } from "@/lib/types/database.types";
import type { EnrichedVehicle } from "@/app/actions/vehicles";
import { inviteHouseholdMemberAction } from "@/app/actions/foyer";

interface FoyerMembersManagerProps {
  members: FoyerMember[];
  vehicles: (Vehicule | EnrichedVehicle)[];
  householdId?: string;
}

export function FoyerMembersManager({
  members: initialMembers,
  vehicles,
  householdId = "foyer-default",
}: FoyerMembersManagerProps) {
  const [membersList, setMembersList] = useState<FoyerMember[]>(initialMembers || []);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "member">("member");
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEmailInfo, setShowEmailInfo] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await inviteHouseholdMemberAction(householdId, inviteEmail.trim(), selectedRole);

      if (res.success) {
        setSuccessMsg(res.message);
        if (res.member) {
          setMembersList((prev) => [...prev, res.member!]);
        }
        setInviteEmail("");
        setTimeout(() => setSuccessMsg(null), 8000);
      } else {
        setErrorMsg(res.message || "Impossible d'envoyer l'invitation.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur inattendue est survenue.");
    } finally {
      setIsSending(false);
    }
  };

  const getProviderBadge = (email: string) => {
    const domain = email.split("@")[1]?.toLowerCase() || "";
    if (domain.includes("yahoo")) {
      return { label: "Yahoo", bg: "bg-purple-100 text-purple-800 border-purple-200" };
    }
    if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live")) {
      return { label: "Outlook", bg: "bg-sky-100 text-sky-800 border-sky-200" };
    }
    if (domain.includes("gmail") || domain.includes("google")) {
      return { label: "Google", bg: "bg-red-50 text-red-700 border-red-200" };
    }
    if (domain.includes("orange") || domain.includes("wanadoo")) {
      return { label: "Orange", bg: "bg-amber-100 text-amber-800 border-amber-200" };
    }
    if (domain.includes("icloud") || domain.includes("me.com") || domain.includes("mac.com")) {
      return { label: "Apple", bg: "bg-slate-100 text-slate-800 border-slate-300" };
    }
    if (domain.includes("proton")) {
      return { label: "Proton", bg: "bg-indigo-100 text-indigo-800 border-indigo-200" };
    }
    return { label: domain || "Webmail", bg: "bg-slate-100 text-slate-700 border-slate-200" };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Conducteurs du Foyer</h3>
            <p className="text-xs text-slate-500">
              Partagez les alertes et synchronisez les agendas de chaque conducteur (Google, Yahoo, Outlook, Apple...).
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
          {membersList.length} membre(s)
        </span>
      </div>

      {/* Liste des membres */}
      <div className="divide-y divide-slate-100">
        {membersList.map((m) => {
          const meta = (m as any).metadata || {};
          const displayName =
            meta.name || (m.role === "owner" ? "Gestionnaire principal" : "Conducteur Invité");
          const displayEmail = meta.email || "";
          const isInvited = meta.status === "invited";
          const provider = getProviderBadge(displayEmail);
          const initials =
            displayName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 3)
              .toUpperCase() || "GP";

          return (
            <div key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-800 font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                    {m.role === "owner" && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md font-semibold border border-amber-200">
                        Gestionnaire principal
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-medium border ${provider.bg}`}>
                      {provider.label}
                    </span>
                    {isInvited && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded-md font-semibold border border-blue-200 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        Invitation en attente
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5 truncate">
                    <span className="truncate">{displayEmail}</span>
                    <span className="text-[10px] text-emerald-600 font-sans font-medium shrink-0">
                      • Agenda compatible
                    </span>
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-xs text-slate-500 font-medium capitalize bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                {m.role === "owner" ? "Propriétaire" : m.role === "admin" ? "Administrateur" : "Conducteur"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Formulaire d'invitation avec support universel explicite */}
      <form onSubmit={handleInvite} className="pt-3 border-t space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-800">
            Inviter un nouveau conducteur au foyer :
          </label>
          <button
            type="button"
            onClick={() => setShowEmailInfo(!showEmailInfo)}
            className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 underline transition"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Tous webmails acceptés</span>
          </button>
        </div>

        {/* Encadré d'information et de réassurance */}
        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-900 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Fonctionne avec n'importe quelle adresse email : Google, Yahoo, Outlook, Orange, iCloud, Proton...</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed pl-5">
            L'invité recevra un lien d'activation sécurisé compatible avec tous les webmails. Il pourra configurer son mot de passe ou se connecter sans restriction de domaine, et exporter les rendez-vous sur son agenda favori.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="ex: marie.dupont@yahoo.fr ou conjoint@outlook.com"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
              required
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="member">Conducteur (Lecture & Agenda)</option>
            <option value="admin">Administrateur (Gestion complète)</option>
          </select>
          <button
            type="submit"
            disabled={isSending || !inviteEmail.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 shadow-sm shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {isSending ? "Envoi en cours..." : "Envoyer l'invitation"}
          </button>
        </div>

        {successMsg && (
          <div className="text-xs text-emerald-800 font-medium bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-start gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Invitation enregistrée</p>
              <p className="text-[11.5px] leading-relaxed text-emerald-700">{successMsg}</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="text-xs text-rose-800 font-medium bg-rose-50 p-3 rounded-xl border border-rose-200 flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Échec de l'envoi</p>
              <p className="text-[11.5px] leading-relaxed text-rose-700">{errorMsg}</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
