import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { geocodeAddress, computeRoute } from '../_shared/google-routes.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Establishment of Baseline Routing for a Trip.
 * This is the Single Source of Truth for the initial path.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { tripId } = await req.json();
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')?.trim();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

    if (!googleApiKey || !supabaseUrl || !serviceRoleKey) {
      throw new Error('Server configuration missing keys.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch trip data
    const { data: trip, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !trip) throw new Error(`Trip ${tripId} not found.`);

    // 2. Geocode address strings to static coordinates if missing
    let pickupLat = trip.pickup_latitude;
    let pickupLng = trip.pickup_longitude;
    let dropLat = trip.drop_latitude;
    let dropLng = trip.drop_longitude;

    if (!pickupLat || !pickupLng) {
      console.log(`[trip-baseline] Geocoding origin: ${trip.origin}`);
      const p = await geocodeAddress(trip.origin, googleApiKey);
      pickupLat = p.lat;
      pickupLng = p.lng;
    }

    if (!dropLat || !dropLng) {
      console.log(`[trip-baseline] Geocoding destination: ${trip.destination}`);
      const d = await geocodeAddress(trip.destination, googleApiKey);
      dropLat = d.lat;
      dropLng = d.lng;
    }

    // 3. Compute baseline route using traffic-aware Routes API (v2)
    console.log(`[trip-baseline] Computing baseline route for trip ${tripId}`);
    const route = await computeRoute(
      { lat: pickupLat, lng: pickupLng },
      { lat: dropLat, lng: dropLng },
      googleApiKey
    );

    const now = new Date().toISOString();
    // Initial predicted ETA = now + total duration
    const predictedEtaAt = new Date(Date.now() + route.durationSeconds * 1000).toISOString();

    // 4. Update trip with baseline metrics and initial progress
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        drop_latitude: dropLat,
        drop_longitude: dropLng,
        route_distance_meters: route.distanceMeters,
        route_duration_seconds: route.durationSeconds,
        route_polyline: route.polyline,
        
        remaining_distance_meters: route.distanceMeters,
        remaining_duration_seconds: route.durationSeconds,
        predicted_eta_at: predictedEtaAt,
        route_progress_percent: 0,
        last_eta_calculated_at: now
      })
      .eq('id', tripId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ 
      ok: true, 
      tripId,
      distance: route.distanceMeters,
      duration: route.durationSeconds,
      initial_eta: predictedEtaAt
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error(`[trip-baseline] Failure: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
