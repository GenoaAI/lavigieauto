"use client";

import React, { useState, useEffect } from "react";
import {
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Tag,
  Wrench,
  ShieldCheck,
  Fuel,
  Volume2,
  Disc,
} from "lucide-react";
import { TireOffer, TireOffersResponse } from "@/lib/security/schemas";
import { searchTireOffersAction } from "@/app/actions/tires";

interface TireOffersCardProps {
  initialDimension?: string;
  initialBrand?: string;
  vehicleName?: string;
  onOffersLoaded?: (offers: TireOffer[]) => void;
  className?: string;
}

export function TireOffersCard({
  initialDimension = "215/55 R17 94W",
  initialBrand,
  vehicleName,
  onOffersLoaded,
  className = "",
}: TireOffersCardProps) {
  const [dimension, setDimension] = useState(initialDimension);
  const [quantity, setQuantity] = useState<2 | 4>(2);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TireOffersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = async (dim: string, qty: 2 | 4) => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchTireOffersAction({
        dimension: dim,
        brandAndModel: initialBrand,
        quantity: qty,
      });

      if (res.success) {
        setData(res);
        if (onOffersLoaded) {
          onOffersLoaded(res.offers);
        }
      } else {
        setError(res.error || "Impossible de récupérer les offres de pneus.");
      }
    } catch (err: any) {
      console.error("Erreur fetchOffers:", err);
      setError("Une erreur réseau est survenue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDimension(initialDimension);
    fetchOffers(initialDimension, quantity);
  }, [initialDimension]);

  const handleQuantityChange = (newQty: 2 | 4) => {
    setQuantity(newQty);
    fetchOffers(dimension, newQty);
  };

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-6 ${className}`}
    >
      {/* En-tête avec titre, dimension et bascule 2/4 pneus */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner shrink-0 mt-0.5">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">
                Comparateur de Prix & Forfait Pose
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/60">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                3 Meilleurs Tarifs du Web
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Coût total transparent incluant l&apos;achat des pneumatiques, le montage, la valve et l&apos;équilibrage
              {vehicleName ? ` pour ${vehicleName}` : ""}.
            </p>
          </div>
        </div>

        {/* Sélecteur Quantité (2 pneus vs 4 pneus) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => handleQuantityChange(2)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                quantity === 2
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              2 Pneus (1 Train)
            </button>
            <button
              onClick={() => handleQuantityChange(4)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                quantity === 4
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              4 Pneus (Complet)
            </button>
          </div>

          <button
            onClick={() => fetchOffers(dimension, quantity)}
            disabled={loading}
            title="Actualiser les prix en direct"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Info dimension & forfait pose moyen */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Dimension recherchée :</span>
          <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
            {dimension}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Wrench className="w-3.5 h-3.5 text-indigo-600" />
          <span>
            Forfait pose & équilibrage moyen estimé :{" "}
            <strong className="text-slate-900 font-semibold">
              ~{data?.averageMountingCostPerTire || 17.5} € / pneu
            </strong>
          </span>
        </div>
      </div>

      {/* État de chargement (Skeletons) */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 animate-pulse space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-24 bg-slate-200 rounded-md"></div>
                <div className="h-4 w-16 bg-slate-200 rounded-full"></div>
              </div>
              <div className="space-y-2">
                <div className="h-5 w-3/4 bg-slate-300 rounded-md"></div>
                <div className="h-4 w-1/2 bg-slate-200 rounded-md"></div>
              </div>
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="h-4 w-full bg-slate-200 rounded"></div>
                <div className="h-4 w-full bg-slate-200 rounded"></div>
                <div className="h-7 w-2/3 bg-slate-300 rounded-lg mt-2"></div>
              </div>
              <div className="h-10 w-full bg-slate-200 rounded-xl"></div>
            </div>
          ))}
        </div>
      )}

      {/* État d'erreur convivial */}
      {!loading && error && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs font-medium">{error}</p>
          </div>
          <button
            onClick={() => fetchOffers(dimension, quantity)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* État vide si aucune offre */}
      {!loading && !error && data && data.offers.length === 0 && (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <Disc className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-800">Aucune offre trouvée pour cette dimension</p>
          <p className="text-xs text-slate-500">
            Vérifiez la dimension homologuée ou essayez avec un format standard (ex: 205/55 R16).
          </p>
        </div>
      )}

      {/* Grille des 3 meilleures offres */}
      {!loading && !error && data && data.offers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.offers.map((offer, index) => (
            <div
              key={offer.id || index}
              className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 ${
                offer.isBestPrice || index === 0
                  ? "border-emerald-500 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              {/* Badge Meilleur Prix */}
              {(offer.isBestPrice || index === 0) && (
                <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-black tracking-wider uppercase rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Meilleur Prix Total
                </div>
              )}

              <div className="space-y-3">
                {/* Marchand & Disponibilité */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-black text-slate-900 tracking-wide">
                    {offer.merchantName}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    En stock
                  </span>
                </div>

                {/* Marque & Modèle */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {offer.tireBrand} <span className="text-slate-600 font-semibold">{offer.tireModel}</span>
                  </h4>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {offer.dimension}
                  </p>
                </div>

                {/* Étiquettes UE & Performance */}
                {offer.efficiencyLabel && (
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                    {offer.efficiencyLabel.wetGrip && (
                      <span className="flex items-center gap-0.5 text-blue-700">
                        <ShieldCheck className="w-3 h-3" />
                        Pluie {offer.efficiencyLabel.wetGrip}
                      </span>
                    )}
                    {offer.efficiencyLabel.fuel && (
                      <span className="flex items-center gap-0.5 text-emerald-700">
                        <Fuel className="w-3 h-3" />
                        Carburant {offer.efficiencyLabel.fuel}
                      </span>
                    )}
                    {offer.efficiencyLabel.noiseDb && (
                      <span className="flex items-center gap-0.5 text-slate-500">
                        <Volume2 className="w-3 h-3" />
                        {offer.efficiencyLabel.noiseDb} dB
                      </span>
                    )}
                  </div>
                )}

                {/* Décomposition du Coût (Pneus + Forfait Montage & Équilibrage) */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs border border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {offer.quantity}x pneu ({offer.unitPrice.toFixed(2)} €/u) :
                    </span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {offer.tiresSubtotal.toFixed(2)} €
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span className="flex items-center gap-1">
                      <span>Pose & équilibrage ({offer.quantity}x) :</span>
                    </span>
                    <span className="font-semibold text-slate-800 font-mono">
                      +{offer.mountingTotal.toFixed(2)} €
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 text-xs">Total Tout Compris :</span>
                    <span className="text-lg font-black text-slate-900 font-mono tracking-tight">
                      {offer.totalPrice.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">
                  🚚 {offer.deliveryInfo}
                </p>
              </div>

              {/* Bouton d'action sécurisé vers le marchand */}
              <div className="pt-4 mt-3 border-t border-slate-100">
                <a
                  href={offer.offerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-98 ${
                    offer.isBestPrice || index === 0
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  <span>Voir l&apos;offre sur {offer.merchantName}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
