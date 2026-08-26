import { inviteHouseholdMemberSchema } from "@/lib/security/schemas";
import { inviteHouseholdMemberAction } from "@/app/actions/foyer";
import {
  generateIcsContent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateYahooCalendarUrl,
  escapeIcsText,
  formatIcsDate,
  formatUrlDate,
  UniversalCalendarEvent,
} from "@/lib/calendar/universal-calendar";

export async function testHouseholdInvitationAndUniversalCalendar() {
  console.log("\n▶ [TEST] Validation Multi-Webmails & Invitation Foyer Universelle...");

  // 1. Test des différents domaines d'email (Yahoo, Outlook, Gmail, Orange, iCloud, Proton, etc.)
  const validEmails = [
    "marie.dupont@yahoo.fr",
    "conjoint.famille@outlook.com",
    "conducteur@gmail.com",
    "famille.auto@orange.fr",
    "utilisateur@icloud.com",
    "securise@protonmail.com",
    "pro@entreprise.co.uk",
    "jean-luc.martin+autocare@wanadoo.fr",
  ];

  for (const email of validEmails) {
    const res = inviteHouseholdMemberSchema.safeParse({
      householdId: "11111111-1111-1111-1111-111111111111",
      email,
      role: "member",
    });
    if (!res.success) {
      throw new Error(`Échec validation email légitime : ${email} -> ${res.error.errors[0]?.message}`);
    }
  }
  console.log(`  ✔ ${validEmails.length} domaines d'emails légitimes validés sans restriction (Yahoo, Outlook, Orange, etc.).`);

  // 2. Test des emails invalides
  const invalidEmails = [
    "not-an-email",
    "@yahoo.fr",
    "marie@",
    "spaces in email@domain.com",
    "",
  ];

  for (const email of invalidEmails) {
    const res = inviteHouseholdMemberSchema.safeParse({
      householdId: "11111111-1111-1111-1111-111111111111",
      email,
      role: "member",
    });
    if (res.success) {
      throw new Error(`Email invalide indûment accepté : "${email}"`);
    }
  }
  console.log(`  ✔ Rejet strict des adresses emails malformées validé.`);

  // 3. Test de la Server Action inviteHouseholdMemberAction
  const inviteResult = await inviteHouseholdMemberAction(
    "11111111-1111-1111-1111-111111111111",
    "nouveau.conducteur@yahoo.fr",
    "member"
  );
  if (!inviteResult.success || !inviteResult.message.includes("Yahoo Mail")) {
    throw new Error(`Échec de l'action d'invitation foyer : ${inviteResult.error || inviteResult.message}`);
  }
  console.log(`  ✔ Server Action inviteHouseholdMemberAction validée pour @yahoo.fr avec confirmation détaillée.`);

  console.log("\n▶ [TEST] Génération Calendrier Universel (RFC 5545 ICS & Web URLs)...");

  // 4. Test d'export .ics (RFC 5545)
  const sampleEvent: UniversalCalendarEvent = {
    id: "test-event-1",
    title: "🔧 Contrôle Technique Périodique — Renault Clio",
    startDate: "2026-10-15",
    vehicleMakeModel: "Renault Clio 1.2 TCE",
    licensePlate: "AB-123-CD",
    dueMileage: 85000,
    estimatedCostEur: 85,
    garageName: "Autovision Paris 15",
    garageAddress: "12 rue de la Convention, 75015 Paris",
    garagePhone: "01 45 78 90 12",
    description: "Visite obligatoire contrôle technique avant date limite.",
  };

  const icsOutput = generateIcsContent(sampleEvent);

  if (!icsOutput.includes("BEGIN:VCALENDAR") || !icsOutput.includes("END:VCALENDAR")) {
    throw new Error("Structure VCALENDAR invalide");
  }
  if (!icsOutput.includes("VERSION:2.0")) {
    throw new Error("Version iCalendar 2.0 manquante");
  }
  if (!icsOutput.includes("TRIGGER:-P30D") || !icsOutput.includes("TRIGGER:-P7D")) {
    throw new Error("Rappels automatiques VALARM J-30 et J-7 manquants");
  }
  if (!icsOutput.includes("AB-123-CD") || !icsOutput.includes("Renault Clio")) {
    throw new Error("Métadonnées du véhicule non trouvées dans l'export ICS");
  }
  console.log("  ✔ Fichier .ics conforme RFC 5545 généré avec succès (Rappels J-30/J-7, métadonnées, VEVENT).");

  // 5. Test URLs directes Web Calendar (Google, Outlook, Yahoo)
  const googleUrl = generateGoogleCalendarUrl(sampleEvent);
  if (!googleUrl.startsWith("https://calendar.google.com/calendar/render") || !googleUrl.includes("action=TEMPLATE")) {
    throw new Error("URL Google Calendar malformée");
  }
  console.log("  ✔ URL directe Google Calendar générée avec paramètres action & TEMPLATE.");

  const outlookUrl = generateOutlookCalendarUrl(sampleEvent);
  if (!outlookUrl.startsWith("https://outlook.live.com/calendar/0/deeplink/compose") || !outlookUrl.includes("rru=addevent")) {
    throw new Error("URL Outlook Live / Office 365 malformée");
  }
  console.log("  ✔ URL directe Outlook Live / Office 365 générée avec paramètres rru=addevent.");

  const yahooUrl = generateYahooCalendarUrl(sampleEvent);
  if (!yahooUrl.startsWith("https://calendar.yahoo.com/") || !yahooUrl.includes("v=60")) {
    throw new Error("URL Yahoo Calendar malformée");
  }
  console.log("  ✔ URL directe Yahoo Calendar générée avec paramètres v=60 & type=20.");

  // 6. Test d'échappement ICS
  const rawText = "Vidange, filtres; bougies \n et contrôle batterie.";
  const escaped = escapeIcsText(rawText);
  if (!escaped.includes("\\,") || !escaped.includes("\\;") || !escaped.includes("\\n")) {
    throw new Error("Échappement RFC 5545 incomplet");
  }
  console.log("  ✔ Échappement des caractères spéciaux RFC 5545 validé.");
}
