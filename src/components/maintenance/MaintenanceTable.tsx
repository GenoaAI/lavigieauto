import React from 'react';
import { MaintenanceInterval } from '@/types/maintenance';

interface MaintenanceTableProps {
  intervals: MaintenanceInterval[];
}

export function MaintenanceTable({ intervals }: MaintenanceTableProps) {
  const getBadgeClass = (criticality: MaintenanceInterval['criticality']) => {
    switch (criticality) {
      case 'securite':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'obligatoire':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="my-6">
      {/* 1. Affichage Mobile (Cards empilées) */}
      <div className="block md:hidden space-y-3">
        {intervals.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5 transition-all hover:border-slate-300"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-sm leading-snug">
                {item.operation}
              </h3>
              <span
                className={`shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize ${getBadgeClass(
                  item.criticality
                )}`}
              >
                {item.criticality}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {item.description}
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="text-slate-700">
                <span className="text-slate-400 text-[11px] block">Périodicité :</span>
                <strong>{item.intervalKm.toLocaleString('fr-FR')} km</strong> ou{' '}
                <strong>
                  {item.intervalMonths / 12} an{item.intervalMonths > 12 ? 's' : ''}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[11px] block">Tarif estimé :</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {item.estimatedCostMin} € – {item.estimatedCostMax} €
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Affichage Desktop (Tableau sémantique classique) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-600">
            <tr>
              <th scope="col" className="px-6 py-3.5">
                Opération d'entretien
              </th>
              <th scope="col" className="px-6 py-3.5">
                Périodicité (Kilométrage / Âge)
              </th>
              <th scope="col" className="px-6 py-3.5">
                Criticité
              </th>
              <th scope="col" className="px-6 py-3.5 text-right">
                Tarif estimé
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
            {intervals.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{item.operation}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{item.description}</div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                  <strong>{item.intervalKm.toLocaleString('fr-FR')} km</strong> ou{' '}
                  <strong>
                    {item.intervalMonths / 12} an{item.intervalMonths > 12 ? 's' : ''}
                  </strong>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium capitalize ${getBadgeClass(
                      item.criticality
                    )}`}
                  >
                    {item.criticality}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-slate-900">
                  {item.estimatedCostMin} € – {item.estimatedCostMax} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
