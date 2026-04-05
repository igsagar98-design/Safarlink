import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../../_lib/cors.js';
import { extractTrackingToken } from '../../_lib/extractTrackingToken.js';
import { supabaseAdmin } from '../../_lib/supabaseAdmin.js';

export default withCors(async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed', message: 'Use GET or POST for this endpoint' });
    return;
  }

  const inputLink =
    req.method === 'GET'
      ? String(req.query.link || req.query.token || req.query.tracking_token || '')
      : String(req.body?.link || req.body?.token || req.body?.tracking_token || '');

  console.log('[driver-trips] incoming-link:', inputLink);

  const extracted = extractTrackingToken(inputLink);
  console.log('[driver-trips] extracted-token:', extracted.token, 'source:', extracted.source);

  if (!extracted.token) {
    res.status(400).json({
      error: 'invalid_link_format',
      message: extracted.reason || 'Unable to extract tracking token from request',
    });
    return;
  }

  const { data: trip, error } = await supabaseAdmin
    .from('trips')
    .select('*')
    .eq('tracking_token', extracted.token)
    .maybeSingle();

  if (error) {
    console.error('[driver-trips] db-error:', error.message);
    res.status(500).json({ error: 'db_error', message: 'Failed to load trip' });
    return;
  }

  console.log('[driver-trips] db-result-found:', Boolean(trip), 'trip-id:', trip?.id ?? null);

  if (!trip) {
    res.status(404).json({ error: 'trip_not_found', message: 'No trip found for this tracking token' });
    return;
  }

  res.status(200).json({ ok: true, tracking_token: extracted.token, trip });
});
