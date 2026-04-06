import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// Driver Location Update
//
// Called by the driver's mobile app every 15 seconds.
// Responsibilities:
//   1. Update trip's last known coordinates
//   2. Set last_location_received_at = NOW() and is_location_live = true
//   3. Append the ping to trip_location_updates history
//   4. Trigger ETA prediction immediately if this is the FIRST ping for the trip
//      (subsequent predictions are handled by the eta-updater cron function)
// ─────────────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Statuses that block location processing
const TERMINAL_STATUSES = ['delivered', 'cancelled'];

type DriverLocationUpdateRequest = {
  tripId: string;
  currentLatitude: number;
  currentLongitude: number;
  trackingToken?: string;
  force?: boolean;
};

const toLocationName = (lat: number, lng: number) =>
  `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    }

    const body = (await req.json()) as DriverLocationUpdateRequest;

    if (!body.tripId || !Number.isFinite(body.currentLatitude) || !Number.isFinite(body.currentLongitude)) {
      return json({ error: 'tripId, currentLatitude, and currentLongitude are required.' }, 400);
    }

    const db = createClient(supabaseUrl, serviceRoleKey);

    // ── 1. Fetch trip ──────────────────────────────────────────────────────────
    const { data: trip, error: tripError } = await db
      .from('trips')
      .select('id, tracking_token, status, last_location_received_at, eta_last_calculated_at')
      .eq('id', body.tripId)
      .maybeSingle();

    if (tripError) throw tripError;
    if (!trip) return json({ error: 'Trip not found.' }, 404);

    if (body.trackingToken && trip.tracking_token !== body.trackingToken) {
      return json({ error: 'Tracking token mismatch.' }, 403);
    }

    // Skip terminal trips
    if (TERMINAL_STATUSES.includes(trip.status)) {
      return json({ ok: true, skipped: `trip_${trip.status}` });
    }

    const now         = new Date().toISOString();
    const locationName = toLocationName(body.currentLatitude, body.currentLongitude);

    // ── 2. Update trip coordinates + mark location as live ────────────────────
    const { error: updateError } = await db
      .from('trips')
      .update({
        last_latitude:              body.currentLatitude,
        last_longitude:             body.currentLongitude,
        last_location_name:         locationName,
        last_update_at:             now,
        last_location_received_at:  now,
        is_location_live:           true,
      })
      .eq('id', trip.id);

    if (updateError) throw updateError;

    // ── 3. Append to history ───────────────────────────────────────────────────
    await db.from('trip_location_updates').insert({
      trip_id:       trip.id,
      latitude:      body.currentLatitude,
      longitude:     body.currentLongitude,
      location_name: locationName,
      recorded_at:   now,
    });

    // ── 4. First-ping ETA trigger ──────────────────────────────────────────────
    // If this trip has never had a location before (no previous GPS ping),
    // trigger ETA calculation immediately without waiting for the 2-min cron.
    const isFirstPing     = !trip.last_location_received_at;
    const isForced        = body.force === true;
    const hasNeverPredict = !trip.eta_last_calculated_at;

    if (isFirstPing || isForced || hasNeverPredict) {
      console.log(`[driver-location-update] First ping / forced — triggering immediate ETA for trip ${trip.id}`);

      // Trigger eta-updater directly (it will process this trip)
      fetch(`${supabaseUrl}/functions/v1/eta-updater`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ triggeredBy: 'first_ping', tripId: trip.id }),
      }).catch((err) => {
        console.warn('[driver-location-update] eta-updater trigger failed:', err.message);
      });
    }

    return json({
      ok:              true,
      tripId:          trip.id,
      lastLatitude:    body.currentLatitude,
      lastLongitude:   body.currentLongitude,
      lastLocationName: locationName,
      lastUpdateAt:    now,
      isFirstPing,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[driver-location-update] Error:', message);
    return json({ error: message }, 500);
  }
});
