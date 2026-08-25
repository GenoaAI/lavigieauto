import React from "react";
import { getFoyerOverviewAction } from "@/app/actions/foyer";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const overview = await getFoyerOverviewAction();
  const foyer = overview?.foyer;
  const vehicles = overview?.vehicles || [];
  const members = overview?.members || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation Fixe avec Bouton Fold / Unfold */}
      <DashboardSidebar foyer={foyer} vehicles={vehicles} members={members} />

      {/* Main Dashboard Workspace */}
      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden pb-24 md:pb-8">
        {children}
      </main>
    </div>
  );
}
