import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type TripEventRequest = {
  tripId: string;
  eventType: string;
  note?: string;
  metadata?: Record<string, any>;
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

Deno.serve(async (req) => {
  // ------------------------------------------------------------------
  // Step 1 — Handle preflight (OPTIONS) immediately, before any logic.
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
  // always produce a response with CORS headers.
  // ------------------------------------------------------------------
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    }

    const body = (await req.json()) as TripEventRequest;

    if (!body.tripId || !body.eventType) {
      return new Response(
        JSON.stringify({ error: 'tripId and eventType are required.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ----------------------------------------------------------------
    // INSERT THE TRIP EVENT
    // ----------------------------------------------------------------
    const { data: event, error: insertError } = await supabaseAdmin
      .from('trip_events')
      .insert({
        trip_id: body.tripId,
        event_type: body.eventType,
        note: body.note,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // ----------------------------------------------------------------
    // RETURN SUCCESS
    // ----------------------------------------------------------------
    return new Response(
      JSON.stringify({
        ok: true,
        event,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // Always return CORS headers on errors.
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
