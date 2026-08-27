import React from "react";
import { getVehicleDetailsAction } from "@/app/actions/vehicles";
import { VehicleDetailClientView } from "@/components/vehicles/VehicleDetailClientView";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicleId = id || "22222222-2222-2222-2222-222222222222";

  const vehicleData = await getVehicleDetailsAction(vehicleId);

  return (
    <VehicleDetailClientView
      initialVehicleData={vehicleData}
      vehicleId={vehicleId}
    />
  );
}
