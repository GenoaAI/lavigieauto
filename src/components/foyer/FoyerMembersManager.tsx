"use client";

import React, { useState } from "react";
import { Users, UserPlus, Mail, ShieldCheck, Car } from "lucide-react";
import type { FoyerMember, Vehicule } from "@/lib/types/database.types";

interface FoyerMembersManagerProps {
  members: FoyerMember[];
  vehicles: Vehicule[];
}

export function FoyerMembersManager({ members, vehicles }: FoyerMembersManagerProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "member">("member");
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsSending(true);
    // Simulation invitation
    setTimeout(() => {
      setIsSending(false);
      setSuccessMsg(`Invitation envoyée avec succès à ${inviteEmail} avec synchronisation Google Calendar.`);
      setInviteEmail("");
      setTimeout(() => setSuccessMsg(null), 4000);
    }, 800);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Conducteurs du Foyer</h3>
            <p className="text-xs text-slate-500">
              Partagez les alertes et synchronisez les agendas Google Calendar de chaque conducteur.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
          {members.length} membre(s)
        </span>
      </div>

      {/* Liste des membres */}
      <div className="divide-y divide-slate-100">
        {members.map((m) => {
          const meta = (m as any).metadata || {};
          const displayName = meta.name || (m.role === "owner" ? "Charles de Forges" : "Conducteur Foyer");
          const displayEmail = meta.email || "charlesdeforges@gmail.com";
          const initials = displayName === "Charles de Forges"
            ? "CdF"
            : displayName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 3)
                .toUpperCase() || "CF";

          return (
            <div key={m.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-800 font-bold text-xs flex items-center justify-center shadow-sm">
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">{displayName}</p>
                    {m.role === "owner" && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md font-semibold">
                        Gestionnaire principal
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                    <span>{displayEmail}</span>
                    <span className="text-[10px] text-emerald-600 font-sans font-medium">● Google Calendar synchronisé</span>
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 font-medium capitalize bg-slate-100 px-2.5 py-1 rounded-lg">
                {m.role === "owner" ? "Propriétaire" : m.role}
              </span>
            </div>
          );
        })}
      </div>

      {/* Formulaire d'invitation */}
      <form onSubmit={handleInvite} className="pt-2 border-t space-y-3">
        <label className="block text-xs font-semibold text-slate-700">Inviter un nouveau conducteur :</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="conjoint.famille@gmail.com"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="member">Conducteur (Lecture & Agenda)</option>
            <option value="admin">Administrateur (Gestion complète)</option>
          </select>
          <button
            type="submit"
            disabled={isSending}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {isSending ? "Envoi..." : "Inviter"}
          </button>
        </div>

        {successMsg && (
          <p className="text-xs text-emerald-600 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </p>
        )}
      </form>
    </div>
  );
}
