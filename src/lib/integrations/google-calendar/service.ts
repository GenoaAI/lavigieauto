import type { ProjectedMilestone } from "@/lib/engine/cycles";
import type { ReservationKit } from "@/lib/engine/reservation-kit";
import type { ServiceBundle } from "@/lib/engine/bundling";

export interface CalendarEventPayload {
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault: boolean;
    overrides: Array<{ method: "email" | "popup"; minutes: number }>;
  };
}

/**
 * Service to manage the dedicated "🚗 Entretien Véhicules" Google Calendar
 */
export class GoogleCalendarService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Find or create the dedicated calendar
   */
  async getOrCreateLaVigieAutoCalendar(): Promise<string> {
    const listRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (listRes.ok) {
      const data = await listRes.json();
      const existing = (data.items || []).find((c: any) => c.summary === "🚗 Entretien Véhicules");
      if (existing) return existing.id;
    }

    // Create new calendar
    const createRes = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: "🚗 Entretien Véhicules",
        description: "Calendrier automatique LaVigieAuto — Échéances constructeur, contrôles techniques et kits de réservation groupés.",
      }),
    });

    if (!createRes.ok) {
      throw new Error("Impossible de créer le calendrier Google dédié.");
    }

    const created = await createRes.json();
    return created.id;
  }

  /**
   * Clear existing LaVigieAuto events before syncing to prevent duplicate/split events
   */
  async clearLaVigieAutoCalendarEvents(calendarId: string): Promise<void> {
    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=250`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const events = data.items || [];
        for (const ev of events) {
          if (ev.summary?.includes("[LaVigieAuto]") || ev.summary?.includes("🚗")) {
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(ev.id)}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${this.accessToken}` },
              }
            );
          }
        }
      }
    } catch (err) {
      console.warn("Avertissement nettoyage événements Google Calendar:", err);
    }
  }

  /**
   * Inject a SINGLE bundled maintenance visit (grouping all operations for that date/window)
   */
  async injectBundleEvent(params: {
    calendarId: string;
    bundle: ServiceBundle;
    vehicle: {
      make: string;
      model: string;
      licensePlate: string;
      currentMileage: number;
    };
    attendeesEmails?: string[];
  }): Promise<string> {
    const { calendarId, bundle, vehicle, attendeesEmails = [] } = params;

    const operationsList = bundle.milestones
      .map((m, idx) => `  ${idx + 1}. ${m.title} (Cap: ${m.dueMileage} km — ~${m.estimatedCostEur || 100} €)`)
      .join("\n");

    const eventDescription = [
      `🚗 LAVIGIEAUTO — VISITE D'ENTRETIEN GROUPÉE (${bundle.milestones.length} OPÉRATION${bundle.milestones.length > 1 ? "S" : ""})`,
      `Véhicule : ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
      `Échéance cible : ~${bundle.targetMileage.toLocaleString("fr-FR")} km`,
      `Budget total estimé : ~${bundle.totalEstimatedCostMaxEur} €` +
        (bundle.estimatedLaborSavingsEur > 0
          ? ` (dont ~${bundle.estimatedLaborSavingsEur} € d'économie de main d'œuvre groupée)`
          : ""),
      ``,
      `📋 OPÉRATIONS À EFFECTUER LORS DE CET UNIQUE RDV :`,
      operationsList,
      ``,
      `📞 GESTE 1 — SCRIPT D'APPEL / SMS GARAGE :`,
      bundle.garagePhoneScript,
      ``,
      `📸 GESTE 2 — APRÈS LE RDV :`,
      `Prenez en photo la facture sur l'application LaVigieAuto pour clôturer d'un coup toutes ces alertes.`,
    ].join("\n");

    const eventSummary =
      bundle.milestones.length > 1
        ? `🚗 [LaVigieAuto] RDV Atelier (${bundle.milestones.length} opérations) — ${vehicle.make} ${vehicle.model}`
        : `🚗 [LaVigieAuto] ${bundle.milestones[0].title} — ${vehicle.make} ${vehicle.model}`;

    const computeNextDay = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    };

    const payload: CalendarEventPayload = {
      summary: eventSummary,
      description: eventDescription,
      start: { date: bundle.recommendedDate },
      end: { date: computeNextDay(bundle.recommendedDate) },
      attendees: attendeesEmails.map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 30 * 24 * 60 }, // J-30
          { method: "popup", minutes: 7 * 24 * 60 },  // J-7
          { method: "email", minutes: 7 * 24 * 60 },  // J-7
        ],
      },
    };

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erreur lors de l'injection de l'événement groupé dans Google Calendar: ${err}`);
    }

    const event = await res.json();
    return event.id;
  }

  /**
   * Inject maintenance milestone into calendar (fallback for single milestone)
   */
  async injectMilestoneEvent(params: {
    calendarId: string;
    milestone: ProjectedMilestone;
    kit: ReservationKit;
    garagePhone?: string;
    attendeesEmails?: string[];
  }): Promise<string> {
    const { calendarId, milestone, kit, attendeesEmails = [] } = params;

    const computeNextDay = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    };

    const eventDescription = [
      `🚗 LAVIGIEAUTO — PRÉCONISATION CONSTRUCTEUR`,
      `Véhicule : ${kit.vehicleSummary.makeModel} (${kit.vehicleSummary.licensePlate})`,
      `Échéance : ${milestone.title} (${milestone.dueMileage} km)`,
      `Budget estimé : ~${milestone.estimatedCostEur} €`,
      ``,
      `📞 GESTE 1 — SCRIPT D'APPEL / SMS GARAGE :`,
      kit.phoneScript,
      ``,
      `📋 VÉRIFICATIONS :`,
      `Réf demandées : ${kit.interventionsToRequest.map((i) => i.title).join(", ")}`,
      ``,
      `📸 GESTE 2 — APRÈS LE RDV :`,
      `Prenez en photo la facture sur l'application LaVigieAuto pour clôturer cette alerte.`,
    ].join("\n");

    const payload: CalendarEventPayload = {
      summary: `🚗 [LaVigieAuto] ${milestone.title} - ${kit.vehicleSummary.makeModel}`,
      description: eventDescription,
      start: { date: milestone.projectedDueDate },
      end: { date: computeNextDay(milestone.projectedDueDate) },
      attendees: attendeesEmails.map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 30 * 24 * 60 }, // J-30
          { method: "popup", minutes: 7 * 24 * 60 },  // J-7
          { method: "email", minutes: 7 * 24 * 60 },  // J-7
        ],
      },
    };

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error("Erreur lors de l'injection de l'événement dans Google Calendar.");
    }

    const event = await res.json();
    return event.id;
  }
}
