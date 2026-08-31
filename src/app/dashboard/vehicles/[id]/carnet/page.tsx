import React from "react";
import { notFound } from "next/navigation";
import { getVehicleDetailsAction } from "@/app/actions/vehicles";
import { MaintenanceBookletView } from "@/components/vehicles/MaintenanceBookletView";

export default async function DashboardVehicleCarnetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const targetId = decodeURIComponent(id || "").trim();

  if (!targetId) {
    notFound();
  }

  const data = await getVehicleDetailsAction(targetId);
  if (!data || !data.vehicle) {
    notFound();
  }

  return <MaintenanceBookletView data={data} isPublic={false} />;
}
