import { supabase } from './supabase';

/**
 * GPS Link Service
 * Manages external GPS tracking link state for driver app
 */

export type GpsLinkStatus = 'idle' | 'validating' | 'connected' | 'invalid' | 'sharing';

export interface GpsLinkState {
  url: string;
  status: GpsLinkStatus;
  lastSyncAt: Date | null;
  isSharing: boolean;
  validatedAt: Date | null;
  error: string | null;
}

// In-memory singleton state model (replace with Zustand/Context if needed)
let _state: GpsLinkState = {
  url: '',
  status: 'idle',
  lastSyncAt: null,
  isSharing: false,
  validatedAt: null,
  error: null,
};

const _listeners: Array<(s: GpsLinkState) => void> = [];

function notify() {
  _listeners.forEach(fn => fn({ ..._state }));
}

export function subscribeGpsLink(fn: (s: GpsLinkState) => void) {
  _listeners.push(fn);
  fn({ ..._state }); // immediate emit
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx !== -1) _listeners.splice(idx, 1);
  };
}

export function getGpsLinkState(): GpsLinkState {
  return { ..._state };
}

/** Validate and set a GPS tracking URL */
export async function validateGpsLink(url: string): Promise<boolean> {
  _state = { ..._state, status: 'validating', error: null, url };
  notify();

  await new Promise(r => setTimeout(r, 800)); // simulate network check

  // Basic URL validation
  try {
    const parsed = new URL(url.trim());
    const validProtocol = parsed.protocol === 'http:' || parsed.protocol === 'https:';

    if (!validProtocol) throw new Error('URL must start with http:// or https://');

    _state = {
      ..._state,
      url: url.trim(),
      status: 'connected',
      validatedAt: new Date(),
      error: null,
    };
    notify();
    return true;
  } catch (err: any) {
    _state = {
      ..._state,
      status: 'invalid',
      error: err.message || 'Invalid GPS link. Please check the URL.',
    };
    notify();
    return false;
  }
}

/** Create a persistent trip/session entry in the backend */
export async function createTrackingSession(userId: string, companyId?: string) {
  if (_state.status !== 'connected' || !_state.url) {
    throw new Error('No validated link available');
  }

  // Smarter Parser: Extract from URL if possible
  const urlObj = new URL(_state.url);
  const params = urlObj.searchParams;
  
  // Try to find 'from', 'to', 'origin', 'dest' in query params
  const urlFrom = params.get('from') || params.get('origin') || params.get('pickup');
  const urlTo = params.get('to') || params.get('dest') || params.get('destination') || params.get('drop');

  const urlText = _state.url.toLowerCase();
  let origin = urlFrom ? decodeURIComponent(urlFrom) : 'Main St Depot, Bangalore';
  let pLat = 12.9716;
  let pLng = 77.5946;
  let dest = urlTo ? decodeURIComponent(urlTo) : 'Industrial Area II, Mumbai';
  let dLat = 19.0760;
  let dLng = 72.8777;

  // Simple heuristic: if URL path or params contain certain keywords, change coordinates
  if (urlText.includes('delhi') || urlText.includes('north') || origin.toLowerCase().includes('delhi')) {
    pLat = 28.6139; pLng = 77.2090;
    if (!urlTo) { dest = 'Warehouse A, Gurgaon'; dLat = 28.4595; dLng = 77.0266; }
  } else if (urlText.includes('chennai') || urlText.includes('south') || origin.toLowerCase().includes('chennai')) {
    pLat = 13.0827; pLng = 80.2707;
    if (!urlTo) { dest = 'Tech Park, Hyderabad'; dLat = 17.3850; dLng = 78.4867; }
  }

  // Create active trip entry in Supabase
  const { data, error } = await supabase
    .from('trips')
    .insert({
      user_id: userId,
      transporter_company_id: companyId,
      gps_tracking_link: _state.url,
      source_type: 'transporter_link',
      origin: origin,
      pickup_latitude: pLat,
      pickup_longitude: pLng,
      destination: dest,
      drop_latitude: dLat,
      drop_longitude: dLng,
      status: 'validated',
      progress: 0,
      current_eta: new Date(Date.now() + (3600000 * 4.5)).toISOString(),
      planned_arrival: new Date(Date.now() + (3600000 * 5)).toISOString(),
      vehicle_number: 'KA-01-XX-' + Math.floor(1000 + Math.random() * 9000),
      driver_name: 'External Driver',
      driver_phone: '9988776655',
      transporter_name: 'Safarlink Partner',
      customer_name: 'Client ' + Math.floor(100 + Math.random() * 900),
      material: 'Consumer Goods',
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    throw error;
  }
  return data;
}



/** Start sharing from the external GPS link */
export function startExternalSharing(): void {
  if (_state.status !== 'connected') return;

  _state = {
    ..._state,
    status: 'sharing',
    isSharing: true,
    lastSyncAt: new Date(),
  };
  notify();
}

/** Stop sharing */
export function stopExternalSharing(): void {
  _state = {
    ..._state,
    status: 'connected',
    isSharing: false,
  };
  notify();
}

/** Reset all GPS link state */
export function resetGpsLink(): void {
  _state = {
    url: '',
    status: 'idle',
    lastSyncAt: null,
    isSharing: false,
    validatedAt: null,
    error: null,
  };
  notify();
}

