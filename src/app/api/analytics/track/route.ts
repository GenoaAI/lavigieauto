import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);

    if (!payload || (!payload.eventName && !payload.eventType && !payload.event_type)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const eventName = payload.eventName || payload.eventType || payload.event_type;

    // Log structuré pour l'observabilité Vercel & Cloudwatch
    console.log(
      JSON.stringify({
        level: 'info',
        service: 'analytics',
        event: eventName,
        brand: payload.brand,
        model: payload.model,
        engine: payload.engine,
        source: payload.source,
        destination: payload.destination,
        url: payload.url,
        referrer: payload.referrer,
        timestamp: payload.timestamp || new Date().toISOString(),
      })
    );

    // Résolution du type d'événement pour la table micro_conversions
    const mappedEventType = (() => {
      const explicitType = payload.eventType || payload.event_type;
      if (
        explicitType &&
        [
          'pdf_download_print',
          'lead_magnet_submit',
          'dropzone_upload',
          'dropzone_completed',
          'conversion_cta',
        ].includes(explicitType)
      ) {
        return explicitType;
      }
      switch (payload.eventName) {
        case 'maintenance_dropzone_interaction':
          return 'dropzone_upload';
        case 'maintenance_dropzone_completed':
          return 'dropzone_completed';
        case 'maintenance_conversion_cta_click':
          return 'conversion_cta';
        case 'pdf_download_print':
          return 'pdf_download_print';
        case 'lead_magnet_submit':
          return 'lead_magnet_submit';
        default:
          return null;
      }
    })();

    // Persistance dans public.micro_conversions
    if (mappedEventType) {
      try {
        const adminSupabase = createAdminClient();
        await (adminSupabase as any).from('micro_conversions').insert({
          event_type: mappedEventType,
          brand: payload.brand || null,
          model: payload.model || null,
          engine: payload.engine || null,
          url: payload.url || null,
          visitor_id: payload.visitorId || payload.visitor_id || null,
          metadata: payload.metadata || { source: payload.source || 'client_track' },
        });
      } catch (dbErr) {
        console.error('[Analytics DB Insert Error]', dbErr);
      }
    }

    const response = NextResponse.json({ success: true });

    // Si l'utilisateur clique sur le CTA ou termine une analyse, on dépose un cookie d'attribution
    if (
      payload.eventName === 'maintenance_conversion_cta_click' ||
      payload.eventName === 'maintenance_dropzone_completed' ||
      mappedEventType === 'conversion_cta' ||
      mappedEventType === 'lead_magnet_submit'
    ) {
      const attributionData = JSON.stringify({
        source: payload.source || 'seo_landing',
        brand: payload.brand,
        model: payload.model,
        engine: payload.engine,
        url: payload.url,
        timestamp: new Date().toISOString(),
      });

      response.cookies.set('lavigie_lead_source', attributionData, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 jours
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return response;
  } catch (error) {
    console.error('[Analytics Error]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
