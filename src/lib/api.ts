import { supabase } from '@/integrations/supabase/client';
import type { Enums, Tables, Json } from '@/integrations/supabase/types';
import type {
  AuthChangeEvent,
  AuthError,
  Session,
  User,
} from '@supabase/supabase-js';

export type TripStatus = Enums<'trip_status'>;
export type AccountType = 'transporter' | 'company';
export type TripEventType =
  | 'trip_created'
  | 'driver_opened_link'
  | 'tracking_started'
  | 'tracking_paused'
  | 'tracking_stopped'
  | 'tracking_stale'
  | 'reached_pickup'
  | 'in_transit'
  | 'reached_destination'
  | 'arrived'
  | 'delivered';

// Keep optional trip_code for forward compatibility with custom backends.
export type Trip = Tables<'trips'> & {
  trip_code?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  drop_latitude?: number | null;
  drop_longitude?: number | null;
  route_distance_meters?: number | null;
  route_duration_seconds?: number | null;
  route_polyline?: string | null;
  last_driver_latitude?: number | null;
  last_driver_longitude?: number | null;
  last_driver_location_at?: string | null;
  remaining_distance_meters?: number | null;
  remaining_duration_seconds?: number | null;
  route_progress_percent?: number | null;
  is_live_tracking?: boolean;
  last_eta_calculated_at?: string | null;
};

export interface CreateTripInput {
  user_id: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  drop_latitude?: number | null;
  drop_longitude?: number | null;
  gps_tracking_link?: string | null;
  transporter_name: string;
  customer_name: string;
  origin: string;
  destination: string;
  material: string;
  planned_arrival: string;
  trip_no?: string | null;
  transporter_company_id?: string | null;
  company_id?: string | null;
}

export interface UpdateTripInput {
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  drop_latitude?: number | null;
  drop_longitude?: number | null;
  gps_tracking_link?: string | null;
  transporter_name?: string;
  customer_name?: string;
  origin?: string;
  destination?: string;
  material?: string;
  planned_arrival?: string;
  trip_no?: string | null;
}

export interface SignupInput {
  email: string;
  password: string;
  accountType: AccountType;
  displayName: string;
  companyName?: string;
  emailRedirectTo: string;
}

export interface Profile {
  id: string;
  user_id: string;
  role: AccountType;
  full_name: string;
  company_id: string | null;
  phone: string | null;
  created_at: string;
  // Legacy compatibility fields kept while older records migrate.
  account_type?: AccountType;
  display_name?: string;
}

export interface Company {
  id: string;
  company_name: string;
  company_code: string | null;
  company_type: 'transporter' | 'shipper';
  created_at: string;
  updated_at: string;
  // Legacy compatibility field.
  name?: string | null;
}

export interface CompanyUser {
  id: string;
  user_id: string;
  company_id: string;
  role: string;
  created_at: string;
}

