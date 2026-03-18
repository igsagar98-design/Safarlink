/**
 * useDriverProfile — Fetch and expose full driver profile data
 * Reads from Supabase auth user metadata + profiles table
 * TODO: Hook up to RLS-secured `profiles` table for full driver data
 */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export interface DriverProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  vehicleNumber: string;
  companyName: string;
  companyId?: string;
  joinedAt: string;
  accountStatus: 'active' | 'suspended' | 'pending';
}

export function useDriverProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [tripCounts, setTripCounts] = useState({
    active: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadProfile();
    loadTripCounts();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      // Fetch from `profiles` table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const meta = user.user_metadata || {};
      
      setProfile({
        id: user.id,
        email: user.email ?? '',
        fullName: profileData?.full_name || meta.full_name || meta.name || 'Driver',
        phone: profileData?.phone || meta.phone || '—',
        vehicleNumber: meta.vehicle_number || '—',
        companyName: meta.company_name || '—',
        companyId: profileData?.company_id || meta.company_id,
        joinedAt: user.created_at
          ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
          : '—',
        accountStatus: 'active',
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      // Fallback to metadata if profile fetch fails
      const meta = user.user_metadata || {};
      setProfile({
        id: user.id,
        email: user.email ?? '',
        fullName: meta.full_name || meta.name || 'Driver',
        phone: meta.phone || '—',
        vehicleNumber: meta.vehicle_number || '—',
        companyName: meta.company_name || '—',
        companyId: meta.company_id,
        joinedAt: user.created_at ? new Date(user.created_at).toLocaleDateString() : '—',
        accountStatus: 'active',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTripCounts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('trips')
      .select('status')
      .eq('user_id', user.id); 

    if (error) {
      console.error('Error loading trip counts:', error.message);
      return;
    }


    if (data) {
      setTripCounts({
        active: data.filter(t => ['assigned', 'reached_pickup', 'on_route', 'arrived_destination'].includes(t.status)).length,
        completed: data.filter(t => t.status === 'delivered').length,
        cancelled: data.filter(t => t.status === 'cancelled').length,
      });
    }
  };

  return { profile, tripCounts, loading };
}
