import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type ComputeRoutesResponse = {
  routes?: Array<{
    duration?: string;
    staticDuration?: string;
  }>;
};

type PredictDelayRequest = {
  tripId: string;
  currentLatitude: number;
  currentLongitude: number;
  trackingToken?: string;
};

const GOOGLE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.safarlink.in',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

function parseDurationSeconds(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/^(\d+)s$/);
  return match ? Number(match[1]) : 0;
}

function computePredictedStatus(plannedArrivalIso: string, predictedArrivalIso: string): 'on_time' | 'at_risk' | 'late' {
  const plannedMs = new Date(plannedArrivalIso).getTime();
  const predictedMs = new Date(predictedArrivalIso).getTime();

  if (predictedMs > plannedMs) return 'late';

  const diffMinutes = (plannedMs - predictedMs) / 60000;
  if (diffMinutes <= 60) return 'at_risk';

  return 'on_time';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!googleApiKey || !supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing GOOGLE_MAPS_API_KEY, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY.');
    }

    const body = (await req.json()) as PredictDelayRequest;
    if (!body.tripId || !Number.isFinite(body.currentLatitude) || !Number.isFinite(body.currentLongitude)) {
      return new Response(JSON.stringify({ error: 'tripId, currentLatitude, currentLongitude are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: trip, error: tripError } = await supabaseAdmin
      .from('trips')
      .select('id, destination, planned_arrival, status, tracking_token')
      .eq('id', body.tripId)
      .single();

    if (tripError || !trip) {
      throw new Error('Trip not found.');
    }

    if (body.trackingToken && trip.tracking_token !== body.trackingToken) {
      return new Response(JSON.stringify({ error: 'Tracking token mismatch.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const routesResponse = await fetch(GOOGLE_ROUTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.staticDuration',
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: body.currentLatitude,
              longitude: body.currentLongitude,
            },
          },
        },
        destination: {
          address: trip.destination,
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        languageCode: 'en-US',
        units: 'METRIC',
      }),
    });

    if (!routesResponse.ok) {
      const details = await routesResponse.text();
      throw new Error(`Google Routes API error (${routesResponse.status}): ${details}`);
    }

    const routeData = (await routesResponse.json()) as ComputeRoutesResponse;
    const durationSeconds = parseDurationSeconds(routeData.routes?.[0]?.duration)
      || parseDurationSeconds(routeData.routes?.[0]?.staticDuration);

    if (durationSeconds <= 0) {
      throw new Error('Unable to determine remaining travel time.');
    }

    const nowMs = Date.now();
    const predictedArrivalMs = nowMs + durationSeconds * 1000;
    const predictedArrivalIso = new Date(predictedArrivalMs).toISOString();

    const plannedMs = new Date(trip.planned_arrival).getTime();
    const delayMinutes = Math.max(Math.round((predictedArrivalMs - plannedMs) / 60000), 0);

    const predictedStatus =
      trip.status === 'delivered'
        ? 'delivered'
        : computePredictedStatus(trip.planned_arrival, predictedArrivalIso);

    const { error: updateError } = await supabaseAdmin
      .from('trips')
      .update({
        predicted_arrival: predictedArrivalIso,
        current_eta: predictedArrivalIso,
        delay_minutes: delayMinutes,
        status: predictedStatus,
      })
      .eq('id', trip.id);

    if (updateError) {
      throw updateError;
    }

    if (predictedStatus !== 'delivered') {
      const { data: latestStatusRows } = await supabaseAdmin
        .from('trip_status_updates')
        .select('status')
        .eq('trip_id', trip.id)
        .order('recorded_at', { ascending: false })
        .limit(1);

      const latestStatus = latestStatusRows?.[0]?.status;
      if (latestStatus !== predictedStatus) {
        await supabaseAdmin.from('trip_status_updates').insert({
          trip_id: trip.id,
          status: predictedStatus,
          note: `Auto risk update from predicted ETA: ${predictedStatus}`,
        });
      }
    }

    return new Response(
      JSON.stringify({
        tripId: trip.id,
        predictedArrival: predictedArrivalIso,
        delayMinutes,
        remainingTravelTimeSeconds: durationSeconds,
        predictedStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
