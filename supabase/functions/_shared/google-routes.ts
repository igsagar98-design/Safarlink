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
  const originStr = `${origin.lat},${origin.lng}`;
  const destinationStr = typeof destination === 'string' 
    ? encodeURIComponent(destination) 
    : `${destination.lat},${destination.lng}`;

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=driving&key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Directions API ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (data.status !== 'OK') {
    throw new Error(`Google Directions API error: ${data.status} ${data.error_message || ''}`);
  }

  const route = data.routes?.[0];
  if (!route) {
    throw new Error('No valid route returned from Google.');
  }

  const leg = route.legs?.[0];
  if (!leg) {
    throw new Error('No leg data found in the route.');
  }

  return {
    distanceMeters: leg.distance.value,
    durationSeconds: leg.duration.value,
    polyline: route.overview_polyline.points,
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
