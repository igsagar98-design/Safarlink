import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { listMyCompanyTrips } from '@/lib/api';
import { calculateTripStatus } from '@/lib/risk-logic';
import type { Trip } from '@/components/TripCard';
import TripDetail from '@/components/TripDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck, CheckCircle, AlertTriangle, XCircle, LogOut, Search, Building2, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const ALL_TRANSPORTERS_VALUE = '__all_transporters__';
const ALL_STATUS_VALUE = '__all_status__';
const TRACKING_REFRESH_INTERVAL_MS = 15 * 1000;

type ComputedStatus = 'on_time' | 'at_risk' | 'late' | 'delivered';

export default function CompanyDashboard() {
  const { user, accountType, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTransporter, setSelectedTransporter] = useState<string>(ALL_TRANSPORTERS_VALUE);
  const [selectedStatus, setSelectedStatus] = useState<string>(ALL_STATUS_VALUE);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    if (accountType !== 'company') {
      navigate('/dashboard');
    }
  }, [user, accountType, authLoading, navigate]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const data = await listMyCompanyTrips();
      setTrips(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch company trips.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && accountType === 'company') {
      fetchTrips();
    }
  }, [user, accountType]);

  useEffect(() => {
    if (!user || accountType !== 'company') return;

    const interval = setInterval(() => {
      void fetchTrips();
    }, TRACKING_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, accountType]);

  const statusByTrip = useMemo(() => {
    return new Map(trips.map((trip) => [trip.id, calculateTripStatus(trip) as ComputedStatus]));
  }, [trips]);

  const transporterOptions = useMemo(() => {
    return Array.from(
      new Set(
        trips
          .map((trip) => trip.transporter_name?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [trips]);

  const transporterFilteredTrips = useMemo(() => {
    if (selectedTransporter === ALL_TRANSPORTERS_VALUE) return trips;
    return trips.filter((trip) => trip.transporter_name === selectedTransporter);
  }, [trips, selectedTransporter]);

  const statusFilteredTrips = useMemo(() => {
    if (selectedStatus === ALL_STATUS_VALUE) return transporterFilteredTrips;
    return transporterFilteredTrips.filter((trip) => statusByTrip.get(trip.id) === selectedStatus);
  }, [transporterFilteredTrips, selectedStatus, statusByTrip]);

  const filtered = useMemo(() => {
    if (!search.trim()) return statusFilteredTrips;

    const q = search.toLowerCase();

    return statusFilteredTrips.filter((trip) =>
      trip.vehicle_number.toLowerCase().includes(q) ||
      trip.material.toLowerCase().includes(q) ||
      trip.transporter_name.toLowerCase().includes(q) ||
      trip.origin.toLowerCase().includes(q) ||
      trip.destination.toLowerCase().includes(q) ||
      (trip.last_location_name || '').toLowerCase().includes(q)
    );
  }, [statusFilteredTrips, search]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedTrip(null);
      return;
    }

    setSelectedTrip((current) => {
      if (!current) return filtered[0];
      const stillExists = filtered.find((trip) => trip.id === current.id);
      return stillExists ?? filtered[0];
    });
  }, [filtered]);

  const stats = useMemo(() => {
    const active = trips.filter((t) => t.status !== 'delivered');

    let onTime = 0;
    let atRisk = 0;
    let late = 0;

    active.forEach((trip) => {
      const status = statusByTrip.get(trip.id);
      if (status === 'on_time') onTime++;
      else if (status === 'at_risk') atRisk++;
      else if (status === 'late') late++;
    });

    return { active: active.length, onTime, atRisk, late };
  }, [trips, statusByTrip]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Active Trips', value: stats.active, icon: Truck, color: 'text-primary' },
    { label: 'On Time', value: stats.onTime, icon: CheckCircle, color: 'text-success' },
    { label: 'At Risk', value: stats.atRisk, icon: AlertTriangle, color: 'text-warning' },
    { label: 'Late', value: stats.late, icon: XCircle, color: 'text-danger' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm">Safarlink Company Portal</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchTrips}>Refresh</Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/company-profile')}>
              <UserCircle2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className="card-elevated p-4">
              <div className="flex items-center gap-2">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="font-display font-bold text-2xl mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by vehicle, material, transporter, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={selectedTransporter} onValueChange={setSelectedTransporter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by transporter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TRANSPORTERS_VALUE}>All Transporters</SelectItem>
              {transporterOptions.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUS_VALUE}>All Status</SelectItem>
              <SelectItem value="on_time">On Time</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {loading ? (
              <p className="text-muted-foreground text-sm text-center py-8">Loading company trips…</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 card-elevated">
                <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No trips found for this company filter set.</p>
              </div>
            ) : (
              filtered.map((trip) => {
                const status = statusByTrip.get(trip.id) ?? 'on_time';
                return (
                  <button
                    key={trip.id}
                    onClick={() => setSelectedTrip(trip)}
                    className="card-elevated p-4 text-left w-full"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display font-semibold text-sm">{trip.vehicle_number}</p>
                      <span className="text-xs text-muted-foreground uppercase">{status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{trip.transporter_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{trip.origin} → {trip.destination}</p>
                    <p className="text-xs text-muted-foreground mt-1">{trip.material}</p>
                  </button>
                );
              })
            )}
          </div>

          <div className="hidden md:block">
            {selectedTrip ? (
              <div className="sticky top-20">
                <TripDetail trip={selectedTrip} onClose={() => setSelectedTrip(null)} allowManagement={false} />
              </div>
            ) : (
              <div className="card-elevated p-8 text-center">
                <p className="text-muted-foreground text-sm">Select a trip to view details and timeline.</p>
              </div>
            )}
          </div>
        </div>

        {selectedTrip && (
          <div className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
            <TripDetail trip={selectedTrip} onClose={() => setSelectedTrip(null)} allowManagement={false} />
          </div>
        )}
      </main>
    </div>
  );
}
