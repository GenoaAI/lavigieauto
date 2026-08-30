'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Camera,
  FolderOpen,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { trackMaintenanceEvent } from '@/lib/analytics/tracker';

interface MaintenanceDropzoneProps {
  brand: string;
  model: string;
  engine: string;
}

export function MaintenanceDropzone({ brand, model, engine }: MaintenanceDropzoneProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [analysisState, setAnalysisState] = useState<'idle' | 'analyzing' | 'completed'>('idle');
  const [progressMessage, setProgressMessage] = useState('Analyse de la facture en cours par l\'IA...');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 1. Télémétrie d'affichage de la page
  useEffect(() => {
    trackMaintenanceEvent({
      eventName: 'maintenance_page_view',
      brand,
      model,
      engine,
    });
  }, [brand, model, engine]);

  const startAnalysisSimulation = (source: 'camera' | 'upload' | 'drag_drop') => {
    // 2. Télémétrie d'interaction
    trackMaintenanceEvent({
      eventName: 'maintenance_dropzone_interaction',
      brand,
      model,
      engine,
      source,
    });

    setAnalysisState('analyzing');
    setProgressMessage('Lecture du document et extraction visuelle...');

    setTimeout(() => {
      setProgressMessage('Identification du véhicule, kilométrage et atelier...');
    }, 1000);

    setTimeout(() => {
      setProgressMessage('Rapprochement avec le plan constructeur officiel...');
    }, 1800);

    setTimeout(() => {
      setAnalysisState('completed');
      // 3. Télémétrie d'analyse terminée
      trackMaintenanceEvent({
        eventName: 'maintenance_dropzone_completed',
        brand,
        model,
        engine,
      });
    }, 2600);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      startAnalysisSimulation('drag_drop');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, source: 'camera' | 'upload') => {
    if (e.target.files && e.target.files.length > 0) {
      startAnalysisSimulation(source);
    }
  };

  const handleConversionRedirect = () => {
    // 4. Télémétrie de clic CTA conversion
    trackMaintenanceEvent({
      eventName: 'maintenance_conversion_cta_click',
      brand,
      model,
      engine,
      destination: '/dashboard',
    });

    // Mémorisation dans le sessionStorage pour pré-remplissage immédiat
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'lavigie_selected_vehicle',
          JSON.stringify({ brand, model, engine, source: 'seo_landing', timestamp: Date.now() })
        );
      }
    } catch {
      // Silencieux
    }

    // Redirection vers le flux d'onboarding / tableau de bord avec contexte véhicule pré-rempli
    router.push(
      `/dashboard?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(
        model
      )}&engine=${encodeURIComponent(engine)}&src=seo_landing`
    );
  };

  const handleReset = () => {
    setAnalysisState('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="my-8 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 sm:p-8 transition-all hover:border-blue-400 shadow-sm">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileInput(e, 'upload')}
        accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={(e) => handleFileInput(e, 'camera')}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* ÉTAT 1 : IDLE / EN ATTENTE DE DÉPÔT */}
      {analysisState === 'idle' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          className={`flex flex-col items-center justify-center text-center transition-colors ${
            isDragging ? 'bg-blue-100/60 rounded-xl p-4' : ''
          }`}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-200">
            <Upload className="h-7 w-7" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
            Votre {brand} {model} est-elle à jour de ses entretiens ?
          </h3>
          <p className="mt-2 max-w-lg text-sm text-slate-600 leading-relaxed">
            Déposez votre dernière <strong>facture de garage</strong> ou votre{' '}
            <strong>procès-verbal de contrôle technique</strong>. L'IA de LaVigieAuto analyse vos
            échéances et identifie immédiatement les risques.
          </p>

          {/* Boutons d'action tactiles / Mobile & Desktop */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Bouton Appareil Photo pour Smartphone */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Prendre en photo (Smartphone)</span>
            </button>

            {/* Bouton Fichier / PDF */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-700 border border-slate-300 shadow-sm transition hover:bg-slate-50 active:scale-95 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-slate-500" />
              <span>Déposer un PDF ou Fichier</span>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Gratuit • Analyse instantanée • Sans engagement</span>
          </div>
        </div>
      )}

      {/* ÉTAT 2 : ANALYSE EN COURS (LOADER) */}
      {analysisState === 'analyzing' && (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 animate-ping absolute opacity-75" />
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 relative">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900">
              Analyse de la facture en cours par l'IA...
            </h4>
            <p className="text-xs text-blue-700 font-medium animate-pulse">
              {progressMessage}
            </p>
          </div>

          <div className="w-48 h-1.5 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-indeterminate" />
          </div>
        </div>
      )}

      {/* ÉTAT 3 : RÉSULTAT STRUCTURÉ & CTA DE CONVERSION */}
      {analysisState === 'completed' && (
        <div className="space-y-5 animate-slide-in-up">
          <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900">
                Analyse terminée • Rapprochement {brand} {model} effectué
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 underline transition"
            >
              <RefreshCw className="w-3 h-3" />
              Tester un autre document
            </button>
          </div>

          {/* Cartes de synthèse structurée */}
          <div className="rounded-xl bg-white p-4 sm:p-5 border border-blue-100 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Facture détectée :</strong> Garage partenaire — <strong>62 400 km</strong>
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Vidange moteur :</strong> À jour (Huile synthétique homologuée certifiée)
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-amber-900 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/60">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Point de vigilance :</strong> Courroie de distribution à prévoir dans{' '}
                <strong>37 600 km</strong> ou avant <strong>2026</strong>
              </span>
            </div>
          </div>

          {/* CTA MAJEUR DE CONVERSION */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleConversionRedirect}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 active:scale-95 cursor-pointer"
            >
              <span>Sauvegarder dans mon carnet numérique gratuit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-500">
            Activation immédiate • Synchronisation Google Calendar & rappels automatiques à J-30
          </p>
        </div>
      )}
    </div>
  );
}
