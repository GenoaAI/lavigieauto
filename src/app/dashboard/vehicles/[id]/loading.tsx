import React from "react";

export default function VehicleDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Breadcrumb & Switch Skeleton */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="h-4 w-44 bg-slate-200 rounded-md" />
          <div className="h-8 w-28 bg-slate-200 rounded-xl" />
        </div>

        {/* Hero Vehicle Card Skeleton */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-24 h-16 sm:w-32 sm:h-20 rounded-2xl bg-slate-200 shrink-0" />
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 rounded-lg" />
              <div className="h-4 w-64 bg-slate-100 rounded-md" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="h-9 w-32 bg-slate-200 rounded-xl" />
            <div className="h-9 w-28 bg-slate-200 rounded-xl" />
            <div className="h-9 w-28 bg-blue-200 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Telemetry 3-Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-2">
          <div className="h-3 w-32 bg-slate-200 rounded" />
          <div className="h-7 w-28 bg-slate-300 rounded-lg" />
          <div className="h-3 w-48 bg-slate-100 rounded" />
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
          <div className="h-3 w-36 bg-emerald-200 rounded" />
          <div className="h-7 w-28 bg-emerald-300 rounded-lg" />
          <div className="h-3 w-48 bg-emerald-100 rounded" />
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-2 sm:col-span-2 lg:col-span-1">
          <div className="h-3 w-36 bg-slate-200 rounded" />
          <div className="h-7 w-36 bg-slate-300 rounded-lg" />
          <div className="h-3 w-48 bg-slate-100 rounded" />
        </div>
      </div>

      {/* Tabs Selector Skeleton */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <div className="h-9 w-36 bg-blue-200 rounded-2xl" />
        <div className="h-9 w-44 bg-slate-200 rounded-2xl" />
        <div className="h-9 w-36 bg-slate-200 rounded-2xl" />
      </div>

      {/* Content Skeleton */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-4 shadow-sm">
        <div className="h-6 w-52 bg-slate-200 rounded-lg" />
        <div className="grid sm:grid-cols-2 gap-3.5 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}