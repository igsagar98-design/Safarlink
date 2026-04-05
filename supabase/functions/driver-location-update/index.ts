import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type DriverLocationUpdateRequest = {
  tripId: string;
  currentLatitude: number;
  currentLongitude: number;
  trackingToken?: string;
  force?: boolean;
};

// ---------------------------------------------------------------------------
// CORS
// Allow requests from your production domain. Every single response —
// including OPTIONS preflight, error, and success — must carry these headers.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGIN = 'https://www.safarlink.in';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

const toLocationName = (latitude: number, longitude: number) =>
  `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

Deno.serve(async (req) => {
  // ------------------------------------------------------------------
  // Step 1 — Handle preflight (OPTIONS) immediately, before any logic.
  // The browser sends this before every cross-origin POST request.
  // If this doesn't return 200 with CORS headers, the real request
  // is never sent and you'll see "ERR_FAILED / no CORS header" errors.
  // ------------------------------------------------------------------
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ------------------------------------------------------------------
  // Step 2 — Main business logic wrapped in try/catch so that errors
  // always produce a response with CORS headers (never a bare 500).
  // ------------------------------------------------------------------
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    }

    const body = (await req.json()) as DriverLocationUpdateRequest;

    if (!body.tripId || !Number.isFinite(body.currentLatitude) || !Number.isFinite(body.currentLongitude)) {
      return new Response(
        JSON.stringify({ error: 'tripId, currentLatitude, and currentLongitude are required.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ----------------------------------------------------------------
    // YOUR GPS UPDATE LOGIC LIVES HERE — paste any custom logic below.
    // ----------------------------------------------------------------

    const { data: trip, error: tripError } = await supabaseAdmin
      .from('trips')
      .select('id, tracking_token, status, last_prediction_at')
      .eq('id', body.tripId)
      .maybeSingle();

    if (tripError) throw tripError;
    if (!trip) {
      return new Response(JSON.stringify({ error: 'Trip not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.trackingToken && trip.tracking_token !== body.trackingToken) {
      return new Response(JSON.stringify({ error: 'Tracking token mismatch.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (trip.status === 'delivered') {
      return new Response(JSON.stringify({ ok: true, skipped: 'trip_delivered' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lastUpdateAt = new Date().toISOString();
    const locationName = toLocationName(body.currentLatitude, body.currentLongitude);

    // Overwrite latest coordinates only.
    const { error: updateError } = await supabaseAdmin
      .from('trips')
      .update({
        last_latitude: body.currentLatitude,
        last_longitude: body.currentLongitude,
        last_location_name: locationName,
        last_update_at: lastUpdateAt,
      })
      .eq('id', trip.id);

    if (updateError) throw updateError;

    // ----------------------------------------------------------------
    // Throttled Prediction Logic (Every 2 minutes, unless forced)
    // ----------------------------------------------------------------
    let predictionResult = null;
    const PREDICTION_THROTTLE_MS = 2 * 60 * 1000;
    const now = Date.now();
    const lastPred = trip.last_prediction_at ? new Date(trip.last_prediction_at).getTime() : 0;
    const isForced = body.force === true;

    if (isForced || (now - lastPred > PREDICTION_THROTTLE_MS)) {
      console.log(`[driver-location-update] Triggering prediction for trip: ${trip.id} (Forced: ${isForced})`);
      try {
        const predResponse = await fetch(`${supabaseUrl}/functions/v1/predict-delay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            tripId: trip.id,
            currentLatitude: body.currentLatitude,
            currentLongitude: body.currentLongitude,
            trackingToken: body.trackingToken,
          }),
        });

        if (predResponse.ok) {
          predictionResult = await predResponse.json();
          // Update last_prediction_at timestamp
          await supabaseAdmin
            .from('trips')
            .update({ last_prediction_at: new Date().toISOString() })
            .eq('id', trip.id);
        } else {
          console.error(`[driver-location-update] Prediction failed: ${await predResponse.text()}`);
        }
      } catch (err) {
        console.error(`[driver-location-update] Prediction error: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        tripId: trip.id,
        lastLatitude: body.currentLatitude,
        lastLongitude: body.currentLongitude,
        lastLocationName: locationName,
        lastUpdateAt,
        prediction: predictionResult ? 'updated' : 'throttled',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // Always return CORS headers on errors so the browser doesn't mask
    // the real failure with a generic "no CORS header" message.
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
