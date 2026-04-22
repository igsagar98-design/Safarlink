import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { computeRoute, geocodeAddress, computeStraightLineProgress, haversineDistance } from '../_shared/google-routes.ts';


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
    const payload = await req.json();
    const tripId = payload.tripId || payload.trip_id || payload.id;
    const trackingToken = payload.trackingToken || payload.tracking_token;
    
    // Aggressively parse coordinates no matter what the APK developer named them
    const receivedLat = payload.latitude ?? payload.currentLatitude ?? payload.lat ?? payload.current_latitude ?? payload.last_latitude;
    const receivedLng = payload.longitude ?? payload.currentLongitude ?? payload.lng ?? payload.current_longitude ?? payload.last_longitude;
    
    // Support manual coordinate fixes via payload
    const manualPickupLat = payload.pickupLat || payload.pickup_latitude;
    const manualPickupLng = payload.pickupLng || payload.pickup_longitude;
    const manualDropLat   = payload.dropLat   || payload.drop_latitude;
    const manualDropLng   = payload.dropLng   || payload.drop_longitude;

    const lat = Number(receivedLat);
    const lng = Number(receivedLng);

    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')?.trim();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

    if (!googleApiKey || !supabaseUrl || !serviceRoleKey) {
      throw new Error('Server configuration missing keys.');
    }

    if (!tripId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn(`[driver-location-update] Invalid payload dropped:`, payload);
      return new Response(JSON.stringify({ error: 'Missing required tracking data. Ensure you pass tripId, lat, and lng accurately.' }), { status: 400 });
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

    // Only recalculate if trip is active and cooldown has passed.
    // Includes all mobile app driving states: on_route, reached_pickup, arrived_destination
    // 3. FETCH/GEOCODE BASELINE COORDINATES (Required for Progress Calc)
    // Priority: Manual Payload > Existing DB > Geocoding
    let destLat = manualDropLat || trip.drop_latitude;
    let destLng = manualDropLng || trip.drop_longitude;
    if (!destLat || !destLng) {
      try {
        const q = await geocodeAddress(trip.destination, googleApiKey);
        destLat = q.lat;
        destLng = q.lng;
        // background save only if not already attempting a manual fix
        if (!manualDropLat) {
          supabase.from('trips').update({ drop_latitude: destLat, drop_longitude: destLng }).eq('id', tripId).then();
        }
      } catch (err) { console.warn(`[driver-location-update] Geocode dst failed`); }
    }

    let pickupLat = manualPickupLat || trip.pickup_latitude;
    let pickupLng = manualPickupLng || trip.pickup_longitude;
    if (!pickupLat || !pickupLng) {
      try {
        const q = await geocodeAddress(trip.origin, googleApiKey);
        pickupLat = q.lat;
        pickupLng = q.lng;
        // Safety check: don't save origin if it's identical to destination (avoid geocode loops/poisoning)
        if (!manualPickupLat && (pickupLat !== destLat)) {
          supabase.from('trips').update({ pickup_latitude: pickupLat, pickup_longitude: pickupLng }).eq('id', tripId).then();
        }
      } catch (err) { console.warn(`[driver-location-update] Geocode org failed`); }
    }

    // Apply manual overrides to DB immediately if provided
    if (manualPickupLat || manualDropLat) {
      const updateObj: any = {};
      if (manualPickupLat) { updateObj.pickup_latitude = manualPickupLat; updateObj.pickup_longitude = manualPickupLng; }
      if (manualDropLat)   { updateObj.drop_latitude   = manualDropLat;   updateObj.drop_longitude   = manualDropLng; }
      await supabase.from('trips').update(updateObj).eq('id', tripId);
    }

    // 4. CALCULATE REAL-TIME PROGRESS (Birds-Eye / Haversine)
    let progress = trip.route_progress_percent;
    if (pickupLat && pickupLng && destLat && destLng) {
      progress = computeStraightLineProgress(pickupLat, pickupLng, lat, lng, destLat, destLng);
    }

    // 5. UPDATE LOCATION & PROGRESS (Non-throttled)
    const { error: liveDataError } = await supabase
      .from('trips')
      .update({
        last_latitude: lat,
        last_longitude: lng,
        last_update_at: nowIso,
        last_driver_latitude: lat,
        last_driver_longitude: lng,
        last_driver_location_at: nowIso,
        last_location_received_at: nowIso, // Critical: matched by eta-updater filter
        route_progress_percent: typeof progress === 'number' ? progress.toFixed(2) : progress,
        is_live_tracking: true,
        is_location_live: true,
        is_active: true
      })
      .eq('id', tripId);

    // 6. THROTTLE: Only proceed to Google Routes API for ETA every 2 minutes
    const activeStatuses = ['on_time', 'at_risk', 'late', 'active', 'validated', 'reached_pickup', 'on_route', 'arrived_destination'];
    if (!activeStatuses.includes(trip.status) || timeSinceLastCalc < cooldownMs) {
      console.log(`[driver-location-update] Throttling ETA for trip ${tripId}. Progress updated to ${progress?.toFixed?.(2)}%`);
      return new Response(JSON.stringify({ 
        ok: true, 
        updated: 'location_and_progress',
        progress: typeof progress === 'number' ? progress.toFixed(2) : progress,
        nextEtaRefreshSec: Math.max(0, Math.ceil((cooldownMs - timeSinceLastCalc) / 1000))
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 7. RECALCULATION: Call Google Routes API for Detailed ETA/Distance
    console.log(`[driver-location-update] Refreshing Full metrics for trip ${tripId}`);

    try {
      const liveRoute = await computeRoute(
        { lat: lat, lng: lng },
        { lat: destLat, lng: destLng },
        googleApiKey
      );

      // Calculation of Route Progress
      // FIX: Ensure baseline is always Pickup -> Destination, never Current -> Destination
      let baselineDist = trip.route_distance_meters;
      const remainingDist = liveRoute.distanceMeters;

      if (!baselineDist && pickupLat && pickupLng && destLat && destLng) {
        baselineDist = haversineDistance(pickupLat, pickupLng, destLat, destLng);
      }
      
      let progress = 0;
      
      // Progress Formula: Straight Line / Birds Eye to perfectly match typical Driver APKs
      if (pickupLat && pickupLng && destLat && destLng) {
        progress = computeStraightLineProgress(
          pickupLat, pickupLng,
          lat, lng,
          destLat, destLng
        );
        console.log(`[driver-location-update] Progress Calc (Birds-Eye): ${progress.toFixed(2)}% | Origin: ${pickupLat},${pickupLng} | Current: ${lat},${lng} | Dest: ${destLat},${destLng}`);
      } else {
        // Fallback to Driving Distance progress if explicit geo-coordinates are missing
        if (baselineDist && baselineDist > 0) {
          progress = ((baselineDist - remainingDist) / baselineDist) * 100;
          progress = Math.max(0, Math.min(100, progress));
          console.log(`[driver-location-update] Progress Calc (Driving): ${progress.toFixed(2)}% | Baseline: ${baselineDist} | Remaining: ${remainingDist}`);
        }
      }

      const predictedEtaAt = new Date(now.getTime() + liveRoute.durationSeconds * 1000).toISOString();

      // DYNAMIC STATUS CALCULATION
      const plannedArrival = new Date(trip.planned_arrival);
      const diffMs = new Date(predictedEtaAt).getTime() - plannedArrival.getTime();
      let newStatus = trip.status;
      
      // Only auto-update status if it's currently on_time, at_risk, late, or active/validated/on_route
      const autoResettableStatuses = ['on_time', 'at_risk', 'late', 'active', 'validated', 'reached_pickup', 'on_route'];
      if (autoResettableStatuses.includes(trip.status)) {
        if (diffMs > 2 * 60 * 60 * 1000) { // > 2 hours delay
          newStatus = 'late';
        } else if (diffMs > 30 * 60 * 1000) { // 30 mins to 2 hours delay
          newStatus = 'at_risk';
        } else {
          newStatus = 'on_time';
        }
      }

      const { error: metricsError } = await supabase
        .from('trips')
        .update({
          remaining_distance_meters: remainingDist,
          remaining_duration_seconds: liveRoute.durationSeconds,
          predicted_eta_at: predictedEtaAt,
          current_eta: predictedEtaAt, // Sync to legacy field for APK compatibility
          route_progress_percent: progress.toFixed(2),
          status: newStatus, // Update status dynamically
          last_eta_calculated_at: nowIso,
          // Auto-initialize baseline if missing
          ...(trip.route_distance_meters === null ? { route_distance_meters: baselineDist } : {}),
          ...(trip.route_duration_seconds === null ? { route_duration_seconds: liveRoute.durationSeconds } : {})
        })
        .eq('id', tripId);

      if (metricsError) throw metricsError;

      return new Response(JSON.stringify({ 
        ok: true, 
        updated: 'all_metrics',
        progress: typeof progress === 'number' ? progress.toFixed(2) : progress,
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
