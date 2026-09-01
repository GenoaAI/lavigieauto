"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ShieldCheck, CreditCard, ChevronRight, CheckCircle2 } from "lucide-react";
import {
  getHouseholdBillingStatusAction,
  syncHouseholdSubscriptionAction,
  BillingStatusResult,
} from "@/app/actions/billing";
import { SubscriptionModal } from "./SubscriptionModal";

export function SubscriptionBanner() {
  const [billingStatus, setBillingStatus] = useState<BillingStatusResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const refreshStatus = async () => {
    const status = await getHouseholdBillingStatusAction();
    setBillingStatus(status);
  };

  useEffect(() => {
    // Vérifier si retour Stripe Checkout avec session_id ou success=true
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");
      const isSuccess = params.get("success") === "true";

      if (sessionId || isSuccess) {
        syncHouseholdSubscriptionAction(sessionId || undefined).then((res) => {
          if (res.isSubscribed) {
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 8000);
          }
          refreshStatus();
        });

        // Nettoyer l'URL proprement sans rechargement
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
        return;
      }
    }

    refreshStatus();
  }, []);

  if (!billingStatus) return null;

  return (
    <>
      {/* TOAST DE SUCCÈS CONFIRMATION STRIPE */}
      {showSuccessToast && (
        <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 border border-emerald-400/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">Félicitations ! Votre abonnement Foyer Premium est activé.</p>
              <p className="text-xs text-emerald-100">Votre suivi multi-véhicules et vos carnets constructeurs sont désormais débloqués.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSuccessToast(false)}
            className="text-xs font-bold px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition"
          >
            Fermer
          </button>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">
                {billingStatus.cancelAtPeriodEnd
                  ? "Abonnement en cours de résiliation"
                  : billingStatus.isSubscribed
                  ? "Abonnement Foyer Actif"
                  : "Formule Foyer LaVigieAuto"}
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  billingStatus.quotaExceeded
                    ? "bg-rose-500/30 text-rose-200 border border-rose-400/40 animate-pulse"
                    : billingStatus.cancelAtPeriodEnd
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                    : billingStatus.isSubscribed
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-400 text-slate-950"
                }`}
              >
                {billingStatus.quotaExceeded
                  ? `QUOTA ATTEINT (${billingStatus.activeVehicleCount} / ${billingStatus.maxVehicles})`
                  : billingStatus.cancelAtPeriodEnd
                  ? `FIN LE ${billingStatus.currentPeriodEnd ? new Date(billingStatus.currentPeriodEnd).toLocaleDateString("fr-FR") : "ÉCHÉANCE"}`
                  : billingStatus.isSubscribed
                  ? `PREMIUM (${billingStatus.activeVehicleCount} / ${billingStatus.maxVehicles} VÉHICULES)`
                  : "ESSAI / DÉCOUVERTE (1 VÉHICULE MAX)"}
              </span>
            </div>
            <p className="text-xs text-blue-100/80 mt-0.5">
              {billingStatus.quotaExceeded
                ? `Votre abonnement actuel couvre ${billingStatus.maxVehicles} véhicule(s). Ajustez votre formule pour couvrir les ${billingStatus.totalVehicleCount} véhicules de votre foyer.`
                : billingStatus.cancelAtPeriodEnd
                ? `Accès Premium maintenu jusqu'au ${billingStatus.currentPeriodEnd ? new Date(billingStatus.currentPeriodEnd).toLocaleDateString("fr-FR") : "terme"}. Cliquez sur Gérer pour réactiver.`
                : billingStatus.isSubscribed
                ? `Couverture complète de votre foyer • ${billingStatus.activeVehicleCount} véhicule(s) sous surveillance active sur ${billingStatus.maxVehicles} souscrit(s).`
                : "Activez le suivi illimité et la synchronisation Google Calendar à partir de 2,90€ / mois"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-blue-50 text-blue-950 font-bold rounded-xl text-xs shadow-sm transition active:scale-95 shrink-0 self-stretch sm:self-auto justify-center"
        >
          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
          <span>
            {billingStatus.quotaExceeded
              ? "Ajuster mon abonnement"
              : billingStatus.isSubscribed
              ? "Gérer mon abonnement"
              : "Passer en Premium"}
          </span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        billingStatus={billingStatus}
        onSubscriptionSuccess={refreshStatus}
      />
    </>
  );
}
