import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Backfill Service: Establishes base routes for all active historical trips.
 * This ensures the new 95% Delivered and Route Progress rules work for 
 * trips created before this update.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase configuration missing.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch all active trips missing the newly required baseline distance
    const { data: trips, error: fetchError } = await supabase
      .from('trips')
      .select('id, origin, destination')
      .eq('is_active', true)
      .is('route_distance_meters', null)
      .limit(50); // Batch safety

    if (fetchError) throw fetchError;

    if (!trips || trips.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No trips need backfilling.' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[trip-backfill] Found ${trips.length} trips requiring baseline recovery.`);

    const results = [];
    
    // 2. Sequentially trigger baseline calculation for each trip
    // Note: Serial processing to stay well within Google API quotas
    for (const trip of trips) {
      console.log(`[trip-backfill] Synchronizing trip baseline for: ${trip.id}`);
      
      const baselineRes = await fetch(`${supabaseUrl}/functions/v1/trip-baseline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({ tripId: trip.id })
      });

      const responseData = await baselineRes.json();
      results.push({ 
        tripId: trip.id, 
        success: baselineRes.ok, 
        error: responseData.error || null 
      });
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      processed: results.length, 
      details: results 
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error(`[trip-backfill] Fatal: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
