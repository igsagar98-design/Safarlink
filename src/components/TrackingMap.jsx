import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useMemo } from 'react';

const defaultMapContainerStyle = {
  width: '100%',
  height: '100%',
};

const driverTruckIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <rect x="4" y="13" width="24" height="14" rx="2" fill="#2563eb" />
  <rect x="28" y="17" width="10" height="10" rx="2" fill="#3b82f6" />
  <rect x="30" y="19" width="5" height="4" rx="1" fill="#dbeafe" />
  <circle cx="13" cy="30" r="4" fill="#0f172a" />
  <circle cx="32" cy="30" r="4" fill="#0f172a" />
  <circle cx="13" cy="30" r="1.8" fill="#94a3b8" />
  <circle cx="32" cy="30" r="1.8" fill="#94a3b8" />
</svg>
`;

const driverTruckIconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(driverTruckIconSvg)}`;

function isValidCoordinate(point) {
  return (
    point
    && typeof point.lat === 'number'
    && Number.isFinite(point.lat)
    && typeof point.lng === 'number'
    && Number.isFinite(point.lng)
  );
}

export default function TrackingMap({
  pickup,
  drop,
  driver,
  zoom = 10,
  className = '',
  mapContainerStyle = defaultMapContainerStyle,
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const missingApiKey = !apiKey || !String(apiKey).trim();

  const center = useMemo(() => {
    if (isValidCoordinate(driver)) return driver;
    if (isValidCoordinate(pickup)) return pickup;
    if (isValidCoordinate(drop)) return drop;
    return { lat: 20.5937, lng: 78.9629 };
  }, [driver, pickup, drop]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'safarlink-google-map',
    googleMapsApiKey: missingApiKey ? '' : apiKey,
  });

  if (missingApiKey) {
    return (
      <div className={`rounded-xl border border-destructive/40 bg-destructive/10 p-4 ${className}`}>
        <p className="text-sm font-medium text-destructive">Google Maps API key is missing.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Set `VITE_GOOGLE_MAPS_API_KEY` in your environment (including Vercel Project Settings).
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`rounded-xl border border-destructive/40 bg-destructive/10 p-4 ${className}`}>
        <p className="text-sm font-medium text-destructive">Unable to load Google Maps.</p>
        <p className="text-xs text-muted-foreground mt-1">{loadError.message}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`rounded-xl border bg-card p-4 animate-pulse ${className}`}>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border ${className}`}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        }}
      >
        {isValidCoordinate(pickup) && (
          <Marker
            position={pickup}
            label={{ text: 'P', color: '#ffffff', fontWeight: 'bold' }}
            title="Pickup"
          />
        )}
        {isValidCoordinate(drop) && (
          <Marker
            position={drop}
            label={{ text: 'D', color: '#ffffff', fontWeight: 'bold' }}
            title="Drop"
          />
        )}
        {isValidCoordinate(driver) && (
          <Marker
            position={driver}
            icon={
              window.google?.maps
                ? {
                    url: driverTruckIconUrl,
                    scaledSize: new window.google.maps.Size(28, 28),
                    anchor: new window.google.maps.Point(14, 14),
                  }
                : undefined
            }
            title="Driver"
          />
        )}
      </GoogleMap>
    </div>
  );
}
