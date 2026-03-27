import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../../_lib/cors';
import { extractTrackingToken } from '../../_lib/extractTrackingToken';
import { supabaseAdmin } from '../../_lib/supabaseAdmin';

interface ValidateLinkBody {
  link?: string;
}

export default withCors(async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed', message: 'Use POST for this endpoint' });
    return;
  }

  const body = (req.body ?? {}) as ValidateLinkBody;
  const incomingLink = typeof body.link === 'string' ? body.link : '';

  console.log('[validate-link] incoming-link:', incomingLink);

  if (!incomingLink.trim()) {
    res.status(400).json({
      error: 'token_missing',
      message: 'Body must include a non-empty link string',
    });
    return;
  }

  const extracted = extractTrackingToken(incomingLink);
  console.log('[validate-link] extracted-token:', extracted.token, 'source:', extracted.source);

  if (!extracted.token) {
    res.status(400).json({
      error: 'invalid_link_format',
      message: extracted.reason || 'Unable to extract tracking token from link',
    });
    return;
  }

  const { data: trip, error } = await supabaseAdmin
    .from('trips')
    .select(
      [
        'id',
        'tracking_token',
        'vehicle_number',
        'driver_name',
        'driver_phone',
        'transporter_name',
        'customer_name',
        'origin',
        'destination',
        'material',
        'planned_arrival',
        'current_eta',
        'last_location_name',
        'last_latitude',
        'last_longitude',
        'last_update_at',
        'status',
        'is_active',
        'created_at',
        'updated_at',
      ].join(',')
    )
    .eq('tracking_token', extracted.token)
    .maybeSingle();

  if (error) {
    console.error('[validate-link] db-error:', error.message);
    res.status(500).json({
      error: 'db_error',
      message: 'Failed to validate tracking token',
    });
    return;
  }

  console.log('[validate-link] db-result-found:', Boolean(trip), 'trip-id:', trip?.id ?? null);

  if (!trip) {
    res.status(404).json({
      error: 'trip_not_found',
      message: 'No trip found for this tracking token',
    });
    return;
  }

  res.status(200).json({
    ok: true,
    tracking_token: extracted.token,
    trip,
  });
});
