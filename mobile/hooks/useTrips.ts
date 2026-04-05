import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export type TripStatus = 
  | 'on_time'
  | 'at_risk'
  | 'late'
  | 'validated' 
  | 'reached_pickup' 
  | 'on_route' 
  | 'arrived_destination' 
  | 'delivered' 
  | 'cancelled';

export interface Trip {
  id: string;
  user_id: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  transporter_name: string;
  customer_name: string;
  material: string;
  origin: string; // pickup location
  destination: string; // drop location
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  drop_latitude: number | null;
  drop_longitude: number | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_name: string | null;
  progress: number;
  status: TripStatus;
  gps_tracking_link: string | null;
  source_type: string;
  current_eta: string | null;
  planned_arrival: string;
  created_at: string;
}

export function useTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Explicitly select confirmed columns according to schema
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id, user_id, vehicle_number, driver_name, driver_phone,
          transporter_name, customer_name, material,
          origin, destination, 
          pickup_latitude, pickup_longitude,
          drop_latitude, drop_longitude,
          last_latitude, last_longitude, last_location_name,
          progress, status, 
          gps_tracking_link, source_type,
          current_eta, planned_arrival,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (err) {
      console.error('Error fetching trips:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrips();

    // Subscribe to realtime updates
    if (user) {
      const channel = supabase
        .channel('trips_realtime')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'trips',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          fetchTrips();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchTrips]);

  const updateTripStatus = async (tripId: string, status: TripStatus) => {
    try {
      const updates: any = { status };
      
      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', tripId);

      if (error) throw error;
      await fetchTrips();
    } catch (err) {
      console.error('Error updating trip status:', err);
      throw err;
    }
  };

  const updateProgress = async (tripId: string, progress: number) => {
      try {
        const { error } = await supabase
          .from('trips')
          .update({ progress })
          .eq('id', tripId);
  
        if (error) throw error;
        await fetchTrips();
      } catch (err) {
        console.error('Error updating progress:', err);
        throw err;
      }
  };

  return {
    trips,
    loading,
    refresh: fetchTrips,
    updateTripStatus,
    updateProgress,
    activeTrips: trips.filter(t => !['delivered', 'cancelled'].includes(t.status)),
    completedTrips: trips.filter(t => t.status === 'delivered'),
    cancelledTrips: trips.filter(t => t.status === 'cancelled'),
  };
}
