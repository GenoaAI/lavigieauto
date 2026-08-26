/**
 * Module Universel de Gestion et d'Export de Calendriers (RFC 5545 iCalendar, WebCal & Webmail URLs)
 * Compatible avec tous les fournisseurs et applications :
 * - Fichiers .ics pour Apple Calendar, Microsoft Outlook Desktop, Thunderbird, Yahoo desktop, smartphones
 * - URLs directes pour Google Calendar, Microsoft Outlook / Office 365, Yahoo Mail & Calendar
 */

export interface UniversalCalendarEvent {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string; // "YYYY-MM-DD" ou ISO string
  endDate?: string;   // "YYYY-MM-DD" ou ISO string
  allDay?: boolean;
  vehicleMakeModel?: string;
  licensePlate?: string;
  dueMileage?: number;
  estimatedCostEur?: number;
  garageName?: string;
  garagePhone?: string;
  garageAddress?: string;
}

/**
 * Nettoie et échappe les caractères spéciaux pour le format RFC 5545
 */
export function escapeIcsText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Formate une date en chaîne ICS (YYYYMMDD ou YYYYMMDDTHHMMSSZ)
 */
export function formatIcsDate(dateInput: string | Date, allDay: boolean = true): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    const now = new Date();
    return now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");

  if (allDay) {
    return `${year}${month}${day}`;
  }

  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Formate une date pour Google / Outlook / Yahoo URL (YYYYMMDD ou YYYYMMDDTHHMMSSZ)
 */
export function formatUrlDate(dateStr: string, isEnd: boolean = false): string {
  const clean = dateStr.replace(/[^0-9-]/g, "").slice(0, 10);
  const parts = clean.split("-");
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, "0");
    const d = parts[2].padStart(2, "0");
    if (isEnd) {
      // Jour suivant pour all-day event
      const dateObj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + 1));
      const ny = dateObj.getUTCFullYear();
      const nm = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
      const nd = String(dateObj.getUTCDate()).padStart(2, "0");
      return `${ny}${nm}${nd}`;
    }
    return `${y}${m}${d}`;
  }
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Construit la description détaillée d'une intervention
 */
export function buildEventFullDescription(event: UniversalCalendarEvent): string {
  const parts: string[] = [];

  if (event.vehicleMakeModel) {
    parts.push(`🚗 Véhicule : ${event.vehicleMakeModel}${event.licensePlate ? ` [${event.licensePlate}]` : ""}`);
  }
  if (event.dueMileage && event.dueMileage > 0) {
    parts.push(`📍 Kilométrage cible estimé : ${event.dueMileage} km (${event.dueMileage.toLocaleString("fr-FR")} km)`);
  }

  if (event.estimatedCostEur && event.estimatedCostEur > 0) {
    parts.push(`💶 Budget prévisionnel moyen : ~${event.estimatedCostEur} € TTC`);
  }
  if (event.garageName) {
    parts.push(`🔧 Atelier préconisé : ${event.garageName}${event.garagePhone ? ` (📞 ${event.garagePhone})` : ""}`);
  }
  if (event.garageAddress) {
    parts.push(`📍 Adresse atelier : ${event.garageAddress}`);
  }

  if (event.description) {
    parts.push(`\n📝 Détails des opérations :\n${event.description}`);
  }

  parts.push(`\n🛡️ Généré par LaVigieAuto — Gardien Numérique de votre Véhicule`);

  return parts.join("\n");
}

/**
 * Génère le contenu d'un fichier .ics standard (RFC 5545) avec rappels J-30 et J-7
 */
export function generateIcsContent(eventsInput: UniversalCalendarEvent | UniversalCalendarEvent[]): string {
  const events = Array.isArray(eventsInput) ? eventsInput : [eventsInput];
  const nowStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const vEvents = events.map((ev, index) => {
    const uid = ev.id || `lavigieauto-${Date.now()}-${index}@lavigieauto.com`;
    const dtStart = formatIcsDate(ev.startDate, true);
    const dtEnd = ev.endDate ? formatIcsDate(ev.endDate, true) : formatIcsDate(ev.startDate, true);
    const summary = escapeIcsText(ev.title);
    const description = escapeIcsText(buildEventFullDescription(ev));
    const location = escapeIcsText(ev.garageAddress || ev.location || ev.garageName || "Atelier Automobile");

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      // Rappel 1 : J-30 (30 jours avant)
      "BEGIN:VALARM",
      "TRIGGER:-P30D",
      "ACTION:DISPLAY",
      `DESCRIPTION:Rappel J-30 : ${summary}`,
      "END:VALARM",
      // Rappel 2 : J-7 (7 jours avant)
      "BEGIN:VALARM",
      "TRIGGER:-P7D",
      "ACTION:DISPLAY",
      `DESCRIPTION:Rappel J-7 : ${summary}`,
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LaVigieAuto//Universal Vehicle Calendar//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:🚗 Entretien Véhicules (LaVigieAuto)",
    "X-WR-CALDESC:Échéances et entretiens de vos véhicules gérés par LaVigieAuto",
    ...vEvents,
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Génère le lien direct pour ajouter l'événement dans Google Calendar
 */
export function generateGoogleCalendarUrl(event: UniversalCalendarEvent): string {
  const baseUrl = "https://calendar.google.com/calendar/render";
  const start = formatUrlDate(event.startDate, false);
  const end = formatUrlDate(event.startDate, true);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: buildEventFullDescription(event),
    location: event.garageAddress || event.location || event.garageName || "",
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Génère le lien direct pour ajouter l'événement dans Outlook Web / Office 365
 */
export function generateOutlookCalendarUrl(event: UniversalCalendarEvent): string {
  const baseUrl = "https://outlook.live.com/calendar/0/deeplink/compose";
  const start = `${event.startDate.slice(0, 10)}T08:00:00`;
  const end = `${event.startDate.slice(0, 10)}T09:00:00`;

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: start,
    enddt: end,
    body: buildEventFullDescription(event),
    location: event.garageAddress || event.location || event.garageName || "",
    allday: "true",
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Génère le lien direct pour ajouter l'événement dans Yahoo Mail & Calendar
 */
export function generateYahooCalendarUrl(event: UniversalCalendarEvent): string {
  const baseUrl = "https://calendar.yahoo.com/";
  const start = formatUrlDate(event.startDate, false);
  const end = formatUrlDate(event.startDate, true);

  const params = new URLSearchParams({
    v: "60",
    view: "d",
    type: "20",
    title: event.title,
    st: start,
    et: end,
    desc: buildEventFullDescription(event),
    in_loc: event.garageAddress || event.location || event.garageName || "",
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Déclenche le téléchargement côté navigateur du fichier .ics généré
 */
export function downloadIcsFile(filename: string, icsContent: string): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".ics") ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
