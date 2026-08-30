export type MaintenanceEventName =
  | 'maintenance_page_view'
  | 'maintenance_dropzone_interaction'
  | 'maintenance_dropzone_completed'
  | 'maintenance_conversion_cta_click';

export interface MaintenanceEventPayload {
  eventName: MaintenanceEventName;
  brand: string;
  model: string;
  engine: string;
  brandSlug?: string;
  modelSlug?: string;
  engineSlug?: string;
  source?: 'camera' | 'upload' | 'drag_drop';
  destination?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Envoie un événement de tracking de manière asynchrone et non-bloquante (sendBeacon / fetch).
 * Conforme RGPD : ne collecte aucune donnée personnelle nominative sans consentement.
 */
export function trackMaintenanceEvent(payload: MaintenanceEventPayload): void {
  if (typeof window === 'undefined') return;

  const eventData = {
    ...payload,
    url: window.location.href,
    referrer: document.referrer || undefined,
    timestamp: new Date().toISOString(),
  };

  // 1. Déclencheur GTM / DataLayer si configuré
  try {
    const win = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    if (Array.isArray(win.dataLayer)) {
      win.dataLayer.push({
        event: payload.eventName,
        ...eventData,
      });
    }
    if (typeof win.gtag === 'function') {
      win.gtag('event', payload.eventName, eventData);
    }
  } catch {
    // Silencieux
  }

  // 2. Envoi via Beacon ou Fetch au serveur de télémétrie interne
  try {
    const endpoint = '/api/analytics/track';
    const body = JSON.stringify(eventData);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        // Silencieux
      });
    }
  } catch {
    // Silencieux
  }

  // 3. Émission d'un CustomEvent pour extensions ou modules UI
  try {
    window.dispatchEvent(
      new CustomEvent('lavigieauto:analytics', {
        detail: eventData,
      })
    );
  } catch {
    // Silencieux
  }
}
