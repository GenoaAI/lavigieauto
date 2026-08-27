import React from "react";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 rounded-xl" />
          <div className="h-4 w-96 bg-slate-100 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 bg-slate-200 rounded-2xl" />
          <div className="h-7 w-40 bg-slate-100 rounded-full" />
        </div>
      </div>

      {/* Subscription Banner Skeleton */}
      <div className="h-16 w-full bg-slate-200/80 rounded-2xl" />

      {/* Major Milestone Banner Skeleton */}
      <div className="h-44 w-full bg-gradient-to-r from-blue-200 to-indigo-200 rounded-3xl" />

      {/* Vehicle Grid Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-36 bg-slate-100 rounded-md" />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-200 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-32 bg-slate-200 rounded-md" />
                  <div className="h-4 w-20 bg-slate-100 rounded-md" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div className="h-12 bg-slate-50 rounded-xl" />
                <div className="h-12 bg-slate-50 rounded-xl" />
              </div>

              <div className="h-16 bg-blue-50/60 rounded-2xl" />

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="h-9 flex-1 bg-slate-200 rounded-xl" />
                <div className="h-9 w-9 bg-blue-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dropzone Skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-64 bg-slate-200 rounded-lg" />
        <div className="h-36 w-full bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200" />
      </div>
    </div>
  );
}