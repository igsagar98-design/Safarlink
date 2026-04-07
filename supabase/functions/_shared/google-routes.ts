/**
 * Shared Business Logic for Google Maps Platform Implementation
 * Uses modern Routes API (v2) for traffic-aware estimations.
 */

export interface RouteMetrics {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
}

/**
 * Computes a traffic-aware route using Google Routes API v2
 * @param origin Source coordinates
 * @param destination Target coordinates OR address string
 * @param apiKey Google Maps API Key
 */
export async function computeRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number } | string,
  apiKey: string
): Promise<RouteMetrics> {
  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  
  const destObj = typeof destination === 'string'
    ? { address: destination }
    : {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      };

  const body = {
    origin: {
      location: {
        latLng: {
          latitude: origin.lat,
          longitude: origin.lng,
        },
      },
    },
    destination: destObj,
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
    units: 'METRIC',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Routes API ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const route = data.routes?.[0];

  if (!route) {
    throw new Error('No valid route returned from Google.');
  }

  // Duration comes as "1200s" string; parse to number
  const durationSeconds = parseInt(route.duration.replace('s', ''), 10);

  return {
    distanceMeters: route.distanceMeters,
    durationSeconds: durationSeconds,
    polyline: route.polyline.encodedPolyline,
  };
}

/**
 * Geocodes an address into latitude/longitude coordinates.
 * Used for setting up the initial baseline for a trip.
 */
export async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lng: number }> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Geocoding failed for "${address}": ${data.status}`);
  }

  return data.results[0].geometry.location;
}
