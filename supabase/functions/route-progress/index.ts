type ComputeRoutesRequest = {
  origin: {
    address?: string;
    location?: { latLng: { latitude: number; longitude: number } };
  };
  destination: {
    address?: string;
    location?: { latLng: { latitude: number; longitude: number } };
  };
  travelMode: 'DRIVE';
  routingPreference: 'TRAFFIC_AWARE';
  computeAlternativeRoutes: false;
  languageCode: 'en-US';
  units: 'METRIC';
};

type ComputeRoutesResponse = {
  routes?: Array<{
    distanceMeters?: number;
  }>;
};

type RouteProgressRequest = {
  origin: string;
  destination: string;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GOOGLE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

function buildAddressWaypoint(address: string): ComputeRoutesRequest['origin'] {
  return { address };
}

function buildLatLngWaypoint(latitude: number, longitude: number): ComputeRoutesRequest['origin'] {
  return {
    location: {
      latLng: {
        latitude,
        longitude,
      },
    },
  };
}

async function computeDistanceMeters(
  apiKey: string,
  origin: ComputeRoutesRequest['origin'],
  destination: ComputeRoutesRequest['destination']
): Promise<number> {
  const payload: ComputeRoutesRequest = {
    origin,
    destination,
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
    languageCode: 'en-US',
    units: 'METRIC',
  };

  const response = await fetch(GOOGLE_ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.distanceMeters',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Routes API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as ComputeRoutesResponse;
  const distanceMeters = data.routes?.[0]?.distanceMeters;

  if (!distanceMeters || distanceMeters <= 0) {
    throw new Error('No valid route distance returned by Google Routes API.');
  }

  return distanceMeters;
}

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
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new Error('Missing GOOGLE_MAPS_API_KEY secret in Supabase Edge Functions.');
    }

    const body = (await req.json()) as RouteProgressRequest;
    const origin = body.origin?.trim();
    const destination = body.destination?.trim();

    if (!origin || !destination) {
      return new Response(JSON.stringify({ error: 'origin and destination are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalDistanceMeters = await computeDistanceMeters(
      apiKey,
      buildAddressWaypoint(origin),
      buildAddressWaypoint(destination)
    );

    const hasCurrentLocation =
      typeof body.currentLatitude === 'number' &&
      Number.isFinite(body.currentLatitude) &&
      typeof body.currentLongitude === 'number' &&
      Number.isFinite(body.currentLongitude);

    const remainingDistanceMeters = hasCurrentLocation
      ? await computeDistanceMeters(
          apiKey,
          buildLatLngWaypoint(body.currentLatitude as number, body.currentLongitude as number),
          buildAddressWaypoint(destination)
        )
      : totalDistanceMeters;

    const boundedRemaining = Math.min(Math.max(remainingDistanceMeters, 0), totalDistanceMeters);
    const coveredDistanceMeters = Math.max(totalDistanceMeters - boundedRemaining, 0);
    const progressPercent = Number(((coveredDistanceMeters / totalDistanceMeters) * 100).toFixed(1));

    return new Response(
      JSON.stringify({
        totalDistanceMeters,
        remainingDistanceMeters: boundedRemaining,
        coveredDistanceMeters,
        progressPercent,
        source: hasCurrentLocation ? 'current_location' : 'origin_fallback',
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
