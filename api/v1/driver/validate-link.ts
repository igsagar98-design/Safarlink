import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../../_lib/cors.js';
import { extractTrackingToken } from '../../_lib/extractTrackingToken.js';
import { supabaseAdmin } from '../../_lib/supabaseAdmin.js';

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
    .select('*')
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
