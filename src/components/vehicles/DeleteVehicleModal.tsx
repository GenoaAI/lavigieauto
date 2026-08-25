"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { deleteVehicleAction } from "@/app/actions/vehicles";

interface DeleteVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: string;
    marque: string;
    modele: string;
    immatriculation: string;
  } | null;
  onSuccess?: () => void;
}

export function DeleteVehicleModal({
  isOpen,
  onClose,
  vehicle,
  onSuccess,
}: DeleteVehicleModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !vehicle) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await deleteVehicleAction(vehicle.id);
      if (res.success) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || "Impossible de supprimer ce véhicule.");
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900">
            Supprimer ce véhicule ?
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Vous êtes sur le point de supprimer définitivement :
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <p className="font-bold text-sm text-slate-900">
              {vehicle.marque} {vehicle.modele}
            </p>
            <p className="font-mono text-xs text-slate-600 font-semibold mt-0.5">
              Immatriculation : {vehicle.immatriculation}
            </p>
          </div>
          <p className="text-[11.5px] text-rose-600 font-medium pt-1">
            ⚠️ Cette action est irréversible : l'historique d'entretien, les factures associées et les événements Google Calendar de ce véhicule seront supprimés.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Suppression...</span>
              </>
            ) : (
              <span>Confirmer la suppression</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
