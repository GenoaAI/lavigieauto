import React from "react";
import { getVehicleDetailsAction } from "@/app/actions/vehicles";
import { VehicleDetailClientView } from "@/components/vehicles/VehicleDetailClientView";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.id;
  const vehicleId = Array.isArray(rawId) ? rawId[0] : (rawId || "22222222-2222-2222-2222-222222222222");

  const vehicleData = await getVehicleDetailsAction(vehicleId);

  return (
    <VehicleDetailClientView
      initialVehicleData={vehicleData}
      vehicleId={vehicleId}
    />
  );
}
