import { GoogleMap, Marker } from '@react-google-maps/api';
import { useEffect, useMemo, useRef } from 'react';
import { useGoogleMapsLoader } from '@/lib/googleMapsLoader';

const defaultMapContainerStyle = {
  width: '100%',
  height: '100%',
};
const DRIVER_TRUCK_ICON_URL = '/truck-marker.svg';

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
  const mapRef = useRef(null);

  const center = useMemo(() => {
    if (isValidCoordinate(driver)) return driver;
    if (isValidCoordinate(pickup)) return pickup;
    if (isValidCoordinate(drop)) return drop;
    return { lat: 20.5937, lng: 78.9629 };
  }, [driver, pickup, drop]);

  useEffect(() => {
    if (!mapRef.current || !isValidCoordinate(driver)) {
      return;
    }

    mapRef.current.panTo(driver);
  }, [driver]);

  const { isLoaded, loadError, missingApiKey } = useGoogleMapsLoader();

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
        onLoad={(map) => {
          mapRef.current = map;
        }}
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
                    url: DRIVER_TRUCK_ICON_URL,
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
