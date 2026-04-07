import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type PredictDelayRequest = {
  tripId: string;
  currentLatitude: number;
  currentLongitude: number;
  trackingToken?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    // --- Switch to Classic Directions API ---
    const origin = `${body.currentLatitude},${body.currentLongitude}`;
    const destination = encodeURIComponent(trip.destination);
    const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${googleApiKey}`;

    console.log(`[predict-delay] Calling Google Directions: origin=${origin}, destination=${trip.destination}`);

    // Use a 5s timeout for the fetch call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const directionsResponse = await fetch(googleUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!directionsResponse.ok) {
        const details = await directionsResponse.text();
        console.error(`[predict-delay] Google HTTP ${directionsResponse.status}: ${details}`);
        return new Response(JSON.stringify({ error: `Google API error: ${directionsResponse.status}` }), {
          status: 424, // Failed Dependency
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const directionsData = await directionsResponse.json();
      console.log(`[predict-delay] Google Response Status: ${directionsData.status}`);

      if (directionsData.status !== 'OK') {
        const errMsg = directionsData.error_message || 'Please check your Google API Key permissions.';
        console.error(`[predict-delay] Google API Status ${directionsData.status}: ${errMsg}`);
        
        await supabaseAdmin.from('trip_status_updates').insert({
          trip_id: trip.id,
          status: trip.status || 'on_time',
          note: `Smart ETA Error: ${directionsData.status} - ${errMsg}`,
        });

        return new Response(JSON.stringify({ error: `Google API: ${directionsData.status} - ${errMsg}` }), {
          status: 424,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract travel time from the first leg of the first route
      const durationSeconds = directionsData.routes?.[0]?.legs?.[0]?.duration?.value;

      if (!durationSeconds || durationSeconds <= 0) {
        throw new Error('Unable to determine remaining travel time from Google Directions response.');
      }

      const nowMs = Date.now();
      const predictedArrivalMs = nowMs + durationSeconds * 1000;
      const predictedArrivalIso = new Date(predictedArrivalMs).toISOString();

      const plannedMs = new Date(trip.planned_arrival).getTime();
      const delayMinutes = Math.max(Math.round((predictedArrivalMs - plannedMs) / 60000), 0);

      const etaMinutes = Math.round(durationSeconds / 60);
      const predictedStatus =
        trip.status === 'delivered'
          ? 'delivered'
          : computePredictedStatus(trip.planned_arrival, predictedArrivalIso);

      const { error: updateError } = await supabaseAdmin
        .from('trips')
        .update({
          predicted_eta_at:         predictedArrivalIso,
          predicted_eta_minutes:    etaMinutes,
          remaining_distance_meters: directionsData.routes?.[0]?.legs?.[0]?.distance?.value ?? null,
          eta_last_calculated_at:   new Date(nowMs).toISOString(),
          
          predicted_arrival: predictedArrivalIso,
          current_eta: predictedArrivalIso,
          delay_minutes: delayMinutes,
          status: predictedStatus,
          last_prediction_at: new Date(nowMs).toISOString(),
        })
        .eq('id', trip.id);

      if (updateError) {
        throw updateError;
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

    } catch (gErr: any) {
      const gMsg = gErr.name === 'AbortError' ? 'Google API timeout (5s)' : gErr.message;
      console.error(`[predict-delay] Google Fetch Error: ${gMsg}`);
      return new Response(JSON.stringify({ error: gMsg }), {
        status: 504, // Gateway Timeout
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
