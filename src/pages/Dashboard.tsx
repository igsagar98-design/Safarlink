import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { listCompanies, listTripsForUser, type Company } from '@/lib/api';
import { calculateTripStatus } from '@/lib/risk-logic';
import CreateTripDialog from '@/components/CreateTripDialog';
import TripCard from '@/components/TripCard';
import TripDetail from '@/components/TripDetail';
import type { Trip } from '@/components/TripCard';
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

const ALL_COMPANIES_VALUE = '__all_companies__';
const TRACKING_REFRESH_INTERVAL_MS = 15 * 1000;

export default function Dashboard() {
  const { user, accountType, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>(ALL_COMPANIES_VALUE);
  const [companiesById, setCompaniesById] = useState<Record<string, Company>>({});

  const handleTripCreated = async (createdTrip: Trip) => {
    setSelectedTrip(createdTrip);
    await fetchTrips();
  };

  const handleTripUpdated = (updatedTrip: Trip) => {
    setTrips((prev) => prev.map((trip) => (trip.id === updatedTrip.id ? updatedTrip : trip)));
    setSelectedTrip(updatedTrip);
  };

  const handleTripDeleted = (deletedTripId: string) => {
    setTrips((prev) => prev.filter((trip) => trip.id !== deletedTripId));
    setSelectedTrip((current) => (current?.id === deletedTripId ? null : current));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (accountType === 'company') {
      navigate('/company-dashboard');
    }
  }, [user, accountType, authLoading, navigate]);

  const fetchTrips = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const data = await listTripsForUser(user.id);
      const nextTrips = (data as Trip[]) || [];
      setTrips(nextTrips);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch trips.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchTrips();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      void fetchTrips();
    }, TRACKING_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const companies = await listCompanies('shipper');
        setCompaniesById(Object.fromEntries(companies.map((company) => [company.id, company])));
      } catch {
        setCompaniesById({});
      }
    };

    void loadCompanies();
  }, []);

  const companyOptions = useMemo(() => {
    const ids = Array.from(
      new Set(trips.map((trip) => trip.company_id).filter((value): value is string => Boolean(value)))
    );
    return ids;
  }, [trips]);

  const companyFilteredTrips = useMemo(() => {
    if (selectedCompany === ALL_COMPANIES_VALUE) return trips;
    return trips.filter((trip) => trip.company_id === selectedCompany);
  }, [trips, selectedCompany]);

  const filtered = useMemo(() => {
    if (!search.trim()) return companyFilteredTrips;

    const q = search.toLowerCase();

    return companyFilteredTrips.filter((t) =>
      t.vehicle_number.toLowerCase().includes(q) ||
      t.material.toLowerCase().includes(q) ||
      t.transporter_name.toLowerCase().includes(q) ||
      t.customer_name.toLowerCase().includes(q) ||
      t.origin.toLowerCase().includes(q) ||
      t.destination.toLowerCase().includes(q)
    );
  }, [companyFilteredTrips, search]);

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
    const active = companyFilteredTrips.filter((t) => t.status !== 'delivered');

    let onTime = 0;
    let atRisk = 0;
    let late = 0;

    active.forEach((t) => {
      const s = calculateTripStatus(t);
      if (s === 'on_time') onTime++;
      else if (s === 'at_risk') atRisk++;
      else if (s === 'late') late++;
    });

    return { active: active.length, onTime, atRisk, late };
  }, [companyFilteredTrips]);

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
              <Truck className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm">Safarlink</span>
          </div>

          <div className="flex items-center gap-2">
            <CreateTripDialog onCreated={handleTripCreated} />
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
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

        <div className="grid gap-3 md:grid-cols-[1fr_260px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by vehicle, material, customer, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="relative">
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="Filter by company" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_COMPANIES_VALUE}>All Companies</SelectItem>
                {companyOptions.map((companyId) => (
                  <SelectItem key={companyId} value={companyId}>
                    {companiesById[companyId]?.company_name || companyId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {loading ? (
              <p className="text-muted-foreground text-sm text-center py-8">Loading trips…</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 card-elevated">
                <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  {selectedCompany === ALL_COMPANIES_VALUE
                    ? 'No trips yet. Create your first trip!'
                    : `No trips found for ${companiesById[selectedCompany]?.company_name || 'the selected company'}.`}
                </p>
              </div>
            ) : (
              filtered.map((trip) => (
                <TripCard key={trip.id} trip={trip} onSelect={setSelectedTrip} />
              ))
            )}
          </div>

          <div className="hidden md:block">
            {selectedTrip ? (
              <div className="sticky top-20">
                <TripDetail
                  trip={selectedTrip}
                  onClose={() => setSelectedTrip(null)}
                  onUpdated={handleTripUpdated}
                  onDeleted={handleTripDeleted}
                />
              </div>
            ) : (
              <div className="card-elevated p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  {filtered.length === 0
                    ? 'No trip details to show for the current filter'
                    : 'Select a trip to view details'}
                </p>
              </div>
            )}
          </div>
        </div>

        {selectedTrip && (
          <div className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
            <TripDetail
              trip={selectedTrip}
              onClose={() => setSelectedTrip(null)}
              onUpdated={handleTripUpdated}
              onDeleted={handleTripDeleted}
            />
          </div>
        )}
      </main>
    </div>
  );
}