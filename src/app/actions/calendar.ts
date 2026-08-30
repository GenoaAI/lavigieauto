"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getFoyerOverviewAction } from "./foyer";
import { getVehicleDetailsAction } from "./vehicles";
import { revalidatePath } from "next/cache";

export interface GoogleCalendarState {
  isConnected: boolean;
  hasOAuthConfig: boolean;
  calendarName: string;
  calendarId: string | null;
  lastSyncedAt: string | null;
  syncedEventsCount: number;
  userEmail?: string;
  syncedVehicleIds: string[];
  allVehicles: Array<{
    id: string;
    marque: string;
    modele: string;
    immatriculation: string;
    image_url: string | null;
  }>;
}

export interface SyncCalendarResult {
  success: boolean;
  message: string;
  syncedCount: number;
  calendarName: string;
  events: Array<{
    vehicle: string;
    licensePlate: string;
    title: string;
    dueDate: string;
    dueMileage: number;
    estimatedCost: number;
    phoneScript: string;
  }>;
  error?: string;
}

import { cookies } from "next/headers";
import { GoogleCalendarService } from "@/lib/integrations/google-calendar/service";

/**
 * Récupère l'état de connexion, les véhicules du foyer et la sélection personnalisée de l'utilisateur
 */
export async function getGoogleCalendarStateAction(): Promise<GoogleCalendarState> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const hasOAuthConfig = !!(clientId && clientId !== "your-google-client-id" && clientId.length > 5);

  const cookieStore = await cookies();
  const cookieConnected = cookieStore.get("gcal_connected")?.value === "true";
  const cookieCalendarId = cookieStore.get("gcal_calendar_id")?.value;
  const cookieEmail = cookieStore.get("gcal_user_email")?.value;
  const cookieSyncedVehiclesRaw = cookieStore.get("gcal_synced_vehicles")?.value;

  let isConnected = cookieConnected;
  let lastSyncedAt: string | null = null;
  let syncedEventsCount = 0;
  let calendarId = cookieCalendarId || null;
  let userEmail = user?.email || cookieEmail || undefined;
  let syncedVehicleIds: string[] = cookieSyncedVehiclesRaw ? JSON.parse(cookieSyncedVehiclesRaw) : [];

  if (user) {
    const { data: member } = await (adminSupabase as any)
      .from("foyer_members")
      .select("metadata")
      .eq("user_id", user.id)
      .maybeSingle();

    if (member?.metadata) {
      if (member.metadata.google_calendar_connected !== undefined) {
        isConnected = member.metadata.google_calendar_connected === true;
      }
      lastSyncedAt = member.metadata.last_synced_at || null;
      syncedEventsCount = member.metadata.synced_events_count || 0;
      calendarId = member.metadata.google_calendar_id || calendarId;
      userEmail = member.metadata.email || userEmail;
      if (Array.isArray(member.metadata.synced_vehicle_ids)) {
        syncedVehicleIds = member.metadata.synced_vehicle_ids;
      }
    }
  }

  // Charger tous les véhicules du foyer
  const foyerRes = await getFoyerOverviewAction();
  const allVehicles = (foyerRes.vehicles || []).map((v) => ({
    id: v.id,
    marque: v.marque,
    modele: v.modele,
    immatriculation: v.immatriculation,
    image_url: (v.metadata as any)?.image_url || v.image_url || null,
  }));

  // Par défaut, si aucune sélection n'a encore été enregistrée, tous les véhicules sont sélectionnés
  if (syncedVehicleIds.length === 0 && allVehicles.length > 0) {
    syncedVehicleIds = allVehicles.map((v) => v.id);
  }

  return {
    isConnected,
    hasOAuthConfig,
    calendarName: "🚗 Entretien Véhicules (LaVigieAuto)",
    calendarId: isConnected ? (calendarId || "primary") : null,
    lastSyncedAt,
    syncedEventsCount,
    userEmail,
    syncedVehicleIds,
    allVehicles,
  };
}

/**
 * Met à jour la liste des véhicules que cet utilisateur souhaite synchroniser
 */
