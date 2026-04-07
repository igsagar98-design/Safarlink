import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { computeRoute } from '../_shared/google-routes.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Driver Location Update (Centralized Logic)
 * Responsibilities:
 * 1. Store latest driver coordinates (every 30s)
 * 2. Throttle ETA recalculation via Google Routes API (every 2m)
 * 3. Update route progress percentage (0-100%)
 * 4. Serve as the Single Source of Truth for both APK and Web App
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { tripId, latitude, longitude, currentLatitude, currentLongitude, trackingToken } = await req.json();
    
    // APK uses currentLatitude/currentLongitude, Backend uses latitude/longitude. Handle both.
    const lat = latitude ?? currentLatitude;
    const lng = longitude ?? currentLongitude;
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')?.trim();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

    if (!googleApiKey || !supabaseUrl || !serviceRoleKey) {
      throw new Error('Server configuration missing keys.');
    }

    if (!tripId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ error: 'Missing required tracking data.' }), { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch current trip state
    const { data: trip, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !trip) throw new Error(`Trip ${tripId} not found.`);

    // Optional tracking token security check
    if (trackingToken && trip.tracking_token !== trackingToken) {
      return new Response(JSON.stringify({ error: 'Access denied.' }), { status: 403 });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // 2. PRIMARY: Update driver coordinates into the SINGLE SOURCE OF TRUTH fields
    const { error: locUpdateError } = await supabase
      .from('trips')
      .update({
        last_driver_latitude: lat,
        last_driver_longitude: lng,
        last_driver_location_at: nowIso,
        is_live_tracking: true,
        // Sync legacy columns to maintain compatibility with existing tracking views if any
        last_latitude: lat,
        last_longitude: lng,
        last_update_at: nowIso,
        is_location_live: true
      })
      .eq('id', tripId);

    if (locUpdateError) throw locUpdateError;

    // Log the update in historical history
    await supabase.from('trip_location_updates').insert({
      trip_id: tripId,
      latitude: lat,
      longitude: lng,
      recorded_at: nowIso
    });

    // 3. THROTTLED RECALCULATION: Check if we should call Google (2 minute cooldown)
    const lastCalc = trip.last_eta_calculated_at ? new Date(trip.last_eta_calculated_at) : new Date(0);
    const cooldownMs = 2 * 60 * 1000;
    const timeSinceLastCalc = now.getTime() - lastCalc.getTime();

    // Only recalculate if trip is active (on_time, at_risk, late) and cooldown has passed
    const activeStatuses = ['on_time', 'at_risk', 'late', 'active'];
    if (!activeStatuses.includes(trip.status) || timeSinceLastCalc < cooldownMs) {
      console.log(`[driver-location-update] Throttling ETA for trip ${tripId}. Time since last calc: ${Math.round(timeSinceLastCalc/1000)}s`);
      return new Response(JSON.stringify({ 
        ok: true, 
        updated: 'location_only',
        nextEtaRefreshSec: Math.max(0, Math.ceil((cooldownMs - timeSinceLastCalc) / 1000))
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 4. RECALCULATION: Call Google Routes API
    console.log(`[driver-location-update] Refreshing metrics for trip ${tripId}`);
    
    // Safety check: ensure baseline exists
    if (!trip.drop_latitude || !trip.drop_longitude) {
      console.warn(`[driver-location-update] Trip ${tripId} missing drop coordinates. Cannot compute live metrics.`);
      return new Response(JSON.stringify({ ok: true, warning: 'Baseline missing' }), { headers: CORS_HEADERS });
    }

    try {
      const liveRoute = await computeRoute(
        { lat: lat, lng: lng },
        { lat: trip.drop_latitude, lng: trip.drop_longitude },
        googleApiKey
      );

      // Calculation of Route Progress
      const baselineDist = trip.route_distance_meters || liveRoute.distanceMeters;
      const remainingDist = liveRoute.distanceMeters;
      
      // Progress Formula: ((Total - Remaining) / Total) * 100
      let progress = ((baselineDist - remainingDist) / baselineDist) * 100;
      progress = Math.max(0, Math.min(100, progress)); // Clamp between 0-100

      const predictedEtaAt = new Date(now.getTime() + liveRoute.durationSeconds * 1000).toISOString();

      const { error: metricsError } = await supabase
        .from('trips')
        .update({
          remaining_distance_meters: remainingDist,
          remaining_duration_seconds: liveRoute.durationSeconds,
          predicted_eta_at: predictedEtaAt,
          route_progress_percent: progress.toFixed(2),
          last_eta_calculated_at: nowIso
        })
        .eq('id', tripId);

      if (metricsError) throw metricsError;

      return new Response(JSON.stringify({ 
        ok: true, 
        updated: 'all_metrics',
        progress: progress.toFixed(2),
        eta: predictedEtaAt,
        lat,
        lng
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });

    } catch (gErr: any) {
      console.error(`[driver-location-update] Google API Failure: ${gErr.message}`);
      // Fallback: Preserve last known state on Google failure to avoid UI jumps
      return new Response(JSON.stringify({ ok: true, error: 'Google API unreachable' }), { headers: CORS_HEADERS });
    }

  } catch (err: any) {
    console.error(`[driver-location-update] Fatal: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
