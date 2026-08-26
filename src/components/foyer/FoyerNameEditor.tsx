"use client";

import React, { useState, useEffect, useRef } from "react";
import { Pencil, Check, X, Loader2, Home, Sparkles } from "lucide-react";
import { updateHouseholdNameAction } from "@/app/actions/foyer";

interface FoyerNameEditorProps {
  initialName: string;
  householdId: string;
  variant?: "inline" | "header" | "compact" | "hero";
  className?: string;
  onUpdated?: (newName: string) => void;
  showIcon?: boolean;
}

export function FoyerNameEditor({
  initialName,
  householdId,
  variant = "inline",
  className = "",
  onUpdated,
  showIcon = true,
}: FoyerNameEditorProps) {
  const [name, setName] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronisation avec les props initiales
  useEffect(() => {
    setName(initialName);
    setTempName(initialName);
  }, [initialName]);

  // Écoute des événements globaux de mise à jour du nom de foyer
  useEffect(() => {
    const handleGlobalUpdate = (e: CustomEvent<{ householdId: string; name: string }>) => {
      if (e.detail?.name && (!e.detail.householdId || e.detail.householdId === householdId)) {
        setName(e.detail.name);
        setTempName(e.detail.name);
      }
    };

    window.addEventListener("foyerNameUpdated" as any, handleGlobalUpdate);
    return () => {
      window.removeEventListener("foyerNameUpdated" as any, handleGlobalUpdate);
    };
  }, [householdId]);

  // Autofocus quand le mode édition s'active
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setTempName(name);
    setError(null);
    setSuccess(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempName(name);
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmed = tempName.trim();
    if (!trimmed) {
      setError("Le nom ne peut pas être vide.");
      return;
    }
    if (trimmed.length < 2) {
      setError("Le nom doit comporter au moins 2 caractères.");
      return;
    }
    if (trimmed.length > 50) {
      setError("Le nom ne peut pas dépasser 50 caractères.");
      return;
    }

    if (trimmed === name) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await updateHouseholdNameAction(householdId, trimmed);
      if (res.success && res.nom) {
        setName(res.nom);
        setTempName(res.nom);
        setIsEditing(false);
        setSuccess(true);
        if (onUpdated) onUpdated(res.nom);

        // Déclencher un événement global pour synchroniser tous les composants réactifs (Header, Sidebar, Accueil, Dashboard)
        window.dispatchEvent(
          new CustomEvent("foyerNameUpdated", {
            detail: { householdId, name: res.nom },
          })
        );

        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(res.error || "Erreur lors de l'enregistrement.");
      }
    } catch (err: any) {
      setError(err.message || "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  // 1. Rendu en mode Édition
  if (isEditing) {
    return (
      <div className={`inline-flex flex-col gap-1.5 ${className}`}>
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-blue-500 shadow-md ring-2 ring-blue-500/20">
          <input
            ref={inputRef}
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            maxLength={50}
            className="px-2 py-1 text-xs font-bold text-slate-900 bg-transparent outline-none min-w-[160px] sm:min-w-[200px]"
            placeholder="Nom du foyer..."
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !tempName.trim()}
            title="Enregistrer"
            className="p-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            title="Annuler (Échap)"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {error && <p className="text-[11px] font-semibold text-rose-600 animate-in fade-in">{error}</p>}
      </div>
    );
  }

  // 2. Rendu en mode Header (bandeau du haut)
  if (variant === "header") {
    return (
      <div className={`inline-flex items-center gap-1.5 group ${className}`}>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/90 rounded-xl transition cursor-pointer" onClick={handleStartEdit}>
          {showIcon && <Home className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
          <span className="text-xs font-bold text-slate-800 tracking-tight truncate max-w-[130px] sm:max-w-[200px]">
            {name}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStartEdit();
            }}
            title="Modifier le nom du foyer"
            className="text-slate-400 group-hover:text-blue-600 p-0.5 rounded hover:bg-white transition"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
        {success && (
          <span className="text-[10px] font-bold text-emerald-600 animate-in fade-in">
            ✓ Modifié
          </span>
        )}
      </div>
    );
  }

  // 3. Rendu en mode Hero (Page d'accueil)
  if (variant === "hero") {
    return (
      <div className={`inline-flex items-center gap-2 group ${className}`}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md hover:bg-white border border-slate-200/80 hover:border-blue-300 rounded-2xl shadow-sm transition cursor-pointer" onClick={handleStartEdit}>
          <div className="w-5 h-5 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Home className="w-3 h-3" />
          </div>
          <span className="text-sm font-extrabold text-slate-900 tracking-tight">
            {name}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStartEdit();
            }}
            title="Modifier le nom du foyer"
            className="text-slate-400 group-hover:text-blue-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        {success && (
          <span className="text-xs font-bold text-emerald-600 animate-in fade-in flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Nom enregistré
          </span>
        )}
      </div>
    );
  }

  // 4. Rendu standard Inline (Dashboard, Vue d'ensemble)
  return (
    <div className={`inline-flex items-center gap-2 group ${className}`}>
      <span className="font-black text-slate-900 tracking-tight truncate">
        {name}
      </span>
      <button
        type="button"
        onClick={handleStartEdit}
        title="Modifier le nom du foyer"
        className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition shrink-0"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {success && (
        <span className="text-xs font-bold text-emerald-600 animate-in fade-in">
          ✓ Enregistré
        </span>
      )}
    </div>
  );
}
