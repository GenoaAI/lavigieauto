import React from "react";
import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-5 rounded-2xl border border-slate-200/80 shadow-sm animate-pulse">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="text-xs font-semibold text-slate-600 tracking-tight">
          Chargement de LaVigieAuto...
        </span>
      </div>
    </div>
  );
}