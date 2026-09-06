import React from "react";
import { getFoyerOverviewAction } from "@/app/actions/foyer";
import { initializeContextualVehicleAction } from "@/app/actions/vehicles";
import { DashboardClientView } from "@/components/dashboard/DashboardClientView";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const brandParam = typeof resolvedParams.brand === "string" ? resolvedParams.brand : undefined;
  const modelParam = typeof resolvedParams.model === "string" ? resolvedParams.model : undefined;
  const engineParam = typeof resolvedParams.engine === "string" ? resolvedParams.engine : undefined;
  const srcParam = typeof resolvedParams.src === "string" ? resolvedParams.src : undefined;

  if (brandParam && modelParam) {
    try {
      await initializeContextualVehicleAction({
        brand: brandParam,
        model: modelParam,
        engine: engineParam,
        src: srcParam,
      });
    } catch (err) {
      console.warn("[DashboardPage] Initialisation contextuelle du véhicule ignorée:", err);
    }
  }

  const overview = await getFoyerOverviewAction();
  const foyer = overview?.foyer;
  const vehicles = overview?.vehicles || [];
  const members = overview?.members || [];

  return (
    <DashboardClientView
      initialFoyer={foyer}
      initialVehicles={vehicles}
      initialMembers={members}
    />
  );
}
