"use client";

import React, { useState } from "react";
import { Sparkles, Check, ShieldCheck, CreditCard, ArrowRight, X, Loader2, ExternalLink } from "lucide-react";
import { calculateHouseholdSubscriptionPrice } from "@/lib/integrations/stripe/pricing";
import { createCheckoutSessionAction, createCustomerPortalAction, BillingStatusResult } from "@/app/actions/billing";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  billingStatus: BillingStatusResult;
  onSubscriptionSuccess?: () => void;
}

export function SubscriptionModal({ isOpen, onClose, billingStatus }: SubscriptionModalProps) {
  const [interval, setInterval] = useState<"month" | "year">("year");
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleCount, setVehicleCount] = useState(billingStatus.vehicleCount || 1);

  if (!isOpen) return null;

  const pricing = calculateHouseholdSubscriptionPrice(vehicleCount);
  const displayedPrice = interval === "year" ? pricing.annualTotalEur : pricing.monthlyTotalEur;
  const equivalentMonthly = interval === "year" ? (pricing.annualTotalEur / 12).toFixed(2) : pricing.monthlyTotalEur.toFixed(2);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const res = await createCheckoutSessionAction({ interval, vehicleCount });
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        alert(res.error || "Une erreur est survenue lors de l'ouverture du paiement.");
      }
    } catch {
      alert("Impossible de contacter Stripe.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    setIsLoading(true);
    try {
      const res = await createCustomerPortalAction();
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        alert(res.error || "Aucun portail client disponible.");
      }
    } catch {
      alert("Erreur portail de facturation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto space-y-6">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-black text-slate-950 tracking-tight">
            Formule Foyer Premium
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
            Pilotez toute la flotte familiale en toute sérénité au meilleur tarif.
          </p>
        </div>

        {/* IF ALREADY SUBSCRIBED */}
        {billingStatus.isSubscribed ? (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
              <Check className="w-4 h-4" />
              Abonnement Foyer Actif
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              Votre foyer bénéficie de toutes les fonctionnalités illimitées (carnet constructeur, Google Calendar et scripts de négociation).
            </p>
            {billingStatus.portalAvailable && (
              <button
                type="button"
                onClick={handleOpenPortal}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-100/60 transition"
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Gérer ma carte et mes factures</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <>
            {/* BILLING TOGGLE (MONTHLY VS ANNUAL) */}
            <div className="flex items-center justify-center p-1 bg-slate-100 rounded-2xl max-w-xs mx-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setInterval("month")}
                className={`flex-1 py-2 rounded-xl transition ${
                  interval === "month" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setInterval("year")}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1 ${
                  interval === "year" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Annuel</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black">
                  -17%
                </span>
              </button>
            </div>

            {/* VEHICLE COUNT SELECTOR */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Véhicules dans votre foyer</span>
                <span className="text-[11px] text-slate-500">Tarif dégressif automatique</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVehicleCount(Math.max(1, vehicleCount - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 transition flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-6 text-center font-extrabold text-sm text-slate-900">{vehicleCount}</span>
                <button
                  type="button"
                  onClick={() => setVehicleCount(vehicleCount + 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 transition flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* PRICE DISPLAY */}
            <div className="p-5 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200/70 rounded-2xl text-center space-y-1">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-4xl font-black text-slate-950">{displayedPrice.toFixed(2)} €</span>
                <span className="text-xs font-semibold text-slate-500">
                  {interval === "year" ? "/ an" : "/ mois"}
                </span>
              </div>
              {interval === "year" && (
                <p className="text-[11px] font-semibold text-blue-700">
                  Soit seulement <strong>{equivalentMonthly} € / mois</strong> (2 mois offerts)
                </p>
              )}
            </div>

            {/* FEATURES CHECKLIST */}
            <div className="space-y-2.5 text-xs text-slate-700">
              {[
                `Suivi prédictif complet de vos ${vehicleCount} véhicule${vehicleCount > 1 ? "s" : ""}`,
                "Plans officiels constructeurs (selon moteur, énergie et usage)",
                "Regroupement intelligent d'atelier (Smart Bundling anti-surcoût)",
                "Synchronisation Google Calendar partagée (rappels J-30 & J-7)",
                "Script garage avec guide d'appel mot à mot",
                "Coffre-fort illimité pour toutes les factures et contrôles techniques",
                "Certificat officiel de revente horodaté avec score de santé A+",
              ].map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* CTA CHECKOUT BUTTON */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Démarrer mon abonnement sécurisé</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-slate-400">
              Paiement sécurisé via Stripe. Sans engagement, résiliable à tout moment en 1 clic.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
