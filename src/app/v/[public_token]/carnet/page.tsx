import React from "react";
import { notFound } from "next/navigation";
import { getVehicleDetailsAction } from "@/app/actions/vehicles";
import { MaintenanceBookletView } from "@/components/vehicles/MaintenanceBookletView";

export default async function PublicVehicleCarnetPage({
  params,
}: {
  params: Promise<{ public_token: string }>;
}) {
  const { public_token } = await params;
  const targetId = decodeURIComponent(public_token || "").trim();

  if (!targetId) {
    notFound();
  }

  const data = await getVehicleDetailsAction(targetId);
  if (!data || !data.vehicle) {
    notFound();
  }

  return <MaintenanceBookletView data={data} isPublic={true} />;
}
