import { useEffect, useMemo, useState } from 'react';
import { createCompany, createTrip, createTrips, listCompanies, predictTripDelay, replaceTripStops, updateTripCreatedEventMetadata, type Company, type Trip } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import LocationAutocomplete from '@/components/LocationAutocomplete';

type SelectedLocation = {
  address: string;
  lat: number;
  lng: number;
};

type AdditionalStopType = 'pickup' | 'delivery';

type AdditionalStop = {
  id: string;
  type: AdditionalStopType;
  location: string;
  selectedLocation: SelectedLocation | null;
};

type RouteStopPayload = {
  sequence: number;
  type: AdditionalStopType;
  address: string;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
};

interface Props {
  onCreated: (trip: Trip) => void | Promise<void>;
}

export default function CreateTripDialog({ onCreated }: Props) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyQuery, setCompanyQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyFeatureUnavailable, setCompanyFeatureUnavailable] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [pickupLocation, setPickupLocation] = useState<SelectedLocation | null>(null);
  const [dropLocation, setDropLocation] = useState<SelectedLocation | null>(null);
  const [additionalStops, setAdditionalStops] = useState<AdditionalStop[]>([]);
  const [form, setForm] = useState({
    vehicle_number: '',
    trip_no: '',
    driver_name: '',
    driver_phone: '',
    gps_tracking_link: '',
    transporter_name: '',
    customer_name: '',
    origin: '',
    destination: '',
    material: '',
    planned_arrival: '',
  });

  const set = (key: keyof typeof form, val: string) => setForm(f => ({ ...f, [key]: val }));

  const createStopId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `stop-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const handleAddStop = () => {
    setAdditionalStops((current) => [
      ...current,
      {
        id: createStopId(),
        type: 'pickup',
        location: '',
        selectedLocation: null,
      },
    ]);
  };

  const handleRemoveStop = (stopId: string) => {
    setAdditionalStops((current) => current.filter((stop) => stop.id !== stopId));
  };

  const handleStopTypeChange = (stopId: string, type: AdditionalStopType) => {
    setAdditionalStops((current) =>
      current.map((stop) => (stop.id === stopId ? { ...stop, type } : stop))
    );
  };

  const handleStopLocationChange = (stopId: string, location: string) => {
    setAdditionalStops((current) =>
      current.map((stop) => (
        stop.id === stopId
          ? { ...stop, location, selectedLocation: location.trim() ? stop.selectedLocation : null }
          : stop
      ))
    );
  };

  const handleStopLocationSelect = (stopId: string, selectedLocation: SelectedLocation | null) => {
    setAdditionalStops((current) =>
      current.map((stop) => (stop.id === stopId ? { ...stop, selectedLocation } : stop))
    );
  };

  const buildAdditionalStopsPayload = (): RouteStopPayload[] => {
    const incompleteStop = additionalStops.find((stop) => !stop.location.trim());
    if (incompleteStop) {
      throw new Error('Every additional stop must include a location or be removed.');
    }

    return additionalStops.map((stop, index) => ({
      sequence: index + 1,
      type: stop.type,
      address: stop.location.trim(),
      latitude: stop.selectedLocation?.lat ?? null,
      longitude: stop.selectedLocation?.lng ?? null,
      isPrimary: false,
    }));
  };

  const buildRoutePlanPayload = (stops: RouteStopPayload[]): RouteStopPayload[] => [
    {
      sequence: 0,
      type: 'pickup',
      address: form.origin.trim(),
      latitude: pickupLocation?.lat ?? null,
      longitude: pickupLocation?.lng ?? null,
      isPrimary: true,
    },
    ...stops,
    {
      sequence: stops.length + 1,
      type: 'delivery',
      address: form.destination.trim(),
      latitude: dropLocation?.lat ?? null,
      longitude: dropLocation?.lng ?? null,
      isPrimary: true,
    },
  ];

  const normalizeOptionalLink = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const normalizeCompanyText = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const isValidHttpUrl = (value: string) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
    return 'Failed to create trip';
  };

  const loadCompanies = async () => {
    try {
      const data = await listCompanies('shipper');
      setCompanyFeatureUnavailable(false);
      setCompanies(data);
      setSelectedCompanyId((current) => current || data[0]?.id || '');
    } catch (error) {
      const message = getErrorMessage(error).toLowerCase();
      if (message.includes('public.companies') && message.includes('schema cache')) {
        setCompanyFeatureUnavailable(true);
      }
      setCompanies([]);
      setSelectedCompanyId('');
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadCompanies();
  }, [open]);

  const filteredCompanies = useMemo(() => {
    const q = companyQuery.trim().toLowerCase();
    if (!q) return companies;

    return companies.filter((company) => {
      const byName = company.company_name.toLowerCase().includes(q);
      const byCode = (company.company_code || '').toLowerCase().includes(q);
      return byName || byCode;
    });
  }, [companies, companyQuery]);

  const exactExistingCompany = useMemo(() => {
    const normalized = normalizeCompanyText(newCompanyName);
    if (!normalized) return null;

    return (
      companies.find((company) => normalizeCompanyText(company.company_name) === normalized)
      || null
    );
  }, [companies, newCompanyName]);

  const similarCompanies = useMemo(() => {
    const normalized = normalizeCompanyText(newCompanyName);
    if (!normalized || exactExistingCompany) return [];

    return companies
      .filter((company) => {
        const companyText = normalizeCompanyText(company.company_name);
        return companyText.includes(normalized) || normalized.includes(companyText);
      })
      .slice(0, 4);
  }, [companies, newCompanyName, exactExistingCompany]);

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error('Enter a company name');
      return;
    }

    if (exactExistingCompany) {
      setSelectedCompanyId(exactExistingCompany.id);
      setNewCompanyName('');
      toast.info(`Using existing company: ${exactExistingCompany.company_name}`);
      return;
    }

    setCreatingCompany(true);
    try {
      const created = await createCompany(newCompanyName.trim(), 'shipper');
      await loadCompanies();
      setSelectedCompanyId(created.id);
      setNewCompanyName('');
      toast.success('Company created');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create company';
      toast.error(message);
    } finally {
      setCreatingCompany(false);
    }
  };

  const parseBulkLines = (raw: string, userId: string, companyId: string) => {
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new Error('Bulk input is empty. Add at least one shipment line.');
    }

    return lines.map((line, index) => {
      const parts = line.split('|').map((part) => part.trim());
      if (parts.length < 10 || parts.length > 11) {
        throw new Error(
          `Line ${index + 1} must contain 10 or 11 values separated by | (vehicle, trip_no, driver, phone, transporter, customer, origin, destination, material, planned_arrival, [optional gps_tracking_link]).`
        );
      }

      const requiredParts = parts.slice(0, 10);
      const emptyFieldIndex = requiredParts.findIndex((part, i) => i !== 1 && part.length === 0);
      if (emptyFieldIndex !== -1) {
        const fieldNames = [
          'vehicle_number',
          'trip_no',
          'driver_name',
          'driver_phone',
          'transporter_name',
          'customer_name',
          'origin',
          'destination',
          'material',
          'planned_arrival',
        ];
        throw new Error(`Line ${index + 1} has empty ${fieldNames[emptyFieldIndex]}.`);
      }

      const plannedArrivalDate = new Date(parts[9]);
      if (Number.isNaN(plannedArrivalDate.getTime())) {
        throw new Error(`Line ${index + 1} has invalid planned_arrival. Use format YYYY-MM-DDTHH:mm.`);
      }
      const plannedArrivalIso = plannedArrivalDate.toISOString();

      const gpsTrackingLink = normalizeOptionalLink(parts[10] || '');
      if (gpsTrackingLink && !isValidHttpUrl(gpsTrackingLink)) {
        throw new Error(`Line ${index + 1} has invalid gps_tracking_link. Use http:// or https:// URL.`);
      }

      const selectedCompany = companies.find((c) => c.id === companyId);

      return {
        user_id: userId,
        transporter_company_id: profile?.company_id ?? null,
        company_id: companyId,
        vehicle_number: parts[0],
        trip_no: normalizeOptionalLink(parts[1]),
        driver_name: parts[2],
        driver_phone: parts[3],
        transporter_name: parts[4],
        customer_name: selectedCompany?.company_name || parts[5],
        origin: parts[6],
        destination: parts[7],
        material: parts[8],
        planned_arrival: plannedArrivalIso,
        gps_tracking_link: gpsTrackingLink,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!profile?.company_id) {
      toast.error('Set your transporter company in Profile before creating trips.');
      return;
    }

    setLoading(true);

    try {
      let createdTrip: Trip | null = null;
      let companyId = selectedCompanyId;

      // If user typed a company but forgot to click Add, create it automatically.
      if (!companyId && newCompanyName.trim()) {
        if (companyFeatureUnavailable) {
          throw new Error('Company assignment is unavailable: table public.companies is missing. Run Supabase migrations to enable it.');
        }
        if (exactExistingCompany) {
          companyId = exactExistingCompany.id;
          setSelectedCompanyId(exactExistingCompany.id);
        } else {
          const createdCompany = await createCompany(newCompanyName.trim(), 'shipper');
          companyId = createdCompany.id;
          setSelectedCompanyId(createdCompany.id);
        }
        setNewCompanyName('');
      }

      if (!companyId) {
        throw new Error('Select a shipper company (or add one) before creating the trip.');
      }

      if (mode === 'single') {
        const additionalStopsPayload = buildAdditionalStopsPayload();
        const routePlanPayload = buildRoutePlanPayload(additionalStopsPayload);
        const gpsLink = normalizeOptionalLink(form.gps_tracking_link);

        if (gpsLink && !isValidHttpUrl(gpsLink)) {
          throw new Error('GPS tracking link must start with http:// or https://');
        }

        const tripPayload = {
          user_id: user.id,
          transporter_company_id: profile.company_id,
          company_id: companyId,
          ...form,
          pickup_latitude: pickupLocation?.lat ?? null,
          pickup_longitude: pickupLocation?.lng ?? null,
          drop_latitude: dropLocation?.lat ?? null,
          drop_longitude: dropLocation?.lng ?? null,
          gps_tracking_link: gpsLink,
          trip_no: normalizeOptionalLink(form.trip_no),
          driver_name: form.driver_name,
          driver_phone: form.driver_phone,
          customer_name:
            companies.find((company) => company.id === companyId)?.company_name
            || form.customer_name,
          planned_arrival: new Date(form.planned_arrival).toISOString(),
        };

        createdTrip = await createTrip(tripPayload);

        if (additionalStopsPayload.length > 0 && createdTrip) {
          const stopRows = additionalStopsPayload.map((stop) => ({
            stop_order: stop.sequence,
            stop_type: stop.type,
            location_name: stop.address,
            latitude: stop.latitude,
            longitude: stop.longitude,
          }));

          const savedStops = await replaceTripStops(createdTrip.id, stopRows);

          if (savedStops.length === 0) {
            await updateTripCreatedEventMetadata(createdTrip.id, {
              additional_stops: additionalStopsPayload,
              route_plan: routePlanPayload,
            });
          }
        }

        // Trigger initial ETA prediction immediately for the first-time view
        if (createdTrip && pickupLocation) {
          predictTripDelay({
            tripId: createdTrip.id,
            currentLatitude: pickupLocation.lat,
            currentLongitude: pickupLocation.lng,
          }).catch((err) => {
            console.error('Initial prediction failed:', err);
          });
        }
      } else {
        const payload = parseBulkLines(bulkInput, user.id, companyId);
        const createdTrips = await createTrips(payload);
        createdTrip = createdTrips[0] ?? null;
      }

      toast.success(mode === 'single' ? 'Trip created!' : 'Bulk shipments created!');
      setForm({
        vehicle_number: '',
        trip_no: '',
        driver_name: '',
        driver_phone: '',
        gps_tracking_link: '',
        transporter_name: '',
        customer_name: '',
        origin: '',
        destination: '',
        material: '',
        planned_arrival: '',
      });
      setBulkInput('');
      setPickupLocation(null);
      setDropLocation(null);
      setAdditionalStops([]);
      setOpen(false);
      if (createdTrip) {
        await onCreated(createdTrip);
      }
    } catch (error) {
      console.error('Create trip submit error:', error);
      const message = getErrorMessage(error);
      toast.error('Failed to create trip: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const fields: {
    key: keyof typeof form;
    label: string;
    type?: string;
    placeholder: string;
    required?: boolean;
  }[] = [
    { key: 'vehicle_number', label: 'Vehicle Number', placeholder: 'MH 12 AB 1234' },
    { key: 'trip_no', label: 'Trip Number (Internal)', placeholder: 'TR-2024-001', required: false },
    { key: 'driver_name', label: 'Driver Name', placeholder: 'Rajesh Kumar' },
    { key: 'driver_phone', label: 'Driver Phone', placeholder: '+91 98765 43210' },
    { key: 'gps_tracking_link', label: 'GPS Tracking Link (Optional)', placeholder: 'https://gps.example.com/live/vehicle-123', required: false },
    { key: 'transporter_name', label: 'Transporter Name', placeholder: 'ABC Transport' },
    { key: 'customer_name', label: 'Customer / Plant', placeholder: 'Tata Steel Jamshedpur' },
    { key: 'origin', label: 'Origin', placeholder: 'Mumbai' },
    { key: 'destination', label: 'Destination', placeholder: 'Jamshedpur' },
    { key: 'material', label: 'Material', placeholder: 'Steel coils' },
    { key: 'planned_arrival', label: 'Planned Arrival', type: 'datetime-local', placeholder: '' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-1" /> New Trip
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Create New Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 mt-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={mode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('single')}
            >
              Single
            </Button>
            <Button
              type="button"
              variant={mode === 'bulk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('bulk')}
            >
              Bulk
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Company</Label>
            <Input
              value={companyQuery}
              onChange={(e) => setCompanyQuery(e.target.value)}
              placeholder="Search company by name/code"
              disabled={companyFeatureUnavailable}
            />
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId} disabled={companyFeatureUnavailable}>
              <SelectTrigger>
                <SelectValue placeholder={companyFeatureUnavailable ? 'Company setup pending' : 'Assign shipper company'} />
              </SelectTrigger>
              <SelectContent>
                {filteredCompanies.length === 0 && (
                  <SelectItem value="__no_companies__" disabled>
                    No companies found
                  </SelectItem>
                )}
                {filteredCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.company_name}{company.company_code ? ` (${company.company_code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 pt-1">
              <Input
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder={companyFeatureUnavailable ? 'Run migrations to enable company creation' : 'Add new company'}
                disabled={companyFeatureUnavailable}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCreateCompany}
                disabled={creatingCompany || companyFeatureUnavailable}
              >
                {creatingCompany ? 'Adding…' : 'Add'}
              </Button>
            </div>
            {exactExistingCompany && (
              <p className="text-[11px] text-muted-foreground">
                Existing match found: <button type="button" className="underline" onClick={() => setSelectedCompanyId(exactExistingCompany.id)}>{exactExistingCompany.company_name}</button>
              </p>
            )}
            {!exactExistingCompany && similarCompanies.length > 0 && (
              <div className="text-[11px] text-muted-foreground space-y-1">
                <p>Similar existing companies:</p>
                <div className="flex flex-wrap gap-1">
                  {similarCompanies.map((company) => (
                    <Button
                      key={company.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        setSelectedCompanyId(company.id);
                        setNewCompanyName('');
                      }}
                    >
                      {company.company_name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {companyFeatureUnavailable && (
              <p className="text-[11px] text-muted-foreground">
                Company assignment is temporarily unavailable because `public.companies` is missing in the connected Supabase project.
              </p>
            )}
          </div>

          {mode === 'single' ? (
            <>
              {fields
                .map(f => {
                  if (f.key === 'origin') {
                    return (
                      <LocationAutocomplete
                        key={f.key}
                        id="origin"
                        label="Pickup Location"
                        placeholder="Search pickup location"
                        value={form.origin}
                        required
                        onChange={(value) => set('origin', value)}
                        onSelect={setPickupLocation}
                      />
                    );
                  }

                  if (f.key === 'destination') {
                    return (
                      <div key={f.key} className="space-y-3">
                        <LocationAutocomplete
                          id="destination"
                          label="Drop Location"
                          placeholder="Search drop location"
                          value={form.destination}
                          required
                          onChange={(value) => set('destination', value)}
                          onSelect={setDropLocation}
                        />

                        <div className="space-y-3 rounded-md border border-dashed p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Additional Stops</Label>
                              <p className="text-[11px] text-muted-foreground">
                                Add optional intermediate pickup or delivery points only when needed.
                              </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddStop}>
                              + Add Additional Stop
                            </Button>
                          </div>

                          {additionalStops.length > 0 && (
                            <div className="space-y-3">
                              {additionalStops.map((stop, index) => (
                                <div key={stop.id} className="rounded-md border bg-background p-3 space-y-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-medium">Stop {index + 1}</p>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-muted-foreground"
                                      onClick={() => handleRemoveStop(stop.id)}
                                    >
                                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                                      Remove
                                    </Button>
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)] md:items-start">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Stop Type</Label>
                                      <Select
                                        value={stop.type}
                                        onValueChange={(value) => handleStopTypeChange(stop.id, value as AdditionalStopType)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select stop type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pickup">Pickup</SelectItem>
                                          <SelectItem value="delivery">Delivery</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <LocationAutocomplete
                                      id={`additional-stop-${stop.id}`}
                                      label="Stop Location"
                                      placeholder={`Search ${stop.type} stop`}
                                      value={stop.location}
                                      required
                                      onChange={(value) => handleStopLocationChange(stop.id, value)}
                                      onSelect={(location) => handleStopLocationSelect(stop.id, location)}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={f.key} className="space-y-1">
                      <Label htmlFor={f.key} className="text-xs">{f.label}</Label>
                      <Input
                        id={f.key}
                        type={f.type || 'text'}
                        value={form[f.key]}
                        onChange={e => set(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        required={f.required ?? true}
                      />
                    </div>
                  );
                })}
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="bulk-input" className="text-xs">Bulk Shipments (one line per trip)</Label>
              <Textarea
                id="bulk-input"
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="MH12AB1234|TR-001|Rajesh Kumar|+919876543210|ABC Transport|Tata Steel|Mumbai|Pune|Tyres|2026-03-08T09:30|https://gps.example.com/live/abc"
                className="min-h-36"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Format: vehicle|trip_no|driver|phone|transporter|customer|origin|destination|material|planned_arrival|gps_tracking_link(optional)
              </p>
            </div>
          )}

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading
              ? 'Creating…'
              : mode === 'single'
                ? 'Create Trip'
                : 'Create Bulk Shipments'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
