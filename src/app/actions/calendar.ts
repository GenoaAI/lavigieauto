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
  targetCalendarType: "dedicated" | "primary";
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
  const cookieTargetType = (cookieStore.get("gcal_target_type")?.value as any) || "dedicated";

  let isConnected = cookieConnected;
  let lastSyncedAt: string | null = null;
  let syncedEventsCount = 0;
  let calendarId = cookieCalendarId || null;
  let userEmail = user?.email || cookieEmail || undefined;
  let syncedVehicleIds: string[] = cookieSyncedVehiclesRaw ? JSON.parse(cookieSyncedVehiclesRaw) : [];
  let targetCalendarType: "dedicated" | "primary" = cookieTargetType;

  if (user) {
    const { data: member } = await (adminSupabase as any)
      .from("foyer_members")
      .select("foyer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (member?.foyer_id) {
      const { data: foyer } = await (adminSupabase as any)
        .from("foyers")
        .select("metadata")
        .eq("id", member.foyer_id)
        .maybeSingle();

      const gcal = foyer?.metadata?.google_calendar;
      if (gcal) {
        if (gcal.connected !== undefined) {
          isConnected = gcal.connected === true;
        }
        lastSyncedAt = gcal.last_synced_at || lastSyncedAt;
        syncedEventsCount = gcal.synced_events_count ?? syncedEventsCount;
        calendarId = gcal.calendar_id || calendarId;
        userEmail = gcal.user_email || userEmail;
        if (gcal.target_type) {
          targetCalendarType = gcal.target_type;
        }
        if (Array.isArray(gcal.synced_vehicle_ids)) {
          syncedVehicleIds = gcal.synced_vehicle_ids;
        }
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

  // Filtrer les IDs pour ne conserver que les véhicules réellement présents dans le foyer
  const validVehicleIds = new Set(allVehicles.map((v) => v.id));
  syncedVehicleIds = syncedVehicleIds.filter((id) => validVehicleIds.has(id));

  // Par défaut, si aucune sélection valide n'a encore été enregistrée, tous les véhicules du foyer sont sélectionnés
  if (syncedVehicleIds.length === 0 && allVehicles.length > 0) {
    syncedVehicleIds = allVehicles.map((v) => v.id);
  }

  return {
    isConnected,
    hasOAuthConfig,
    calendarName: targetCalendarType === "primary" ? "Agenda Principal" : "🚗 Entretien Véhicules (LaVigieAuto)",
    calendarId: isConnected ? (calendarId || "primary") : null,
    targetCalendarType,
    lastSyncedAt,
    syncedEventsCount,
    userEmail,
    syncedVehicleIds,
    allVehicles,
  };
}

/**
 * Met à jour le type d'agenda cible (dédié vs principal)
 */
export async function updateCalendarTargetAction(targetType: "dedicated" | "primary"): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.set("gcal_target_type", targetType, {
    maxAge: 30 * 24 * 3600,
    path: "/",
  });

  const adminSupabase = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: member } = await (adminSupabase as any)
      .from("foyer_members")
      .select("foyer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (member?.foyer_id) {
      const { data: foyer } = await (adminSupabase as any)
        .from("foyers")
        .select("metadata")
        .eq("id", member.foyer_id)
        .maybeSingle();

      const existingMeta = foyer?.metadata || {};
      await (adminSupabase as any)
        .from("foyers")
        .update({
          metadata: {
            ...existingMeta,
            google_calendar: {
              ...(existingMeta.google_calendar || {}),
              target_type: targetType,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.foyer_id);
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Met à jour la liste des véhicules que cet utilisateur souhaite synchroniser
 */
export async function updateUserSyncedVehiclesAction(vehicleIds: string[]): Promise<{ success: boolean; vehicleIds: string[] }> {
  const foyerRes = await getFoyerOverviewAction();
  const validVehicleIds = new Set((foyerRes.vehicles || []).map((v) => v.id));
  const sanitizedVehicleIds = vehicleIds.filter((id) => validVehicleIds.has(id));

  const cookieStore = await cookies();
  cookieStore.set("gcal_synced_vehicles", JSON.stringify(sanitizedVehicleIds), {
    maxAge: 30 * 24 * 3600,
    path: "/",
  });

  const adminSupabase = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: member } = await (adminSupabase as any)
      .from("foyer_members")
      .select("foyer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (member?.foyer_id) {
      const { data: foyer } = await (adminSupabase as any)
        .from("foyers")
        .select("metadata")
        .eq("id", member.foyer_id)
        .maybeSingle();

      const existingMeta = foyer?.metadata || {};
      await (adminSupabase as any)
        .from("foyers")
        .update({
          metadata: {
            ...existingMeta,
            google_calendar: {
              ...(existingMeta.google_calendar || {}),
              synced_vehicle_ids: sanitizedVehicleIds,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.foyer_id);
    }
  }

  revalidatePath("/dashboard");
  return { success: true, vehicleIds: sanitizedVehicleIds };
}

import { refreshGoogleAccessToken } from "@/lib/integrations/google-calendar/client";
import { bundleMaintenanceAppointments } from "@/lib/engine/bundling";
import { isVehicleTrackingSuspended } from "@/lib/types/database.types";

/**
 * Synchronise les véhicules choisis par l'utilisateur dans son Google Calendar sous forme de RDV d'atelier groupés
 */
export async function syncGoogleCalendarAction(
  targetVehicleIds?: string[],
  overrideTargetType?: "dedicated" | "primary"
): Promise<SyncCalendarResult> {
  try {
    const foyerRes = await getFoyerOverviewAction();
    let vehicles = foyerRes.vehicles || [];

    const cookieStore = await cookies();
    let accessToken = cookieStore.get("gcal_access_token")?.value;
    let targetCalendarId = cookieStore.get("gcal_calendar_id")?.value;
    let refreshToken = cookieStore.get("gcal_refresh_token")?.value;
    let targetType: "dedicated" | "primary" =
      overrideTargetType ||
      (cookieStore.get("gcal_target_type")?.value as any) ||
      "dedicated";

    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    let currentFoyerId: string | null = null;
    let existingFoyerMeta: any = null;

    if (user) {
      const { data: member } = await (adminSupabase as any)
        .from("foyer_members")
        .select("foyer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (member?.foyer_id) {
        currentFoyerId = member.foyer_id;
        const { data: foyer } = await (adminSupabase as any)
          .from("foyers")
          .select("metadata")
          .eq("id", member.foyer_id)
          .maybeSingle();

        existingFoyerMeta = foyer?.metadata || {};
        const gcal = existingFoyerMeta.google_calendar;
        if (gcal) {
          if (!accessToken && gcal.access_token) accessToken = gcal.access_token;
          if (!refreshToken && gcal.refresh_token) refreshToken = gcal.refresh_token;
          if (!targetCalendarId && gcal.calendar_id) targetCalendarId = gcal.calendar_id;
          if (!overrideTargetType && gcal.target_type) targetType = gcal.target_type;
        }
      }
    }

    // Fonction helper pour rafraîchir le token Google via le refresh_token
    const refreshCurrentToken = async (): Promise<string | null> => {
      if (!refreshToken) return null;
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
          if (currentFoyerId && existingFoyerMeta) {
            await (adminSupabase as any)
              .from("foyers")
              .update({
                metadata: {
                  ...existingFoyerMeta,
                  google_calendar: {
                    ...(existingFoyerMeta.google_calendar || {}),
                    access_token: newTokens.access_token,
                  },
                },
                updated_at: new Date().toISOString(),
              })
              .eq("id", currentFoyerId);
          }
          return newTokens.access_token;
        }
      } catch (refreshErr) {
        console.warn("Avertissement rafraîchissement token Google:", refreshErr);
      }
      return null;
    };

    // Si le token est potentiellement manquant et qu'on a un refresh token, le rafraîchir
    if (refreshToken && (!accessToken || accessToken.length < 10)) {
      await refreshCurrentToken();
    }

    // Si toujours aucun jeton d'accès valide, refuser poliment et inviter à reconnecter (ZÉRO FAUX POSITIF)
    if (!accessToken) {
      return {
        success: false,
        message: "Votre session Google Agenda a expiré ou n'est pas encore connectée. Veuillez cliquer sur 'Se connecter à Google Agenda' pour autoriser l'accès.",
        syncedCount: 0,
        calendarName: targetType === "primary" ? "Agenda Principal" : "🚗 Entretien Véhicules (LaVigieAuto)",
        events: [],
        error: "Jeton d'accès Google introuvable ou expiré.",
      };
    }

    let calendarService = new GoogleCalendarService(accessToken);

    // Résolution de l'agenda cible (Dédié vs Principal)
    let effectiveCalendarId = targetType === "primary" ? "primary" : targetCalendarId;

    if (targetType === "dedicated" && (!effectiveCalendarId || effectiveCalendarId === "primary")) {
      try {
        effectiveCalendarId = await calendarService.getOrCreateLaVigieAutoCalendar();
        cookieStore.set("gcal_calendar_id", effectiveCalendarId, {
          httpOnly: true,
          path: "/",
          maxAge: 30 * 24 * 3600,
        });
      } catch (calErr: any) {
        // En cas d'erreur 401 (token expiré en base), tenter un rafraîchissement transparent
        if (refreshToken) {
          const freshToken = await refreshCurrentToken();
          if (freshToken) {
            calendarService = new GoogleCalendarService(freshToken);
            try {
              effectiveCalendarId = await calendarService.getOrCreateLaVigieAutoCalendar();
              cookieStore.set("gcal_calendar_id", effectiveCalendarId, {
                httpOnly: true,
                path: "/",
                maxAge: 30 * 24 * 3600,
              });
            } catch {
              effectiveCalendarId = "primary";
            }
          } else {
            effectiveCalendarId = "primary";
          }
        } else {
          console.warn("Repli sur le calendrier primary:", calErr);
          effectiveCalendarId = "primary";
        }
      }
    }

    if (!effectiveCalendarId) {
      effectiveCalendarId = "primary";
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

    // Nettoyer les anciens événements pour éviter les doublons
    try {
      await calendarService.clearLaVigieAutoCalendarEvents(effectiveCalendarId);
      if (effectiveCalendarId !== "primary") {
        await calendarService.clearLaVigieAutoCalendarEvents("primary");
      }
    } catch (clearErr) {
      console.warn("Avertissement nettoyage agenda Google Calendar:", clearErr);
    }

    const syncedEvents: SyncCalendarResult["events"] = [];
    let successfulInjections = 0;
    let lastInjectionError: string | null = null;

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

        try {
          await calendarService.injectBundleEvent({
            calendarId: effectiveCalendarId,
            bundle,
            vehicle: vehicleContext,
          });
          successfulInjections++;
        } catch (injectErr: any) {
          lastInjectionError = injectErr.message;
          console.warn("Avertissement injection calendrier dédié:", injectErr);
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

        try {
          await calendarService.injectCustomMaintenanceEvent({
            calendarId: effectiveCalendarId,
            summary: tireSummary,
            description: tireDesc,
            startDate: details.tires.nextReplacementDate,
          });
          successfulInjections++;
        } catch (tireErr: any) {
          lastInjectionError = tireErr.message;
          console.warn("Avertissement injection événement pneus:", tireErr);
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

        try {
          await calendarService.injectCustomMaintenanceEvent({
            calendarId: effectiveCalendarId,
            summary: brakeSummary,
            description: brakeDesc,
            startDate: brakeNextAxle.projectedReplacementDate,
          });
          successfulInjections++;
        } catch (brakeErr: any) {
          lastInjectionError = brakeErr.message;
          console.warn("Avertissement injection événement freinage:", brakeErr);
        }
      }
    }

    // Si aucune injection n'a réussi alors qu'il y avait des événements à injecter, signaler l'erreur réelle
    if (syncedEvents.length > 0 && successfulInjections === 0 && lastInjectionError) {
      return {
        success: false,
        message: `Échec de l'injection dans Google Agenda (${lastInjectionError}). Veuillez reconnecter votre compte Google.`,
        syncedCount: 0,
        calendarName: targetType === "primary" ? "Agenda Principal" : "🚗 Entretien Véhicules (LaVigieAuto)",
        events: [],
        error: lastInjectionError,
      };
    }

    // TRI STRICTEMENT CHRONOLOGIQUE DES ÉCHÉANCES (du plus proche au plus lointain)
    syncedEvents.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Mémoriser la date de dernière synchronisation dans les métadonnées du foyer
    if (currentFoyerId && existingFoyerMeta) {
      await (adminSupabase as any)
        .from("foyers")
        .update({
          metadata: {
            ...existingFoyerMeta,
            calendar_synced: true,
            google_calendar_connected: true,
            google_calendar: {
              ...(existingFoyerMeta.google_calendar || {}),
              connected: true,
              calendar_id: effectiveCalendarId,
              target_type: targetType,
              last_synced_at: new Date().toISOString(),
              synced_events_count: syncedEvents.length,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentFoyerId);
    }

    revalidatePath("/dashboard");

    const targetDisplayName =
      targetType === "primary"
        ? "votre Agenda Principal"
        : "l'agenda dédié « 🚗 Entretien Véhicules »";

    return {
      success: true,
      message: `Synchronisation réussie : ${syncedEvents.length} intervention(s) planifiée(s) par ordre chronologique dans ${targetDisplayName}.`,
      syncedCount: syncedEvents.length,
      calendarName: targetType === "primary" ? "Agenda Principal" : "🚗 Entretien Véhicules (LaVigieAuto)",
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
  cookieStore.delete("gcal_user_email");
  cookieStore.delete("gcal_synced_vehicles");
  cookieStore.delete("gcal_target_type");

  if (user) {
    const { data: member } = await (adminSupabase as any)
      .from("foyer_members")
      .select("foyer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (member?.foyer_id) {
      const { data: foyer } = await (adminSupabase as any)
        .from("foyers")
        .select("metadata")
        .eq("id", member.foyer_id)
        .maybeSingle();

      const currentMeta = foyer?.metadata || {};
      const { google_calendar, ...remainingMeta } = currentMeta;

      await (adminSupabase as any)
        .from("foyers")
        .update({
          metadata: {
            ...remainingMeta,
            calendar_synced: false,
            google_calendar_connected: false,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.foyer_id);
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}