export async function updateUserSyncedVehiclesAction(vehicleIds: string[]): Promise<{ success: boolean; vehicleIds: string[] }> {
  const cookieStore = await cookies();
  cookieStore.set("gcal_synced_vehicles", JSON.stringify(vehicleIds), {
    maxAge: 30 * 24 * 3600,
    path: "/",
  });

  const adminSupabase = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: member } = await (adminSupabase as any)
      .from("foyer_members")
      .select("metadata")
      .eq("user_id", user.id)
      .maybeSingle();

    const existingMeta = member?.metadata || {};
    await (adminSupabase as any)
      .from("foyer_members")
      .update({
        metadata: {
          ...existingMeta,
          synced_vehicle_ids: vehicleIds,
        },
      })
      .eq("user_id", user.id);
  }

  revalidatePath("/dashboard");
  return { success: true, vehicleIds };
}

import { refreshGoogleAccessToken } from "@/lib/integrations/google-calendar/client";
import { bundleMaintenanceAppointments } from "@/lib/engine/bundling";
import { isVehicleTrackingSuspended } from "@/lib/types/database.types";

/**
 * Synchronise les véhicules choisis par l'utilisateur dans son Google Calendar sous forme de RDV d'atelier groupés
 */
export async function syncGoogleCalendarAction(targetVehicleIds?: string[]): Promise<SyncCalendarResult> {
  try {
    const foyerRes = await getFoyerOverviewAction();
    let vehicles = foyerRes.vehicles || [];

    const cookieStore = await cookies();
    let accessToken = cookieStore.get("gcal_access_token")?.value;
    let targetCalendarId = cookieStore.get("gcal_calendar_id")?.value;

    const adminSupabase = createAdminClient();

    // 1. Si pas de token en cookie, chercher dans la base de données
    const { data: member } = await (adminSupabase as any)
      .from("foyer_members")
      .select("metadata")
      .not("metadata->google_access_token", "is", null)
      .limit(1)
      .single();

    if (!accessToken && member?.metadata?.google_access_token) {
      accessToken = member.metadata.google_access_token;
    }
    if (!targetCalendarId && member?.metadata?.google_calendar_id) {
      targetCalendarId = member.metadata.google_calendar_id;
    }

    const refreshToken = cookieStore.get("gcal_refresh_token")?.value || member?.metadata?.google_refresh_token;

    // 2. Si le token est potentiellement expiré et qu'on a un refresh token, le rafraîchir
    if (refreshToken) {
      try {
        const newTokens = await refreshGoogleAccessToken(refreshToken);
        if (newTokens.access_token) {
          accessToken = newTokens.access_token;
          try {
            cookieStore.set("gcal_access_token", newTokens.access_token, {
              httpOnly: true,
              path: "/",
              maxAge: 3600,
            });
          } catch {
            // Ignore
          }
        }
      } catch (refreshErr) {
        console.warn("Avertissement rafraîchissement token Google:", refreshErr);
      }
    }

    if (!targetCalendarId) {
      targetCalendarId = "primary";
    }

    // Filtrer selon la sélection personnalisée
    let selectedIds = targetVehicleIds;
    if (!selectedIds || selectedIds.length === 0) {
      const cookieSynced = cookieStore.get("gcal_synced_vehicles")?.value;
      if (cookieSynced) {
        selectedIds = JSON.parse(cookieSynced);
      }
    }

    // Filtrer les véhicules actifs uniquement (exclure les suspendus)
    vehicles = vehicles.filter((v) => !isVehicleTrackingSuspended(v));

    if (selectedIds && selectedIds.length > 0) {
      vehicles = vehicles.filter((v) => selectedIds!.includes(v.id));
    }

    const calendarService = accessToken ? new GoogleCalendarService(accessToken) : null;

    // 3. Nettoyer les anciens événements pour éviter les doublons et remplacer les 4 RDV éclatés par 1 seul RDV groupé
    if (calendarService) {
      try {
        await calendarService.clearLaVigieAutoCalendarEvents(targetCalendarId);
        if (targetCalendarId !== "primary") {
          await calendarService.clearLaVigieAutoCalendarEvents("primary");
        }
      } catch (clearErr) {
        console.warn("Avertissement nettoyage agenda Google Calendar:", clearErr);
      }
    }

    const syncedEvents: SyncCalendarResult["events"] = [];

    for (const v of vehicles) {
      const details = await getVehicleDetailsAction(v.id);
      if (!details) continue;

      const vehicleContext = {
        make: v.marque,
        model: v.modele,
        licensePlate: v.immatriculation,
        currentMileage: v.kilometrage_actuel || 0,
      };

      // Regrouper intelligemment toutes les opérations proches dans une même visite d'atelier
      const bundles = bundleMaintenanceAppointments(
        details.forecast?.projectedMilestones || [],
        vehicleContext,
        { toleranceDays: 90, toleranceKm: 3000 }
      );

      for (const bundle of bundles.slice(0, 3)) {
        syncedEvents.push({
          vehicle: `${v.marque} ${v.modele}`,
          licensePlate: v.immatriculation,
          title: bundle.bundleTitle,
          dueDate: bundle.recommendedDate,
          dueMileage: bundle.targetMileage,
          estimatedCost: bundle.totalEstimatedCostMaxEur,
          phoneScript: bundle.garagePhoneScript,
        });

        // Injecter 1 SEUL événement complet exclusivement dans l'agenda dédié "Entretien Véhicules"
        if (calendarService) {
          try {
            await calendarService.injectBundleEvent({
              calendarId: targetCalendarId,
              bundle,
              vehicle: vehicleContext,
            });
          } catch (injectErr) {
            console.warn("Avertissement injection calendrier dédié:", injectErr);
          }
        }
      }

      // ÉCHÉANCE PNEUMATIQUES : Synchronisation dans Google Calendar
      if (details.tires?.nextReplacementDate) {
        const tireSummary = `🚗 [LaVigieAuto] Remplacement Pneumatiques (${details.tires.frontAxle.dimension}) — ${v.marque} ${v.modele}`;
        const tireTargetKm = (details.tires.frontAxle.currentEstimatedMileage || 0) + (details.tires.frontAxle.remainingKm || 0);
        const tireDesc = [
          `🚗 LAVIGIEAUTO — PRÉCONISATION PNEUMATIQUES`,
          `Véhicule : ${v.marque} ${v.modele} [${v.immatriculation}]`,
          `Dimension officielle : ${details.tires.frontAxle.dimension}`,
          `Modèle préconisé : ${details.tires.frontAxle.brandAndModel}`,
          `Essieu concerné : ${details.tires.nextReplacementAxle === "BOTH" ? "4 Pneus (AV + AR)" : details.tires.nextReplacementAxle === "FRONT" ? "Train Avant" : "Train Arrière"}`,
          `Échéance kilométrique cible : ~${tireTargetKm.toLocaleString("fr-FR")} km`,
          `Budget estimé : ~280 € TTC (pose & équilibrage)`,
          ``,
          `📞 SCRIPT TÉLÉPHONIQUE GARAGE / CENTRE AUTO :`,
          `« Bonjour, je souhaite un devis pour 2 pneumatiques en ${details.tires.frontAxle.dimension} pour mon ${v.marque} ${v.modele} (${v.immatriculation}) avec forfait montage et équilibrage. »`,
        ].join("\n");

        syncedEvents.push({
          vehicle: `${v.marque} ${v.modele}`,
          licensePlate: v.immatriculation,
          title: `Pneumatiques (${details.tires.frontAxle.dimension})`,
          dueDate: details.tires.nextReplacementDate,
          dueMileage: tireTargetKm,
          estimatedCost: 280,
          phoneScript: `Devis pneus ${details.tires.frontAxle.dimension} pour ${v.marque} ${v.modele}`,
        });

        if (calendarService) {
          try {
            await calendarService.injectCustomMaintenanceEvent({
              calendarId: targetCalendarId,
              summary: tireSummary,
              description: tireDesc,
              startDate: details.tires.nextReplacementDate,
            });
          } catch (tireErr) {
            console.warn("Avertissement injection événement pneus:", tireErr);
          }
        }
      }

      // ÉCHÉANCE FREINAGE (PLAQUETTES & DISQUES) : Synchronisation dans Google Calendar
      if (details.brakes?.frontAxle?.projectedReplacementDate) {
        const brakeNextAxle = details.brakes.nextReplacementAxle === "REAR" ? details.brakes.rearAxle : details.brakes.frontAxle;
        const brakeTargetKm = (brakeNextAxle.currentEstimatedMileage || 0) + (brakeNextAxle.remainingKm || 0);
        const brakeSummary = `🚗 [LaVigieAuto] Remplacement Plaquettes de Frein — ${v.marque} ${v.modele}`;
        const brakeDesc = [
          `🚗 LAVIGIEAUTO — SÉCURITÉ & FREINAGE`,
          `Véhicule : ${v.marque} ${v.modele} [${v.immatriculation}]`,
          `Épaisseur garniture actuelle : ${brakeNextAxle.remainingLiningThicknessMm} mm`,
          `Préconisation : ${brakeNextAxle.discsCondition === "REPLACE_WITH_NEXT_PADS" ? "Pack combiné Disques + Plaquettes" : "Plaquettes seules"}`,
          `Échéance kilométrique cible : ~${brakeTargetKm.toLocaleString("fr-FR")} km`,
          `Budget prévisionnel : ~${details.brakes.estimatedCostRange.padsOnlyTTC.min} € à ${details.brakes.estimatedCostRange.padsOnlyTTC.max} € TTC`,
          ``,
          `📞 SCRIPT TÉLÉPHONIQUE GARAGE :`,
          `« Bonjour, je souhaite un devis pour le remplacement des plaquettes de frein ${details.brakes.nextReplacementAxle === "BOTH" ? "avant et arrière" : details.brakes.nextReplacementAxle === "FRONT" ? "avant" : "arrière"} pour mon ${v.marque} ${v.modele} (${v.immatriculation}) avec contrôle de l'épaisseur des disques. »`,
        ].join("\n");

        syncedEvents.push({
          vehicle: `${v.marque} ${v.modele}`,
          licensePlate: v.immatriculation,
          title: `Plaquettes de frein (${brakeNextAxle.label})`,
          dueDate: brakeNextAxle.projectedReplacementDate,
          dueMileage: brakeTargetKm,
          estimatedCost: details.brakes.estimatedCostRange.padsOnlyTTC.max,
          phoneScript: `Devis plaquettes de frein pour ${v.marque} ${v.modele}`,
        });

        if (calendarService) {
          try {
            await calendarService.injectCustomMaintenanceEvent({
              calendarId: targetCalendarId,
              summary: brakeSummary,
              description: brakeDesc,
              startDate: brakeNextAxle.projectedReplacementDate,
            });
          } catch (brakeErr) {
            console.warn("Avertissement injection événement freinage:", brakeErr);
          }
        }
      }
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await (adminSupabase as any)
        .from("foyer_members")
        .update({
          metadata: {
            google_calendar_connected: true,
            last_synced_at: new Date().toISOString(),
            synced_events_count: syncedEvents.length,
          },
        })
        .eq("user_id", user.id);
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Synchronisation réussie : ${syncedEvents.length} intervention(s) planifiée(s) dans Google Calendar.`,
      syncedCount: syncedEvents.length,
      calendarName: "🚗 Entretien Véhicules (LaVigieAuto)",
      events: syncedEvents,
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Erreur lors de la synchronisation Google Calendar.",
      syncedCount: 0,
      calendarName: "🚗 Entretien Véhicules (LaVigieAuto)",
      events: [],
      error: err.message,
    };
  }
}

/**
 * Déconnecter la synchronisation Google Calendar
 */
export async function disconnectGoogleCalendarAction(): Promise<{ success: boolean }> {
  const adminSupabase = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  cookieStore.delete("gcal_access_token");
  cookieStore.delete("gcal_refresh_token");
  cookieStore.delete("gcal_calendar_id");
  cookieStore.delete("gcal_connected");

  if (user) {
    await (adminSupabase as any)
      .from("foyer_members")
      .update({
        metadata: {
          google_calendar_connected: false,
          last_synced_at: null,
          synced_events_count: 0,
        },
      })
      .eq("user_id", user.id);
  }

  revalidatePath("/dashboard");
  return { success: true };
}
