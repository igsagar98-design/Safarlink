import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type DriverLocationUpdateRequest = {
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

const toLocationName = (latitude: number, longitude: number) =>
  `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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

    const { data: trip, error: tripError } = await supabaseAdmin
      .from('trips')
      .select('id, tracking_token, status')
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

    return new Response(
      JSON.stringify({
        ok: true,
        tripId: trip.id,
        lastLatitude: body.currentLatitude,
        lastLongitude: body.currentLongitude,
        lastLocationName: locationName,
        lastUpdateAt,
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
