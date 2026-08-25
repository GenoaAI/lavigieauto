import React from "react";
import { getFoyerOverviewAction } from "@/app/actions/foyer";
import { DashboardClientView } from "@/components/dashboard/DashboardClientView";

export default async function DashboardPage() {
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
