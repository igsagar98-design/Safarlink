import { useEffect, useMemo, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const libraries = ['places'];

export default function LocationAutocomplete({
  id,
  label,
  placeholder,
  value,
  required = false,
  onChange,
  onSelect,
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [query, setQuery] = useState(value || '');
  const [predictions, setPredictions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const serviceRef = useRef(null);

  const missingApiKey = !apiKey || !String(apiKey).trim();

  const { isLoaded } = useJsApiLoader({
    id: 'safarlink-places-autocomplete',
    googleMapsApiKey: missingApiKey ? '' : apiKey,
    libraries,
  });

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const onOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.places) return;
    serviceRef.current = new window.google.maps.places.AutocompleteService();
  }, [isLoaded]);

  const canSuggest = useMemo(
    () => isLoaded && !missingApiKey && query.trim().length >= 2,
    [isLoaded, missingApiKey, query]
  );

  useEffect(() => {
    if (!canSuggest || !serviceRef.current) {
      setPredictions([]);
      return;
    }

    let active = true;
    setLoading(true);

    serviceRef.current.getPlacePredictions({ input: query }, (results, status) => {
      if (!active) return;

      if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      setPredictions(results);
      setLoading(false);
      setOpen(true);
    });

    return () => {
      active = false;
    };
  }, [canSuggest, query]);

  const selectPrediction = (prediction) => {
    if (!window.google?.maps?.Geocoder) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status !== 'OK' || !results?.[0]?.geometry?.location) {
        return;
      }

      const result = results[0];
      const address = result.formatted_address || prediction.description;
      const lat = result.geometry.location.lat();
      const lng = result.geometry.location.lng();

      setQuery(address);
      onChange(address);
      onSelect({ address, lat, lng });
      setPredictions([]);
      setOpen(false);
    });
  };

  const handleInput = (nextValue) => {
    setQuery(nextValue);
    onChange(nextValue);
    onSelect(null);
    setOpen(nextValue.trim().length >= 2);
  };

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input
        id={id}
        value={query}
        onChange={(event) => handleInput(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
      />

      {missingApiKey && (
        <p className="text-[11px] text-destructive">Google Maps key missing (`VITE_GOOGLE_MAPS_API_KEY`).</p>
      )}

      {open && !missingApiKey && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md overflow-hidden">
          {loading && <p className="px-3 py-2 text-xs text-muted-foreground">Loading suggestions...</p>}

          {!loading && predictions.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No suggestions found.</p>
          )}

          {!loading && predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              onClick={() => selectPrediction(prediction)}
            >
              {prediction.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
