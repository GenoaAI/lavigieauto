"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Check,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  X,
  Loader2,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Undo2,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import { calculateHouseholdSubscriptionPrice } from "@/lib/integrations/stripe/pricing";
import {
  createCheckoutSessionAction,
  createCustomerPortalAction,
  cancelHouseholdSubscriptionAction,
  resumeHouseholdSubscriptionAction,
  BillingStatusResult,
} from "@/app/actions/billing";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  billingStatus: BillingStatusResult;
  onSubscriptionSuccess?: () => void;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  billingStatus,
  onSubscriptionSuccess,
}: SubscriptionModalProps) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleCount, setVehicleCount] = useState(billingStatus.vehicleCount || 1);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const pricing = calculateHouseholdSubscriptionPrice(vehicleCount);
  const displayedPrice = interval === "year" ? pricing.annualTotalEur : pricing.monthlyTotalEur;
  const equivalentMonthly =
    interval === "year"
      ? (pricing.annualTotalEur / 12).toFixed(2)
      : pricing.monthlyTotalEur.toFixed(2);

  const formattedPeriodEnd = billingStatus.currentPeriodEnd
    ? new Date(billingStatus.currentPeriodEnd).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "la prochaine échéance";

  const handleCheckout = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await createCheckoutSessionAction({ interval, vehicleCount });
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        setActionMessage({ type: "error", text: res.error || "Une erreur est survenue lors de l'ouverture du paiement." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Impossible de contacter Stripe." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await createCustomerPortalAction();
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        setActionMessage({ type: "error", text: res.error || "Aucun portail client Stripe disponible." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Erreur lors de l'ouverture du portail de facturation." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async (immediate: boolean = false) => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await cancelHouseholdSubscriptionAction({ immediate });
      if (res.success) {
        setActionMessage({ type: "success", text: res.message });
        setShowCancelConfirm(false);
        if (onSubscriptionSuccess) onSubscriptionSuccess();
      } else {
        setActionMessage({ type: "error", text: res.message || "Impossible de résilier l'abonnement." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Erreur inattendue." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await resumeHouseholdSubscriptionAction();
      if (res.success) {
        setActionMessage({ type: "success", text: res.message });
        if (onSubscriptionSuccess) onSubscriptionSuccess();
      } else {
        setActionMessage({ type: "error", text: res.message || "Impossible de réactiver l'abonnement." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Erreur inattendue." });
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
            {billingStatus.isSubscribed ? "Gestion de votre Abonnement" : "Formule Foyer Premium"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
            {billingStatus.isSubscribed
              ? "Pilotez votre formule, vos factures et vos préférences en toute transparence."
              : "Pilotez toute la flotte familiale en toute sérénité au meilleur tarif."}
          </p>
        </div>

        {/* Notification feedback */}
        {actionMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5 ${
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : "bg-rose-50 text-rose-900 border border-rose-200"
            }`}
          >
            {actionMessage.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p className="flex-1 leading-relaxed">{actionMessage.text}</p>
          </div>
        )}

        {/* CAS 1 : UTILISATEUR DÉJÀ ABONNÉ */}
        {billingStatus.isSubscribed ? (
          <div className="space-y-4">
            {/* RÉCAPITULATIF DE LA FORMULE ACTIVE */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Formule en cours</span>
                  <span className="text-base font-black text-slate-900">
                    {billingStatus.planName}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    billingStatus.cancelAtPeriodEnd
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                >
                  {billingStatus.cancelAtPeriodEnd ? "Fin programmée" : "Actif"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Tarif souscrit</span>
                  <span className="font-bold text-slate-800">
                    {billingStatus.monthlyPriceEur.toFixed(2)} € / mois
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {billingStatus.cancelAtPeriodEnd ? "Date de fin d'accès" : "Prochain renouvellement"}
                  </span>
                  <span className="font-bold text-slate-800">{formattedPeriodEnd}</span>
                </div>
              </div>
            </div>

            {/* ÉTAT RÉSILIATION PROGRAMMÉE */}
            {billingStatus.cancelAtPeriodEnd ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 space-y-1">
                    <p className="font-bold">Résiliation programmée au {formattedPeriodEnd}</p>
                    <p className="text-amber-800 leading-relaxed">
                      Votre abonnement ne sera pas renouvelé. Vous conservez l'accès complet à tous vos véhicules et fonctionnalités jusqu'à cette date.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResumeSubscription}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Undo2 className="w-4 h-4" />
                      <span>Reprendre l'abonnement (Annuler la résiliation)</span>
                    </>
                  )}
                </button>
              </div>
            ) : null}

            {/* ÉCRAN DE CONFIRMATION DE RÉSILIATION */}
            {showCancelConfirm ? (
              <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-4 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-950">
                      Confirmer l'arrêt de l'abonnement
                    </h4>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                      La résiliation arrêtera tout prélèvement futur. Votre compte restera Premium jusqu'au <strong>{formattedPeriodEnd}</strong>, puis repassera automatiquement en formule Découverte (1 véhicule gratuit).
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCancelSubscription(false)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Confirmer la résiliation (Fin le {formattedPeriodEnd})</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={isLoading}
                    className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition border border-slate-200"
                  >
                    Conserver mon abonnement
                  </button>
                </div>
              </div>
            ) : (
              /* BOUTONS D'ACTIONS DE GESTION */
              <div className="space-y-2.5 pt-1">
                {billingStatus.portalAvailable && (
                  <button
                    type="button"
                    onClick={handleOpenPortal}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl text-xs font-bold text-slate-800 transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-slate-900">Moyen de paiement & Factures</span>
                        <span className="text-[11px] text-slate-500 font-normal">Portail Stripe sécurisé (CB, factures PDF)</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                  </button>
                )}

                {!billingStatus.cancelAtPeriodEnd && (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={isLoading}
                    className="w-full py-2.5 text-center text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                  >
                    Stopper / Résilier mon abonnement
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* CAS 2 : SOUSCRIPTION PREMIUM */
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
