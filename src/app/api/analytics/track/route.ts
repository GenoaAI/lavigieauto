import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);

    if (!payload || !payload.eventName) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    // Log structuré pour l'observabilité Vercel & Cloudwatch
    console.log(
      JSON.stringify({
        level: 'info',
        service: 'analytics',
        event: payload.eventName,
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

    const response = NextResponse.json({ success: true });

    // Si l'utilisateur clique sur le CTA ou termine une analyse, on dépose un cookie d'attribution
    if (
      payload.eventName === 'maintenance_conversion_cta_click' ||
      payload.eventName === 'maintenance_dropzone_completed'
    ) {
      const attributionData = JSON.stringify({
        source: 'seo_landing',
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
