"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ShieldCheck, CreditCard, ChevronRight } from "lucide-react";
import { getHouseholdBillingStatusAction, BillingStatusResult } from "@/app/actions/billing";
import { SubscriptionModal } from "./SubscriptionModal";

export function SubscriptionBanner() {
  const [billingStatus, setBillingStatus] = useState<BillingStatusResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    getHouseholdBillingStatusAction().then(setBillingStatus);
  }, []);

  if (!billingStatus) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">
                {billingStatus.isSubscribed ? "Abonnement Foyer Actif" : "Formule Foyer LaVigieAuto"}
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  billingStatus.isSubscribed
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-400 text-slate-950"
                }`}
              >
                {billingStatus.isSubscribed ? "PREMIUM" : "ESSAI / DÉCOUVERTE"}
              </span>
            </div>
            <p className="text-xs text-blue-100/80 mt-0.5">
              {billingStatus.isSubscribed
                ? `Couverture complète de vos ${billingStatus.vehicleCount} véhicules • Prochaine facture gérée via Stripe`
                : `Activez le suivi illimité et la synchronisation Google Calendar pour ${billingStatus.monthlyPriceEur.toFixed(2)} €/mois`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-blue-50 text-blue-950 font-bold rounded-xl text-xs shadow-sm transition active:scale-95 shrink-0 self-stretch sm:self-auto justify-center"
        >
          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
          <span>{billingStatus.isSubscribed ? "Gérer mon abonnement" : "Passer en Premium"}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        billingStatus={billingStatus}
      />
    </>
  );
}
