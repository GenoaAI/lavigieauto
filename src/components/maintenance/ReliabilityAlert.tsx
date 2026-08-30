import React from 'react';
import { ReliabilityVulnerability, MaintenanceBundle } from '@/types/maintenance';

interface ReliabilityAlertProps {
  vulnerabilities: ReliabilityVulnerability[];
  bundles: MaintenanceBundle[];
}

export function ReliabilityAlert({ vulnerabilities, bundles }: ReliabilityAlertProps) {
  return (
    <div className="my-10 space-y-8">
      {/* Alertes vulnérabilités */}
      {vulnerabilities.map((vuln, idx) => (
        <div key={idx} className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white font-bold">
              !
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-amber-950">Point de vigilance critique : {vuln.title}</h3>
              <p className="text-sm text-amber-900/90 leading-relaxed">{vuln.description}</p>
              
              <div className="pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-950">Symptômes d'alerte :</span>
                <ul className="mt-1 list-disc list-inside space-y-1 text-xs text-amber-900">
                  {vuln.symptoms.map((symptom, sIdx) => (
                    <li key={sIdx}>{symptom}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 rounded-lg bg-white/80 p-3 text-xs text-amber-950 border border-amber-200/60">
                <strong>Conseil préventif LaVigieAuto :</strong> {vuln.preventiveAction}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Optimisation Devis Atelier */}
      {bundles.map((bundle, bIdx) => (
        <div key={bIdx} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200/60 pb-4">
            <div>
              <span className="inline-block rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white mb-2">
                Économie main-d'œuvre
              </span>
              <h3 className="text-lg font-bold text-emerald-950">{bundle.title}</h3>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs text-emerald-800 line-through">Coût séparé : {bundle.individualEstimatedTotal} €</div>
              <div className="text-xl font-extrabold text-emerald-700">Estimé groupé : {bundle.bundledEstimatedTotal} €</div>
              <div className="text-xs font-semibold text-emerald-900">Gain estimé : ~{bundle.savingsEur} €</div>
            </div>
          </div>

          <div className="mt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">Opérations à mutualiser :</span>
            <ul className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-emerald-900">
              {bundle.operationsIncluded.map((op, opIdx) => (
                <li key={opIdx} className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span> {op}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-3 text-xs text-slate-600 bg-white/70 p-3 rounded-lg border border-emerald-100">
            <strong>Script de négociation pour votre devis :</strong> « {bundle.garageAdvice} »
          </p>
        </div>
      ))}
    </div>
  );
}