export interface TripEvent {
  id: string;
  trip_id: string;
  event_type: TripEventType;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type TripStopType = 'pickup' | 'delivery';

export interface TripStop {
  id: string;
  trip_id: string;
  stop_order: number;
  stop_type: TripStopType;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface TripStopInput {
  stop_order: number;
  stop_type: TripStopType;
  location_name: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RouteProgressInput {
  origin: string;
  destination: string;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
}

export interface RouteProgressResult {
  totalDistanceMeters: number;
  remainingDistanceMeters: number;
  coveredDistanceMeters: number;
  progressPercent: number;
  source: 'current_location' | 'origin_fallback';
}

export interface PredictDelayInput {
  tripId: string;
  latitude: number;
  longitude: number;
  trackingToken?: string;
  force?: boolean;
}

function throwSupabaseError(error: { message?: string } | null): never {
  const message = error?.message?.trim() || 'Unknown database error';
  throw new Error(message);
}

function isMissingTripStopsTable(error: { message?: string } | null): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('trip_stops') && (message.includes('schema cache') || message.includes('does not exist'));
}

const toLocationName = (latitude: number, longitude: number) =>
  `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

export async function listTripsForUser(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Trip[]) ?? [];
}

export async function listTripsForCompany(companyId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Trip[]) ?? [];
}

export async function listMyCompanyTrips(): Promise<Trip[]> {
  const profile = await getMyProfile();
  if (!profile?.company_id) return [];

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Trip[]) ?? [];
}

export async function listCompanies(companyType?: 'transporter' | 'shipper'): Promise<Company[]> {
  const load = async () => {
    let query = supabase.from('companies').select('*').order('company_name', { ascending: true });
    if (companyType) {
      query = query.eq('company_type', companyType);
    }
    const { data, error } = await query;

    if (error) throw error;
    return (data as Company[]) ?? [];
  };

  try {
    return await load();
  } catch (error) {
    // For legacy users missing profile rows, trigger self-heal then retry once.
    await getMyProfile();
    try {
      return await load();
    } catch {
      throw error;
    }
  }
}

export async function createCompany(
  companyName: string,
  companyType: 'transporter' | 'shipper' = 'shipper'
): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .insert({ company_name: companyName.trim(), company_type: companyType })
    .select('*')
    .single();

  if (error) throw error;
  return data as Company;
}

export async function listMyCompanyUsers(): Promise<CompanyUser[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return [];

  const { data, error } = await supabase
    .from('company_users')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;
  return (data as CompanyUser[]) ?? [];
}

export async function getMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return data as Profile;
  }

  // Self-heal legacy users created before profile automation.
  const accountTypeFromMeta = user.user_metadata?.role || user.user_metadata?.account_type;
  let inferredType: AccountType =
    accountTypeFromMeta === 'company' ? 'company' : 'transporter';

  if (inferredType !== 'company') {
    const { data: memberships, error: membershipError } = await supabase
      .from('company_users')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (!membershipError && (memberships?.length ?? 0) > 0) {
      inferredType = 'company';
    }
  }

  const fallbackProfile = {
    id: crypto.randomUUID(),
    user_id: user.id,
    role: inferredType,
    full_name:
      (user.user_metadata?.full_name as string | undefined)
      || (user.user_metadata?.display_name as string | undefined)
      || user.email
      || 'User',
    company_id: null,
    phone: null,
    account_type: inferredType,
    display_name:
      (user.user_metadata?.full_name as string | undefined)
      || (user.user_metadata?.display_name as string | undefined)
      || user.email
      || 'User',
  };

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert(fallbackProfile)
    .select('*')
    .single();

  if (insertError) {
    // As a last fallback, still return an inferred profile in-memory.
    return {
      ...fallbackProfile,
      created_at: new Date().toISOString(),
    };
  }

  return inserted as Profile;
}

export async function updateMyProfile(input: {
  full_name?: string;
  phone?: string | null;
  company_id?: string | null;
}): Promise<Profile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('You must be signed in to update your profile.');

  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) throwSupabaseError(error);
  return data as Profile;
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();

  if (error) throwSupabaseError(error);
  return (data as Company | null) ?? null;
}

export async function updateCompany(
  companyId: string,
  input: { company_name?: string; company_code?: string | null }
): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update(input)
    .eq('id', companyId)
    .select('*')
    .single();

  if (error) throwSupabaseError(error);
  return data as Company;
}

export async function listTransporterCompaniesForShipper(
  shipperCompanyId: string
): Promise<Company[]> {
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('transporter_company_id')
    .eq('company_id', shipperCompanyId)
    .not('transporter_company_id', 'is', null);

  if (tripsError) throwSupabaseError(tripsError);

  const transporterIds = Array.from(
    new Set((trips ?? []).map((row) => row.transporter_company_id).filter(Boolean))
  ) as string[];

  if (transporterIds.length === 0) return [];

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .in('id', transporterIds)
    .order('company_name', { ascending: true });

  if (error) throwSupabaseError(error);
  return (data as Company[]) ?? [];
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const { data, error } = await supabase.from('trips').insert(input).select('*').single();
  if (error) {
    console.error('Create trip error:', error);
    throwSupabaseError(error);
  }
  return data as Trip;
}

export async function createTrips(inputs: CreateTripInput[]): Promise<Trip[]> {
  if (inputs.length === 0) return [];

  const { data, error } = await supabase.from('trips').insert(inputs).select('*');
  if (error) {
    console.error('Bulk create error:', error);
    throwSupabaseError(error);
  }
  return (data as Trip[]) ?? [];
}

export async function updateTrip(tripId: string, input: UpdateTripInput): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .update(input)
    .eq('id', tripId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Trip;
}

export async function deleteTrip(tripId: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw error;
}

export async function listTripEvents(tripId: string): Promise<TripEvent[]> {
  const { data, error } = await supabase
    .from('trip_events')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as TripEvent[]) ?? [];
}

export async function listTripStops(tripId: string): Promise<TripStop[]> {
  const { data, error } = await supabase
    .from('trip_stops')
    .select('*')
    .eq('trip_id', tripId)
    .order('stop_order', { ascending: true });

  if (error) {
    if (isMissingTripStopsTable(error)) return [];
    throw error;
  }

  return (data as TripStop[]) ?? [];
}

export async function postTripEvent(
  tripId: string,
  eventType: TripEventType,
  options?: {
    note?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from('trip_events').insert({
    trip_id: tripId,
    event_type: eventType,
    note: options?.note ?? null,
    metadata: (options?.metadata ?? {}) as Json,
  });

  if (error) throw error;
}

export async function updateTripCreatedEventMetadata(
  tripId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const { data, error } = await supabase
    .from('trip_events')
    .select('id, metadata')
    .eq('trip_id', tripId)
    .eq('event_type', 'trip_created')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    await postTripEvent(tripId, 'trip_created', { metadata });
    return;
  }

  const existingMetadata =
    data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : {};

  const { error: updateError } = await supabase
    .from('trip_events')
    .update({ metadata: { ...existingMetadata, ...metadata } as Json })
    .eq('id', data.id);

  if (updateError) throw updateError;
}

export async function replaceTripStops(
  tripId: string,
  stops: TripStopInput[]
): Promise<TripStop[]> {
  const { error: deleteError } = await supabase.from('trip_stops').delete().eq('trip_id', tripId);

  if (deleteError) {
    if (isMissingTripStopsTable(deleteError)) return [];
    throw deleteError;
  }

  if (stops.length === 0) return [];

  const rows = stops.map((stop) => ({
    trip_id: tripId,
    stop_order: stop.stop_order,
    stop_type: stop.stop_type,
    location_name: stop.location_name,
    latitude: stop.latitude ?? null,
    longitude: stop.longitude ?? null,
  }));

  const { data, error } = await supabase
    .from('trip_stops')
    .insert(rows)
    .select('*')
    .order('stop_order', { ascending: true });

  if (error) {
    if (isMissingTripStopsTable(error)) return [];
    throw error;
  }

  return (data as TripStop[]) ?? [];
}

export async function getDriverTripByToken(trackingToken: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('tracking_token', trackingToken)
    .maybeSingle();

  if (error) throw error;
  return hydrateTripWithLatestLocationUpdate(data as Trip | null);
}

async function hydrateTripWithLatestLocationUpdate(trip: Trip | null): Promise<Trip | null> {
  if (!trip) return null;

  try {
    const { data, error } = await supabase
      .from('trip_location_updates')
      .select('latitude, longitude, location_name, recorded_at')
      .eq('trip_id', trip.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return trip;

    const tripUpdatedAt = trip.last_update_at ? new Date(trip.last_update_at).getTime() : 0;
    const locationUpdatedAt = data.recorded_at ? new Date(data.recorded_at).getTime() : 0;
    const shouldHydrate =
      typeof trip.last_latitude !== 'number'
      || typeof trip.last_longitude !== 'number'
      || locationUpdatedAt > tripUpdatedAt;

    if (!shouldHydrate) return trip;

    return {
      ...trip,
      last_latitude: data.latitude,
      last_longitude: data.longitude,
      last_location_name: data.location_name,
      last_update_at: data.recorded_at,
    };
  } catch {
    return trip;
  }
}

export async function getCustomerTripByToken(
  customerTrackingToken: string
): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('customer_tracking_token', customerTrackingToken)
    .maybeSingle();

  if (error) throw error;
  return hydrateTripWithLatestLocationUpdate(data as Trip | null);
}

export async function postDriverLocationUpdate(
  tripId: string,
  latitude: number,
  longitude: number,
  options?: { trackingToken?: string }
): Promise<void> {
  const locationName = toLocationName(latitude, longitude);

  const { error: locationError } = await supabase.functions.invoke('driver-location-update', {
    body: {
      tripId,
      latitude,
      longitude,
      trackingToken: options?.trackingToken,
    },
  });

  if (locationError) {
    // Fallback for environments where the edge function is not yet deployed.
    // Existing DB trigger syncs latest coordinates onto trips for shared tracking links.
    const { error: fallbackError } = await supabase.from('trip_location_updates').insert({
      trip_id: tripId,
      latitude,
      longitude,
      location_name: locationName,
    });
    if (fallbackError) throw fallbackError;
  }

  // ETA updates are now handled by the automated eta-updater function.
  // driver-location-update triggers it on first ping, and CustomerTracking polls it.
}

export async function predictTripDelay(input: PredictDelayInput): Promise<void> {
  const { error } = await supabase.functions.invoke('predict-delay', {
    body: input,
  });

  if (error) throw error;
}

export async function postDriverStatusUpdate(
  tripId: string,
  status: Exclude<TripStatus, 'delivered'>
): Promise<void> {
  const { error: statusHistoryError } = await supabase.from('trip_status_updates').insert({
    trip_id: tripId,
    status,
    note: `Driver reported: ${status}`,
  });
  if (statusHistoryError) throw statusHistoryError;
}

export async function markTripArrived(tripId: string): Promise<void> {
  await postTripEvent(tripId, 'arrived', {
    note: 'Driver marked arrived at destination',
  });
}

export async function markTripDelivered(tripId: string): Promise<void> {
  const deliveredAt = new Date().toISOString();

  const { error: historyError } = await supabase.from('trip_status_updates').insert({
    trip_id: tripId,
    status: 'delivered',
    note: 'Driver reported: delivered',
    recorded_at: deliveredAt,
  });
  if (historyError) throw historyError;

  await postTripEvent(tripId, 'delivered', {
    note: 'Trip marked as delivered',
    metadata: { delivered_at: deliveredAt },
  });
}

export async function triggerTripBaseline(tripId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('trip-baseline', {
    body: { tripId },
  });
  if (error) throw error;
}

export async function runTripBackfill(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('trip-backfill');
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string): Promise<AuthError | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error;
}

export async function signUp(input: SignupInput): Promise<AuthError | null> {
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        role: input.accountType,
        full_name: input.displayName,
        account_type: input.accountType,
        display_name: input.displayName,
        company_name: input.companyName,
      },
      emailRedirectTo: input.emailRedirectTo,
    },
  });

  return error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): { unsubscribe: () => void } {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return {
    unsubscribe: () => subscription.unsubscribe(),
  };
}

export type { User, Session };
