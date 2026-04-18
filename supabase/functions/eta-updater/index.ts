import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// ETA Updater — Automatic Batch ETA Engine
//
// Called every 2 minutes (via frontend scheduler or external cron).
// Finds all ETA-eligible trips and calls Google Directions API for each.
//
// Trip eligibility rules:
//   · is_active = true
//   · status IN ('on_time', 'at_risk', 'late')  (i.e. not delivered/cancelled)
//   · is_location_live = true
//   · last_location_received_at within 3 minutes  (fresh location)
//   · eta_last_calculated_at is null OR > 2 min ago  (throttle per-trip)
//   · has valid last_latitude + last_longitude
//   · has destination (for Google API call)
// ─────────────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const STALE_LOCATION_MS     = 10 * 60 * 1000; // 10 minutes
const PREDICTION_THROTTLE_MS = 2 * 60 * 1000; // 2 minutes

// Statuses that are still "active" for ETA purposes
const ACTIVE_STATUSES = ['on_time', 'at_risk', 'late'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function computeRiskStatus(
  plannedArrivalIso: string,
  predictedArrivalIso: string,
): 'on_time' | 'at_risk' | 'late' {
  const plannedMs   = new Date(plannedArrivalIso).getTime();
  const predictedMs = new Date(predictedArrivalIso).getTime();

  if (predictedMs > plannedMs) return 'late';
  const diffMinutes = (plannedMs - predictedMs) / 60_000;
  if (diffMinutes <= 60) return 'at_risk';
  return 'on_time';
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Parse optional tripId from body
  let inputTripId: string | null = null;
  let triggeredBy = 'unknown';
  try {
    if (req.method === 'POST') {
      const body = await req.json();
      inputTripId = body.tripId || null;
      triggeredBy = body.triggeredBy || 'manual_post';
    }
  } catch {
    // Ignore parse errors for GET or empty POST
  }

  const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')?.trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

  if (!googleApiKey || !supabaseUrl || !serviceRoleKey) {
    console.error('[eta-updater] Missing environment variables.');
    return json({ error: 'Server misconfiguration: missing env vars.' }, 500);
  }

  // Masked log for user verification
  const maskedKey = `${googleApiKey.substring(0, 3)}...${googleApiKey.substring(googleApiKey.length - 3)}`;
  console.log(`[eta-updater] Config: API Key length=${googleApiKey.length}, masked=${maskedKey}`);

  console.log(`[eta-updater] Starting scan. Triggered by: ${triggeredBy}${inputTripId ? ` (Target: ${inputTripId})` : ''}`);

  const db = createClient(supabaseUrl, serviceRoleKey);
  const now = Date.now();
  const staleThreshold = new Date(now - STALE_LOCATION_MS).toISOString();

  // ── 1. Find ETA-eligible trips ──────────────────────────────────────────────
  let query = db
    .from('trips')
    .select(
      'id, destination, planned_arrival, status, last_latitude, last_longitude, ' +
      'drop_latitude, drop_longitude, eta_last_calculated_at, last_location_received_at, ' +
      'route_distance_meters'
    )
    .eq('is_active', true)
    .in('status', ACTIVE_STATUSES)
    .eq('is_location_live', true)
    .gte('last_location_received_at', staleThreshold)   // location is fresh
    .not('last_latitude', 'is', null)
    .not('last_longitude', 'is', null)
    .not('destination', 'is', null);

  if (inputTripId) {
    query = query.eq('id', inputTripId);
  }

  const { data: trips, error: fetchError } = await query;

  if (fetchError) {
    console.error('[eta-updater] Failed to fetch eligible trips:', fetchError.message);
    return json({ error: fetchError.message }, 500);
  }

  if (!trips || trips.length === 0) {
    console.log('[eta-updater] No ETA-eligible trips found.');
    return json({ processed: 0, skipped: 0, message: 'No eligible trips.' });
  }

  console.log(`[eta-updater] Found ${trips.length} eligible trip(s).`);

  let processed = 0;
  let skipped   = 0;
  const results: Array<{ tripId: string; result: string; reason?: string }> = [];

  // ── 2. Process each trip ────────────────────────────────────────────────────
  for (const trip of trips) {
    const tripId = trip.id;

    // Throttle: skip if last prediction was < 2 minutes ago
    if (
      trip.eta_last_calculated_at &&
      new Date(trip.eta_last_calculated_at).getTime() > now - PREDICTION_THROTTLE_MS
    ) {
      const secAgo = Math.round((now - new Date(trip.eta_last_calculated_at).getTime()) / 1000);
      console.log(`[eta-updater] SKIP trip ${tripId}: predicted ${secAgo}s ago (throttled)`);
      results.push({ tripId, result: 'skipped', reason: `throttled (${secAgo}s ago)` });
      skipped++;
      continue;
    }

    // Prefer drop coordinates if available for accuracy; fall back to text destination
    const destLat = trip.drop_latitude;
    const destLng = trip.drop_longitude;

    const origin = `${trip.last_latitude},${trip.last_longitude}`;
    const destination = (destLat != null && destLng != null)
      ? `${destLat},${destLng}`
      : encodeURIComponent(trip.destination);

    console.log(`[eta-updater] Processing trip ${tripId}: origin=${origin} dest=${trip.destination}`);

    // Use a 30s timeout for the fetch call (increased for reliability)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      console.time(`google-api-${tripId}`);
      // ── 3. Call Google Directions API ───────────────────────────────────────
      const googleUrl = `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${origin}&destination=${destination}&mode=driving&key=${googleApiKey}`;

      const gRes = await fetch(googleUrl, { signal: controller.signal });
      console.timeEnd(`google-api-${tripId}`);
      clearTimeout(timeoutId);

      if (!gRes.ok) {
        const text = await gRes.text();
        throw new Error(`Google HTTP ${gRes.status}: ${text}`);
      }

      const gData = await gRes.json();
      console.log(`[eta-updater] Google status for ${tripId}: ${gData.status}`);

      if (gData.status !== 'OK') {
        const errMsg = gData.error_message || 'No error message from Google';
        console.error(`[eta-updater] Google error for ${tripId}: ${gData.status} — ${errMsg}`);
        results.push({ tripId: String(tripId), result: 'error', reason: `Google: ${gData.status} - ${errMsg}` });
        skipped++;
        continue;
      }

      const leg              = gData.routes?.[0]?.legs?.[0];
      const durationSeconds  = leg?.duration?.value;
      const distanceMeters   = leg?.distance?.value;

      if (!durationSeconds || durationSeconds <= 0) {
        throw new Error('Could not extract duration from Google response');
      }

      // ── 4. Compute ETA values ────────────────────────────────────────────────
      const predictedArrivalMs  = now + durationSeconds * 1000;
      const predictedArrivalIso = new Date(predictedArrivalMs).toISOString();
      const etaMinutes          = Math.round(durationSeconds / 60);
      const plannedMs           = new Date(trip.planned_arrival).getTime();
      const delayMinutes        = Math.max(Math.round((predictedArrivalMs - plannedMs) / 60_000), 0);
      const newStatus           = computeRiskStatus(trip.planned_arrival, predictedArrivalIso);

      console.log(
        `[eta-updater] Trip ${tripId}: ETA in ${etaMinutes}min, ` +
        `arrival=${predictedArrivalIso}, status=${newStatus}, delay=${delayMinutes}min`
      );

      const baselineDist = trip.route_distance_meters || distanceMeters;
      let progress = 0;
      if (baselineDist && baselineDist > 0 && distanceMeters != null) {
        progress = ((baselineDist - distanceMeters) / baselineDist) * 100;
        progress = Math.max(0, Math.min(100, progress));
      }

      // ── 5. Write to DB ───────────────────────────────────────────────────────
      const { error: updateError } = await db
        .from('trips')
        .update({
          predicted_eta_at:         predictedArrivalIso,
          predicted_eta_minutes:    etaMinutes,
          remaining_distance_meters: distanceMeters ?? null,
          eta_last_calculated_at:   new Date(now).toISOString(),
          route_progress_percent:   progress.toFixed(2),
          ...(trip.route_distance_meters === null && baselineDist ? { route_distance_meters: baselineDist } : {}),
          
          // Maintaining backward compatibility for old fields if still used
          predicted_arrival:        predictedArrivalIso,
          current_eta:              predictedArrivalIso,
          delay_minutes:            delayMinutes,
          status:                   newStatus,
          last_prediction_at:       new Date(now).toISOString(),
        })
        .eq('id', tripId);

      if (updateError) {
        throw new Error(`DB update failed: ${updateError.message}`);
      }

      // ── 6. Log status change to timeline only if status changed ─────────────
      if (ACTIVE_STATUSES.includes(newStatus) && newStatus !== trip.status) {
        await db.from('trip_status_updates').insert({
          trip_id: tripId,
          status:  newStatus,
          note:    `Auto ETA update: ${newStatus} (ETA in ${etaMinutes} min)`,
        });
      }

      results.push({ tripId: String(tripId), result: 'updated' });
      processed++;

    } catch (err: any) {
      const message = err.name === 'AbortError' ? 'Google API timeout (5s)' : (err instanceof Error ? err.message : String(err));
      console.error(`[eta-updater] ERROR for trip ${tripId}: ${message}`);
      results.push({ tripId: String(tripId), result: 'error', reason: message });
      skipped++;
    }
  }

  console.log(`[eta-updater] Done. processed=${processed}, skipped=${skipped}`);
  return json({ processed, skipped, results });
});
